import axios, { AxiosError, type AxiosResponse } from 'axios';
import type { ApiError, ApiSuccess, AuthResult } from '@matjari/shared';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { API_URL } from './env';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retried?: boolean;
  }
}

/* The access token lives in memory only; the refresh token is an httpOnly cookie. */
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function hasAccessToken() {
  return accessToken !== null;
}

export const api = axios.create({ baseURL: API_URL, withCredentials: true, timeout: 20_000 });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

/** One in-flight refresh at a time, shared by every request that hit a 401. */
export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= axios
    .post<ApiSuccess<AuthResult>>(`${API_URL}/auth/refresh`, null, { withCredentials: true })
    .then((res) => {
      accessToken = res.data.data.accessToken;
      return accessToken;
    })
    .catch(() => {
      accessToken = null;
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config;
    const isAuthCall = original?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?next=${next}`;
      }
    }
    // Subscription over or store suspended: send the merchant to the page that explains how to renew.
    if (
      error.response?.status === 402 &&
      typeof window !== 'undefined' &&
      window.location.pathname.startsWith('/dashboard') &&
      window.location.pathname !== '/dashboard/subscription'
    ) {
      window.location.href = '/dashboard/subscription';
    }
    return Promise.reject(error);
  },
);

export async function unwrap<T>(request: Promise<AxiosResponse<ApiSuccess<T>>>): Promise<T> {
  const res = await request;
  return res.data.data;
}

export function apiError(err: unknown): ApiError['error'] | null {
  if (err instanceof AxiosError) {
    const body = err.response?.data as Partial<ApiError> | undefined;
    if (body?.error) return body.error;
  }
  return null;
}

export function getErrorMessage(err: unknown, fallback = 'حدث خطأ، حاول مرة أخرى'): string {
  const e = apiError(err);
  if (e?.message) return e.message;
  if (err instanceof AxiosError && !err.response) return 'تعذر الاتصال بالخادم، تحقق من الإنترنت';
  return fallback;
}

/** Maps server-side zod field errors onto react-hook-form fields. Returns true if any were applied. */
export function applyServerErrors<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>): boolean {
  const e = apiError(err);
  if (e?.code !== 'VALIDATION_ERROR' || !e.details || typeof e.details !== 'object') return false;
  let applied = false;
  for (const [field, messages] of Object.entries(e.details as Record<string, string[] | undefined>)) {
    if (messages?.[0]) {
      setError(field as Path<T>, { type: 'server', message: messages[0] });
      applied = true;
    }
  }
  return applied;
}
