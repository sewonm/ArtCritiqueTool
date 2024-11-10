import axios from 'axios';
import dotenv from 'dotenv';
import formidable from 'formidable';
import fs from 'fs';

dotenv.config();

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (!process.env.OPENAI_API_KEY) {
        console.error('Missing OpenAI API Key');
        return res.status(500).json({ error: 'OpenAI API key is missing' });
    }

    if (req.method === 'POST') {
        const form = formidable({ multiples: true });

        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error('Error parsing form:', err);
                return res.status(500).json({ error: 'Error parsing form data.' });
            }

            let userMessage = fields.message;
            const image = files.image;

            // Ensure userMessage is a string
            if (typeof userMessage !== 'string') {
                userMessage = String(userMessage);
            }

            // Check if userMessage is empty or whitespace-only
            if (!userMessage.trim()) {
                return res.status(400).json({ error: 'User message is required.' });
            }

            // Encode the image file as a base64 string if an image is provided
            let imageBase64 = null;
            if (image) {
                try {
                    const imageBuffer = fs.readFileSync(image.filepath);
                    imageBase64 = imageBuffer.toString('base64');
                } catch (error) {
                    console.error('Error reading image file:', error);
                    return res.status(500).json({ error: 'Error processing the image file.' });
                }
            }

            try {
                // Construct the payload for OpenAI
                const messages = [
                    {
                        role: 'system',
                        content: "You are a friendly and conversational art critic. Only provide art critiques or insights when the user asks directly about art. If the user makes casual conversation or greetings, respond naturally without discussing art unless it’s mentioned."
                    },
                    { role: 'user', content: userMessage }
                ];

                // If an image is provided, include it in the payload
                if (imageBase64) {
                    messages.push({
                        type: 'image_url',
                        image_url: {
                            url: `data:image/png;base64,${imageBase64}`
                        }
                    });
                }

                const payload = {
                    model: 'gpt-3.5-turbo',
                    messages: messages
                };

                // Send the request to OpenAI API
                const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
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
            } finally {
                // Clean up the uploaded image file after processing
                if (image && fs.existsSync(image.filepath)) {
                    fs.unlinkSync(image.filepath);
                }
            }
        });
    } else {
        res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }
}