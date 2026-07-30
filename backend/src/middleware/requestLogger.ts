import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = randomBytes(8).toString('hex');
  (req as any).id = requestId;

  const startTime = Date.now();
  const method = req.method;
  const path = req.path;

  // Log request
  console.log(JSON.stringify({
    type: 'REQUEST',
    requestId,
    timestamp: new Date().toISOString(),
    method,
    path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
  }));

  // Capture response
  const originalJson = res.json.bind(res);
  res.json = function (data: any) {
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      type: 'RESPONSE',
      requestId,
      timestamp: new Date().toISOString(),
      method,
      path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    }));
    return originalJson(data);
  };

  next();
}
