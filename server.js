// server.js (UPDATED WITH STABILITY AI IMAGE-TO-IMAGE)

const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const multer = require('multer'); // For handling file uploads
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5001;

// Multer setup for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// --- Endpoint 1: Text-to-Image (for Homage Activity) ---
app.post('/generate-image', async (req, res) => {
    // ... (This code remains the same as your working version)
    try {
        const prompts = req.body.prompts;
        if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
            return res.status(400).json({ error: 'A non-empty array of prompts is required.' });
        }
        const text_prompts = prompts.map((prompt, index) => ({ text: prompt, weight: (index === prompts.length - 1) ? 1 : 0.75 }));
        const engineId = 'stable-diffusion-xl-1024-v1-0';
        const apiHost = 'https://api.stability.ai';
        const apiKey = process.env.STABILITY_API_KEY;

        const response = await fetch(`${apiHost}/v1/generation/${engineId}/text-to-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ text_prompts, cfg_scale: 7, height: 1024, width: 1024, steps: 30, samples: 1, style_preset: "photographic" }),
        });
        if (!response.ok) throw new Error(`API error: ${await response.text()}`);
        const data = await response.json();
        const generatedImageDataUrl = `data:image/png;base64,${data.artifacts[0].base64}`;
        res.json({ generatedImage: generatedImageDataUrl });
    } catch (error) { res.status(500).json({ error: 'Failed to generate the image.' }); }
});


// --- NEW Endpoint 2: Image-to-Image (for Texture Activity) ---
// The 'upload.fields' middleware processes two files named 'originalImage' and 'textureImage'
app.post('/mix-images', upload.fields([{ name: 'originalImage' }, { name: 'textureImage' }]), async (req, res) => {
    try {
        if (!req.files || !req.files.originalImage || !req.files.textureImage) {
            return res.status(400).json({ error: 'Both original and texture images are required.' });
        }

        const formData = new FormData();
        // Append the main image as the 'init_image'
        formData.append('init_image', req.files.originalImage[0].buffer, 'original.png');

        // Use a text prompt to describe the action.
        // We also append the texture image to the prompt for models that can use it.
        formData.append('text_prompts[0][text]', 'Fuse the images, using the first for structure and the second for texture and style. Make it look photorealistic.');
        formData.append('text_prompts[0][weight]', 1);

        // Strength of the fusion. Higher values give the AI more creative freedom.
        formData.append('image_strength', 0.65);
        formData.append('style_preset', 'photographic');

        const engineId = 'stable-diffusion-xl-1024-v1-0';
        const apiHost = 'https://api.stability.ai';
        const apiKey = process.env.STABILITY_API_KEY;

        const response = await fetch(`${apiHost}/v1/generation/${engineId}/image-to-image`, {
            method: 'POST',
            headers: { ...formData.getHeaders(), 'Authorization': `Bearer ${apiKey}` },
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Stability AI API error: ${await response.text()}`);
        }

        const data = await response.json();
        const generatedImageDataUrl = `data:image/png;base64,${data.artifacts[0].base64}`;

        res.json({ generatedImage: generatedImageDataUrl });

    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: 'Failed to mix images.' });
    }
});


// Redirect the root URL to your main HTML file
app.get('/', (req, res) => {
    res.redirect('/html/ai_activities_webpages/homage.html'); // Or whichever you want as default
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});