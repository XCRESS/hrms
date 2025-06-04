import React, { useState } from "react";
import apiClient from "../../service/apiClient";

export default function RegularizationModal({ isOpen, onClose, onSuccess }) {
  const [date, setDate] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiClient.requestRegularization({
        date,
        requestedCheckIn: checkIn ? `${date}T${checkIn}` : undefined,
        requestedCheckOut: checkOut ? `${date}T${checkOut}` : undefined,
        reason
      });
      setMessage("Request submitted!");
      setTimeout(() => {
        setMessage(null);
        onSuccess && onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      setMessage(err?.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-cyan-700 dark:text-cyan-300">Regularize Attendance</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-semibold mb-1">Date</label>
            <input type="date" className="w-full p-2 border rounded-lg" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block font-semibold mb-1">Check In (optional)</label>
              <input type="time" className="w-full p-2 border rounded-lg" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="block font-semibold mb-1">Check Out (optional)</label>
              <input type="time" className="w-full p-2 border rounded-lg" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Reason</label>
            <textarea className="w-full p-2 border rounded-lg" value={reason} onChange={e => setReason(e.target.value)} required rows={3} />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-700" disabled={loading}>{loading ? "Submitting..." : "Submit"}</button>
          </div>
          {message && <div className={`mt-2 text-center ${message.startsWith("Request submitted") ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{message}</div>}
        </form>
      </div>
    </div>
  );
} 