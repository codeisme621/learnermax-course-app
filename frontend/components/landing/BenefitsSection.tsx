import { ArrowDownRight, Braces, Gauge, Network, ShieldCheck } from 'lucide-react';

const outcomes = [
  { icon: Braces, title: 'Your agent loses the plot', description: 'A task starts well, then the agent misses an architectural constraint, repeats an old mistake, or fills the gaps with guesses.' },
  { icon: ShieldCheck, title: 'You cannot trust “done”', description: 'The tests pass—but they may test the wrong thing. You still open every file because the system has not earned your confidence.' },
  { icon: Network, title: 'Every chat starts over', description: 'Your best instructions live in prompts and memory. The workflow works once, but not predictably across people, tasks, and repositories.' },
  { icon: Gauge, title: 'You cannot see improvement', description: 'Output gets faster, but you cannot measure reliability, diagnose failures, or prove the agent is getting better.' },
];

export function BenefitsSection() {
  return <section id="outcomes" className="bg-[#f3f5f1] py-24 lg:py-32"><div className="container mx-auto px-4"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20"><div><p className="eyebrow">Sound familiar?</p><h2 className="mt-5 text-4xl font-semibold tracking-[-0.035em] text-slate-950 md:text-5xl">AI is producing more code—and creating more work for you to review.</h2><p className="mt-6 text-lg leading-8 text-slate-600">The model is not the missing piece. You need the engineering system around it: context it can use, checks it cannot talk its way around, and a harness that makes the whole workflow repeatable.</p><div className="mt-9 flex items-center gap-3 text-sm font-bold text-emerald-800"><ArrowDownRight className="h-5 w-5" /> This course helps you build that system</div></div><div className="grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2">{outcomes.map(({ icon: Icon, title, description }, index) => <article key={title} className="bg-white p-7 lg:p-9"><div className="flex items-center justify-between"><Icon className="h-6 w-6 text-emerald-700" /><span className="font-mono text-xs text-slate-400">0{index + 1}</span></div><h3 className="mt-10 text-xl font-bold text-slate-950">{title}</h3><p className="mt-3 leading-7 text-slate-600">{description}</p></article>)}</div></div></div></section>;
}
