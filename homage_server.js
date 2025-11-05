// homage_server.js  (ESM)
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
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



const allowedOrigins = [
    "http://localhost:3000",
    "https://aiethics-5ncx.onrender.com",
];

app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                console.warn("❌ Blocked CORS request from:", origin);
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
    })
);


// GenAI client
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

const sessions = new Map();

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
        const { image } = req.body;
        if (!image) return res.status(400).json({ error: "Missing image data" });

        const baseBuf = Buffer.from(image.split(",")[1], "base64");
        const meta = await sharp(baseBuf).metadata();

        // Add 25% margin around
        const margin = Math.round(meta.width * 0.25);
        const newW = meta.width + margin * 2;
        const newH = meta.height + margin * 2;

        // Composite onto a slightly neutral background
        const extended = await sharp({
            create: {
                width: newW,
                height: newH,
                channels: 4,
                background: { r: 245, g: 245, b: 245, alpha: 1 },
            },
        })
            .composite([{ input: baseBuf, top: margin, left: margin }])
            .png()
            .toBuffer();

        // Simple, natural prompt
        const prompt = `
Just expand the image outward naturally.
Keep everything in the original area completely unchanged.
Extend the scene smoothly beyond the borders, continuing background and lighting.
Do not zoom out or add any borders or frames.
`;

        console.log("🎨 Expanding image naturally...");

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: [
                { inlineData: { data: extended.toString("base64"), mimeType: "image/png" } },
                { text: prompt },
            ],
            config: { responseModalities: ["IMAGE"], temperature: 0.7 },
        });

        const part = response?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
        if (!part) throw new Error("No image returned from Gemini.");

        res.json({
            image_url: `data:image/png;base64,${part.inlineData.data}`,
        });
    } catch (err) {
        console.error("❌ /expand_canvas error:", err);
        res.status(500).json({ error: err.message });
    }
});


/* ============================================================
   SUMMARY PDF
============================================================ */
app.get("/summary_a4", async (_req, res) => {
    try {
        console.log("🧩 Generating summary PDF...");
        const layers = ["A8", "A7", "A6", "A5", "A4"];
        const imgs = [];

        for (const key of layers) {
            const img = frames[key];
            if (!img) continue;
            const buf = await sharp(Buffer.from(toRaw(img), "base64"))
                .resize({ width: 1000 })
                .png()
                .toBuffer();
            imgs.push({ key, buf });
        }

        if (imgs.length === 0) {
            return res.status(400).json({ error: "No frames available for summary." });
        }

        const pdf = await PDFDocument.create();
        const font = await pdf.embedFont(StandardFonts.HelveticaBold);

        for (const { key, buf } of imgs) {
            const img = await pdf.embedPng(buf);
            const { width, height } = img.scale(0.7);
            const page = pdf.addPage([595.28, 841.89]);
            const pw = page.getWidth();
            const ph = page.getHeight();
            const text = key === "A8" ? "Original Artwork (A8)" : `Expansion ${key}`;
            const textW = font.widthOfTextAtSize(text, 16);
            page.drawText(text, { x: (pw - textW) / 2, y: ph - 40, size: 16, font, color: rgb(0.1, 0.1, 0.1) });
            page.drawImage(img, { x: (pw - width) / 2, y: (ph - height) / 2 - 20, width, height });
        }

        const pdfBytes = await pdf.save();
        const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
        res.json({ pdf_url: `data:application/pdf;base64,${pdfBase64}` });
    } catch (err) {
        console.error("❌ /summary_a4 error:", err);
        res.status(500).json({ error: err.message });
    }
});


// AI SUPERHERO

app.post("/generate-panel", async (req, res) => {
    try {
        const { sessionId, imageBase64, prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: "Missing prompt" });
        if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

        // Initialize or update session memory
        if (!sessions.has(sessionId)) {
            sessions.set(sessionId, {
                panels: [],
                context: "",
                heroDescription: "",
                ended: false,
            });
        }
        const story = sessions.get(sessionId);
        if (story.ended) {
            return res.json({
                message:
                    "📖 The story has already reached an ending! You can start a new hero if you wish.",
            });
        }

        console.log(`🎨 [${sessionId}] New panel prompt:`, prompt);

        // Build story memory
        story.context += `\nPanel ${story.panels.length + 1}: ${prompt}`;

        const combinedPrompt = `
You are generating the next comic panel in an ongoing story.
Maintain the same main hero identity, costume, and abilities from previous panels.
Show smooth continuity between scenes.

Story so far:
${story.context}

Generate ONE new comic panel in consistent style, without speech bubbles.
If the story logically reaches a conclusion, end it naturally with an emotional or moral closure.
`;

        const contents = [];
        if (imageBase64) {
            contents.push({
                inlineData: {
                    data: imageBase64.split(",")[1],
                    mimeType: imageBase64.includes("png") ? "image/png" : "image/jpeg",
                },
            });
        }
        contents.push({ text: combinedPrompt });

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents,
            config: { responseModalities: ["IMAGE"], temperature: 0.8 },
        });

        const part = response?.candidates?.[0]?.content?.parts?.find(
            (p) => p.inlineData?.data
        );
        if (!part) throw new Error("No image returned.");

        const mime = part.inlineData.mimeType || "image/png";
        const base64 = part.inlineData.data;
        story.panels.push({ prompt, image: base64 });

        // Decide if story ends
        if (story.panels.length >= 5) story.ended = true;

        res.json({
            image: `data:${mime};base64,${base64}`,
            ended: story.ended,
        });
    } catch (err) {
        console.error("❌ /generate-panel error:", err);
        res.status(500).json({ error: err.message });
    }
});

