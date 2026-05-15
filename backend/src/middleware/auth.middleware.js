// backend/src/middleware/auth.middleware.js
'use strict';

const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ message: 'No token provided' });

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach decoded payload; optionally re-check DB for freshness
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const requireRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role))
    return res.status(403).json({ message: 'Insufficient permissions' });
  next();
};

const requirePermission = (perm) => (req, res, next) => {
  if (!req.user?.[perm])
    return res.status(403).json({ message: 'Permission denied' });
  next();
};

module.exports = { authMiddleware, requireRole, requirePermission };
