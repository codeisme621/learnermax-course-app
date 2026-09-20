'use client';

import { track } from '@vercel/analytics';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { CourseData } from '@/types/landing';
import { Button } from '@/components/ui/button';

interface HeroSectionProps { course: CourseData; }

const durablePrinciples = [
  ['Context', 'Give the agent what it needs—without flooding it'],
  ['Verification', 'Know the work is right before you trust it'],
  ['Harnesses', 'Turn good results into a repeatable system'],
];

export function HeroSection({ course }: HeroSectionProps) {
  const router = useRouter();
  const handleEnrollClick = () => {
    track('cta_clicked', { location: 'hero', offer: 'founding' });
    sessionStorage.setItem('pendingEnrollmentCourseId', course.id);
    router.push('/enroll');
  };

  return (
    <section className="relative overflow-hidden bg-[#07110f] text-white">
      <div className="agentic-grid absolute inset-0 opacity-35" />
      <div className="absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[120px]" />
      <div className="container relative mx-auto grid min-h-[760px] items-center gap-14 px-4 py-20 lg:grid-cols-[1.12fr_.88fr] lg:py-28">
        <div className="max-w-3xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" /> Founding cohort · Enrollment open
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.045em] text-white md:text-6xl lg:text-7xl">
            Stop chasing every new <span className="text-emerald-300">agentic coding buzzword.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
            Learn the evergreen engineering patterns behind reliable coding agents—and build a system that can take intent all the way to a verified pull request.
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Button size="lg" onClick={handleEnrollClick} className="h-14 rounded-xl bg-emerald-300 px-7 text-base font-bold text-[#07110f] shadow-[0_16px_50px_rgba(110,231,183,.18)] hover:bg-emerald-200">
              Build your agentic workflow <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <a href="#curriculum" className="text-sm font-semibold text-slate-300 underline-offset-4 hover:text-white hover:underline">Explore the curriculum</a>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400">
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" /> Immediate course access</span>
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" /> Weekly live office hours</span>
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /> 30-day guarantee</span>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-emerald-300/20 to-cyan-300/5 blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b1714]/95 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="text-sm font-semibold text-white">What still matters when the tools change</div>
              <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-700" /><span className="h-2.5 w-2.5 rounded-full bg-slate-700" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /></div>
            </div>
            <div className="space-y-4 p-6 text-sm">
              {durablePrinciples.map(([principle, outcome]) => <div key={principle} className="rounded-xl border border-white/5 bg-white/[.025] p-4"><div className="font-mono text-xs uppercase tracking-widest text-emerald-300">{principle}</div><div className="mt-2 font-semibold text-slate-200">{outcome}</div></div>)}
              <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/5 px-4 py-3 font-mono text-emerald-200">goal → working change → verified PR</div>
            </div>
          </div>
          <div className="absolute -bottom-6 -right-2 rounded-xl border border-emerald-300/20 bg-[#10211c] px-5 py-4 shadow-xl sm:right-6">
            <div className="text-xs uppercase tracking-widest text-slate-500">Founding price</div><div className="mt-1 text-3xl font-bold text-white">$399</div>
          </div>
        </div>
      </div>
    </section>
  );
}
