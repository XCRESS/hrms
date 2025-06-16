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
    <div className="max-w-7xl mx-auto mt-8 p-4 sm:p-6 lg:p-8 bg-white dark:bg-slate-800 rounded-xl shadow-xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-cyan-700 dark:text-cyan-300">Attendance Regularization Requests</h2>
        <button className="px-4 py-2 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors" onClick={fetchRequests} disabled={loading}>Refresh</button>
      </div>
      {loading ? (
        <div className="text-center text-gray-500 dark:text-slate-400 py-8">Loading...</div>
      ) : (
        <div className="w-full">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl">
              <thead>
                <tr className="bg-cyan-50 dark:bg-slate-700 text-cyan-700 dark:text-cyan-300">
                  <th className="p-3 text-left font-semibold">Employee</th>
                  <th className="p-3 text-left font-semibold">Email</th>
                  <th className="p-3 text-left font-semibold">Date</th>
                  <th className="p-3 text-left font-semibold">Check In</th>
                  <th className="p-3 text-left font-semibold">Check Out</th>
                  <th className="p-3 text-left font-semibold">Reason</th>
                  <th className="p-3 text-left font-semibold">Status</th>
                  <th className="p-3 text-left font-semibold">Review Comment</th>
                  <th className="p-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400 dark:text-gray-500">No requests found</td></tr>
                ) : requests.map(r => (
                  <tr key={r._id} className="border-b border-gray-200 dark:border-slate-700 hover:bg-cyan-50 dark:hover:bg-slate-700/40">
                    <td className="p-3">{r.user?.name || "-"}</td>
                    <td className="p-3">{r.user?.email || "-"}</td>
                    <td className="p-3">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="p-3">{r.requestedCheckIn ? new Date(r.requestedCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</td>
                    <td className="p-3">{r.requestedCheckOut ? new Date(r.requestedCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</td>
                    <td className="p-3 max-w-xs break-words">{r.reason}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        r.status === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" :
                        r.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 max-w-xs break-words">{r.reviewComment || "—"}</td>
                    <td className="p-3">
                      {r.status === "pending" ? (
                        actionId === r._id ? (
                          <div className="flex flex-col gap-2 min-w-[200px]">
                            <input
                              type="text"
                              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-600"
                              placeholder="Comment (optional)"
                              value={reviewComment}
                              onChange={e => setReviewComment(e.target.value)}
                              disabled={actionStatus === "approved" || actionStatus === "rejected"}
                            />
                            <div className="flex gap-1">
                              <button
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs transition-colors"
                                disabled={actionStatus === "approved"}
                                onClick={() => handleReview(r._id, "approved")}
                              >Approve</button>
                              <button
                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs transition-colors"
                                disabled={actionStatus === "rejected"}
                                onClick={() => handleReview(r._id, "rejected")}
                              >Reject</button>
                              <button
                                className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 text-xs transition-colors"
                                onClick={handleCancelReview}
                              >Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="px-3 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700 text-xs transition-colors"
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

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {requests.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">No requests found</div>
            ) : requests.map(r => (
              <div key={r._id} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Employee:</span>
                      <p className="text-gray-900 dark:text-gray-100 font-medium">{r.user?.name || "Unknown"}</p>
                      <p className="text-gray-500 text-sm">{r.user?.email || "No email"}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      r.status === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" :
                      r.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    }`}>
                      {r.status}
                    </span>
                  </div>

                  <div>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Date:</span>
                    <p className="text-gray-900 dark:text-gray-100">{new Date(r.date).toLocaleDateString()}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Check In:</span>
                      <p className="text-gray-900 dark:text-gray-100">{r.requestedCheckIn ? new Date(r.requestedCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Check Out:</span>
                      <p className="text-gray-900 dark:text-gray-100">{r.requestedCheckOut ? new Date(r.requestedCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</p>
                    </div>
                  </div>

                  <div>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Reason:</span>
                    <p className="text-gray-900 dark:text-gray-100 break-words">{r.reason}</p>
                  </div>

                  {r.reviewComment && (
                    <div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Review Comment:</span>
                      <p className="text-gray-900 dark:text-gray-100 break-words">{r.reviewComment}</p>
                    </div>
                  )}

                  {r.status === "pending" && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                      {actionId === r._id ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-600"
                            placeholder="Review comment (optional)"
                            value={reviewComment}
                            onChange={e => setReviewComment(e.target.value)}
                            disabled={actionStatus === "approved" || actionStatus === "rejected"}
                          />
                          <div className="flex gap-2">
                            <button
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                              disabled={actionStatus === "approved"}
                              onClick={() => handleReview(r._id, "approved")}
                            >Approve</button>
                            <button
                              className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                              disabled={actionStatus === "rejected"}
                              onClick={() => handleReview(r._id, "rejected")}
                            >Reject</button>
                          </div>
                          <button
                            className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                            onClick={handleCancelReview}
                          >Cancel Review</button>
                        </div>
                      ) : (
                        <button
                          className="w-full px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors"
                          onClick={() => handleStartReview(r._id, r.reviewComment)}
                        >Start Review</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 