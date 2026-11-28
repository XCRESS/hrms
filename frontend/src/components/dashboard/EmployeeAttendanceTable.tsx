import React, { useState, memo, useMemo, type JSX } from 'react';
import { CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Heart, Calendar } from 'lucide-react';
import useAuth from '@/hooks/authjwt';
import { DateTime } from 'luxon';
import { formatTime, getISTDateString } from '@/utils/luxonUtils';
import { getWeeklyOffReason } from '@/utils/workingDay';

const toISTDay = (date: Date): DateTime =>
  DateTime.fromObject({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() }, { zone: 'Asia/Kolkata' });
import { useEmployeeAttendanceWithAbsents, useEffectiveSettings } from '@/hooks/queries';

// Types
interface AttendanceRecord {
  _id?: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  isWorkingDay: boolean;
  holidayTitle?: string;
}

interface EmployeeInfo {
  _id?: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department?: string;
}

interface EmployeeAttendanceRecord {
  employee: EmployeeInfo;
  employeeName: string;
  weekData: {
    [key: string]: AttendanceRecord;
  };
}

interface DateRange {
  startDate: string;
  endDate: string;
  firstDay: Date;
  lastDay: Date;
}

interface RegularizationPrefillData {
  date: Date;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  reason?: string;
}

interface EmployeeAttendanceTableProps {
  onRegularizationRequest?: (data: RegularizationPrefillData) => void;
}

/** Window index (counted back from the month's last 4 days) whose window ends on today, or 0 when today isn't in `days`. */
const initialWindowIndex = (days: Date[]): number => {
  const today = new Date().toDateString();
  const todayIndex = days.findIndex(day => day.toDateString() === today);
  if (todayIndex === -1) return 0;
  const startIndex = Math.max(0, Math.min(todayIndex + 1, days.length) - 4);
  return Math.max(0, days.length - 4 - startIndex);
};

