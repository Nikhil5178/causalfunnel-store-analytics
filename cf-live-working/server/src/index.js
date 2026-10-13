import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import eventRoutes from './routes/events.js';

const app = express();
const port = process.env.PORT || 5000;
const configuredOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:5174').split(',').map(s => s.trim()).filter(Boolean);
const isAllowedOrigin = origin => !origin || configuredOrigins.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors({ origin(origin, callback) {
  if (isAllowedOrigin(origin)) return callback(null, true);
  return callback(new Error(`CORS blocked origin: ${origin}`));
} }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', eventRoutes);
app.get('/tracker.js', (_req, res) => {
  res.sendFile(path.resolve(__dirname, '../public/tracker.js'));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/causalfunnel_analytics');
  console.log('Connected to MongoDB');
  app.listen(port, () => console.log(`Analytics API listening on http://localhost:${port}`));
} catch (error) {
  console.error('Could not connect to MongoDB:', error.message);
  process.exit(1);
}
