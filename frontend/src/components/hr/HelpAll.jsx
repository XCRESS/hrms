import React, { useEffect, useState } from "react";
import useAuth from '../../hooks/authjwt';
import apiClient from '../../service/apiClient';

const statusOptions = ["pending", "in-progress", "resolved"];
const categoryOptions = ["all", "technical", "hr", "payroll", "other"];
const priorityOptions = ["all", "low", "medium", "high"];

export default function HelpAll() {
  const user = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: "", category: "", priority: "" });
  const [editing, setEditing] = useState({}); // { [id]: { status, response } }
  const [saving, setSaving] = useState({}); // { [id]: true/false }
  const [message, setMessage] = useState(null);

  const fetchInquiries = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await apiClient.getAllInquiries({
        status: filters.status,
        category: filters.category,
        priority: filters.priority
      });
      setInquiries(res.data?.inquiries || []);
    } catch (err) {
      setError("Failed to load help desk inquiries: " + (err?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInquiries(); }, [filters]);

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
      const { status, response } = editing[id] || {};
      await apiClient.updateHelpInquiry(id, { status, response });
      setMessage("Inquiry updated successfully.");
      setEditing(e => { const copy = { ...e }; delete copy[id]; return copy; });
      fetchInquiries();
    } catch (err) {
      setMessage("Failed to update inquiry: " + (err?.message || ""));
    } finally {
      setSaving(s => ({ ...s, [id]: false }));
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(f => ({ ...f, [field]: value === "all" ? "" : value }));
  };

  return (
    <div className="max-w-6xl mx-auto mt-8 p-6 bg-white dark:bg-slate-800 rounded-xl shadow-xl">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
        <h2 className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">Help Desk Inquiries</h2>
        <button
          className="px-4 py-2 bg-cyan-100 dark:bg-cyan-700 text-cyan-700 dark:text-cyan-100 rounded-lg font-medium hover:bg-cyan-200 dark:hover:bg-cyan-600 transition-colors"
          onClick={fetchInquiries}
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
        <select className="p-2 border rounded" value={filters.category || "all"} onChange={e => handleFilterChange("category", e.target.value)}>
          <option value="all">All Categories</option>
          {categoryOptions.filter(opt => opt !== "all").map(opt => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>)}
        </select>
        <select className="p-2 border rounded" value={filters.priority || "all"} onChange={e => handleFilterChange("priority", e.target.value)}>
          <option value="all">All Priorities</option>
          {priorityOptions.filter(opt => opt !== "all").map(opt => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>)}
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
                <th className="p-2">Subject</th>
                <th className="p-2">Description</th>
                <th className="p-2">Category</th>
                <th className="p-2">Priority</th>
                <th className="p-2">Status</th>
                <th className="p-2">Response</th>
                <th className="p-2">User</th>
                <th className="p-2">Responded By</th>
                <th className="p-2">Created</th>
                <th className="p-2">Updated</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-6 text-gray-500">No inquiries found.</td></tr>
              ) : inquiries.map(inq => {
                const isEditing = !!editing[inq._id];
                return (
                  <tr key={inq._id} className="border-b hover:bg-cyan-50 dark:hover:bg-slate-700/40">
                    <td className="p-2 max-w-xs break-words">{inq.subject}</td>
                    <td className="p-2 max-w-xs break-words">{inq.description}</td>
                    <td className="p-2">{inq.category}</td>
                    <td className="p-2">{inq.priority}</td>
                    <td className="p-2">
                      {isEditing ? (
                        <select value={editing[inq._id]?.status || inq.status} onChange={e => handleEdit(inq._id, "status", e.target.value)} className="p-1 border rounded">
                          {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${inq.status === 'pending' ? 'bg-amber-100 text-amber-700' : inq.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{inq.status}</span>
                      )}
                    </td>
                    <td className="p-2 max-w-xs break-words">
                      {isEditing ? (
                        <textarea value={editing[inq._id]?.response ?? inq.response ?? ""} onChange={e => handleEdit(inq._id, "response", e.target.value)} className="w-full p-1 border rounded" rows={2} />
                      ) : (
                        inq.response || <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-2">{inq.userId?.name}<br /><span className="text-xs text-gray-500">{inq.userId?.email}</span></td>
                    <td className="p-2">{inq.respondedBy ? inq.respondedBy : <span className="text-gray-400">—</span>}</td>
                    <td className="p-2 text-xs">{new Date(inq.createdAt).toLocaleString()}</td>
                    <td className="p-2 text-xs">{new Date(inq.updatedAt).toLocaleString()}</td>
                    <td className="p-2">
                      {isEditing ? (
                        <button className="px-2 py-1 bg-green-500 text-white rounded mr-2" onClick={() => handleSave(inq._id)} disabled={saving[inq._id]}>Save</button>
                      ) : (
                        <button className="px-2 py-1 bg-cyan-600 text-white rounded" onClick={() => setEditing(e => ({ ...e, [inq._id]: { status: inq.status, response: inq.response ?? "" } }))}>Edit</button>
                      )}
                      {isEditing && (
                        <button className="px-2 py-1 bg-gray-300 text-gray-700 rounded" onClick={() => setEditing(e => { const copy = { ...e }; delete copy[inq._id]; return copy; })}>Cancel</button>
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