import React, { useEffect, useState } from "react";
import useAuth from '../../hooks/authjwt';
import apiClient from '../../service/apiClient';

const statusOptions = ["pending", "approved", "rejected"];
const typeOptions = ["all", "full-day", "half-day", "sick-leave", "vacation", "personal"];

export default function LeavesAll() {
  const user = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: "", leaveType: "" });
  const [editing, setEditing] = useState({}); // { [id]: { status } }
  const [saving, setSaving] = useState({}); // { [id]: true/false }
  const [message, setMessage] = useState(null);

  const fetchLeaves = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const [leavesRes, usersRes] = await Promise.all([
        apiClient.getAllLeaves(),
        apiClient.getAllUsers()
      ]);
      setLeaves(leavesRes.leaves || []);
      setUsers(usersRes.users || []);
    } catch (err) {
      setError("Failed to load leave requests: " + (err?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeaves(); }, []);

  if (!user || (user.role !== 'hr' && user.role !== 'admin')) {
    return <div className="p-8 text-center text-red-600 font-semibold">Not authorized.</div>;
  }

  const handleEdit = (id, field, value) => {
    setEditing(editing => ({
      ...editing,
      [id]: { ...editing[id], [field]: value }
    }));
  };

  const handleSave = async (id) => {
    setSaving(s => ({ ...s, [id]: true }));
    setMessage(null);
    try {
      const { status } = editing[id] || {};
      await apiClient.updateLeaveStatus(id, status);
      setMessage("Leave request updated successfully.");
      setEditing(e => { const copy = { ...e }; delete copy[id]; return copy; });
      fetchLeaves();
    } catch (err) {
      setMessage("Failed to update leave request: " + (err?.message || ""));
    } finally {
      setSaving(s => ({ ...s, [id]: false }));
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(f => ({ ...f, [field]: value === "all" ? "" : value }));
  };

  // Find user info by employeeId
  const getUserByEmployeeId = (employeeId) => {
    return users.find(u => u.employeeId === employeeId);
  };

  // Filter leaves
  const filteredLeaves = leaves.filter(l =>
    (!filters.status || l.status === filters.status) &&
    (!filters.leaveType || l.leaveType === filters.leaveType)
  );

  return (
    <div className="max-w-7xl mx-auto mt-8 p-4 sm:p-6 bg-white dark:bg-slate-800 rounded-xl shadow-xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-cyan-700 dark:text-cyan-300">Leave Requests</h2>
        <button
          className="px-4 py-2 bg-cyan-100 dark:bg-cyan-700 text-cyan-700 dark:text-cyan-100 rounded-lg font-medium hover:bg-cyan-200 dark:hover:bg-cyan-600 transition-colors"
          onClick={fetchLeaves}
          disabled={loading}
        >
          Refresh
        </button>
      </div>
      
      {/* Responsive Filter Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <select className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100" value={filters.status || "all"} onChange={e => handleFilterChange("status", e.target.value)}>
          <option value="all">All Statuses</option>
          {statusOptions.map(opt => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>)}
        </select>
        <select className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100" value={filters.leaveType || "all"} onChange={e => handleFilterChange("leaveType", e.target.value)}>
          <option value="all">All Types</option>
          {typeOptions.filter(opt => opt !== "all").map(opt => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1).replace('-', ' ')}</option>)}
        </select>
      </div>
      {error && <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">{error}</div>}
      {message && <div className="p-4 mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300">{message}</div>}
      {loading ? (
        <div className="text-center text-gray-500 dark:text-slate-400 py-8">Loading...</div>
      ) : (
        <div className="w-full">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl">
              <thead className="bg-cyan-50 dark:bg-slate-700">
                <tr>
                  <th className="p-3 text-left font-semibold text-cyan-700 dark:text-cyan-300">Employee</th>
                  <th className="p-3 text-left font-semibold text-cyan-700 dark:text-cyan-300">Employee ID</th>
                  <th className="p-3 text-left font-semibold text-cyan-700 dark:text-cyan-300">Type</th>
                  <th className="p-3 text-left font-semibold text-cyan-700 dark:text-cyan-300">Date</th>
                  <th className="p-3 text-left font-semibold text-cyan-700 dark:text-cyan-300">Reason</th>
                  <th className="p-3 text-left font-semibold text-cyan-700 dark:text-cyan-300">Status</th>
                  <th className="p-3 text-left font-semibold text-cyan-700 dark:text-cyan-300">Approved By</th>
                  <th className="p-3 text-left font-semibold text-cyan-700 dark:text-cyan-300">Created</th>
                  <th className="p-3 text-left font-semibold text-cyan-700 dark:text-cyan-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-500 dark:text-gray-400">No leave requests found.</td></tr>
                ) : filteredLeaves.map(leave => {
                  const isEditing = !!editing[leave._id];
                  const userInfo = getUserByEmployeeId(leave.employeeId);
                  return (
                    <tr key={leave._id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-cyan-50 dark:hover:bg-slate-700/40">
                      <td className="p-3">
                        {userInfo ? (
                          <div className="text-sm">
                            <div className="font-medium">{userInfo.name}</div>
                            <div className="text-gray-500 text-xs">{userInfo.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-3">{leave.employeeId}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                          {leave.leaveType.replace('-', ' ')}
                        </span>
                      </td>
                      <td className="p-3">{new Date(leave.leaveDate).toLocaleDateString()}</td>
                      <td className="p-3 max-w-xs break-words">{leave.leaveReason}</td>
                      <td className="p-3">
                        {isEditing ? (
                          <select value={editing[leave._id]?.status || leave.status} onChange={e => handleEdit(leave._id, "status", e.target.value)} className="w-full p-1 border rounded bg-white dark:bg-slate-600">
                            {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${leave.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : leave.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>{leave.status}</span>
                        )}
                      </td>
                      <td className="p-3">{leave.approvedBy || <span className="text-gray-400">—</span>}</td>
                      <td className="p-3 text-xs">{new Date(leave.createdAt).toLocaleDateString()}</td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          {isEditing ? (
                            <>
                              <button className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs transition-colors" onClick={() => handleSave(leave._id)} disabled={saving[leave._id]}>
                                {saving[leave._id] ? 'Saving...' : 'Save'}
                              </button>
                              <button className="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded text-xs transition-colors" onClick={() => setEditing(e => { const copy = { ...e }; delete copy[leave._id]; return copy; })}>Cancel</button>
                            </>
                          ) : (
                            <button className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs transition-colors" onClick={() => setEditing(e => ({ ...e, [leave._id]: { status: leave.status } }))}>Edit</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {filteredLeaves.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">No leave requests found.</div>
            ) : filteredLeaves.map(leave => {
              const isEditing = !!editing[leave._id];
              const userInfo = getUserByEmployeeId(leave.employeeId);
              return (
                <div key={leave._id} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Employee:</span>
                        {userInfo ? (
                          <div className="mt-1">
                            <p className="text-gray-900 dark:text-gray-100 font-medium">{userInfo.name}</p>
                            <p className="text-gray-500 text-sm">{userInfo.email}</p>
                          </div>
                        ) : (
                          <p className="text-gray-400 mt-1">Unknown employee</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${leave.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : leave.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>{leave.status}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Employee ID:</span>
                        <p className="text-gray-900 dark:text-gray-100">{leave.employeeId}</p>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Type:</span>
                        <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium ml-1">
                          {leave.leaveType.replace('-', ' ')}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Date:</span>
                      <p className="text-gray-900 dark:text-gray-100">{new Date(leave.leaveDate).toLocaleDateString()}</p>
                    </div>

                    <div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Reason:</span>
                      <p className="text-gray-900 dark:text-gray-100 break-words">{leave.leaveReason}</p>
                    </div>

                    <div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Status:</span>
                      {isEditing ? (
                        <select value={editing[leave._id]?.status || leave.status} onChange={e => handleEdit(leave._id, "status", e.target.value)} className="w-full mt-1 p-2 border rounded bg-white dark:bg-slate-600">
                          {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <span className={`inline-block ml-2 px-2 py-1 rounded-full text-xs font-semibold ${leave.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : leave.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>{leave.status}</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold text-gray-600 dark:text-gray-300">Approved By:</span>
                        <p className="text-gray-900 dark:text-gray-100">{leave.approvedBy || 'Not approved'}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-600 dark:text-gray-300">Created:</span>
                        <p className="text-gray-900 dark:text-gray-100">{new Date(leave.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors" onClick={() => handleSave(leave._id)} disabled={saving[leave._id]}>
                            {saving[leave._id] ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded transition-colors" onClick={() => setEditing(e => { const copy = { ...e }; delete copy[leave._id]; return copy; })}>Cancel</button>
                        </div>
                      ) : (
                        <button className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors" onClick={() => setEditing(e => ({ ...e, [leave._id]: { status: leave.status } }))}>Edit Status</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 