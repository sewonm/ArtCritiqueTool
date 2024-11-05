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

        form.parse(req, async (err, fields) => {
            if (err) {
                console.error('Error parsing form:', err);
                return res.status(500).json({ error: 'Error parsing form data.' });
            }

            let userMessage = fields.message;

            // Ensure userMessage is a string
            if (typeof userMessage !== 'string') {
                userMessage = String(userMessage);
            }

            // Check if userMessage is empty or whitespace-only
            if (!userMessage.trim()) {
                return res.status(400).json({ error: 'User message is required.' });
            }

            try {
                const payload = {
                model: 'gpt-4o-mini',
                messages: [
                  {
                    role: 'user',
                    content: [
                      { type: 'text', text: "You are an engine interpreting abstract Etch-a-Sketch drawings with black on grey backgrounds. Follow these steps: 1. Playful Brainstorm: List the top 10 most likely literal interpretations. 2. Brevity: Use 1-3 words per item, up to 5 words max. 3. Avoid Direct References: Do not mention 'lines' or geometric terms. 4. Reverse Ekphrasis: Focus on litearl imaginative readings of what the lines could represent. These should be plain and easy for a child or skeptic to understand. 5. Speculative Elements: Include possible genres, similar artists, and stylistic categories. 6. Progressive Roasting: Add playful criticism that increases in intensity towards the end. 7. Unified Format: Present as a concise, list-based output like a nutrition label."},
                      { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
                    ],
                  },
                ],
                max_tokens: 300,

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
