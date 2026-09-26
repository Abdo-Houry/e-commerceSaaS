import type { RequestHandler } from 'express';
import { canOperate } from '@matjari/shared';
import { AppDataSource } from '../config/data-source';
import { Store } from '../entities/Store';
import { Subscription } from '../entities/Subscription';
import { User } from '../entities/User';
import { accessFor, getSettings } from '../services/platform.service';
import { HttpError } from '../utils/http-error';
import { verifyAccessToken } from '../utils/tokens';

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const userId = token ? verifyAccessToken(token) : null;
  if (!userId) return next(HttpError.unauthorized());
  req.userId = userId;
  next();
};

/**
 * Ownership middleware: loads the authenticated user's store once and attaches
 * `req.storeId` and the subscription access state. Services then scope every
 * query by the store id, so a record belonging to another store resolves to 404.
 */
export const requireStore: RequestHandler = async (req, _res, next) => {
  try {
    if (!req.userId) return next(HttpError.unauthorized());
    const store = await AppDataSource.getRepository(Store).findOne({
      where: { ownerId: req.userId },
      select: { id: true, suspendedAt: true, suspensionReason: true },
    });
    if (!store) return next(new HttpError(403, 'STORE_REQUIRED', 'أكمل إنشاء متجرك أولاً'));
    const [settings, sub] = await Promise.all([
      getSettings(),
      AppDataSource.getRepository(Subscription).findOne({ where: { storeId: store.id } }),
    ]);
    req.storeId = store.id;
    req.access = accessFor(store, sub, settings.graceDays);
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Blocks merchant features once the trial/subscription and its grace period are over,
 * or when an admin has suspended the store. Must run after `requireStore`.
 */
export const requireOperational: RequestHandler = (req, _res, next) => {
  const access = req.access;
  if (access && canOperate(access.state)) return next();
  const suspended = access?.state === 'suspended';
  next(
    new HttpError(
      402,
      suspended ? 'STORE_SUSPENDED' : 'SUBSCRIPTION_EXPIRED',
      suspended ? 'تم إيقاف متجرك من إدارة المنصة' : 'انتهى اشتراكك. جدّد الاشتراك لمتابعة استخدام متجرك',
      access,
    ),
  );
};

/** Platform admins only. The role is re-read from the database, so revoking takes effect immediately. */
export const requireAdmin: RequestHandler = async (req, _res, next) => {
  try {
    if (!req.userId) return next(HttpError.unauthorized());
    const user = await AppDataSource.getRepository(User).findOne({ where: { id: req.userId }, select: { id: true, role: true } });
    // Non-admins get the same 404 as a missing route: the admin API's existence isn't advertised.
    if (user?.role !== 'admin') return next(HttpError.notFound('المسار غير موجود'));
    next();
  } catch (err) {
    next(err);
  }
};

export function getStoreId(req: { storeId?: string }): string {
  if (!req.storeId) throw HttpError.unauthorized();
  return req.storeId;
}

export function getUserId(req: { userId?: string }): string {
  if (!req.userId) throw HttpError.unauthorized();
  return req.userId;
}
