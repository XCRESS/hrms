import React from 'react';
import { CheckCircle, AlertCircle, XCircle, Calendar, Clock } from 'lucide-react';
import { AttendanceRecord } from '../../../../types';

export interface AttendanceStatistics {
    total: number;
    present: number;
    absent: number;
    halfDay: number;
    leave: number;
    late: number;
    weekend: number;
    holiday: number;
}

interface AttendanceAnalyticsProps {
    attendance: AttendanceRecord[];
    statistics: AttendanceStatistics | null;
    dateRange: { startDate: string; endDate: string };
}

interface AnalyticsCard {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
    bgGradient: string;
    borderColor: string;
    textColor: string;
    iconColor: string;
    progress: number;
    subtitle?: string;
}

const AttendanceAnalytics: React.FC<AttendanceAnalyticsProps> = ({ attendance, statistics, dateRange }) => {
    // Always use API-provided statistics - no fallback calculations
    const stats = statistics;

    if (!stats) {
        return (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-8 text-center">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">No attendance data available</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Select a date range to view analytics</p>
            </div>
        );
    }

    // Calculate working days from backend statistics  
    const workingDays = stats.total - (stats.weekend || 0) - (stats.holiday || 0);

    const analyticsCards: AnalyticsCard[] = [
        {
            title: 'Working Days',
            value: workingDays,
            icon: Calendar,
            color: 'cyan',
            bgGradient: 'from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/30',
            borderColor: 'border-cyan-200 dark:border-cyan-700',
            textColor: 'text-cyan-600 dark:text-cyan-400',
            iconColor: 'text-cyan-500',
            progress: 100
        },
        {
            title: 'Present Days',
            value: stats.present || 0,
            icon: CheckCircle,
            color: 'emerald',
            bgGradient: 'from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30',
            borderColor: 'border-emerald-200 dark:border-emerald-700',
            textColor: 'text-emerald-600 dark:text-emerald-400',
            iconColor: 'text-emerald-500',
            progress: workingDays > 0 ? ((stats.present || 0) / workingDays) * 100 : 0,
            subtitle: workingDays > 0 ? `${(((stats.present || 0) / workingDays) * 100).toFixed(1)}% attendance` : '0% attendance'
        },
        {
            title: 'Absent Days',
            value: stats.absent || 0,
            icon: XCircle,
            color: 'red',
            bgGradient: 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30',
            borderColor: 'border-red-200 dark:border-red-700',
            textColor: 'text-red-600 dark:text-red-400',
            iconColor: 'text-red-500',
            progress: workingDays > 0 ? ((stats.absent || 0) / workingDays) * 100 : 0
        },
        {
            title: 'Half Days',
            value: stats.halfDay || 0,
            icon: AlertCircle,
            color: 'amber',
            bgGradient: 'from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30',
            borderColor: 'border-amber-200 dark:border-amber-700',
            textColor: 'text-amber-600 dark:text-amber-400',
            iconColor: 'text-amber-500',
            progress: workingDays > 0 ? ((stats.halfDay || 0) / workingDays) * 100 : 0
        }
    ];

    return (
        <div className="space-y-6">
            {/* Main Analytics Cards - Fixed Layout */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {analyticsCards.map((card, index) => {
                    const IconComponent = card.icon;
                    return (
                        <div
                            key={index}
                            className={`bg-gradient-to-br ${card.bgGradient} p-4 rounded-2xl shadow-lg ${card.borderColor} border-2 transition-all duration-300 hover:shadow-xl hover:scale-105 group min-h-[120px]`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="space-y-1 min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                                        {card.title}
                                    </p>
                                    <p className={`text-2xl font-bold ${card.textColor} truncate`}>
                                        {card.value}
                                    </p>
                                    {card.subtitle && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">
                                            {card.subtitle}
                                        </p>
                                    )}
                                </div>
                                <div className="flex-shrink-0 ml-2">
                                    <div className={`p-3 rounded-xl bg-white/50 dark:bg-black/20 ${card.iconColor} group-hover:scale-110 transition-transform duration-200`}>
                                        <IconComponent className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={`h-full bg-gradient-to-r ${card.color === 'cyan' ? 'from-cyan-400 to-cyan-500' :
                                            card.color === 'emerald' ? 'from-emerald-400 to-emerald-500' :
                                                card.color === 'red' ? 'from-red-400 to-red-500' :
                                                    card.color === 'amber' ? 'from-amber-400 to-amber-500' :
                                                        'from-purple-400 to-purple-500'
                                            } rounded-full transition-all duration-1000 ease-out`}
                                        style={{ width: `${Math.min(card.progress, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Additional Stats Row - Fixed Layout */}
            {(stats.weekend > 0 || stats.holiday > 0 || stats.leave > 0 || stats.late > 0) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.weekend > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 min-h-[80px]">
                            <div className="flex items-center justify-between h-full">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Weekends</p>
                                    <p className="text-xl font-bold text-gray-700 dark:text-gray-300">{stats.weekend}</p>
                                </div>
                                <Calendar className="w-5 h-5 text-gray-400" />
                            </div>
                        </div>
                    )}
                    {stats.holiday > 0 && (
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-700 min-h-[80px]">
                            <div className="flex items-center justify-between h-full">
                                <div>
                                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Holidays</p>
                                    <p className="text-xl font-bold text-orange-700 dark:text-orange-300">{stats.holiday}</p>
                                </div>
                                <Calendar className="w-5 h-5 text-orange-500" />
                            </div>
                        </div>
                    )}
                    {stats.leave > 0 && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-700 min-h-[80px]">
                            <div className="flex items-center justify-between h-full">
                                <div>
                                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Leave Days</p>
                                    <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{stats.leave}</p>
                                </div>
                                <Calendar className="w-5 h-5 text-purple-500" />
                            </div>
                        </div>
                    )}
                    {stats.late > 0 && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-700 min-h-[80px]">
                            <div className="flex items-center justify-between h-full">
                                <div>
                                    <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Late Days</p>
                                    <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">{stats.late}</p>
                                </div>
                                <Clock className="w-5 h-5 text-yellow-500" />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AttendanceAnalytics;
