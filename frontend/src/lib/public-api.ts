import 'server-only';
import type { ApiSuccess, PublicProductDto, PublicStoreDto } from '@matjari/shared';
import { serverEnv } from './server-env';

export const STOREFRONT_REVALIDATE = 60;

export const storeTag = (slug: string) => `store:${slug}`;

export const PLATFORM_TAG = 'platform';

async function get<T>(path: string, slug: string): Promise<T | null> {
  const res = await fetch(`${serverEnv.apiInternalUrl}${path}`, {
    next: { revalidate: STOREFRONT_REVALIDATE, tags: [storeTag(slug)] },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status} for ${path}`);
  return ((await res.json()) as ApiSuccess<T>).data;
}

const isSlug = (slug: string) => /^[a-z0-9-]{1,40}$/.test(slug);
const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

export function getStore(slug: string) {
  return isSlug(slug) ? get<PublicStoreDto>(`/public/stores/${slug}`, slug) : Promise.resolve(null);
}

export function getProducts(slug: string) {
  return isSlug(slug) ? get<PublicProductDto[]>(`/public/stores/${slug}/products`, slug) : Promise.resolve(null);
}

export function getProduct(slug: string, id: string) {
  return isSlug(slug) && isUuid(id)
    ? get<PublicProductDto>(`/public/stores/${slug}/products/${id}`, slug)
    : Promise.resolve(null);
}
