// server.js (UPDATED FOR STABILITY AI)

const express = require('express');
const fetch = require('node-fetch'); // Make sure to install: npm install node-fetch
const FormData = require('form-data');
const { Readable } = require('stream');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5001;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname)); // Serves your HTML, CSS, JS files

// Helper function to convert base64 to a buffer
function base64ToBuffer(base64) {
    return Buffer.from(base64.split(',')[1], 'base64');
}

app.post('/generate-image', async (req, res) => {
    try {
        const userMessage = req.body.message;
        const imageBase64 = req.body.image;

        console.log("Received request:");
        console.log("User message:", userMessage);
        console.log("Image Base64 length:", imageBase64 ? imageBase64.length : 'N/A');

        if (!userMessage || !imageBase64) {
            console.error("Missing user message or image.");
            return res.status(400).json({ error: 'Both a message and an image are required.' });
        }

        const formData = new FormData();
        const imageBuffer = base64ToBuffer(imageBase64);
        formData.append('init_image', imageBuffer, { filename: 'init_image.png', contentType: 'image/png' });
        formData.append('text_prompts[0][text]', userMessage);
        formData.append('text_prompts[0][weight]', 1);
        formData.append('style_preset', 'photographic');

        console.log("Sending request to Stability AI...");

        const response = await fetch(
            "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image", // <-- THE FIX IS HERE
            {
                method: 'POST',
                headers: {
                    ...formData.getHeaders(),
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`, // Check this key!
                },
                body: formData,
            }
        );

        console.log("Stability AI Response Status:", response.status); // <--- VERY IMPORTANT
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Stability AI API error: ${response.status} - ${errorText}`); // <--- MORE DETAIL HERE
            throw new Error(`Stability AI API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        console.log("Stability AI Data Received:", data); // See what API sends back

        const generatedImageBase64 = data.artifacts[0].base64;
        const generatedImageDataUrl = `data:image/png;base64,${generatedImageBase64}`;

        console.log("Successfully generated image with Stability AI.");

        res.json({
            aiMessage: `Here is the generated image based on your prompt: "${userMessage}"`,
            generatedImage: generatedImageDataUrl
        });

    } catch (error) {
        console.error('API error in try/catch block:', error); // Catches network issues etc.
        res.status(500).json({ error: 'Failed to generate the image.' });
    }
});

app.get('/', (req, res) => {
    res.redirect('/html/ai_activities_webpages/homage.html');
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});