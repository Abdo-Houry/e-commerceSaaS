import {
  ORDER_STATUSES,
  type LowStockProductDto,
  type OrderStatus,
  type StatsOverview,
  type TopProductDto,
} from '@matjari/shared';
import { AppDataSource } from '../config/data-source';
import { env } from '../config/env';
import { Store } from '../entities/Store';

/**
 * Revenue counts `delivered` orders only, using each order's own frozen totals
 * and line prices — editing a product never changes past figures.
 * "Today" and "this month" are computed in APP_TIMEZONE, by order date.
 */
export async function overview(storeId: string, lowStockThreshold: number): Promise<StatsOverview> {
  const tz = env.APP_TIMEZONE;
  const [sales] = await AppDataSource.query(
    `
    SELECT
      COALESCE(SUM(total) FILTER (
        WHERE status = 'delivered'
          AND ("createdAt" AT TIME ZONE $2)::date = (now() AT TIME ZONE $2)::date
      ), 0) AS "todaySales",
      COALESCE(SUM(total) FILTER (
        WHERE status = 'delivered'
          AND date_trunc('month', "createdAt" AT TIME ZONE $2) = date_trunc('month', now() AT TIME ZONE $2)
      ), 0) AS "monthSales",
      COUNT(*) FILTER (
        WHERE status <> 'cancelled'
          AND date_trunc('month', "createdAt" AT TIME ZONE $2) = date_trunc('month', now() AT TIME ZONE $2)
      ) AS "monthOrders",
      COUNT(*) FILTER (WHERE "whatsappOpened" = false AND status <> 'cancelled') AS "incompleteOrders"
    FROM orders WHERE "storeId" = $1
    `,
    [storeId, tz],
  );

  const statusRows: { status: OrderStatus; count: string }[] = await AppDataSource.query(
    `SELECT status, COUNT(*) AS count FROM orders WHERE "storeId" = $1 GROUP BY status`,
    [storeId],
  );
  const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
  for (const r of statusRows) byStatus[r.status] = Number(r.count);

  const [low] = await AppDataSource.query(
    `SELECT COUNT(*) AS count FROM products
     WHERE "storeId" = $1 AND "deletedAt" IS NULL AND "isActive" = true AND "trackStock" = true AND stock <= $2`,
    [storeId, lowStockThreshold],
  );

  const store = await AppDataSource.getRepository(Store).findOne({ where: { id: storeId }, select: { currency: true } });

  return {
    todaySales: Number(sales.todaySales),
    monthSales: Number(sales.monthSales),
    monthOrders: Number(sales.monthOrders),
    incompleteOrders: Number(sales.incompleteOrders),
    lowStockCount: Number(low.count),
    byStatus,
    currency: store?.currency ?? 'SYP',
  };
}

export async function topProducts(storeId: string, limit: number): Promise<TopProductDto[]> {
  const rows: { productId: string | null; productName: string; quantity: string; revenue: string }[] =
    await AppDataSource.query(
      `
      SELECT i."productId", MAX(i."productName") AS "productName",
             SUM(i.quantity) AS quantity, SUM(i.quantity * i."unitPrice") AS revenue
      FROM order_items i
      JOIN orders o ON o.id = i."orderId"
      WHERE o."storeId" = $1 AND o.status = 'delivered'
      GROUP BY i."productId", CASE WHEN i."productId" IS NULL THEN i."productName" END
      ORDER BY quantity DESC, revenue DESC
      LIMIT $2
      `,
      [storeId, limit],
    );
  return rows.map((r) => ({
    productId: r.productId,
    productName: r.productName,
    quantity: Number(r.quantity),
    revenue: Number(r.revenue),
  }));
}

export async function lowStock(storeId: string, threshold: number): Promise<LowStockProductDto[]> {
  const rows: { id: string; name: string; stock: number; images: string[] }[] = await AppDataSource.query(
    `SELECT id, name, stock, images FROM products
     WHERE "storeId" = $1 AND "deletedAt" IS NULL AND "isActive" = true AND "trackStock" = true AND stock <= $2
     ORDER BY stock ASC, name ASC LIMIT 50`,
    [storeId, threshold],
  );
  return rows.map((r) => ({ id: r.id, name: r.name, stock: r.stock, image: r.images?.[0] ?? null }));
}
