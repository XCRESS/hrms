import React, { useEffect, useState } from "react";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight, BarChart3, TrendingUp } from "lucide-react";
import apiClient from "../../service/apiClient";
import useAuth from "../../hooks/authjwt";
import { formatDate } from "../../utils/istUtils";

// Enhanced Attendance Analytics Component (consistent with dashboard)
const AttendanceAnalytics = ({ attendance, dateRange, holidays = [] }) => {
  // Helper function to check if date is a working day (same as dashboard)
  const isWorkingDayForCompany = (date) => {
    const dayOfWeek = date.getDay();
    
    // Sunday is always a non-working day
    if (dayOfWeek === 0) {
      return false;
    }
    
    // Saturday logic: exclude 2nd Saturday of the month
    if (dayOfWeek === 6) {
      const dateNum = date.getDate();
      const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const firstSaturday = 7 - firstDayOfMonth.getDay() || 7;
      const secondSaturday = firstSaturday + 7;
      
      // If this Saturday is the 2nd Saturday, it's a non-working day
      if (dateNum >= secondSaturday && dateNum < secondSaturday + 7) {
        return false;
      }
    }
    
    return true;
  };

  // Calculate actual working days in the date range (excluding holidays)
  const calculateWorkingDaysInRange = () => {
    if (!dateRange?.startDate || !dateRange?.endDate) return 0;
    
    let workingDays = 0;
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      if (isWorkingDayForCompany(currentDate)) {
        // Check if this date is not a holiday
        const isHoliday = holidays.some(holiday => {
          if (holiday.date) {
            const holidayDate = new Date(holiday.date);
            return holidayDate.toDateString() === currentDate.toDateString();
          }
          return false;
        });
        
        if (!isHoliday) {
          workingDays++;
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workingDays;
  };

  const calculateAttendanceStats = () => {
    if (!attendance || attendance.length === 0) return null;

    const totalWorkingDays = calculateWorkingDaysInRange();
    
    // Count different types of days - using same logic as dashboard
    let presentDays = 0;
    let absentDays = 0;
    let halfDays = 0;
    let invalidDays = 0;
    let lateDays = 0;
    
    attendance.forEach(rec => {
      const dayDate = new Date(rec.date);
      const isWorkingDay = isWorkingDayForCompany(dayDate);
      
      if (rec.status === "present") {
        presentDays++;
        // Check if it's a late arrival
        if (rec.checkIn) {
          const checkInTime = new Date(rec.checkIn);
          const checkInHour = checkInTime.getHours();
          const checkInMinutes = checkInTime.getMinutes();
          const checkInDecimal = checkInHour + (checkInMinutes / 60);
          if (checkInDecimal > 9.9167) { // Late after 9:55 AM
            lateDays++;
          }
        }
      } else if (rec.status === "half-day") {
        halfDays++;
        presentDays++; // Half days are also counted as present (same as dashboard)
      } else if (rec.status === "absent" && isWorkingDay) {
        absentDays++;
      } else if (rec.checkIn && !rec.checkOut && rec.status !== "half-day") {
        invalidDays++;
        presentDays++; // Missing checkouts are counted as present (same as dashboard)
      }
    });

    const totalWorkingHours = attendance.reduce((total, rec) => {
      if (rec.checkIn && rec.checkOut) {
        const checkIn = new Date(rec.checkIn);
        const checkOut = new Date(rec.checkOut);
        const hours = (checkOut - checkIn) / (1000 * 60 * 60);
        return total + hours;
      }
      return total;
    }, 0);

    const avgHoursPerDay = presentDays > 0 ? totalWorkingHours / presentDays : 0; // Average per working day
    const effectivePresentDays = presentDays - halfDays + (halfDays * 0.5); // Half days count as 0.5
    const attendancePercentage = totalWorkingDays > 0 ? Math.min((effectivePresentDays / totalWorkingDays) * 100, 100) : 0;

    return {
      presentDays,
      absentDays,
      halfDays,
      invalidDays,
      lateDays,
      totalWorkingHours: totalWorkingHours.toFixed(1),
      avgHoursPerDay: avgHoursPerDay.toFixed(1),
      totalWorkingDays,
      attendancePercentage: attendancePercentage.toFixed(1)
    };
  };

  const stats = calculateAttendanceStats();

  if (!stats) {
    return <div className="text-slate-500 dark:text-slate-400">No attendance data available for analysis.</div>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6">
      <div className="bg-cyan-50 dark:bg-cyan-900/20 p-3 sm:p-5 rounded-xl shadow-xl border border-cyan-200 dark:border-cyan-800 transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-1.5">
        <div className="flex items-center justify-between mb-2 sm:mb-3.5">
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-neutral-400">Working Days</p>
          <Calendar className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
        </div>
        <p className="text-xl sm:text-3xl font-bold text-cyan-600 dark:text-cyan-400">{stats.totalWorkingDays}</p>
        <div className="mt-2 sm:mt-3.5 h-2 w-full bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div className="h-2 bg-cyan-500 dark:bg-cyan-500 rounded-full transition-all duration-500" style={{ width: '100%' }}></div>
        </div>
      </div>
      
      <div className="bg-green-50 dark:bg-green-900/20 p-3 sm:p-5 rounded-xl shadow-xl border border-green-200 dark:border-green-800 transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-1.5">
        <div className="flex items-center justify-between mb-2 sm:mb-3.5">
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-neutral-400">Present Days</p>
          <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
        </div>
        <p className="text-xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{stats.presentDays}</p>
        <div className="mt-2 sm:mt-3.5 h-2 w-full bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div className="h-2 bg-green-500 dark:bg-green-500 rounded-full transition-all duration-500" style={{ width: `${stats.attendancePercentage}%` }}></div>
        </div>
        <p className="text-xs text-gray-500 dark:text-neutral-400 mt-2">{stats.attendancePercentage}% att.</p>
      </div>
      
      <div className="bg-red-50 dark:bg-red-900/20 p-3 sm:p-5 rounded-xl shadow-xl border border-red-200 dark:border-red-800 transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-1.5">
        <div className="flex items-center justify-between mb-2 sm:mb-3.5">
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-neutral-400">Absent Days</p>
          <XCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
        </div>
        <p className="text-xl sm:text-3xl font-bold text-red-600 dark:text-red-400">{stats.absentDays}</p>
        <div className="mt-2 sm:mt-3.5 h-2 w-full bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div className="h-2 bg-red-500 dark:bg-red-500 rounded-full transition-all duration-500" style={{ width: `${stats.totalWorkingDays > 0 ? (stats.absentDays / stats.totalWorkingDays) * 100 : 0}%` }}></div>
        </div>
      </div>
      
      <div className="bg-amber-50 dark:bg-amber-900/20 p-3 sm:p-5 rounded-xl shadow-xl border border-amber-200 dark:border-amber-800 transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-1.5">
        <div className="flex items-center justify-between mb-2 sm:mb-3.5">
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-neutral-400">Half Days</p>
          <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
        </div>
        <p className="text-xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.halfDays}</p>
        <div className="mt-2 sm:mt-3.5 h-2 w-full bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div className="h-2 bg-amber-500 dark:bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${stats.totalWorkingDays > 0 ? (stats.halfDays / stats.totalWorkingDays) * 100 : 0}%` }}></div>
        </div>
      </div>
      
      <div className="bg-orange-50 dark:bg-orange-900/20 p-3 sm:p-5 rounded-xl shadow-xl border border-orange-200 dark:border-orange-800 transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-1.5">
        <div className="flex items-center justify-between mb-2 sm:mb-3.5">
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-neutral-400">Invalid Days</p>
          <Clock className="w-5 h-5 text-orange-500 dark:text-orange-400" />
        </div>
        <p className="text-xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.invalidDays}</p>
        <div className="mt-2 sm:mt-3.5 h-2 w-full bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div className="h-2 bg-orange-500 dark:bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${stats.totalWorkingDays > 0 ? (stats.invalidDays / stats.totalWorkingDays) * 100 : 0}%` }}></div>
        </div>
      </div>
    </div>
  );
};

