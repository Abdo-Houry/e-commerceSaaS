import { ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { assetUrl, cn } from '@/lib/utils';

export function ProductImage({
  src,
  alt,
  sizes,
  priority,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const url = assetUrl(src);
  return (
    <div className={cn('relative overflow-hidden bg-store-soft', className)}>
      {url ? (
        <Image src={url} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center text-store" aria-hidden>
          <ImageIcon className="size-1/4 max-h-12 max-w-12 opacity-60" />
        </div>
      )}
    </div>
  );
}
