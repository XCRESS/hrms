import React, { useEffect, useState, FormEvent } from 'react';
import { Edit3, X, Save } from 'lucide-react';
import { useUpdateAttendanceRecord } from '../../../../hooks/queries';
import TimeInput from './TimeInput';
import { AttendanceRecord, Employee } from '../../../../types';

interface EditAttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: AttendanceRecord | null;
    employeeProfile: Employee | null;
    onUpdate: () => void;
}

interface FormData {
    status: string;
    checkIn: string;
    checkOut: string;
}

const EditAttendanceModal: React.FC<EditAttendanceModalProps> = ({ isOpen, onClose, record, employeeProfile, onUpdate }) => {
    const [formData, setFormData] = useState<FormData>({
        status: '',
        checkIn: '',
        checkOut: ''
    });
    const [error, setError] = useState('');
    const updateAttendanceMutation = useUpdateAttendanceRecord();

    useEffect(() => {
        if (record && isOpen) {
            const formatTimeForInput = (date: string | undefined, defaultTime: string) => {
                if (!date && !defaultTime) return '';

                // Use the record date to ensure we're working with the correct date
                const recordDate = new Date(record.date);
                // Format as YYYY-MM-DD using local time components to avoid timezone issues
                const year = recordDate.getFullYear();
                const month = String(recordDate.getMonth() + 1).padStart(2, '0');
                const day = String(recordDate.getDate()).padStart(2, '0');
                const baseDate = `${year}-${month}-${day}`;

                if (date) {
                    // Convert existing date to local time for display
                    const existingDate = new Date(date);
                    const hours = existingDate.getHours().toString().padStart(2, '0');
                    const minutes = existingDate.getMinutes().toString().padStart(2, '0');
                    return `${baseDate}T${hours}:${minutes}`;
                } else if (defaultTime) {
                    return `${baseDate}T${defaultTime}`;
                }
                return '';
            };

            setFormData({
                status: record.status || 'present',
                checkIn: formatTimeForInput(record.checkIn, '09:30'),
                checkOut: formatTimeForInput(record.checkOut, '17:30')
            });
            setError('');
        }
    }, [record, isOpen]);

    const handleStatusChange = (status: string) => {
        const recordDate = new Date(record?.date || new Date());
        // Format as YYYY-MM-DD using local time components to avoid timezone issues
        const year = recordDate.getFullYear();
        const month = String(recordDate.getMonth() + 1).padStart(2, '0');
        const day = String(recordDate.getDate()).padStart(2, '0');
        const baseDate = `${year}-${month}-${day}`;

        setFormData(prev => {
            const newData = { ...prev, status };

            // Only auto-fill times if they are currently empty or for specific status changes
            switch (status) {
                case 'present':
                    if (!newData.checkIn) newData.checkIn = `${baseDate}T09:30`;
                    if (!newData.checkOut) newData.checkOut = `${baseDate}T17:30`;
                    break;
                case 'half-day':
                    if (!newData.checkIn) newData.checkIn = `${baseDate}T09:30`;
                    // Always set checkout for half-day
                    newData.checkOut = `${baseDate}T13:30`;
                    break;
                case 'absent':
                    newData.checkIn = '';
                    newData.checkOut = '';
                    break;
            }

            return newData;
        });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!record) return;

        // TODO: Define strict type for updateData in Mutation or local interface
        const updateData: any = {
            status: formData.status,
            checkIn: formData.checkIn ? new Date(formData.checkIn).toISOString() : null,
            checkOut: formData.checkOut ? new Date(formData.checkOut).toISOString() : null
        };

        // For non-absent status, ensure we have valid times
        if (formData.status !== 'absent') {
            if (!updateData.checkIn) {
                setError('Check-in time is required for non-absent status');
                return;
            }
            // For present status, if no checkout is provided, keep the existing one or set null
            if (formData.status === 'present' && !updateData.checkOut && record?.checkOut) {
                updateData.checkOut = new Date(record.checkOut).toISOString();
            }
        }

        // For records that don't exist (absent days), include employee and date info
        if (!record._id) {
            updateData.employeeId = employeeProfile?.employeeId;
            updateData.date = record.date;
        }

        const recordId = record._id || 'new';

        updateAttendanceMutation.mutate(
            { recordId, updateData },
            {
                onSuccess: () => {
                    onUpdate();
                    onClose();
                },
                onError: (err: any) => {
                    setError(err.message || 'Failed to update attendance record');
                }
            }
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Edit3 className="w-5 h-5 text-cyan-600" />
                        Edit Attendance
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Date: {record ? new Date(record.date).toLocaleDateString() : ''}
                        </label>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Employee: {employeeProfile?.firstName} {employeeProfile?.lastName}
                        </label>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Status
                        </label>
                        <select
                            value={formData.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                            required
                        >
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="half-day">Half Day</option>
                        </select>
                    </div>

                    {formData.status !== 'absent' && (
                        <>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Check In Time
                                </label>
                                <TimeInput
                                    value={formData.checkIn}
                                    onChange={(value) => setFormData(prev => ({ ...prev, checkIn: value }))}
                                    className="w-full"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Check Out Time
                                </label>
                                <TimeInput
                                    value={formData.checkOut}
                                    onChange={(value) => setFormData(prev => ({ ...prev, checkOut: value }))}
                                    className="w-full"
                                />
                            </div>
                        </>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={updateAttendanceMutation.isPending}
                            className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {updateAttendanceMutation.isPending ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditAttendanceModal;
