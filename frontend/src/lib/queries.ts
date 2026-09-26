'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CategoryDto,
  CategoryInput,
  DeliveryZoneDto,
  DeliveryZoneInput,
  LowStockProductDto,
  OrderDto,
  OrderListQuery,
  OrderStatus,
  OrderSummaryDto,
  Paginated,
  ProductDto,
  ProductInput,
  ProductListQuery,
  ProductUpdateInput,
  StatsOverview,
  StoreDto,
  StoreQr,
  TopProductDto,
  UpdateStoreInput,
} from '@matjari/shared';
import { api, unwrap } from './api';
import { useAuthActions } from './auth';

export const qk = {
  categories: ['categories'] as const,
  products: (q?: ProductListQuery) => ['products', q ?? {}] as const,
  product: (id: string) => ['product', id] as const,
  zones: ['zones'] as const,
  orders: (q?: OrderListQuery) => ['orders', q ?? {}] as const,
  order: (id: string) => ['order', id] as const,
  overview: ['stats', 'overview'] as const,
  topProducts: ['stats', 'top-products'] as const,
  lowStock: ['stats', 'low-stock'] as const,
  qr: ['store', 'qr'] as const,
};

/* ─── Store ──────────────────────────────────────────────────────────── */

export function useUpdateStore() {
  const { setStore } = useAuthActions();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateStoreInput) => unwrap<StoreDto>(api.patch('/store/me', input)),
    onSuccess: (store) => {
      setStore(store);
      void qc.invalidateQueries({ queryKey: qk.qr });
      void qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useStoreQr(enabled = true) {
  return useQuery({ queryKey: qk.qr, queryFn: () => unwrap<StoreQr>(api.get('/store/me/qr')), enabled, staleTime: Infinity });
}

/* ─── Categories ─────────────────────────────────────────────────────── */

export function useCategories() {
  return useQuery({ queryKey: qk.categories, queryFn: () => unwrap<CategoryDto[]>(api.get('/categories')) });
}

export function useCategoryMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.categories });
  return {
    create: useMutation({
      mutationFn: (input: CategoryInput) => unwrap<CategoryDto>(api.post('/categories', input)),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, ...input }: Partial<CategoryInput> & { id: string }) =>
        unwrap<CategoryDto>(api.patch(`/categories/${id}`, input)),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.delete(`/categories/${id}`),
      onSuccess: () => {
        void invalidate();
        void qc.invalidateQueries({ queryKey: ['products'] });
      },
    }),
    reorder: useMutation({
      mutationFn: (ids: string[]) => api.patch('/categories/reorder', { ids }),
      onMutate: async (ids) => {
        await qc.cancelQueries({ queryKey: qk.categories });
        const prev = qc.getQueryData<CategoryDto[]>(qk.categories);
        if (prev) {
          const byId = new Map(prev.map((c) => [c.id, c]));
          qc.setQueryData(qk.categories, ids.map((id, i) => ({ ...byId.get(id)!, sortOrder: i })));
        }
        return { prev };
      },
      onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(qk.categories, ctx.prev),
      onSettled: invalidate,
    }),
  };
}

/* ─── Products ───────────────────────────────────────────────────────── */

export function useProducts(q: ProductListQuery) {
  return useQuery({
    queryKey: qk.products(q),
    queryFn: () => unwrap<Paginated<ProductDto>>(api.get('/products', { params: q })),
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: string) {
  return useQuery({ queryKey: qk.product(id), queryFn: () => unwrap<ProductDto>(api.get(`/products/${id}`)) });
}

export function useProductMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['products'] });
    void qc.invalidateQueries({ queryKey: qk.categories });
    void qc.invalidateQueries({ queryKey: ['stats'] });
  };
  return {
    create: useMutation({
      mutationFn: (input: ProductInput) => unwrap<ProductDto>(api.post('/products', input)),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, ...input }: ProductUpdateInput & { id: string }) =>
        unwrap<ProductDto>(api.patch(`/products/${id}`, input)),
      onSuccess: (p) => {
        qc.setQueryData(qk.product(p.id), p);
        invalidate();
      },
    }),
    toggle: useMutation({
      mutationFn: (id: string) => unwrap<ProductDto>(api.patch(`/products/${id}/toggle`)),
      onSuccess: (p) => {
        qc.setQueryData(qk.product(p.id), p);
        invalidate();
      },
    }),
    remove: useMutation({ mutationFn: (id: string) => api.delete(`/products/${id}`), onSuccess: invalidate }),
    reorder: useMutation({ mutationFn: (ids: string[]) => api.patch('/products/reorder', { ids }), onSettled: invalidate }),
  };
}

/* ─── Delivery zones ─────────────────────────────────────────────────── */

export function useZones() {
  return useQuery({ queryKey: qk.zones, queryFn: () => unwrap<DeliveryZoneDto[]>(api.get('/delivery-zones')) });
}

export function useZoneMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.zones });
  return {
    create: useMutation({
      mutationFn: (input: DeliveryZoneInput) => unwrap<DeliveryZoneDto>(api.post('/delivery-zones', input)),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, ...input }: Partial<DeliveryZoneInput> & { id: string }) =>
        unwrap<DeliveryZoneDto>(api.patch(`/delivery-zones/${id}`, input)),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: string) => api.delete(`/delivery-zones/${id}`), onSuccess: invalidate }),
  };
}

/* ─── Orders ─────────────────────────────────────────────────────────── */

export function useOrders(q: OrderListQuery) {
  return useQuery({
    queryKey: qk.orders(q),
    queryFn: () => unwrap<Paginated<OrderSummaryDto>>(api.get('/orders', { params: q })),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

export function useOrder(id: string) {
  return useQuery({ queryKey: qk.order(id), queryFn: () => unwrap<OrderDto>(api.get(`/orders/${id}`)) });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      unwrap<OrderDto>(api.patch(`/orders/${id}/status`, { status })),
    onSuccess: (order) => {
      qc.setQueryData(qk.order(order.id), order);
      void qc.invalidateQueries({ queryKey: ['orders'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      if (order.status === 'delivered') void qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export async function downloadOrdersCsv(q: Omit<OrderListQuery, 'page' | 'limit'>) {
  const res = await api.get<Blob>('/orders/export.csv', { params: q, responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ─── Stats ──────────────────────────────────────────────────────────── */

export function useOverview(enabled = true) {
  return useQuery({
    enabled,
    queryKey: qk.overview,
    queryFn: () => unwrap<StatsOverview>(api.get('/stats/overview')),
    refetchInterval: 60_000,
  });
}

export function useTopProducts(limit = 5) {
  return useQuery({
    queryKey: [...qk.topProducts, limit],
    queryFn: () => unwrap<TopProductDto[]>(api.get('/stats/top-products', { params: { limit } })),
  });
}

export function useLowStock(threshold = 5) {
  return useQuery({
    queryKey: [...qk.lowStock, threshold],
    queryFn: () => unwrap<LowStockProductDto[]>(api.get('/stats/low-stock', { params: { threshold } })),
  });
}
