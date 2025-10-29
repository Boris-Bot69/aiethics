// homage_server.js  (ESM)
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { createWriteStream } from "fs";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";


dotenv.config();

const toRaw = (dataUrl) => {
    try {
        return dataUrl.split(",")[1] || dataUrl;
    } catch {
        return dataUrl;
    }
};

const frames = { A8: null, A7: null, A6: null, A5: null };

const stageKey = (stageNum) => {
    if (stageNum === 1) return "A8";
    if (stageNum === 2) return "A7";
    if (stageNum === 3) return "A6";
    if (stageNum === 4) return "A5";
    return null;
};

const dataUrlToBuffer = (dataUrl) => Buffer.from(toRaw(dataUrl), "base64");

// --- Resolve __dirname in ESM ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: "1000mb" }));
app.use(bodyParser.urlencoded({ limit: "1000mb", extended: true }));

const HTML_BASE = path.join(__dirname, "html", "ai_activities_webpages");

const HOMAGE_HTML = path.join(HTML_BASE, "homage.html");
const MAGAZINE_HTML = path.join(HTML_BASE, "magazine_cutouts.html");
const EXPANDED_HTML = path.join(HTML_BASE, "expanded_frames.html");
const TEXTURE_HTML = path.join(HTML_BASE, "drawing_texture.html");

app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, "js")));


// GenAI client
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

// --- API: generate one image per prompt ---
app.post("/generate", async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({ error: "Missing 'prompt' string" });
        }

        console.log("🎨 Generating image for:", prompt);

        const response = await ai.models.generateImages({
            model: "imagen-4.0-generate-001",
            prompt,
            config: { numberOfImages: 1 },
        });

        const imgBase64 = response.generatedImages?.[0]?.image?.imageBytes;
        if (!imgBase64) {
            return res.status(500).json({ error: "No image returned from model" });
        }

        res.json({ image: imgBase64 });
    } catch (err) {
        console.error("❌ Error generating image:", err);
        res.status(500).json({ error: err.message || "Unknown error" });
    }
});


// --- API: magazine cut-outs image edit ---
app.post("/edit-magazine", async (req, res) => {
    try {
        const { imageBase64, prompt } = req.body;
        if (!imageBase64) {
            return res.status(400).json({ error: "Missing image upload" });
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: [
                {
                    inlineData: {
                        data: imageBase64.split(",")[1],
                        mimeType: imageBase64.includes("png") ? "image/png" : "image/jpeg",
                    },
                },
                { text: prompt || "Enhance or edit this drawing creatively." },
            ],
            config: { responseModalities: ["IMAGE"] },
        });

        const imgPart = response?.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
        if (!imgPart) {
            return res.status(500).json({ error: "No image returned from model" });
        }

        res.json({
            image: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`,
        });
    } catch (err) {
        console.error("/edit-magazine error:", err);
        res.status(500).json({ error: err.message || "Unknown error" });
    }
});



app.post("/mix-texture", async (req, res) => {
    try {
        const { structureBase64, textureBase64, strength, prompt } = req.body;
        if (!structureBase64 || !textureBase64) {
            return res.status(400).json({ error: "Both images are required" });
        }


        const defaultInstruction =
            `You are a texture-to-structure fusion tool. 
       Take the first image as the STRUCTURE (the main content, shapes, edges).
       Take the second image as the TEXTURE (the material/style).
       Fuse them so that the texture conforms to the surfaces and contours of the structure.
       Preserve structure edges and silhouettes. Avoid warping the global composition.
       Use a texture strength of ${Math.max(0, Math.min(1, Number(strength ?? 0.6)))} 
       (0=ignore texture, 1=strong texture dominance).
       Output exactly one fused image.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: [
                // STRUCTURE image first
                {
                    inlineData: {
                        data: toRaw(structureBase64),
                        mimeType: structureBase64.includes("image/png") ? "image/png" : "image/jpeg",
                    },
                },
                // TEXTURE image second
                {
                    inlineData: {
                        data: toRaw(textureBase64),
                        mimeType: textureBase64.includes("image/png") ? "image/png" : "image/jpeg",
                    },
                },
                // Instruction + optional user prompt
                {
                    text:
                        (prompt?.trim()
                            ? `Base instruction:\n${defaultInstruction}\n\nUser request:\n${prompt.trim()}`
                            : defaultInstruction),
                },
            ],
            // Ask for image + (optional) short text
            config: { responseModalities: ["TEXT", "IMAGE"] },
        });

        // Find the first image part in the response
        const parts = response?.candidates?.[0]?.content?.parts || [];
        const imgPart = parts.find((p) => p.inlineData?.data);
        if (!imgPart) {
            const maybeText = parts.map((p) => p.text).filter(Boolean).join("\n").slice(0, 500);
            return res
                .status(500)
                .json({ error: "No image returned from model", details: maybeText || undefined });
        }

        // Return a data URL so the browser can <img src="...">
        const mime = imgPart.inlineData.mimeType || "image/png";
        const base64 = imgPart.inlineData.data; // already base64
        res.json({ imageDataUrl: `data:${mime};base64,${base64}` });
    } catch (err) {
        console.error("❌ /mix-texture error:", err);
        res.status(500).json({ error: err.message || "Unknown error" });
    }
});


