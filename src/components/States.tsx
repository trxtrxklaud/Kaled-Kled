import React from 'react';
import { Info, AlertCircle } from 'lucide-react';

/**
 * Shared empty/error states (Arabic-first, thumb-friendly).
 * Use everywhere instead of blank screens or raw errors.
 */
export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center rounded-[2rem] border-dashed border-2 border-slate-200 bg-slate-50/50">
      <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
        <Info className="w-7 h-7" />
      </div>
      <p className="text-slate-600 font-black">{title}</p>
      {description ? <p className="text-xs text-slate-400 mt-1 font-medium">{description}</p> : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center rounded-[2rem] border border-rose-100 bg-rose-50/50">
      <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mb-3">
        <AlertCircle className="w-7 h-7" />
      </div>
      <p className="text-rose-900 font-black">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 px-6 py-3 min-h-[44px] rounded-2xl bg-white border border-rose-200 text-rose-700 text-sm font-black active:scale-95 transition-transform"
        >
          إعادة المحاولة
        </button>
      ) : null}
    </div>
  );
}
