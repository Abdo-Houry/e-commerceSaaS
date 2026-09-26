import { Router } from 'express';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '@matjari/shared';
import { handle } from '../middleware/handle';
import { getUserId, requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rate-limit';
import * as auth from '../services/auth.service';
import { HttpError } from '../utils/http-error';
import { REFRESH_COOKIE, refreshCookieOptions, verifyRefreshToken } from '../utils/tokens';

export const authRouter = Router();

const { maxAge: _maxAge, ...clearCookieOptions } = refreshCookieOptions;

authRouter.post(
  '/register',
  authLimiter,
  handle({ body: registerSchema }, async ({ body, res }) => {
    const { refreshToken, ...result } = await auth.register(body);
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
    return result;
  }, 201),
);

authRouter.post(
  '/login',
  authLimiter,
  handle({ body: loginSchema }, async ({ body, res }) => {
    const { refreshToken, ...result } = await auth.login(body);
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
    return result;
  }),
);

authRouter.post(
  '/refresh',
  handle({}, async ({ req, res }) => {
    const token: unknown = req.cookies?.[REFRESH_COOKIE];
    const userId = typeof token === 'string' ? verifyRefreshToken(token) : null;
    if (!userId) {
      res.clearCookie(REFRESH_COOKIE, clearCookieOptions);
      throw HttpError.unauthorized('انتهت الجلسة، سجّل الدخول مجدداً');
    }
    const { refreshToken, ...result } = await auth.refresh(userId);
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
    return result;
  }),
);

authRouter.post(
  '/logout',
  handle({}, ({ res }) => {
    res.clearCookie(REFRESH_COOKIE, clearCookieOptions);
    return { ok: true };
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  handle({}, ({ req }) => auth.me(getUserId(req))),
);

authRouter.post(
  '/forgot-password',
  authLimiter,
  handle({ body: forgotPasswordSchema }, async ({ body }) => {
    await auth.forgotPassword(body.email);
    return { ok: true };
  }),
);

authRouter.post(
  '/reset-password',
  authLimiter,
  handle({ body: resetPasswordSchema }, async ({ body }) => {
    await auth.resetPassword(body);
    return { ok: true };
  }),
);
