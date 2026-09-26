import { Router } from 'express';
import multer from 'multer';
import { AppDataSource } from '../config/data-source';
import { env } from '../config/env';
import { Store } from '../entities/Store';
import { getUserId, requireAuth } from '../middleware/auth';
import { handle } from '../middleware/handle';
import { canOperate } from '@matjari/shared';
import { getStoreAccess } from '../services/platform.service';
import { saveImage } from '../services/upload.service';
import { HttpError } from '../utils/http-error';

export const uploadRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.UPLOAD_MAX_BYTES, files: 1 },
});

uploadRouter.post(
  '/',
  requireAuth,
  upload.single('file'),
  handle(
    {},
    async ({ req }) => {
      if (!req.file) throw HttpError.badRequest('اختر صورة لرفعها');
      const userId = getUserId(req);
      const store = await AppDataSource.getRepository(Store).findOne({
        where: { ownerId: userId },
        select: { id: true },
      });
      if (store && !canOperate((await getStoreAccess(store.id)).state)) {
        throw new HttpError(402, 'SUBSCRIPTION_EXPIRED', 'انتهى اشتراكك. جدّد الاشتراك لمتابعة استخدام متجرك');
      }
      // Before onboarding finishes there is no store yet (logo step), so use a per-user folder.
      const ownerDir = store ? store.id : `users/${userId}`;
      return saveImage(ownerDir, req.file.buffer);
    },
    201,
  ),
);
