import { ArrowDownRight, Braces, Gauge, Network, ShieldCheck } from 'lucide-react';

const outcomes = [
  { icon: Braces, title: 'You know what context matters', description: 'Instead of stuffing everything into a prompt, you design how the agent finds the right knowledge at the right moment.' },
  { icon: ShieldCheck, title: 'You know when “done” is real', description: 'You build verification into the loop so confidence comes from evidence—not from the agent grading its own work.' },
  { icon: Network, title: 'You can repeat the workflow', description: 'You turn successful experiments into a harness your team can apply across tasks, people, and repositories.' },
  { icon: Gauge, title: 'You can improve the system', description: 'You measure failures, diagnose where intervention happens, and make autonomy more reliable over time.' },
];

export function BenefitsSection() {
  return <section id="outcomes" className="bg-[#f3f5f1] py-24 lg:py-32"><div className="container mx-auto px-4"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20"><div><p className="eyebrow">The transformation</p><h2 className="mt-5 text-4xl font-semibold tracking-[-0.035em] text-slate-950 md:text-5xl">You do not need to know every new term. You need to know what makes the system reliable.</h2><p className="mt-6 text-lg leading-8 text-slate-600">The course takes you beyond isolated tool tricks and gives you a durable mental model you can bring back to your codebase, your team, and whatever tools come next.</p><div className="mt-9 flex items-center gap-3 text-sm font-bold text-emerald-800"><ArrowDownRight className="h-5 w-5" /> From overwhelmed by change to leading it</div></div><div className="grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2">{outcomes.map(({ icon: Icon, title, description }, index) => <article key={title} className="bg-white p-7 lg:p-9"><div className="flex items-center justify-between"><Icon className="h-6 w-6 text-emerald-700" /><span className="font-mono text-xs text-slate-400">0{index + 1}</span></div><h3 className="mt-10 text-xl font-bold text-slate-950">{title}</h3><p className="mt-3 leading-7 text-slate-600">{description}</p></article>)}</div></div></div></section>;
}
