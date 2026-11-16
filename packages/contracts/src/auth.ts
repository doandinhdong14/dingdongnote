import { z } from 'zod';
import { UuidSchema } from './common.js';

export const UserSchema = z.object({
  id: UuidSchema,
  email: z.string().email(),
  displayName: z.string().min(1).max(100),
  timezone: z.string().default('Asia/Ho_Chi_Minh'),
  createdAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
  password: z.string().min(12, 'Mật khẩu tối thiểu 12 ký tự').max(128, 'Mật khẩu tối đa 128 ký tự'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RegisterRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
  password: z.string().min(12, 'Mật khẩu tối thiểu 12 ký tự').max(128, 'Mật khẩu tối đa 128 ký tự'),
  displayName: z.string().trim().min(1, 'Vui lòng nhập tên hiển thị').max(100),
  timezone: z.string().default('Asia/Ho_Chi_Minh'),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token không được để trống'),
});

export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int().positive(),
  refreshToken: z.string(),
  user: UserSchema,
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const UpdateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  timezone: z.string().min(1).optional(),
});

export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
