const steps = [
  ['Agent does the creative work', 'The coding agent plans and implements, then claims it is done.'],
  ['Deterministic checks decide', 'Lint and end-to-end tests decide whether "done" is actually true.'],
  ['Failure becomes a prompt', 'The failure comes back as instructions written for the next agent.'],
  ['A fresh agent fixes it', 'A new session starts with clean context and only what it needs.'],
  ['Hard cap on attempts', 'The loop stops after a set number of tries, so it can never spin forever.'],
];

export function ProofLoopSection() {
  return (
    <section id="proof-loop" className="relative overflow-hidden bg-[#07110f] py-24 text-white lg:py-32">
      <div className="agentic-grid absolute inset-0 opacity-25" />
      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-emerald-300">The Proof Loop</p>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.035em] md:text-5xl">Agents should be creative. <span className="text-emerald-300">Verification should be deterministic.</span></h2>
          <p className="mt-6 text-lg leading-8 text-slate-300">This isn&apos;t a prompting trick. It&apos;s the mechanism that makes agent work trustworthy, and you build it into your capstone.</p>
        </div>
        <div className="mt-14 grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
          <ol className="space-y-3">
            {steps.map(([title, description], index) => (
              <li key={title} className="flex gap-4 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-300/50 font-mono text-xs text-emerald-300">{index + 1}</span>
                <div><div className="font-bold">{title}</div><p className="mt-1 text-sm leading-6 text-slate-400">{description}</p></div>
              </li>
            ))}
          </ol>
          <div className="rounded-2xl border border-white/10 bg-[#050c0a] p-6 font-mono text-sm leading-7 text-slate-300">
            <div className="flex justify-between text-xs text-slate-500"><span>harness run</span><span>illustrative example</span></div>
            <div className="mt-4"><span className="text-slate-500">agent</span>  ✅ Implementation complete</div>
            <div className="mt-3"><span className="text-slate-500">lint</span>   <span className="text-emerald-300">✓ passed</span></div>
            <div><span className="text-slate-500">e2e</span>    <span className="text-red-400">✗ scenario: guest checkout with expired coupon</span></div>
            <div className="text-slate-500">expected: coupon rejected · got: 10% off applied</div>
            <div className="mt-4 border-l-[3px] border-lime-200 bg-lime-200/5 px-4 py-3 font-sans text-sm leading-6">
              <div className="font-mono text-xs font-bold text-lime-200">→ NEXT AGENT</div>
              You are not allowed to apply a discount when the coupon is expired. The rule is in spec §2.3. Fix <span className="text-emerald-300">applyDiscount()</span> in cart/pricing.ts. Do not edit the test.
            </div>
            <div className="mt-4 text-slate-500">session 2 · fresh context</div>
            <div><span className="text-slate-500">e2e</span>    <span className="text-emerald-300">✓ all scenarios passed</span></div>
            <div className="mt-3 text-lime-200">attempt 2 of 3 · cap: 3</div>
          </div>
        </div>
      </div>
    </section>
  );
}
