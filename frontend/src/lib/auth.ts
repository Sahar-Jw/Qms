'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { BrandSettings, Settings, User } from './types';

export const useMe = () =>
  useQuery({ queryKey: ['me'], queryFn: () => api.get<User>('/auth/me'), retry: false, staleTime: 60_000 });

export const useSettings = () =>
  useQuery({ queryKey: ['settings'], queryFn: () => api.get<Settings>('/settings'), staleTime: 30_000 });

export const useBrandSettings = () =>
  useQuery({ queryKey: ['brand'], queryFn: () => api.get<BrandSettings>('/settings/brand'), staleTime: 30_000 });
