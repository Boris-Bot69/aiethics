// homage_server.js  (ESM)
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

// --- Resolve __dirname in ESM ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

// -------------- IMPORTANT --------------
// Tell the server where your *actual* homage.html lives.
// If your file is exactly at:  C:\Users\boris\WebstormProjects\aiethics\homage.html
// then this default is fine. If it's in a subfolder, change the next line accordingly.
// Example if it's in "pages/scenarios/homage.html":
// const HOMAGE_HTML = path.join(__dirname, "pages", "scenarios", "homage.html");
const HOMAGE_HTML = path.join(__dirname, "homage.html");

// Serve static files from the project root so your ../../css, ../../images paths still work.
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

// Root -> serve YOUR homage page
app.get("/", (_req, res) => {
    res.sendFile(HOMAGE_HTML);
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📄 Serving: ${HOMAGE_HTML}`);
});
