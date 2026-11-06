import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  label: string;
  confirmLabel: string;
  warning: string;
  requireSecondPress: boolean;
  disabled?: boolean;
  pending?: boolean;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
}

/** One press normally; two presses ("Yes, …") for bulk or irreversible actions. */
export function ConfirmBulk({ label, confirmLabel, warning, requireSecondPress, disabled, pending, variant = 'default', onConfirm }: Props) {
  const [armed, setArmed] = useState(false);

  if (armed) {
    return (
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirm action">
        <span className="text-xs text-muted-foreground">{warning}</span>
        <Button size="sm" variant={variant} disabled={pending} onClick={onConfirm} autoFocus>
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          {confirmLabel}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setArmed(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" variant={variant} disabled={disabled || pending} onClick={() => (requireSecondPress ? setArmed(true) : onConfirm())}>
      {pending && <Loader2 className="size-3.5 animate-spin" />}
      {label}
    </Button>
  );
}
