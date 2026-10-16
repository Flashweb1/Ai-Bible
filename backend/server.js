import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import cron from 'node-cron';
import { initFirebaseAdmin, registerToken, unregisterToken, sendDailyVerse } from './notifications.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const geminiKey = process.env.GEMINI_API_KEY?.trim() || '';
const openrouterKey = process.env.OPENROUTER_API_KEY?.trim() || '';

const providers = [];

if (geminiKey) {
  providers.push({
    name: 'Gemini',
    type: 'gemini',
    apiKey: geminiKey,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    defaultHeaders: {},
    models: ['gemini-2.5-flash'],
  });
}

if (openrouterKey) {
  providers.push({
    name: 'OpenRouter',
    type: 'openrouter',
    apiKey: openrouterKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.SITE_URL || 'http://localhost:5173',
      'X-Title': 'Scripturai',
    },
    models: [
      'google/gemma-4-26b-a4b-it:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    ],
  });
}

if (providers.length === 0) {
  console.error('Missing AI API key. Set GEMINI_API_KEY or OPENROUTER_API_KEY in backend/.env or Vercel env variables.');
}

const providerClients = providers.map(provider => ({
  ...provider,
  client: new OpenAI({
    baseURL: provider.baseURL,
    apiKey: provider.apiKey,
    defaultHeaders: provider.defaultHeaders,
    timeout: 30000, // Timeout after 30 seconds for AI model inference
  }),
}));

const activeProviderNames = providerClients.map(p => p.name).join(', ') || 'None';
console.log(`AI Providers enabled: ${activeProviderNames}`);

// Initialize Firebase Admin for push notifications (optional)
const fbInit = initFirebaseAdmin();

function splitOrigins(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

const allowedOrigins = [
  ...new Set([
    ...splitOrigins(process.env.SITE_URL),
    ...splitOrigins(process.env.ALLOWED_ORIGINS),
    ...splitOrigins(process.env.VITE_API_URL),
    ...splitOrigins(process.env.FRONTEND_URL),
    'http://localhost:5173',
    'http://localhost:3001',
    'https://localhost:5173',
    'https://localhost:3001',
  ]),
];

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.includes(origin)
      || /(?:\.netlify\.app|\.vercel\.app)$/i.test(origin)
      || /^https?:\/\/localhost(?::\d+)?$/i.test(origin);

    if (isAllowed) {
      return callback(null, true);
    }

    return callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

const aiCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Please wait a moment before asking another question." },
  standardHeaders: true,
  legacyHeaders: false,
});

// A request should be retried on the same model when the failure is transient:
// rate limits (429), provider outages/overloads (5xx), or network hiccups.
function isRetryableError(err) {
  const status = Number(err?.status || err?.response?.status);
  if (status === 429 || (status >= 500 && status < 600)) return true;
  const msg = String(err?.message || '');
  return /429|5\d\d|timeout|timed out|ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN|socket hang up|no body|overloaded|temporarily|unavailable/i.test(msg);
}

const retryDelay = (attempt) => new Promise(r => setTimeout(r, 1000 * (attempt + 1)));

async function tryModel(client, model, messages, systemPrompt) {
  const completion = await client.chat.completions.create({
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
  for (const provider of providerClients) {
    for (const model of provider.models) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await tryModel(provider.client, model, messages, systemPrompt);
        } catch (err) {
          if (isRetryableError(err) && attempt < 2) {
            console.warn(`${provider.name} model ${model} transient error (attempt ${attempt + 1}/3):`, err.message);
            await retryDelay(attempt);
            continue;
          }
          console.warn(`${provider.name} model ${model} failed:`, err.message);
          break;
        }
      }
    }
  }
  throw new Error('AI service unavailable. Ensure OpenRouter or Gemini keys are configured and the provider is healthy.');
}

