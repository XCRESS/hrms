import React, { useMemo } from "react";
// Optimized Recharts imports - reduces bundle size from ~40KB to ~15KB gzipped
import { AreaChart } from 'recharts/es6/chart/AreaChart';
import { Area } from 'recharts/es6/cartesian/Area';
import { XAxis } from 'recharts/es6/cartesian/XAxis';
import { YAxis } from 'recharts/es6/cartesian/YAxis';
import { CartesianGrid } from 'recharts/es6/cartesian/CartesianGrid';
import { Tooltip } from 'recharts/es6/component/Tooltip';
import { ResponsiveContainer } from 'recharts/es6/component/ResponsiveContainer';
import { BarChart } from 'recharts/es6/chart/BarChart';
import { Bar } from 'recharts/es6/cartesian/Bar';
import { PieChart } from 'recharts/es6/chart/PieChart';
import { Pie } from 'recharts/es6/polar/Pie';
import { Cell } from 'recharts/es6/component/Cell';
import { LineChart } from 'recharts/es6/chart/LineChart';
import { Line } from 'recharts/es6/cartesian/Line';
import { ComposedChart } from 'recharts/es6/chart/ComposedChart';
import {
  Clock,
  TrendingUp,
  Target,
  Calendar,
  AlertCircle,
  CheckCircle,
  Timer,
  Award
} from 'lucide-react';

