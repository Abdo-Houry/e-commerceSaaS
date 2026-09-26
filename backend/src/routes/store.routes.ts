import { Router } from 'express';
import { createStoreSchema, slugAvailableQuerySchema, updateStoreSchema } from '@matjari/shared';
import { AppDataSource } from '../config/data-source';
import { Store } from '../entities/Store';
import { getStoreId, getUserId, requireAuth, requireOperational, requireStore } from '../middleware/auth';
import { handle } from '../middleware/handle';
import * as stores from '../services/store.service';

export const storeRouter = Router();

storeRouter.use(requireAuth);

storeRouter.post(
  '/',
  handle({ body: createStoreSchema }, ({ req, body }) => stores.createStore(getUserId(req), body), 201),
);

storeRouter.get(
  '/slug-available',
  handle({ query: slugAvailableQuerySchema }, async ({ req, query }) => {
    // A merchant's current slug counts as available to them.
    const own = await AppDataSource.getRepository(Store).findOne({
      where: { ownerId: getUserId(req) },
      select: { id: true },
    });
    return stores.checkSlug(query.slug, own?.id);
  }),
);

storeRouter.get('/me', requireStore, handle({}, ({ req }) => stores.getStore(getStoreId(req))));

storeRouter.patch(
  '/me',
  requireStore,
  requireOperational,
  handle({ body: updateStoreSchema }, ({ req, body }) => stores.updateStore(getStoreId(req), body)),
);

storeRouter.get('/me/qr', requireStore, requireOperational, handle({}, ({ req }) => stores.getStoreQr(getStoreId(req))));
