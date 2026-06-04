import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const geminiKey = process.env.GEMINI_API_KEY || '';
const openrouterKey = process.env.OPENROUTER_API_KEY || '';
const isGemini = geminiKey.startsWith('AIzaSy');
const apiKey = isGemini ? geminiKey : openrouterKey;

const aiClient = new OpenAI({
  baseURL: isGemini 
    ? 'https://generativelanguage.googleapis.com/v1beta/openai/' 
    : 'https://openrouter.ai/api/v1',
  apiKey: apiKey,
  defaultHeaders: isGemini ? {} : {
    'HTTP-Referer': process.env.SITE_URL || 'http://localhost:5173',
    'X-Title': 'Scriptura',
  },
});

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['POST', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());

const aiCache = new Map();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Please wait a moment before asking another question." },
  standardHeaders: true,
  legacyHeaders: false,
});

const MODELS = isGemini 
  ? ['gemini-3.5-flash', 'gemini-2.5-flash'] 
  : [
      'deepseek/deepseek-chat',
      'deepseek/deepseek-v4-flash:free',
      'meta-llama/llama-3.3-70b-instruct:free',
    ];

async function tryModel(model, messages, systemPrompt) {
  const completion = await aiClient.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content }))
    ],
    max_tokens: 1024,
  });
  return completion.choices[0].message.content;
}

async function getAIResponse(messages, systemPrompt) {
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await tryModel(model, messages, systemPrompt);
      } catch (err) {
        const isRateLimit = err.status === 429 || (err.message || '').includes('429');
        if (isRateLimit && attempt < 2) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        console.warn(`Model ${model} failed:`, err.message);
        break;
      }
    }
  }
  throw new Error('AI service unavailable. Adding $5 at openrouter.ai/settings/credits restores access.');
}

async function* tryModelStream(model, messages, systemPrompt) {
  const stream = await aiClient.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content }))
    ],
    max_tokens: 1024,
    stream: true,
  });
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || '';
    if (token) yield token;
  }
}

async function getAIResponseStream(messages, systemPrompt, writeToken) {
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        for await (const token of tryModelStream(model, messages, systemPrompt)) {
          writeToken(token);
        }
        return;
      } catch (err) {
        const isRateLimit = err.status === 429 || (err.message || '').includes('429');
        if (isRateLimit && attempt < 2) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        console.warn(`Model ${model} stream failed:`, err.message);
        break;
      }
    }
    // Fallback: try non-streaming for this model
    try {
      const text = await tryModel(model, messages, systemPrompt);
      writeToken(text);
      return;
    } catch (err) {
      console.warn(`Model ${model} non-stream fallback also failed:`, err.message);
    }
  }
  writeToken('The AI service is temporarily unavailable. Adding a small credit balance ($5) at openrouter.ai/settings/credits will restore access immediately.');
}

app.post('/api/ai/ask', aiLimiter, async (req, res) => {
  const { messages, systemPrompt } = req.body;

  // Input validation
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Messages must be a non-empty array" });
  }

  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      return res.status(400).json({ error: "Each message must have 'role' and 'content'" });
    }
  }

  const sys = systemPrompt || "You are 'The Scholar', a warm Bible scholar.";

  const cacheString = JSON.stringify({ messages, sys });
  const cacheKey = crypto.createHash('sha256').update(cacheString).digest('hex');

  if (aiCache.has(cacheKey)) {
    console.log('Serving answer from AI Cache');
    return res.json({ response: aiCache.get(cacheKey) });
  }

  try {
    const response = await getAIResponse(messages, sys);

    aiCache.set(cacheKey, response);
    if (aiCache.size > 1000) aiCache.delete(aiCache.keys().next().value);

    res.json({ response });
  } catch (error) {
    console.error('AI client error:', error.message);
    res.status(500).json({ error: error.message || 'AI service unavailable' });
  }
});

app.post('/api/ai/ask/stream', aiLimiter, async (req, res) => {
  const { messages, systemPrompt } = req.body;
  const sys = systemPrompt || "You are 'The Scholar', a warm Bible scholar.";

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  await getAIResponseStream(messages, sys, (token) => {
    res.write(`data: ${JSON.stringify({ token })}\n\n`);
  });

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', engine: isGemini ? 'Gemini API' : 'OpenRouter' });
});

app.listen(PORT, () => {
  console.log(`Scriptura Backend Running on port ${PORT}`);
  console.log(`AI Engine: ${isGemini ? 'Gemini API' : 'OpenRouter'}`);
});
