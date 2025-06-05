import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../service/apiClient';
import useAuth from '../../hooks/authjwt';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, ListFilter, KeyRound } from 'lucide-react';

const statusOptions = ["all", "pending", "approved", "rejected"];

const PasswordRequestsPage = () => {
  const userObject = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState({ type: '', content: '' });
  const [filters, setFilters] = useState({ status: 'pending' }); // Default to pending
  const [actionLoading, setActionLoading] = useState({}); // For loading state of individual actions { [id_action]: true }

  const resetMessages = () => {
    setError(null);
    setMessage({ type: '', content: '' });
  };

  const canManage = userObject && (userObject.role === 'admin' || userObject.role === 'hr');

  const fetchRequests = useCallback(async () => {
    if (!canManage) return;
    setLoading(true);
    resetMessages();
    try {
      const params = {};
      if (filters.status && filters.status !== 'all') {
        params.status = filters.status;
      }
      const response = await apiClient.getAllPasswordResetRequests(params);
      setRequests(response.requests || []);
    } catch (err) {
      setError(err.data?.message || err.message || 'Failed to fetch password reset requests.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [canManage, filters.status]);

  useEffect(() => {
    if (userObject && canManage) {
      fetchRequests();
    }
  }, [fetchRequests, userObject, canManage]);

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, status: e.target.value }));
  };

  const handleAction = async (requestId, action, remarks = '') => {
    setActionLoading(prev => ({ ...prev, [`${requestId}_${action}`]: true }));
    resetMessages();
    try {
      if (action === 'approve') {
        await apiClient.approvePasswordResetRequest(requestId);
        setMessage({ type: 'success', content: 'Request approved successfully.' });
      } else if (action === 'reject') {
        await apiClient.rejectPasswordResetRequest(requestId, remarks || 'Rejected by administrator.');
        setMessage({ type: 'success', content: 'Request rejected successfully.' });
      }
      fetchRequests(); // Refresh list
    } catch (err) {
      setMessage({ type: 'error', content: err.data?.message || err.message || `Failed to ${action} request.` });
    } finally {
      setActionLoading(prev => ({ ...prev, [`${requestId}_${action}`]: false }));
    }
  };

  if (!userObject) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading user data...</div>;
  }
  const user = userObject;

  if (!canManage) {
    return <div className="p-8 text-center text-red-500 dark:text-red-300">You are not authorized to view this page.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto mt-8 p-4 md:p-6 bg-white dark:bg-slate-900 rounded-xl shadow-xl text-slate-900 dark:text-slate-50">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <h2 className="text-3xl font-bold text-cyan-700 dark:text-cyan-300">Password Reset Requests</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <ListFilter size={20} className="text-slate-600 dark:text-slate-400"/>
            <select 
              value={filters.status}
              onChange={handleFilterChange}
              className="p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            >
              {statusOptions.map(opt => <option key={opt} value={opt} className="capitalize">{opt === 'all' ? 'All Statuses' : opt}</option>)}
            </select>
          </div>
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="flex items-center px-3 py-2 bg-cyan-100 dark:bg-cyan-700/50 text-cyan-700 dark:text-cyan-100 rounded-lg font-medium hover:bg-cyan-200 dark:hover:bg-cyan-600/60 transition-colors text-sm"
          >
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-200 rounded-md flex items-center">
          <AlertTriangle size={20} className="mr-2" /> {error}
        </div>
      )}
      {message.content && (
        <div className={`mb-4 p-3 rounded-md flex items-center text-sm ${message.type === 'success' ? 'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-200' : 'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-200'}`}>
          {message.type === 'success' ? <CheckCircle size={20} className="mr-2" /> : <XCircle size={20} className="mr-2" />}
          {message.content}
        </div>
      )}

      {loading && requests.length === 0 && <p className="text-center text-slate-500 dark:text-slate-400 py-10">Loading requests...</p>}
      {!loading && requests.length === 0 && !error && (
        <div className="text-center py-10 text-slate-500 dark:text-slate-400">
          <KeyRound size={48} className="mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold">No Password Requests Found</h3>
          <p className="text-sm">Currently, there are no password requests matching your criteria.</p>
        </div>
      )}

      {requests.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="min-w-full text-sm divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Requested At</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {requests.map(req => (
                <tr key={req._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-200">{req.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-200">{req.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">{new Date(req.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${req.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-700 dark:text-amber-100' : req.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100'}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap space-x-2">
                    {req.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleAction(req._id, 'approve')} 
                          disabled={actionLoading[`${req._id}_approve`]}
                          className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm transition-colors disabled:opacity-50"
                        >
                          {actionLoading[`${req._id}_approve`] ? 'Approving...' : 'Approve'}
                        </button>
                        <button 
                          onClick={() => handleAction(req._id, 'reject')} 
                          disabled={actionLoading[`${req._id}_reject`]}
                          className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm transition-colors disabled:opacity-50"
                        >
                          {actionLoading[`${req._id}_reject`] ? 'Rejecting...' : 'Reject'}
                        </button>
                      </>
                    )}
                    {(req.status === 'approved' || req.status === 'rejected') && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">Actioned</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PasswordRequestsPage; 