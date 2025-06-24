import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, Users, UserCheck, UserX } from 'lucide-react';
import apiClient from '@/service/apiClient';

const AdminAttendanceTable = ({ onRefresh }) => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });

  useEffect(() => {
    fetchTodayAttendanceWithAbsents();
  }, []);

  const fetchTodayAttendanceWithAbsents = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getTodayAttendanceWithAbsents();
      
      if (response.success) {
        const records = response.data.records || [];
        setAttendanceData(records);
        setStats({
          total: response.data.total || records.length,
          present: response.data.present || records.filter(r => r.status === 'present').length,
          absent: response.data.absent || records.filter(r => r.status === 'absent').length
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch attendance data');
    } finally {
      setIsLoading(false);
    }
  };

  // Register refresh function globally for header refresh button
  useEffect(() => {
    window.refreshAttendanceTable = fetchTodayAttendanceWithAbsents;
    
    // Cleanup on unmount
    return () => {
      delete window.refreshAttendanceTable;
    };
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'absent':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'half-day':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'late':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      present: 'Present',
      absent: 'Absent',
      'half-day': 'Half Day',
      late: 'Late',
      leave: 'On Leave'
    };
    return statusMap[status] || 'Unknown';
  };

  const getStatusBadge = (status) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-semibold";
    switch (status) {
      case 'present':
        return `${baseClasses} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`;
      case 'absent':
        return `${baseClasses} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300`;
      case 'half-day':
        return `${baseClasses} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`;
      case 'late':
        return `${baseClasses} bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300`;
    }
  };

  const formatTime = (time) => {
    if (!time) return '—';
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">
          Today's Attendance
        </h3>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">
          Today's Attendance
        </h3>
        <div className="text-center text-red-500 py-4">
          <p>{error}</p>
          <button 
            onClick={fetchTodayAttendanceWithAbsents}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200/50 dark:border-neutral-700/50 p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mb-1">
            Today's Attendance
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Real-time attendance overview for all employees
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
          <div className="flex items-center gap-1 bg-neutral-50 dark:bg-neutral-700/50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
            <Users className="w-3 h-3 sm:w-4 sm:h-4 text-neutral-500" />
            <span className="text-neutral-500 dark:text-neutral-400 font-medium text-xs sm:text-sm">{stats.total} total</span>
          </div>
          <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
            <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
            <span className="text-green-600 dark:text-green-400 font-medium text-xs sm:text-sm">{stats.present} present</span>
          </div>
          <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
            <UserX className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
            <span className="text-red-600 dark:text-red-400 font-medium text-xs sm:text-sm">{stats.absent} absent</span>
          </div>
        </div>
      </div>
      
      {/* Mobile Card Layout */}
      <div className="block md:hidden">
        {attendanceData.length > 0 ? (
          <div className="space-y-3">
            {attendanceData.map((record, index) => (
              <div 
                key={record.employee._id || index} 
                className={`border rounded-lg p-4 transition-colors ${
                  record.status === 'absent' 
                    ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10' 
                    : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/30'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-neutral-800 dark:text-neutral-100 truncate">
                      {record.employeeName || 'Unknown Employee'}
                    </div>
                    {record.employee?.employeeId && (
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        ID: {record.employee.employeeId}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(record.status)}
                    <span className={`${getStatusBadge(record.status)}`}>
                      {getStatusText(record.status)}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400 text-xs uppercase font-semibold block">Check In</span>
                    <span className="text-neutral-600 dark:text-neutral-300 font-mono">{formatTime(record.checkIn)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400 text-xs uppercase font-semibold block">Check Out</span>
                    <span className="text-neutral-600 dark:text-neutral-300 font-mono">{formatTime(record.checkOut)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400 text-xs uppercase font-semibold block">Hours</span>
                    <span className="text-neutral-600 dark:text-neutral-300 font-semibold">
                      {record.workHours ? `${record.workHours.toFixed(1)}h` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400 text-xs uppercase font-semibold block">Department</span>
                    <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs">
                      {record.employee?.department || 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No employees found</p>
            <p className="text-sm">Check your employee database</p>
          </div>
        )}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-neutral-700 dark:to-neutral-800 border-b border-neutral-200 dark:border-neutral-600">
              <th className="text-left py-4 px-4 font-semibold text-neutral-700 dark:text-neutral-300 text-sm">Employee</th>
              <th className="text-left py-4 px-4 font-semibold text-neutral-700 dark:text-neutral-300 text-sm">Status</th>
              <th className="text-left py-4 px-4 font-semibold text-neutral-700 dark:text-neutral-300 text-sm">Check In</th>
              <th className="text-left py-4 px-4 font-semibold text-neutral-700 dark:text-neutral-300 text-sm">Check Out</th>
              <th className="text-left py-4 px-4 font-semibold text-neutral-700 dark:text-neutral-300 text-sm">Hours</th>
              <th className="text-left py-4 px-4 font-semibold text-neutral-700 dark:text-neutral-300 text-sm">Department</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {attendanceData.length > 0 ? attendanceData.map((record, index) => (
              <tr 
                key={record.employee._id || index} 
                className={`hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors ${
                  record.status === 'absent' ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-white dark:bg-neutral-800'
                }`}
              >
                <td className="py-4 px-4">
                  <div>
                    <div className="font-medium text-neutral-800 dark:text-neutral-100">
                      {record.employeeName || 'Unknown Employee'}
                    </div>
                    {record.employee?.employeeId && (
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        ID: {record.employee.employeeId}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(record.status)}
                    <span className={`text-sm font-medium ${getStatusBadge(record.status)}`}>
                      {getStatusText(record.status)}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-sm text-neutral-600 dark:text-neutral-300 font-mono">
                  {formatTime(record.checkIn)}
                </td>
                <td className="py-4 px-4 text-sm text-neutral-600 dark:text-neutral-300 font-mono">
                  {formatTime(record.checkOut)}
                </td>
                <td className="py-4 px-4 text-sm text-neutral-600 dark:text-neutral-300 font-semibold">
                  {record.workHours ? `${record.workHours.toFixed(1)}h` : '—'}
                </td>
                <td className="py-4 px-4 text-sm text-neutral-600 dark:text-neutral-300">
                  <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs">
                    {record.employee?.department || 'Unassigned'}
                  </span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" className="py-12 text-center text-neutral-500 dark:text-neutral-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">No employees found</p>
                  <p className="text-sm">Check your employee database</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminAttendanceTable; 