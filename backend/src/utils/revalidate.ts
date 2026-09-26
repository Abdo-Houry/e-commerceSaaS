import { env } from '../config/env';

/**
 * Asks the Next.js app to drop cached pages so admin/merchant edits show up
 * immediately. Fire-and-forget: ISR expiry is the fallback if the web app is down.
 */
function post(body: Record<string, string>) {
  if (!env.REVALIDATE_SECRET || env.NODE_ENV === 'test') return;
  const base = env.WEB_INTERNAL_URL ?? env.WEB_PUBLIC_URL;
  fetch(`${base}/api/revalidate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-revalidate-secret': env.REVALIDATE_SECRET },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {
    /* web app may be down in development */
  });
}

/** Pages showing platform settings (landing page pricing). */
export function revalidatePlatform(): void {
  post({ scope: 'platform' });
}

/** A storefront and all its pages. */
export function revalidateStorefront(...slugs: (string | null | undefined)[]): void {
  for (const slug of new Set(slugs.filter((s): s is string => !!s))) post({ slug });
}
