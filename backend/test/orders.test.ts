import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createPublicOrderSchema, type CreatePublicOrderInput } from '@matjari/shared';
import { AppDataSource } from '../src/config/data-source';
import { Order } from '../src/entities/Order';
import { OrderItem } from '../src/entities/OrderItem';
import * as orders from '../src/services/order.service';
import * as products from '../src/services/product.service';
import * as pub from '../src/services/public.service';
import * as stats from '../src/services/stats.service';
import { HttpError } from '../src/utils/http-error';
import { createFixture, setupDatabase, teardownDatabase } from './helpers';

/** Goes through the same zod parsing the HTTP route applies. */
function place(input: CreatePublicOrderInput) {
  return pub.createPublicOrder(createPublicOrderSchema.parse(input));
}

async function rejectsWith(promise: Promise<unknown>, status: number, code?: string) {
  await assert.rejects(promise, (err: unknown) => {
    assert.ok(err instanceof HttpError, `expected HttpError, got ${String(err)}`);
    assert.equal(err.status, status);
    if (code) assert.equal(err.code, code);
    return true;
  });
}

before(setupDatabase);
after(teardownDatabase);

describe('Rule 2 — the order row exists before WhatsApp opens', () => {
  it('persists the order with whatsappOpened=false and returns a wa.me link carrying its number', async () => {
    const f = await createFixture();
    const result = await place({
      slug: f.store.slug,
      items: [{ productId: f.shirt.id, quantity: 2, selectedOptions: { المقاس: 'L' } }],
      customerName: 'زبون',
      customerPhone: '0933 111 222',
      zoneId: f.zone.id,
      customerAddress: 'دمشق، المزة، بناء 5',
    });

    // The row is committed by the time the client receives the link.
    const row = await AppDataSource.getRepository(Order).findOneByOrFail({ id: result.id });
    assert.equal(row.orderNumber, result.orderNumber);
    assert.equal(row.whatsappOpened, false, 'not opened until the client reports it');
    assert.equal(row.customerPhone, '963933111222', 'customer phone is normalised');

    assert.ok(result.whatsappUrl.startsWith(`https://wa.me/${f.store.whatsappNumber}?text=`));
    assert.equal(f.store.whatsappNumber, '963944123456');
    const text = decodeURIComponent(result.whatsappUrl.split('?text=')[1]!);
    assert.equal(text, result.message, 'message is encoded exactly once');
    assert.match(text, new RegExp(`رقم الطلب: #${result.orderNumber}`));
    assert.match(text, /- قميص \(L\) × 2 — 200,000 ل\.س/);
    assert.match(text, /الإجمالي: 205,000 ل\.س/);

    // Unsent orders are what the dashboard lists as incomplete.
    const incomplete = await orders.listOrders(f.store.id, { page: 1, limit: 20, incomplete: true });
    assert.deepEqual(incomplete.items.map((o) => o.id), [result.id]);

    await pub.markWhatsappOpened(result.id);
    const opened = await AppDataSource.getRepository(Order).findOneByOrFail({ id: result.id });
    assert.equal(opened.whatsappOpened, true);
  });

  it('creates nothing when validation fails', async () => {
    const f = await createFixture();
    const before = await AppDataSource.getRepository(Order).countBy({ storeId: f.store.id });
    await rejectsWith(
      place({
        slug: f.store.slug,
        items: [{ productId: f.mug.id, quantity: 4, selectedOptions: {} }],
        customerName: 'زبون',
        customerPhone: '0933111222',
        zoneId: f.zone.id,
        customerAddress: 'عنوان تجريبي',
      }),
      422,
      'OUT_OF_STOCK',
    );
    assert.equal(await AppDataSource.getRepository(Order).countBy({ storeId: f.store.id }), before);
  });
});

describe('Rule 3 — order items freeze name and unit price', () => {
  it('keeps historical orders and revenue unchanged after a product is edited or deleted', async () => {
    const f = await createFixture();
    const created = await place({
      slug: f.store.slug,
      items: [
        { productId: f.shirt.id, quantity: 1, selectedOptions: { المقاس: 'M' } },
        { productId: f.mug.id, quantity: 2, selectedOptions: {} },
      ],
      customerName: 'زبون',
      customerPhone: '0933111222',
      zoneId: f.zone.id,
      customerAddress: 'دمشق، باب توما',
    });
    for (const s of ['preparing', 'shipped', 'delivered'] as const) {
      await orders.updateOrderStatus(f.store.id, created.id, s);
    }

    const beforeOrder = await orders.getOrder(f.store.id, created.id);
    const beforeOverview = await stats.overview(f.store.id, 5);
    const beforeTop = await stats.topProducts(f.store.id, 10);

    await products.updateProduct(f.store.id, f.shirt.id, { name: 'قميص فاخر', price: 999_000 });
    await products.deleteProduct(f.store.id, f.mug.id);

    const afterOrder = await orders.getOrder(f.store.id, created.id);
    assert.deepEqual(afterOrder.items, beforeOrder.items);
    assert.equal(afterOrder.items[0]!.productName, 'قميص');
    assert.equal(afterOrder.items[0]!.unitPrice, 100_000);
    assert.equal(afterOrder.subtotal, 150_000);
    assert.equal(afterOrder.total, 155_000);

    const afterOverview = await stats.overview(f.store.id, 5);
    for (const key of ['todaySales', 'monthSales', 'monthOrders', 'byStatus'] as const) {
      assert.deepEqual(afterOverview[key], beforeOverview[key], key);
    }
    assert.deepEqual(await stats.topProducts(f.store.id, 10), beforeTop);
    assert.equal(beforeOverview.monthSales, 155_000);
  });

  it('prices come from the database, never from the client', async () => {
    const f = await createFixture();
    const tampered = {
      slug: f.store.slug,
      items: [{ productId: f.mug.id, quantity: 1, selectedOptions: {}, price: 1, unitPrice: 1 }],
      customerName: 'زبون',
      customerPhone: '0933111222',
      zoneId: f.zone.id,
      customerAddress: 'عنوان تجريبي',
      subtotal: 1,
      total: 1,
      deliveryFee: 0,
    } as unknown as CreatePublicOrderInput;
    const result = await place(tampered);
    assert.equal(result.total, 30_000);
    const item = await AppDataSource.getRepository(OrderItem).findOneByOrFail({ orderId: result.id });
    assert.equal(item.unitPrice, 25_000);
  });
});

