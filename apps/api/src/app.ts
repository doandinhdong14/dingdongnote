import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { requestIdMiddleware } from './middleware/requestId.js';
import { requestLogger } from './middleware/logger.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { notesRouter } from './routes/notes.js';
import { tasksRouter } from './routes/tasks.js';
import { focusRouter } from './routes/focus.js';
import { habitsRouter } from './routes/habits.js';
import { categoriesRouter, transactionsRouter } from './routes/finance.js';
import { summaryRouter } from './routes/summary.js';
import { syncRouter } from './routes/sync.js';

export function createApp() {
  const app = express();

  // Security & utility headers
  app.disable('x-powered-by');

  // Request ID & Structured Logging
  app.use(requestIdMiddleware);
  app.use(requestLogger);

  // CORS
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'],
  }));

  // Body parser with 256KB limit (spec section 8)
  app.use(express.json({ limit: '256kb' }));

  // Health check routes
  app.use('/health', healthRouter);

  // API v1 routes
  const v1 = express.Router();
  v1.use('/auth', authRouter);
  v1.use('/me', authRouter);
  v1.use('/notes', notesRouter);
  v1.use('/tasks', tasksRouter);
  v1.use('/focus', focusRouter);
  v1.use('/habits', habitsRouter);
  v1.use('/categories', categoriesRouter);
  v1.use('/transactions', transactionsRouter);
  v1.use('/summary', summaryRouter);
  v1.use('/sync', syncRouter);

  v1.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'DingDongNote API',
      version: 'v1',
      requestId: req.id,
    });
  });

  app.use('/api/v1', v1);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Đường dẫn ${req.method} ${req.path} không tồn tại`,
      },
      meta: {
        requestId: req.id,
      },
    });
  });

  // Global error handler
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const statusCode = err.status || err.statusCode || 500;
    const isDev = process.env.NODE_ENV === 'development';

    res.status(statusCode).json({
      error: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        message: err.message || 'Đã có lỗi xảy ra trên hệ thống',
        details: isDev ? err.stack : undefined,
      },
      meta: {
        requestId: req.id,
      },
    });
  });

  return app;
}
