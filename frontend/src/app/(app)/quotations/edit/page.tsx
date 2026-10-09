'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { QuotationForm } from '@/components/QuotationForm';
import { Button, Card, Empty, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { quotationHref } from '@/lib/urls';
import { useI18n } from '@/lib/i18n';
import type { QuotationView } from '@/lib/types';

export default function EditQuotationPage() {
  return <Suspense fallback={<Loading />}><EditQuotation /></Suspense>;
}

function EditQuotation() {
  const id = useSearchParams().get('id') ?? '';
  const { t } = useI18n();
  const q = useQuery({ queryKey: ['quotation', Number(id)], queryFn: () => api.get<QuotationView>(`/quotations/${id}`) });
  if (q.isLoading) return <Loading />;
  if (!q.data) return <Card><Empty text={t('err.QUOTATION_NOT_FOUND')} /></Card>;
  if (!q.data.editable) {
    return (
      <Card className="p-8 text-center">
        <p className="mb-4 text-sm text-cocoa">{q.data.readOnlyReason === 'not_owner' ? t('quotations.notOwner') : t('quotations.readOnly')}</p>
        <Link href={quotationHref(id)}><Button>{t('common.back')}</Button></Link>
      </Card>
    );
  }
  return <QuotationForm key={q.data.updatedAt} initial={q.data} />;
}
