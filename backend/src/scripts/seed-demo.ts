// Creates (or recreates) the platform's showcase store at /s/demo — linked from the
// landing page. It never expires, is hidden from admin lists, and can't take real orders.
import 'reflect-metadata';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcrypt';
import sharp from 'sharp';
import { categoryInputSchema, DEMO_STORE_SLUG, deliveryZoneInputSchema, productInputSchema } from '@matjari/shared';
import { AppDataSource } from '../config/data-source';
import { uploadRoot } from '../config/env';
import { Store } from '../entities/Store';
import { Subscription } from '../entities/Subscription';
import { User } from '../entities/User';
import * as categories from '../services/category.service';
import * as zones from '../services/delivery-zone.service';
import { getSettings } from '../services/platform.service';
import * as products from '../services/product.service';

const DEMO_OWNER_EMAIL = 'demo@matjari.app';

/** Real product photos (Unsplash License, see assets/demo/CREDITS.md), resized to square WebP. */
const ASSETS = path.resolve(__dirname, '../../assets/demo');

async function placePhoto(asset: string, size: number, file: string) {
  await sharp(path.join(ASSETS, asset)).resize(size, size, { fit: 'cover' }).webp({ quality: 80 }).toFile(file);
}

const CATALOG = [
  { name: 'تيشيرت قطني أبيض', cat: 0, photo: 'shirt.jpg', price: 85_000, compare: 110_000, stock: 25, options: [{ name: 'المقاس', values: ['S', 'M', 'L', 'XL'] }], desc: 'قطن 100% ناعم ومريح، قصّة عصرية تناسب كل الإطلالات اليومية.' },
  { name: 'حذاء رياضي ملوّن', cat: 0, photo: 'shoes.jpg', price: 340_000, compare: null, stock: 12, options: [{ name: 'المقاس', values: ['40', '41', '42', '43', '44'] }], desc: 'نعل مريح ومرن للمشي اليومي والرياضة الخفيفة، بألوان مميزة.' },
  { name: 'حقيبة يد جلدية', cat: 1, photo: 'bag.jpg', price: 275_000, compare: 320_000, stock: 4, options: [{ name: 'اللون', values: ['أحمر', 'أسود', 'بيج'] }], desc: 'جلد لامع بخياطة متينة، تتسع لكل أغراضك اليومية.' },
  { name: 'ساعة ذكية بيضاء', cat: 1, photo: 'watch.jpg', price: 420_000, compare: null, stock: 8, options: [], desc: 'تصميم بسيط بسوار سيليكون مريح، مقاومة للماء.' },
  { name: 'نظارة شمسية كلاسيكية', cat: 1, photo: 'glasses.jpg', price: 95_000, compare: 120_000, stock: 30, options: [], desc: 'حماية كاملة من الأشعة فوق البنفسجية مع إطار خفيف.' },
  { name: 'عطر شرقي فاخر', cat: 1, photo: 'perfume.jpg', price: 260_000, compare: null, stock: 15, options: [{ name: 'الحجم', values: ['50 مل', '100 مل'] }], desc: 'نفحات دافئة من العنبر والفانيلا تدوم طويلاً.' },
  { name: 'شمعة معطّرة', cat: 2, photo: 'candle.jpg', price: 45_000, compare: null, stock: 0, trackStock: false, options: [{ name: 'الرائحة', values: ['فانيلا', 'لافندر', 'ياسمين'] }], desc: 'شمع صويا طبيعي في كأس زجاجي، تحترق حتى 30 ساعة.' },
  { name: 'كوب قهوة خزفي', cat: 2, photo: 'mug.jpg', price: 30_000, compare: 40_000, stock: 6, options: [], desc: 'خزف أبيض أنيق، مناسب للقهوة والشاي ويتحمل الجلاية.' },
] as const;

