import { ArrowRight, Clock3 } from 'lucide-react';

const buzzwords = ['Loop engineering', 'Graph engineering', 'Ralph loops', 'Multi-agent orchestration', 'Harness engineering'];

const durablePrinciples = [
  ['Context', 'Give the agent what it needs—without flooding it'],
  ['Verification', 'Know the work is right before you trust it'],
  ['Harnesses', 'Turn good results into a repeatable system'],
];

export function StorySection() {
  return (
    <section className="overflow-hidden bg-white py-24 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="grid items-start gap-14 lg:grid-cols-[.9fr_1.1fr] lg:gap-24">
          <div className="lg:sticky lg:top-28">
            <p className="eyebrow">Does this feel familiar?</p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.035em] text-slate-950 md:text-5xl">
              The buzzwords are annoying. <span className="text-emerald-700">The middleman feeling is worse.</span>
            </h2>
            <div className="mt-8 flex flex-wrap gap-2">
              {buzzwords.map(word => <span key={word} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 font-mono text-xs text-slate-500">{word}</span>)}
            </div>
            <p className="mt-8 text-lg leading-8 text-slate-600">
              Every new term arrives with the same warning: learn this now or get left behind. But the harder question is quieter: when the agent writes the code, are you still the engineer, or just the person reviewing whatever it produces?
            </p>
          </div>

          <div className="relative rounded-3xl bg-[#f3f5f1] p-8 md:p-12">
            <div className="absolute -left-3 top-12 h-16 w-1 rounded-full bg-emerald-400" />
            <p className="text-2xl font-semibold leading-10 tracking-tight text-slate-950 md:text-3xl">
              “When coding agents first took off, I tried every announcement. The agents were writing more code than ever, and I was spending my days re-prompting them and cleaning up what they missed. I wasn&apos;t getting better at building with agents. I was getting better at following announcements.”
            </p>
            <div className="mt-10 flex gap-4 border-t border-slate-300 pt-8">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#07110f] text-emerald-300"><Clock3 className="h-5 w-5" /></div>
              <div><div className="font-bold text-slate-950">More than 1,000 hours later</div><p className="mt-1 leading-7 text-slate-600">Rico took every technique apart and found they all solve the same three problems: context, verification, and the harness. Once his agents&apos; work came with proof, his team trusted it, other teams asked how, and he earned a promotion leading the shift instead of chasing it.</p></div>
            </div>
            <div className="mt-8 overflow-hidden rounded-2xl bg-[#07110f] text-white">
              <div className="border-b border-white/10 px-6 py-4 text-sm font-semibold">What still matters when the tools change</div>
              <div className="space-y-3 p-6 text-sm">
                {durablePrinciples.map(([principle, outcome]) => <div key={principle} className="rounded-xl border border-white/5 bg-white/[.025] p-4"><div className="font-mono text-xs uppercase tracking-widest text-emerald-300">{principle}</div><div className="mt-2 font-semibold text-slate-200">{outcome}</div></div>)}
                <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/5 px-4 py-3 font-mono text-emerald-200">goal → working change → verified PR</div>
              </div>
              <div className="border-t border-white/10 px-6 py-5">
                <p className="text-sm leading-7 text-slate-300">Whoever makes agents trustworthy becomes the person the team follows.</p>
                <a href="#curriculum" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-emerald-300">See the learning path <ArrowRight className="h-4 w-4" /></a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