const EmployeeAttendanceTable = memo(({ onRegularizationRequest }: EmployeeAttendanceTableProps) => {
  const user = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [currentWindowIndex, setCurrentWindowIndex] = useState(0);

  const dateRange = useMemo<DateRange>(() => {
    const firstDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const lastDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
    return {
      startDate: getISTDateString(firstDay),
      endDate: getISTDateString(lastDay),
      firstDay,
      lastDay
    };
  }, [selectedMonth]);

  const { data: attendanceResponse, isLoading, error } = useEmployeeAttendanceWithAbsents({
    employeeId: user?.employeeId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  }, { enabled: !!user?.employeeId });

  const { data: effectiveSettings } = useEffectiveSettings(
    attendanceResponse?.data?.employee?.department,
    { enabled: !!attendanceResponse?.data?.employee?.department }
  );

  const responseData = attendanceResponse?.success ? attendanceResponse.data : undefined;

  const allWorkingDays: Date[] = [];
  if (responseData) {
    for (const d = new Date(dateRange.firstDay); d <= dateRange.lastDay; d.setDate(d.getDate() + 1)) {
      allWorkingDays.push(new Date(d));
    }
  }

  const [windowSource, setWindowSource] = useState<typeof responseData>(undefined);
  if (responseData !== windowSource) {
    setWindowSource(responseData);
    if (responseData) setCurrentWindowIndex(initialWindowIndex(allWorkingDays));
  }

  const maxWindowIndex = Math.max(0, allWorkingDays.length - 4);
  const windowStart = Math.max(0, maxWindowIndex - currentWindowIndex);
  const workingDays = allWorkingDays.slice(windowStart, windowStart + 4);

  let employeeRecord: EmployeeAttendanceRecord | null = null;
  if (responseData && user) {
    const employee = responseData.employee;
    const firstName = employee?.firstName || user.name?.split(' ')[0] || 'Employee';
    const lastName = employee?.lastName || user.name?.split(' ').slice(1).join(' ') || '';
    employeeRecord = {
      employee: {
        _id: employee?._id,
        employeeId: user.employeeId ?? '',
        firstName,
        lastName,
        department: employee?.department
      },
      employeeName: `${firstName} ${lastName}`,
      weekData: {}
    };

    for (const record of responseData.records || []) {
      const recordDate = new Date(record.date);
      const dateKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`;

      // Flag-based statuses apply only without a check-in; priority Leave > Holiday > Weekend, matching the backend.
      let finalStatus = record.status || 'absent';
      if (!record.checkIn) {
        if (record.flags?.isLeave || record.status === 'leave') {
          finalStatus = 'leave';
        } else if (record.flags?.isHoliday) {
          finalStatus = 'holiday';
        } else if (record.flags?.isWeekend) {
          finalStatus = 'weekend';
        }
      }

      employeeRecord.weekData[dateKey] = {
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        status: finalStatus,
        isWorkingDay: !record.flags?.isWeekend && !record.flags?.isHoliday,
        holidayTitle: record.flags?.isHoliday ? (record.holidayTitle || 'Holiday') : undefined
      };
    }
  }
  const attendanceData = employeeRecord ? [employeeRecord] : [];

  const handleAttendanceClick = (record: EmployeeAttendanceRecord, day: Date): void => {
    const attendanceForDay = getAttendanceForDay(record, day);

    const prefillData: RegularizationPrefillData = {
      date: day,
      checkIn: attendanceForDay.checkIn,
      checkOut: attendanceForDay.checkOut,
      status: attendanceForDay.status,
      reason: attendanceForDay.status === 'absent' ? 'I was present but forgot to check in/out' : undefined
    };

    onRegularizationRequest?.(prefillData);
  };

  const navigateWindow = (direction: number): void => {
    const newWindowIndex = currentWindowIndex + direction;
    if (newWindowIndex < 0 || newWindowIndex > maxWindowIndex) return;
    setCurrentWindowIndex(newWindowIndex);
  };

  // Handle month change
  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const [year, month] = event.target.value.split('-');
    const newDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    setSelectedMonth(newDate);
    setCurrentWindowIndex(0);
  };

  const getAttendanceIcon = (attendance: AttendanceRecord): JSX.Element => {
    if (attendance.status === 'weekend') {
      return <XCircle className="w-4 h-4 text-muted-foreground" />;
    }
    if (attendance.status === 'holiday') {
      return <Calendar className="w-4 h-4 text-orange-500" />;
    }
    if (attendance.status === 'leave') {
      return <Heart className="w-4 h-4 text-purple-500" />;
    }
    if (attendance.status === 'absent' || (!attendance.checkIn && !attendance.checkOut)) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    if (attendance.checkIn && attendance.checkOut) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (attendance.checkIn && !attendance.checkOut) {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
    return <XCircle className="w-4 h-4 text-muted-foreground" />;
  };

  const getAttendanceBadgeClass = (attendance: AttendanceRecord): string => {
    const baseClasses = "w-full max-w-[85px] sm:max-w-[95px] px-2 sm:px-3 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium flex flex-col items-center justify-center gap-1 sm:gap-1.5 min-h-[75px] sm:min-h-[85px] cursor-pointer hover:opacity-80 transition-opacity";

    if (attendance.status === 'weekend') {
      return `${baseClasses} bg-muted text-muted-foreground`;
    }
    if (attendance.status === 'holiday') {
      return `${baseClasses} bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300`;
    }
    if (attendance.status === 'leave') {
      return `${baseClasses} bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300`;
    }
    if (attendance.status === 'absent' || (!attendance.checkIn && !attendance.checkOut)) {
      return `${baseClasses} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300`;
    }
    if (attendance.checkIn && attendance.checkOut) {
      return `${baseClasses} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`;
    }
    if (attendance.checkIn && !attendance.checkOut) {
      return `${baseClasses} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`;
    }
    return `${baseClasses} bg-muted text-foreground`;
  };

  const formatDayDate = (date: Date): { day: string; dateStr: string; isWeekend: boolean } => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dayOfWeek = date.getDay();
    const day = dayNames[dayOfWeek];
    const dateNum = date.getDate().toString().padStart(2, '0');
    const month = monthNames[date.getMonth()];
    const isWeekend = !!getWeeklyOffReason(effectiveSettings?.attendance, toISTDay(date));

    return {
      day,
      dateStr: `${dateNum} ${month}`,
      isWeekend
    };
  };

  const getAttendanceForDay = (record: EmployeeAttendanceRecord, date: Date): AttendanceRecord => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    // If data exists in API response, use it
    if (record.weekData?.[dateKey]) {
      return record.weekData[dateKey];
    }

    const isWorkingDay = !getWeeklyOffReason(effectiveSettings?.attendance, toISTDay(date));

    return {
      checkIn: null,
      checkOut: null,
      status: isWorkingDay ? 'absent' : 'weekend',
      isWorkingDay,
      holidayTitle: undefined
    };
  };

  const getAttendanceStatusText = (attendance: AttendanceRecord): string | null => {
    if (attendance.status === 'weekend') return 'Weekend';
    if (attendance.status === 'holiday') return attendance.holidayTitle || 'Holiday';
    if (attendance.status === 'leave') return 'Leave';
    if (attendance.status === 'absent' || (!attendance.checkIn && !attendance.checkOut)) return 'Absent';
    if (attendance.checkIn && !attendance.checkOut) return null;
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Attendance Overview
        </h3>
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-muted rounded w-3/4"></div>
          <div className="flex gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-1 h-16 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-12 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          My Attendance Overview
        </h3>
        <div className="text-center text-red-500 py-4">
          <p>{error?.message || 'Failed to load attendance data'}</p>
        </div>
      </div>
    );
  }

  if (attendanceData.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          My Attendance Overview
        </h3>
        <div className="text-center text-muted-foreground py-8">
          <p className="text-lg font-medium">No attendance data found</p>
          <p className="text-sm">Your attendance records will appear here</p>
        </div>
      </div>
    );
  }

  const record = attendanceData[0]; // Since we only have one employee record

  return (
    <div className="bg-card rounded-xl shadow-lg border border-border 50 dark:border-border 50 p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
      {/* Navigation Controls */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-foreground">Attendance</h3>
        <div className="flex items-center gap-3">
        <button
          onClick={() => navigateWindow(1)}
          className="p-2 rounded-lg bg-muted hover:bg-muted transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          title="Previous 4 days"
          disabled={currentWindowIndex >= Math.max(0, allWorkingDays.length - 4)}
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <select
          value={`${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`}
          onChange={handleMonthChange}
          className="text-sm bg-muted text-foreground border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-sm min-w-[90px]"
        >
          {(() => {
            const options = [];
            const today = new Date();
            const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            for (let i = 0; i < 12; i++) {
              const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
              const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              const monthShort = monthShortNames[date.getMonth()];
              const yearShort = String(date.getFullYear()).slice(-2);
              const label = `${monthShort} ${yearShort}`;
              options.push(
                <option key={value} value={value}>
                  {label}
                </option>
              );
            }
            return options;
          })()}
        </select>
        <button
          onClick={() => navigateWindow(-1)}
          className="p-2 rounded-lg bg-muted hover:bg-muted transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          title="Next 4 days"
          disabled={currentWindowIndex <= 0}
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
        </div>
      </div>

      {/* Table Layout */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full">
          <thead>
            <tr className="bg-muted border-b border-border dark:border-border">
              <th className="text-left py-2 sm:py-4 px-2 sm:px-4 font-semibold text-foreground text-xs sm:text-sm">Date</th>
              {workingDays.map((day, index) => {
                const { day: dayName, dateStr, isWeekend } = formatDayDate(day);
                return (
                  <th key={index} className={`text-center py-2 sm:py-4 px-1 sm:px-2 font-semibold text-xs sm:text-sm min-w-[75px] sm:min-w-[95px] ${
                    isWeekend
                      ? 'text-muted-foreground'
                      : 'text-foreground'
                  }`}>
                    <div className="flex flex-col items-center">
                      <span className={isWeekend ? 'text-muted-foreground' : ''}>{dayName}</span>
                      <span className={`text-xs ${
                        isWeekend
                          ? 'text-muted-foreground'
                          : 'text-muted-foreground'
                      }`}>{dateStr}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
            <tr className="hover:bg-muted dark:hover:bg-muted 30 transition-colors bg-card">
              <td className="py-2 sm:py-4 px-2 sm:px-4">
                <div className="font-medium text-sm sm:text-base text-foreground">
                  {record.employeeName ? record.employeeName.split(' ')[0] : 'Attendance'}
                </div>
              </td>
              {workingDays.map((day, dayIndex) => {
                const dayAttendance = getAttendanceForDay(record, day);
                return (
                  <td key={dayIndex} className="py-2 sm:py-4 px-1 sm:px-2">
                    <div
                      className="flex justify-center cursor-pointer hover:bg-muted dark:hover:bg-muted rounded-lg p-1 sm:p-2"
                      onClick={() => handleAttendanceClick(record, day)}
                    >
                      <div className={getAttendanceBadgeClass(dayAttendance)}>
                        {getAttendanceIcon(dayAttendance)}
                        {getAttendanceStatusText(dayAttendance) && (
                          <span className="text-xs sm:text-xs font-medium text-center leading-tight">{getAttendanceStatusText(dayAttendance)}</span>
                        )}
                        {dayAttendance.checkIn && (
                          <div className="text-xs sm:text-xs font-mono opacity-80 text-center leading-tight">
                            <div className="truncate">{formatTime(dayAttendance.checkIn)}</div>
                            {dayAttendance.checkOut && (
                              <div className="truncate">{formatTime(dayAttendance.checkOut)}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
});

EmployeeAttendanceTable.displayName = 'EmployeeAttendanceTable';

export default EmployeeAttendanceTable;