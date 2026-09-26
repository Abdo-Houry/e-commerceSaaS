import 'reflect-metadata';
import { categoryInputSchema, createStoreSchema, deliveryZoneInputSchema, productInputSchema } from '@matjari/shared';
import { AppDataSource } from '../src/config/data-source';
import { createDatabaseIfMissing } from '../src/scripts/create-db';
import * as auth from '../src/services/auth.service';
import * as categories from '../src/services/category.service';
import * as products from '../src/services/product.service';
import * as stores from '../src/services/store.service';
import * as zones from '../src/services/delivery-zone.service';

export async function setupDatabase(): Promise<void> {
  await createDatabaseIfMissing();
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  await AppDataSource.dropDatabase();
  await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS citext');
  await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await AppDataSource.runMigrations({ transaction: 'all' });
}

export async function teardownDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
}

let counter = 0;

/** A merchant with a store, one category, two products and one delivery zone. */
export async function createFixture(overrides: { minOrderAmount?: number } = {}) {
  counter += 1;
  const tag = `${Date.now().toString(36)}${counter}`;
  const { user } = await auth.register({ name: 'تاجر', email: `m${tag}@test.local`, password: 'password123' });
  const store = await stores.createStore(user.id, createStoreSchema.parse({
    name: `متجر ${tag}`,
    slug: `store-${tag}`,
    whatsappNumber: '0944123456',
    currency: 'SYP',
  }));
  if (overrides.minOrderAmount !== undefined) {
    await stores.updateStore(store.id, { minOrderAmount: overrides.minOrderAmount });
  }
  const category = await categories.createCategory(store.id, categoryInputSchema.parse({ name: 'عام' }));
  const shirt = await products.createProduct(store.id, productInputSchema.parse({
    name: 'قميص',
    price: 100_000,
    categoryId: category.id,
    stock: 10,
    options: [{ name: 'المقاس', values: ['M', 'L'] }],
  }));
  const mug = await products.createProduct(store.id, productInputSchema.parse({ name: 'كوب', price: 25_000, stock: 3 }));
  const zone = await zones.createZone(store.id, deliveryZoneInputSchema.parse({ name: 'المركز', fee: 5_000 }));
  return { user, store, category, shirt, mug, zone };
}
