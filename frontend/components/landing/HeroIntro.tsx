import { Quote } from 'lucide-react';

const credentials = [
  ['15 years', 'building and shipping software'],
  ['Many teams', 'across companies, stacks, and codebases'],
  ['Now', 'leading engineers into agentic development'],
];

// Temporary stand-in for the hero sales video (see HeroSection).
export function HeroIntro() {
  return (
    <div className="relative mx-auto w-full max-w-4xl">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-emerald-300/20 to-cyan-300/5 blur-2xl" />
      <div className="relative grid overflow-hidden rounded-2xl border border-white/10 bg-[#0b1714] text-left shadow-2xl md:grid-cols-[1.35fr_.65fr]">
        <div className="p-8 md:p-10">
          <Quote className="h-6 w-6 text-emerald-300" />
          <p className="mt-5 text-lg leading-8 text-slate-200 md:text-xl md:leading-9">
            I&apos;ve spent 15 years as a software engineer, and the last stretch leading teams through the move to coding agents. The tools change every month. What separates the teams that ship from the teams that babysit their agents hasn&apos;t: they give the agent the right context, they verify its work, and they turn what works into a harness.
          </p>
          <p className="mt-5 leading-7 text-slate-400">This course is that system, taught the way I wish someone had taught me.</p>
          <p className="mt-6 font-mono text-xs font-bold uppercase tracking-[.2em] text-emerald-300">Rico Romero · Instructor</p>
        </div>
        <dl className="flex flex-col divide-y divide-white/10 border-t border-white/10 md:border-l md:border-t-0">
          {credentials.map(([value, label]) => (
            <div key={value} className="flex flex-1 flex-col justify-center px-8 py-6">
              <dt className="text-2xl font-semibold tracking-tight text-white">{value}</dt>
              <dd className="mt-1 text-sm leading-6 text-slate-400">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
