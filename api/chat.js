import axios from 'axios';
import formidable from 'formidable';
import fs from 'fs';

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

            const userMessage = fields.message || '';
            const image = files.image;

            if (!image) {
                return res.status(400).json({ error: 'No image provided.' });
            }

            try {
                // Prepare FormData to send both the image and the prompt to GPT-4 Turbo
                const formData = new FormData();
                formData.append('model', 'gpt-4-turbo');

                // System message to guide GPT-4 Turbo's response
                const systemMessage = `
                    You are an expert art critic. Analyze the uploaded artwork for composition, style, color use, and technique.
                    If the user includes a specific question, address that as well in your critique.
                `;

                formData.append('messages', JSON.stringify([
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: userMessage }
                ]));

                formData.append('file', fs.createReadStream(image.filepath), {
                    filename: image.originalFilename,
                    contentType: image.mimetype,
                });

                // Send the image and prompt to GPT-4 Turbo API
                const response = await axios.post('https://api.openai.com/v1/chat/completions', formData, {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                        ...formData.getHeaders(),
                    },
                });

                // Send back the AI's critique
                res.status(200).json(response.data);

            } catch (error) {
                console.error('Error connecting to OpenAI API:', error.message || error.response?.data);
                res.status(500).json({
                    error: 'Error connecting to OpenAI API.',
                    details: error.message || error.response?.data || error
                });
            } finally {
                // Clean up the file after processing
                if (image && fs.existsSync(image.filepath)) {
                    fs.unlinkSync(image.filepath);
                }
            }
        });
    } else {
        res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }
}