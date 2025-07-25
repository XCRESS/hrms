import React, { useEffect, useState } from 'react';
import apiClient from '../../../service/apiClient';
import { CheckCircle, AlertCircle, XCircle, BarChart3, Clock, ChevronLeft, ChevronRight, Calendar, Edit3, X, Save, MapPin, Eye } from 'lucide-react';
import LocationMapModal from '../../ui/LocationMapModal';

// Custom Time Input Component with AM/PM support
const TimeInput = ({ value, onChange, className }) => {
  const [timeState, setTimeState] = useState({
    hour: '',
    minute: '',
    period: 'AM'
  });

  // Convert datetime-local value to 12-hour format
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      let hour = date.getHours();
      const minute = date.getMinutes();
      const period = hour >= 12 ? 'PM' : 'AM';
      
      if (hour > 12) hour -= 12;
      if (hour === 0) hour = 12;
      
      setTimeState({
        hour: hour.toString().padStart(2, '0'),
        minute: minute.toString().padStart(2, '0'),
        period
      });
    } else {
      setTimeState({ hour: '', minute: '', period: 'AM' });
    }
  }, [value]);

  const handleTimeChange = (field, newValue) => {
    const newTimeState = { ...timeState, [field]: newValue };
    setTimeState(newTimeState);
    
    if (newTimeState.hour && newTimeState.minute) {
      // Convert back to datetime-local format
      let hour24 = parseInt(newTimeState.hour);
      if (newTimeState.period === 'AM' && hour24 === 12) hour24 = 0;
      if (newTimeState.period === 'PM' && hour24 !== 12) hour24 += 12;
      
      const baseDate = value ? value.split('T')[0] : new Date().toISOString().split('T')[0];
      const datetimeValue = `${baseDate}T${hour24.toString().padStart(2, '0')}:${newTimeState.minute}:00`;
      onChange(datetimeValue);
    } else if (!newTimeState.hour && !newTimeState.minute) {
      // Clear the value if both hour and minute are empty
      onChange('');
    }
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <div className={`flex gap-2 ${className}`}>
      <select
        value={timeState.hour}
        onChange={(e) => handleTimeChange('hour', e.target.value)}
        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
      >
        <option value="">HH</option>
        {hours.map(hour => (
          <option key={hour} value={hour}>{hour}</option>
        ))}
      </select>
      <span className="flex items-center text-slate-500">:</span>
      <select
        value={timeState.minute}
        onChange={(e) => handleTimeChange('minute', e.target.value)}
        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
      >
        <option value="">MM</option>
        {minutes.map(minute => (
          <option key={minute} value={minute}>{minute}</option>
        ))}
      </select>
      <select
        value={timeState.period}
        onChange={(e) => handleTimeChange('period', e.target.value)}
        className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
      {value && (
        <button
          type="button"
          onClick={() => {
            setTimeState({ hour: '', minute: '', period: 'AM' });
            onChange('');
          }}
          className="px-2 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          title="Clear time"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// Enhanced Attendance Analytics Component
const AttendanceAnalytics = ({ attendance }) => {
  const calculateAttendanceStats = () => {
    if (!attendance || attendance.length === 0) return null;

    const presentDays = attendance.filter(rec => rec.status === 'present').length;
    const absentDays = attendance.filter(rec => rec.status === 'absent').length;
    const lateDays = attendance.filter(rec => {
      if (rec.checkIn) {
        const checkInTime = new Date(rec.checkIn);
        const checkInHour = checkInTime.getHours();
        const checkInMinutes = checkInTime.getMinutes();
        const checkInDecimal = checkInHour + (checkInMinutes / 60);
        return checkInDecimal > 9.9167; // Late after 9:55 AM (9 hours 55 minutes)
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
      const formatTimeForInput = (date, defaultTime) => {
        if (!date && !defaultTime) return '';
        
        const recordDate = new Date(record.date);
        const baseDate = recordDate.toISOString().split('T')[0];
        
        if (date) {
          // Convert existing UTC date to local time for display
          const localDate = new Date(date);
          const hours = localDate.getHours().toString().padStart(2, '0');
          const minutes = localDate.getMinutes().toString().padStart(2, '0');
          return `${baseDate}T${hours}:${minutes}`;
        } else if (defaultTime) {
          return `${baseDate}T${defaultTime}`;
        }
        return '';
      };

      setFormData({
        status: record.status || 'present',
        checkIn: formatTimeForInput(record.checkIn, '09:30'),
        checkOut: formatTimeForInput(record.checkOut, '17:30')
      });
      setError('');
    }
  }, [record, isOpen]);

  const handleStatusChange = (status) => {
    const recordDate = new Date(record?.date || new Date());
    const baseDate = recordDate.toISOString().split('T')[0];
    
    setFormData(prev => {
      const newData = { ...prev, status };
      
      // Only auto-fill times if they are currently empty or for specific status changes
      switch (status) {
        case 'present':
          if (!newData.checkIn) newData.checkIn = `${baseDate}T09:30`;
          if (!newData.checkOut) newData.checkOut = `${baseDate}T17:30`;
          break;
        case 'half-day':
          if (!newData.checkIn) newData.checkIn = `${baseDate}T09:30`;
          // Always set checkout for half-day
          newData.checkOut = `${baseDate}T13:30`;
          break;
        case 'late':
          // Always set checkin for late
          newData.checkIn = `${baseDate}T10:00`;
          if (!newData.checkOut) newData.checkOut = `${baseDate}T17:30`;
          break;
        case 'absent':
          newData.checkIn = '';
          newData.checkOut = '';
          break;
      }
      
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const updateData = {
        status: formData.status,
        checkIn: formData.checkIn ? new Date(formData.checkIn).toISOString() : null,
        checkOut: formData.checkOut ? new Date(formData.checkOut).toISOString() : null
      };

      // For non-absent status, ensure we have valid times
      if (formData.status !== 'absent') {
        if (!updateData.checkIn) {
          setError('Check-in time is required for non-absent status');
          setLoading(false);
          return;
        }
        // For present status, if no checkout is provided, keep the existing one or set null
        if (formData.status === 'present' && !updateData.checkOut && record?.checkOut) {
          updateData.checkOut = new Date(record.checkOut).toISOString();
        }
      }

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
                <TimeInput
                  value={formData.checkIn}
                  onChange={(value) => setFormData(prev => ({ ...prev, checkIn: value }))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Check Out Time
                </label>
                <TimeInput
                  value={formData.checkOut}
                  onChange={(value) => setFormData(prev => ({ ...prev, checkOut: value }))}
                  className="w-full"
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
const AttendanceTable = ({ employeeId, employeeProfile: passedEmployeeProfile, dateRange, onDateRangeChange, onEditAttendance, updateTrigger }) => {
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
  
  // Bulk selection state
  const [selectedRecords, setSelectedRecords] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState('present');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  
  // Location modal state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocationRecord, setSelectedLocationRecord] = useState(null);
  const [employeeProfile, setEmployeeProfile] = useState(null);

  const recordsPerPage = 7;

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
          
          // Store employee profile and joining date info
          if (response.data.employee && !passedEmployeeProfile) {
            setEmployeeProfile(response.data.employee);
          }
          const currentEmployeeProfile = passedEmployeeProfile || response.data.employee;
          if (currentEmployeeProfile?.joiningDate) {
            setJoiningDate(currentEmployeeProfile.joiningDate);
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
            checkOut: record.checkOut ? new Date(record.checkOut) : null,
            // Preserve location data
            location: record.location || null
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
            checkOut: record.checkOut ? new Date(record.checkOut) : null,
            // Preserve location data
            location: record.location || null
          })));
          
          setTotalRecords(response.data.total || sortedRecords.length);
          setTotalPages(Math.ceil((response.data.total || sortedRecords.length) / recordsPerPage));
        }
      }
    } catch (err) {
      console.error("Failed to fetch attendance data:", err);
      console.error("Error details:", {
        message: err.message,
        employeeId,
        dateRange,
        showAbsentDays,
        statusFilter
      });
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
    return new Intl.DateTimeFormat('en-US', { 
      hour: '2-digit', minute: '2-digit', hour12: true 
    }).format(new Date(date));
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

  // Location handling functions
  const handleViewLocation = (record) => {
    try {
      console.log("Opening location modal for record:", {
        recordId: record._id,
        date: record.date,
        hasLocation: !!record.location,
        location: record.location
      });
      
      setSelectedLocationRecord(record);
      setShowLocationModal(true);
    } catch (err) {
      console.error("Failed to open location modal:", err);
      console.error("Record data:", record);
    }
  };

  const closeLocationModal = () => {
    setShowLocationModal(false);
    setSelectedLocationRecord(null);
  };

  const hasValidLocation = (record) => {
    return record?.location?.latitude && record?.location?.longitude &&
           !isNaN(record.location.latitude) && !isNaN(record.location.longitude);
  };

  // Bulk selection handlers
  const handleSelectRecord = (recordIndex, isSelected) => {
    const newSelected = new Set(selectedRecords);
    if (isSelected) {
      newSelected.add(recordIndex);
    } else {
      newSelected.delete(recordIndex);
    }
    setSelectedRecords(newSelected);
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      const allIndices = new Set(attendanceData.map((_, index) => index));
      setSelectedRecords(allIndices);
    } else {
      setSelectedRecords(new Set());
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedRecords.size === 0) return;
    
    setBulkLoading(true);
    try {
      const promises = Array.from(selectedRecords).map(async (index) => {
        const record = attendanceData[index];
        const updateData = {
          status: bulkStatus,
          employeeId: employeeId,
          date: record.date
        };

        // Auto-fill times based on status (IST times)
        const baseDate = record.date.toISOString().split('T')[0];
        switch (bulkStatus) {
          case 'present':
            updateData.checkIn = `${baseDate}T09:30:00`;
            updateData.checkOut = `${baseDate}T17:30:00`;
            break;
          case 'half-day':
            updateData.checkIn = `${baseDate}T09:30:00`;
            updateData.checkOut = `${baseDate}T13:30:00`;
            break;
          case 'absent':
            updateData.checkIn = null;
            updateData.checkOut = null;
            break;
        }

        if (record._id) {
          return await apiClient.updateAttendanceRecord(record._id, updateData);
        } else {
          return await apiClient.updateAttendanceRecord('new', updateData);
        }
      });

      await Promise.all(promises);
      
      // Reset selections and refresh data
      setSelectedRecords(new Set());
      setShowBulkActions(false);
      fetchAttendance(currentPage);
    } catch (err) {
      console.error('Failed to bulk update attendance:', err);
      alert('Failed to update attendance records. Please try again.');
    } finally {
      setBulkLoading(false);
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

      {/* Bulk Actions */}
      {selectedRecords.size > 0 && (
        <div className="mb-4 p-4 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
                {selectedRecords.size} record{selectedRecords.size > 1 ? 's' : ''} selected
              </span>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="px-3 py-2 border border-cyan-300 dark:border-cyan-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
              >
                <option value="present">Mark as Present</option>
                <option value="absent">Mark as Absent</option>
                <option value="half-day">Mark as Half Day</option>
              </select>
              <button
                onClick={handleBulkStatusUpdate}
                disabled={bulkLoading}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                {bulkLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  'Update Selected'
                )}
              </button>
            </div>
            <button
              onClick={() => setSelectedRecords(new Set())}
              className="px-3 py-2 text-sm text-cyan-600 hover:text-cyan-700 transition-colors"
            >
              Clear Selection
            </button>
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
          
          <button
            onClick={() => {
              setShowBulkActions(!showBulkActions);
              setSelectedRecords(new Set());
            }}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              showBulkActions 
                ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                : 'bg-slate-600 hover:bg-slate-700 text-white'
            }`}
          >
            {showBulkActions ? 'Cancel Bulk' : 'Bulk Select'}
          </button>
          
          {/* Date Range Selector */}
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">From:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => onDateRangeChange(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
            />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">To:</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => onDateRangeChange(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
            />
          </div>
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
                  {showBulkActions && (
                    <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={selectedRecords.size === attendanceData.length && attendanceData.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                      />
                    </th>
                  )}
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Date</th>
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Status</th>
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Check In</th>
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Check Out</th>
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Location</th>
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {attendanceData.length === 0 ? (
                  <tr>
                    <td colSpan={showBulkActions ? 7 : 6} className="text-center py-12 text-gray-500 dark:text-gray-400">
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
                    {showBulkActions && (
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedRecords.has(index)}
                          onChange={(e) => handleSelectRecord(index, e.target.checked)}
                          className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                      </td>
                    )}
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
                      <div className="flex items-center space-x-2">
                        {hasValidLocation(record) ? (
                          <>
                            <MapPin className="w-4 h-4 text-green-500" />
                            <button
                              onClick={() => handleViewLocation(record)}
                              className="flex items-center space-x-1 px-2 py-1 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-300 rounded-lg text-xs transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-sm flex items-center space-x-1">
                            <MapPin className="w-4 h-4" />
                            <span>Not found</span>
                          </span>
                        )}
                      </div>
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
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Location:</span>
                    <div className="mt-1">
                      {hasValidLocation(record) ? (
                        <button
                          onClick={() => handleViewLocation(record)}
                          className="flex items-center space-x-1 px-2 py-1 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-300 rounded-lg text-xs transition-colors"
                        >
                          <MapPin className="w-3 h-3" />
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-sm flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span>Not found</span>
                        </span>
                      )}
                    </div>
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

      {/* Location Map Modal */}
      <LocationMapModal
        isOpen={showLocationModal}
        onClose={closeLocationModal}
        attendanceRecord={selectedLocationRecord}
        employeeProfile={passedEmployeeProfile || employeeProfile}
      />
    </div>
  );
};

// Main Attendance Section Component that combines all attendance-related components
const AttendanceSection = ({ employeeProfile, dateRange, onDateRangeChange, onEditAttendance, updateTrigger }) => {
  return (
    <div className="space-y-6">
      <AttendanceTable 
        employeeId={employeeProfile?.employeeId} 
        employeeProfile={employeeProfile}
        dateRange={dateRange} 
        onDateRangeChange={onDateRangeChange}
        onEditAttendance={onEditAttendance}
        updateTrigger={updateTrigger}
      />
    </div>
  );
};

// Export individual components for flexibility and the main AttendanceSection
export { AttendanceAnalytics, EditAttendanceModal, AttendanceTable };
export default AttendanceSection; 