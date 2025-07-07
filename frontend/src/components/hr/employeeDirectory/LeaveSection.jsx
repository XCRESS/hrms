import React, { useState } from 'react';

// Enhanced Leave Requests Table with analytics and filtering
const LeaveRequestsTable = ({ leaves, employeeProfile }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');

  const calculateLeaveStats = () => {
    if (!leaves || leaves.length === 0) return null;

    const approved = leaves.filter(l => l.status === 'approved').length;
    const pending = leaves.filter(l => l.status === 'pending').length;
    const rejected = leaves.filter(l => l.status === 'rejected').length;
    
    const leaveTypes = {};
    leaves.forEach(l => {
      leaveTypes[l.leaveType] = (leaveTypes[l.leaveType] || 0) + 1;
    });

    const thisYearLeaves = leaves.filter(l => {
      const leaveYear = new Date(l.leaveDate || l.startDate).getFullYear();
      return leaveYear === new Date().getFullYear();
    }).length;

    return { approved, pending, rejected, leaveTypes, thisYearLeaves, total: leaves.length };
  };

  const stats = calculateLeaveStats();

  const filteredLeaves = leaves.filter(leave => {
    if (statusFilter !== 'all' && leave.status !== statusFilter) return false;
    if (typeFilter !== 'all' && leave.leaveType !== typeFilter) return false;
    return true;
  });

  const sortedLeaves = [...filteredLeaves].sort((a, b) => {
    const dateA = new Date(a.leaveDate || a.startDate || a.createdAt);
    const dateB = new Date(b.leaveDate || b.startDate || b.createdAt);
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const getLeaveTypeOptions = () => {
    const types = [...new Set(leaves.map(l => l.leaveType))];
    return types;
  };

  const calculateLeaveDuration = (leave) => {
    if (leave.startDate && leave.endDate) {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return `${days} day${days > 1 ? 's' : ''}`;
    }
    return '1 day';
  };

  if (!leaves || leaves.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-slate-500 dark:text-slate-400 mb-2">No leave requests found</div>
        <div className="text-sm text-slate-400 dark:text-slate-500">
          This employee hasn't submitted any leave requests yet.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Leave Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.approved}</div>
            <div className="text-sm text-green-700 dark:text-green-300">Approved</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</div>
            <div className="text-sm text-yellow-700 dark:text-yellow-300">Pending</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</div>
            <div className="text-sm text-red-700 dark:text-red-300">Rejected</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.thisYearLeaves}</div>
            <div className="text-sm text-blue-700 dark:text-blue-300">This Year</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
          >
            <option value="all">All Types</option>
            {getLeaveTypeOptions().map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="px-3 py-2 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700 transition-colors"
          >
            Date {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Showing {sortedLeaves.length} of {leaves.length} requests
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-700">
            <tr>
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Request Date</th>
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Leave Type</th>
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Leave Period</th>
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Status</th>
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Reason</th>
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {sortedLeaves.map((leave, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="p-3 whitespace-nowrap text-slate-700 dark:text-slate-200">
                  {new Date(leave.createdAt || leave.requestDate || Date.now()).toLocaleDateString()}
                </td>
                <td className="p-3 whitespace-nowrap text-slate-700 dark:text-slate-200">
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-600 rounded-full text-xs font-medium">
                    {leave.leaveType}
                  </span>
                </td>
                <td className="p-3 whitespace-nowrap text-slate-700 dark:text-slate-200">
                  {leave.startDate && leave.endDate ? (
                    <>
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </>
                  ) : (
                    new Date(leave.leaveDate || leave.startDate).toLocaleDateString()
                  )}
                </td>
                <td className="p-3 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    leave.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-700 dark:text-amber-100' : 
                    leave.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' : 
                    'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100'
                  }`}>
                    {leave.status}
                  </span>
                </td>
                <td className="p-3 text-slate-700 dark:text-slate-300 max-w-xs">
                  <div className="truncate" title={leave.leaveReason || leave.reason}>
                    {leave.leaveReason || leave.reason || 'No reason provided'}
                  </div>
                </td>
                <td className="p-3 whitespace-nowrap">
                  {leave.status === 'pending' && (
                    <div className="flex gap-1">
                      <button
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        onClick={() => console.log('Approve leave', leave._id)}
                      >
                        Approve
                      </button>
                      <button
                        className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                        onClick={() => console.log('Reject leave', leave._id)}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Main Leave Section Component
const LeaveSection = ({ leaves, employeeProfile }) => {
  return (
    <div className="space-y-6">
      <LeaveRequestsTable leaves={leaves} employeeProfile={employeeProfile} />
    </div>
  );
};

// Export individual components for flexibility and the main LeaveSection
export { LeaveRequestsTable };
export default LeaveSection; 