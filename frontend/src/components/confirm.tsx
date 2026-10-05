'use client';
import { AlertTriangle } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Modal } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

export interface ConfirmOptions { title?: ReactNode; message: ReactNode; confirmText?: string; cancelText?: string; danger?: boolean }
type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Replacement for window.confirm(): `if (await confirm({ message })) ...` */
export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return fn;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((o) => new Promise<boolean>((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setOpts(o);
  }), []);

  const close = useCallback((v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  }, []);

  useEffect(() => { if (opts) okRef.current?.focus(); }, [opts]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!opts}
        title={opts?.title ?? t('common.confirmTitle')}
        onClose={() => close(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>{opts?.cancelText ?? t('common.cancel')}</Button>
            <Button ref={okRef} variant={opts?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{opts?.confirmText ?? t('common.confirm')}</Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sand text-cocoa"><AlertTriangle className="size-5" /></span>
          <p className="pt-1.5 text-sm font-semibold leading-relaxed">{opts?.message}</p>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}
