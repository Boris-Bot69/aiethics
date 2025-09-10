const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = 63342;

app.use(express.json());
app.use(express.static(__dirname + '/..'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

app.post('/ask-gemini', async (req, res) => {
    try {
        const userMessage = req.body.message;
        if (!userMessage) {
            return res.status(400).json({ error: 'Message is required.' });
        }

        // Send the user's message to the Gemini API
        const result = await model.generateContent(userMessage);
        const response = await result.response;
        const text = response.text();

        // Send the AI's response back to the frontend
        res.json({ aiMessage: text });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get response from AI.' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/aiethics/homage.html`);
});