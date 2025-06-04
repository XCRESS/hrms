import React, { useEffect, useState } from "react";
import apiClient from "../../service/apiClient";

export default function RegularizationAll() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [reviewComment, setReviewComment] = useState("");
  const [actionStatus, setActionStatus] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getAllRegularizations();
      setRequests(res.regs || []);
    } catch (err) {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleReview = async (id, status) => {
    setActionId(id);
    setActionStatus(status);
    try {
      await apiClient.reviewRegularization(id, status, reviewComment);
      setReviewComment("");
      fetchRequests();
    } catch (err) {
      // Optionally show error
    } finally {
      setActionId(null);
      setActionStatus(null);
    }
  };

  const handleStartReview = (id, existingComment = "") => {
    setActionId(id);
    setReviewComment(existingComment);
    setActionStatus(null);
  };

  const handleCancelReview = () => {
    setActionId(null);
    setReviewComment("");
    setActionStatus(null);
  };

  return (
    <div className="max-w-5xl mx-auto mt-10 bg-white dark:bg-slate-800 rounded-xl shadow-xl p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">Attendance Regularization Requests</h2>
        <button className="px-4 py-2 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700" onClick={fetchRequests} disabled={loading}>Refresh</button>
      </div>
      {loading ? <div className="text-center text-gray-500 dark:text-slate-400">Loading...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cyan-50 dark:bg-slate-700 text-cyan-700 dark:text-cyan-300">
                <th className="p-2">Employee</th>
                <th className="p-2">Email</th>
                <th className="p-2">Date</th>
                <th className="p-2">Check In</th>
                <th className="p-2">Check Out</th>
                <th className="p-2">Reason</th>
                <th className="p-2">Status</th>
                <th className="p-2">Review Comment</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? <tr><td colSpan={9} className="text-center py-6 text-gray-400">No requests found</td></tr> :
                requests.map(r => (
                  <tr key={r._id} className="border-b border-gray-100 dark:border-slate-700/70">
                    <td className="p-2">{r.user?.name || "-"}</td>
                    <td className="p-2">{r.user?.email || "-"}</td>
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
                    <td className="p-2">
                      {r.status === "pending" ? (
                        actionId === r._id ? (
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              className="w-full p-1 border rounded mb-1"
                              placeholder="Comment (optional)"
                              value={reviewComment}
                              onChange={e => setReviewComment(e.target.value)}
                              disabled={actionStatus === "approved" || actionStatus === "rejected"}
                            />
                            <div className="flex gap-1">
                              <button
                                className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                                disabled={actionStatus === "approved"}
                                onClick={() => handleReview(r._id, "approved")}
                              >Approve</button>
                              <button
                                className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                                disabled={actionStatus === "rejected"}
                                onClick={() => handleReview(r._id, "rejected")}
                              >Reject</button>
                              <button
                                className="px-2 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 text-xs"
                                onClick={handleCancelReview}
                              >Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="px-2 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700 text-xs"
                            onClick={() => handleStartReview(r._id, r.reviewComment)}
                          >Review</button>
                        )
                      ) : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 