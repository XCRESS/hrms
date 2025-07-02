import React, { useState, useEffect } from "react";
import apiClient from "../../service/apiClient";
import * as dateFnsTz from 'date-fns-tz';

export default function RegularizationModal({ isOpen, onClose, onSuccess, prefillData = null }) {
  const [date, setDate] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Effect to handle prefilled data
  useEffect(() => {
    if (prefillData && isOpen) {
      // Set date
      if (prefillData.date) {
        const dateStr = new Date(prefillData.date).toISOString().slice(0, 10);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const timeZone = "Asia/Kolkata";

      const checkInDateTimeString = checkIn ? `${date}T${checkIn}:00` : undefined;
      const checkOutDateTimeString = checkOut ? `${date}T${checkOut}:00` : undefined;

      const requestedCheckIn = checkInDateTimeString ? dateFnsTz.fromZonedTime(checkInDateTimeString, timeZone).toISOString() : undefined;
      const requestedCheckOut = checkOutDateTimeString ? dateFnsTz.fromZonedTime(checkOutDateTimeString, timeZone).toISOString() : undefined;

      await apiClient.requestRegularization({
        date,
        requestedCheckIn,
        requestedCheckOut,
        reason
      });
      setMessage("Request submitted!");
      setTimeout(() => {
        setMessage(null);
        onSuccess && onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      if (err instanceof RangeError && err.message.includes("Invalid time value")) {
        setMessage(`Invalid date or time input. Please check your entries. Error: ${err.message}`);
      } else {
        setMessage(err?.message || "Failed to submit request");
      }
      console.error("Regularization submit error:", err);
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
          {message && <p className={`text-sm ${message.startsWith("Invalid") ? 'text-red-500' : 'text-green-500'}`}>{message}</p>}
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-700" disabled={loading}>{loading ? "Submitting..." : "Submit"}</button>
          </div>
        </form>
      </div>
    </div>
  );
} 