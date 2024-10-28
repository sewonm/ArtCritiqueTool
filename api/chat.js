import axios from 'axios';
import dotenv from 'dotenv';
import formidable from 'formidable';

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

            const userMessage = fields.message;
            const image = files.image;

            try {
                const payload = {
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: "You are a conversational art critic. Only discuss art when asked directly."
                        },
                        { role: 'user', content: userMessage || 'No message provided' }
                    ]
                };

                console.log("Payload sent to OpenAI API:", JSON.stringify(payload, null, 2));
                console.log("API Key present:", Boolean(process.env.OPENAI_API_KEY));

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