import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface TimeInputProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

const TimeInput: React.FC<TimeInputProps> = ({ value, onChange, className }) => {
    const [timeState, setTimeState] = useState({
        hour: '',
        minute: '',
        period: 'AM'
    });

    // Convert datetime-local value to 12-hour format
    useEffect(() => {
        if (value) {
            const date = new Date(value);
            // Handle invalid date
            if (isNaN(date.getTime())) {
                setTimeState({ hour: '', minute: '', period: 'AM' });
                return;
            }

            let hour = date.getHours();
            const minute = date.getMinutes();
            const period = hour >= 12 ? 'PM' : 'AM';

            if (hour > 12) hour -= 12;
            if (hour === 0) hour = 12;

            setTimeState({
                hour: hour.toString().padStart(2, '0'),
                minute: minute.toString().padStart(2, '0'),
                period
            });
        } else {
            setTimeState({ hour: '', minute: '', period: 'AM' });
        }
    }, [value]);

    const handleTimeChange = (field: 'hour' | 'minute' | 'period', newValue: string) => {
        const newTimeState = { ...timeState, [field]: newValue };
        setTimeState(newTimeState);

        if (newTimeState.hour && newTimeState.minute) {
            // Convert back to datetime-local format
            let hour24 = parseInt(newTimeState.hour);
            if (newTimeState.period === 'AM' && hour24 === 12) hour24 = 0;
            if (newTimeState.period === 'PM' && hour24 !== 12) hour24 += 12;

            const baseDate = value ? value.split('T')[0] : new Date().toISOString().split('T')[0];
            const datetimeValue = `${baseDate}T${hour24.toString().padStart(2, '0')}:${newTimeState.minute}:00`;
            onChange(datetimeValue);
        } else if (!newTimeState.hour && !newTimeState.minute) {
            // Clear the value if both hour and minute are empty
            onChange('');
        }
    };

    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    return (
        <div className={`flex gap-2 ${className}`}>
            <select
                value={timeState.hour}
                onChange={(e) => handleTimeChange('hour', e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
                <option value="">HH</option>
                {hours.map(hour => (
                    <option key={hour} value={hour}>{hour}</option>
                ))}
            </select>
            <span className="flex items-center text-slate-500">:</span>
            <select
                value={timeState.minute}
                onChange={(e) => handleTimeChange('minute', e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
                <option value="">MM</option>
                {minutes.map(minute => (
                    <option key={minute} value={minute}>{minute}</option>
                ))}
            </select>
            <select
                value={timeState.period}
                onChange={(e) => handleTimeChange('period', e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
            </select>
            {value && (
                <button
                    type="button"
                    onClick={() => {
                        setTimeState({ hour: '', minute: '', period: 'AM' });
                        onChange('');
                    }}
                    className="px-2 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    title="Clear time"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

export default TimeInput;
