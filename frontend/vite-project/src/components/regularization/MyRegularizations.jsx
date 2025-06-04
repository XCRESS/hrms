import React, { useEffect, useState } from "react";
import apiClient from "../../service/apiClient";
import RegularizationModal from "../dashboard/RegularizationModal";

export default function MyRegularizations() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getMyRegularizations();
      setRequests(res.regs || []);
    } catch (err) {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  return (
    <div className="max-w-3xl mx-auto mt-10 bg-white dark:bg-slate-800 rounded-xl shadow-xl p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">My Regularization Requests</h2>
        <button className="px-4 py-2 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700" onClick={() => setShowModal(true)}>+ New Request</button>
      </div>
      {loading ? <div className="text-center text-gray-500 dark:text-slate-400">Loading...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cyan-50 dark:bg-slate-700 text-cyan-700 dark:text-cyan-300">
                <th className="p-2">Date</th>
                <th className="p-2">Check In</th>
                <th className="p-2">Check Out</th>
                <th className="p-2">Reason</th>
                <th className="p-2">Status</th>
                <th className="p-2">Review Comment</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? <tr><td colSpan={6} className="text-center py-6 text-gray-400">No requests found</td></tr> :
                requests.map(r => (
                  <tr key={r._id} className="border-b border-gray-100 dark:border-slate-700/70">
                    <td className="p-2">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="p-2">{r.requestedCheckIn ? new Date(r.requestedCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</td>
                    <td className="p-2">{r.requestedCheckOut ? new Date(r.requestedCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</td>
                    <td className="p-2">{r.reason}</td>
                    <td className="p-2 font-semibold">
                      {r.status === "pending" && <span className="text-amber-600 dark:text-amber-400">Pending</span>}
                      {r.status === "approved" && <span className="text-green-600 dark:text-green-400">Approved</span>}
                      {r.status === "rejected" && <span className="text-red-600 dark:text-red-400">Rejected</span>}
                    </td>
                    <td className="p-2">{r.reviewComment || "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      <RegularizationModal isOpen={showModal} onClose={() => setShowModal(false)} onSuccess={fetchRequests} />
    </div>
  );
} 