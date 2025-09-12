const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
// This correctly serves files from your project's root folder
app.use(express.static(__dirname));

if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. The AI will not work until you provide it in a .env file.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.post('/ask-gemini', async (req, res) => {
    try {
        const userMessage = req.body.message;
        if (!userMessage) {
            return res.status(400).json({ error: 'Message is required.' });
        }

        const result = await model.generateContent(userMessage);
        const response = await result.response;
        const text = response.text();

        res.json({ aiMessage: text });

    } catch (error) {
        console.error('Gemini API error:', error);
        res.status(500).json({ error: 'Failed to get response from AI.' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Try visiting http://localhost:${port}/homage.html`);
});