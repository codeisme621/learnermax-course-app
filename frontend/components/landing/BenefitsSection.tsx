import { ArrowDownRight, Braces, Gauge, Network, ShieldCheck } from 'lucide-react';

const outcomes = [
  { icon: Braces, title: 'Give agents the right context', description: 'Design context, retrieval, and tool access that stay useful as tasks grow beyond a single prompt.' },
  { icon: ShieldCheck, title: 'Make quality verifiable', description: 'Build evals and feedback loops that turn “looks good” into repeatable engineering evidence.' },
  { icon: Network, title: 'Engineer the harness', description: 'Connect goals, environments, agent primitives, and guardrails into a system you can operate.' },
  { icon: Gauge, title: 'Improve with real signals', description: 'Instrument the workflow, diagnose failure modes, and make autonomous runs better over time.' },
];

export function BenefitsSection() {
  return <section id="outcomes" className="bg-[#f3f5f1] py-24 lg:py-32"><div className="container mx-auto px-4"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20"><div><p className="eyebrow">The shift</p><h2 className="mt-5 text-4xl font-semibold tracking-[-0.035em] text-slate-950 md:text-5xl">AI can write code. Your advantage is engineering the system around it.</h2><p className="mt-6 text-lg leading-8 text-slate-600">Most developers stop at prompts and tool tricks. This course teaches the durable layer: how to make agents legible, constrained, testable, and useful inside a real software delivery process.</p><div className="mt-9 flex items-center gap-3 text-sm font-bold text-emerald-800"><ArrowDownRight className="h-5 w-5" /> From ad-hoc assistance to reliable autonomy</div></div><div className="grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2">{outcomes.map(({ icon: Icon, title, description }, index) => <article key={title} className="bg-white p-7 lg:p-9"><div className="flex items-center justify-between"><Icon className="h-6 w-6 text-emerald-700" /><span className="font-mono text-xs text-slate-400">0{index + 1}</span></div><h3 className="mt-10 text-xl font-bold text-slate-950">{title}</h3><p className="mt-3 leading-7 text-slate-600">{description}</p></article>)}</div></div></div></section>;
}
