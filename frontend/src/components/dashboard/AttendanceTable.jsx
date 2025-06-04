import React from "react";

const AttendanceTable = ({ attendanceData }) => {
  const formatTime = (date) => date ? new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(date) : "—";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl transition-colors duration-200">
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
        {attendanceData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs sm:text-sm text-gray-500 dark:text-slate-400 border-b-2 border-gray-200 dark:border-slate-700">
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 font-semibold">Date</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 font-semibold">Status</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 font-semibold">Check In</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 font-semibold">Check Out</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.map((record, index) => (
                  <tr key={index} className="border-b border-gray-100 dark:border-slate-700/70 hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors text-xs sm:text-sm">
                    <td className="py-2.5 sm:py-3.5 px-2 sm:px-3 text-gray-700 dark:text-slate-200">
                      {new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', weekday: 'short' }).format(record.date)}
                    </td>
                    <td className="py-2.5 sm:py-3.5 px-2 sm:px-3">
                      {record.status === "present" && <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold">Present</span>}
                      {record.status === "absent" && <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 rounded-full text-xs font-semibold">Absent</span>}
                      {record.status === "half-day" && <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full text-xs font-semibold">Half Day</span>}
                    </td>
                    <td className="py-2.5 sm:py-3.5 px-2 sm:px-3 text-gray-600 dark:text-slate-300">{formatTime(record.checkIn)}</td>
                    <td className="py-2.5 sm:py-3.5 px-2 sm:px-3 text-gray-600 dark:text-slate-300">{formatTime(record.checkOut)}</td>
                    <td className="py-2.5 sm:py-3.5 px-2 sm:px-3 text-gray-600 dark:text-slate-300 whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px] sm:max-w-[150px]" title={record.reason}>{record.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500 dark:text-slate-400">No attendance records found</div>
        )}
      </div>
    </div>
  );
};

export default AttendanceTable; 