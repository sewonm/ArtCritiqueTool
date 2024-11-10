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
        const form = formidable({
            multiples: true,
            keepExtensions: true,
            uploadDir: '/tmp',
        });

        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error('Error parsing form:', err);
                return res.status(500).json({ error: 'Error parsing form data.' });
            }

            let userMessage = fields.message || '';
            const image = files.image;

            if (!userMessage.trim() && !image) {
                return res.status(400).json({ error: 'User message or image is required.' });
            }

            let imageUrl = null;

            if (image) {
                try {
                    const filePath = image.filepath || image.path;
                    const validImageTypes = ['image/jpeg', 'image/png'];
                    const maxSize = 5 * 1024 * 1024;

                    if (!validImageTypes.includes(image.mimetype) || image.size > maxSize) {
                        return res.status(400).json({ error: 'Invalid image type or size too large.' });
                    }

                    const fileBuffer = fs.readFileSync(filePath);
                    const blobResponse = await fetch('https://api.vercel.com/v1/blobs', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${process.env.VERCEL_API_TOKEN}`,
                            'Content-Type': 'application/octet-stream',
                        },
                        body: fileBuffer,
                    });

                    const blobData = await blobResponse.json();

                    if (blobResponse.ok && blobData.url) {
                        imageUrl = blobData.url;
                    } else {
                        console.error('Failed to upload image to Vercel Blob:', blobData);
                        return res.status(500).json({ error: 'Failed to upload image to Vercel Blob.' });
                    }

                } catch (error) {
                    console.error('Error uploading image:', error);
                    return res.status(500).json({ error: 'Image upload error.' });
                }
            }

            try {
                const messages = [
                    {
                        role: 'system',
                        content: "You are a friendly art critic. Provide critiques only when asked about art, otherwise respond naturally."
                    },
                ];

                if (userMessage.trim()) {
                    messages.push({ role: 'user', content: userMessage });
                }

                if (imageUrl) {
                    messages.push({
                        role: 'user',
                        content: `Here is an artwork I’d like you to critique. Image URL: ${imageUrl}`
                    });
                }

                const payload = {
                    model: 'gpt-4-turbo',
                    messages,
                };

                const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                });

                const completion = response.data.choices[0]?.message?.content;
                res.status(200).json({ message: completion });

            } catch (error) {
                console.error('OpenAI API error:', error.message || error.response?.data);
                res.status(500).json({ error: 'OpenAI API error.', details: error.message });
            }
        });
    } else {
        res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }
}