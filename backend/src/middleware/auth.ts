import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { getJwtSecret } from '../config/env';

// Name is deliberately not "token" — a generic name makes a stray cookie
// easier to spot as belonging to this app in browser devtools.
export const AUTH_COOKIE_NAME = 'assethub_session';

// No `cookie-parser` dependency: adding one means regenerating
// package-lock.json via `npm install`, which could not be verified in the
// sandbox this was written in. A raw `Cookie` header is trivial to parse.
function parseCookieHeader(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      out[key] = part.slice(eq + 1).trim();
    }
  }
  return out;
}

// JWT_EXPIRES_IN accepts jsonwebtoken's own formats ('24h', '30m', a plain
// number of seconds, ...). Cookie maxAge needs milliseconds, so only the
// common "<number><unit>" shape is parsed here; anything else falls back to
// 24h for the cookie lifetime specifically (the token itself still honors
// whatever generateToken() signs it with).
function cookieMaxAgeMs(): number {
  const raw = process.env.JWT_EXPIRES_IN || '24h';
  const match = /^(\d+)\s*([smhd])$/.exec(raw.trim());
  if (!match) return 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as 's' | 'm' | 'h' | 'd'];
  return value * unitMs;
}

// httpOnly means client-side JS can never read this cookie (closes the XSS
// path that reading the token out of localStorage left open). `sameSite:
// 'lax'` is enough here: nginx serves the frontend and /api/ from the same
// origin in every real deployment (nginx/nginx.conf), so this is a same-site
// cookie in practice; Lax also still allows it on top-level GET navigations
// like the backup-download link, which `sameSite: 'strict'` would block.
//
// `secure` is tied to req.secure, NOT to NODE_ENV=production. This
// deployment's production nginx (nginx/nginx.conf) currently listens on
// plain :80 — CORS_ORIGIN and FRONTEND_URL in .env.docker.prod are
// http://itam.trrgroup.com, not https. A Secure cookie is never sent by the
// browser over plain HTTP, so `secure: isProduction()` would have made every
// production login silently fail to persist (200 response, session cookie
// dropped, user bounced straight back to the login page). req.secure reads
// the real scheme from X-Forwarded-Proto (nginx sets this; app.ts sets
// `trust proxy` for exactly this), so it's Secure when actually served over
// HTTPS and plain when not, regardless of NODE_ENV. If TLS is added in front
// of nginx later, this starts sending Secure automatically — no code change
// needed.
export function setAuthCookie(req: Request, res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: req.secure,
    sameSite: 'lax',
    path: '/',
    maxAge: cookieMaxAgeMs(),
  });
}

export function clearAuthCookie(req: Request, res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: req.secure,
    sameSite: 'lax',
    path: '/',
  });
}

export interface AuthUser {
  userId: number;
  adUsername: string;
  role: string;
  displayName: string | null;
  email: string | null;
  department: string | null;
  company?: string | null;
  companyThai?: string | null;
  avatarUrl?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function generateToken(user: AuthUser): string {
  // JWT_EXPIRES_IN was documented in .env.example but never read here — every
  // token was hardcoded to 24h regardless of the env value. Wired it up;
  // 24h remains the default so existing deployments see no change unless
  // they set the variable.
  const expiresIn = (process.env.JWT_EXPIRES_IN || '24h') as jwt.SignOptions['expiresIn'];
  return jwt.sign(user, getJwtSecret(), { expiresIn });
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  // Prefer the Authorization header (non-browser clients, scripts, and the
  // allowQueryToken fallback for <img>/download links all still set this),
  // then fall back to the httpOnly cookie the browser SPA now relies on.
  const authHeader = req.headers.authorization;
  let token: string | undefined;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else {
    token = parseCookieHeader(req.headers.cookie)[AUTH_COOKIE_NAME];
  }

  if (!token) {
    return next(new AppError('ไม่พบ Token การยืนยันตัวตน', 401));
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    return next(new AppError('Token ไม่ถูกต้องหรือหมดอายุ', 401));
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('ไม่ได้ล็อกอิน', 401));
    if (!roles.includes(req.user.role)) return next(new AppError('ไม่มีสิทธิ์เข้าถึง', 403));
    next();
  };
}
