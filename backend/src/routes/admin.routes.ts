import { Router } from 'express';
import multer from 'multer';
import {
  activateSubscriptionSchema,
  adminStoreListQuerySchema,
  extendTrialSchema,
  idParamSchema,
  paginationSchema,
  platformSettingsSchema,
  rejectRequestSchema,
  requestListQuerySchema,
  subscriptionRequestSchema,
  suspendStoreSchema,
} from '@matjari/shared';
import { env } from '../config/env';
import { getStoreId, getUserId, requireAuth, requireAdmin, requireStore } from '../middleware/auth';
import { handle } from '../middleware/handle';
import * as admin from '../services/admin.service';
import * as platform from '../services/platform.service';
import * as subscriptions from '../services/subscription.service';
import { saveImage } from '../services/upload.service';
import { HttpError } from '../utils/http-error';

/* ─── Platform admin ─────────────────────────────────────────────────── */

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/overview', handle({}, () => admin.overview()));

adminRouter.get('/stores', handle({ query: adminStoreListQuerySchema }, ({ query }) => admin.listStores(query)));

adminRouter.get('/stores/:id', handle({ params: idParamSchema }, ({ params }) => admin.getStoreDetail(params.id)));

adminRouter.post(
  '/stores/:id/activate',
  handle({ params: idParamSchema, body: activateSubscriptionSchema }, ({ req, params, body }) =>
    admin.activateSubscription(params.id, getUserId(req), body),
  ),
);

adminRouter.post(
  '/stores/:id/extend-trial',
  handle({ params: idParamSchema, body: extendTrialSchema }, ({ params, body }) => admin.extendTrial(params.id, body.days)),
);

adminRouter.post(
  '/stores/:id/suspend',
  handle({ params: idParamSchema, body: suspendStoreSchema }, ({ params, body }) => admin.suspendStore(params.id, body.reason)),
);

adminRouter.post('/stores/:id/unsuspend', handle({ params: idParamSchema }, ({ params }) => admin.unsuspendStore(params.id)));

adminRouter.get('/requests', handle({ query: requestListQuerySchema }, ({ query }) => admin.listRequests(query)));

adminRouter.post(
  '/requests/:id/approve',
  handle({ params: idParamSchema }, ({ req, params }) => admin.approveRequest(params.id, getUserId(req))),
);

adminRouter.post(
  '/requests/:id/reject',
  handle({ params: idParamSchema, body: rejectRequestSchema }, ({ req, params, body }) =>
    admin.rejectRequest(params.id, getUserId(req), body.reason),
  ),
);

adminRouter.get(
  '/payments',
  handle({ query: paginationSchema }, ({ query }) => admin.listPayments(query.page, query.limit)),
);

adminRouter.get('/settings', handle({}, async () => platform.toSettingsDto(await platform.getSettings())));

adminRouter.put('/settings', handle({ body: platformSettingsSchema }, ({ body }) => platform.updateSettings(body)));

/* ─── Merchant: own subscription (reachable even when expired) ───────── */

export const subscriptionRouter = Router();
subscriptionRouter.use(requireAuth, requireStore);

subscriptionRouter.get('/', handle({}, ({ req }) => subscriptions.getMySubscription(getStoreId(req))));

subscriptionRouter.post(
  '/requests',
  handle({ body: subscriptionRequestSchema }, ({ req, body }) => subscriptions.createRequest(getStoreId(req), body), 201),
);

subscriptionRouter.delete(
  '/requests/:id',
  handle({ params: idParamSchema }, async ({ req, params }) => {
    await subscriptions.cancelRequest(getStoreId(req), params.id);
    return { ok: true };
  }),
);

// Payment receipts must be uploadable even when the subscription has expired,
// so this bypasses the general /uploads route (which requires an operating store).
const receiptUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.UPLOAD_MAX_BYTES, files: 1 } });
subscriptionRouter.post(
  '/receipt',
  receiptUpload.single('file'),
  handle(
    {},
    ({ req }) => {
      if (!req.file) throw HttpError.badRequest('اختر صورة الإشعار');
      return saveImage(getStoreId(req), req.file.buffer);
    },
    201,
  ),
);

/* ─── Public: pricing for the landing page ───────────────────────────── */

export const platformPublicRouter = Router();
platformPublicRouter.get('/', handle({}, () => platform.getPublicPlatformInfo()));
