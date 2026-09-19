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
          <div className="rounded-2xl bg-[#f3f5f1] p-8 md:p-10"><MessagesSquare className="h-7 w-7 text-emerald-700" /><p className="eyebrow mt-8">You are not doing this alone</p><h3 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">Get unstuck with a pro in the room.</h3><p className="mt-5 leading-7 text-slate-600">Bring your questions, your code, and the places where the system breaks down. Weekly live office hours give you direct access to experienced guidance while you work through the course.</p></div>
          <div className="rounded-2xl border border-slate-200 p-8 md:p-10"><GraduationCap className="h-7 w-7 text-emerald-700" /><p className="eyebrow mt-8">Your instructor</p><h3 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{course.instructor.name}</h3><p className="mt-2 font-semibold text-emerald-800">Software engineer, system builder, and educator</p><p className="mt-5 leading-7 text-slate-600">Rico teaches the engineering patterns behind effective AI-native development: the practical constraints, feedback loops, and system design that turn impressive demos into dependable workflows.</p></div>
        </div>
      </div>
    </section>
  );
}
