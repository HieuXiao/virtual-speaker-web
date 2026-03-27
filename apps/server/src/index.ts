import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import type { HelloResponse } from '@virtual-speaker/shared';

dotenv.config();

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

app.post('/api/tts', async (req, res) => {
  const { text, voice } = req.body;
  const FPT_API_KEY = process.env.FPT_API_KEY;

  console.log(`[API] Gọi FPT.AI: "${text}" với giọng "${voice}"`);

  if (!FPT_API_KEY) {
    console.error("[API] Lỗi: Không tìm thấy FPT_API_KEY trong file .env!");
    return res.status(500).json({ error: 'FPT_API_KEY not configured' });
  }

  try {
    const response = await fetch('https://api.fpt.ai/hmi/tts/v5', {
      method: 'POST',
      headers: {
        'api-key': FPT_API_KEY,
        'voice': voice,
      },
      body: text
    });

    if (!response.ok) {
      throw new Error(`FPT.AI returned ${response.status}`);
    }

    const data = await response.json();
    res.json(data);

  } catch (error: any) {
    console.error("[API] Lỗi khi gọi FPT.AI:", error.message);
    res.status(500).json({ error: 'Failed to call FPT.AI', details: error.message });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
