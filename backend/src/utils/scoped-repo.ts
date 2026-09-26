import type { EntityManager, EntityTarget, FindManyOptions, FindOneOptions, FindOptionsWhere, ObjectLiteral } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { HttpError } from './http-error';

type StoreOwned = ObjectLiteral & { id: string; storeId: string };

/**
 * A repository wrapper that injects `storeId` into every read and write, so a
 * merchant query cannot forget the tenant filter. Anything outside the store
 * is indistinguishable from a missing row (404).
 */
export function scopedRepo<T extends StoreOwned>(entity: EntityTarget<T>, storeId: string, manager?: EntityManager) {
  const repo = (manager ?? AppDataSource.manager).getRepository(entity);

  const scope = (where?: FindOptionsWhere<T> | FindOptionsWhere<T>[]): FindOptionsWhere<T> | FindOptionsWhere<T>[] => {
    const base = { storeId } as FindOptionsWhere<T>;
    if (!where) return base;
    return Array.isArray(where) ? where.map((w) => ({ ...w, ...base })) : { ...where, ...base };
  };

  return {
    repo,
    storeId,

    find(options: FindManyOptions<T> = {}) {
      return repo.find({ ...options, where: scope(options.where as FindOptionsWhere<T>) });
    },

    findAndCount(options: FindManyOptions<T> = {}) {
      return repo.findAndCount({ ...options, where: scope(options.where as FindOptionsWhere<T>) });
    },

    count(options: FindManyOptions<T> = {}) {
      return repo.count({ ...options, where: scope(options.where as FindOptionsWhere<T>) });
    },

    findOne(options: FindOneOptions<T>) {
      return repo.findOne({ ...options, where: scope(options.where as FindOptionsWhere<T>) });
    },

    async findOneOrFail(id: string, options: Omit<FindOneOptions<T>, 'where'> = {}): Promise<T> {
      const row = await repo.findOne({ ...options, where: scope({ id } as FindOptionsWhere<T>) });
      if (!row) throw HttpError.notFound();
      return row;
    },

    create(data: Partial<T>): T {
      return repo.create({ ...data, storeId } as T);
    },

    save(entity: T): Promise<T> {
      if (entity.storeId !== storeId) throw HttpError.notFound();
      return repo.save(entity);
    },

    async softDelete(id: string): Promise<void> {
      const res = await repo.softDelete(scope({ id } as FindOptionsWhere<T>) as FindOptionsWhere<T>);
      if (!res.affected) throw HttpError.notFound();
    },

    async delete(id: string): Promise<void> {
      const res = await repo.delete(scope({ id } as FindOptionsWhere<T>) as FindOptionsWhere<T>);
      if (!res.affected) throw HttpError.notFound();
    },

    /** Applies `sortOrder = index` for ids that belong to this store; rejects foreign ids. */
    async reorder(ids: string[]): Promise<void> {
      const unique = [...new Set(ids)];
      await (manager ?? AppDataSource.manager).transaction(async (m) => {
        const r = m.getRepository(entity);
        const owned = await r.count({ where: unique.map((id) => ({ id, storeId }) as FindOptionsWhere<T>) });
        if (owned !== unique.length) throw HttpError.notFound();
        for (const [index, id] of unique.entries()) {
          await r.update({ id, storeId } as FindOptionsWhere<T>, { sortOrder: index } as never);
        }
      });
    },
  };
}
