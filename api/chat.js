import axios from 'axios';
import dotenv from 'dotenv';
import formidable from 'formidable';
import fetch from 'node-fetch';

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
            if (!userMessage.trim() && !image) {
                return res.status(400).json({ error: 'User message or image is required.' });
            }

            let imageUrl = null;

            // If an image is uploaded, upload it to Vercel Blob
            if (image) {
                try {
                    const blobResponse = await fetch('https://api.vercel.com/v1/blobs', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${process.env.VERCEL_API_TOKEN}`,
                            'Content-Type': 'application/octet-stream',
                        },
                        body: fs.createReadStream(image.filepath || image.path),
                    });

                    const blobData = await blobResponse.json();

                    if (blobResponse.ok && blobData.url) {
                        imageUrl = blobData.url;
                        console.log('Image uploaded to Vercel Blob:', imageUrl);
                    } else {
                        console.error('Failed to upload image to Vercel Blob:', blobData);
                        return res.status(500).json({ error: 'Failed to upload image to Vercel Blob.' });
                    }

                } catch (error) {
                    console.error('Error uploading image to Vercel Blob:', error);
                    return res.status(500).json({ error: 'Error uploading image to Vercel Blob.' });
                }
            }

            try {
                // Construct the message payload for OpenAI API
                const messages = [
                    {
                        role: 'system',
                        content: "You are a friendly and conversational art critic. Only provide art critiques or insights when the user asks directly about art. If the user makes casual conversation or greetings, respond naturally without discussing art unless it’s mentioned."
                    }
                ];

                // Add the user message if provided
                if (userMessage.trim()) {
                    messages.push({ role: 'user', content: userMessage });
                }

                // If an image URL is available, ask for a critique of the artwork
                if (imageUrl) {
                    messages.push(
                        {
                            role: 'user',
                            content: "Here is an artwork I’d like you to critique. Please provide feedback on composition, technique, color usage, and any areas for improvement."
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageUrl
                            }
                        }
                    );
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
            }
        });
    } else {
        res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }
}