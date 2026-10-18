import { toast } from 'sonner';
import { ApiError, NetworkError } from './api';

type T = (key: string, vars?: Record<string, string | number>) => string;

/** Localised message for an API error (by its `code`), falling back to the server text. */
export function errorMessage(e: unknown, t: T, has: (k: string) => boolean): string {
  if (e instanceof ApiError) {
    if (has(`err.${e.code}`)) return t(`err.${e.code}`);
    if (e.details?.length) return e.details.join(' · ');
    return e.message;
  }
  if (e instanceof NetworkError) return t('err.NETWORK');
  // A bug in the page itself (not the network): show what it is and keep the details in the console.
  console.error(e);
  return (e as Error)?.message ?? t('err.INTERNAL_ERROR');
}

export function toastError(e: unknown, t: T, has: (k: string) => boolean) {
  toast.error(errorMessage(e, t, has));
}
