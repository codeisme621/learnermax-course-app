import { ArrowRight, Clock3 } from 'lucide-react';

const buzzwords = ['Loop engineering', 'Graph engineering', 'Ralph loops', 'Multi-agent orchestration', 'Harness engineering'];

export function StorySection() {
  return (
    <section className="overflow-hidden bg-white py-24 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="grid items-start gap-14 lg:grid-cols-[.9fr_1.1fr] lg:gap-24">
          <div className="lg:sticky lg:top-28">
            <p className="eyebrow">Does this feel familiar?</p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.035em] text-slate-950 md:text-5xl">
              Agentic coding feels like a new language every week.
            </h2>
            <div className="mt-8 flex flex-wrap gap-2">
              {buzzwords.map(word => <span key={word} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 font-mono text-xs text-slate-500">{word}</span>)}
            </div>
            <p className="mt-8 text-lg leading-8 text-slate-600">
              Every new term arrives with the same warning: learn this now or get left behind. Even experienced engineers can feel as if they are permanently catching up.
            </p>
          </div>

          <div className="relative rounded-3xl bg-[#f3f5f1] p-8 md:p-12">
            <div className="absolute -left-3 top-12 h-16 w-1 rounded-full bg-emerald-400" />
            <p className="text-2xl font-semibold leading-10 tracking-tight text-slate-950 md:text-3xl">
              “I was frustrated too. I did not want another list of prompting tricks that would be outdated in six months. I wanted to understand the engineering principles underneath all of it.”
            </p>
            <div className="mt-10 flex gap-4 border-t border-slate-300 pt-8">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#07110f] text-emerald-300"><Clock3 className="h-5 w-5" /></div>
              <div><div className="font-bold text-slate-950">More than 1,000 hours later</div><p className="mt-1 leading-7 text-slate-600">After studying, building, testing, and teaching agentic systems, Rico distilled the durable patterns into one practical path.</p></div>
            </div>
            <div className="mt-8 rounded-2xl bg-[#07110f] p-6 text-white">
              <p className="text-sm leading-7 text-slate-300">The tools will keep changing. You will leave understanding the system: how an agent gets context, takes action, proves its work, and improves over time.</p>
              <a href="#curriculum" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-300">See the learning path <ArrowRight className="h-4 w-4" /></a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
