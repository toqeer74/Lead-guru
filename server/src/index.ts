import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import leadsRouter from './routes/leads';
import aiRouter from './routes/ai';

dotenv.config();

const app = express();

// Config
const PORT = Number(process.env.PORT) || 8080;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(morgan('dev'));

// Health
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', name: 'LeadProton Server' });
});

// Routes
app.use('/api/leads', leadsRouter);
app.use('/api/ai', aiRouter);

// Root
app.get('/', (_req, res) => {
  res.send('LeadProton Server is running');
});

// Start
app.listen(PORT, () => {
  console.log(`LeadProton server listening on http://localhost:${PORT}`);
});
