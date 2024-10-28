import axios from 'axios';
import dotenv from 'dotenv'; // Only needed if running locally
import FormData from 'form-data'; // Required for handling FormData
import fs from 'fs'; // Required for reading image file (if processing further)
dotenv.config();

export default async function handler(req, res) {
    if (!process.env.OPENAI_API_KEY) {
        console.error('Missing OpenAI API Key');
        return res.status(500).json({ error: 'OpenAI API key is missing' });
    }

    if (req.method === 'POST') {
        const { message } = req.body;
        const image = req.file; // Access uploaded image

        try {
            // If there is an image, send an additional prompt to ask about the image
            let critiquePrompt = 'You are an insightful and concise art critic.';

            if (message) {
                critiquePrompt += ` Respond with thoughtful critiques, summarizing the essence of the artwork or answering art-related questions. The user has asked: "${message}"`;
            }

            if (image) {
                critiquePrompt += ' Also critique the uploaded artwork image in detail, focusing on artistic techniques, color balance, and composition.';
            }

            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: critiquePrompt }
                ]
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            res.status(200).json(response.data);

        } catch (error) {
            console.error('Error connecting to OpenAI API:', error.message || error.response?.data);
            res.status(500).json({
                error: 'Error connecting to OpenAI API.',
                details: error.message || error.response?.data || error
            });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }
}