import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Heart, Calendar } from 'lucide-react';
import apiClient from '@/service/apiClient';
import useAuth from '@/hooks/authjwt';
import { formatTime, formatDate, getISTDateString, getMonthOptions, getAllDaysInMonth } from '@/utils/istUtils';

// 🚀 OPTIMIZED: Employee Attendance Table with memoization
const EmployeeAttendanceTable = memo(({ onRegularizationRequest }) => {
  const user = useAuth();
  const [attendanceData, setAttendanceData] = useState([]);
  const [monthlyAttendanceData, setMonthlyAttendanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, leave: 0, weekend: 0, breakdown: { totalDays: 0, weekendDays: 0, holidayDays: 0, workingDays: 0 } });
  const [allWorkingDays, setAllWorkingDays] = useState([]);
  const [currentWindowIndex, setCurrentWindowIndex] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [workingDays, setWorkingDays] = useState([]);
  const [effectiveSettings, setEffectiveSettings] = useState(null);

  // 🚀 OPTIMIZED: Get the current 4-day window from all working days (memoized)
  const getCurrentWindow = useMemo(() => {
    if (allWorkingDays.length === 0) return [];
    
    const maxStartIndex = Math.max(0, allWorkingDays.length - 4);
    const startIndex = Math.max(0, maxStartIndex - currentWindowIndex);
    const endIndex = Math.min(startIndex + 4, allWorkingDays.length);
    
    return allWorkingDays.slice(startIndex, endIndex);
  }, [allWorkingDays, currentWindowIndex]);

  // Fetch employee's monthly attendance data
  const fetchMonthlyAttendanceData = useCallback(async (monthDate = selectedMonth) => {
    if (!user?.employeeId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      // Use IST date formatting
      const startDate = getISTDateString(firstDay);
      const endDate = getISTDateString(lastDay);
      
      // Use the existing API that shows employee's attendance with absents
      const response = await apiClient.getEmployeeAttendanceWithAbsents({
        employeeId: user.employeeId,
        startDate: startDate,
        endDate: endDate
      });
      
      if (response.success) {
        const allRecords = response.data.records || [];
        
        // Transform the data to match the admin dashboard format
        const employeeRecord = {
          employee: {
            _id: response.data.employee?._id,
            employeeId: user.employeeId,
            firstName: response.data.employee?.firstName || user.name?.split(' ')[0] || 'Employee',
            lastName: response.data.employee?.lastName || user.name?.split(' ').slice(1).join(' ') || '',
            department: response.data.employee?.department
          },
          employeeName: `${response.data.employee?.firstName || user.name?.split(' ')[0] || 'Employee'} ${response.data.employee?.lastName || user.name?.split(' ').slice(1).join(' ') || ''}`,
          weekData: {}
        };

        // Transform records into weekData format
        allRecords.forEach(record => {
          const year = new Date(record.date).getFullYear();
          const month = String(new Date(record.date).getMonth() + 1).padStart(2, '0');
          const day = String(new Date(record.date).getDate()).padStart(2, '0');
          const dateKey = `${year}-${month}-${day}`;
          
          // Keep backend status if present (attendance record takes priority)
          // Only override with flag-based status if no actual attendance record exists
          let finalStatus = record.status || 'absent';
          
          // Only override status for flag-based statuses if there's no actual check-in
          // Priority: Leave > Holiday > Weekend (matching backend logic)
          if (!record.checkIn) {
            if (record.flags?.isLeave || record.status === 'leave') {
              finalStatus = 'leave';
            } else if (record.flags?.isHoliday) {
              finalStatus = 'holiday';
            } else if (record.flags?.isWeekend) {
              finalStatus = 'weekend';
            }
          }
          // If there's a check-in, trust the backend status (present/half-day/etc.)
          
          employeeRecord.weekData[dateKey] = {
            _id: record._id,
            checkIn: record.checkIn,
            checkOut: record.checkOut,
            status: finalStatus,
            isWorkingDay: !record.flags?.isWeekend && !record.flags?.isHoliday,
            holidayTitle: record.flags?.isHoliday ? (record.holidayTitle || 'Holiday') : undefined
          };
        });

        // Helper function to check if date is a working day (commented out as it's not used currently)
        // const isWorkingDayForCompany = (date) => {
        //   const dayOfWeek = date.getDay();
        //   
        //   // Sunday is always a non-working day
        //   if (dayOfWeek === 0) {
        //     return false;
        //   }
        //   
        //   // Saturday logic: exclude 2nd Saturday of the month
        //   if (dayOfWeek === 6) {
        //     const dateNum = date.getDate();
        //     const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        //     const firstSaturday = 7 - firstDayOfMonth.getDay() || 7;
        //     const secondSaturday = firstSaturday + 7;
        //     
        //     // If this Saturday is the 2nd Saturday, it's a non-working day
        //     if (dateNum >= secondSaturday && dateNum < secondSaturday + 7) {
        //       return false;
        //     }
        //   }
        //   
        //   return true;
        // };

        // Generate all calendar days for the month - trust API data completely
        const allDays = [];
        const currentDate = new Date(firstDay);
        
        while (currentDate <= lastDay) {
          allDays.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        setAllWorkingDays(allDays);
        setMonthlyAttendanceData([employeeRecord]); // Set the processed data
        setAttendanceData([employeeRecord]); // Also set attendanceData for backward compatibility
        
        // Fetch effective settings for the user's department
        await fetchEffectiveSettings(response.data.employee?.department);
        
        // Find initial window that includes today (if current month) or last 4 days
        const today = new Date();
        const isCurrentMonth = monthDate.getFullYear() === today.getFullYear() && 
                              monthDate.getMonth() === today.getMonth();
        
        let initialWindow;
        let initialWindowIndex = 0;
        
        if (isCurrentMonth && allDays.length > 0) {
          const todayIndex = allDays.findIndex(day => 
            day.toDateString() === today.toDateString()
          );
          
          if (todayIndex !== -1) {
            const endIndex = Math.min(todayIndex + 1, allDays.length);
            const startIndex = Math.max(0, endIndex - 4);
            initialWindow = allDays.slice(startIndex, startIndex + 4);
            initialWindowIndex = Math.max(0, allDays.length - 4 - startIndex);
          } else {
            initialWindow = allDays.slice(-4);
            initialWindowIndex = 0;
          }
        } else {
          initialWindow = allDays.slice(-4);
          initialWindowIndex = 0;
        }
        
        setCurrentWindowIndex(initialWindowIndex);
        setWorkingDays(initialWindow);
        
        // Calculate stats for the current window
        updateStatsForWindow([employeeRecord], initialWindow);
      } else {
        setError(response.message || 'Failed to fetch attendance data');
      }
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      setError(err.message || 'Failed to fetch attendance data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, user?.employeeId]);

  // Fetch effective settings for determining working days
  const fetchEffectiveSettings = useCallback(async (department = null) => {
    try {
      const response = await apiClient.getEffectiveSettings(department);
      if (response.success) {
        setEffectiveSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch effective settings:', error);
      // Use default settings as fallback
      setEffectiveSettings({
        attendance: {
          workingDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday
          saturdayHolidays: [2] // 2nd Saturday by default
        }
      });
    }
  }, []);

  // Update stats for current window
  const updateStatsForWindow = (records, windowDays) => {
    if (windowDays.length === 0 || records.length === 0) {
      setStats({ total: 0, present: 0, absent: 0, leave: 0, weekend: 0, breakdown: { totalDays: 0, weekendDays: 0, holidayDays: 0, workingDays: 0 } });
      return;
    }

    let present = 0, absent = 0, leave = 0, weekend = 0, holiday = 0;

    windowDays.forEach(day => {
      const attendance = getAttendanceForDay(records[0], day);
      
      if (attendance.status === 'weekend') {
        weekend++;
      } else if (attendance.status === 'holiday') {
        holiday++;
      } else if (attendance.status === 'leave') {
        leave++;
      } else if (attendance.checkIn || attendance.checkOut) {
        present++;
      } else {
        absent++;
      }
    });

    const workingDays = windowDays.length - weekend - holiday;
    
    setStats({ 
      total: windowDays.length, 
      present, 
      absent, 
      leave, 
      weekend,
      breakdown: {
        totalDays: windowDays.length,
        weekendDays: weekend,
        holidayDays: holiday,
        workingDays: workingDays
      }
    });
  };

  const handleAttendanceClick = (record, day) => {
    const attendanceForDay = getAttendanceForDay(record, day);
    
    // Create regularization prefill data
    const prefillData = {
      date: day,
      checkIn: attendanceForDay.checkIn,
      checkOut: attendanceForDay.checkOut,
      status: attendanceForDay.status,
      reason: attendanceForDay.status === 'absent' ? 'I was present but forgot to check in/out' : undefined
    };
    
    console.log('Opening regularization for:', {
      date: day.toISOString().split('T')[0],
      employee: record.employee?.firstName + ' ' + record.employee?.lastName,
      existingRecord: attendanceForDay
    });
    
    if (onRegularizationRequest) {
      onRegularizationRequest(prefillData);
    }
  };

  // Navigate the sliding window
  const navigateWindow = (direction) => {
    const newWindowIndex = currentWindowIndex + direction;
    const maxWindowIndex = Math.max(0, allWorkingDays.length - 4);
    
    if (newWindowIndex < 0 || newWindowIndex > maxWindowIndex) {
      return;
    }
    
    setCurrentWindowIndex(newWindowIndex);
    
    const newWindow = getCurrentWindow;
    setWorkingDays(newWindow);
    
    updateStatsForWindow(monthlyAttendanceData, newWindow);
  };

  // Update window when currentWindowIndex changes
  useEffect(() => {
    if (allWorkingDays.length > 0) {
      const newWindow = getCurrentWindow;
      setWorkingDays(newWindow);
      updateStatsForWindow(monthlyAttendanceData, newWindow);
    }
  }, [currentWindowIndex, allWorkingDays, monthlyAttendanceData]);

  useEffect(() => {
    if (user?.employeeId) {
      fetchMonthlyAttendanceData();
    }
  }, [user?.employeeId]); // Remove fetchMonthlyAttendanceData dependency to prevent loops

  // Handle month change
  const handleMonthChange = (event) => {
    const [year, month] = event.target.value.split('-');
    const newDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    setSelectedMonth(newDate);
    setCurrentWindowIndex(0);
  };

  // Fetch data when month changes
  useEffect(() => {
    if (user?.employeeId) {
      fetchMonthlyAttendanceData(selectedMonth);
    }
  }, [selectedMonth]);

  const getAttendanceIcon = (attendance) => {
    if (attendance.status === 'weekend') {
      return <XCircle className="w-4 h-4 text-gray-400" />;
    }
    if (attendance.status === 'holiday') {
      return <Calendar className="w-4 h-4 text-orange-500" />;
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
    const baseClasses = "w-full max-w-[85px] sm:max-w-[95px] px-2 sm:px-3 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium flex flex-col items-center justify-center gap-1 sm:gap-1.5 min-h-[75px] sm:min-h-[85px] cursor-pointer hover:opacity-80 transition-opacity";
    
    if (attendance.status === 'weekend') {
      return `${baseClasses} bg-slate-100 text-slate-500 dark:bg-slate-800/30 dark:text-slate-400`;
    }
    if (attendance.status === 'holiday') {
      return `${baseClasses} bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300`;
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

  // formatTime function is now imported from istUtils

  const formatDayDate = (date) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayOfWeek = date.getDay();
    const day = dayNames[dayOfWeek];
    const dateNum = date.getDate().toString().padStart(2, '0');
    const month = monthNames[date.getMonth()];
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    return { 
      day, 
      dateStr: `${dateNum} ${month}`,
      isWeekend
    };
  };

  const getAttendanceForDay = (record, date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    
    // If data exists in API response, use it
    if (record.weekData?.[dateKey]) {
      return record.weekData[dateKey];
    }
    
    // If no data exists, determine status based on day type using settings
    const dayOfWeek = date.getDay();
    let status = 'absent';
    let isWorkingDay = true;
    
    if (effectiveSettings?.attendance) {
      const { workingDays, saturdayHolidays } = effectiveSettings.attendance;
      
      // Check if this day of week is in working days
      if (!workingDays.includes(dayOfWeek)) {
        status = 'weekend';
        isWorkingDay = false;
      }
      // Special handling for Saturday - check if it's a holiday Saturday
      else if (dayOfWeek === 6 && saturdayHolidays && saturdayHolidays.length > 0) {
        const saturdayWeek = getSaturdayWeekOfMonth(date);
        if (saturdayHolidays.includes(saturdayWeek)) {
          status = 'weekend';
          isWorkingDay = false;
        }
      }
    } else {
      // Fallback to hardcoded logic if settings not loaded
      if (dayOfWeek === 0) {
        status = 'weekend';
        isWorkingDay = false;
      }
      else if (dayOfWeek === 6) {
        const dateNum = date.getDate();
        const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const firstSaturday = 7 - firstDayOfMonth.getDay() || 7;
        const secondSaturday = firstSaturday + 7;
        
        if (dateNum >= secondSaturday && dateNum < secondSaturday + 7) {
          status = 'weekend';
          isWorkingDay = false;
        }
      }
    }
    
    return { 
      checkIn: null, 
      checkOut: null, 
      status: status,
      isWorkingDay: isWorkingDay,
      holidayTitle: undefined
    };
  };

  // Helper function to determine which Saturday of the month a given date is
  const getSaturdayWeekOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const dateNum = date.getDate();
    
    // Find the first Saturday of the month
    const firstDayOfMonth = new Date(year, month, 1);
    const firstDayWeekday = firstDayOfMonth.getDay();
    
    // Calculate first Saturday date (0=Sunday, 6=Saturday)
    const firstSaturday = firstDayWeekday === 6 ? 1 : 7 - firstDayWeekday;
    
    // Calculate which Saturday this date is
    const saturdayWeek = Math.ceil((dateNum - firstSaturday + 1) / 7);
    
    return Math.max(1, Math.min(4, saturdayWeek)); // Ensure it's between 1-4
  };

  const getAttendanceStatusText = (attendance) => {
    if (attendance.status === 'weekend') return 'Weekend';
    if (attendance.status === 'holiday') return attendance.holidayTitle || 'Holiday';
    if (attendance.status === 'leave') return 'Leave';
    if (attendance.status === 'absent' || (!attendance.checkIn && !attendance.checkOut)) return 'Absent';
    if (attendance.checkIn && !attendance.checkOut) return null;
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">
          Attendance Overview
        </h3>
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4"></div>
          <div className="flex gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-1 h-16 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            ))}
          </div>
          <div className="h-12 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">
          My Attendance Overview
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

  if (attendanceData.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">
          My Attendance Overview
        </h3>
        <div className="text-center text-neutral-500 py-8">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No attendance data found</p>
          <p className="text-sm">Your attendance records will appear here</p>
        </div>
      </div>
    );
  }

  const record = attendanceData[0]; // Since we only have one employee record

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200/50 dark:border-neutral-700/50 p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
      {/* Navigation Controls */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Attendance</h3>
        <div className="flex items-center gap-3">
        <button
          onClick={() => navigateWindow(1)}
          className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          title="Previous 4 days"
          disabled={currentWindowIndex >= Math.max(0, allWorkingDays.length - 4)}
        >
          <ChevronLeft className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
        </button>
        <select 
          value={`${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`}
          onChange={handleMonthChange}
          className="text-sm bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-sm min-w-[90px]"
        >
          {(() => {
            const options = [];
            const today = new Date();
            const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
          className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          title="Next 4 days"
          disabled={currentWindowIndex <= 0}
        >
          <ChevronRight className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
        </button>
        </div>
      </div>
      
      {/* Table Layout */}
      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-neutral-700 dark:to-neutral-800 border-b border-neutral-200 dark:border-neutral-600">
              <th className="text-left py-2 sm:py-4 px-2 sm:px-4 font-semibold text-neutral-700 dark:text-neutral-300 text-xs sm:text-sm">Date</th>
              {workingDays.map((day, index) => {
                const { day: dayName, dateStr, isWeekend } = formatDayDate(day);
                return (
                  <th key={index} className={`text-center py-2 sm:py-4 px-1 sm:px-2 font-semibold text-xs sm:text-sm min-w-[75px] sm:min-w-[95px] ${
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
            <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors bg-white dark:bg-neutral-800">
              <td className="py-2 sm:py-4 px-2 sm:px-4">
                <div className="font-medium text-sm sm:text-base text-neutral-800 dark:text-neutral-100">
                  {record.employeeName ? record.employeeName.split(' ')[0] : 'Attendance'}
                </div>
              </td>
              {workingDays.map((day, dayIndex) => {
                const dayAttendance = getAttendanceForDay(record, day);
                return (
                  <td key={dayIndex} className="py-2 sm:py-4 px-1 sm:px-2">
                    <div 
                      className="flex justify-center cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg p-1 sm:p-2"
                      onClick={() => handleAttendanceClick(record, day)}
                    >
                      <div className={getAttendanceBadgeClass(dayAttendance)}>
                        {getAttendanceIcon(dayAttendance)}
                        {getAttendanceStatusText(dayAttendance) && (
                          <span className="text-xs sm:text-xs font-medium text-center leading-tight">{getAttendanceStatusText(dayAttendance)}</span>
                        )}
                        {dayAttendance.checkIn && (
                          <div className="text-xs sm:text-xs font-mono opacity-80 text-center leading-tight">
                            <div className="truncate">{formatTime(dayAttendance.checkIn)}</div>
                            {dayAttendance.checkOut && (
                              <div className="truncate">{formatTime(dayAttendance.checkOut)}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default EmployeeAttendanceTable;