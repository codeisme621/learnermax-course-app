import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fieldClass, labelClass } from './styles';

export function NewPasswordFields() {
  return (
    <>
      <div className="space-y-2">
        <Label className={labelClass} htmlFor="password">New password</Label>
        <Input className={fieldClass} id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <p className="text-xs text-slate-600">At least 8 characters.</p>
      </div>
      <div className="space-y-2">
        <Label className={labelClass} htmlFor="confirmPassword">Confirm password</Label>
        <Input className={fieldClass} id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
      </div>
    </>
  );
}
