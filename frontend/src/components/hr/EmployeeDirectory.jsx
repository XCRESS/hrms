import React, { useEffect, useState, useCallback } from 'react';
import useAuth from '../../hooks/authjwt';
import apiClient from '../../service/apiClient';

// Enhanced Attendance Analytics Component
const AttendanceAnalytics = ({ attendance, employeeProfile }) => {
  const calculateAttendanceStats = () => {
    if (!attendance || attendance.length === 0) return null;

    const presentDays = attendance.filter(rec => rec.status === 'present').length;
    const absentDays = attendance.filter(rec => rec.status === 'absent').length;
    const lateDays = attendance.filter(rec => {
      if (rec.checkIn) {
        const checkInTime = new Date(rec.checkIn);
        const checkInHour = checkInTime.getHours();
        return checkInHour >= 10; // Assuming 9 AM is start time
      }
      return false;
    }).length;

    const totalWorkingHours = attendance.reduce((total, rec) => {
      if (rec.checkIn && rec.checkOut) {
        const checkIn = new Date(rec.checkIn);
        const checkOut = new Date(rec.checkOut);
        const hours = (checkOut - checkIn) / (1000 * 60 * 60);
        return total + hours;
      }
      return total;
    }, 0);

    const avgHoursPerDay = attendance.length > 0 ? totalWorkingHours / attendance.length : 0;

    return {
      presentDays,
      absentDays,
      lateDays,
      totalWorkingHours: totalWorkingHours.toFixed(1),
      avgHoursPerDay: avgHoursPerDay.toFixed(1),
      attendancePercentage: attendance.length > 0 ? ((presentDays / attendance.length) * 100).toFixed(1) : 0
    };
  };

  const stats = calculateAttendanceStats();

  if (!stats) {
    return <div className="text-slate-500 dark:text-slate-400">No attendance data available for analysis.</div>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.presentDays}</div>
        <div className="text-sm text-green-700 dark:text-green-300">Present Days</div>
      </div>
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.absentDays}</div>
        <div className="text-sm text-red-700 dark:text-red-300">Absent Days</div>
      </div>
      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.lateDays}</div>
        <div className="text-sm text-yellow-700 dark:text-yellow-300">Late Arrivals</div>
      </div>
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalWorkingHours}h</div>
        <div className="text-sm text-blue-700 dark:text-blue-300">Total Hours</div>
      </div>
      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.avgHoursPerDay}h</div>
        <div className="text-sm text-purple-700 dark:text-purple-300">Avg/Day</div>
      </div>
      <div className="bg-cyan-50 dark:bg-cyan-900/20 p-4 rounded-lg border border-cyan-200 dark:border-cyan-800">
        <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{stats.attendancePercentage}%</div>
        <div className="text-sm text-cyan-700 dark:text-cyan-300">Attendance</div>
      </div>
    </div>
  );
};

