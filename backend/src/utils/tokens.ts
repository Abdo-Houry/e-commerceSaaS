import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { CookieOptions } from 'express';
import { env, isProd } from '../config/env';

interface TokenPayload {
  sub: string;
  type: 'access' | 'refresh';
}

export const REFRESH_COOKIE = 'matjari_rt';

export function signAccessToken(userId: string): string {
  const payload: TokenPayload = { sub: userId, type: 'access' };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'] });
}

export function signRefreshToken(userId: string): string {
  const payload: TokenPayload = { sub: userId, type: 'refresh' };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_TTL as SignOptions['expiresIn'] });
}

function verify(token: string, secret: string, type: TokenPayload['type']): string | null {
  try {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === 'string' || decoded.type !== type || typeof decoded.sub !== 'string') return null;
    return decoded.sub;
  } catch {
    return null;
  }
}

export const verifyAccessToken = (token: string) => verify(token, env.JWT_ACCESS_SECRET, 'access');
export const verifyRefreshToken = (token: string) => verify(token, env.JWT_REFRESH_SECRET, 'refresh');

export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}
