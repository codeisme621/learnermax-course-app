import type { ReactNode } from 'react';

export function FormMessage({ kind, children }: { kind: 'error' | 'info'; children: ReactNode }) {
  const styles = kind === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-foreground';
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`p-3 rounded-md text-sm ${styles}`}>
      {children}
    </div>
  );
}
