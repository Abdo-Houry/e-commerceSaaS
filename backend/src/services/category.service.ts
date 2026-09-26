import type { z } from 'zod';
import type { CategoryDto, categoryInputSchema, categoryUpdateSchema } from '@matjari/shared';
import { AppDataSource } from '../config/data-source';
import { Category } from '../entities/Category';
import { Product } from '../entities/Product';
import { Store } from '../entities/Store';
import { toCategoryDto } from '../utils/dto';
import { HttpError } from '../utils/http-error';
import { revalidateStorefront } from '../utils/revalidate';
import { scopedRepo } from '../utils/scoped-repo';
import { assertOwnUploads } from './upload.service';

type CategoryInput = z.output<typeof categoryInputSchema>;
type CategoryUpdate = z.output<typeof categoryUpdateSchema>;

async function revalidate(storeId: string) {
  const store = await AppDataSource.getRepository(Store).findOne({ where: { id: storeId }, select: { slug: true } });
  revalidateStorefront(store?.slug);
}

async function assertNameFree(storeId: string, name: string, exceptId?: string) {
  const existing = await scopedRepo(Category, storeId).findOne({ where: { name } });
  if (existing && existing.id !== exceptId) throw HttpError.conflict('يوجد تصنيف بهذا الاسم', 'CATEGORY_EXISTS');
}

export async function listCategories(storeId: string): Promise<CategoryDto[]> {
  const categories = await scopedRepo(Category, storeId).find({ order: { sortOrder: 'ASC', createdAt: 'ASC' } });
  const counts: { categoryId: string; count: string }[] = await AppDataSource.getRepository(Product)
    .createQueryBuilder('p')
    .select('p.categoryId', 'categoryId')
    .addSelect('COUNT(*)', 'count')
    .where('p.storeId = :storeId AND p.categoryId IS NOT NULL', { storeId })
    .groupBy('p.categoryId')
    .getRawMany();
  const byId = new Map(counts.map((c) => [c.categoryId, Number(c.count)]));
  return categories.map((c) => toCategoryDto(c, byId.get(c.id) ?? 0));
}

export async function createCategory(storeId: string, input: CategoryInput): Promise<CategoryDto> {
  await assertNameFree(storeId, input.name);
  if (input.imageUrl) assertOwnUploads(storeId, [input.imageUrl]);
  const repo = scopedRepo(Category, storeId);
  const last = await repo.findOne({ where: {}, order: { sortOrder: 'DESC' } });
  const category = await repo.save(repo.create({ ...input, sortOrder: (last?.sortOrder ?? -1) + 1 }));
  void revalidate(storeId);
  return toCategoryDto(category, 0);
}

export async function updateCategory(storeId: string, id: string, input: CategoryUpdate): Promise<CategoryDto> {
  const repo = scopedRepo(Category, storeId);
  const category = await repo.findOneOrFail(id);
  if (input.name && input.name !== category.name) await assertNameFree(storeId, input.name, id);
  if (input.imageUrl) assertOwnUploads(storeId, [input.imageUrl]);
  Object.assign(category, input);
  await repo.save(category);
  void revalidate(storeId);
  return toCategoryDto(category);
}

/** Soft-deletes the category; its products stay, uncategorised. */
export async function deleteCategory(storeId: string, id: string): Promise<void> {
  await AppDataSource.transaction(async (m) => {
    const repo = scopedRepo(Category, storeId, m);
    await repo.findOneOrFail(id);
    await m.getRepository(Product).update({ storeId, categoryId: id }, { categoryId: null });
    await repo.softDelete(id);
  });
  void revalidate(storeId);
}

export async function reorderCategories(storeId: string, ids: string[]): Promise<void> {
  await scopedRepo(Category, storeId).reorder(ids);
  void revalidate(storeId);
}
