'use client';
import { ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { ImageLightbox } from '@/components/ImageLightbox';
import { cn } from '@/lib/cn';
import { uploadUrl } from '@/lib/urls';

/** img holds the picture path (materials/xxx.jpg); catalog documents are managed separately. */
export const isMaterialImage = (v?: string | null): v is string => !!v && /^materials\/[\w.-]+$/.test(v);

/** Product picture (falls back to a placeholder icon). With `zoom`, clicking it opens the picture alone in a large view. */
export function MaterialThumb({ image, size = 'size-14', className, zoom }: { image?: string | null; size?: string; className?: string; zoom?: boolean }) {
  const [open, setOpen] = useState(false);
  if (!isMaterialImage(image)) {
    return <span className={cn(size, 'grid shrink-0 place-items-center rounded-xl border border-stone/60 bg-sand/60 text-clay', className)}><ImageIcon className="size-1/2" /></span>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src={uploadUrl(image)} alt="" loading="lazy" className={cn(size, 'shrink-0 rounded-xl border border-stone/60 bg-white object-contain p-0.5', zoom && 'cursor-zoom-in transition hover:shadow-md', className)} />;
  if (!zoom) return img;
  return (
    <>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(true); }} className="shrink-0 rounded-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-clay/40">{img}</button>
      {open && <ImageLightbox image={image} onClose={() => setOpen(false)} />}
    </>
  );
}
