import React, { useEffect, useState, useCallback } from 'react';
import useAuth from '../../hooks/authjwt';
import apiClient from '../../service/apiClient';
import { CheckCircle, AlertCircle, XCircle, BarChart3, Clock, ChevronLeft, ChevronRight, Calendar, Edit3, X, Save } from 'lucide-react';

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

// Edit Attendance Modal Component
const EditAttendanceModal = ({ isOpen, onClose, record, employeeProfile, onUpdate }) => {
  const [formData, setFormData] = useState({
    status: '',
    checkIn: '',
    checkOut: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (record && isOpen) {
      const formatTimeForInput = (date) => {
        if (!date) return '';
        const d = new Date(date);
        // Convert UTC to IST (UTC + 5:30) for datetime-local input
        const istTime = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
        return istTime.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
      };

      setFormData({
        status: record.status || 'present',
        checkIn: formatTimeForInput(record.checkIn),
        checkOut: formatTimeForInput(record.checkOut)
      });
      setError('');
    }
  }, [record, isOpen]);

    const handleStatusChange = (status) => {
    setFormData(prev => ({ ...prev, status }));
    
    // Auto-fill times based on status (in IST)
    const recordDate = new Date(record?.date || new Date());
    // Get the local date part and create IST date
    const year = recordDate.getFullYear();
    const month = String(recordDate.getMonth() + 1).padStart(2, '0');
    const day = String(recordDate.getDate()).padStart(2, '0');
    const baseDate = `${year}-${month}-${day}`;
    
    switch (status) {
      case 'present':
        setFormData(prev => ({
          ...prev,
          checkIn: prev.checkIn || `${baseDate}T09:00`,
          checkOut: prev.checkOut || `${baseDate}T18:00`
        }));
        break;
      case 'half-day':
        setFormData(prev => ({
          ...prev,
          checkIn: prev.checkIn || `${baseDate}T09:00`,
          checkOut: `${baseDate}T13:00`
        }));
        break;
      case 'late':
        setFormData(prev => ({
          ...prev,
          checkIn: `${baseDate}T10:30`,
          checkOut: prev.checkOut || `${baseDate}T18:00`
        }));
        break;
      case 'absent':
        setFormData(prev => ({
          ...prev,
          checkIn: '',
          checkOut: ''
        }));
        break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const updateData = {
        status: formData.status,
        checkIn: formData.checkIn || null,
        checkOut: formData.checkOut || null
      };

      // For records that don't exist (absent days), include employee and date info
      if (!record._id) {
        updateData.employeeId = employeeProfile?.employeeId;
        updateData.date = record.date;
      }

      if (record._id) {
        await apiClient.updateAttendanceRecord(record._id, updateData);
      } else {
        // For absent records without _id, we need to create a new record
        await apiClient.updateAttendanceRecord('new', updateData);
      }

      onUpdate();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update attendance record');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-cyan-600" />
            Edit Attendance
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Date: {record ? new Date(record.date).toLocaleDateString() : ''}
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Employee: {employeeProfile?.firstName} {employeeProfile?.lastName}
            </label>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Status
            </label>
                         <select
               value={formData.status}
               onChange={(e) => handleStatusChange(e.target.value)}
               className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
               required
             >
               <option value="present">Present</option>
               <option value="absent">Absent</option>
               <option value="half-day">Half Day</option>
               <option value="late">Late</option>
             </select>
          </div>

                     {formData.status !== 'absent' && (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Check In Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.checkIn}
                  onChange={(e) => setFormData(prev => ({ ...prev, checkIn: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Check Out Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.checkOut}
                  onChange={(e) => setFormData(prev => ({ ...prev, checkOut: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Enhanced Attendance Table with filters and sorting
const AttendanceTable = ({ employeeId, dateRange, onDateFilter, onEditAttendance, updateTrigger }) => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [statistics, setStatistics] = useState(null);
  const [showAbsentDays, setShowAbsentDays] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [joiningDate, setJoiningDate] = useState(null);
  const [effectiveDateRange, setEffectiveDateRange] = useState(null);

  const recordsPerPage = 15;

  const fetchAttendance = async (page = 1) => {
    if (!employeeId) return;
    
    setLoading(true);
    try {
      let response;
      
      if (showAbsentDays) {
        // Use new API that includes absent days
        response = await apiClient.getEmployeeAttendanceWithAbsents({
          employeeId: employeeId,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        });
        
        if (response.success) {
          let allRecords = response.data.records || [];
          setStatistics(response.data.statistics);
          
          // Store joining date and effective date range info
          if (response.data.employee?.joiningDate) {
            setJoiningDate(response.data.employee.joiningDate);
          }
          if (response.data.dateRange) {
            setEffectiveDateRange(response.data.dateRange);
          }
          
          // Apply status filter
          if (statusFilter !== 'all') {
            allRecords = allRecords.filter(record => record.status === statusFilter);
          }
          
          // Sort records by date
          const sortedRecords = allRecords.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
          });
          
          // Paginate manually since this endpoint returns all records
          const startIndex = (page - 1) * recordsPerPage;
          const endIndex = startIndex + recordsPerPage;
          const paginatedRecords = sortedRecords.slice(startIndex, endIndex);
          
          setAttendanceData(paginatedRecords.map(record => ({
            ...record,
            date: new Date(record.date),
            checkIn: record.checkIn ? new Date(record.checkIn) : null,
            checkOut: record.checkOut ? new Date(record.checkOut) : null
          })));
          
          setTotalRecords(sortedRecords.length);
          setTotalPages(Math.ceil(sortedRecords.length / recordsPerPage));
        }
      } else {
        // Use original API that only shows records with check-ins
        const params = {
          page,
          limit: recordsPerPage,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          employeeId: employeeId
        };
        
        response = await apiClient.getAttendanceRecords(params);
        if (response.success && response.data?.records) {
          let records = response.data.records;
          
          // Apply status filter
          if (statusFilter !== 'all') {
            records = records.filter(record => record.status === statusFilter);
          }
          
          // Sort records by date
          const sortedRecords = records.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
          });
          
          setAttendanceData(sortedRecords.map(record => ({
            ...record,
            date: new Date(record.date),
            checkIn: record.checkIn ? new Date(record.checkIn) : null,
            checkOut: record.checkOut ? new Date(record.checkOut) : null
          })));
          
          setTotalRecords(response.data.total || sortedRecords.length);
          setTotalPages(Math.ceil((response.data.total || sortedRecords.length) / recordsPerPage));
        }
      }
    } catch (err) {
      console.error("Failed to fetch attendance:", err);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance(currentPage);
  }, [currentPage, dateRange, showAbsentDays, employeeId, statusFilter, sortOrder, updateTrigger]);

  const formatTime = (date) => {
    if (!date) return "—";
    // Convert UTC to IST for display
    const utcDate = new Date(date);
    const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
    return new Intl.DateTimeFormat('en-US', { 
      hour: '2-digit', minute: '2-digit', hour12: true 
    }).format(istDate);
  };

  const formatDate = (date) => new Intl.DateTimeFormat('en-US', { 
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
  }).format(date);

  const getStatusIcon = (status, checkIn, checkOut) => {
    if (status === "present") {
      if (checkIn && checkOut) {
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      } else if (checkIn && !checkOut) {
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      }
    }
    if (status === "absent") return <XCircle className="w-4 h-4 text-red-600" />;
    return <AlertCircle className="w-4 h-4 text-gray-600" />;
  };

  const getStatusBadge = (status, checkIn, checkOut) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-semibold";
    
    if (status === "present") {
      if (checkIn && checkOut) {
        return <span className={`${baseClasses} bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300`}>Complete</span>;
      } else if (checkIn && !checkOut) {
        return <span className={`${baseClasses} bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300`}>Incomplete</span>;
      }
    }
    if (status === "absent") return <span className={`${baseClasses} bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300`}>Absent</span>;
    if (status === "half-day") return <span className={`${baseClasses} bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300`}>Half Day</span>;
    if (status === "late") return <span className={`${baseClasses} bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300`}>Late</span>;
    if (status === "leave") return <span className={`${baseClasses} bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300`}>Leave</span>;
    return <span className={`${baseClasses} bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300`}>{status}</span>;
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (!employeeId) {
    return <div className="text-slate-500 dark:text-slate-400">No employee selected.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Statistics Card */}
      {statistics && showAbsentDays && (
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl p-6 mb-6 border border-cyan-200 dark:border-cyan-800">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-lg font-semibold text-cyan-700 dark:text-cyan-300">Attendance Summary</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{statistics.totalWorkingDays}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Working Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{statistics.presentDays}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Present Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{statistics.absentDays}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Absent Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{statistics.attendancePercentage}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Attendance Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Joining Date Notice */}
      {effectiveDateRange && effectiveDateRange.requestedStartDate !== effectiveDateRange.effectiveStartDate && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-blue-800 dark:text-blue-200 font-medium">Date range adjusted</p>
              <p className="text-blue-700 dark:text-blue-300">
                Attendance records are shown from employee's joining date ({new Date(effectiveDateRange.joiningDate).toLocaleDateString()}) onwards.
                Requested start date was {new Date(effectiveDateRange.requestedStartDate).toLocaleDateString()}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showAbsentDays}
              onChange={(e) => {
                setShowAbsentDays(e.target.checked);
                setCurrentPage(1);
              }}
              className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show absent days</span>
          </label>
          
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
          >
            <option value="all">All Status</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="half-day">Half Day</option>
            <option value="late">Late</option>
            <option value="leave">Leave</option>
          </select>
          
          <button
            onClick={() => {
              setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700 transition-colors"
          >
            Date {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
        </div>
        
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {totalRecords} total records
          {joiningDate && (
            <span className="ml-2 text-xs text-gray-400">
              (Since {new Date(joiningDate).toLocaleDateString()})
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center space-x-2 text-gray-500 dark:text-slate-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600"></div>
            <span>Loading attendance records...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-700">
                <tr>
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Date</th>
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Status</th>
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Check In</th>
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Check Out</th>
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Work Hours</th>
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {attendanceData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                      <p className="text-lg font-medium">No attendance records found</p>
                      <p className="text-sm">Try adjusting your filters or date range</p>
                    </td>
                  </tr>
                ) : attendanceData.map((record, index) => (
                  <tr 
                    key={record._id || index} 
                    className={`hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors ${
                      record.status === 'absent' ? 'bg-red-50 dark:bg-red-900/10' : ''
                    }`}
                  >
                    <td className="p-3">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(record.status, record.checkIn, record.checkOut)}
                        <span className="font-medium">{formatDate(record.date)}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      {getStatusBadge(record.status, record.checkIn, record.checkOut)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="font-mono">{formatTime(record.checkIn)}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="font-mono">{formatTime(record.checkOut)}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold">
                        {record.workHours ? `${record.workHours.toFixed(1)}h` : "—"}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => onEditAttendance && onEditAttendance(record)}
                        className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {attendanceData.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-lg font-medium">No attendance records found</p>
                <p className="text-sm">Try adjusting your filters or date range</p>
              </div>
            ) : attendanceData.map((record, index) => (
              <div 
                key={record._id || index} 
                className={`bg-gray-50 dark:bg-slate-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 ${
                  record.status === 'absent' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(record.status, record.checkIn, record.checkOut)}
                    <span className="font-medium text-gray-900 dark:text-gray-100">{formatDate(record.date)}</span>
                  </div>
                  {getStatusBadge(record.status, record.checkIn, record.checkOut)}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Check In:</span>
                    <p className="font-mono text-gray-900 dark:text-gray-100">{formatTime(record.checkIn)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Check Out:</span>
                    <p className="font-mono text-gray-900 dark:text-gray-100">{formatTime(record.checkOut)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Work Hours:</span>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {record.workHours ? `${record.workHours.toFixed(1)}h` : "—"}
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={() => onEditAttendance && onEditAttendance(record)}
                      className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors w-full"
                    >
                      Edit Attendance
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-4 mt-8">
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              
              <div className="flex space-x-2">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else {
                    const start = Math.max(1, currentPage - 2);
                    const end = Math.min(totalPages, start + 4);
                    pageNum = start + i;
                    if (pageNum > end) return null;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 border rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? 'bg-cyan-600 text-white border-cyan-600'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [attendanceUpdateTrigger, setAttendanceUpdateTrigger] = useState(0);

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
        // Note: Attendance will now be fetched directly by the AttendanceTable component
        // This ensures it uses the correct API with absent days and proper filtering
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
  }, [selectedEmployeeId]);

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

  const handleEditAttendance = (record) => {
    setEditingRecord(record);
    setEditModalOpen(true);
  };

  const handleAttendanceUpdate = () => {
    setAttendanceUpdateTrigger(prev => prev + 1);
    setEditModalOpen(false);
    setEditingRecord(null);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      {/* Sidebar: Employee List */}
      <div className="w-full lg:w-80 lg:h-screen lg:sticky lg:top-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 lg:sticky lg:top-0 bg-white dark:bg-slate-800 z-10">
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors"
          />
        </div>
        <div className="flex-grow overflow-y-auto max-h-96 lg:max-h-none">
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
      <div className="flex-1 lg:overflow-y-auto p-6 lg:p-8">
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
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 lg:p-8">
            <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 text-sm">
              {/* Contact & Work Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-cyan-600 dark:text-cyan-400 mb-2">Contact & Work</h3>
                <p><strong>Email:</strong> {employeeProfile.email}</p>
                <p><strong>Phone:</strong> {employeeProfile.phone}</p>
                <p><strong>Employee ID:</strong> {employeeProfile.employeeId}</p>
                <p><strong>Company:</strong> {employeeProfile.companyName || 'N/A'}</p>
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
              <h3 className="text-xl font-semibold text-cyan-700 dark:text-cyan-300 mb-4">Attendance Records</h3>
              <AttendanceTable 
                employeeId={employeeProfile?.employeeId} 
                dateRange={dateRange} 
                onEditAttendance={handleEditAttendance}
                updateTrigger={attendanceUpdateTrigger}
              />
            </div>

            {/* Enhanced Leave Requests Section */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-semibold text-cyan-700 dark:text-cyan-300 mb-4">Leave Management</h3>
              <LeaveRequestsTable leaves={leaves} employeeProfile={employeeProfile} />
            </div>
          </div>
        ) : null}

        {/* Edit Attendance Modal */}
        <EditAttendanceModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          record={editingRecord}
          employeeProfile={employeeProfile}
          onUpdate={handleAttendanceUpdate}
        />
      </div>
    </div>
  );
} 