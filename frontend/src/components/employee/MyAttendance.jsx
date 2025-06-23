import React, { useEffect, useState } from "react";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import apiClient from "../../service/apiClient";

export default function MyAttendance() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), // First day of current month
    endDate: new Date().toISOString().slice(0, 10) // Today
  });
  
  const recordsPerPage = 10;

  const fetchAttendance = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: recordsPerPage,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };
      
      const response = await apiClient.getMyAttendanceRecords(params);
      if (response.success && response.data?.records) {
        setAttendanceData(response.data.records.map(record => ({
          ...record,
          date: new Date(record.date),
          checkIn: record.checkIn ? new Date(record.checkIn) : null,
          checkOut: record.checkOut ? new Date(record.checkOut) : null
        })));
        
        setTotalRecords(response.data.total || response.data.records.length);
        setTotalPages(Math.ceil((response.data.total || response.data.records.length) / recordsPerPage));
      }
    } catch (err) {
      console.error("Failed to fetch attendance:", err);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance(currentPage);
  }, [currentPage, dateRange]);

  const formatTime = (date) => date ? new Intl.DateTimeFormat('en-US', { 
    hour: '2-digit', minute: '2-digit', hour12: true 
  }).format(date) : "—";

  const formatDate = (date) => new Intl.DateTimeFormat('en-US', { 
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
  }).format(date);

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
    if (status === "present") {
      if (checkIn && checkOut) {
        return <span className="px-3 py-1 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold">Complete</span>;
      } else if (checkIn && !checkOut) {
        return <span className="px-3 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full text-xs font-semibold">Incomplete</span>;
      }
    }
    if (status === "absent") return <span className="px-3 py-1 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 rounded-full text-xs font-semibold">Absent</span>;
    if (status === "half-day") return <span className="px-3 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold">Half Day</span>;
    if (status === "late") return <span className="px-3 py-1 bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 rounded-full text-xs font-semibold">Late</span>;
    if (status === "leave") return <span className="px-3 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-full text-xs font-semibold">Leave</span>;
    return <span className="px-3 py-1 bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300 rounded-full text-xs font-semibold">{status}</span>;
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1); // Reset to first page when date range changes
  };

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
            <p className="text-sm text-gray-600 dark:text-gray-400">Track your attendance history</p>
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
                {attendanceData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                      <p className="text-lg font-medium">No attendance records found</p>
                      <p className="text-sm">Try adjusting your date range</p>
                    </td>
                  </tr>
                ) : attendanceData.map((record, index) => (
                  <tr key={record._id || index} className="border-b border-gray-200 dark:border-slate-700 hover:bg-cyan-50 dark:hover:bg-slate-700/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(record.status, record.checkIn, record.checkOut)}
                        <span className="font-medium">{formatDate(record.date)}</span>
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
            {attendanceData.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-lg font-medium">No attendance records found</p>
                <p className="text-sm">Try adjusting your date range</p>
              </div>
            ) : attendanceData.map((record, index) => (
              <div key={record._id || index} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(record.status, record.checkIn, record.checkOut)}
                    <span className="font-medium text-gray-900 dark:text-gray-100">{formatDate(record.date)}</span>
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
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-0">
                Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, totalRecords)} of {totalRecords} records
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        currentPage === pageNum
                          ? 'bg-cyan-600 text-white'
                          : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 