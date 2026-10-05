import type { ReactNode } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LEGAL } from '@/lib/legal';

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Header minimal />
      <main className="bg-white px-4 pb-20 pt-28 text-slate-800">
        <article className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated {LEGAL.lastUpdated}</p>
          <div className="mt-10 space-y-8 text-[15px] leading-7">{children}</div>
        </article>
      </main>
      <Footer />
    </>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-6">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function Mail() {
  return (
    <a href={`mailto:${LEGAL.contactEmail}`} className="font-medium text-emerald-700 underline underline-offset-4">
      {LEGAL.contactEmail}
    </a>
  );
}
