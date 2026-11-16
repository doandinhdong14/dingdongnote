import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      id: string;
      startTime: bigint;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const reqId = (req.header('x-request-id') || randomUUID());
  req.id = reqId;
  req.startTime = process.hrtime.bigint();
  res.setHeader('X-Request-Id', reqId);
  next();
}
