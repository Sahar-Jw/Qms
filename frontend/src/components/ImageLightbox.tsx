'use client';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { uploadUrl } from '@/lib/urls';

/** Shows one picture alone, as large as the screen allows. Closes on click, X or Escape. */
export function ImageLightbox({ image, onClose }: { image: string; onClose: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    // capture phase + stopPropagation so Escape closes only the picture, not the dialog behind it
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[70] grid cursor-zoom-out place-items-center bg-ink/85 p-4 backdrop-blur-sm"
      onMouseDown={(e) => { e.stopPropagation(); onClose(); }} onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={onClose} aria-label={t('common.close')} className="absolute end-4 top-4 grid size-10 place-items-center rounded-full bg-white/15 text-white hover:bg-white/30"><X className="size-5" /></button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={uploadUrl(image)} alt="" onMouseDown={(e) => e.stopPropagation()} className="max-h-[92vh] max-w-[94vw] cursor-default rounded-2xl bg-white object-contain shadow-2xl" />
    </div>
  );
}
