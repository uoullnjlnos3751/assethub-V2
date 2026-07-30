import { Request, Response, NextFunction } from 'express';

/** Allow JWT via ?token= for browser media requests (img, download links). */
export function allowQueryToken(req: Request, _res: Response, next: NextFunction) {
  const queryToken = req.query.token;
  if (queryToken && typeof queryToken === 'string') {
    req.headers.authorization = `Bearer ${queryToken}`;
  }
  next();
}
