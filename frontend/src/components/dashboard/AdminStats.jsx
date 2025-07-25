import React from "react";
import { Users, UserCheck, UserX, FileText, Calendar } from "lucide-react";

const AdminStats = ({ summaryData, isLoading }) => {
  const stats = [
    { 
      title: "Present Today", 
      value: summaryData?.presentToday ?? "...", 
      icon: UserCheck, 
      color: "green" 
    },
    { 
      title: "Absent Today", 
      value: summaryData?.absentToday ?? "...", 
      icon: UserX, 
      color: "red" 
    },
    { 
      title: "Pending Requests", 
      value: summaryData?.totalPendingRequests ?? "...", 
      icon: FileText, 
      color: "amber" 
    },
    { 
      title: "Upcoming Holidays", 
      value: summaryData?.upcomingHolidays ?? "...", 
      icon: Calendar, 
      color: "purple" 
    },
  ];

  const colorClasses = {
    green: "bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-300",
    red: "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-300",
    amber: "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300",
    purple: "bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-300",
  };
  
  const textClasses = {
    green: "text-green-600 dark:text-green-400",
    red: "text-red-600 dark:text-red-400",
    amber: "text-amber-600 dark:text-amber-400",
    purple: "text-purple-600 dark:text-purple-400",
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-3 sm:p-5 animate-pulse">
            <div className="flex justify-between items-center">
              <div className="h-3 sm:h-4 bg-gray-200 dark:bg-neutral-700 rounded w-3/4"></div>
              <div className="h-6 w-6 sm:h-8 sm:w-8 bg-gray-200 dark:bg-neutral-700 rounded-full"></div>
            </div>
            <div className="h-6 sm:h-8 bg-gray-200 dark:bg-neutral-700 rounded w-1/2 mt-3 sm:mt-4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.title} className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl p-3 sm:p-4 lg:p-5 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-neutral-400 leading-tight">{stat.title}</p>
              <div className={`p-1.5 sm:p-2 rounded-full ${colorClasses[stat.color]}`}>
                <Icon size={16} className="sm:w-5 sm:h-5" />
              </div>
            </div>
            <p className={`text-xl sm:text-2xl lg:text-3xl font-bold ${textClasses[stat.color]}`}>{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
};

export default AdminStats; 