const faqs = [
  ['When can I start?', 'Immediately. You get course access as soon as you enroll and work through it online at your own pace.'],
  ['Who is this for?', 'Engineers, tech leads, engineering managers, and technical founders who already use AI coding tools and want a more reliable, production-minded system.'],
  ['Do I need to be an AI or ML engineer?', 'No. The focus is software engineering around coding agents—not training foundation models. You should be comfortable reading code and working in a repository.'],
  ['What will I finish with?', 'A working capstone that takes an engineering goal through an agentic workflow to a verified pull request, plus a reusable pattern you can carry into other repositories.'],
  // TODO: Office hours and cohort hidden for now; restore the 'What happens in office hours?' FAQ and the cohort line in 'When can I start?'.
  ['Is there a guarantee?', 'Yes. If the course is not the right fit, contact us within 30 days of purchase for a refund.'],
];

export function FaqSection() { return <section id="faq" className="bg-white py-24 lg:py-32"><div className="container mx-auto max-w-5xl px-4"><div className="grid gap-12 lg:grid-cols-[.55fr_1fr]"><div><p className="eyebrow">Questions</p><h2 className="mt-5 text-4xl font-semibold tracking-[-.035em] text-slate-950">Before you enroll.</h2></div><div className="divide-y divide-slate-200 border-y border-slate-200">{faqs.map(([question, answer]) => <details key={question} className="group py-6"><summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-bold text-slate-950"><span>{question}</span><span className="text-2xl font-light text-emerald-700 transition group-open:rotate-45">+</span></summary><p className="max-w-2xl pt-4 leading-7 text-slate-600">{answer}</p></details>)}</div></div></div></section>; }
