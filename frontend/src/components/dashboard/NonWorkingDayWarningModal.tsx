import { AlertTriangle, Calendar } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface WarningData {
  reason: string;
  dayName?: string;
  saturdayWeek?: number;
  holidayTitle?: string;
  holidayType?: string;
  message: string;
}

const ORDINALS = ['', '1st', '2nd', '3rd', '4th'];

const holidayTypeLabel = (holidayType?: string) => {
  if (holidayType === 'optional') return ' (Optional)';
  if (holidayType === 'restricted') return ' (Restricted)';
  return '';
};

interface NonWorkingDayWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  warningData: WarningData | null | undefined;
}

const NonWorkingDayWarningModal = ({ isOpen, onClose, onConfirm, warningData }: NonWorkingDayWarningModalProps) => {
  if (!warningData) return null;

  const { reason, dayName, saturdayWeek, holidayTitle, holidayType, message } = warningData;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md gap-0 rounded-2xl border-border bg-card p-0">
        {/* Header */}
        <DialogHeader className="flex-row items-center gap-3 space-y-0 p-6 pr-14 border-b border-border text-left">
          <div className="bg-amber-100 dark:bg-amber-900/30 p-2.5 rounded-xl">
            <AlertTriangle className="text-amber-600 dark:text-amber-400" size={24} />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Non-Working Day
          </DialogTitle>
          <DialogDescription className="sr-only">
            You are checking in on a non-working day. Confirm before continuing.
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning Message */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Calendar className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                  {message}
                </p>
                {reason === 'holiday' && holidayTitle && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Holiday: <span className="font-semibold">{holidayTitle}</span>
                    {holidayTypeLabel(holidayType)}
                  </p>
                )}
                {reason === 'weekend' && dayName && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Day: <span className="font-semibold">{dayName}</span>
                  </p>
                )}
                {reason === 'saturday_off' && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Day: <span className="font-semibold">
                      {saturdayWeek ? `${ORDINALS[saturdayWeek]} Saturday` : 'Saturday'}
                    </span> — marked as a non-working Saturday in settings
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Information Box */}
          <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4 border border-border">
            <p className="text-sm text-muted-foreground">
              Some employees work on non-working days, but many check in by mistake.
              Please verify before continuing.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl font-semibold text-foreground bg-muted hover:bg-muted transition-all duration-200 border border-border"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 px-4 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Continue Check-In
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NonWorkingDayWarningModal;