/* ============================================================
   2️⃣  Suggest next-panel ideas (context-aware)
============================================================ */
app.post("/suggest-panel-prompt", async (req, res) => {
    try {
        const { sessionId } = req.body;
        const story = sessions.get(sessionId);
        const previous = story?.context || "The hero’s story is just beginning.";

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    text: `Continue this superhero comic in one short panel idea.
Story so far:
${previous}

Suggest one creative next event that fits naturally. Keep it positive and concise. It should makes in context`,
                },
            ],
            config: { temperature: 0.9 },
        });

        const suggestion =
            response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
            "The hero faces a new challenge involving technology and ethics.";

        res.json({ suggestion });
    } catch (err) {
        console.error("❌ /suggest-panel-prompt error:", err);
        res.status(500).json({ error: err.message });
    }
});

/* ============================================================
   3️⃣  Reset story (start new hero)
============================================================ */
app.post("/reset-story", (req, res) => {
    const { sessionId } = req.body;
    sessions.delete(sessionId);
    res.json({ message: "Story reset. You can start a new superhero!" });
});


app.post("/delete-panel", (req, res) => {
    const { sessionId, imageDataUrl } = req.body;
    const story = sessions.get(sessionId);
    if (!story) return res.status(400).json({ error: "Invalid session" });

    story.panels = story.panels.filter(
        (p) => `data:image/png;base64,${p.image}` !== imageDataUrl
    );
    res.json({ message: "Panel deleted" });
});


/* ============================================================
   Generate final comic strip after story ends
============================================================ */
app.get("/generate-comic-pdf", async (req, res) => {
    try {
        const { sessionId } = req.query;
        const story = sessions.get(sessionId);
        if (!story || !story.panels?.length)
            return res.status(400).json({ error: "No panels found" });

        const pdf = await PDFDocument.create();
        const font = await pdf.embedFont(StandardFonts.HelveticaBold);
        const page = pdf.addPage([595, 842]); // A4 portrait
        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();
        const margin = 40;
        const innerWidth = pageWidth - margin * 2;
        const innerHeight = pageHeight - margin * 2;

        // Title
        page.drawText("AI Superhero Comic", {
            x: margin,
            y: pageHeight - 40,
            size: 18,
            font,
            color: rgb(0.1, 0.1, 0.1),
        });

        // Rows and columns layout (2 columns)
        const numCols = 2;
        const colGap = 12;
        const rowGap = 20;
        const cellWidth = (innerWidth - colGap) / numCols;

        const numPanels = story.panels.length;
        const numRows = Math.ceil(numPanels / numCols);
        const totalRowsHeight = innerHeight - 60; // leave top area for title
        const cellHeight = totalRowsHeight / numRows - rowGap / 2;

        let panelIndex = 0;
        for (let r = 0; r < numRows; r++) {
            for (let c = 0; c < numCols; c++) {
                if (panelIndex >= numPanels) break;
                const p = story.panels[panelIndex];
                const imgBytes = Buffer.from(p.image, "base64");
                const img = await pdf.embedPng(imgBytes);
                const { width, height } = img.scale(1);

                // Fit image proportionally into cell
                const scale = Math.min(cellWidth / width, cellHeight / height);
                const drawW = width * scale;
                const drawH = height * scale;

                const x = margin + c * (cellWidth + colGap) + (cellWidth - drawW) / 2;
                const y =
                    pageHeight -
                    80 - // leave top space
                    (r + 1) * (cellHeight + rowGap) +
                    (cellHeight - drawH);

                page.drawImage(img, { x, y, width: drawW, height: drawH });
                page.drawText(`Panel ${panelIndex + 1}`, {
                    x,
                    y: y - 14,
                    size: 10,
                    font,
                    color: rgb(0.3, 0.3, 0.3),
                });

                panelIndex++;
            }
        }

        const pdfBytes = await pdf.save();
        const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
        res.json({ pdf: `data:application/pdf;base64,${pdfBase64}` });
    } catch (err) {
        console.error("/generate-comic-pdf error:", err);
        res.status(500).json({ error: err.message });
    }
});


/* ============================================================
   ROUTES – HTML Pages
============================================================ */
app.get("/", (_req, res) => {
    res.sendFile(HOMAGE_HTML);
    res.sendFile(MAGAZINE_HTML);
    res.sendFile(EXPANDED_HTML);
    res.sendFile(TEXTURE_HTML);

});

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