'use client';

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} className="w-full">
      <div className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold text-cocoa">
        <span className="truncate">{label}</span>
        <span className="tabular-nums" dir="ltr">{v}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-stone/50">
        <div className="h-full rounded-full bg-ink transition-[width] duration-200 ease-out" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
