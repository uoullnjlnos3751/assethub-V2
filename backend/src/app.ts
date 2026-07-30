import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import assetRoutes from './routes/assets';
import borrowRoutes from './routes/borrow';
import pmRoutes from './routes/pm';
import pmSwHubRoutes from './routes/pmSwHub';
import pmSwHubPlanRoutes from './routes/pmSwHubPlan';
import pmSwHubTemplateRoutes from './routes/pmSwHubTemplate';
import adminRoutes from './routes/admin';
import dashboardRoutes from './routes/dashboard';
import inventoryRoutes from './routes/inventory';
import categoryRoutes from './routes/categories';
import departmentRoutes from './routes/departments';
import donationRoutes from './routes/donation';
import maintenanceRoutes from './routes/maintenance';
import notificationsRoutes from './routes/notifications';
import backupRoutes from './routes/backup';
import settingsRoutes from './routes/settings';
import uploadsRoutes from './routes/uploads';
import aiRoutes from './routes/ai';
import floorplanRoutes from './routes/floorplan';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';
import { prisma } from './lib/prisma';

function parseEnvOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => v.replace(/\/$/, ''));
}

const explicitAllowedOrigins = new Set<string>([
  ...parseEnvOrigins(process.env.CORS_ORIGIN),
  ...parseEnvOrigins(process.env.FRONTEND_URL),
  'http://10.100.22.121',
  'http://localhost:5173',
  'http://itsm.trrgroup.com:5173',
  'http://itsm.trrgroup.com',
  'http://itam.trrgroup.com:5173',
  'http://itam.trrgroup.com',
  'https://itsm.trrgroup.com',
  'https://itam.trrgroup.com',
]);

const allowedOriginHostnames = new Set<string>([
  'localhost',
  '127.0.0.1',
  '10.100.22.121',
  'itsm.trrgroup.com',
  'itam.trrgroup.com',
]);

export function createApp() {
  const app = express();

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.replace(/\/$/, '');

      if (explicitAllowedOrigins.has(normalizedOrigin)) return callback(null, true);

      try {
        const url = new URL(normalizedOrigin);
        if (allowedOriginHostnames.has(url.hostname)) return callback(null, true);
      } catch {}

      callback(new Error(`CORS not allowed for origin: ${origin}`));
    },
    credentials: true,
  }));

  app.use(requestLogger);
  app.use(express.json({ limit: '50mb' }));

  app.use('/uploads', uploadsRoutes);
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/', apiLimiter);
  app.use('/api/assets', assetRoutes);
  app.use('/api/borrow', borrowRoutes);
  app.use('/api/pm', pmRoutes);
  app.use('/api/pm-sw-hub', pmSwHubRoutes);
  app.use('/api/pm-sw-hub-plan', pmSwHubPlanRoutes);
  app.use('/api/pm-sw-hub-template', pmSwHubTemplateRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/donations', donationRoutes);
  app.use('/api/maintenance', maintenanceRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/backup', backupRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/floorplans', floorplanRoutes);

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  });

  app.get('/api/ready', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(503).json({
        status: 'not-ready',
        error: 'Database connection failed',
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.use(errorHandler);

  return app;
}
