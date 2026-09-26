import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { PLATFORM_TAG, storeTag } from '@/lib/public-api';
import { serverEnv } from '@/lib/server-env';

/** Called by the API after a merchant edit, so the storefront reflects it without waiting for ISR expiry. */
export async function POST(req: NextRequest) {
  const secret = serverEnv.revalidateSecret;
  if (!secret || req.headers.get('x-revalidate-secret') !== secret) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'غير مصرح' } }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { slug?: unknown; scope?: unknown } | null;
  if (body?.scope === 'platform') {
    revalidateTag(PLATFORM_TAG, { expire: 0 });
    revalidatePath('/');
    return NextResponse.json({ data: { revalidated: true, scope: 'platform' } });
  }
  const slug = typeof body?.slug === 'string' ? body.slug : null;
  if (!slug || !/^[a-z0-9-]{1,40}$/.test(slug)) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'slug غير صالح' } }, { status: 400 });
  }

  revalidateTag(storeTag(slug), { expire: 0 });
  revalidatePath(`/s/${slug}`, 'layout');
  return NextResponse.json({ data: { revalidated: true, slug } });
}
