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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-5 animate-pulse">
            <div className="flex justify-between items-center">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
              <div className="h-8 w-8 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
            </div>
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mt-4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.title} className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-4 sm:p-5 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{stat.title}</p>
              <div className={`p-2 rounded-full ${colorClasses[stat.color]}`}>
                <Icon size={20} />
              </div>
            </div>
            <p className={`text-2xl sm:text-3xl font-bold ${textClasses[stat.color]}`}>{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
};

export default AdminStats; 