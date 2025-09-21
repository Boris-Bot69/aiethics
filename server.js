// server.js (CORRECTED)

const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { VertexAI } = require("@google-cloud/vertexai");
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// --- Vertex AI Configuration ---
const PROJECT_ID = "gen-lang-client-0891654264"; // Your Project ID
const LOCATION = "europe-west1";
const vertex_ai = new VertexAI({ project: PROJECT_ID, location: LOCATION });

// --- Gemini Configuration ---
if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set.");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const multiModalModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- Helper function (no changes) ---
function fileToGenerativePart(base64String, mimeType) {
    return {
        inlineData: {
            data: base64String.split(',')[1],
            mimeType
        },
    };
}

async function generateImageWithImagen(prompt) {
    try {
        // Get the generative model for image generation
        // Note the different model name for Imagen
        const generativeModel = vertex_ai.getGenerativeModel({
            model: 'imagegeneration',
        });

        // The correct method is also generateContent for image models in this library
        const result = await generativeModel.generateContent({
            contents: [{
                role: 'user',
                parts: [{ text: `A high-quality, artistic photo of: ${prompt}` }]
            }],
            generation_config: {
                "sampleCount": 1 // Specify how many images to generate
            }
        });

        // Extract the base64 image data from the response
        const base64Image = result.response.candidates[0].content.parts[0].fileData.fileUri.split('base64,')[1];
        return `data:image/png;base64,${base64Image}`;

    } catch (error) {
        console.error("Imagen API Error:", error);
        return null;
    }
}

// --- Main API Endpoint (FIXED) ---
app.post('/ask-gemini', async (req, res) => {
    try {
        const userMessage = req.body.message;
        const imageBase64 = req.body.image;

        if (!userMessage || !imageBase64) {
            return res.status(400).json({ error: 'Both a message and an image are required.' });
        }

        // 1. Prepare the multimodal prompt for Gemini
        const mimeTypeMatch = imageBase64.match(/^data:(image\/(?:png|jpeg|webp));base64,/);
        if (!mimeTypeMatch) {
            return res.status(400).json({ error: 'Unsupported image format.' });
        }
        const imagePart = fileToGenerativePart(imageBase64, mimeTypeMatch[1]);

        // --- FIX IS HERE ---
        // Every part of the prompt must be an object.
        const promptParts = [
            { text: "Based on the style described in the text, transform the uploaded image. Create a new, single-sentence, visually descriptive prompt for an AI image generator that fuses the image and the text. For example, if the image is a person and the text is 'make it manga style', the prompt could be 'A manga-style portrait of the person in the image'." },
            imagePart,
            { text: `Text prompt: "${userMessage}"` }
        ];

        // 2. Ask Gemini to create a new text prompt
        // --- AND THE FIX IS HERE ---
        // Pass the entire array of parts to the model.
        const result = await multiModalModel.generateContent(promptParts);
        const response = await result.response;
        const newPromptFromGemini = response.text();

        // 3. Generate a new image using Imagen
        console.log(`Generating new image with Gemini's prompt: ${newPromptFromGemini}`);
        const generatedImageData = await generateImageWithImagen(newPromptFromGemini);

        // 4. Send both back to the frontend
        res.json({
            aiMessage: newPromptFromGemini,
            generatedImage: generatedImageData
        });

    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: 'Failed to get response from AI.' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});