import React, { useEffect, useState } from 'react';
import apiClient from '../../../service/apiClient';
import { CheckCircle, AlertCircle, XCircle, BarChart3, Clock, ChevronLeft, ChevronRight, Calendar, Edit3, X, Save, MapPin, Eye } from 'lucide-react';
import LocationMapModal from '../../ui/LocationMapModal';
import { formatTime, formatDate } from '../../../utils/istUtils';

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

// Enhanced Attendance Analytics Component - Use backend statistics only
const AttendanceAnalytics = ({ attendance, statistics, dateRange }) => {
  // Always use API-provided statistics - no fallback calculations
  const stats = statistics;

  if (!stats) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-8 text-center">
        <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">No attendance data available</p>
        <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Select a date range to view analytics</p>
      </div>
    );
  }

  // Calculate working days from backend statistics  
  const workingDays = stats.total - (stats.weekend || 0) - (stats.holiday || 0);
  
  const analyticsCards = [
    {
      title: 'Working Days',
      value: workingDays,
      icon: Calendar,
      color: 'cyan',
      bgGradient: 'from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/30',
      borderColor: 'border-cyan-200 dark:border-cyan-700',
      textColor: 'text-cyan-600 dark:text-cyan-400',
      iconColor: 'text-cyan-500',
      progress: 100
    },
    {
      title: 'Present Days',
      value: stats.present || 0,
      icon: CheckCircle,
      color: 'emerald',
      bgGradient: 'from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30',
      borderColor: 'border-emerald-200 dark:border-emerald-700',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      iconColor: 'text-emerald-500',
      progress: workingDays > 0 ? ((stats.present || 0) / workingDays) * 100 : 0,
      subtitle: workingDays > 0 ? `${(((stats.present || 0) / workingDays) * 100).toFixed(1)}% attendance` : '0% attendance'
    },
    {
      title: 'Absent Days',
      value: stats.absent || 0,
      icon: XCircle,
      color: 'red',
      bgGradient: 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30',
      borderColor: 'border-red-200 dark:border-red-700',
      textColor: 'text-red-600 dark:text-red-400',
      iconColor: 'text-red-500',
      progress: workingDays > 0 ? ((stats.absent || 0) / workingDays) * 100 : 0
    },
    {
      title: 'Half Days',
      value: stats.halfDay || 0,
      icon: AlertCircle,
      color: 'amber',
      bgGradient: 'from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30',
      borderColor: 'border-amber-200 dark:border-amber-700',
      textColor: 'text-amber-600 dark:text-amber-400',
      iconColor: 'text-amber-500',
      progress: workingDays > 0 ? ((stats.halfDay || 0) / workingDays) * 100 : 0
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Analytics Cards - Fixed Layout */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {analyticsCards.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <div
              key={index}
              className={`bg-gradient-to-br ${card.bgGradient} p-4 rounded-2xl shadow-lg ${card.borderColor} border-2 transition-all duration-300 hover:shadow-xl hover:scale-105 group min-h-[120px]`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                    {card.title}
                  </p>
                  <p className={`text-2xl font-bold ${card.textColor} truncate`}>
                    {card.value}
                  </p>
                  {card.subtitle && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">
                      {card.subtitle}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 ml-2">
                  <div className={`p-3 rounded-xl bg-white/50 dark:bg-black/20 ${card.iconColor} group-hover:scale-110 transition-transform duration-200`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${card.color === 'cyan' ? 'from-cyan-400 to-cyan-500' : 
                      card.color === 'emerald' ? 'from-emerald-400 to-emerald-500' :
                      card.color === 'red' ? 'from-red-400 to-red-500' :
                      card.color === 'amber' ? 'from-amber-400 to-amber-500' :
                      'from-purple-400 to-purple-500'
                    } rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${Math.min(card.progress, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Stats Row - Fixed Layout */}
      {(stats.weekend > 0 || stats.holiday > 0 || stats.leave > 0 || stats.late > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.weekend > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 min-h-[80px]">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Weekends</p>
                  <p className="text-xl font-bold text-gray-700 dark:text-gray-300">{stats.weekend}</p>
                </div>
                <Calendar className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          )}
          {stats.holiday > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-700 min-h-[80px]">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Holidays</p>
                  <p className="text-xl font-bold text-orange-700 dark:text-orange-300">{stats.holiday}</p>
                </div>
                <Calendar className="w-5 h-5 text-orange-500" />
              </div>
            </div>
          )}
          {stats.leave > 0 && (
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-700 min-h-[80px]">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Leave Days</p>
                  <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{stats.leave}</p>
                </div>
                <Calendar className="w-5 h-5 text-purple-500" />
              </div>
            </div>
          )}
          {stats.late > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-700 min-h-[80px]">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Late Days</p>
                  <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">{stats.late}</p>
                </div>
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
            </div>
          )}
        </div>
      )}
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
        
        // Use the record date to ensure we're working with the correct date
        const recordDate = new Date(record.date);
        // Format as YYYY-MM-DD using local time components to avoid timezone issues
        const year = recordDate.getFullYear();
        const month = String(recordDate.getMonth() + 1).padStart(2, '0');
        const day = String(recordDate.getDate()).padStart(2, '0');
        const baseDate = `${year}-${month}-${day}`;
        
        if (date) {
          // Convert existing date to local time for display
          const existingDate = new Date(date);
          const hours = existingDate.getHours().toString().padStart(2, '0');
          const minutes = existingDate.getMinutes().toString().padStart(2, '0');
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
    // Format as YYYY-MM-DD using local time components to avoid timezone issues
    const year = recordDate.getFullYear();
    const month = String(recordDate.getMonth() + 1).padStart(2, '0');
    const day = String(recordDate.getDate()).padStart(2, '0');
    const baseDate = `${year}-${month}-${day}`;
    
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

// Enhanced Attendance Table with sliding window pagination (optimized like AdminAttendanceTable)
const AttendanceTable = ({ employeeId, employeeProfile: passedEmployeeProfile, dateRange, onDateRangeChange, onEditAttendance, updateTrigger }) => {
  // Core data states
  const [allAttendanceData, setAllAttendanceData] = useState([]); // Pre-loaded data for entire range
  const [displayedData, setDisplayedData] = useState([]); // Current window of data
  const [loading, setLoading] = useState(false);
  const [currentWindowIndex, setCurrentWindowIndex] = useState(0); // Index for sliding window
  const [statistics, setStatistics] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [joiningDate, setJoiningDate] = useState(null);
  const [effectiveDateRange, setEffectiveDateRange] = useState(null);
  const [holidays, setHolidays] = useState([]);
  
  // Bulk selection state
  const [selectedRecords, setSelectedRecords] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState('present');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  
  // Location modal state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocationRecord, setSelectedLocationRecord] = useState(null);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  
  // Enhanced error handling states
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [bulkError, setBulkError] = useState(null);
  const [holidaysError, setHolidaysError] = useState(null);
  const maxRetries = 3;

  const recordsPerPage = 7;

  // Enhanced fetch holidays with error handling
  const fetchHolidays = async (retryAttempt = 0) => {
    try {
      setHolidaysError(null);
      const response = await apiClient.getHolidays();
      if (response.success) {
        setHolidays(response.data || []);
      } else {
        throw new Error(response.message || 'Failed to fetch holidays');
      }
    } catch (err) {
      console.error("Failed to fetch holidays:", err);
      setHolidaysError(`Failed to load holidays: ${err.message}`);
      setHolidays([]);
      
      // Auto-retry for network errors
      if (retryAttempt < 2 && (err.name === 'NetworkError' || err.code === 'NETWORK_ERROR')) {
        setTimeout(() => fetchHolidays(retryAttempt + 1), 1000 * (retryAttempt + 1));
      }
    }
  };

  // Pre-load all attendance data for the entire date range (like AdminAttendanceTable)
  const fetchAllAttendanceData = async () => {
    if (!employeeId) return;
    
    setLoading(true);
    try {
      // Always use the API that includes absent days
      const response = await apiClient.getEmployeeAttendanceWithAbsents({
        employeeId: employeeId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      
      if (response.success) {
        const allRecords = response.data.records || [];
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
        
        // Process and store all data with proper status prioritization
        const processedRecords = allRecords.map(record => {
          // Determine the proper status based on flags - prioritize holiday > weekend > leave over absent
          let finalStatus = record.status || 'absent';
          if (record.flags?.isHoliday) {
            finalStatus = 'holiday';
          } else if (record.flags?.isWeekend) {
            finalStatus = 'weekend';
          } else if (record.flags?.isLeave || record.status === 'leave') {
            finalStatus = 'leave';
          }
          
          return {
            ...record,
            status: finalStatus,
            date: new Date(record.date),
            checkIn: record.checkIn ? new Date(record.checkIn) : null,
            checkOut: record.checkOut ? new Date(record.checkOut) : null,
            location: record.location && record.location.latitude && record.location.longitude ? {
              latitude: parseFloat(record.location.latitude),
              longitude: parseFloat(record.location.longitude)
            } : null,
            flags: record.flags || {},
            holidayTitle: record.holidayTitle || (record.flags?.isHoliday ? 'Holiday' : undefined)
          };
        });
        
        setAllAttendanceData(processedRecords);
        
        // Initialize with first window
        updateCurrentWindow(processedRecords, 0, statusFilter, sortOrder);
      }
    } catch (err) {
      console.error("Failed to fetch attendance data:", err);
      setAllAttendanceData([]);
      setDisplayedData([]);
    } finally {
      setLoading(false);
    }
  };

  // Update current window based on filters and sort order (no API call needed)
  const updateCurrentWindow = (data = allAttendanceData, windowIndex = currentWindowIndex, filter = statusFilter, order = sortOrder) => {
    let filteredData = [...data];
    
    // Apply status filter
    if (filter !== 'all') {
      filteredData = filteredData.filter(record => record.status === filter);
    }
    
    // Sort records by date
    const sortedRecords = filteredData.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return order === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    // Calculate window
    const startIndex = windowIndex * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const windowData = sortedRecords.slice(startIndex, endIndex);
    
    setDisplayedData(windowData);
    setCurrentWindowIndex(windowIndex);
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  useEffect(() => {
    fetchAllAttendanceData();
  }, [dateRange, employeeId, updateTrigger]);

  // Update window when filters change (no API call)
  useEffect(() => {
    if (allAttendanceData.length > 0) {
      updateCurrentWindow(allAttendanceData, 0, statusFilter, sortOrder); // Reset to first page
    }
  }, [statusFilter, sortOrder, allAttendanceData]);

  // Use IST utils for consistent timezone display
  const formatTimeLocal = (date) => {
    if (!date) return "—";
    return formatTime(new Date(date));
  };

  const formatDateLocal = (date) => {
    if (!date) return "—";
    return formatDate(new Date(date), true); // dd-mm-yy format
  };

  const formatDayOfWeek = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[new Date(date).getDay()];
  };

  const getStatusIcon = (record) => {
    const { status, checkIn, checkOut, flags } = record;
    
    // Enhanced icons with better visual hierarchy
    if (status === "weekend") return <Calendar className="w-5 h-5 text-slate-400" />;
    if (status === "holiday") return <Calendar className="w-5 h-5 text-orange-500" />;
    if (status === "leave") return <Calendar className="w-5 h-5 text-purple-500" />;
    
    if (status === "present") {
      if (flags?.isLate) {
        return <Clock className="w-5 h-5 text-amber-500" />; // Late arrival
      }
      if (checkIn && checkOut) {
        return <CheckCircle className="w-5 h-5 text-emerald-500" />; // Complete day
      }
      if (checkIn && !checkOut) {
        return <AlertCircle className="w-5 h-5 text-amber-500" />; // Incomplete
      }
    }
    
    if (status === "half-day") return <AlertCircle className="w-5 h-5 text-blue-500" />;
    if (status === "absent") return <XCircle className="w-5 h-5 text-red-500" />;
    
    return <AlertCircle className="w-5 h-5 text-slate-400" />;
  };

  const getStatusBadge = (record) => {
    const { status, checkIn, checkOut, flags, holidayTitle } = record;
    const baseClasses = "inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm border transition-all duration-200 hover:shadow-md min-w-[90px] justify-center";
    
    // Enhanced badges with better styling
    if (status === "weekend") {
      return (
        <span className={`${baseClasses} bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600`}>
          Weekend
        </span>
      );
    }
    
    if (status === "holiday") {
      return (
        <span className={`${baseClasses} bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700`} title={holidayTitle}>
          {holidayTitle || 'Holiday'}
        </span>
      );
    }
    
    if (status === "leave") {
      return (
        <span className={`${baseClasses} bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700`}>
          Leave
        </span>
      );
    }
    
    if (status === "present") {
      if (flags?.isLate) {
        return (
          <span className={`${baseClasses} bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700`}>
            Late Arrival
          </span>
        );
      }
      if (checkIn && checkOut) {
        return (
          <span className={`${baseClasses} bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700`}>
            Complete
          </span>
        );
      }
      if (checkIn && !checkOut) {
        return (
          <span className={`${baseClasses} bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700`}>
            Incomplete
          </span>
        );
      }
    }
    
    if (status === "half-day") {
      return (
        <span className={`${baseClasses} bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700`}>
          Half Day
        </span>
      );
    }
    
    if (status === "absent") {
      return (
        <span className={`${baseClasses} bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700`}>
          Absent
        </span>
      );
    }
    
    return (
      <span className={`${baseClasses} bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600`}>
        Unknown
      </span>
    );
  };

  // Navigate pages without API calls (sliding window)
  const handlePageChange = (newPage) => {
    const totalPages = Math.ceil(getFilteredDataLength() / recordsPerPage);
    if (newPage >= 1 && newPage <= totalPages) {
      updateCurrentWindow(allAttendanceData, newPage - 1, statusFilter, sortOrder);
    }
  };

  // Get total length of filtered data for pagination
  const getFilteredDataLength = () => {
    let filteredData = [...allAttendanceData];
    if (statusFilter !== 'all') {
      filteredData = filteredData.filter(record => record.status === statusFilter);
    }
    return filteredData.length;
  };

  // Calculate pagination info
  const totalRecords = getFilteredDataLength();
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const currentPage = currentWindowIndex + 1;

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
    const hasLoc = record?.location?.latitude && record?.location?.longitude &&
           !isNaN(parseFloat(record.location.latitude)) && !isNaN(parseFloat(record.location.longitude));
    
    // Debug logging to help identify location issues
    if (!hasLoc && record?.checkIn) {
      console.log('Missing location for record:', {
        id: record._id,
        date: record.date,
        location: record.location,
        hasCheckIn: !!record.checkIn
      });
    }
    
    return hasLoc;
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
      const allIndices = new Set(displayedData.map((_, index) => index));
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
        const record = displayedData[index];
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
      fetchAllAttendanceData(); // Refresh the data
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
      {/* Enhanced Analytics */}
      <AttendanceAnalytics 
        attendance={allAttendanceData} 
        statistics={statistics}
        dateRange={dateRange}
      />


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
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
          >
            <option value="all">All Status</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="half-day">Half Day</option>
            <option value="weekend">Weekend</option>
            <option value="holiday">Holiday</option>
            <option value="leave">Leave</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
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

      {/* Enhanced Loading State */}
      {loading ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-100 to-cyan-200 dark:from-cyan-900/30 dark:to-cyan-800/30 rounded-2xl">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-cyan-600 border-t-transparent"></div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Loading Attendance Records</h3>
              <p className="text-slate-500 dark:text-slate-400">Please wait while we fetch the latest data...</p>
            </div>
            
            {/* Loading skeleton */}
            <div className="space-y-3 mt-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex space-x-4">
                  <div className="rounded-full bg-slate-200 dark:bg-slate-700 h-12 w-12"></div>
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
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
                        checked={selectedRecords.size === displayedData.length && displayedData.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                      />
                    </th>
                  )}
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Date</th>
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Day</th>
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Status</th>
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Check In</th>
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Check Out</th>
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Location</th>
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {displayedData.length === 0 ? (
                  <tr>
                    <td colSpan={showBulkActions ? 8 : 7} className="py-16">
                      <div className="text-center space-y-4">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl">
                          <Calendar className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">No Records Found</h3>
                          <p className="text-slate-500 dark:text-slate-400">No attendance records match your current filters</p>
                          <p className="text-sm text-slate-400 dark:text-slate-500">Try adjusting your date range or status filters</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : displayedData.map((record, index) => (
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
                        {getStatusIcon(record)}
                        <div>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{formatDateLocal(record.date)}</span>
                          {record.flags?.isLate && (
                            <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">Late</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-slate-600 dark:text-slate-400">{formatDayOfWeek(record.date)}</span>
                    </td>
                    <td className="p-3">
                      {getStatusBadge(record)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="font-mono">{formatTimeLocal(record.checkIn)}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="font-mono">{formatTimeLocal(record.checkOut)}</span>
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
            {displayedData.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 border border-slate-200 dark:border-slate-700">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl">
                    <Calendar className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">No Records Found</h3>
                    <p className="text-slate-500 dark:text-slate-400">No attendance records match your current filters</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500">Try adjusting your date range or status filters</p>
                  </div>
                </div>
              </div>
            ) : displayedData.map((record, index) => (
              <div 
                key={record._id || index} 
                className={`bg-gray-50 dark:bg-slate-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 ${
                  record.status === 'absent' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(record)}
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatDateLocal(record.date)}</span>
                      <div className="text-sm font-medium text-slate-600 dark:text-slate-400">{formatDayOfWeek(record.date)}</div>
                      {record.flags?.isLate && (
                        <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">Late Arrival</div>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(record)}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Check In:</span>
                    <p className="font-mono text-gray-900 dark:text-gray-100">{formatTimeLocal(record.checkIn)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Check Out:</span>
                    <p className="font-mono text-gray-900 dark:text-gray-100">{formatTimeLocal(record.checkOut)}</p>
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