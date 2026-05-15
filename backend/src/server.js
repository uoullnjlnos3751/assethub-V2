// backend/src/server.js
'use strict';
require('dotenv').config();

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');

const logger      = require('./utils/logger');
const scheduler   = require('./jobs/scheduler');

// Routes
const authRoutes        = require('./routes/auth.routes');
const adminConfigRoutes = require('./routes/admin.config.routes');
// (additional route files would be required here)

const app = express();

// ── Security & Middleware ────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
}));
app.use(morgan('combined', { stream: { write: (m) => logger.info(m.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 20,
  message: { message: 'Too many login attempts, try again later' },
}));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/admin/config', adminConfigRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status:  'ok',
    version: '2.0.0',
    time:    new Date().toISOString(),
  });
});

// 404
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// ── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`🚀 AssetHub API running on port ${PORT}`);
  logger.info(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
  logger.info(`🔐 LDAP: ${process.env.LDAP_ENABLED === 'true' ? 'Enabled (' + process.env.LDAP_HOST + ')' : 'Disabled'}`);
  logger.info(`📦 GLPI: ${process.env.GLPI_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);

  // Start cron jobs
  scheduler.init();
});

module.exports = app;
