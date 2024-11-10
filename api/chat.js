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
            uploadDir: '/tmp', // Temporary directory for serverless environments like Vercel
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

            // Encode the image file as a base64 string if an image is provided
            let imageBase64 = null;
            if (image) {
                try {
                    const imagePath = image.filepath || image.path;
                    if (!imagePath) {
                        console.error('Filepath is missing.');
                        return res.status(400).json({ error: 'Filepath is missing or undefined.' });
                    }
            
                    console.log('Reading image from:', imagePath);
                    const imageBuffer = await fs.promises.readFile(imagePath);
                    imageBase64 = imageBuffer.toString('base64');
                } catch (error) {
                    console.error('Error reading image file:', error);
                    return res.status(500).json({ error: 'Error processing the image file.' });
                }
            }

            try {
                // Construct the base messages array
                const messages = [
                    {
                        role: 'system',
                        content: "You are a friendly and conversational art critic. Only provide art critiques or insights when the user asks directly about art. If the user makes casual conversation or greetings, respond naturally without discussing art unless it’s mentioned."
                    }
                ];

                // Add user message if provided
                if (userMessage.trim()) {
                    messages.push({ role: 'user', content: userMessage });
                }

                // If an image is provided, add a specific critique prompt
                if (imageBase64) {
                    messages.push(
                        {
                            role: 'user',
                            content: "Here is an artwork I’d like you to critique. Please provide feedback on composition, technique, color usage, and any areas for improvement."
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/png;base64,${imageBase64}`
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
            } finally {
                // Clean up the uploaded image file after processing
                if (image && fs.existsSync(image.file.path)) {
                    fs.unlinkSync(image.file.path);
                }
            }
        });
    } else {
        res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }
}