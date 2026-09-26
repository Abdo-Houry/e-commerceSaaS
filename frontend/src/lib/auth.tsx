'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { canOperate, type AuthResult, type LoginInput, type MeResult, type RegisterInput, type StoreDto } from '@matjari/shared';
import { api, hasAccessToken, refreshAccessToken, setAccessToken, unwrap } from './api';

export const meQueryKey = ['me'] as const;

async function fetchMe(): Promise<MeResult | null> {
  if (!hasAccessToken()) {
    const token = await refreshAccessToken();
    if (!token) return null;
  }
  try {
    return await unwrap<MeResult>(api.get('/auth/me'));
  } catch (err) {
    // The in-memory access token may have expired; /auth/* calls skip the interceptor's retry.
    if (!(err instanceof AxiosError) || err.response?.status !== 401) throw err;
    const token = await refreshAccessToken();
    return token ? unwrap<MeResult>(api.get('/auth/me')) : null;
  }
}

export function useMe() {
  return useQuery({ queryKey: meQueryKey, queryFn: fetchMe, staleTime: 5 * 60_000, retry: false });
}

export function useAuthActions() {
  const queryClient = useQueryClient();

  async function afterAuth(result: AuthResult) {
    setAccessToken(result.accessToken);
    const me = await unwrap<MeResult>(api.get('/auth/me'));
    queryClient.setQueryData(meQueryKey, me);
    return me;
  }

  return {
    login: async (values: LoginInput) => afterAuth(await unwrap<AuthResult>(api.post('/auth/login', values))),
    register: async (values: RegisterInput) => afterAuth(await unwrap<AuthResult>(api.post('/auth/register', values))),
    logout: async () => {
      try {
        await api.post('/auth/logout');
      } finally {
        setAccessToken(null);
        queryClient.clear();
        queryClient.setQueryData(meQueryKey, null);
      }
    },
    setStore: (store: StoreDto) => {
      queryClient.setQueryData<MeResult | null>(meQueryKey, (prev) => (prev ? { ...prev, store } : prev));
    },
  };
}

export function useStore(): StoreDto | null {
  return useMe().data?.store ?? null;
}

type GuardMode = 'dashboard' | 'onboarding' | 'guest' | 'admin';

/**
 * Client-side route guard.
 * dashboard: signed in with a store · onboarding: signed in without a store · guest: signed out · admin: platform admin.
 * A store whose subscription ended is confined to /dashboard/subscription.
 * Returns true once the current user may see the page.
 */
export function useAuthGuard(mode: GuardMode): boolean {
  const { data, isPending } = useMe();
  const router = useRouter();
  const pathname = usePathname();

  const target = (() => {
    if (isPending) return null;
    if (!data) return mode === 'guest' ? null : `/login?next=${encodeURIComponent(pathname)}`;
    if (mode === 'admin') return data.user.role === 'admin' ? null : '/dashboard';
    if (mode === 'guest') return data.user.role === 'admin' ? '/admin' : data.store ? '/dashboard' : '/onboarding';
    if (mode === 'dashboard' && !data.store) return '/onboarding';
    if (mode === 'dashboard' && data.access && !canOperate(data.access.state) && pathname !== '/dashboard/subscription') {
      return '/dashboard/subscription';
    }
    if (mode === 'onboarding' && data.store) return '/dashboard';
    return null;
  })();

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  return !isPending && target === null;
}
