import { loadEnv } from 'vite';
import { GoogleGenerativeAI } from "@google/generative-ai";

export default function apiServer() {
    return {
        name: 'api-server',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                if (!req.url.startsWith('/api/gemini')) {
                    return next();
                }

                console.log('📥 API request received:', req.url);

                try {
                    // 1. Setup Environment
                    const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
                    const API_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

                    console.log('🔑 API Key available:', !!API_KEY);

                    if (!API_KEY) {
                        throw new Error('Missing Gemini API Key');
                    }

                    // 2. Polyfill Response Methods
                    res.status = (statusCode) => {
                        res.statusCode = statusCode;
                        return res;
                    };

                    res.json = (data) => {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(data));
                        return res;
                    };

                    // 3. Parse Body
                    let body = {};
                    if (req.method === 'POST') {
                        const buffers = [];
                        for await (const chunk of req) {
                            buffers.push(chunk);
                        }
                        const data = Buffer.concat(buffers).toString();
                        try {
                            body = JSON.parse(data);
                        } catch (e) {
                            console.error('Body parse error:', e);
                        }
                    }

                    // 4. Handle Gemini Logic Directly
                    const { action, payload } = body;
                    console.log('🤖 Action:', action);

                    const genAI = new GoogleGenerativeAI(API_KEY);
                    // Use gemini-2.0-flash as requested (cheap & good)
                    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

                    let prompt = "";
                    if (action === 'clarification') {
                        prompt = `
              You are an expert tutor explaining concepts to a student who is confused.
              
              Topic: "${payload.topic}"
              Student's Confusion: "${payload.confusion}"
              
              Provide a clear, simple explanation to clear up the confusion.
              Break it down into bite-sized parts if necessary.
              
              IMPORTANT: Write the response in the SAME language as the Topic.
              Do NOT use dual-language titles (e.g. "Title (Judul)"). Use ONLY the language of the topic.
              
              Return ONLY a JSON array of objects.
              Example format:
              [
                { "title": "Clarification Part 1", "content": "..." },
                { "title": "Clarification Part 2", "content": "..." }
              ]
              
              Keep the tone encouraging and simple.
              DO NOT use markdown formatting like \`\`\`json. Just return the raw JSON array.
            `;
                    } else if (action === 'quiz_feedback') {
                        prompt = `
              The user has just finished a quiz on "${payload.topic}".
              They answered ${payload.correct} out of ${payload.total} correctly.
              
              Generate a short, encouraging feedback message.
              If the score is low, suggest reviewing the material.
              If the score is high, congratulate them.
              
              IMPORTANT: Write the response in the SAME language as the Topic.
              
              Return ONLY a JSON object:
              { "feedback": "Your feedback message here" }
              
              DO NOT use markdown formatting like \`\`\`json. Just return the raw JSON object.
            `;
                    } else if (action === 'quiz') {
                        prompt = `
              Generate ${payload.numQuestions || 3} quiz questions about "${payload.topic}".
              
              Return ONLY a JSON array of objects.
              Each object must have:
              - question: string
              - type: "multiple_choice" or "true_false"
              - options: array of strings (4 for multiple_choice, 2 for true_false)
              - correctAnswer: string (must be one of the options)
              - explanation: string (short explanation of why it's correct)
              
              IMPORTANT: Write the questions in the SAME language as the Topic.
              
              Example format:
              [
                {
                  "question": "...",
                  "type": "multiple_choice",
                  "options": ["A", "B", "C", "D"],
                  "correctAnswer": "A",
                  "explanation": "..."
                }
              ]
              
              DO NOT use markdown formatting like \`\`\`json. Just return the raw JSON array.
            `;
                    } else {
                        // Default explanation - Multi-card format
                        prompt = `
              You are an expert teacher explaining "${payload.topic}" to a beginner.
              
              Break down the explanation into 3-5 distinct parts (cards) to make it easy to digest.
              Each part should have a clear title and a simple explanation.
              Use analogies and simple language ("baby language").
              
              IMPORTANT: Write the response in the SAME language as the Topic.
              Do NOT use dual-language titles (e.g. "Title (Judul)"). Use ONLY the language of the topic.
              
              Return ONLY a JSON array of objects.
              Example format:
              [
                { "title": "Introduction", "content": "..." },
                { "title": "How it works", "content": "..." },
                { "title": "Why it matters", "content": "..." }
              ]
              
              DO NOT use markdown formatting like \`\`\`json. Just return the raw JSON array.
            `;
                    }

                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    const text = response.text();

                    console.log('✅ Gemini Response received');
                    res.json({ text });

                } catch (err) {
                    console.error('❌ API Error:', err);
                    res.status(500).json({ error: 'Internal Server Error', details: err.message });
                }
            });
        },
    };
}
