import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildOrderMessage,
  canTransition,
  ensureContrastWithWhite,
  contrastRatio,
  formatMoney,
  normalizePhone,
  placeOrderThenOpenWhatsapp,
  type WhatsappOrderInput,
} from '../src';

describe('normalizePhone', () => {
  it('converts local, 00-prefixed and + formats to wa.me digits', () => {
    assert.equal(normalizePhone('0944 123 456'), '963944123456');
    assert.equal(normalizePhone('+963 944-123-456'), '963944123456');
    assert.equal(normalizePhone('00963944123456'), '963944123456');
    assert.equal(normalizePhone('963944123456'), '963944123456');
    assert.equal(normalizePhone('0501234567', '966'), '966501234567');
  });
});

describe('formatMoney', () => {
  it('formats integer minor units for display', () => {
    assert.equal(formatMoney(185_000, 'SYP'), '185,000 ل.س');
    assert.equal(formatMoney(1_250, 'USD'), '12.50 $');
    assert.equal(formatMoney(1_200, 'USD'), '12 $');
  });
});

describe('order status machine', () => {
  it('only allows forward moves or cancellation; delivered and cancelled are terminal', () => {
    assert.ok(canTransition('new', 'preparing'));
    assert.ok(canTransition('shipped', 'cancelled'));
    assert.ok(!canTransition('new', 'delivered'));
    assert.ok(!canTransition('delivered', 'cancelled'));
    assert.ok(!canTransition('cancelled', 'new'));
  });
});

const input: WhatsappOrderInput = {
  storeName: 'متجر الياسمين',
  orderNumber: 1042,
  currency: 'SYP',
  items: [{ productName: 'قميص', quantity: 2, unitPrice: 100_000, selectedOptions: { المقاس: 'L', اللون: 'أسود' } }],
  subtotal: 200_000,
  deliveryFee: 15_000,
  total: 215_000,
  customerName: 'أحمد',
  customerPhone: '963933111222',
  zoneName: 'المزة',
  customerAddress: 'شارع الجلاء & بناء #5',
  notes: null,
};

describe('buildOrderMessage', () => {
  it('matches the template exactly', () => {
    const { message } = buildOrderMessage(input, '963944123456');
    assert.equal(
      message,
      [
        'مرحباً، طلب جديد من متجر الياسمين',
        'رقم الطلب: #1042',
        '',
        '- قميص (L، أسود) × 2 — 200,000 ل.س',
        '',
        'المجموع: 200,000 ل.س',
        'التوصيل: 15,000 ل.س',
        'الإجمالي: 215,000 ل.س',
        '',
        'الاسم: أحمد',
        'الهاتف: 963933111222',
        'المنطقة: المزة',
        'العنوان: شارع الجلاء & بناء #5',
        'ملاحظات: —',
      ].join('\n'),
    );
  });

  it('encodes the whole message once, so & and # survive and newlines become %0A', () => {
    const { message, url } = buildOrderMessage(input, '963944123456');
    assert.ok(url.startsWith('https://wa.me/963944123456?text='));
    const encoded = url.split('?text=')[1]!;
    assert.ok(!encoded.includes('&') && !encoded.includes('#') && !encoded.includes('\n'));
    assert.ok(encoded.includes('%0A'));
    assert.ok(!encoded.includes('%250A'), 'no double encoding');
    assert.equal(decodeURIComponent(encoded), message);
  });

  it('truncates the item list when the URL would exceed the limit', () => {
    const many = {
      ...input,
      items: Array.from({ length: 40 }, (_, i) => ({
        productName: `منتج رقم ${i + 1} باسم طويل نسبياً`,
        quantity: 1,
        unitPrice: 10_000,
        selectedOptions: {},
      })),
    };
    const { message, url, truncatedItems } = buildOrderMessage(many, '963944123456');
    assert.ok(url.length <= 1800, `url length ${url.length}`);
    assert.ok(truncatedItems > 0);
    assert.match(message, new RegExp(`… و${truncatedItems} منتجات أخرى — التفاصيل الكاملة برقم الطلب`));
    assert.match(message, /رقم الطلب: #1042/);
    assert.match(message, /الإجمالي: 215,000 ل\.س/);
  });
});

describe('placeOrderThenOpenWhatsapp (client checkout sequence)', () => {
  it('creates the order first, then records and opens WhatsApp', async () => {
    const calls: string[] = [];
    await placeOrderThenOpenWhatsapp('cart', {
      createOrder: async () => {
        calls.push('create');
        return { id: 'o1', orderNumber: 1001, whatsappUrl: 'https://wa.me/1?text=x' };
      },
      onCreated: (o) => calls.push(`navigate:${o.orderNumber}`),
      markWhatsappOpened: (id) => calls.push(`mark:${id}`),
      openWhatsapp: (url) => calls.push(`open:${url}`),
    });
    assert.deepEqual(calls, ['create', 'navigate:1001', 'mark:o1', 'open:https://wa.me/1?text=x']);
  });

  it('never opens WhatsApp when order creation fails', async () => {
    const calls: string[] = [];
    await assert.rejects(
      placeOrderThenOpenWhatsapp('cart', {
        createOrder: async () => {
          calls.push('create');
          throw new Error('network');
        },
        onCreated: () => calls.push('navigate'),
        markWhatsappOpened: () => calls.push('mark'),
        openWhatsapp: () => calls.push('open'),
      }),
    );
    assert.deepEqual(calls, ['create']);
  });
});

describe('ensureContrastWithWhite', () => {
  it('darkens light brand colours until white text is readable', () => {
    for (const c of ['#059669', '#F59E0B', '#FFFFFF', '#34D399']) {
      assert.ok(contrastRatio(ensureContrastWithWhite(c), '#FFFFFF') >= 4.5, c);
    }
    assert.equal(ensureContrastWithWhite('#064E3B'), '#064E3B');
  });
});
