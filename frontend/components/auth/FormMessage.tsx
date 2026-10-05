import type { ReactNode } from 'react';

export function FormMessage({ kind, children }: { kind: 'error' | 'info'; children: ReactNode }) {
  const styles =
    kind === 'error'
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-emerald-200 bg-emerald-50 text-emerald-900';
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border p-3 text-sm leading-6 ${styles}`}>
      {children}
    </div>
  );
}
