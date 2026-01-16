import React from 'react';
import AttendanceTable from './attendance/AttendanceTable';
import AttendanceAnalytics from './attendance/AttendanceAnalytics';
import EditAttendanceModal from './attendance/EditAttendanceModal';
import { Employee, AttendanceRecord } from '../../types';

interface AttendanceSectionProps {
    employeeProfile: Employee | null;
    dateRange: { startDate: string; endDate: string };
    onDateRangeChange: React.Dispatch<React.SetStateAction<{ startDate: string; endDate: string }>>;
    onEditAttendance: (record: AttendanceRecord) => void;
    updateTrigger: number;
}

const AttendanceSection: React.FC<AttendanceSectionProps> = ({
    employeeProfile,
    dateRange,
    onDateRangeChange,
    onEditAttendance,
    updateTrigger
}) => {
    return (
        <div className="space-y-6">
            <AttendanceTable
                employeeId={employeeProfile?.employeeId}
                employeeProfile={employeeProfile}
                dateRange={dateRange}
                onDateRangeChange={onDateRangeChange}
                onEditAttendance={onEditAttendance}
                updateTrigger={updateTrigger}
            />
        </div>
    );
};

export { AttendanceAnalytics, EditAttendanceModal, AttendanceTable };
export default AttendanceSection;
