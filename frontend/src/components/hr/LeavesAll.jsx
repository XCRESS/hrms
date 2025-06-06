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
    <div className="max-w-6xl mx-auto mt-8 p-6 bg-white dark:bg-slate-800 rounded-xl shadow-xl">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
        <h2 className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">Leave Requests</h2>
        <button
          className="px-4 py-2 bg-cyan-100 dark:bg-cyan-700 text-cyan-700 dark:text-cyan-100 rounded-lg font-medium hover:bg-cyan-200 dark:hover:bg-cyan-600 transition-colors"
          onClick={fetchLeaves}
          disabled={loading}
        >
          Refresh
        </button>
      </div>
      <div className="flex flex-wrap gap-4 mb-4">
        <select className="p-2 border rounded" value={filters.status || "all"} onChange={e => handleFilterChange("status", e.target.value)}>
          <option value="all">All Statuses</option>
          {statusOptions.map(opt => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>)}
        </select>
        <select className="p-2 border rounded" value={filters.leaveType || "all"} onChange={e => handleFilterChange("leaveType", e.target.value)}>
          <option value="all">All Types</option>
          {typeOptions.filter(opt => opt !== "all").map(opt => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1).replace('-', ' ')}</option>)}
        </select>
      </div>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {message && <div className="text-green-600 mb-4">{message}</div>}
      {loading ? (
        <div className="text-center text-gray-500 dark:text-slate-400">Loading...</div>
      ) : (
        <div className="w-full">
          <table className="w-full text-xs sm:text-sm border rounded-xl">
            <thead className="bg-cyan-50 dark:bg-slate-700">
              <tr>
                <th className="p-2 whitespace-nowrap">Employee</th>
                <th className="p-2 whitespace-nowrap">Employee ID</th>
                <th className="p-2 whitespace-nowrap">Type</th>
                <th className="p-2 whitespace-nowrap">Date</th>
                <th className="p-2 whitespace-nowrap">Reason</th>
                <th className="p-2 whitespace-nowrap">Status</th>
                <th className="p-2 whitespace-nowrap">Approved By</th>
                <th className="p-2 whitespace-nowrap">Created</th>
                <th className="p-2 whitespace-nowrap">Updated</th>
                <th className="p-2 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-6 text-gray-500">No leave requests found.</td></tr>
              ) : filteredLeaves.map(leave => {
                const isEditing = !!editing[leave._id];
                const userInfo = getUserByEmployeeId(leave.employeeId);
                return (
                  <tr key={leave._id} className="border-b hover:bg-cyan-50 dark:hover:bg-slate-700/40">
                    <td className="p-2 whitespace-nowrap">{userInfo ? <>{userInfo.name}<br /><span className="text-xs text-gray-500">{userInfo.email}</span></> : <span className="text-gray-400">—</span>}</td>
                    <td className="p-2 whitespace-nowrap">{leave.employeeId}</td>
                    <td className="p-2 whitespace-nowrap">{leave.leaveType}</td>
                    <td className="p-2 whitespace-nowrap">{new Date(leave.leaveDate).toLocaleDateString()}</td>
                    <td className="p-2 whitespace-nowrap max-w-xs break-words">{leave.leaveReason}</td>
                    <td className="p-2 whitespace-nowrap">
                      {isEditing ? (
                        <select value={editing[leave._id]?.status || leave.status} onChange={e => handleEdit(leave._id, "status", e.target.value)} className="p-1 border rounded">
                          {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${leave.status === 'pending' ? 'bg-amber-100 text-amber-700' : leave.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{leave.status}</span>
                      )}
                    </td>
                    <td className="p-2 whitespace-nowrap">{leave.approvedBy ? leave.approvedBy : <span className="text-gray-400">—</span>}</td>
                    <td className="p-2 whitespace-nowrap text-xs">{new Date(leave.createdAt).toLocaleString()}</td>
                    <td className="p-2 whitespace-nowrap text-xs">{new Date(leave.updatedAt).toLocaleString()}</td>
                    <td className="p-2 whitespace-nowrap">
                      {isEditing ? (
                        <button className="px-2 py-1 bg-green-500 text-white rounded mr-2" onClick={() => handleSave(leave._id)} disabled={saving[leave._id]}>Save</button>
                      ) : (
                        <button className="px-2 py-1 bg-cyan-600 text-white rounded" onClick={() => setEditing(e => ({ ...e, [leave._id]: { status: leave.status } }))}>Edit</button>
                      )}
                      {isEditing && (
                        <button className="px-2 py-1 bg-gray-300 text-gray-700 rounded" onClick={() => setEditing(e => { const copy = { ...e }; delete copy[leave._id]; return copy; })}>Cancel</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 