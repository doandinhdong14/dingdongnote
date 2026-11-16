import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  res.on('finish', () => {
    const elapsedNs = process.hrtime.bigint() - (req.startTime || process.hrtime.bigint());
    const durationMs = Number(elapsedNs) / 1_000_000;

    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId: req.id,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      userAgent: req.get('user-agent'),
    };

    // Structured JSON log output without sensitive payload
    if (res.statusCode >= 500) {
      console.error(JSON.stringify({ level: 'error', ...logEntry }));
    } else if (res.statusCode >= 400) {
      console.warn(JSON.stringify({ level: 'warn', ...logEntry }));
    } else {
      console.log(JSON.stringify({ level: 'info', ...logEntry }));
    }
  });

  next();
}
