'use client';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { uploadUrl } from '@/lib/urls';

/** Small product picture (falls back to a placeholder icon). */
export function MaterialThumb({ image, size = 'size-10', className }: { image?: string | null; size?: string; className?: string }) {
  // catalogue holds the picture path (materials/xxx.jpg); old free-text values are ignored
  return image && /^materials\/[\w.-]+$/.test(image)
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={uploadUrl(image)} alt="" loading="lazy" className={cn(size, 'shrink-0 rounded-xl border border-stone/60 bg-white object-contain p-0.5', className)} />
    : <span className={cn(size, 'grid shrink-0 place-items-center rounded-xl border border-stone/60 bg-sand/60 text-clay', className)}><ImageIcon className="size-1/2" /></span>;
}
