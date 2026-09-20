import Image from 'next/image';
import { Check, Code2, GraduationCap, MessagesSquare } from 'lucide-react';
import type { CourseData } from '@/types/landing';

interface CourseMetadataSectionProps { course: CourseData; }

const modules = [
  ['01', 'How agents actually work', 'Models, loops, tools, state, and the limits behind the magic.'],
  ['02', 'Context engineering', 'Shape the working set an agent needs to make strong decisions.'],
  ['03', 'Retrieval & agentic search', 'Find the right knowledge without flooding the context window.'],
  ['04', 'Agent capabilities', 'Design tools and primitives that make useful action possible.'],
  ['05', 'Evals & verification', 'Turn desired behavior into checks you can run and trust.'],
  ['06', 'Goal-driven development', 'Translate product intent into executable engineering direction.'],
  ['07', 'SDD + TDD for agents', 'Use specs and tests as control surfaces—not paperwork.'],
  ['08', 'Harness engineering', 'Build the orchestration layer around models, tools, and feedback.'],
  ['09', 'Agent legibility', 'Make plans, decisions, and failures visible to humans.'],
  ['10', 'Environment engineering', 'Create safe, useful environments where agents can operate.'],
  ['11', 'Autonomous coding agents', 'Run longer, headless workflows without losing control.'],
  ['12', 'Operating autonomous engineering', 'Measure, debug, and improve the system over time.'],
];

export function CourseMetadataSection({ course }: CourseMetadataSectionProps) {
  return (
    <section id="curriculum" className="bg-white py-24 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center"><p className="eyebrow">The curriculum</p><h2 className="mt-5 text-4xl font-semibold tracking-[-0.035em] text-slate-950 md:text-5xl">Learn the whole system, then build one.</h2><p className="mt-6 text-lg leading-8 text-slate-600">A practical progression from agent fundamentals to a production-minded autonomous coding workflow.</p></div>
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map(([number, title, description]) => <article key={number} className="group rounded-2xl border border-slate-200 p-6 transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-950/5"><div className="font-mono text-xs font-bold text-emerald-700">MODULE {number}</div><h3 className="mt-5 text-lg font-bold text-slate-950">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{description}</p></article>)}
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl bg-[#07110f] p-7 text-white md:p-10"><div className="grid items-center gap-8 lg:grid-cols-[1.2fr_.8fr]"><div><div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-emerald-300"><Code2 className="h-4 w-4" /> Capstone project</div><h3 className="mt-4 text-3xl font-semibold tracking-tight">Build an autonomous coding system from goal to verified PR.</h3><p className="mt-4 max-w-2xl leading-7 text-slate-300">Apply the full pattern to a real repository: context, tools, evals, harness, environment, observability, and the improvement loop.</p></div><ul className="space-y-3 text-sm text-slate-300">{['A working end-to-end system', 'A reusable pattern for future repositories', 'Evidence you can show your team or network'].map(item => <li key={item} className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />{item}</li>)}</ul></div></div>
        <div id="support" className="mt-20 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl bg-[#f3f5f1] p-8 md:p-10"><MessagesSquare className="h-7 w-7 text-emerald-700" /><p className="eyebrow mt-8">You are not doing this alone</p><h3 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">When your agent gets stuck, you have someone to ask.</h3><p className="mt-5 leading-7 text-slate-600">Bring your questions, your repository, and the failures you cannot explain. In weekly live office hours, Rico will help you reason through the problem and get your system moving again.</p></div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#07110f] text-white">
            <div className="grid min-h-full sm:grid-cols-[.72fr_1.28fr]">
              <div className="relative min-h-80 overflow-hidden bg-emerald-950 sm:min-h-full">
                <Image
                  src="/images/rico-romero-instructor.webp"
                  alt="Rico Romero, course instructor"
                  fill
                  sizes="(min-width: 1024px) 24vw, (min-width: 640px) 36vw, 100vw"
                  className="object-cover object-[center_28%]"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#07110f]/50 to-transparent" />
              </div>
              <div className="p-8 md:p-10"><GraduationCap className="h-7 w-7 text-emerald-300" /><p className="mt-7 font-mono text-xs font-bold uppercase tracking-[.2em] text-emerald-300">Learn from someone building this for real</p><h3 className="mt-4 text-3xl font-semibold tracking-tight">{course.instructor.name}</h3><p className="mt-2 font-semibold text-emerald-200">Senior Tech Lead at Capital One</p><p className="mt-5 text-sm leading-7 text-slate-300">Rico has taught thousands of engineers inside Capital One and beyond. He led the team behind <a href="https://github.com/capitalone/context-specs" target="_blank" rel="noopener noreferrer" className="font-semibold text-white underline decoration-emerald-300 underline-offset-4">context-specs</a>, Capital One&apos;s first open-source agent harness—a workflow that takes engineering intent through implementation and verification to a pull request.</p><p className="mt-4 text-sm leading-7 text-slate-300">Mastering, teaching, and applying these systems helped Rico earn a promotion, professional recognition, and opportunities to lead teams through the transition to agentic development.</p><p className="mt-5 text-xs leading-5 text-slate-500">Capital One is Rico&apos;s employer and is not affiliated with or an endorser of this independent course.</p></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
