import { Router } from 'express';
import { z } from 'zod';
import { createPublicOrderSchema, idParamSchema, publicProductsQuerySchema } from '@matjari/shared';
import { handle } from '../middleware/handle';
import { orderCreateLimiter, publicReadLimiter } from '../middleware/rate-limit';
import * as pub from '../services/public.service';

export const publicRouter = Router();

// Slugs in URLs are matched loosely; an invalid one simply isn't found.
const slugParam = z.object({ slug: z.string().min(1).max(60).toLowerCase() });

publicRouter.get(
  '/stores/:slug',
  publicReadLimiter,
  handle({ params: slugParam }, ({ params }) => pub.getPublicStore(params.slug)),
);

publicRouter.get(
  '/stores/:slug/products',
  publicReadLimiter,
  handle({ params: slugParam, query: publicProductsQuerySchema }, ({ params, query }) =>
    pub.getPublicProducts(params.slug, query.categoryId),
  ),
);

publicRouter.get(
  '/stores/:slug/products/:id',
  publicReadLimiter,
  handle({ params: slugParam.extend({ id: z.uuid() }) }, ({ params }) => pub.getPublicProduct(params.slug, params.id)),
);

publicRouter.post(
  '/orders',
  orderCreateLimiter,
  handle({ body: createPublicOrderSchema }, ({ body }) => pub.createPublicOrder(body), 201),
);

publicRouter.patch(
  '/orders/:id/whatsapp-opened',
  publicReadLimiter,
  handle({ params: idParamSchema }, ({ params }) => pub.markWhatsappOpened(params.id)),
);