export async function seedDemo(): Promise<void> {
  const users = AppDataSource.getRepository(User);
  // Idempotent: remove the previous showcase (cascades to store, catalog and orders).
  await users.delete({ email: DEMO_OWNER_EMAIL });
  await AppDataSource.getRepository(Store).delete({ slug: DEMO_STORE_SLUG });

  const settings = await getSettings();
  const owner = await users.save(
    users.create({
      name: 'متجر تجريبي',
      email: DEMO_OWNER_EMAIL,
      // Random, never shown: nobody logs into the showcase store.
      passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
      role: 'merchant',
    }),
  );

  const store = await AppDataSource.getRepository(Store).save(
    AppDataSource.getRepository(Store).create({
      ownerId: owner.id,
      name: 'متجر الياسمين',
      slug: DEMO_STORE_SLUG,
      description: 'ملابس وإكسسوارات ولمسات للمنزل بجودة عالية — توصيل لكل المحافظات والدفع عند الاستلام.',
      template: 'classic',
      primaryColor: '#0F766E',
      secondaryColor: '#F59E0B',
      font: 'cairo',
      whatsappNumber: settings.supportWhatsapp || '963990000000',
      currency: 'SYP',
      city: 'دمشق',
      bannerTitle: 'تشكيلة الموسم الجديد وصلت ✨',
      bannerSubtitle: 'اختر ما يعجبك واطلب بضغطة زر عبر واتساب',
      socialLinks: { instagram: 'instagram.com', facebook: 'facebook.com', tiktok: '' },
      businessHours: { summary: 'يومياً من 10 صباحاً حتى 10 مساءً' },
    }),
  );
  await AppDataSource.getRepository(Subscription).save(
    AppDataSource.getRepository(Subscription).create({
      storeId: store.id,
      plan: 'basic',
      status: 'active',
      trialEndsAt: null,
      currentPeriodEnd: new Date('2099-12-31T00:00:00Z'),
    }),
  );

  const dir = path.join(uploadRoot, store.id);
  await fs.mkdir(dir, { recursive: true });
  await placePhoto('logo.jpg', 400, path.join(dir, 'demo-logo.webp'));
  store.logoUrl = `/uploads/${store.id}/demo-logo.webp`;
  await AppDataSource.getRepository(Store).save(store);

  const cats = [];
  for (const name of ['ملابس', 'إكسسوارات', 'منزل']) {
    cats.push(await categories.createCategory(store.id, categoryInputSchema.parse({ name })));
  }

  // Created in reverse so the catalogue order matches the list above (new products go first).
  for (const [i, p] of [...CATALOG.entries()].reverse()) {
    const file = `demo-product-${i + 1}.webp`;
    await placePhoto(p.photo, 900, path.join(dir, file));
    await products.createProduct(
      store.id,
      productInputSchema.parse({
        name: p.name,
        description: p.desc,
        price: p.price,
        comparePrice: p.compare,
        categoryId: cats[p.cat]!.id,
        images: [`/uploads/${store.id}/${file}`],
        stock: p.stock,
        trackStock: 'trackStock' in p ? p.trackStock : true,
        options: p.options.map((o) => ({ name: o.name, values: [...o.values] })),
        isActive: true,
      }),
    );
  }

  await zones.createZone(store.id, deliveryZoneInputSchema.parse({ name: 'دمشق', fee: 15_000, estimatedTime: 'خلال 24 ساعة' }));
  await zones.createZone(store.id, deliveryZoneInputSchema.parse({ name: 'ريف دمشق', fee: 25_000, estimatedTime: 'يومان' }));
  await zones.createZone(store.id, deliveryZoneInputSchema.parse({ name: 'حلب', fee: 35_000, estimatedTime: '2–3 أيام' }));
  await zones.createZone(store.id, deliveryZoneInputSchema.parse({ name: 'حمص وحماة', fee: 30_000, estimatedTime: '2–3 أيام' }));
  await zones.createZone(store.id, deliveryZoneInputSchema.parse({ name: 'باقي المحافظات', fee: 40_000, estimatedTime: '2–4 أيام' }));

  console.log(`✅ المتجر التجريبي جاهز: /s/${DEMO_STORE_SLUG}`);
}

if (require.main === module) {
  AppDataSource.initialize()
    .then(seedDemo)
    .then(() => AppDataSource.destroy())
    .catch(async (err) => {
      console.error(err);
      if (AppDataSource.isInitialized) await AppDataSource.destroy();
      process.exit(1);
    });
}
