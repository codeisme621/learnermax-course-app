import { Check, X } from 'lucide-react';

const camps = [
  { name: 'Vibe coding', rows: ['Chase every new term', 'Hope the agent got it right', 'Review whatever it produces'], lead: false },
  { name: 'Agentic engineering', rows: ['Understand what’s underneath', 'Prove it with evidence', 'Lead the team’s system'], lead: true },
];

export function TwoCampsSection() {
  return (
    <section aria-label="Two paths" className="bg-white py-20">
      <div className="container mx-auto max-w-5xl px-4">
        <div className="grid gap-6 md:grid-cols-2">
          {camps.map(({ name, rows, lead }) => (
            <div key={name} className={lead ? 'rounded-2xl border border-emerald-300 bg-emerald-50 p-8 shadow-xl shadow-emerald-950/5' : 'rounded-2xl border border-slate-200 bg-slate-50 p-8'}>
              <p className={lead ? 'font-mono text-xs font-bold uppercase tracking-[.2em] text-emerald-800' : 'font-mono text-xs font-bold uppercase tracking-[.2em] text-slate-400'}>{name}</p>
              <ul className="mt-6 space-y-4">
                {rows.map(row => (
                  <li key={row} className={lead ? 'flex items-center gap-3 text-lg font-semibold text-slate-950' : 'flex items-center gap-3 text-lg text-slate-500'}>
                    {lead ? <Check className="h-5 w-5 shrink-0 text-emerald-700" /> : <X className="h-5 w-5 shrink-0 text-slate-400" />}
                    {row}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
