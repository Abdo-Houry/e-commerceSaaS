import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const message = (text: string) => ({ error: { code: 'RATE_LIMITED', message: text } });
const skip = () => env.NODE_ENV === 'test';

export const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip,
  message: message('محاولات كثيرة، حاول مجدداً بعد دقيقة'),
});

export const orderCreateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip,
  message: message('طلبات كثيرة، انتظر دقيقة ثم حاول مجدداً'),
});

/** Public reads are mostly server-rendered and cached; this only stops abuse. */
export const publicReadLimiter = rateLimit({
  windowMs: 60_000,
  limit: 600,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip,
  message: message('طلبات كثيرة، حاول لاحقاً'),
});
