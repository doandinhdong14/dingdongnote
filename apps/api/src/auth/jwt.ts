import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import crypto from 'node:crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_key_change_in_production_min_32_chars';
const JWT_ISSUER = process.env.JWT_ISSUER || 'dingdongnote-api';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'dingdongnote-app';
const ACCESS_TOKEN_TTL = Number(process.env.ACCESS_TOKEN_TTL) || 900; // 15 minutes (900 seconds)
const REFRESH_TOKEN_TTL = Number(process.env.REFRESH_TOKEN_TTL) || 2592000; // 30 days (2592000 seconds)

export interface AuthUserPayload {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
}

export function generateAccessToken(user: AuthUserPayload): { token: string; expiresIn: number } {
  const options: SignOptions = {
    algorithm: 'HS256',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    subject: user.id,
    expiresIn: ACCESS_TOKEN_TTL,
  };

  const token = jwt.sign(
    {
      email: user.email,
      displayName: user.displayName,
      timezone: user.timezone,
    },
    JWT_SECRET,
    options
  );

  return { token, expiresIn: ACCESS_TOKEN_TTL };
}

export function verifyAccessToken(token: string): AuthUserPayload {
  const options: VerifyOptions = {
    algorithms: ['HS256'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  };

  const decoded = jwt.verify(token, JWT_SECRET, options) as jwt.JwtPayload;

  return {
    id: decoded.sub as string,
    email: decoded.email,
    displayName: decoded.displayName,
    timezone: decoded.timezone,
  };
}

export function generateRefreshToken(): { token: string; hash: string; expiresAt: Date } {
  // 64-character hex cryptographically secure token
  const token = crypto.randomBytes(32).toString('hex');
  const hash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);

  return { token, hash, expiresAt };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
