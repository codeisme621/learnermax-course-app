'use client';

import { track } from '@vercel/analytics';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const included = ['Immediate access to the complete course', 'The next 8-week guided cohort', 'Weekly live office hours', 'Practical exercises and capstone', 'Certificate of Achievement', 'Ongoing course updates'];

export function CtaSection() {
  const router = useRouter();
  const enroll = () => { track('cta_clicked', { location: 'offer', offer: 'founding' }); sessionStorage.setItem('pendingEnrollmentCourseId', 'spec-driven-dev-mini'); router.push('/enroll'); };
  return <section id="enroll" className="bg-[#d9f99d] py-24 lg:py-32"><div className="container mx-auto px-4"><div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl bg-[#07110f] text-white shadow-2xl shadow-emerald-950/20 lg:grid-cols-[1.05fr_.95fr]"><div className="p-8 md:p-12 lg:p-14"><p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-emerald-300">Founding offer</p><h2 className="mt-5 text-4xl font-semibold tracking-[-.035em] md:text-5xl">Become the engineer who can lead the shift to autonomous development.</h2><p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">Start learning today. Follow the guided cohort for momentum. Get live help whenever the hard parts stop being theoretical.</p><ul className="mt-9 grid gap-4 sm:grid-cols-2">{included.map(item => <li key={item} className="flex gap-3 text-sm text-slate-300"><Check className="h-5 w-5 shrink-0 text-emerald-300" />{item}</li>)}</ul></div><div className="border-t border-white/10 bg-white/[.04] p-8 md:p-12 lg:border-l lg:border-t-0 lg:p-14"><div className="text-sm font-semibold text-slate-400">Founding cohort price</div><div className="mt-2 flex items-end gap-2"><span className="text-6xl font-bold tracking-tight">$399</span><span className="pb-2 text-slate-400">one time</span></div><p className="mt-5 text-sm leading-6 text-slate-400">Founding pricing is available for the initial cohort and may increase as the program expands.</p><Button size="lg" onClick={enroll} className="mt-8 h-14 w-full rounded-xl bg-emerald-300 text-base font-bold text-[#07110f] hover:bg-emerald-200">Join the founding cohort <ArrowRight className="ml-2 h-5 w-5" /></Button><div className="mt-6 flex gap-3 rounded-xl border border-white/10 p-4"><ShieldCheck className="h-6 w-6 shrink-0 text-emerald-300" /><div><div className="font-bold">30-day satisfaction guarantee</div><p className="mt-1 text-sm leading-6 text-slate-400">Go through the material. If it is not the right fit, let us know within 30 days for a refund.</p></div></div></div></div></div></section>;
}