async function* tryModelStream(client, model, messages, systemPrompt) {
  const stream = await client.chat.completions.create({
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
  for (const provider of providerClients) {
    for (const model of provider.models) {
      for (let attempt = 0; attempt < 3; attempt++) {
        let wroteAny = false;
        try {
          for await (const token of tryModelStream(provider.client, model, messages, systemPrompt)) {
            wroteAny = true;
            writeToken(token);
          }
          return;
        } catch (err) {
          // Only safe to retry another provider/model if nothing was streamed yet,
          // otherwise a retry would duplicate already-sent tokens.
          if (isRetryableError(err) && attempt < 2 && !wroteAny) {
            console.warn(`${provider.name} model ${model} stream transient error (attempt ${attempt + 1}/3):`, err.message);
            await retryDelay(attempt);
            continue;
          }
          if (wroteAny) {
            console.warn(`${provider.name} model ${model} stream broke after partial output:`, err.message);
            return;
          }
          console.warn(`${provider.name} model ${model} stream failed:`, err.message);
          break;
        }
      }
      // Fallback: try non-streaming for this model
      try {
        const text = await tryModel(provider.client, model, messages, systemPrompt);
        writeToken(text);
        return;
      } catch (err) {
        console.warn(`${provider.name} model ${model} non-stream fallback also failed:`, err.message);
      }
    }
  }
  writeToken('The AI service is temporarily unavailable. Ensure OpenRouter or Gemini keys are configured and the provider is healthy.');
}

app.post('/api/ai/ask', aiLimiter, async (req, res) => {
  const { messages, systemPrompt } = req.body;

  if (!providerClients || providerClients.length === 0) {
    console.error('AI Request failed: No providers configured');
    return res.status(503).json({ error: "AI Service unconfigured on server. Check .env keys." });
  }

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
    const cached = aiCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Serving answer from AI Cache');
      return res.json({ response: cached.data });
    }
    aiCache.delete(cacheKey);
  }

  try {
    const response = await getAIResponse(messages, sys);

    aiCache.set(cacheKey, { data: response, timestamp: Date.now() });
    if (aiCache.size > 1000) aiCache.delete(aiCache.keys().next().value);

    res.json({ response });
  } catch (error) {
    console.error('AI client error:', error.message);
    res.status(500).json({ error: error.message || 'AI service unavailable' });
  }
});

app.post('/api/ai/ask/stream', aiLimiter, async (req, res) => {
  const { messages, systemPrompt } = req.body;

  if (!providerClients || providerClients.length === 0) {
    res.status(503).json({ error: "AI Service unconfigured on server. Check .env keys." });
    return;
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "Messages must be a non-empty array" });
    return;
  }

  const sys = systemPrompt || "You are 'The Scholar', a warm Bible scholar.";

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let isAborted = false;
  req.on('close', () => {
    isAborted = true;
  });

  await getAIResponseStream(messages, sys, (token) => {
    if (!isAborted) {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }
  });

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', engine: providerClients.map(p => p.name).join(', ') || 'None' });
});

app.post('/api/notifications/register', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const ok = await registerToken(token);
  res.status(ok ? 200 : 500).json({ ok });
});

app.post('/api/notifications/unregister', async (req, res) => {
  const { token } = req.body;
  if (token) await unregisterToken(token);
  res.json({ ok: true });
});

// Schedule daily verse push at 8:00 AM every day
if (fbInit) {
  cron.schedule('0 8 * * *', () => {
    console.log('[Cron] Sending daily verse...');
    sendDailyVerse();
  });
  console.log('[Cron] Daily verse notification scheduled for 8:00 AM.');
}

// Only start the server when run directly (not as a serverless function)
const isMainModule = process.argv[1]?.replace(/\\/g, '/')?.includes('server.js');
if (isMainModule) {
  app.listen(PORT, () => {
    console.log(`Scripturai Backend Running on port ${PORT}.`);
    console.log(`AI Providers: ${providerClients.map(p => p.name).join(', ') || 'None'}`);
  });
}

export default app;
