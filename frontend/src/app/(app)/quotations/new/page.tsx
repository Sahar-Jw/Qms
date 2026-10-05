'use client';
import { Loading } from '@/components/ui';
import { QuotationForm } from '@/components/QuotationForm';
import { useSettings } from '@/lib/auth';

export default function NewQuotation() {
  const s = useSettings();
  if (s.isLoading) return <Loading />;
  return <QuotationForm />;
}
