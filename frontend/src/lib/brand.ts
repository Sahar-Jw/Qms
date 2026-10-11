'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useBrandSettings } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import type { BrandSettings } from '@/lib/types';

const CACHE_KEY = 'qms.brand';

/**
 * The site name / tagline / tab title exactly as written in Settings > Branding - the SAME text in every language.
 * The built-in translated default (t('app.name')) is only used when the branding could not be loaded at all
 * (API down), never as a stand-in while it loads or when the language changes.
 */
export function useSiteBrand() {
  const { t } = useI18n();
  const brand = useBrandSettings();
  const failed = brand.isError && !brand.data;
  const name = brand.data?.websiteName || (failed ? t('app.name') : '');
  const tagline = brand.data?.tagline || (failed ? t('app.tagline') : '');
  const tabTitle = brand.data?.tabTitle || name;
  return { brand: brand.data, name, tagline, tabTitle };
}

/** Mount once (SiteSync): remembers the last branding so the next visit shows the right name from the first frame. */
export function useBrandCache() {
  const qc = useQueryClient();
  const brand = useBrandSettings();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      // updatedAt: 0 -> treated as stale, so the fresh value is still fetched right away
      if (raw && !qc.getQueryData(['brand'])) qc.setQueryData<BrandSettings>(['brand'], JSON.parse(raw), { updatedAt: 0 });
    } catch { /* storage unavailable: ignore */ }
  }, [qc]);

  useEffect(() => {
    if (!brand.data) return;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(brand.data)); } catch { /* ignore */ }
  }, [brand.data]);
}
