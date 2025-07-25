import React from "react";
import { Calendar, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const AttendanceStats = ({ attendanceData, holidays, isLoading = false }) => {
  const currentDate = new Date();
  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  // Helper function to check if date is a working day
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

  // Calculate actual working days in the month (excluding weekends and holidays)
  const calculateWorkingDays = () => {
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
  };

  const workingDaysInMonth = calculateWorkingDays();
  
  // Count weekends in the month
  const calculateWeekends = () => {
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
  };

  const presentDays = attendanceData.filter(day => day.status === "present").length;
  const absentDays = attendanceData.filter(day => day.status === "absent").length;
  const halfDays = attendanceData.filter(day => day.status === "half-day").length;
  const holidaysCount = holidays.length;
  const weekendsCount = calculateWeekends();

  const calculateAttendancePercentage = () => {
    if (workingDaysInMonth <= 0) return "0.0";
    return Math.min(((presentDays + (halfDays * 0.5)) / workingDaysInMonth) * 100, 100).toFixed(1);
  };

  const cards = [
    { title: "Working Days", value: workingDaysInMonth, icon: Calendar, color: "cyan", barWidth: `${(workingDaysInMonth / (daysInMonth || 1)) * 100}%` },
    { title: "Present Days", value: presentDays, icon: CheckCircle, color: "green", barWidth: `${calculateAttendancePercentage()}%`, subText: `${calculateAttendancePercentage()}% att.` },
    { title: "Absent Days", value: absentDays, icon: XCircle, color: "red", barWidth: `${workingDaysInMonth > 0 ? (absentDays / workingDaysInMonth) * 100 : 0}%` },
    { title: "Half Days", value: halfDays, icon: AlertCircle, color: "amber", barWidth: `${workingDaysInMonth > 0 ? (halfDays / workingDaysInMonth) * 100 : 0}%` },
    { title: "Holidays", value: holidaysCount, icon: Calendar, color: "purple", barWidth: `${(holidaysCount / (daysInMonth || 1)) * 100}%` },
  ];

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
          purple: "text-purple-600 dark:text-purple-400"
        };
        const iconClasses = { 
          cyan: "text-cyan-500 dark:text-cyan-400", 
          green: "text-green-500 dark:text-green-400", 
          red: "text-red-500 dark:text-red-400", 
          amber: "text-amber-500 dark:text-amber-400", 
          purple: "text-purple-500 dark:text-purple-400"
        };
        const barClasses = { 
          cyan: "bg-cyan-500 dark:bg-cyan-500", 
          green: "bg-green-500 dark:bg-green-500", 
          red: "bg-red-500 dark:bg-red-500", 
          amber: "bg-amber-500 dark:bg-amber-500", 
          purple: "bg-purple-500 dark:bg-purple-500"
        };
        
        return (
          <div key={card.title} className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl p-3 sm:p-5 transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-1.5">
            <div className="flex items-center justify-between mb-2 sm:mb-3.5">
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-neutral-400">{card.title}</p>
              <Icon size={20} className={`${iconClasses[card.color]}`} />
            </div>
            <p className={`text-xl sm:text-3xl font-bold ${textClasses[card.color]}`}>{card.value}</p>
            <div className="mt-2 sm:mt-3.5 h-2 w-full bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div className={`h-2 ${barClasses[card.color]} rounded-full transition-all duration-500`} style={{ width: card.barWidth }}></div>
            </div>
            {card.subText && <p className="text-xs text-gray-500 dark:text-neutral-400 mt-2">{card.subText}</p>}
          </div>
        );
      })}
    </div>
  );
};

export default AttendanceStats; 