import express from 'express';
import path from 'path';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import assetRoutes from './routes/assets';
import borrowRoutes from './routes/borrow';
import pmRoutes from './routes/pm';
import adminRoutes from './routes/admin';
import dashboardRoutes from './routes/dashboard';
import inventoryRoutes from './routes/inventory';
import categoryRoutes from './routes/categories';
import donationRoutes from './routes/donation';
import maintenanceRoutes from './routes/maintenance';
import { errorHandler } from './middleware/errorHandler';
import { startNotificationWorker } from './services/notification';
import { startOverdueChecker } from './jobs/overdueChecker';
import { apiLimiter } from './middleware/rateLimiter';

export const prisma = new PrismaClient();

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/api/', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/borrow', borrowRoutes);
app.use('/api/pm', pmRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inventory', inventoryRoutes);
  app.use('/api/categories', categoryRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/maintenance', maintenanceRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startNotificationWorker();
  startOverdueChecker();
});
