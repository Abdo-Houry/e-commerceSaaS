import { Router } from 'express';
import {
  idParamSchema,
  LOW_STOCK_THRESHOLD,
  lowStockQuerySchema,
  orderExportQuerySchema,
  orderListQuerySchema,
  orderStatusUpdateSchema,
  topProductsQuerySchema,
} from '@matjari/shared';
import { getStoreId, requireAuth, requireOperational, requireStore } from '../middleware/auth';
import { handle } from '../middleware/handle';
import * as orders from '../services/order.service';
import * as stats from '../services/stats.service';

export const orderRouter = Router();
orderRouter.use(requireAuth, requireStore, requireOperational);

orderRouter.get(
  '/',
  handle({ query: orderListQuerySchema }, ({ req, query }) => orders.listOrders(getStoreId(req), query)),
);

orderRouter.get(
  '/export.csv',
  handle({ query: orderExportQuerySchema }, async ({ req, res, query }) => {
    const csv = await orders.exportOrdersCsv(getStoreId(req), query);
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="orders-${date}.csv"`);
    res.send(csv);
    return undefined;
  }),
);

orderRouter.get(
  '/:id',
  handle({ params: idParamSchema }, ({ req, params }) => orders.getOrder(getStoreId(req), params.id)),
);

orderRouter.patch(
  '/:id/status',
  handle({ params: idParamSchema, body: orderStatusUpdateSchema }, ({ req, params, body }) =>
    orders.updateOrderStatus(getStoreId(req), params.id, body.status),
  ),
);

export const statsRouter = Router();
statsRouter.use(requireAuth, requireStore, requireOperational);

statsRouter.get(
  '/overview',
  handle({}, ({ req }) => stats.overview(getStoreId(req), LOW_STOCK_THRESHOLD)),
);
statsRouter.get(
  '/top-products',
  handle({ query: topProductsQuerySchema }, ({ req, query }) => stats.topProducts(getStoreId(req), query.limit)),
);
statsRouter.get(
  '/low-stock',
  handle({ query: lowStockQuerySchema }, ({ req, query }) => stats.lowStock(getStoreId(req), query.threshold)),
);
