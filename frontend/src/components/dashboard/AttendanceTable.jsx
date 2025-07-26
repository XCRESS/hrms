import React from "react";

const AttendanceTable = ({ attendanceData, isLoading = false }) => {
  const formatTime = (date) => date ? new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(date) : "—";

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl transition-colors duration-200">
      <div className="p-3 sm:p-5 border-b border-gray-200 dark:border-slate-700 flex flex-wrap sm:flex-nowrap justify-between items-center">
        <div className="w-full sm:w-auto mb-2 sm:mb-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-slate-100">Attendance History</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">Your recent attendance records</p>
        </div>
        <div className="bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium shadow-sm">
          {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
      </div>
      <div className="p-3">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-neutral-200 dark:bg-neutral-700 rounded opacity-75"></div>
            ))}
          </div>
        ) : attendanceData.length > 0 ? (
          <div className="w-full">
            {/* Desktop Table Headers */}
            <div className="hidden md:table-header-group w-full">
              <div className="md:table-row text-left text-xs text-gray-500 dark:text-slate-400 border-b-2 border-gray-200 dark:border-slate-700">
                <div className="md:table-cell py-3.5 px-3 font-semibold">Date</div>
                <div className="md:table-cell py-3.5 px-3 font-semibold">Status</div>
                <div className="md:table-cell py-3.5 px-3 font-semibold">Check In</div>
                <div className="md:table-cell py-3.5 px-3 font-semibold">Check Out</div>
                <div className="md:table-cell py-3.5 px-3 font-semibold">Reason</div>
              </div>
            </div>

            {/* Mobile Cards & Desktop Table Body */}
            <div className="md:table-row-group">
              {attendanceData.map((record, index) => (
                <div 
                  key={index} 
                  className="
                    md:table-row 
                    block p-4 mb-3 md:mb-0 border md:border-b md:border-x-0 border-gray-200 dark:border-slate-700 
                    rounded-lg md:rounded-none 
                    hover:bg-gray-50 dark:hover:bg-slate-700/40 
                    transition-colors text-sm
                  "
                >
                  {/* Date */}
                  <div className="md:table-cell py-2 md:py-3.5 px-0 md:px-3 align-middle">
                    <div className="flex justify-between items-center md:block">
                      <span className="text-xs font-bold text-gray-500 uppercase md:hidden">Date</span>
                      <span className="font-medium text-gray-800 dark:text-slate-100">
                        {new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', weekday: 'short' }).format(record.date)}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="md:table-cell py-2 md:py-3.5 px-0 md:px-3 align-middle">
                    <div className="flex justify-between items-center md:block">
                      <span className="text-xs font-bold text-gray-500 uppercase md:hidden">Status</span>
                      <span>
                        {record.status === "present" && <span className="px-3 py-1 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold">Present</span>}
                        {record.status === "absent" && <span className="px-3 py-1 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 rounded-full text-xs font-semibold">Absent</span>}
                        {record.status === "half-day" && <span className="px-3 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full text-xs font-semibold">Half Day</span>}
                      </span>
                    </div>
                  </div>

                  {/* Check In */}
                  <div className="md:table-cell py-2 md:py-3.5 px-0 md:px-3 align-middle">
                    <div className="flex justify-between items-center md:block">
                      <span className="text-xs font-bold text-gray-500 uppercase md:hidden">Check In</span>
                      <span className="text-gray-600 dark:text-slate-300 font-mono">{formatTime(record.checkIn)}</span>
                    </div>
                  </div>

                  {/* Check Out */}
                  <div className="md:table-cell py-2 md:py-3.5 px-0 md:px-3 align-middle">
                    <div className="flex justify-between items-center md:block">
                      <span className="text-xs font-bold text-gray-500 uppercase md:hidden">Check Out</span>
                      <span className="text-gray-600 dark:text-slate-300 font-mono">{formatTime(record.checkOut)}</span>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="md:table-cell py-2 md:py-3.5 px-0 md:px-3 align-middle md:max-w-[200px]">
                    <div className="flex justify-between items-start md:block">
                      <span className="text-xs font-bold text-gray-500 uppercase md:hidden mt-1">Reason</span>
                      <p className="text-gray-600 dark:text-slate-300 whitespace-normal break-words text-right md:text-left" title={record.reason}>
                        {record.reason || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500 dark:text-slate-400">
            <div className="flex flex-col items-center">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-lg font-medium">No attendance records found</p>
              <p className="text-sm">Your attendance data will appear here once available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceTable; 