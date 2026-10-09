'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { uploadUrl } from '@/lib/urls';
import { Building2, Check, Languages, Palette, ScrollText, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AuditTab } from '@/components/settings/AuditTab';
import { BrandTab } from '@/components/settings/BrandTab';
import { TextsTab } from '@/components/settings/TextsTab';
import { ThemeTab } from '@/components/settings/ThemeTab';
import { Card, CardHeader, Loading, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { useMe, useSettings } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { toastError } from '@/lib/errors';
import { useI18n } from '@/lib/i18n';
import { hasRole, type PickCompany, type Settings } from '@/lib/types';

type Tab = 'company' | 'brand' | 'theme' | 'texts' | 'audit';

export default function SettingsPage() {
  const { t } = useI18n();
  const me = useMe().data;
  const [tab, setTab] = useState<Tab>('company');
  // Everyone picks the issuing company. Theme, texts and audit log: manager, general manager and technical manager only
  // (the API enforces the same rule, this just keeps the tabs out of an employee's sight).
  const canManage = !!me && hasRole(me.role, 'manager');
  const active: Tab = canManage ? tab : 'company';

  const tabs: { key: Tab; label: string; icon: typeof Building2 }[] = [
    { key: 'company', label: t('settings.tabs.company'), icon: Building2 },
    { key: 'brand', label: t('settings.tabs.brand'), icon: Sparkles },
    { key: 'theme', label: t('settings.tabs.theme'), icon: Palette },
    { key: 'texts', label: t('settings.tabs.texts'), icon: Languages },
    { key: 'audit', label: t('settings.tabs.audit'), icon: ScrollText },
  ];

  return (
    <>
      <PageHeader title={t('settings.title')} />
      {canManage && (
        <div role="tablist" aria-label={t('settings.title')} className="mb-4 flex flex-wrap gap-2">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} role="tab" id={`settings-tab-${key}`} aria-selected={active === key} aria-controls={`settings-panel-${key}`} onClick={() => setTab(key)}
              className={cn('inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold ring-1 ring-inset transition-colors sm:px-4', active === key ? 'bg-ink text-sand ring-ink' : 'bg-white text-cocoa ring-stone hover:bg-sand')}>
              <Icon className="size-4" />{label}
            </button>
          ))}
        </div>
      )}
      <div role="tabpanel" id={`settings-panel-${active}`} aria-labelledby={canManage ? `settings-tab-${active}` : undefined}>
        {active === 'company' && <CompanyTab />}
        {active === 'brand' && <BrandTab />}
        {active === 'theme' && <ThemeTab />}
        {active === 'texts' && <TextsTab />}
        {active === 'audit' && <AuditTab />}
      </div>
    </>
  );
}

/** The one section every user sees: which company their quotations are issued from. */
function CompanyTab() {
  const { t, has } = useI18n();
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
                      ? <img src={uploadUrl(c.logo)} alt="" className="size-14 shrink-0 rounded-xl bg-white object-contain p-1" />
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
  );
}
