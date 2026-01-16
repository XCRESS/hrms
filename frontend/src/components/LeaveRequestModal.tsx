import { useState, FormEvent, ChangeEvent } from "react";
import { X, ChevronDown } from "lucide-react";
import type { LeaveType } from "@/types";

interface LeaveRequestData {
  leaveType: LeaveType;
  date: string;
  reason: string;
}

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LeaveRequestData) => void;
  isLoading: boolean;
}

const LeaveRequestModal = ({ isOpen, onClose, onSubmit, isLoading }: LeaveRequestModalProps) => {
  const [leaveType, setLeaveType] = useState<LeaveType>("full-day");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({ leaveType, date, reason });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-6 md:p-8 transform transition-all duration-300 ease-out scale-95 animate-modal-pop-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-slate-100">Request Leave</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="leaveType" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Leave Type</label>
            <div className="relative">
              <select
                id="leaveType"
                value={leaveType}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setLeaveType(e.target.value as LeaveType)}
                className="w-full appearance-none bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block p-2.5 pr-8"
              >
                <option value="full-day">Full Day</option>
                <option value="half-day">Half Day</option>
              </select>
              <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Date</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block p-2.5"
              required
            />
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Reason <span className="text-gray-400 font-normal">(min 10 characters)</span></label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
              placeholder="Provide a brief reason for your leave..."
              rows={4}
              className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block p-2.5"
              required
              minLength={10}
              maxLength={500}
              data-gramm="false"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{reason.length}/500</p>
          </div>

          <div className="flex justify-end items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700/80 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600/80 focus:ring-4 focus:outline-none focus:ring-gray-200 dark:focus:ring-slate-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:ring-4 focus:outline-none focus:ring-cyan-300 dark:bg-cyan-500 dark:hover:bg-cyan-600 dark:focus:ring-cyan-700 rounded-lg transition-colors disabled:opacity-70"
            >
              {isLoading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveRequestModal;