app.post("/expand_canvas", async (req, res) => {
    try {
        const { image, from, to } = req.body;
        const buf = Buffer.from(image.split(",")[1], "base64");

        // 🧩 Step 1: Downscale for faster generation (prevents timeouts)
        const resized = await sharp(buf)
            .resize({ width: 768, height: 768, fit: "inside" })
            .png()
            .toBuffer();

        // 🧠 Step 2: Better spatial prompt
        const prompt = `
You are expanding a multi-stage artwork (A8 → A7 → A6 → A5 → A4).
The colored center must remain pixel-perfect — do not resize, redraw, or move it.
Only paint outward into the grey background so that the final image looks like
a natural zoomed-out continuation of the same painting.
Preserve lighting, brushwork, and style consistency.
Do not duplicate, crop, or re-insert the inner region.
`;

        // 🌀 Step 3: Gemini API call with retry logic
        let response;
        let attempt = 0;
        while (attempt < 2) {
            try {
                console.log(`🎨 Expanding canvas ${from} → ${to} (attempt ${attempt + 1})`);
                response = await ai.models.generateContent({
                    model: "gemini-2.5-flash-image",
                    contents: [
                        { inlineData: { data: resized.toString("base64"), mimeType: "image/png" } },
                        { text: prompt },
                    ],
                    config: { responseModalities: ["IMAGE"], temperature: 0.6 },
                });
                break; // success
            } catch (err) {
                if (err.status === 503) {
                    console.warn("⚠️ Gemini timeout, retrying...");
                    attempt++;
                    await new Promise(r => setTimeout(r, 2000));
                    continue;
                }
                throw err; // other errors
            }
        }

        if (!response) throw new Error("Gemini request failed after retries.");

        // 🖼 Step 4: Extract image
        const part = response?.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
        if (!part) throw new Error("No image returned from AI.");

        const mime = part.inlineData.mimeType || "image/png";
        const dataUrl = `data:${mime};base64,${part.inlineData.data}`;

        // ✅ Step 5: Store this frame for later summary
        frames[to] = dataUrl;

        res.json({ image_url: dataUrl });
    } catch (err) {
        console.error("❌ /expand_canvas error:", err);
        res.status(500).json({ error: err.message });
    }
});
/* ============================================================
   SUMMARY (A8→A4 PDF, includes original A8)
============================================================ */
app.get("/summary_a4", async (_req, res) => {
    try {
        console.log("🧩 Generating A8→A4 summary PDF...");

        const layers = ["A8", "A7", "A6", "A5", "A4"];
        const borders = ["#FFFFFF", "#007BFF", "#FFD700", "#007BFF", "#FFD700"];
        const imgs = [];

        for (let i = 0; i < layers.length; i++) {
            const key = layers[i];
            const img = frames[key];
            if (!img) continue;

            const buf = await sharp(dataUrlToBuffer(img))
                .resize({ width: 1000 })
                .extend({
                    top: 8, bottom: 8, left: 8, right: 8,
                    background: borders[i],
                })
                .png()
                .toBuffer();

            imgs.push({ layer: key, buf });
        }

        if (imgs.length === 0) {
            return res.status(400).json({ error: "No frames available for summary." });
        }

        const pdf = await PDFDocument.create();
        const font = await pdf.embedFont(StandardFonts.HelveticaBold);

        for (let i = 0; i < imgs.length; i++) {
            const { layer, buf } = imgs[i];
            const img = await pdf.embedPng(buf);
            const { width, height } = img.scale(0.7);
            const page = pdf.addPage([595.28, 841.89]); // A4 in points

            const pageWidth = page.getWidth();
            const pageHeight = page.getHeight();

            // Title
            let title;
            if (layer === "A8") {
                title = "Original Artwork (A8)";
            } else {
                title = `Step ${layers.indexOf(layer)}: ${layer}`;
            }
            const textWidth = font.widthOfTextAtSize(title, 16);
            page.drawText(title, {
                x: (pageWidth - textWidth) / 2,
                y: pageHeight - 40,
                size: 16,
                font,
                color: rgb(0.1, 0.1, 0.1),
            });

            // Image
            const x = (pageWidth - width) / 2;
            const y = (pageHeight - height) / 2 - 20;
            page.drawImage(img, { x, y, width, height });
        }

        const pdfBytes = await pdf.save();
        const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
        console.log("✅ Summary PDF ready!");
        res.json({ pdf_url: `data:application/pdf;base64,${pdfBase64}` });
    } catch (err) {
        console.error("❌ /summary_a4 error:", err);
        res.status(500).json({ error: err.message });
    }
});


/* ============================================================
   ROUTES – HTML Pages
============================================================ */
app.get("/", (_req, res) => {
    res.send(`<h1>🎨 AI Ethics Activities</h1>
    <ul>
      <li><a href="/homage">Homage to a Local Artist</a></li>
      <li><a href="/magazine">Magazine Cut-Outs</a></li>
      <li><a href="/expanded">Expanded Frames</a></li>
      <li><a href="/texture">Texture Mixer</a></li>
    </ul>`);
});
app.get("/homage",   (_req, res) => res.sendFile(HOMAGE_HTML));
app.get("/magazine", (_req, res) => res.sendFile(MAGAZINE_HTML));
app.get("/expanded", (_req, res) => res.sendFile(EXPANDED_HTML));
app.get("/texture",  (_req, res) => res.sendFile(TEXTURE_HTML));

/* ============================================================
   START SERVER
============================================================ */
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log("📄 Serving HTML from:", HTML_BASE);
    console.log("   /homage");
    console.log("   /magazine");
    console.log("   /expanded");
    console.log("   /texture");
});