export default function MyAttendance() {
  const user = useAuth();
  // Core data states - optimized with sliding window
  const [allAttendanceData, setAllAttendanceData] = useState([]); // Pre-loaded data for entire range
  const [displayedData, setDisplayedData] = useState([]); // Current window of data
  const [loading, setLoading] = useState(false);
  const [currentWindowIndex, setCurrentWindowIndex] = useState(0); // Index for sliding window
  const [statistics, setStatistics] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), // First day of current month
    endDate: new Date().toISOString().slice(0, 10) // Today
  });
  const [joiningDate, setJoiningDate] = useState(null);
  const [effectiveDateRange, setEffectiveDateRange] = useState(null);
  const [holidays, setHolidays] = useState([]);
  
  const recordsPerPage = 15;

  // Fetch holidays for working days calculation
  const fetchHolidays = async () => {
    try {
      const response = await apiClient.getHolidays();
      if (response.success) {
        setHolidays(response.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch holidays:", err);
      setHolidays([]);
    }
  };

  // Pre-load all attendance data for the entire date range (like AdminAttendanceTable)
  const fetchAllAttendanceData = async () => {
    if (!user?.employeeId) return;
    
    setLoading(true);
    try {
      // Always use the API that includes absent days
      const response = await apiClient.getEmployeeAttendanceWithAbsents({
        employeeId: user.employeeId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      
      if (response.success) {
        const allRecords = response.data.records || [];
        setStatistics(response.data.statistics);
        
        // Store joining date and effective date range info
        if (response.data.employee?.joiningDate) {
          setJoiningDate(response.data.employee.joiningDate);
        }
        if (response.data.dateRange) {
          setEffectiveDateRange(response.data.dateRange);
        }
        
        // Process and store all data
        const processedRecords = allRecords.map(record => ({
          ...record,
          date: new Date(record.date),
          checkIn: record.checkIn ? new Date(record.checkIn) : null,
          checkOut: record.checkOut ? new Date(record.checkOut) : null
        }));
        
        // Sort records by date in descending order (today first, then yesterday, etc.)
        const sortedRecords = processedRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setAllAttendanceData(sortedRecords);
        
        // Initialize with first window
        updateCurrentWindow(sortedRecords, 0);
      }
    } catch (err) {
      console.error("Failed to fetch attendance:", err);
      setAllAttendanceData([]);
      setDisplayedData([]);
    } finally {
      setLoading(false);
    }
  };

  // Update current window (no API call needed)
  const updateCurrentWindow = (data = allAttendanceData, windowIndex = currentWindowIndex) => {
    // Calculate window
    const startIndex = windowIndex * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const windowData = data.slice(startIndex, endIndex);
    
    setDisplayedData(windowData);
    setCurrentWindowIndex(windowIndex);
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  useEffect(() => {
    fetchAllAttendanceData();
  }, [dateRange, user?.employeeId]);

  const formatTime = (date) => date ? new Date(date).toLocaleTimeString('en-IN', { 
    hour: '2-digit', minute: '2-digit', hour12: true 
  }) : "—";

  // Using standardized IST utils formatDate function

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

  // Navigate pages without API calls (sliding window)
  const handlePageChange = (newPage) => {
    const totalPages = Math.ceil(allAttendanceData.length / recordsPerPage);
    if (newPage >= 1 && newPage <= totalPages) {
      updateCurrentWindow(allAttendanceData, newPage - 1);
    }
  };

  // Calculate pagination info
  const totalRecords = allAttendanceData.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const currentPage = currentWindowIndex + 1;

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  // Show loading if user is not loaded yet
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto mt-8 p-4 sm:p-6 lg:p-8 bg-white dark:bg-slate-800 rounded-xl shadow-xl">
        <div className="text-center py-12">
          <div className="inline-flex items-center space-x-2 text-gray-500 dark:text-slate-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600"></div>
            <span>Loading user information...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto mt-8 p-4 sm:p-6 lg:p-8 bg-white dark:bg-slate-800 rounded-xl shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
            <Calendar className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">My Attendance</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Track your attendance history (most recent first)</p>
          </div>
        </div>
        
        {/* Date Range Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">From</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">To</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Enhanced Analytics */}
      {displayedData.length > 0 && (
        <AttendanceAnalytics 
          attendance={allAttendanceData} 
          dateRange={dateRange}
          holidays={holidays}
        />
      )}

      {/* Joining Date Notice */}
      {effectiveDateRange && effectiveDateRange.requestedStartDate !== effectiveDateRange.effectiveStartDate && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-blue-800 dark:text-blue-200 font-medium">Date range adjusted</p>
              <p className="text-blue-700 dark:text-blue-300">
                Attendance records are shown from your joining date ({new Date(effectiveDateRange.joiningDate).toLocaleDateString()}) onwards.
                Requested start date was {new Date(effectiveDateRange.requestedStartDate).toLocaleDateString()}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Records Info */}
      <div className="flex justify-end items-center mb-4">
        <div className="text-sm text-gray-500 dark:text-gray-400">
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
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl">
              <thead>
                <tr className="bg-cyan-50 dark:bg-slate-700 text-cyan-700 dark:text-cyan-300">
                  <th className="p-4 text-left font-semibold">Date</th>
                  <th className="p-4 text-left font-semibold">Status</th>
                  <th className="p-4 text-left font-semibold">Check In</th>
                  <th className="p-4 text-left font-semibold">Check Out</th>
                  <th className="p-4 text-left font-semibold">Work Hours</th>
                  <th className="p-4 text-left font-semibold">Comments</th>
                </tr>
              </thead>
              <tbody>
                {displayedData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                      <p className="text-lg font-medium">No attendance records found</p>
                      <p className="text-sm">Try adjusting your date range</p>
                    </td>
                  </tr>
                ) : displayedData.map((record, index) => (
                  <tr 
                    key={record._id || index} 
                    className={`border-b border-gray-200 dark:border-slate-700 hover:bg-cyan-50 dark:hover:bg-slate-700/40 transition-colors ${
                      record.status === 'absent' ? 'bg-red-50 dark:bg-red-900/10' : ''
                    }`}
                  >
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(record.status, record.checkIn, record.checkOut)}
                        <span className="font-medium">{formatDate(record.date, false, 'DD MMM YYYY')}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(record.status, record.checkIn, record.checkOut)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="font-mono">{formatTime(record.checkIn)}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="font-mono">{formatTime(record.checkOut)}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold">
                        {record.workHours ? `${record.workHours.toFixed(1)}h` : "—"}
                      </span>
                    </td>
                    <td className="p-4 max-w-xs">
                      <span className="text-gray-600 dark:text-gray-300 truncate">
                        {record.comments || record.reason || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {displayedData.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-lg font-medium">No attendance records found</p>
                <p className="text-sm">Try adjusting your date range</p>
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
                    {getStatusIcon(record.status, record.checkIn, record.checkOut)}
                    <span className="font-medium text-gray-900 dark:text-gray-100">{formatDate(record.date, false, 'DD MMM YYYY')}</span>
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
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Comments:</span>
                    <p className="text-gray-900 dark:text-gray-100 truncate">
                      {record.comments || record.reason || "—"}
                    </p>
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
} 