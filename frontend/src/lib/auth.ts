'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { BrandSettings, CatalogSettings, Settings, User } from './types';

export const useMe = () =>
  useQuery({ queryKey: ['me'], queryFn: () => api.get<User>('/auth/me'), retry: false, staleTime: 60_000 });

export const useSettings = () =>
  useQuery({ queryKey: ['settings'], queryFn: () => api.get<Settings>('/settings'), staleTime: 30_000 });

export const useBrandSettings = () =>
  useQuery({ queryKey: ['brand'], queryFn: () => api.get<BrandSettings>('/settings/brand'), staleTime: 30_000 });

/** The catalog file size limit. Every screen that shows or checks it reads it from here, so a change shows up everywhere at once. */
export const CATALOG_SETTINGS_KEY = ['catalog-settings'] as const;
export const useCatalogSettings = () =>
  useQuery({ queryKey: CATALOG_SETTINGS_KEY, queryFn: () => api.get<CatalogSettings>('/settings/catalog'), staleTime: 15_000 });
