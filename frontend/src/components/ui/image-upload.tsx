'use client';

import { MAX_PRODUCT_IMAGES } from '@matjari/shared';
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { api, getErrorMessage, unwrap } from '@/lib/api';
import { assetUrl, cn } from '@/lib/utils';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_BYTES = 5 * 1024 * 1024;

async function uploadFile(file: File, path = '/uploads'): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error('حجم الصورة يجب ألا يتجاوز 5 ميغابايت');
  const form = new FormData();
  form.append('file', file);
  const { url } = await unwrap<{ url: string }>(api.post(path, form));
  return url;
}

function useUploader(path?: string) {
  const [uploading, setUploading] = useState(0);
  async function upload(files: File[]): Promise<string[]> {
    setUploading((n) => n + files.length);
    const urls: string[] = [];
    for (const file of files) {
      try {
        urls.push(await uploadFile(file, path));
      } catch (err) {
        toast.error(err instanceof Error && !('isAxiosError' in err) ? err.message : getErrorMessage(err, 'تعذر رفع الصورة'));
      } finally {
        setUploading((n) => n - 1);
      }
    }
    return urls;
  }
  return { uploading, upload };
}

/** A single image (logo, banner, category image). */
export function ImageUpload({
  value,
  onChange,
  label,
  aspect = 'square',
  error,
  uploadPath,
  hint = 'JPG أو PNG أو WEBP، حتى 5 ميغابايت',
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  label: string;
  aspect?: 'square' | 'wide';
  error?: string;
  /** Endpoint receiving the multipart upload (default /uploads). */
  uploadPath?: string;
  hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { uploading, upload } = useUploader(uploadPath);
  const src = assetUrl(value);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-n-800">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className={cn(
            'relative flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-n-300 bg-n-50 text-n-500 transition-colors hover:border-brand-600 hover:text-brand-700',
            aspect === 'square' ? 'size-24' : 'aspect-[3/1] w-full max-w-sm',
            error && 'border-danger',
          )}
          aria-label={value ? `تغيير ${label}` : `رفع ${label}`}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-7" aria-hidden />
          )}
          {uploading > 0 && (
            <span className="absolute inset-0 flex items-center justify-center bg-n-0/80">
              <Loader2 className="size-6 animate-spin text-brand-700" aria-hidden />
            </span>
          )}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex min-h-11 cursor-pointer items-center gap-1 rounded-md px-3 text-sm font-semibold text-[#B91C1C] hover:bg-status-cancelled-bg"
          >
            <Trash2 className="size-4" aria-hidden />
            إزالة
          </button>
        )}
      </div>
      <p className="text-xs text-n-600">{hint}</p>
      {error && <p role="alert" className="text-xs font-medium text-[#B91C1C]">{error}</p>}
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          const [url] = await upload([file]);
          if (url) onChange(url);
        }}
      />
    </div>
  );
}

/** Up to five product images, reorderable by drag (desktop) or arrow buttons (touch). The first is the cover. */
export function ImagesManager({ value, onChange }: { value: string[]; onChange: (urls: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const { uploading, upload } = useUploader();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  // Uploads finish asynchronously; merge into the latest list, not the one captured at selection time.
  const latest = useRef(value);
  latest.current = value;
  const remaining = MAX_PRODUCT_IMAGES - value.length - uploading;

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-n-800">صور المنتج</span>
        <span className="text-xs text-n-600">
          {value.length}/{MAX_PRODUCT_IMAGES} — الصورة الأولى هي الغلاف
        </span>
      </div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {value.map((url, i) => (
          <li
            key={url}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) move(dragIndex, i);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className={cn(
              'group relative aspect-square cursor-grab overflow-hidden rounded-md border border-n-200 bg-n-100 active:cursor-grabbing',
              dragIndex === i && 'opacity-40',
              i === 0 && 'ring-2 ring-brand-600',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assetUrl(url)!} alt={`صورة ${i + 1}`} className="size-full object-cover" draggable={false} />
            {i === 0 && (
              <span className="absolute top-1 start-1 rounded-sm bg-brand-700 px-1.5 text-caption font-semibold text-n-0">غلاف</span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-n-900/60 p-0.5">
              <button
                type="button"
                aria-label="نقل لليمين"
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
                className="flex size-9 cursor-pointer items-center justify-center rounded-sm text-n-0 hover:bg-n-0/20 disabled:opacity-30"
              >
                <ArrowRight className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="حذف الصورة"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="flex size-9 cursor-pointer items-center justify-center rounded-sm text-n-0 hover:bg-danger"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="نقل لليسار"
                disabled={i === value.length - 1}
                onClick={() => move(i, i + 1)}
                className="flex size-9 cursor-pointer items-center justify-center rounded-sm text-n-0 hover:bg-n-0/20 disabled:opacity-30"
              >
                <ArrowLeft className="size-4" aria-hidden />
              </button>
            </div>
          </li>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <li key={`up-${i}`} className="flex aspect-square items-center justify-center rounded-md border border-n-200 bg-n-100">
            <Loader2 className="size-6 animate-spin text-brand-700" aria-hidden />
          </li>
        ))}
        {remaining > 0 && (
          <li>
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-n-300 text-n-600 hover:border-brand-600 hover:text-brand-700"
            >
              <ImagePlus className="size-6" aria-hidden />
              <span className="text-caption font-semibold">إضافة صورة</span>
            </button>
          </li>
        )}
      </ul>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []).slice(0, Math.max(remaining, 0));
          e.target.value = '';
          if (!files.length) return;
          const urls = await upload(files);
          if (urls.length) onChange([...latest.current, ...urls].slice(0, MAX_PRODUCT_IMAGES));
        }}
      />
    </div>
  );
}
