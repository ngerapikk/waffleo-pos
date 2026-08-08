// WAFFLEO POS — Backend Entry Point
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.routes';
import orderRoutes from './routes/order.routes';
import channelRoutes from './routes/channel.routes';
import menuRoutes from './routes/menu.routes';
import inventoryRoutes from './routes/inventory.routes';
import reportRoutes from './routes/report.routes';
import settingsRoutes from './routes/settings.routes';
import promoRoutes from './routes/promo.routes';
import shiftRoutes from './routes/shift.routes';
import refundRoutes from './routes/refund.routes';
import auditRoutes from './routes/audit.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL, 'http://localhost:5173'] : '*',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'waffleo-pos-backend',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/promo', promoRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/audits', auditRoutes);

// Error envelope (Claude.md §E — centralized API error handling)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    code: err.code || 'INTERNAL_ERROR',
    message: err.message || 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

import { createServer } from 'http';
import { initWebSocket } from './lib/ws';

const server = createServer(app);
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`🧇 WAFFLEO POS Backend running on port ${PORT}`);
});

export default app;