const WeeklySummary = ({ attendanceReport }) => {
  const monthlyMetrics = useMemo(() => {
    // Use backend data if available, otherwise return empty state
    if (!attendanceReport) {
      return {
        monthDays: [],
        workDays: [],
        presentDays: 0,
        purePresent: 0,
        halfDays: 0,
        absentDays: 0,
        leaveDays: 0,
        weekendDays: 0,
        holidayDays: 0,
        totalHoursWorked: 0,
        expectedHours: 0,
        avgDailyHours: 0,
        attendanceRate: 0,
        avgProductivity: 0,
        overtimeHours: 0,
        efficiency: 0,
        checkInPattern: [],
        avgCheckInTime: 9,
        pastWorkDays: 0,
        recentWorkDays: []
      };
    }

    // Extract data from backend report
    const records = attendanceReport.records || [];
    const statistics = attendanceReport.statistics || {};
    const attendancePercentage = attendanceReport.attendancePercentage || {};

    const today = new Date();

    // Use backend data directly - already filtered and processed
    const thisMonthData = records;

    // Convert backend records to frontend format for charts
    const monthDays = thisMonthData.map(record => {
      const recordDate = new Date(record.date);
      const checkInTime = record.checkIn ? new Date(record.checkIn) : null;
      const checkOutTime = record.checkOut ? new Date(record.checkOut) : null;
      const hoursWorked = record.workHours || 0;

      // Calculate productivity based on backend status and hours
      let productivity = 0;
      if (record.status === 'present' && hoursWorked > 0) {
        const expectedHours = 8;
        const timeEfficiency = Math.min(hoursWorked / expectedHours, 1.2);

        // Factor in punctuality
        const idealStartTime = 9.67; // 9:40 AM
        const punctualityScore = checkInTime ?
          Math.max(0, 1 - Math.max(0, (checkInTime.getHours() + (checkInTime.getMinutes() / 60)) - idealStartTime) * 0.1) : 0.5;

        productivity = Math.round((timeEfficiency * punctualityScore * 100));
      } else if (record.status === 'half-day') {
        productivity = 50;
      }

      return {
        day: recordDate.getDate(),
        date: recordDate.getDate(),
        fullDate: recordDate,
        status: record.status,
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        checkInTime,
        checkOutTime,
        productivity: Math.min(100, productivity),
        isWorkDay: !record.flags?.isWeekend && !record.flags?.isHoliday,
        isPastDay: recordDate <= today
      };
    });

    // Use backend statistics directly instead of recalculating
    const workDays = monthDays.filter(day => day.isWorkDay);
    const pastWorkDays = workDays.filter(day => day.isPastDay);

    // Use backend statistics for accurate counts
    const purePresent = statistics.present || 0;
    const halfDays = statistics.halfDay || 0;
    const presentDays = attendancePercentage.presentDays || 0; // Backend includes half-days in present count
    const absentDays = attendancePercentage.absentDays || 0;
    const leaveDays = statistics.leave || 0;
    const weekendDays = statistics.weekend || 0;
    const holidayDays = statistics.holiday || 0;
    
    const totalHoursWorked = workDays.reduce((sum, day) => sum + day.hoursWorked, 0);
    const expectedHours = pastWorkDays.length * 8;
    const avgDailyHours = pastWorkDays.length > 0 ? totalHoursWorked / pastWorkDays.length : 0;
    
    const attendanceRate = attendancePercentage.percentage || 0;
    
    const avgProductivity = workDays.length > 0 ? 
      Math.round(workDays.reduce((sum, day) => sum + day.productivity, 0) / workDays.length) : 0;
    
    const overtimeHours = Math.max(0, totalHoursWorked - expectedHours);
    const efficiency = expectedHours > 0 ? Math.round((totalHoursWorked / expectedHours) * 100) : 0;

    // Check-in pattern analysis - only for working days with actual check-ins
    const checkInPattern = workDays.filter(day => day.checkInTime && day.status !== 'weekend' && day.status !== 'holiday').map(day => ({
      day: day.day,
      time: day.checkInTime.getHours() + (day.checkInTime.getMinutes() / 60),
      isLate: day.checkInTime.getHours() > 10 || (day.checkInTime.getHours() === 10 && day.checkInTime.getMinutes() > 10)
    }));

    const avgCheckInTime = checkInPattern.length > 0 ? 
      checkInPattern.reduce((sum, day) => sum + day.time, 0) / checkInPattern.length : 9;

    // Get recent days for trend analysis (last 7 working days)
    const recentWorkDays = pastWorkDays.slice(-7);

    return {
      monthDays,
      workDays,
      presentDays, // Includes both present and half-day records
      purePresent, // Only pure present records (excludes half-days)
      halfDays,
      absentDays,
      leaveDays,
      weekendDays,
      holidayDays,
      totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
      expectedHours,
      avgDailyHours: Math.round(avgDailyHours * 10) / 10,
      attendanceRate,
      avgProductivity,
      overtimeHours: Math.round(overtimeHours * 10) / 10,
      efficiency,
      checkInPattern,
      avgCheckInTime: Math.round(avgCheckInTime * 10) / 10,
      pastWorkDays: pastWorkDays.length,
      recentWorkDays
    };
  }, [attendanceReport]);

  // Chart color schemes
  const chartColors = {
    primary: '#3B82F6',
    secondary: '#10B981', 
    accent: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    cyan: '#06B6D4'
  };

  // Status distribution data for pie chart - only work-related statuses
  const statusData = [
    { name: 'Present', value: monthlyMetrics.purePresent, color: chartColors.secondary },
    { name: 'Half Day', value: monthlyMetrics.halfDays, color: chartColors.accent },
    { name: 'Absent', value: monthlyMetrics.absentDays, color: chartColors.danger },
    { name: 'Leave', value: monthlyMetrics.leaveDays, color: chartColors.purple }
  ].filter(item => item.value > 0);

  // Productivity trend data - filter out weekends and holidays
  const productivityTrendData = monthlyMetrics.recentWorkDays.filter(day => 
    day.status !== 'weekend' && day.status !== 'holiday'
  );

  const MetricCard = ({ icon, title, value, subtitle, color = "blue", trend }) => {
    const Icon = icon;
    return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${
          color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
          color === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
          color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30' :
          color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/30' :
          'bg-gray-100 dark:bg-gray-900/30'
        }`}>
          <Icon size={20} className={`${
            color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
            color === 'green' ? 'text-green-600 dark:text-green-400' :
            color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
            color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
            'text-gray-600 dark:text-gray-400'
          }`} />
        </div>
        {trend && (
          <div className={`flex items-center text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp size={14} className={trend < 0 ? 'rotate-180' : ''} />
            <span className="ml-1">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{title}</p>
        {subtitle && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
        )}
      </div>
    </div>
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700">
          <p className="font-medium text-neutral-900 dark:text-white mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${entry.value}${entry.dataKey.includes('Hours') || entry.dataKey.includes('hours') ? 'h' : entry.dataKey.includes('productivity') || entry.dataKey.includes('Productivity') ? '%' : ''}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
              Monthly Performance Summary
            </h2>
            <p className="text-neutral-600 dark:text-neutral-300">
              Comprehensive analysis of your work patterns and productivity this month
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {monthlyMetrics.attendanceRate}%
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              Attendance Rate
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={CheckCircle}
          title="Present Days"
          value={`${monthlyMetrics.presentDays}/${monthlyMetrics.pastWorkDays}`}
          subtitle="This month (incl. half-days)"
          color="green"
        />
        <MetricCard
          icon={Clock}
          title="Hours Worked"
          value={`${monthlyMetrics.totalHoursWorked}h`}
          subtitle={`Avg: ${monthlyMetrics.avgDailyHours}h/day`}
          color="blue"
        />
        <MetricCard
          icon={Target}
          title="Productivity"
          value={`${monthlyMetrics.avgProductivity}%`}
          subtitle="Monthly average"
          color="purple"
        />
        <MetricCard
          icon={Timer}
          title="Efficiency"
          value={`${monthlyMetrics.efficiency}%`}
          subtitle={monthlyMetrics.overtimeHours > 0 ? `+${monthlyMetrics.overtimeHours}h overtime` : 'On track'}
          color={monthlyMetrics.efficiency >= 100 ? "green" : "amber"}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Hours & Productivity Trend */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 shadow-sm">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Daily Performance Trend
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={productivityTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.1} />
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
              />
              <YAxis 
                yAxisId="hours"
                orientation="left"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
              />
              <YAxis 
                yAxisId="productivity"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                yAxisId="hours"
                type="monotone"
                dataKey="hoursWorked"
                stroke={chartColors.primary}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#hoursGradient)"
                name="Hours Worked"
              />
              <Line
                yAxisId="productivity"
                type="monotone"
                dataKey="productivity"
                stroke={chartColors.secondary}
                strokeWidth={3}
                dot={{ fill: chartColors.secondary, strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, stroke: chartColors.secondary, strokeWidth: 2, fill: '#fff' }}
                name="Productivity"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Attendance Status Distribution */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 shadow-sm">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Attendance Distribution
          </h3>
          <div className="flex items-center justify-between h-64">
            {statusData.length > 0 ? (
              <>
                <ResponsiveContainer width="60%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [`${value} day${value !== 1 ? 's' : ''}`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {statusData.map((item, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full shadow-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <div>
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          {item.name}
                        </span>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {item.value} day{item.value !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center w-full text-neutral-500 dark:text-neutral-400">
                <Calendar size={48} className="mx-auto mb-2 opacity-50" />
                <p>No attendance data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Check-in Pattern Analysis */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 shadow-sm">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Check-in Pattern Analysis
          </h3>
          {monthlyMetrics.checkInPattern.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyMetrics.checkInPattern} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.1} />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                  />
                  <YAxis 
                    domain={[7, 12]} 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickFormatter={(value) => `${Math.floor(value)}:${String(Math.round((value % 1) * 60)).padStart(2, '0')}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`${Math.floor(value)}:${String(Math.round((value % 1) * 60)).padStart(2, '0')}`, 'Check-in Time']}
                    labelStyle={{ color: '#374151' }}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="time" 
                    fill={chartColors.cyan}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-neutral-600 dark:text-neutral-300">
                  Average: {Math.floor(monthlyMetrics.avgCheckInTime)}:{String(Math.round((monthlyMetrics.avgCheckInTime % 1) * 60)).padStart(2, '0')}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  monthlyMetrics.avgCheckInTime > 10.17 // 10:10 AM in decimal format
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                }`}>
                  {monthlyMetrics.avgCheckInTime > 10.17 ? 'Often Late' : 'On Time'}
                </span>
              </div>
            </>
          ) : (
            <div className="text-center text-neutral-500 dark:text-neutral-400 py-12">
              <Clock size={48} className="mx-auto mb-2 opacity-50" />
              <p>No check-in data available</p>
            </div>
          )}
        </div>

        {/* Monthly Goals & Achievements */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 shadow-sm">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Monthly Goals & Achievements
          </h3>
          <div className="space-y-6">
            {/* Attendance Goal */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Attendance Target
                </span>
                <span className="text-sm font-bold text-neutral-900 dark:text-white">
                  {monthlyMetrics.attendanceRate}% / 95%
                </span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full transition-all duration-700 ${
                    monthlyMetrics.attendanceRate >= 95 ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, (monthlyMetrics.attendanceRate / 95) * 100)}%` }}
                />
              </div>
            </div>

            {/* Hours Goal */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Hours Target
                </span>
                <span className="text-sm font-bold text-neutral-900 dark:text-white">
                  {monthlyMetrics.totalHoursWorked}h / {monthlyMetrics.expectedHours}h
                </span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full transition-all duration-700 ${
                    monthlyMetrics.totalHoursWorked >= monthlyMetrics.expectedHours ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ 
                    width: `${Math.min(100, (monthlyMetrics.totalHoursWorked / Math.max(monthlyMetrics.expectedHours, 1)) * 100)}%` 
                  }}
                />
              </div>
            </div>

            {/* Achievement Badges */}
            <div className="pt-2">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                This Month's Achievements
              </p>
              <div className="flex flex-wrap gap-2">
                {monthlyMetrics.attendanceRate === 100 && (
                  <span className="px-3 py-1.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs rounded-full flex items-center font-medium">
                    <Award size={12} className="mr-1.5" />
                    Perfect Attendance
                  </span>
                )}
                {monthlyMetrics.avgProductivity >= 90 && (
                  <span className="px-3 py-1.5 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-xs rounded-full flex items-center font-medium">
                    <Award size={12} className="mr-1.5" />
                    High Performer
                  </span>
                )}
                {monthlyMetrics.overtimeHours > 10 && (
                  <span className="px-3 py-1.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs rounded-full flex items-center font-medium">
                    <Award size={12} className="mr-1.5" />
                    Dedicated Worker
                  </span>
                )}
                {monthlyMetrics.avgCheckInTime <= 8.5 && (
                  <span className="px-3 py-1.5 bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300 text-xs rounded-full flex items-center font-medium">
                    <Award size={12} className="mr-1.5" />
                    Early Bird
                  </span>
                )}
                {(monthlyMetrics.attendanceRate < 100 && monthlyMetrics.avgProductivity < 90 && monthlyMetrics.overtimeHours <= 10 && monthlyMetrics.avgCheckInTime > 8.5) && (
                  <span className="px-3 py-1.5 bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400 text-xs rounded-full flex items-center font-medium">
                    <Target size={12} className="mr-1.5" />
                    Keep Going!
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklySummary; 