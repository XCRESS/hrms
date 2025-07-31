import React, { useMemo, memo } from "react";
import { Calendar, CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";

const AttendanceStats = ({ attendanceData, holidays, isLoading = false }) => {
  const currentDate = new Date();
  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  // 🚀 OPTIMIZED: Helper function to check if date is a working day (memoized)
  const isWorkingDayForCompany = useMemo(() => {
    return (date) => {
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
  }, []); // No dependencies as logic is pure

  // 🚀 OPTIMIZED: Calculate actual working days in the month (memoized to prevent recalculation)
  const workingDaysInMonth = useMemo(() => {
    let workingDays = 0;
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const currentDateIterator = new Date(firstDay);
    
    while (currentDateIterator <= lastDay) {
      if (isWorkingDayForCompany(currentDateIterator)) {
        // Check if this date is not a holiday
        const isHoliday = holidays.some(holiday => {
          if (holiday.date) {
            const holidayDate = new Date(holiday.date);
            return holidayDate.toDateString() === currentDateIterator.toDateString();
          }
          return false;
        });
        
        if (!isHoliday) {
          workingDays++;
        }
      }
      currentDateIterator.setDate(currentDateIterator.getDate() + 1);
    }
    
    return workingDays;
  }, [currentDate.getMonth(), currentDate.getFullYear(), holidays, isWorkingDayForCompany]);
  
  // 🚀 OPTIMIZED: Count weekends in the month (memoized)
  const weekendsInMonth = useMemo(() => {
    let weekends = 0;
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const currentDateIterator = new Date(firstDay);
    
    while (currentDateIterator <= lastDay) {
      if (!isWorkingDayForCompany(currentDateIterator)) {
        weekends++;
      }
      currentDateIterator.setDate(currentDateIterator.getDate() + 1);
    }
    
    return weekends;
  }, [currentDate.getMonth(), currentDate.getFullYear(), isWorkingDayForCompany]);

  // 🚀 OPTIMIZED: Count holidays in the month (memoized)
  const holidaysInMonth = useMemo(() => {
    let holidayCount = 0;
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const currentDateIterator = new Date(firstDay);
    
    while (currentDateIterator <= lastDay) {
      if (isWorkingDayForCompany(currentDateIterator)) {
        // Check if this working day is a holiday
        const isHoliday = holidays.some(holiday => {
          if (holiday.date) {
            const holidayDate = new Date(holiday.date);
            return holidayDate.toDateString() === currentDateIterator.toDateString();
          }
          return false;
        });
        
        if (isHoliday) {
          holidayCount++;
        }
      }
      currentDateIterator.setDate(currentDateIterator.getDate() + 1);
    }
    
    return holidayCount;
  }, [currentDate.getMonth(), currentDate.getFullYear(), holidays, isWorkingDayForCompany]);

  // 🚀 OPTIMIZED: Calculate attendance statistics (memoized to prevent recalculation)
  const attendanceStats = useMemo(() => {
    const today = new Date();
    // Use local time formatting to avoid timezone issues
    const todayDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Filter attendance data to only include days up to today
    const relevantAttendanceData = attendanceData.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate <= today;
    });
    
    // Check if today's record exists - using local time formatting
    const todayRecord = relevantAttendanceData.find(record => {
      const recordDate = new Date(record.date);
      const recordDateString = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`;
      return recordDateString === todayDateString;
    });
    
    // Count different types of days in a single pass for better performance
    let presentDays = 0;
    let absentDays = 0;
    let halfDays = 0;
    let invalidDays = 0;
    
    relevantAttendanceData.forEach(day => {
      const dayDate = new Date(day.date);
      const isWorkingDay = isWorkingDayForCompany(dayDate);
      
      if (day.status === "present") {
        presentDays++;
      } else if (day.status === "half-day") {
        halfDays++;
        presentDays++; // Half days are also counted as present
      } else if (day.status === "absent" && isWorkingDay) {
        absentDays++;
      } else if (day.checkIn && !day.checkOut && day.status !== "half-day") {
        invalidDays++;
        presentDays++; // Missing checkouts are counted as present
      }
    });
    
    return { presentDays, absentDays, halfDays, invalidDays, relevantAttendanceData };
  }, [attendanceData, isWorkingDayForCompany]);

  // 🚀 OPTIMIZED: Calculate attendance percentage (memoized)
  const attendancePercentage = useMemo(() => {
    if (workingDaysInMonth <= 0) return "0.0";
    // Present days now includes half-days and invalid days (missing checkouts)
    const effectivePresentDays = attendanceStats.presentDays - attendanceStats.halfDays + (attendanceStats.halfDays * 0.5); // Half days count as 0.5
    return Math.min((effectivePresentDays / workingDaysInMonth) * 100, 100).toFixed(1);
  }, [workingDaysInMonth, attendanceStats]);

  // 🚀 OPTIMIZED: Calculate working days up to today (memoized)
  const workingDaysToDate = useMemo(() => {
    const today = new Date();
    let count = 0;
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(Math.min(today.getTime(), new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getTime()));
    
    const currentDateIterator = new Date(firstDay);
    
    while (currentDateIterator <= lastDay) {
      if (isWorkingDayForCompany(currentDateIterator)) {
        // Check if this date is not a holiday
        const isHoliday = holidays.some(holiday => {
          if (holiday.date) {
            const holidayDate = new Date(holiday.date);
            return holidayDate.toDateString() === currentDateIterator.toDateString();
          }
          return false;
        });
        
        if (!isHoliday) {
          count++;
        }
      }
      currentDateIterator.setDate(currentDateIterator.getDate() + 1);
    }
    
    return count;
  }, [currentDate.getMonth(), currentDate.getFullYear(), holidays, isWorkingDayForCompany]);

  // 🚀 OPTIMIZED: Memoize cards array to prevent recreation on every render
  const cards = useMemo(() => [
    { 
      title: "Working Days", 
      value: workingDaysInMonth, 
      icon: Calendar, 
      color: "cyan", 
      barWidth: `${(workingDaysInMonth / (daysInMonth || 1)) * 100}%`,
      breakdown: {
        totalDays: daysInMonth,
        weekendDays: weekendsInMonth,
        holidayDays: holidaysInMonth,
        workingDays: workingDaysInMonth
      }
    },
    { title: "Present Days", value: attendanceStats.presentDays, icon: CheckCircle, color: "green", barWidth: `${attendancePercentage}%`, subText: `${attendancePercentage}% att.` },
    { title: "Absent Days", value: attendanceStats.absentDays, icon: XCircle, color: "red", barWidth: `${workingDaysToDate > 0 ? (attendanceStats.absentDays / workingDaysToDate) * 100 : 0}%` },
    { title: "Half Days", value: attendanceStats.halfDays, icon: AlertCircle, color: "amber", barWidth: `${workingDaysToDate > 0 ? (attendanceStats.halfDays / workingDaysToDate) * 100 : 0}%` },
    { title: "Invalid Days", value: attendanceStats.invalidDays, icon: Clock, color: "orange", barWidth: `${workingDaysToDate > 0 ? (attendanceStats.invalidDays / workingDaysToDate) * 100 : 0}%` },
  ], [workingDaysInMonth, daysInMonth, attendanceStats, attendancePercentage, workingDaysToDate, weekendsInMonth, holidaysInMonth]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl p-3 sm:p-5 animate-pulse">
            <div className="flex items-center justify-between mb-2 sm:mb-3.5">
              <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-16"></div>
              <div className="w-5 h-5 bg-neutral-200 dark:bg-neutral-700 rounded-full"></div>
            </div>
            <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-12 mb-2"></div>
            <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        // Define color classes based on light/dark mode and card type
        const textClasses = { 
          cyan: "text-cyan-600 dark:text-cyan-400", 
          green: "text-green-600 dark:text-green-400", 
          red: "text-red-600 dark:text-red-400", 
          amber: "text-amber-600 dark:text-amber-400", 
          orange: "text-orange-600 dark:text-orange-400",
          purple: "text-purple-600 dark:text-purple-400"
        };
        const iconClasses = { 
          cyan: "text-cyan-500 dark:text-cyan-400", 
          green: "text-green-500 dark:text-green-400", 
          red: "text-red-500 dark:text-red-400", 
          amber: "text-amber-500 dark:text-amber-400", 
          orange: "text-orange-500 dark:text-orange-400",
          purple: "text-purple-500 dark:text-purple-400"
        };
        const barClasses = { 
          cyan: "bg-cyan-500 dark:bg-cyan-500", 
          green: "bg-green-500 dark:bg-green-500", 
          red: "bg-red-500 dark:bg-red-500", 
          amber: "bg-amber-500 dark:bg-amber-500", 
          orange: "bg-orange-500 dark:bg-orange-500",
          purple: "bg-purple-500 dark:bg-purple-500"
        };
        
        return (
          <div 
            key={card.title} 
            className={`bg-white dark:bg-neutral-800 rounded-xl shadow-xl p-3 sm:p-5 transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-1.5 ${card.breakdown ? 'relative group cursor-help' : ''}`}
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3.5">
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-neutral-400">{card.title}</p>
              <Icon size={20} className={`${iconClasses[card.color]}`} />
            </div>
            <p className={`text-xl sm:text-3xl font-bold ${textClasses[card.color]}`}>{card.value}</p>
            <div className="mt-2 sm:mt-3.5 h-2 w-full bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div className={`h-2 ${barClasses[card.color]} rounded-full transition-all duration-500`} style={{ width: card.barWidth }}></div>
            </div>
            {card.subText && <p className="text-xs text-gray-500 dark:text-neutral-400 mt-2">{card.subText}</p>}
            
            {/* Custom Tooltip for Working Days */}
            {card.breakdown && (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-black dark:bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                <div className="text-center">
                  <div className="font-semibold mb-1">Working Days Calculation:</div>
                  <div>Total days in month: {card.breakdown.totalDays}</div>
                  <div className="text-red-300">- Weekend days: {card.breakdown.weekendDays}</div>
                  <div className="text-orange-300">- Holiday days: {card.breakdown.holidayDays}</div>
                  <div className="border-t border-gray-600 mt-1 pt-1 font-semibold text-cyan-300">
                    = Working days: {card.breakdown.workingDays}
                  </div>
                </div>
                {/* Tooltip arrow */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-black dark:border-b-gray-900"></div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// 🚀 OPTIMIZED: Wrap component with React.memo to prevent unnecessary re-renders
export default memo(AttendanceStats); 