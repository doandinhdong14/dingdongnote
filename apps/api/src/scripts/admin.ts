import { randomUUID } from 'node:crypto';
import { hashPassword } from '../auth/password.js';
import { defaultStore } from '../store/inMemoryStore.js';

export async function createOrResetMasterUser(
  email: string,
  plainPassword: string,
  displayName = 'Đoàn Đình Đông',
  timezone = 'Asia/Ho_Chi_Minh'
) {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await hashPassword(plainPassword);

  const existing = defaultStore.findUserByEmail(normalizedEmail);
  if (existing) {
    existing.passwordHash = passwordHash;
    existing.displayName = displayName;
    existing.timezone = timezone;
    existing.updatedAt = new Date();
    // Revoke all sessions on password reset
    defaultStore.revokeAllUserSessions(existing.id);
    console.log(`[Admin] Đã đặt lại mật khẩu cho tài khoản: ${normalizedEmail}`);
    return existing;
  }

  const user = defaultStore.createUser({
    id: randomUUID(),
    emailNormalized: normalizedEmail,
    passwordHash,
    displayName,
    timezone,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`[Admin] Đã tạo tài khoản chủ sở hữu mới: ${normalizedEmail} (${user.id})`);
  return user;
}
