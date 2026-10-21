import { Infinity, MonitorPlay, Trophy } from 'lucide-react';

const items = [
  { icon: Infinity, label: 'Start now', detail: 'Immediate, ongoing access' },
  // TODO: Cohort hidden for now; restore { icon: CalendarDays, label: '8-week cohort', detail: 'A guided path to completion' }.
  { icon: MonitorPlay, label: 'Online course', detail: 'Learn at your own pace' },
  // TODO: Office hours hidden for now; restore { icon: MessagesSquare, label: 'Weekly office hours', detail: 'Expert help when you get stuck' } (and lg:grid-cols-4).
  { icon: Trophy, label: 'Certificate', detail: 'Share your achievement' },
];

export function TrustIndicators() {
  return <section aria-label="Course format" className="border-y border-slate-200 bg-white"><div className="container mx-auto grid px-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(({ icon: Icon, label, detail }) => <div key={label} className="flex items-center gap-4 border-slate-200 px-5 py-7 lg:border-r lg:last:border-r-0"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Icon className="h-5 w-5" /></div><div><div className="font-bold text-slate-950">{label}</div><div className="mt-0.5 text-sm text-slate-500">{detail}</div></div></div>)}</div></section>;
}
