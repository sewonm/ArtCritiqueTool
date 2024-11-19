import axios from 'axios';
import dotenv from 'dotenv';
import formidable from 'formidable';
import fs from 'fs';
import { put } from '@vercel/blob';

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
            uploadDir: '/tmp', // Temporary directory for serverless environments
        });

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

            // If an image is uploaded, attempt to upload it to Vercel Blob
            if (image) {
                try {
                    const filePath = image.filepath || image.path;

                    // Validate file path
                    if (!filePath) {
                        console.error('File path is missing.');
                        return res.status(400).json({ error: 'Image file path is missing.' });
                    }

                    // Validate file type
                    const fileType = image.mimetype;
                    if (!fileType || !fileType.startsWith('image/')) {
                        return res.status(400).json({ error: 'Invalid file type. Only images are allowed.' });
                    }

                    // Read file and upload to Vercel Blob
                    try {
                        const fileData = fs.readFileSync(filePath);
                        const blob = await put(image.originalFilename || 'upload.jpg', fileData, {
                            access: 'public',
                            contentType: fileType
                        });

                        imageUrl = blob.url;
                        console.log('Image uploaded to Vercel Blob:', imageUrl);

                        // Clean up the temporary file
                        fs.unlink(filePath, (err) => {
                            if (err) console.error('Error cleaning up temporary file:', err);
                        });
                    } catch (error) {
                        console.error('Error reading or uploading file:', error);
                        return res.status(500).json({ error: 'Error processing image file.' });
                    }
                } catch (error) {
                    console.error('Error handling image upload:', error);
                    return res.status(500).json({ error: 'Error handling image upload.' });
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
                    model: 'gpt-4-turbo',
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