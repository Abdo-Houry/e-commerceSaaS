// Sample data for local exploration: one merchant with a full catalogue, delivery
// zones, orders across every status and a pending subscription request.
// Login: sample@matjari.app / sample12345      Usage: npm run seed:sample
import 'reflect-metadata';
import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {
  categoryInputSchema,
  createStoreSchema,
  deliveryZoneInputSchema,
  productInputSchema,
  subscriptionRequestSchema,
  type ProductDto,
} from '@matjari/shared';
import { AppDataSource } from '../config/data-source';
import { uploadRoot } from '../config/env';
import { Order } from '../entities/Order';
import { User } from '../entities/User';
import * as auth from '../services/auth.service';
import * as categories from '../services/category.service';
import * as orders from '../services/order.service';
import * as platform from '../services/platform.service';
import * as products from '../services/product.service';
import * as pub from '../services/public.service';
import * as stores from '../services/store.service';
import * as subscriptions from '../services/subscription.service';
import * as zones from '../services/delivery-zone.service';

export const SAMPLE_EMAIL = 'sample@matjari.app';
export const SAMPLE_PASSWORD = 'sample12345';
export const SAMPLE_SLUG = 'yasmine';
const ASSETS = path.resolve(__dirname, '../../assets/demo');

const CATALOG = [
  { name: 'تيشيرت قطني أبيض', cat: 0, photo: 'shirt.jpg', price: 85_000, compare: 110_000, stock: 25, options: [{ name: 'المقاس', values: ['S', 'M', 'L', 'XL'] }] },
  { name: 'حذاء رياضي ملوّن', cat: 0, photo: 'shoes.jpg', price: 340_000, compare: null, stock: 12, options: [{ name: 'المقاس', values: ['40', '41', '42', '43'] }] },
  { name: 'حقيبة يد جلدية', cat: 1, photo: 'bag.jpg', price: 275_000, compare: 320_000, stock: 3, options: [{ name: 'اللون', values: ['أحمر', 'أسود'] }] },
  { name: 'ساعة ذكية بيضاء', cat: 1, photo: 'watch.jpg', price: 420_000, compare: null, stock: 8, options: [] },
  { name: 'نظارة شمسية كلاسيكية', cat: 1, photo: 'glasses.jpg', price: 95_000, compare: 120_000, stock: 30, options: [] },
  { name: 'عطر شرقي فاخر', cat: 1, photo: 'perfume.jpg', price: 260_000, compare: null, stock: 15, options: [{ name: 'الحجم', values: ['50 مل', '100 مل'] }] },
  { name: 'شمعة معطّرة', cat: 2, photo: 'candle.jpg', price: 45_000, compare: null, stock: 4, options: [{ name: 'الرائحة', values: ['فانيلا', 'لافندر'] }] },
  { name: 'كوب قهوة خزفي', cat: 2, photo: 'mug.jpg', price: 30_000, compare: 40_000, stock: 18, options: [] },
] as const;

const CUSTOMERS = [
  { customerName: 'أحمد الخطيب', customerPhone: '0933111222', customerAddress: 'المزة، شارع الجلاء، بناء 12، طابق 3' },
  { customerName: 'سارة العلي', customerPhone: '0944333444', customerAddress: 'باب توما، قرب الكنيسة المريمية' },
  { customerName: 'محمد الحلبي', customerPhone: '0955555666', customerAddress: 'المالكي، جادة 3، فيلا 8' },
  { customerName: 'ليلى حداد', customerPhone: '0988777888', customerAddress: 'ركن الدين، مقابل الصيدلية' },
  { customerName: 'عمر الشامي', customerPhone: '0999000111', customerAddress: 'كفرسوسة، البناء الأزرق، طابق 2' },
  { customerName: 'رنا مرعي', customerPhone: '0912345678', customerAddress: 'جرمانا، شارع الأمين' },
];

