import { AlertTriangle, Calendar, X } from 'lucide-react';

interface WarningData {
  reason: string;
  dayName?: string;
  holidayTitle?: string;
  holidayType?: string;
  message: string;
}

interface NonWorkingDayWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  warningData: WarningData | null | undefined;
}

const NonWorkingDayWarningModal = ({ isOpen, onClose, onConfirm, warningData }: NonWorkingDayWarningModalProps) => {
  if (!isOpen || !warningData) return null;

  const { reason, dayName, holidayTitle, holidayType, message } = warningData;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 dark:bg-amber-900/30 p-2.5 rounded-xl">
              <AlertTriangle className="text-amber-600 dark:text-amber-400" size={24} />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Non-Working Day
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning Message */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Calendar className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                  {message}
                </p>
                {reason === 'holiday' && holidayTitle && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Holiday: <span className="font-semibold">{holidayTitle}</span>
                    {holidayType === 'optional' && ' (Optional)'}
                  </p>
                )}
                {reason === 'weekend' && dayName && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Day: <span className="font-semibold">{dayName}</span>
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
      </div>
    </div>
  );
};

export default NonWorkingDayWarningModal;
