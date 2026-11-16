import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { LoginRequestSchema, UpdateProfileSchema } from '@dingdong/contracts';
import { defaultStore } from '../store/inMemoryStore.js';
import { verifyPassword } from '../auth/password.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from '../auth/jwt.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

// POST /auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  const parseResult = LoginRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu đăng nhập không hợp lệ',
        fields: parseResult.error.flatten().fieldErrors,
      },
      meta: { requestId: req.id },
    });
  }

  const { email, password } = parseResult.data;
  const user = defaultStore.findUserByEmail(email);

  if (!user) {
    return res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Email hoặc mật khẩu không chính xác',
      },
      meta: { requestId: req.id },
    });
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    return res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Email hoặc mật khẩu không chính xác',
      },
      meta: { requestId: req.id },
    });
  }

  const userPayload = {
    id: user.id,
    email: user.emailNormalized,
    displayName: user.displayName,
    timezone: user.timezone,
  };

  const { token: accessToken, expiresIn } = generateAccessToken(userPayload);
  const { token: refreshToken, hash: refreshHash, expiresAt } = generateRefreshToken();

  const familyId = randomUUID();
  defaultStore.createSession({
    id: randomUUID(),
    userId: user.id,
    refreshHash,
    familyId,
    expiresAt,
    revokedAt: null,
    deviceLabel: req.get('user-agent') || 'Mobile App',
    createdAt: new Date(),
  });

  res.status(200).json({
    data: {
      accessToken,
      expiresIn,
      refreshToken,
      user: {
        id: user.id,
        email: user.emailNormalized,
        displayName: user.displayName,
        timezone: user.timezone,
        createdAt: user.createdAt.toISOString(),
      },
    },
    meta: { requestId: req.id },
  });
});

// POST /auth/refresh
authRouter.post('/refresh', (req: Request, res: Response) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Refresh token không được để trống',
      },
      meta: { requestId: req.id },
    });
  }

  const tokenHash = hashToken(refreshToken);
  const session = defaultStore.findSessionByRefreshHash(tokenHash);

  if (!session) {
    return res.status(401).json({
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token không tồn tại',
      },
      meta: { requestId: req.id },
    });
  }

  // Token reuse detection (family revocation)
  if (session.revokedAt !== null) {
    defaultStore.revokeSessionFamily(session.familyId);
    return res.status(401).json({
      error: {
        code: 'TOKEN_REUSED',
        message: 'Phát hiện refresh token đã sử dụng, phiên làm việc bị thu hồi vì lý do bảo mật',
      },
      meta: { requestId: req.id },
    });
  }

  if (session.expiresAt.getTime() < Date.now()) {
    defaultStore.revokeSession(session.id);
    return res.status(401).json({
      error: {
        code: 'REFRESH_TOKEN_EXPIRED',
        message: 'Phiên đăng nhập đã hết hạn',
      },
      meta: { requestId: req.id },
    });
  }

  // Revoke old session and issue new pair in same family
  defaultStore.revokeSession(session.id);

  const user = defaultStore.findUserById(session.userId);
  if (!user) {
    return res.status(401).json({
      error: {
        code: 'USER_NOT_FOUND',
        message: 'Người dùng không tồn tại',
      },
      meta: { requestId: req.id },
    });
  }

  const userPayload = {
    id: user.id,
    email: user.emailNormalized,
    displayName: user.displayName,
    timezone: user.timezone,
  };

  const { token: newAccessToken, expiresIn } = generateAccessToken(userPayload);
  const { token: newRefreshToken, hash: newRefreshHash, expiresAt: newExpiresAt } = generateRefreshToken();

  defaultStore.createSession({
    id: randomUUID(),
    userId: user.id,
    refreshHash: newRefreshHash,
    familyId: session.familyId,
    expiresAt: newExpiresAt,
    revokedAt: null,
    deviceLabel: session.deviceLabel,
    createdAt: new Date(),
  });

  res.status(200).json({
    data: {
      accessToken: newAccessToken,
      expiresIn,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.emailNormalized,
        displayName: user.displayName,
        timezone: user.timezone,
        createdAt: user.createdAt.toISOString(),
      },
    },
    meta: { requestId: req.id },
  });
});

// POST /auth/logout
authRouter.post('/logout', requireAuth, (req: Request, res: Response) => {
  const { refreshToken } = req.body || {};
  if (refreshToken && typeof refreshToken === 'string') {
    const tokenHash = hashToken(refreshToken);
    const session = defaultStore.findSessionByRefreshHash(tokenHash);
    if (session && session.userId === req.user!.id) {
      defaultStore.revokeSession(session.id);
    }
  }

  res.status(200).json({
    data: { success: true },
    meta: { requestId: req.id },
  });
});

// GET /me
authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = defaultStore.findUserById(req.user!.id);
  if (!user) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy người dùng' },
      meta: { requestId: req.id },
    });
  }

  res.status(200).json({
    data: {
      id: user.id,
      email: user.emailNormalized,
      displayName: user.displayName,
      timezone: user.timezone,
      createdAt: user.createdAt.toISOString(),
    },
    meta: { requestId: req.id },
  });
});

// GET /me/export (Xuất dữ liệu thuộc user)
authRouter.get('/export', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const user = defaultStore.findUserById(userId);

  const notes = defaultStore.listNotes(userId);
  const tasks = defaultStore.listTasks(userId);
  const habits = defaultStore.listHabits(userId);
  const categories = defaultStore.listCategories(userId);
  const transactions = defaultStore.listTransactions(userId);

  res.status(200).json({
    data: {
      exportedAt: new Date().toISOString(),
      user: {
        id: user?.id,
        email: user?.emailNormalized,
        displayName: user?.displayName,
        timezone: user?.timezone,
      },
      notes,
      tasks,
      habits,
      categories,
      transactions: transactions.map((t) => ({ ...t, amount: t.amount.toString() })),
    },
    meta: { requestId: req.id },
  });
});

// DELETE /me (Xóa tài khoản, yêu cầu mật khẩu xác thực lại theo mục 7 & 8)
authRouter.delete('/', requireAuth, async (req: Request, res: Response) => {
  const { password } = req.body || {};
  const userId = req.user!.id;
  const user = defaultStore.findUserById(userId);

  if (!user) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy người dùng' },
      meta: { requestId: req.id },
    });
  }

  if (!password) {
    return res.status(400).json({
      error: { code: 'PASSWORD_REQUIRED', message: 'Vui lòng nhập mật khẩu để xác nhận xóa tài khoản' },
      meta: { requestId: req.id },
    });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({
      error: { code: 'INVALID_PASSWORD', message: 'Mật khẩu xác nhận không chính xác' },
      meta: { requestId: req.id },
    });
  }

  // Purge user data
  defaultStore.revokeAllUserSessions(userId);
  for (const n of defaultStore.listNotes(userId)) n.deletedAt = new Date();
  for (const t of defaultStore.listTasks(userId)) t.deletedAt = new Date();
  for (const h of defaultStore.listHabits(userId)) h.deletedAt = new Date();
  for (const c of defaultStore.listCategories(userId)) c.deletedAt = new Date();
  for (const tx of defaultStore.listTransactions(userId)) tx.deletedAt = new Date();

  defaultStore.users.delete(userId);
  defaultStore.usersByEmail.delete(user.emailNormalized);

  res.status(200).json({
    data: { success: true, message: 'Tài khoản và toàn bộ dữ liệu đã được xóa hoàn toàn' },
    meta: { requestId: req.id },
  });
});

