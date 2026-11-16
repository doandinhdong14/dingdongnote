import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';

export const healthRouter = Router();

healthRouter.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/ready', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unavailable',
      database: 'disconnected',
      error: error?.message || 'Database unavailable',
      timestamp: new Date().toISOString(),
    });
  }
});