describe('Order numbers', () => {
  it('are sequential and unique per store under concurrent checkouts', async () => {
    const f = await createFixture();
    const input = {
      slug: f.store.slug,
      items: [{ productId: f.shirt.id, quantity: 1, selectedOptions: { المقاس: 'M' } }],
      customerName: 'زبون',
      customerPhone: '0933111222',
      zoneId: f.zone.id,
      customerAddress: 'عنوان تجريبي',
    };
    const results = await Promise.all(Array.from({ length: 8 }, () => place(input)));
    const numbers = results.map((r) => r.orderNumber).sort((a, b) => a - b);
    assert.deepEqual(numbers, [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008]);

    const other = await createFixture();
    const first = await place({ ...input, slug: other.store.slug, items: [{ productId: other.mug.id, quantity: 1, selectedOptions: {} }], zoneId: other.zone.id });
    assert.equal(first.orderNumber, 1001, 'each store has its own sequence');
  });
});

describe('Checkout validation', () => {
  it('rejects products from another store, missing options, missing zone and orders under the minimum', async () => {
    const f = await createFixture({ minOrderAmount: 50_000 });
    const other = await createFixture();
    const base = {
      slug: f.store.slug,
      customerName: 'زبون',
      customerPhone: '0933111222',
      zoneId: f.zone.id,
      customerAddress: 'عنوان تجريبي',
    };

    await rejectsWith(place({ ...base, items: [{ productId: other.mug.id, quantity: 1 }] }), 422, 'PRODUCT_UNAVAILABLE');
    await rejectsWith(place({ ...base, items: [{ productId: f.shirt.id, quantity: 1 }] }), 422, 'INVALID_OPTIONS');
    await rejectsWith(
      place({ ...base, zoneId: null, items: [{ productId: f.shirt.id, quantity: 1, selectedOptions: { المقاس: 'M' } }] }),
      422,
      'ZONE_REQUIRED',
    );
    await rejectsWith(place({ ...base, items: [{ productId: f.mug.id, quantity: 1 }] }), 422, 'MIN_ORDER_AMOUNT');

    await products.toggleProduct(f.store.id, f.mug.id);
    await rejectsWith(place({ ...base, items: [{ productId: f.mug.id, quantity: 2 }] }), 422, 'PRODUCT_UNAVAILABLE');
  });
});

describe('Order status machine and stock', () => {
  it('enforces transitions and deducts stock exactly once on delivery', async () => {
    const f = await createFixture();
    const created = await place({
      slug: f.store.slug,
      items: [{ productId: f.mug.id, quantity: 2, selectedOptions: {} }],
      customerName: 'زبون',
      customerPhone: '0933111222',
      zoneId: f.zone.id,
      customerAddress: 'عنوان تجريبي',
    });

    await rejectsWith(orders.updateOrderStatus(f.store.id, created.id, 'delivered'), 422, 'INVALID_TRANSITION');
    await orders.updateOrderStatus(f.store.id, created.id, 'preparing');
    await orders.updateOrderStatus(f.store.id, created.id, 'shipped');
    assert.equal((await products.getProduct(f.store.id, f.mug.id)).stock, 3, 'no deduction before delivery');

    const delivered = await orders.updateOrderStatus(f.store.id, created.id, 'delivered');
    assert.equal(delivered.stockDeducted, true);
    assert.equal((await products.getProduct(f.store.id, f.mug.id)).stock, 1);

    await rejectsWith(orders.updateOrderStatus(f.store.id, created.id, 'cancelled'), 422, 'INVALID_TRANSITION');
    await rejectsWith(orders.updateOrderStatus(f.store.id, created.id, 'delivered'), 422, 'INVALID_TRANSITION');
    assert.equal((await products.getProduct(f.store.id, f.mug.id)).stock, 1, 'terminal state never deducts again');
  });

  it("returns 404 for another store's order", async () => {
    const f = await createFixture();
    const intruder = await createFixture();
    const created = await place({
      slug: f.store.slug,
      items: [{ productId: f.mug.id, quantity: 1, selectedOptions: {} }],
      customerName: 'زبون',
      customerPhone: '0933111222',
      zoneId: f.zone.id,
      customerAddress: 'عنوان تجريبي',
    });
    await rejectsWith(orders.getOrder(intruder.store.id, created.id), 404);
    await rejectsWith(orders.updateOrderStatus(intruder.store.id, created.id, 'preparing'), 404);
    await rejectsWith(products.updateProduct(intruder.store.id, f.mug.id, { price: 1 }), 404);
  });
});
