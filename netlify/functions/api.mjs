import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';

const app = express();
app.use(cors({ origin: true, methods: ['POST', 'OPTIONS'], credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', engine: process.env.GEMINI_API_KEY ? 'Gemini' : 'None' });
});

app.all('*', (req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

export const handler = serverless(app);
