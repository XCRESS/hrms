import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, Users, UserCheck, UserX, ChevronLeft, ChevronRight, Heart, Edit3, X, Save } from 'lucide-react';
import apiClient from '@/service/apiClient';

// Custom Time Input Component with AM/PM support
const TimeInput = ({ value, onChange, className, placeholder }) => {
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
      
      // Get the base date from the existing value to preserve the correct attendance date
      let baseDate;
      if (value) {
        baseDate = value.split('T')[0];
      } else {
        // If no existing value, we should not default to today's date - this should come from the record date
        console.warn('No base date available for time input');
        baseDate = new Date().toISOString().split('T')[0];
      }
      
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
                  placeholder="Select check-in time"
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
                  placeholder="Select check-out time"
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

const AdminAttendanceTable = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [monthlyAttendanceData, setMonthlyAttendanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, leave: 0, weekend: 0 });
  const [allWorkingDays, setAllWorkingDays] = useState([]);
  const [currentWindowIndex, setCurrentWindowIndex] = useState(0); // Index for sliding window
  const [selectedMonth, setSelectedMonth] = useState(new Date()); // Current selected month
  const [workingDays, setWorkingDays] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);


  // Get the current 4-day window from all working days
  const getCurrentWindow = () => {
    if (allWorkingDays.length === 0) return [];
    
    // Calculate the start index for the current window
    // We want to show the last 4 working days by default (index 0)
    const maxStartIndex = Math.max(0, allWorkingDays.length - 4);
    const startIndex = Math.max(0, maxStartIndex - currentWindowIndex);
    const endIndex = Math.min(startIndex + 4, allWorkingDays.length);
    
    return allWorkingDays.slice(startIndex, endIndex);
  };

  // Fetch entire month's attendance data once
  const fetchMonthlyAttendanceData = useCallback(async (monthDate = selectedMonth) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];
      
      console.log(`Fetching monthly attendance: ${startDate} to ${endDate}`);
      
      const response = await apiClient.getAdminAttendanceRange(startDate, endDate);
      
      if (response.success) {
        setMonthlyAttendanceData(response.data.records || []);
        setAttendanceData(response.data.records || []);
        
        // Use backend's all days (including weekends)
        if (response.data.allDays || response.data.workingDays) {
          // Use allDays if available, otherwise fallback to workingDays for backward compatibility
          const dayData = response.data.allDays || response.data.workingDays.map(dateStr => ({ 
            date: dateStr, 
            isWorkingDay: true 
          }));
          
          const monthAllDays = dayData.map(dayObj => {
            const dateStr = dayObj.date || dayObj;
            const [year, month, day] = dateStr.split('-');
            return {
              date: new Date(parseInt(year), parseInt(month) - 1, parseInt(day)),
              isWorkingDay: dayObj.isWorkingDay !== undefined ? dayObj.isWorkingDay : true
            };
          });
          
          setAllWorkingDays(monthAllDays.map(d => d.date));
          
          // Find initial window that includes today (if current month) or last 4 days
          const today = new Date();
          const isCurrentMonth = monthDate.getFullYear() === today.getFullYear() && 
                                monthDate.getMonth() === today.getMonth();
          
          let initialWindow;
          let initialWindowIndex = 0;
          
          const allDates = monthAllDays.map(d => d.date);
          
          if (isCurrentMonth && allDates.length > 0) {
            // Find today in all days and center the window around it
            const todayIndex = allDates.findIndex(day => 
              day.toDateString() === today.toDateString()
            );
            
            if (todayIndex !== -1) {
              // Show window ending with today
              const endIndex = Math.min(todayIndex + 1, allDates.length);
              const startIndex = Math.max(0, endIndex - 4);
              initialWindow = allDates.slice(startIndex, startIndex + 4);
              initialWindowIndex = Math.max(0, allDates.length - 4 - startIndex);
            } else {
              // Today not found, show last 4 days
              initialWindow = allDates.slice(-4);
              initialWindowIndex = 0;
            }
          } else {
            // For past months, show last 4 days
            initialWindow = allDates.slice(-4);
            initialWindowIndex = 0;
          }
          
          setCurrentWindowIndex(initialWindowIndex);
          setWorkingDays(initialWindow);
          
          // Calculate stats for the current window
          updateStatsForWindow(response.data.records || [], initialWindow);
        } else {
          // Fallback: if no working days from backend, show empty
          setAllWorkingDays([]);
          setWorkingDays([]);
          setStats({ total: 0, present: 0, absent: 0, leave: 0, weekend: 0 });
        }
      } else {
        setError(response.message || 'Failed to fetch attendance data');
      }
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      setError(err.message || 'Failed to fetch attendance data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  // Update stats for current window
  const updateStatsForWindow = (records, windowDays) => {
    if (windowDays.length === 0 || records.length === 0) {
      setStats({ total: 0, present: 0, absent: 0, leave: 0, weekend: 0 });
      return;
    }

    // Calculate unique employees for each status across all days in the window
    const employeeStatuses = new Set();
    const presentEmployees = new Set();
    const absentEmployees = new Set();
    const leaveEmployees = new Set();
    const weekendEmployees = new Set();

    records.forEach(record => {
      const employeeId = record.employee?._id || record.employee?.employeeId;
      if (!employeeId) return;

      let hasPresence = false;
      let hasAbsence = false;
      let hasLeave = false;
      let hasWeekend = false;

      // Check this employee's status across all days in the window
      windowDays.forEach(day => {
        const attendance = getAttendanceForDay(record, day);
        
        if (attendance.status === 'weekend') {
          hasWeekend = true;
        } else if (attendance.status === 'leave') {
          hasLeave = true;
        } else if (attendance.checkIn || attendance.checkOut) {
          hasPresence = true;
        } else {
          hasAbsence = true;
        }
      });

      // Prioritize status: present > leave > absent > weekend
      if (hasPresence) {
        presentEmployees.add(employeeId);
      } else if (hasLeave) {
        leaveEmployees.add(employeeId);
      } else if (hasAbsence) {
        absentEmployees.add(employeeId);
      } else if (hasWeekend) {
        weekendEmployees.add(employeeId);
      }

      employeeStatuses.add(employeeId);
    });

    const total = employeeStatuses.size;
    const present = presentEmployees.size;
    const absent = absentEmployees.size;
    const leave = leaveEmployees.size;
    const weekend = weekendEmployees.size;

    setStats({ total, present, absent, leave, weekend });
  };

  const handleEditClick = (record, day) => {
    const attendanceForDay = getAttendanceForDay(record, day);
    
    // Create a proper date object for the modal - this matches employee directory approach
    const modalRecord = {
      ...attendanceForDay,
      date: day, // Pass the actual Date object
      employeeId: record.employee?.employeeId,
      _id: attendanceForDay._id || null
    };
    
    console.log('Editing attendance for:', {
      date: day.toISOString().split('T')[0],
      employee: record.employee?.firstName + ' ' + record.employee?.lastName,
      existingRecord: attendanceForDay
    });
    
    setSelectedRecord(modalRecord);
    setSelectedEmployee(record.employee);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRecord(null);
    setSelectedEmployee(null);
    fetchMonthlyAttendanceData(selectedMonth); // Refresh data after modal closes
  };

  const handleAttendanceUpdate = () => {
    fetchMonthlyAttendanceData(selectedMonth); // Refresh data after update
  };

  // Navigate the sliding window
  const navigateWindow = (direction) => {
    const newWindowIndex = currentWindowIndex + direction;
    const maxWindowIndex = Math.max(0, allWorkingDays.length - 4);
    
    // Don't allow going beyond available data
    if (newWindowIndex < 0 || newWindowIndex > maxWindowIndex) {
      return;
    }
    
    setCurrentWindowIndex(newWindowIndex);
    
    // Update the current window
    const newWindow = getCurrentWindow();
    setWorkingDays(newWindow);
    
    // Update stats for the new window
    updateStatsForWindow(monthlyAttendanceData, newWindow);
  };

  // Update window when currentWindowIndex changes
  useEffect(() => {
    if (allWorkingDays.length > 0) {
      const newWindow = getCurrentWindow();
      setWorkingDays(newWindow);
      updateStatsForWindow(monthlyAttendanceData, newWindow);
    }
  }, [currentWindowIndex, allWorkingDays, monthlyAttendanceData]);

  useEffect(() => {
    fetchMonthlyAttendanceData();
  }, [fetchMonthlyAttendanceData]);

  // Handle month change
  const handleMonthChange = (event) => {
    const [year, month] = event.target.value.split('-');
    const newDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    setSelectedMonth(newDate);
    setCurrentWindowIndex(0); // Reset to default position
  };

  // Fetch data when month changes
  useEffect(() => {
    fetchMonthlyAttendanceData(selectedMonth);
  }, [selectedMonth]);

  // Register refresh function globally for header refresh button
  useEffect(() => {
    window.refreshAttendanceTable = () => fetchMonthlyAttendanceData(selectedMonth);
    
    return () => {
      delete window.refreshAttendanceTable;
    };
  }, [selectedMonth]);

  const getAttendanceIcon = (attendance) => {
    if (attendance.status === 'weekend') {
      return <XCircle className="w-4 h-4 text-gray-400" />;
    }
    if (attendance.status === 'absent' || (!attendance.checkIn && !attendance.checkOut)) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    if (attendance.status === 'leave') {
      return <Heart className="w-4 h-4 text-purple-500" />;
    }
    if (attendance.checkIn && attendance.checkOut) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (attendance.checkIn && !attendance.checkOut) {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
    return <XCircle className="w-4 h-4 text-gray-400" />;
  };

  const getAttendanceBadgeClass = (attendance) => {
    const baseClasses = "px-3 py-2 rounded-lg text-sm font-medium flex flex-col items-center gap-1 min-h-[60px] justify-center";
    
    if (attendance.status === 'weekend') {
      return `${baseClasses} bg-slate-100 text-slate-500 dark:bg-slate-800/30 dark:text-slate-400`;
    }
    if (attendance.status === 'absent' || (!attendance.checkIn && !attendance.checkOut)) {
      return `${baseClasses} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300`;
    }
    if (attendance.status === 'leave') {
      return `${baseClasses} bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300`;
    }
    if (attendance.checkIn && attendance.checkOut) {
      return `${baseClasses} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`;
    }
    if (attendance.checkIn && !attendance.checkOut) {
      return `${baseClasses} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`;
    }
    return `${baseClasses} bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300`;
  };

  const formatTime = (time) => {
    if (!time) return '—';
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDayDate = (date) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayOfWeek = date.getDay();
    const day = dayNames[dayOfWeek];
    const dateNum = date.getDate().toString().padStart(2, '0');
    const month = monthNames[date.getMonth()];
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    
    return { 
      day, 
      dateStr: `${dateNum} ${month}`,
      isWeekend
    };
  };

  const getAttendanceForDay = (record, date) => {
    // Format date as YYYY-MM-DD using local time
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    return record.weekData?.[dateKey] || { checkIn: null, checkOut: null, status: 'absent' };
  };

  const getAttendanceStatusText = (attendance) => {
    if (attendance.status === 'weekend') return 'Weekend';
    if (attendance.status === 'leave') return 'Leave';
    if (attendance.status === 'absent' || (!attendance.checkIn && !attendance.checkOut)) return 'Absent';
    if (attendance.checkIn && !attendance.checkOut) return null; // No text for check-in only
    return null; // No text for present status
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">
          Attendance Overview
        </h3>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">
          Attendance Overview
        </h3>
        <div className="text-center text-red-500 py-4">
          <p>{error}</p>
          <button 
            onClick={() => fetchMonthlyAttendanceData(selectedMonth)}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200/50 dark:border-neutral-700/50 p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mb-1">
            Attendance Overview
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
          <div className="flex items-center gap-1 bg-neutral-50 dark:bg-neutral-700/50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
            <Users className="w-3 h-3 sm:w-4 sm:h-4 text-neutral-500" />
            <span className="text-neutral-500 dark:text-neutral-400 font-medium text-xs sm:text-sm">{stats.total} total</span>
          </div>
          <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
            <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
            <span className="text-green-600 dark:text-green-400 font-medium text-xs sm:text-sm">{stats.present} present</span>
          </div>
          <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
            <UserX className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
            <span className="text-red-600 dark:text-red-400 font-medium text-xs sm:text-sm">{stats.absent} absent</span>
          </div>
          {stats.leave > 0 && (
            <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
              <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500" />
              <span className="text-purple-600 dark:text-purple-400 font-medium text-xs sm:text-sm">{stats.leave} leave</span>
            </div>
          )}
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={() => navigateWindow(1)}
              className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous 4 days"
              disabled={currentWindowIndex >= Math.max(0, allWorkingDays.length - 4)}
            >
              <ChevronLeft className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
            </button>
            <select 
              value={`${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`}
              onChange={handleMonthChange}
              className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-20"
            >
              {(() => {
                const options = [];
                const today = new Date();
                const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                // Show last 12 months
                for (let i = 0; i < 12; i++) {
                  const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
                  const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                  const monthShort = monthShortNames[date.getMonth()];
                  const yearShort = String(date.getFullYear()).slice(-2);
                  const label = `${monthShort} ${yearShort}`;
                  options.push(
                    <option key={value} value={value}>
                      {label}
                    </option>
                  );
                }
                return options;
              })()} 
            </select>
            <button
              onClick={() => navigateWindow(-1)}
              className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next 4 days"
              disabled={currentWindowIndex <= 0}
            >
              <ChevronRight className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Card Layout */}
      <div className="block md:hidden">
        {attendanceData.length > 0 ? (
          <div className="space-y-3">
            {attendanceData.map((record, index) => (
              <div 
                key={record.employee._id || index} 
                className="border rounded-lg p-4 transition-colors border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/30"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-neutral-800 dark:text-neutral-100 truncate">
                      {record.employeeName || 'Unknown Employee'}
                    </div>
                    {record.employee?.employeeId && (
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        ID: {record.employee.employeeId}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-3 space-y-2">
                  {workingDays.map((day, dayIndex) => {
                    const dayAttendance = getAttendanceForDay(record, day);
                    const { day: dayName, dateStr, isWeekend } = formatDayDate(day);
                    return (
                      <div 
                        key={dayIndex} 
                        className={`border rounded-lg p-3 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
                          isWeekend ? 'bg-neutral-50 dark:bg-neutral-800/50' : ''
                        }`}
                        onClick={() => handleEditClick(record, day)}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-sm font-medium ${
                            isWeekend 
                              ? 'text-neutral-500 dark:text-neutral-400' 
                              : 'text-neutral-700 dark:text-neutral-300'
                          }`}>{dayName}</span>
                          <span className={`text-xs ${
                            isWeekend 
                              ? 'text-neutral-400 dark:text-neutral-500' 
                              : 'text-neutral-500 dark:text-neutral-400'
                          }`}>{dateStr}</span>
                        </div>
                        <div className={getAttendanceBadgeClass(dayAttendance)}>
                          {getAttendanceIcon(dayAttendance)}
                          {getAttendanceStatusText(dayAttendance) && (
                            <span className="text-xs font-medium">{getAttendanceStatusText(dayAttendance)}</span>
                          )}
                          {dayAttendance.checkIn && (
                            <div className="text-xs font-mono opacity-80">
                              {formatTime(dayAttendance.checkIn)}
                              {dayAttendance.checkOut && ` - ${formatTime(dayAttendance.checkOut)}`}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No employees found</p>
            <p className="text-sm">Check your employee database</p>
          </div>
        )}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-neutral-700 dark:to-neutral-800 border-b border-neutral-200 dark:border-neutral-600">
              <th className="text-left py-4 px-4 font-semibold text-neutral-700 dark:text-neutral-300 text-sm">Employee</th>
              {workingDays.map((day, index) => {
                const { day: dayName, dateStr, isWeekend } = formatDayDate(day);
                return (
                  <th key={index} className={`text-center py-4 px-2 font-semibold text-sm min-w-[80px] ${
                    isWeekend 
                      ? 'text-neutral-500 dark:text-neutral-400' 
                      : 'text-neutral-700 dark:text-neutral-300'
                  }`}>
                    <div className="flex flex-col items-center">
                      <span className={isWeekend ? 'text-neutral-400 dark:text-neutral-500' : ''}>{dayName}</span>
                      <span className={`text-xs ${
                        isWeekend 
                          ? 'text-neutral-400 dark:text-neutral-500' 
                          : 'text-neutral-500 dark:text-neutral-400'
                      }`}>{dateStr}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {attendanceData.length > 0 ? attendanceData.map((record, index) => (
              <tr 
                key={record.employee._id || index} 
                className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors bg-white dark:bg-neutral-800"
              >
                <td className="py-4 px-4">
                  <div>
                    <div className="font-medium text-neutral-800 dark:text-neutral-100">
                      {record.employeeName || 'Unknown Employee'}
                    </div>
                    {record.employee?.employeeId && (
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        ID: {record.employee.employeeId}
                      </div>
                    )}
                  </div>
                </td>
                {workingDays.map((day, dayIndex) => {
                  const dayAttendance = getAttendanceForDay(record, day);
                  return (
                    <td key={dayIndex} className="py-4 px-2">
                      <div 
                        className="flex justify-center cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg p-2"
                        onClick={() => handleEditClick(record, day)}
                      >
                        <div className={getAttendanceBadgeClass(dayAttendance)}>
                          {getAttendanceIcon(dayAttendance)}
                          {getAttendanceStatusText(dayAttendance) && (
                            <span className="text-xs font-medium">{getAttendanceStatusText(dayAttendance)}</span>
                          )}
                          {dayAttendance.checkIn && (
                            <div className="text-xs font-mono opacity-80">
                              {formatTime(dayAttendance.checkIn)}
                              {dayAttendance.checkOut && (
                                <div>{formatTime(dayAttendance.checkOut)}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            )) : (
              <tr>
                <td colSpan={workingDays.length + 1} className="py-12 text-center text-neutral-500 dark:text-neutral-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">No employees found</p>
                  <p className="text-sm">Check your employee database</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedRecord && selectedEmployee && (
        <EditAttendanceModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          record={selectedRecord}
          employeeProfile={selectedEmployee}
          onUpdate={handleAttendanceUpdate}
        />
      )}
    </div>
  );
};

export default AdminAttendanceTable;