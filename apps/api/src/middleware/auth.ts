import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AuthUserPayload } from '../auth/jwt.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Yêu cầu đăng nhập để truy cập tài nguyên này',
      },
      meta: {
        requestId: req.id,
      },
    });
  }

  const token = authHeader.substring(7).trim();

  try {
    const user = verifyAccessToken(token);
    req.user = user;
    next();
  } catch (err: any) {
    return res.status(401).json({
      error: {
        code: 'TOKEN_EXPIRED_OR_INVALID',
        message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ',
      },
      meta: {
        requestId: req.id,
      },
    });
  }
}
