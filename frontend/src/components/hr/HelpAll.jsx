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
    <div className="max-w-7xl mx-auto mt-8 p-4 sm:p-6 bg-white dark:bg-slate-800 rounded-xl shadow-xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-cyan-700 dark:text-cyan-300">Help Desk Inquiries</h2>
        <button
          className="px-4 py-2 bg-cyan-100 dark:bg-cyan-700 text-cyan-700 dark:text-cyan-100 rounded-lg font-medium hover:bg-cyan-200 dark:hover:bg-cyan-600 transition-colors"
          onClick={fetchInquiries}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {/* Responsive Filter Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <select className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100" value={filters.status || "all"} onChange={e => handleFilterChange("status", e.target.value)}>
          <option value="all">All Statuses</option>
          {statusOptions.map(opt => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>)}
        </select>
        <select className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100" value={filters.category || "all"} onChange={e => handleFilterChange("category", e.target.value)}>
          <option value="all">All Categories</option>
          {categoryOptions.filter(opt => opt !== "all").map(opt => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>)}
        </select>
        <select className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100" value={filters.priority || "all"} onChange={e => handleFilterChange("priority", e.target.value)}>
          <option value="all">All Priorities</option>
          {priorityOptions.filter(opt => opt !== "all").map(opt => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>)}
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
                  <th className="p-3 text-left font-semibold text-cyan-700 dark:text-cyan-300">Subject</th>
                  <th className="p-3 text-left font-semibold text-cyan-700 dark:text-cyan-300">Description</th>
                  <th className="p-3 text-left font-semibold text-cyan-700 dark:text-cyan-300">Category</th>
                  <th className="p-3 text-left font-semibold text-cyan-700 dark:text-cyan-300">Priority</th>
                  <th className="p-3 text-left font-semibold text-cyan-700 dark:text-cyan-300">Status</th>
                  <th className="p-3 text-left font-semibold text-cyan-700 dark:text-cyan-300">Response</th>
                  <th className="p-3 text-left font-semibold text-cyan-700 dark:text-cyan-300">User</th>
                  <th className="p-3 text-left font-semibold text-cyan-700 dark:text-cyan-300">Created</th>
                  <th className="p-3 text-left font-semibold text-cyan-700 dark:text-cyan-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-500 dark:text-gray-400">No inquiries found.</td></tr>
                ) : inquiries.map(inq => {
                  const isEditing = !!editing[inq._id];
                  return (
                    <tr key={inq._id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-cyan-50 dark:hover:bg-slate-700/40">
                      <td className="p-3 max-w-xs break-words">{inq.subject}</td>
                      <td className="p-3 max-w-xs break-words">{inq.description}</td>
                      <td className="p-3">{inq.category}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          inq.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                          inq.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        }`}>
                          {inq.priority}
                        </span>
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <select value={editing[inq._id]?.status || inq.status} onChange={e => handleEdit(inq._id, "status", e.target.value)} className="w-full p-1 border rounded bg-white dark:bg-slate-600">
                            {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${inq.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : inq.status === 'in-progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>{inq.status}</span>
                        )}
                      </td>
                      <td className="p-3 max-w-xs">
                        {isEditing ? (
                          <textarea value={editing[inq._id]?.response ?? inq.response ?? ""} onChange={e => handleEdit(inq._id, "response", e.target.value)} className="w-full p-1 border rounded bg-white dark:bg-slate-600" rows={2} />
                        ) : (
                          <div className="break-words">{inq.response || <span className="text-gray-400">—</span>}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          <div className="font-medium">{inq.userId?.name}</div>
                          <div className="text-gray-500 text-xs">{inq.userId?.email}</div>
                        </div>
                      </td>
                      <td className="p-3 text-xs">{new Date(inq.createdAt).toLocaleDateString()}</td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          {isEditing ? (
                            <>
                              <button className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs transition-colors" onClick={() => handleSave(inq._id)} disabled={saving[inq._id]}>
                                {saving[inq._id] ? 'Saving...' : 'Save'}
                              </button>
                              <button className="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded text-xs transition-colors" onClick={() => setEditing(e => { const copy = { ...e }; delete copy[inq._id]; return copy; })}>Cancel</button>
                            </>
                          ) : (
                            <button className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs transition-colors" onClick={() => setEditing(e => ({ ...e, [inq._id]: { status: inq.status, response: inq.response ?? "" } }))}>Edit</button>
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
            {inquiries.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">No inquiries found.</div>
            ) : inquiries.map(inq => {
              const isEditing = !!editing[inq._id];
              return (
                <div key={inq._id} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Subject:</span>
                      <p className="text-gray-900 dark:text-gray-100 break-words">{inq.subject}</p>
                    </div>
                    
                    <div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Description:</span>
                      <p className="text-gray-900 dark:text-gray-100 break-words">{inq.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Category:</span>
                        <p className="text-gray-900 dark:text-gray-100">{inq.category}</p>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Priority:</span>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                          inq.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                          inq.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        }`}>
                          {inq.priority}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Status:</span>
                      {isEditing ? (
                        <select value={editing[inq._id]?.status || inq.status} onChange={e => handleEdit(inq._id, "status", e.target.value)} className="w-full mt-1 p-2 border rounded bg-white dark:bg-slate-600">
                          {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <span className={`inline-block ml-2 px-2 py-1 rounded-full text-xs font-semibold ${inq.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : inq.status === 'in-progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>{inq.status}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Response:</span>
                      {isEditing ? (
                        <textarea value={editing[inq._id]?.response ?? inq.response ?? ""} onChange={e => handleEdit(inq._id, "response", e.target.value)} className="w-full mt-1 p-2 border rounded bg-white dark:bg-slate-600" rows={3} placeholder="Enter response..." />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-100 break-words mt-1">{inq.response || <span className="text-gray-400">No response yet</span>}</p>
                      )}
                    </div>

                    <div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">User:</span>
                      <div className="mt-1">
                        <p className="text-gray-900 dark:text-gray-100 font-medium">{inq.userId?.name}</p>
                        <p className="text-gray-500 text-sm">{inq.userId?.email}</p>
                      </div>
                    </div>

                    <div className="text-sm">
                      <span className="font-semibold text-gray-600 dark:text-gray-300">Created:</span>
                      <p className="text-gray-900 dark:text-gray-100">{new Date(inq.createdAt).toLocaleDateString()}</p>
                    </div>

                    <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors" onClick={() => handleSave(inq._id)} disabled={saving[inq._id]}>
                            {saving[inq._id] ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded transition-colors" onClick={() => setEditing(e => { const copy = { ...e }; delete copy[inq._id]; return copy; })}>Cancel</button>
                        </div>
                      ) : (
                        <button className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors" onClick={() => setEditing(e => ({ ...e, [inq._id]: { status: inq.status, response: inq.response ?? "" } }))}>Edit Inquiry</button>
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