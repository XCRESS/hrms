import React from "react";
import { Calendar, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const AttendanceStats = ({ attendanceData, holidays }) => {
  const daysInMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate();
  
  const presentDays = attendanceData.filter(day => day.status === "present").length;
  const absentDays = attendanceData.filter(day => day.status === "absent").length;
  const halfDays = attendanceData.filter(day => day.status === "half-day").length;
  const holidaysCount = holidays.length;

  const calculateAttendancePercentage = () => {
    const workingDays = daysInMonth - holidaysCount;
    if (workingDays <= 0) return "0.0";
    return Math.min((presentDays / workingDays) * 100, 100).toFixed(1);
  };

  const cards = [
    { title: "Days this Month", value: daysInMonth, icon: Calendar, color: "cyan", barWidth: '100%' },
    { title: "Present Days", value: presentDays, icon: CheckCircle, color: "green", barWidth: `${calculateAttendancePercentage()}%`, subText: `${calculateAttendancePercentage()}% att.` },
    { title: "Absent Days", value: absentDays, icon: XCircle, color: "red", barWidth: `${(absentDays / (daysInMonth || 1)) * 100}%` },
    { title: "Half Days", value: halfDays, icon: AlertCircle, color: "amber", barWidth: `${(halfDays / (daysInMonth || 1)) * 100}%` },
    { title: "Holidays", value: holidaysCount, icon: Calendar, color: "purple", barWidth: `${(holidaysCount / (daysInMonth || 1)) * 100}%` },
  ];

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