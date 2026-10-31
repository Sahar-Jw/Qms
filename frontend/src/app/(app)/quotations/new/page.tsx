'use client';
import { BlockSkeleton, Card } from '@/components/ui';
import { QuotationForm } from '@/components/QuotationForm';
import { useSettings } from '@/lib/auth';

export default function NewQuotation() {
  const s = useSettings();
  if (s.isLoading) return <Card><BlockSkeleton lines={6} /></Card>;
  return <QuotationForm />;
}
