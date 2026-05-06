import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import videoRoutes from './routes/video.js';
import { initAI } from './services/ai.js';
import { cleanupOldJobs } from './jobs/processor.js';
import { ensureDir } from './utils/helpers.js';

// ── Config ──
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const TEMP_DIR = process.env.TEMP_DIR || path.join(__dirname, '..', 'temp');

// ── Initialize ──
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ──
app.use('/api/video', videoRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Error handling ──
app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// ── Start server ──
async function start() {
  // Ensure temp directory exists
  await ensureDir(TEMP_DIR);
  console.log(`[Server] Temp directory: ${TEMP_DIR}`);

  // Initialize AI
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    initAI(geminiKey);
    console.log('[Server] ✅ Gemini AI initialized');
  } else {
    console.warn('[Server] ⚠️  GEMINI_API_KEY not set. AI analysis will not work.');
    console.warn('[Server]    Create a .env file with: GEMINI_API_KEY=your_key_here');
  }

  // Cleanup old jobs every 30 minutes
  setInterval(() => cleanupOldJobs(3600000), 30 * 60 * 1000);

  // Start listening
  app.listen(PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════╗');
    console.log('  ║                                      ║');
    console.log(`  ║   🎬 AutoCut Server v1.0.0           ║`);
    console.log(`  ║   📡 http://localhost:${PORT}            ║`);
    console.log('  ║                                      ║');
    console.log('  ╚══════════════════════════════════════╝');
    console.log('');
  });
}

start().catch((error) => {
  console.error('[Server] Failed to start:', error);
  process.exit(1);
});
