import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { PrismaClient, VrmModel } from '@prisma/client';
import type { HelloResponse } from '@virtual-speaker/shared';

dotenv.config();

/**
 * Swagger Configuration
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Virtual Speaker API',
      version: '1.0.0',
      description: 'API documentation for Virtual Speaker project',
    },
    servers: [
      {
        url: 'http://localhost:3001',
      },
    ],
  },
  apis: [path.join(__dirname, './index.ts')], // Path to the API docs
};

const specs = swaggerJsdoc(swaggerOptions);

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files
app.use('/models', express.static(path.join(__dirname, '../public/models')));
app.use('/animations', express.static(path.join(__dirname, '../public/animations')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Serve Frontend in Production
const frontendPath = path.join(__dirname, '../../web/dist');
app.use(express.static(frontendPath));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Multer setup for VRM uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads/models'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (_req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.vrm') {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép tải lên file .vrm!'));
    }
  }
});

/**
 * @swagger
 * /api/hello:
 *   get:
 *     summary: Health check endpoint
 *     responses:
 *       200:
 *         description: Hello from the server
 */
app.get('/api/hello', (_req, res) => {
  const response: HelloResponse = {
    message: 'Hello from Virtual Speaker Server! 🎙️',
    timestamp: new Date().toISOString(),
    service: 'api-server',
  };
  res.json(response);
});

/**
 * @swagger
 * /api/models:
 *   get:
 *     summary: Get list of available VRM models
 *     responses:
 *       200:
 *         description: List of models
 */
app.get('/api/models', async (_req, res) => {
  try {
    const models = await prisma.vrmModel.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    // Combine with default models
    const defaultModels = [
      { id: 999, name: 'Mặc định', path: '/models/model.vrm', icon: '👤' },
      { id: 998, name: 'Boy Glass', path: '/models/boyGlass.vrm', icon: '🕶️' },
      { id: 997, name: 'Lady', path: '/models/lady.vrm', icon: '💃' },
      { id: 996, name: 'Mew Mew', path: '/models/mewMew.vrm', icon: '🐱' },
    ];

    const dbModels = models.map((m: VrmModel) => ({
      id: m.id,
      name: m.name,
      path: m.path,
      icon: m.icon
    }));

    res.json([...defaultModels, ...dbModels]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

/**
 * @swagger
 * /api/models:
 *   post:
 *     summary: Upload a new VRM model
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               name:
 *                 type: string
 *               icon:
 *                 type: string
 *     responses:
 *       200:
 *         description: Model uploaded successfully
 */
app.post('/api/models', upload.single('file'), async (req, res) => {
  try {
    const { name, icon } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const newModel = await prisma.vrmModel.create({
      data: {
        name: name || file.originalname,
        path: `/uploads/models/${file.filename}`,
        icon: icon || '👤',
      }
    });

    res.json(newModel);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to save model', details: error.message });
  }
});

/**
 * @swagger
 * /api/tts:
 *   post:
 *     summary: Convert text to speech using FPT.AI
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *               voice:
 *                 type: string
 *     responses:
 *       200:
 *         description: Audio URL from FPT.AI
 */
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

// Catch-all route to serve index.html (SPA support)
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../web/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📝 Swagger documentation available at http://localhost:${PORT}/api-docs`);
});
