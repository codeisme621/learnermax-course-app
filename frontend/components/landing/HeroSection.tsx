'use client';

import { track } from '@vercel/analytics';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { HeroVideo } from './HeroVideo';

export function HeroSection() {
  const router = useRouter();
  const handleEnrollClick = () => {
    track('cta_clicked', { location: 'hero', offer: 'founding' });
    router.push('/checkout');
  };

  return (
    <section className="relative overflow-hidden bg-[#07110f] text-white">
      <div className="agentic-grid absolute inset-0 opacity-35" />
      <div className="absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[120px]" />
      <div className="container relative mx-auto flex flex-col items-center px-4 py-16 text-center lg:py-24">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" /> Founding cohort · Enrollment open
        </div>
        <h1 className="max-w-4xl text-5xl font-semibold leading-[1.04] tracking-[-0.045em] text-white md:text-6xl lg:text-7xl">
          Become the engineer your team <span className="text-emerald-300">follows into agentic development.</span>
        </h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
          Learn the durable patterns behind coding agents your team can actually trust: context, verification, and harnesses. Then build a system that takes intent all the way to a verified pull request.
        </p>
        <div className="mt-12 w-full">
          <HeroVideo />
        </div>
        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row">
          <Button size="lg" onClick={handleEnrollClick} className="h-14 rounded-xl bg-emerald-300 px-7 text-base font-bold text-[#07110f] shadow-[0_16px_50px_rgba(110,231,183,.18)] hover:bg-emerald-200">
            Join the founding cohort <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <a href="#curriculum" className="text-sm font-semibold text-slate-300 underline-offset-4 hover:text-white hover:underline">Explore the curriculum</a>
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-slate-400">
          <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" /> Immediate course access</span>
          <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" /> Weekly live office hours</span>
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /> 30-day guarantee</span>
        </div>
      </div>
    </section>
  );
}