export async function seedSample(): Promise<void> {
  await AppDataSource.getRepository(User).delete({ email: SAMPLE_EMAIL });

  const { user } = await auth.register({ name: 'سارة العلي', email: SAMPLE_EMAIL, password: SAMPLE_PASSWORD });
  const store = await stores.createStore(
    user.id,
    createStoreSchema.parse({
      name: 'متجر الياسمين',
      slug: SAMPLE_SLUG,
      whatsappNumber: '0944123456',
      city: 'دمشق',
      currency: 'SYP',
      primaryColor: '#0F766E',
      secondaryColor: '#F59E0B',
      template: 'classic',
    }),
  );
  await stores.updateStore(store.id, {
    description: 'ملابس وإكسسوارات ولمسات للمنزل — توصيل لكل المحافظات والدفع عند الاستلام.',
    bannerTitle: 'تشكيلة الموسم الجديد وصلت ✨',
    bannerSubtitle: 'اختر ما يعجبك واطلب بضغطة زر عبر واتساب',
    businessHours: { summary: 'يومياً من 10 صباحاً حتى 10 مساءً' },
    socialLinks: { instagram: 'instagram.com', facebook: 'facebook.com', tiktok: '' },
  });

  const dir = path.join(uploadRoot, store.id);
  await fs.mkdir(dir, { recursive: true });
  await sharp(path.join(ASSETS, 'logo.jpg')).resize(400, 400, { fit: 'cover' }).webp({ quality: 80 }).toFile(path.join(dir, 'logo.webp'));
  await stores.updateStore(store.id, { logoUrl: `/uploads/${store.id}/logo.webp` });

  const cats = [];
  for (const name of ['ملابس', 'إكسسوارات', 'منزل']) {
    cats.push(await categories.createCategory(store.id, categoryInputSchema.parse({ name })));
  }

  const created: ProductDto[] = [];
  for (const [i, p] of [...CATALOG.entries()].reverse()) {
    const file = `product-${i + 1}.webp`;
    await sharp(path.join(ASSETS, p.photo)).resize(900, 900, { fit: 'cover' }).webp({ quality: 80 }).toFile(path.join(dir, file));
    created.unshift(
      await products.createProduct(
        store.id,
        productInputSchema.parse({
          name: p.name,
          description: 'منتج أصلي بجودة عالية. التوصيل خلال 24 ساعة داخل دمشق، والدفع عند الاستلام.',
          price: p.price,
          comparePrice: p.compare,
          categoryId: cats[p.cat]!.id,
          images: [`/uploads/${store.id}/${file}`],
          stock: p.stock,
          options: p.options.map((o) => ({ name: o.name, values: [...o.values] })),
        }),
      ),
    );
  }

  const [damascus] = await Promise.all([
    zones.createZone(store.id, deliveryZoneInputSchema.parse({ name: 'دمشق', fee: 15_000, estimatedTime: 'خلال 24 ساعة' })),
    zones.createZone(store.id, deliveryZoneInputSchema.parse({ name: 'ريف دمشق', fee: 25_000, estimatedTime: 'يومان' })),
    zones.createZone(store.id, deliveryZoneInputSchema.parse({ name: 'باقي المحافظات', fee: 40_000, estimatedTime: '2–4 أيام' })),
  ]);

  // Orders spread over the last days, covering every status plus one abandoned checkout.
  const plans: { items: [number, number, Record<string, string>][]; path: ('preparing' | 'shipped' | 'delivered' | 'cancelled')[]; opened: boolean; daysAgo: number }[] = [
    { items: [[0, 2, { المقاس: 'M' }], [7, 1, {}]], path: ['preparing', 'shipped', 'delivered'], opened: true, daysAgo: 6 },
    { items: [[3, 1, {}]], path: ['preparing', 'shipped', 'delivered'], opened: true, daysAgo: 4 },
    { items: [[2, 1, { اللون: 'أحمر' }]], path: ['preparing', 'shipped'], opened: true, daysAgo: 2 },
    { items: [[5, 1, { الحجم: '100 مل' }], [4, 1, {}]], path: ['preparing'], opened: true, daysAgo: 1 },
    { items: [[6, 2, { الرائحة: 'لافندر' }]], path: ['cancelled'], opened: true, daysAgo: 1 },
    { items: [[1, 1, { المقاس: '42' }]], path: [], opened: false, daysAgo: 0 },
  ];

  for (const [i, plan] of plans.entries()) {
    const customer = CUSTOMERS[i]!;
    const order = await pub.createPublicOrder({
      slug: SAMPLE_SLUG,
      ...customer,
      customerPhone: customer.customerPhone.replace(/^0/, '963'),
      zoneId: damascus.id,
      notes: i === 0 ? 'الرجاء الاتصال قبل التوصيل' : null,
      items: plan.items.map(([idx, quantity, selectedOptions]) => ({ productId: created[idx]!.id, quantity, selectedOptions })),
    });
    if (plan.opened) await pub.markWhatsappOpened(order.id);
    for (const status of plan.path) await orders.updateOrderStatus(store.id, order.id, status);
    await AppDataSource.getRepository(Order).update(order.id, {
      createdAt: new Date(Date.now() - plan.daysAgo * 24 * 60 * 60 * 1000 - i * 3600_000),
    });
  }

  // A subscription request waiting in the admin panel, if a plan and method are enabled.
  const settings = await platform.getSettings();
  const plan = platform.enabledPlans(settings)[0];
  const method = (['sham_cash', 'usdt', 'cash', 'syriatel_cash', 'mtn_cash', 'transfer'] as const).find((m) => settings.paymentMethods?.[m]?.enabled);
  if (plan && method) {
    await subscriptions.createRequest(
      store.id,
      subscriptionRequestSchema.parse({ planId: plan.id, method, reference: 'TX-48127395', note: 'تم التحويل صباح اليوم' }),
    );
  }

  console.log('\n✅ بيانات تجريبية جاهزة');
  console.log(`   الدخول:   ${SAMPLE_EMAIL} / ${SAMPLE_PASSWORD}`);
  console.log(`   المتجر:   /s/${SAMPLE_SLUG}\n`);
}

if (require.main === module) {
  AppDataSource.initialize()
    .then(seedSample)
    .then(() => AppDataSource.destroy())
    .catch(async (err) => {
      console.error(err);
      if (AppDataSource.isInitialized) await AppDataSource.destroy();
      process.exit(1);
    });
}
