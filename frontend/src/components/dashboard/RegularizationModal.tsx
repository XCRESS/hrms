import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { X, Clock } from "lucide-react";
import { useRequestRegularization } from "@/hooks/queries";
import * as dateFnsTz from 'date-fns-tz';

interface PrefillData {
  date?: string | Date;
  checkIn?: string | Date;
  suggestedCheckOut?: string | Date;
}

interface RegularizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  prefillData?: PrefillData | null;
}

export default function RegularizationModal({ isOpen, onClose, onSuccess, prefillData = null }: RegularizationModalProps) {
  const [date, setDate] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const regularizationMutation = useRequestRegularization();

  // Effect to handle prefilled data
  useEffect(() => {
    if (prefillData && isOpen) {
      // Set date (fix UTC/IST conversion issue)
      if (prefillData.date) {
        const date = new Date(prefillData.date);
        // Use local date formatting to avoid UTC conversion issues
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        setDate(dateStr);
      }

      // Set check-in time
      if (prefillData.checkIn) {
        const checkInTime = new Date(prefillData.checkIn).toTimeString().slice(0, 5);
        setCheckIn(checkInTime);
      }

      // Set suggested check-out time
      if (prefillData.suggestedCheckOut) {
        const checkOutTime = new Date(prefillData.suggestedCheckOut).toTimeString().slice(0, 5);
        setCheckOut(checkOutTime);
      }

      // Set a default reason for missing checkout
      setReason("Forgot to check out on this day. Please regularize my attendance record.");
    }
  }, [prefillData, isOpen]);

  // Reset form when modal closes or opens without prefill data
  useEffect(() => {
    if (!isOpen) {
      setDate("");
      setCheckIn("");
      setCheckOut("");
      setReason("");
      setMessage(null);
    } else if (isOpen && !prefillData) {
      // Set default times when opening modal without prefill data
      setCheckIn("09:30");
      setCheckOut("17:30");
    }
  }, [isOpen, prefillData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);

    try {
      const timeZone = "Asia/Kolkata";

      const checkInDateTimeString = checkIn ? `${date}T${checkIn}:00` : undefined;
      const checkOutDateTimeString = checkOut ? `${date}T${checkOut}:00` : undefined;

      const requestedCheckIn = checkInDateTimeString ? dateFnsTz.fromZonedTime(checkInDateTimeString, timeZone).toISOString() : undefined;
      const requestedCheckOut = checkOutDateTimeString ? dateFnsTz.fromZonedTime(checkOutDateTimeString, timeZone).toISOString() : undefined;

      regularizationMutation.mutate(
        {
          date,
          requestedCheckIn,
          requestedCheckOut,
          reason
        },
        {
          onSuccess: () => {
            setMessage("Request submitted!");
            setTimeout(() => {
              setMessage(null);
              onSuccess && onSuccess();
              onClose();
            }, 1200);
          },
          onError: (err: Error) => {
            if (err instanceof RangeError && err.message.includes("Invalid time value")) {
              setMessage(`Invalid date or time input. Please check your entries. Error: ${err.message}`);
            } else {
              setMessage(err?.message || "Failed to submit request");
            }
            console.error("Regularization submit error:", err);
          }
        }
      );
    } catch (err) {
      // Handle synchronous errors (e.g., from date parsing)
      if (err instanceof RangeError && err.message.includes("Invalid time value")) {
        setMessage(`Invalid date or time input. Please check your entries. Error: ${err.message}`);
      } else if (err instanceof Error) {
        setMessage(err?.message || "Failed to submit request");
      } else {
        setMessage("Failed to submit request");
      }
      console.error("Regularization submit error:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-card rounded-xl shadow-2xl w-full max-w-lg p-6 md:p-8 transform transition-all duration-300 ease-out scale-95 animate-modal-pop-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-foreground">Regularize Attendance</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-red-500 dark:text-muted-foreground dark:hover:text-red-400 transition-colors p-1 rounded-full hover:bg-muted"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-foreground mb-1">
              Attendance Date <span className="text-xs text-muted-foreground">(Date for which you want to regularize attendance)</span>
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
              className="w-full bg-muted border border-border text-foreground text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block p-2.5"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="checkIn" className="block text-sm font-medium text-foreground mb-1">
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  Check In Time (optional)
                </div>
              </label>
              <input
                id="checkIn"
                type="time"
                value={checkIn}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setCheckIn(e.target.value)}
                className="w-full bg-muted border border-border text-foreground text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block p-2.5"
              />
            </div>

            <div>
              <label htmlFor="checkOut" className="block text-sm font-medium text-foreground mb-1">
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  Check Out Time (optional)
                </div>
              </label>
              <input
                id="checkOut"
                type="time"
                value={checkOut}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setCheckOut(e.target.value)}
                className="w-full bg-muted border border-border text-foreground text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block p-2.5"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-foreground mb-1">Reason for Regularization</label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
              placeholder="Please provide a detailed reason for this attendance regularization request..."
              rows={4}
              className="w-full bg-muted border border-border text-foreground text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block p-2.5"
              required
              data-gramm="false"
            />
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.startsWith("Invalid") || message.includes("Failed")
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
            }`}>
              {message}
            </div>
          )}

          <div className="flex justify-end items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={regularizationMutation.isPending}
              className="px-5 py-2.5 text-sm font-medium text-foreground bg-white dark:bg-card 80 border border-border rounded-lg hover:bg-muted dark:hover:bg-slate-600/80 focus:ring-4 focus:outline-none focus:ring-gray-200 dark:focus:ring-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={regularizationMutation.isPending}
              className="px-5 py-2.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:ring-4 focus:outline-none focus:ring-cyan-300 dark:bg-cyan-500 dark:hover:bg-cyan-600 dark:focus:ring-cyan-700 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {regularizationMutation.isPending ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
