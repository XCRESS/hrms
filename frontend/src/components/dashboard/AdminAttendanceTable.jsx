import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import apiClient from '@/service/apiClient';

const AdminAttendanceTable = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTodayAttendance();
  }, []);

  const fetchTodayAttendance = async () => {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const response = await apiClient.getAttendanceRecords({
        startDate: today,
        endDate: today,
        limit: 50
      });
      
      if (response.success) {
        setAttendanceData(response.data.records || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch attendance data');
    } finally {
      setIsLoading(false);
    }
  };

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
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
          Today's Attendance
        </h3>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          {attendanceData.length} employees
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-700">
              <th className="text-left py-3 px-2 font-medium text-neutral-600 dark:text-neutral-300">Employee</th>
              <th className="text-left py-3 px-2 font-medium text-neutral-600 dark:text-neutral-300">Status</th>
              <th className="text-left py-3 px-2 font-medium text-neutral-600 dark:text-neutral-300">Check In</th>
              <th className="text-left py-3 px-2 font-medium text-neutral-600 dark:text-neutral-300">Check Out</th>
              <th className="text-left py-3 px-2 font-medium text-neutral-600 dark:text-neutral-300">Hours</th>
            </tr>
          </thead>
          <tbody>
            {attendanceData.length > 0 ? attendanceData.map((record, index) => (
              <tr key={index} className="border-b border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                <td className="py-3 px-2">
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
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(record.status)}
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                      {getStatusText(record.status)}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-2 text-sm text-neutral-600 dark:text-neutral-300">
                  {formatTime(record.checkIn)}
                </td>
                <td className="py-3 px-2 text-sm text-neutral-600 dark:text-neutral-300">
                  {formatTime(record.checkOut)}
                </td>
                <td className="py-3 px-2 text-sm text-neutral-600 dark:text-neutral-300">
                  {record.workHours ? `${record.workHours}h` : '—'}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" className="py-8 text-center text-neutral-500 dark:text-neutral-400">
                  No attendance records found for today
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