import type { ReactNode } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

/** Dark brand backdrop (matches the landing page) with a high-contrast white form card. */
export function AuthPage({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <>
      <Header minimal />
      <main className="relative min-h-screen overflow-hidden bg-[#07110f] px-4 pb-20 pt-28">
        <div className="agentic-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div
          className="pointer-events-none absolute left-1/2 top-24 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto w-full max-w-md rounded-2xl bg-white p-8 text-slate-900 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.65)] ring-1 ring-white/10 sm:p-10">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>}
          </div>
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
