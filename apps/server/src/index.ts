import express from 'express';
import cors from 'cors';
import type { HelloResponse } from '@virtual-speaker/shared';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/hello', (_req, res) => {
  const response: HelloResponse = {
    message: 'Hello from Virtual Speaker Server! 🎙️',
    timestamp: new Date().toISOString(),
    service: 'api-server',
  };
  res.json(response);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
