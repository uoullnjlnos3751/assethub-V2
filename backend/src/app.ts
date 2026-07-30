import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import assetRoutes from './routes/assets';
import assetMasterDataRoutes from './routes/assetMasterData';
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
import { isProduction } from './config/env';
import { prisma } from './lib/prisma';

function parseEnvOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => v.replace(/\/$/, ''));
}

// Exact origins, scheme and port included: CORS_ORIGIN (comma-separated) plus
// FRONTEND_URL.
const explicitAllowedOrigins = new Set<string>([
  ...parseEnvOrigins(process.env.CORS_ORIGIN),
  ...parseEnvOrigins(process.env.FRONTEND_URL),
]);

// Hostname-level allowance: any scheme/port on these hosts passes. Looser than
// the exact list, so it stays opt-in via CORS_ALLOWED_HOSTNAMES — set it for
// hosts reached by several URLs (bare host, :5173, http and https, raw IP).
// Outside production, localhost is allowed so `npm run dev` needs no config.
const allowedOriginHostnames = new Set<string>([
  ...parseEnvOrigins(process.env.CORS_ALLOWED_HOSTNAMES),
  ...(isProduction() ? [] : ['localhost', '127.0.0.1']),
]);

if (isProduction() && explicitAllowedOrigins.size === 0 && allowedOriginHostnames.size === 0) {
  console.warn(
    '[cors] No origins configured — every cross-origin browser request will be rejected. ' +
      'Set CORS_ORIGIN (and CORS_ALLOWED_HOSTNAMES if a host is reached by several URLs).'
  );
}

export function createApp() {
  const app = express();

  // The app sits behind nginx (see nginx/nginx.conf), so req.ip and req.secure
  // are the proxy's, not the client's, unless we trust the proxy's
  // X-Forwarded-* headers. Without this, express-rate-limit sees every
  // request as coming from nginx's IP — loginLimiter's 15-per-15-min budget
  // would be shared by the whole office instead of applied per client.
  // `1` trusts exactly one hop, matching the single nginx in front of this
  // container. TRUST_PROXY_HOPS overrides it if the topology changes (e.g.
  // an additional load balancer in front of nginx).
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));

  // Baseline security headers. Written by hand rather than pulling in the
  // `helmet` package, since adding a dependency here would also need
  // package-lock.json regenerated via `npm install` — do that if the project
  // wants helmet's fuller header set (CSP, COEP, etc.) later.
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
    res.removeHeader('X-Powered-By');
    if (isProduction()) {
      res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    }
    next();
  });

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

  // Body limits. Images arrive as multipart/form-data through multer, not as
  // JSON, so only the bulk import path (POST /api/assets/import/json) needs a
  // large JSON body. Give that router a bigger limit and keep everything else
  // small — a 50mb global limit let any endpoint be used to push 50mb of JSON.
  // Order matters: the scoped parser must run first, since express.json skips
  // a request whose body another parser already read.
  app.use('/api/assets', express.json({ limit: process.env.IMPORT_BODY_LIMIT || '25mb' }));
  app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '2mb' }));

  app.use('/uploads', uploadsRoutes);
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/', apiLimiter);
  // Must be registered before assetRoutes: these are fixed segments
  // (/device-types, /locations, ...) split out of assets.ts, and assetRoutes
  // has a GET /:id that would otherwise swallow them — Express tries
  // same-path routers in registration order, so this has to go first for
  // e.g. GET /api/assets/device-types to reach the right handler instead of
  // being parsed as "get asset with id 'device-types'".
  app.use('/api/assets', assetMasterDataRoutes);
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
