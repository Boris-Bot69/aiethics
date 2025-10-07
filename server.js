// server.js (UPDATED WITH CONVERSATION MEMORY)

const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5001;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

app.post('/generate-image', async (req, res) => {
    try {
        // CHANGED: We now expect an array of prompts
        const prompts = req.body.prompts;

        if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
            return res.status(400).json({ error: 'A non-empty array of prompts is required.' });
        }

        console.log(`Received prompts:`, prompts);

        // --- NEW: Create weighted prompts for the API ---
        // This transforms the simple array of strings into the format Stability AI needs,
        // giving more weight to the most recent prompt.
        const text_prompts = prompts.map((prompt, index) => ({
            text: prompt,
            // The last prompt in the array (the newest one) gets the highest weight.
            weight: (index === prompts.length - 1) ? 1 : 0.75
        }));


        const engineId = 'stable-diffusion-xl-1024-v1-0';
        const apiHost = 'https://api.stability.ai';
        const apiKey = process.env.STABILITY_API_KEY;

        const response = await fetch(
            `${apiHost}/v1/generation/${engineId}/text-to-image`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    text_prompts: text_prompts, // CHANGED: Use the new weighted prompts
                    cfg_scale: 7,
                    height: 1024,
                    width: 1024,
                    steps: 30,
                    samples: 1,
                    style_preset: "photographic"
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${errorText}`);
        }

        const data = await response.json();
        const generatedImageDataUrl = `data:image/png;base64,${data.artifacts[0].base64}`;

        console.log("Successfully generated image with conversation history.");

        res.json({
            generatedImage: generatedImageDataUrl
        });

    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: 'Failed to generate the image.' });
    }
});

app.get('/', (req, res) => {
    res.redirect('/html/ai_activities_webpages/homage.html');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});