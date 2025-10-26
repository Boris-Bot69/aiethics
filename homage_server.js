// homage_server.js  (ESM)
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";


dotenv.config();

const toRaw = (dataUrl) => {
    try {
        return dataUrl.split(",")[1] || dataUrl;
    } catch {
        return dataUrl;
    }
};

const frames = { A8: null, A8b: null, A7: null, A6: null, A5: null };

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
        console.error("❌ /edit-magazine error:", err);
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

// ---------------------------------------------------------------------------
// 4) Expanded Frames — A8 → A7 → A6 → A5 outpaint (SINGLE route)
// ---------------------------------------------------------------------------
app.post("/expand_image", async (req, res) => {
    try {
        const { image, prompt, stage } = req.body;
        if (!image) return res.status(400).json({ error: "Missing image upload" });

        const stageLabel = stage
            ? `Expanding from ${stage} to the next larger paper frame.`
            : "Expanding artwork to a larger frame.";

        const fullPrompt = `
${stageLabel}
Preserve artistic style and composition. Expand borders creatively.
${prompt ? `User input: ${prompt}` : ""}`.trim();

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: [
                {
                    inlineData: {
                        data: toRaw(image),
                        mimeType: image.includes("png") ? "image/png" : "image/jpeg",
                    },
                },
                { text: fullPrompt },
            ],
            config: { responseModalities: ["IMAGE"] },
        });

        const imgPart = response?.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
        if (!imgPart) return res.status(500).json({ error: "No image returned from model" });

        const mime = imgPart.inlineData.mimeType || "image/png";
        const base64 = imgPart.inlineData.data;
        const dataUrl = `data:${mime};base64,${base64}`;

        // store for merging later
        const key = stageKey(Number(stage));
        if (key) frames[key] = dataUrl;

        res.json({ image_url: dataUrl });
    } catch (err) {
        console.error("❌ /expand_image error:", err);
        res.status(500).json({ error: err.message || "Unknown error" });
    }
});

// ---------------------------------------------------------------------------
// 5) Merge A8–A5 into A4 ISO layout (portrait) with two A8s on top-left
// Layout (portrait A4 2480x3508):
// ┌────────────────────────────┐
// │ A8 | A8 |        A6       │
// │----|----|------------------│
// │    | A7 |                  │
// ├────────────────────────────┤
// │            A5              │
// └────────────────────────────┘
// A8,A6 = portrait; A7,A5 = landscape (A7 rotated 90°); A5 big bottom
// ---------------------------------------------------------------------------
app.post("/merge_to_a4", async (_req, res) => {
    try {
        // sanity: must have A5, A6, A7, A8
        if (!frames.A5 || !frames.A6 || !frames.A7 || !frames.A8) {
            return res.status(400).json({ error: "Missing one or more frames (need A8, A7, A6, A5)." });
        }

        console.log("🧩 Merging A8–A5 into A4 ISO layout composite...");

        // canvas: A4 300DPI portrait
        const A4W = 2480, A4H = 3508;
        const margin = 40;

        // --- Regions (integers only) ---
        const topH   = Math.round(A4H * 0.42);           // top band height
        const leftW  = Math.round(A4W * 0.47);           // left column width
        const rightW = A4W - leftW - margin * 2;         // right column width
        const bottomH = A4H - topH - margin * 3;         // bottom band (A5) height

        // A5 big (landscape): occupy bottom band centered
        const A5w = A4W - margin * 2;
        const A5h = bottomH;
        const A5x = margin;
        const A5y = A4H - bottomH - margin;

        // Left-top area for A8 + A8 + A7
        const cellPad = 14;
        const A8w = Math.round((leftW - margin - cellPad) / 2);
        const A8h = Math.round(A8w * Math.SQRT2);                 // portrait 1:√2
        const A8_1x = margin;
        const A8_1y = margin;
        const A8_2x = margin + A8w + cellPad;
        const A8_2y = margin;

        const A7w = leftW - margin;                                // landscape
        const A7h = Math.round(A7w / Math.SQRT2);
        const A7x = margin;
        const A7y = Math.round(margin + Math.max(A8h, 0) + cellPad);

        // Top-right A6 portrait fills remaining top-right area
        const A6w = rightW;
        const A6h = Math.round(A6w * Math.SQRT2);
        const A6x = A4W - margin - A6w;
        const A6y = margin;

        // Build composites (convert all to buffers first)
        const comp = [];

        // A8 top-left
        comp.push({
            input: await sharp(dataUrlToBuffer(frames.A8))
                .resize(A8w, A8h, { fit: "cover" })
                .toBuffer(),
            left: A8_1x, top: A8_1y
        });

        // 2nd A8 (if we ever stored separately, else reuse A8)
        const a8bDataUrl = frames.A8b || frames.A8;
        comp.push({
            input: await sharp(dataUrlToBuffer(a8bDataUrl))
                .resize(A8w, A8h, { fit: "cover" })
                .toBuffer(),
            left: A8_2x, top: A8_2y
        });

        // A6 portrait (top-right)
        comp.push({
            input: await sharp(dataUrlToBuffer(frames.A6))
                .resize(A6w, A6h, { fit: "cover" })
                .toBuffer(),
            left: A6x, top: A6y
        });

        // A7 landscape (rotate 90 so it’s landscape if needed)
        comp.push({
            input: await sharp(dataUrlToBuffer(frames.A7))
                .rotate(90) // force landscape orientation visually
                .resize(A7w, A7h, { fit: "cover" })
                .toBuffer(),
            left: A7x, top: A7y
        });

        // A5 large landscape bottom
        comp.push({
            input: await sharp(dataUrlToBuffer(frames.A5))
                .resize(A5w, A5h, { fit: "cover" })
                .toBuffer(),
            left: A5x, top: A5y
        });

        const final = await sharp({
            create: {
                width: A4W,
                height: A4H,
                channels: 3,
                background: { r: 255, g: 255, b: 255 }
            }
        })
            .composite(comp)
            .png()
            .toBuffer();

        console.log("✅ A4 ISO composite successfully generated.");
        res.json({ image_url: `data:image/png;base64,${final.toString("base64")}` });
    } catch (err) {
        console.error("❌ /merge_to_a4 error:", err);
        res.status(500).json({ error: err.message || "Unknown error" });
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