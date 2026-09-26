import { Brackets } from 'typeorm';
import type { z } from 'zod';
import type {
  Paginated,
  ProductDto,
  productInputSchema,
  productListQuerySchema,
  productUpdateSchema,
} from '@matjari/shared';
import { AppDataSource } from '../config/data-source';
import { Category } from '../entities/Category';
import { Product } from '../entities/Product';
import { Store } from '../entities/Store';
import { toProductDto } from '../utils/dto';
import { revalidateStorefront } from '../utils/revalidate';
import { scopedRepo } from '../utils/scoped-repo';
import { assertOwnUploads } from './upload.service';

type ProductInput = z.output<typeof productInputSchema>;
type ProductUpdate = z.output<typeof productUpdateSchema>;
type ProductListQuery = z.output<typeof productListQuerySchema>;

async function revalidate(storeId: string) {
  const store = await AppDataSource.getRepository(Store).findOne({ where: { id: storeId }, select: { slug: true } });
  revalidateStorefront(store?.slug);
}

async function assertCategory(storeId: string, categoryId: string | null | undefined) {
  if (categoryId) await scopedRepo(Category, storeId).findOneOrFail(categoryId);
}

export async function listProducts(storeId: string, q: ProductListQuery): Promise<Paginated<ProductDto>> {
  const qb = AppDataSource.getRepository(Product)
    .createQueryBuilder('p')
    .where('p.storeId = :storeId', { storeId })
    .orderBy('p.sortOrder', 'ASC')
    .addOrderBy('p.createdAt', 'DESC')
    .skip((q.page - 1) * q.limit)
    .take(q.limit);

  if (q.search) {
    const term = `%${q.search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    qb.andWhere(
      new Brackets((w) => w.where('p.name ILIKE :term', { term }).orWhere('p.description ILIKE :term', { term })),
    );
  }
  if (q.categoryId) qb.andWhere('p.categoryId = :categoryId', { categoryId: q.categoryId });
  if (q.isActive !== undefined) qb.andWhere('p.isActive = :isActive', { isActive: q.isActive });

  const [rows, total] = await qb.getManyAndCount();
  return { items: rows.map(toProductDto), total, page: q.page, limit: q.limit, pages: Math.ceil(total / q.limit) };
}

export async function getProduct(storeId: string, id: string): Promise<ProductDto> {
  return toProductDto(await scopedRepo(Product, storeId).findOneOrFail(id));
}

export async function createProduct(storeId: string, input: ProductInput): Promise<ProductDto> {
  await assertCategory(storeId, input.categoryId);
  assertOwnUploads(storeId, input.images);
  const repo = scopedRepo(Product, storeId);
  // New products go first in the list.
  const first = await repo.findOne({ where: {}, order: { sortOrder: 'ASC' } });
  const product = await repo.save(repo.create({ ...input, sortOrder: (first?.sortOrder ?? 1) - 1 }));
  void revalidate(storeId);
  return toProductDto(product);
}

export async function updateProduct(storeId: string, id: string, input: ProductUpdate): Promise<ProductDto> {
  const repo = scopedRepo(Product, storeId);
  const product = await repo.findOneOrFail(id);
  if (input.categoryId !== undefined) await assertCategory(storeId, input.categoryId);
  if (input.images) assertOwnUploads(storeId, input.images);

  const next = { ...product, ...input };
  if (next.comparePrice != null && next.comparePrice <= next.price) next.comparePrice = null;
  Object.assign(product, next);
  await repo.save(product);
  void revalidate(storeId);
  return toProductDto(product);
}

export async function deleteProduct(storeId: string, id: string): Promise<void> {
  await scopedRepo(Product, storeId).softDelete(id);
  void revalidate(storeId);
}

export async function toggleProduct(storeId: string, id: string): Promise<ProductDto> {
  const repo = scopedRepo(Product, storeId);
  const product = await repo.findOneOrFail(id);
  product.isActive = !product.isActive;
  await repo.save(product);
  void revalidate(storeId);
  return toProductDto(product);
}

export async function reorderProducts(storeId: string, ids: string[]): Promise<void> {
  await scopedRepo(Product, storeId).reorder(ids);
  void revalidate(storeId);
}
