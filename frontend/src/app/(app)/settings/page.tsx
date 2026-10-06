'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, Loading, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { useSettings } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { toastError } from '@/lib/errors';
import { useI18n } from '@/lib/i18n';
import type { PickCompany, Settings } from '@/lib/types';

export default function SettingsPage() {
  const { t, pick, has } = useI18n();
  const qc = useQueryClient();
  const settings = useSettings();
  const companies = useQuery({ queryKey: ['settings', 'companies'], queryFn: () => api.get<PickCompany[]>('/settings/companies') });
  const selected = settings.data?.issuingCompany?.id;

  const choose = useMutation({
    mutationFn: (id: number) => api.patch<Settings>('/settings', { issuingCompanyId: id }),
    onSuccess: (s) => { qc.setQueryData(['settings'], s); toast.success(t('settings.companySaved')); },
    onError: (e) => toastError(e, t, has),
  });

  return (
    <>
      <PageHeader title={t('settings.title')} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-12">
          <CardHeader title={t('settings.company')} />
          <div className="p-5">
            <p className="mb-4 text-sm text-cocoa">{t('settings.companySub')}</p>
            {companies.isLoading || settings.isLoading ? <Loading /> : (
              <div className="grid gap-3 sm:grid-cols-2">
                {companies.data?.map((c) => {
                  const on = c.id === selected;
                  return (
                    <button key={c.id} onClick={() => !on && choose.mutate(c.id)} disabled={choose.isPending}
                      className={cn('flex items-center gap-4 rounded-2xl border-2 p-4 text-start transition-colors', on ? 'border-cocoa bg-sand' : 'border-stone/60 bg-white hover:border-clay hover:bg-sand/40')}>
                      {c.logo
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={`/uploads/${c.logo}`} alt="" className="size-14 shrink-0 rounded-xl bg-white object-contain p-1" />
                        : <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-ink text-xl font-bold text-sand">{c.name.charAt(0)}</span>}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{c.name}</span>
                        <span className="block text-xs text-cocoa">{on ? (settings.data?.issuingCompanyIsAutomatic ? t('settings.automatic') : t('settings.current')) : t('settings.pick')}</span>
                      </span>
                      {on && <span className="grid size-8 place-items-center rounded-full bg-cocoa text-white"><Check className="size-4" /></span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

      </div>
    </>
  );
}
