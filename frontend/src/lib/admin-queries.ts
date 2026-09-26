'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ActivateSubscriptionInput,
  AdminOverviewDto,
  AdminStoreDetailDto,
  AdminStoreListQuery,
  AdminStoreSummaryDto,
  MySubscriptionDto,
  Paginated,
  PlatformSettings,
  PlatformSettingsInput,
  SubscriptionPaymentDto,
  SubscriptionRequestDto,
  SubscriptionRequestInput,
  RequestStatus,
} from '@matjari/shared';
import { api, unwrap } from './api';

const ak = {
  overview: ['admin', 'overview'] as const,
  stores: (q: AdminStoreListQuery) => ['admin', 'stores', q] as const,
  store: (id: string) => ['admin', 'store', id] as const,
  payments: (page: number) => ['admin', 'payments', page] as const,
  settings: ['admin', 'settings'] as const,
  requests: (status: RequestStatus | undefined, page: number) => ['admin', 'requests', status ?? 'all', page] as const,
};

/* ─── Merchant ───────────────────────────────────────────────────────── */

export function useMySubscription() {
  return useQuery({ queryKey: ['subscription'], queryFn: () => unwrap<MySubscriptionDto>(api.get('/subscription')) });
}

export function useSubscriptionRequestActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['subscription'] });
  return {
    submit: useMutation({
      mutationFn: (input: SubscriptionRequestInput) => unwrap<SubscriptionRequestDto>(api.post('/subscription/requests', input)),
      onSuccess: invalidate,
    }),
    cancel: useMutation({ mutationFn: (id: string) => api.delete(`/subscription/requests/${id}`), onSuccess: invalidate }),
  };
}

/* ─── Admin ──────────────────────────────────────────────────────────── */

export function useAdminOverview() {
  return useQuery({ queryKey: ak.overview, queryFn: () => unwrap<AdminOverviewDto>(api.get('/admin/overview')) });
}

export function useAdminStores(q: AdminStoreListQuery) {
  return useQuery({
    queryKey: ak.stores(q),
    queryFn: () => unwrap<Paginated<AdminStoreSummaryDto>>(api.get('/admin/stores', { params: q })),
    placeholderData: keepPreviousData,
  });
}

export function useAdminStore(id: string) {
  return useQuery({ queryKey: ak.store(id), queryFn: () => unwrap<AdminStoreDetailDto>(api.get(`/admin/stores/${id}`)) });
}

export function useAdminPayments(page: number) {
  return useQuery({
    queryKey: ak.payments(page),
    queryFn: () => unwrap<Paginated<SubscriptionPaymentDto>>(api.get('/admin/payments', { params: { page, limit: 30 } })),
    placeholderData: keepPreviousData,
  });
}

export function useAdminSettings() {
  return useQuery({ queryKey: ak.settings, queryFn: () => unwrap<PlatformSettings>(api.get('/admin/settings')) });
}

export function useAdminStoreActions(id: string) {
  const qc = useQueryClient();
  const onSuccess = (store: AdminStoreDetailDto) => {
    qc.setQueryData(ak.store(id), store);
    void qc.invalidateQueries({ queryKey: ['admin', 'stores'] });
    void qc.invalidateQueries({ queryKey: ak.overview });
    void qc.invalidateQueries({ queryKey: ['admin', 'payments'] });
  };
  return {
    activate: useMutation({
      mutationFn: (input: ActivateSubscriptionInput) => unwrap<AdminStoreDetailDto>(api.post(`/admin/stores/${id}/activate`, input)),
      onSuccess,
    }),
    extendTrial: useMutation({
      mutationFn: (days: number) => unwrap<AdminStoreDetailDto>(api.post(`/admin/stores/${id}/extend-trial`, { days })),
      onSuccess,
    }),
    suspend: useMutation({
      mutationFn: (reason: string) => unwrap<AdminStoreDetailDto>(api.post(`/admin/stores/${id}/suspend`, { reason })),
      onSuccess,
    }),
    unsuspend: useMutation({
      mutationFn: () => unwrap<AdminStoreDetailDto>(api.post(`/admin/stores/${id}/unsuspend`)),
      onSuccess,
    }),
  };
}

export function useUpdatePlatformSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PlatformSettingsInput) => unwrap<PlatformSettings>(api.put('/admin/settings', input)),
    onSuccess: (s) => qc.setQueryData(ak.settings, s),
  });
}

export function useAdminRequests(status: RequestStatus | undefined, page: number) {
  return useQuery({
    queryKey: ak.requests(status, page),
    queryFn: () => unwrap<Paginated<SubscriptionRequestDto>>(api.get('/admin/requests', { params: { status, page, limit: 20 } })),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

export function useAdminRequestActions() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin'] });
  };
  return {
    approve: useMutation({
      mutationFn: (id: string) => unwrap<SubscriptionRequestDto>(api.post(`/admin/requests/${id}/approve`)),
      onSuccess: invalidate,
    }),
    reject: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) =>
        unwrap<SubscriptionRequestDto>(api.post(`/admin/requests/${id}/reject`, { reason })),
      onSuccess: invalidate,
    }),
  };
}
