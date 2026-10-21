import { Button } from '@/components/ui/button';
import { primaryActionClass } from '@/components/auth/styles';

// Temporary stand-in for the Stripe checkout while the landing page advertises $39.
// The real checkout (and the $399 Stripe Price) is unchanged; see CHECKOUT_ENABLED in app/checkout/page.tsx.
export function CheckoutPlaceholder() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
        <div>
          <p className="font-semibold text-slate-900">Agentic Coding</p>
          <p className="mt-0.5 text-xs text-slate-600">One-time payment · 30-day refund guarantee</p>
        </div>
        <p className="text-3xl font-bold tracking-tight text-slate-900">$39</p>
      </div>
      <ul className="space-y-2 text-sm text-slate-600">
        <li>Immediate access to the current course</li>
        <li>Self-paced online lessons</li>
        <li>Founding pricing</li>
      </ul>
      <Button type="button" className={primaryActionClass}>
        Continue to payment
      </Button>
    </div>
  );
}
