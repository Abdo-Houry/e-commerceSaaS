import { Brackets, type SelectQueryBuilder } from 'typeorm';
import {
  canTransition,
  ORDER_STATUS_LABELS,
  type OrderDto,
  type orderExportQuerySchema,
  type orderListQuerySchema,
  type OrderStatus,
  type OrderSummaryDto,
  type Paginated,
} from '@matjari/shared';
import type { z } from 'zod';
import { AppDataSource } from '../config/data-source';
import { env } from '../config/env';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { Store } from '../entities/Store';
import { toOrderDto, toOrderSummaryDto } from '../utils/dto';
import { HttpError } from '../utils/http-error';
import { revalidateStorefront } from '../utils/revalidate';
import { scopedRepo } from '../utils/scoped-repo';

type OrderListQuery = z.output<typeof orderListQuerySchema>;
type OrderExportQuery = z.output<typeof orderExportQuerySchema>;

function applyFilters(qb: SelectQueryBuilder<Order>, storeId: string, q: OrderExportQuery) {
  qb.where('o.storeId = :storeId', { storeId });
  if (q.status) qb.andWhere('o.status = :status', { status: q.status });
  if (q.incomplete !== undefined) qb.andWhere('o.whatsappOpened = :opened', { opened: !q.incomplete });
  // Day boundaries are evaluated in the merchant's timezone.
  if (q.from) qb.andWhere(`o.createdAt >= (CAST(CAST(:from AS date) AS timestamp) AT TIME ZONE :tz)`, { from: q.from, tz: env.APP_TIMEZONE });
  if (q.to) qb.andWhere(`o.createdAt < (CAST(CAST(:to AS date) + 1 AS timestamp) AT TIME ZONE :tz)`, { to: q.to, tz: env.APP_TIMEZONE });
  if (q.search) {
    const term = `%${q.search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const digits = q.search.replace(/^#/, '');
    qb.andWhere(
      new Brackets((w) => {
        w.where('o.customerName ILIKE :term', { term }).orWhere('o.customerPhone ILIKE :term', { term });
        if (/^\d{1,9}$/.test(digits)) w.orWhere('o.orderNumber = :num', { num: Number(digits) });
      }),
    );
  }
  return qb;
}

async function itemCounts(orderIds: string[]): Promise<Map<string, number>> {
  if (!orderIds.length) return new Map();
  const rows = await AppDataSource.getRepository(OrderItem)
    .createQueryBuilder('i')
    .select('i.orderId', 'orderId')
    .addSelect('SUM(i.quantity)', 'count')
    .where('i.orderId IN (:...orderIds)', { orderIds })
    .groupBy('i.orderId')
    .getRawMany<{ orderId: string; count: string }>();
  return new Map(rows.map((r) => [r.orderId, Number(r.count)]));
}

export async function listOrders(storeId: string, q: OrderListQuery): Promise<Paginated<OrderSummaryDto>> {
  const qb = applyFilters(AppDataSource.getRepository(Order).createQueryBuilder('o'), storeId, q)
    .orderBy('o.createdAt', 'DESC')
    .skip((q.page - 1) * q.limit)
    .take(q.limit);
  const [rows, total] = await qb.getManyAndCount();
  const counts = await itemCounts(rows.map((r) => r.id));
  return {
    items: rows.map((o) => toOrderSummaryDto(o, counts.get(o.id) ?? 0)),
    total,
    page: q.page,
    limit: q.limit,
    pages: Math.ceil(total / q.limit),
  };
}

export async function getOrder(storeId: string, id: string): Promise<OrderDto> {
  const order = await scopedRepo(Order, storeId).findOneOrFail(id);
  const items = await AppDataSource.getRepository(OrderItem).find({ where: { orderId: order.id }, order: { createdAt: 'ASC' } });
  return toOrderDto(order, items);
}

/**
 * Moves an order along the state machine. Entering `delivered` deducts stock
 * exactly once (guarded by `stockDeducted` under a row lock).
 */
export async function updateOrderStatus(storeId: string, id: string, status: OrderStatus): Promise<OrderDto> {
  const result = await AppDataSource.transaction(async (m) => {
    const order = await m.findOne(Order, { where: { id, storeId }, lock: { mode: 'pessimistic_write' } });
    if (!order) throw HttpError.notFound();

    if (!canTransition(order.status, status)) {
      throw HttpError.unprocessable(
        `لا يمكن تغيير الحالة من "${ORDER_STATUS_LABELS[order.status]}" إلى "${ORDER_STATUS_LABELS[status]}"`,
        'INVALID_TRANSITION',
        { from: order.status, to: status },
      );
    }

    const items = await m.find(OrderItem, { where: { orderId: order.id }, order: { createdAt: 'ASC' } });
    let stockChanged = false;

    if (status === 'delivered' && !order.stockDeducted) {
      const perProduct = new Map<string, number>();
      for (const item of items) {
        if (item.productId) perProduct.set(item.productId, (perProduct.get(item.productId) ?? 0) + item.quantity);
      }
      for (const [productId, quantity] of perProduct) {
        await m
          .createQueryBuilder()
          .update(Product)
          .set({ stock: () => `GREATEST("stock" - ${Number(quantity)}, 0)` })
          .where('id = :productId AND "storeId" = :storeId AND "trackStock" = true', { productId, storeId })
          .execute();
      }
      order.stockDeducted = true;
      stockChanged = perProduct.size > 0;
    }

    order.status = status;
    await m.save(order);
    return { dto: toOrderDto(order, items), stockChanged };
  });

  if (result.stockChanged) {
    const store = await AppDataSource.getRepository(Store).findOne({ where: { id: storeId }, select: { slug: true } });
    revalidateStorefront(store?.slug);
  }
  return result.dto;
}

function csvCell(value: string | number): string {
  let s = String(value);
  // Neutralise spreadsheet formula injection from customer-entered text.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportOrdersCsv(storeId: string, q: OrderExportQuery): Promise<string> {
  const store = await AppDataSource.getRepository(Store).findOne({ where: { id: storeId }, select: { currency: true } });
  const orders = await applyFilters(AppDataSource.getRepository(Order).createQueryBuilder('o'), storeId, q)
    .orderBy('o.createdAt', 'DESC')
    .take(10_000)
    .getMany();
  const items = orders.length
    ? await AppDataSource.getRepository(OrderItem)
        .createQueryBuilder('i')
        .where('i.orderId IN (:...ids)', { ids: orders.map((o) => o.id) })
        .orderBy('i.createdAt', 'ASC')
        .getMany()
    : [];
  const byOrder = new Map<string, OrderItem[]>();
  for (const i of items) byOrder.set(i.orderId, [...(byOrder.get(i.orderId) ?? []), i]);

  const header = [
    'رقم الطلب',
    'التاريخ',
    'الحالة',
    'واتساب',
    'اسم الزبون',
    'الهاتف',
    'المنطقة',
    'العنوان',
    'المنتجات',
    'المجموع',
    'التوصيل',
    'الإجمالي',
    'العملة',
    'ملاحظات',
  ];
  const rows = orders.map((o) => {
    const products = (byOrder.get(o.id) ?? [])
      .map((i) => {
        const opts = Object.values(i.selectedOptions ?? {});
        return `${i.productName}${opts.length ? ` (${opts.join('، ')})` : ''} × ${i.quantity}`;
      })
      .join(' | ');
    return [
      o.orderNumber,
      o.createdAt.toLocaleString('en-GB', { timeZone: env.APP_TIMEZONE }),
      ORDER_STATUS_LABELS[o.status],
      o.whatsappOpened ? 'تم الإرسال' : 'غير مكتمل',
      o.customerName,
      o.customerPhone,
      o.zoneName,
      o.customerAddress,
      products,
      o.subtotal,
      o.deliveryFee,
      o.total,
      store?.currency ?? '',
      o.notes ?? '',
    ].map(csvCell);
  });

  // UTF-8 BOM so Excel opens Arabic text correctly.
  return '﻿' + [header.map(csvCell), ...rows].map((r) => r.join(',')).join('\r\n');
}
