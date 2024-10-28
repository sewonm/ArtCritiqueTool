import axios from 'axios';
import dotenv from 'dotenv';
import formidable from 'formidable';

dotenv.config();

export const config = {
    api: {
        bodyParser: false, // Disable default body parser to use formidable
    },
};

export default async function handler(req, res) {
    if (!process.env.OPENAI_API_KEY) {
        console.error('Missing OpenAI API Key');
        return res.status(500).json({ error: 'OpenAI API key is missing' });
    }

    if (req.method === 'POST') {
        const form = formidable({ multiples: true }); // Initialize formidable

        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error('Error parsing form:', err);
                return res.status(500).json({ error: 'Error parsing form data.' });
            }

            const userMessage = fields.message;
            const image = files.image;

            try {
                // Construct the prompt with both text and image critique
                const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: 'You are an insightful and concise art critic. Respond with brief but thoughtful critiques, summarizing the essence of the artwork or answering art-related questions in 3-4 sentences.' },
                        { role: 'user', content: userMessage }
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
        });
    } else {
        res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }
}