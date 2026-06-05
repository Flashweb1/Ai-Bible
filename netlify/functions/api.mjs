import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';

const app = express();

app.use((req, res, next) => {
  const prefix = '/.netlify/functions/api';
  if (req.url.startsWith(prefix)) {
    req.url = req.url.slice(prefix.length) || '/';
  }
  next();
});

app.use(cors({ origin: true, methods: ['POST', 'OPTIONS'], credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', engine: process.env.GEMINI_API_KEY ? 'Gemini' : 'None' });
});

app.all('*', (req, res) => {
  res.status(404).json({ error: 'function route not found', path: req.url });
});

export const handler = serverless(app);
