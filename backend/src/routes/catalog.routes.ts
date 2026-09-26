import { Router } from 'express';
import {
  categoryInputSchema,
  categoryUpdateSchema,
  deliveryZoneInputSchema,
  deliveryZoneUpdateSchema,
  idParamSchema,
  productInputSchema,
  productListQuerySchema,
  productUpdateSchema,
  reorderSchema,
} from '@matjari/shared';
import { getStoreId, requireAuth, requireOperational, requireStore } from '../middleware/auth';
import { handle } from '../middleware/handle';
import * as categories from '../services/category.service';
import * as zones from '../services/delivery-zone.service';
import * as products from '../services/product.service';

const ok = { ok: true } as const;

/* ─── Categories ─────────────────────────────────────────────────────── */

export const categoryRouter = Router();
categoryRouter.use(requireAuth, requireStore, requireOperational);

categoryRouter.get('/', handle({}, ({ req }) => categories.listCategories(getStoreId(req))));
categoryRouter.post(
  '/',
  handle({ body: categoryInputSchema }, ({ req, body }) => categories.createCategory(getStoreId(req), body), 201),
);
// Declared before "/:id" so "reorder" is never parsed as an id.
categoryRouter.patch(
  '/reorder',
  handle({ body: reorderSchema }, async ({ req, body }) => {
    await categories.reorderCategories(getStoreId(req), body.ids);
    return ok;
  }),
);
categoryRouter.patch(
  '/:id',
  handle({ params: idParamSchema, body: categoryUpdateSchema }, ({ req, params, body }) =>
    categories.updateCategory(getStoreId(req), params.id, body),
  ),
);
categoryRouter.delete(
  '/:id',
  handle({ params: idParamSchema }, async ({ req, params }) => {
    await categories.deleteCategory(getStoreId(req), params.id);
    return ok;
  }),
);

/* ─── Products ───────────────────────────────────────────────────────── */

export const productRouter = Router();
productRouter.use(requireAuth, requireStore, requireOperational);

productRouter.get(
  '/',
  handle({ query: productListQuerySchema }, ({ req, query }) => products.listProducts(getStoreId(req), query)),
);
productRouter.post(
  '/',
  handle({ body: productInputSchema }, ({ req, body }) => products.createProduct(getStoreId(req), body), 201),
);
productRouter.patch(
  '/reorder',
  handle({ body: reorderSchema }, async ({ req, body }) => {
    await products.reorderProducts(getStoreId(req), body.ids);
    return ok;
  }),
);
productRouter.get(
  '/:id',
  handle({ params: idParamSchema }, ({ req, params }) => products.getProduct(getStoreId(req), params.id)),
);
productRouter.patch(
  '/:id/toggle',
  handle({ params: idParamSchema }, ({ req, params }) => products.toggleProduct(getStoreId(req), params.id)),
);
productRouter.patch(
  '/:id',
  handle({ params: idParamSchema, body: productUpdateSchema }, ({ req, params, body }) =>
    products.updateProduct(getStoreId(req), params.id, body),
  ),
);
productRouter.delete(
  '/:id',
  handle({ params: idParamSchema }, async ({ req, params }) => {
    await products.deleteProduct(getStoreId(req), params.id);
    return ok;
  }),
);

/* ─── Delivery zones ─────────────────────────────────────────────────── */

export const deliveryZoneRouter = Router();
deliveryZoneRouter.use(requireAuth, requireStore, requireOperational);

deliveryZoneRouter.get('/', handle({}, ({ req }) => zones.listZones(getStoreId(req))));
deliveryZoneRouter.post(
  '/',
  handle({ body: deliveryZoneInputSchema }, ({ req, body }) => zones.createZone(getStoreId(req), body), 201),
);
deliveryZoneRouter.patch(
  '/:id',
  handle({ params: idParamSchema, body: deliveryZoneUpdateSchema }, ({ req, params, body }) =>
    zones.updateZone(getStoreId(req), params.id, body),
  ),
);
deliveryZoneRouter.delete(
  '/:id',
  handle({ params: idParamSchema }, async ({ req, params }) => {
    await zones.deleteZone(getStoreId(req), params.id);
    return ok;
  }),
);