// Enhanced Attendance Table with filters and sorting
const AttendanceTable = ({ attendance, onDateFilter }) => {
  const [sortOrder, setSortOrder] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredAttendance = attendance.filter(rec => {
    if (statusFilter !== 'all' && rec.status !== statusFilter) return false;
    return true;
  });

  const sortedAttendance = [...filteredAttendance].sort((a, b) => {
    const dateA = new Date(a.date || a.checkIn);
    const dateB = new Date(b.date || b.checkIn);
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const totalPages = Math.ceil(sortedAttendance.length / itemsPerPage);
  const paginatedAttendance = sortedAttendance.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatWorkingHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 'N/A';
    const hours = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60);
    return `${hours.toFixed(1)}h`;
  };

  if (!attendance || attendance.length === 0) {
    return <div className="text-slate-500 dark:text-slate-400">No attendance records found.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
          >
            <option value="all">All Status</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="half-day">Half Day</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="px-3 py-2 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700 transition-colors"
          >
            Date {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Showing {paginatedAttendance.length} of {sortedAttendance.length} records
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-700">
            <tr>
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Date</th>
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Check-In</th>
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Check-Out</th>
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Working Hours</th>
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Status</th>
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Notes</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {paginatedAttendance.map((rec, idx) => {
              const isLate = rec.checkIn && new Date(rec.checkIn).getHours() >= 10;
              return (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="p-3 whitespace-nowrap text-slate-700 dark:text-slate-200">
                    {new Date(rec.date || rec.checkIn).toLocaleDateString()}
                  </td>
                  <td className="p-3 whitespace-nowrap text-slate-700 dark:text-slate-200">
                    {rec.checkIn ? (
                      <span className={isLate ? 'text-red-600 dark:text-red-400' : ''}>
                        {new Date(rec.checkIn).toLocaleTimeString()}
                        {isLate && ' (Late)'}
                      </span>
                    ) : 'N/A'}
                  </td>
                  <td className="p-3 whitespace-nowrap text-slate-700 dark:text-slate-200">
                    {rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString() : 'N/A'}
                  </td>
                  <td className="p-3 whitespace-nowrap text-slate-700 dark:text-slate-200">
                    {formatWorkingHours(rec.checkIn, rec.checkOut)}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      rec.status === 'present' ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' : 
                      rec.status === 'absent' ? 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100' : 
                      rec.status === 'half-day' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100' : 
                      'bg-slate-100 text-slate-800 dark:bg-slate-600 dark:text-slate-100'
                    }`}>
                      {rec.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-700 dark:text-slate-300 max-w-xs break-words">{rec.notes || 'N/A'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-2 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

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
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Duration</th>
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
                <td className="p-3 whitespace-nowrap text-slate-700 dark:text-slate-200">
                  {calculateLeaveDuration(leave)}
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

export default function EmployeeDirectory() {
  const userObject = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const fetchEmployeeData = useCallback(async () => {
    if (!selectedEmployeeId) return;
    setProfileLoading(true);
    setProfileError(null);
    setEmployeeProfile(null);
    setAttendance([]);
    setLeaves([]);
    try {
      const res = await apiClient.get(`/employees/${selectedEmployeeId}`);
      setEmployeeProfile(res);
      if (res && res.employeeId) {
        try {
          const lv = await apiClient.get(`/leaves/all?employeeId=${res.employeeId}`);
          setLeaves(lv.leaves || []);
        } catch (lvErr) {
          setLeaves([]);
          setProfileError(prev => (prev ? prev + '; ' : '') + 'Failed to fetch leaves. ' + (lvErr?.message || ''));
        }
        try {
          const att = await apiClient.getAttendanceRecords({ 
            employeeId: res.employeeId,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
          });
          setAttendance(att.data?.records || att.records || []);
        } catch (attErr) {
          setAttendance([]);
          setProfileError(prev => (prev ? prev + '; ' : '') + 'Failed to fetch attendance. ' + (attErr?.message || ''));
        }
      } else {
        setLeaves([]);
        setAttendance([]);
        if (res && !res.employeeId) {
          console.warn("Employee profile fetched but missing employeeId, cannot fetch leaves or attendance.");
        }
      }
    } catch (err) {
      setProfileError('Failed to load employee details. ' + (err?.message || ''));
    } finally {
      setProfileLoading(false);
    }
  }, [selectedEmployeeId, dateRange]);

  useEffect(() => {
    fetchEmployeeData();
  }, [fetchEmployeeData]);
  
  useEffect(() => {
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await apiClient.getEmployees();
        setEmployees(res.employees || []);
        try {
          const userRes = await apiClient.getAllUsers();
          setUsers(userRes.users || []);
        } catch (userErr) {
          setUsers([]);
          console.error('Failed to load users.', userErr);
        }
      } catch (err) {
        setError('Failed to load employees list. ' + (err?.message || ''));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!userObject) return <div className="p-6 text-center text-slate-500 dark:text-slate-400">Loading user data...</div>;
  const user = userObject;

  if (user.role !== 'hr' && user.role !== 'admin') {
    return <div className="p-6 text-center text-red-500">Not authorized to view this page.</div>;
  }

  const filteredEmployees = employees.filter(e =>
    (e.fullName || `${e.firstName} ${e.lastName}`).toLowerCase().includes(search.toLowerCase())
  );

  const isEmployeeLinked = (employeeId) => {
    return users.some(u => u.employeeId === employeeId);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      {/* Sidebar: Employee List */}
      <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors"
          />
        </div>
        <div className="flex-grow overflow-y-auto">
          {loading && employees.length === 0 ? (
            <div className="p-4 text-slate-500 dark:text-slate-400">Loading employees...</div>
          ) : error ? (
            <div className="p-4 text-red-500">{error}</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-4 text-slate-500 dark:text-slate-400">No employees found.</div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredEmployees.map((e) => (
                <li
                  key={e._id}
                  className={`p-4 cursor-pointer hover:bg-cyan-50 dark:hover:bg-slate-700 transition-colors ${selectedEmployeeId === e._id ? 'bg-cyan-100 dark:bg-cyan-700 text-cyan-700 dark:text-cyan-50 font-semibold' : ''}`}
                  onClick={() => setSelectedEmployeeId(e._id)}
                >
                  <div className="flex justify-between items-center">
                    <span>{e.fullName || `${e.firstName} ${e.lastName}`}</span>
                    <div className="flex items-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isEmployeeLinked(e.employeeId) ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100'}`}>
                        {isEmployeeLinked(e.employeeId) ? 'Linked' : 'Unlinked'}
                      </span>
                      {!isEmployeeLinked(e.employeeId) && (
                        <button
                          className="ml-2 px-2 py-1 text-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
                          onClick={evt => { evt.stopPropagation(); window.location.href = '/auth/signup'; }}
                        >
                          Create User
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Main Panel: Employee Details */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        {!selectedEmployeeId ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500 dark:text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="mt-2 text-xl font-semibold">Select an employee</p>
              <p className="text-sm">Choose an employee from the list to view their details.</p>
            </div>
          </div>
        ) : profileLoading ? (
          <div className="text-center p-10 text-slate-500 dark:text-slate-400">Loading employee details...</div>
        ) : profileError ? (
          <div className="p-6 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg shadow">{profileError}</div>
        ) : employeeProfile ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 md:p-8">
            <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-cyan-700 dark:text-cyan-300">
                    {employeeProfile.firstName} {employeeProfile.lastName}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    {employeeProfile.position} &mdash; {employeeProfile.department}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">From:</label>
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                      className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">To:</label>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                      className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const data = {
                        employee: employeeProfile,
                        attendance: attendance,
                        leaves: leaves,
                        dateRange: dateRange
                      };
                      console.log('Export data:', data);
                      // Here you could implement actual export functionality
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                  >
                    📊 Export Report
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              {/* Contact & Work Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-cyan-600 dark:text-cyan-400 mb-2">Contact & Work</h3>
                <p><strong>Email:</strong> {employeeProfile.email}</p>
                <p><strong>Phone:</strong> {employeeProfile.phone}</p>
                <p><strong>Employee ID:</strong> {employeeProfile.employeeId}</p>
                <p><strong>Status:</strong>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${employeeProfile.isActive ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100'}`}>
                    {employeeProfile.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
                <p><strong>Employment Type:</strong> {employeeProfile.employmentType}</p>
                <p><strong>Joining Date:</strong> {employeeProfile.joiningDate ? new Date(employeeProfile.joiningDate).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Office:</strong> {employeeProfile.officeAddress}</p>
                <p><strong>Supervisor:</strong> {employeeProfile.reportingSupervisor}</p>
              </div>

              {/* Personal Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-cyan-600 dark:text-cyan-400 mb-2">Personal Information</h3>
                <p><strong>Date of Birth:</strong> {employeeProfile.dateOfBirth ? new Date(employeeProfile.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Gender:</strong> {employeeProfile.gender}</p>
                <p><strong>Marital Status:</strong> {employeeProfile.maritalStatus}</p>
                <p><strong>Father's Name:</strong> {employeeProfile.fatherName}</p>
                <p><strong>Mother's Name:</strong> {employeeProfile.motherName}</p>
                <p><strong>Address:</strong> {employeeProfile.address}</p>
                <p><strong>Aadhaar:</strong> {employeeProfile.aadhaarNumber}</p>
                <p><strong>PAN:</strong> {employeeProfile.panNumber}</p>
                <p><strong>Emergency:</strong> {employeeProfile.emergencyContactName} ({employeeProfile.emergencyContactNumber})</p>
              </div>

              {/* Financial Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-cyan-600 dark:text-cyan-400 mb-2">Financial Information</h3>
                <p><strong>Salary:</strong> {employeeProfile.salary?.toLocaleString() || 'N/A'}</p>
                <p><strong>Bank:</strong> {employeeProfile.bankName}</p>
                <p><strong>Account #:</strong> {employeeProfile.bankAccountNumber}</p>
                <p><strong>IFSC:</strong> {employeeProfile.bankIFSCCode}</p>
                <p><strong>Payment Mode:</strong> {employeeProfile.paymentMode}</p>
              </div>
            </div>

            {/* Enhanced Attendance Section */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-semibold text-cyan-700 dark:text-cyan-300 mb-4">Attendance Analytics</h3>
              <AttendanceAnalytics attendance={attendance} employeeProfile={employeeProfile} />
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">Detailed Records</h4>
                <AttendanceTable attendance={attendance} />
              </div>
            </div>

            {/* Enhanced Leave Requests Section */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-semibold text-cyan-700 dark:text-cyan-300 mb-4">Leave Management</h3>
              <LeaveRequestsTable leaves={leaves} employeeProfile={employeeProfile} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
} 