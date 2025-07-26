import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ComposedChart
} from 'recharts';
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

const WeeklySummary = ({ attendanceData }) => {
  const monthlyMetrics = useMemo(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const safeAttendanceData = Array.isArray(attendanceData) ? attendanceData : [];
    
    // Filter this month's data
    const thisMonthData = safeAttendanceData.filter(record => {
      if (!record?.date) return false;
      const recordDate = new Date(record.date);
      return recordDate >= startOfMonth && recordDate <= endOfMonth;
    });

    // Helper function to check if date is a working day
    const isWorkingDayForCompany = (date) => {
      const dayOfWeek = date.getDay();
      
      // Sunday is always a non-working day
      if (dayOfWeek === 0) {
        return false;
      }
      
      // Saturday logic: exclude 2nd Saturday of the month
      if (dayOfWeek === 6) {
        const dateNum = date.getDate();
        const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const firstSaturday = 7 - firstDayOfMonth.getDay() || 7;
        const secondSaturday = firstSaturday + 7;
        
        // If this Saturday is the 2nd Saturday, it's a non-working day
        if (dateNum >= secondSaturday && dateNum < secondSaturday + 7) {
          return false;
        }
      }
      
      return true;
    };

    // Generate all working days in the month
    const monthDays = [];
    const currentDate = new Date(startOfMonth);
    
    while (currentDate <= endOfMonth) {
      const dayRecord = thisMonthData.find(record => {
        const recordDate = new Date(record.date);
        return recordDate.toDateString() === currentDate.toDateString();
      });

      const isWorkDay = isWorkingDayForCompany(currentDate);
      const isPastDay = currentDate <= today;
      
      let status = 'not-marked';
      let hoursWorked = 0;
      let checkInTime = null;
      let checkOutTime = null;
      let productivity = 0;
      
      if (dayRecord) {
        status = dayRecord.status || 'not-marked';
        checkInTime = dayRecord.checkIn ? new Date(dayRecord.checkIn) : null;
        checkOutTime = dayRecord.checkOut ? new Date(dayRecord.checkOut) : null;
        
        if (checkInTime && checkOutTime) {
          hoursWorked = Math.max(0, (checkOutTime - checkInTime) / (1000 * 60 * 60));
        }
        
        // Calculate productivity based on hours and timing
        if (status === 'present' && hoursWorked > 0) {
          const expectedHours = 8;
          const timeEfficiency = Math.min(hoursWorked / expectedHours, 1.2); // Cap at 120%
          
          // Factor in punctuality (9:40 AM is ideal start time)
          const idealStartHour = 9;
          const idealStartMinutes = 40;
          const idealStartTime = idealStartHour + (idealStartMinutes / 60); // 9.67 hours          
          const punctualityScore = checkInTime ? 
            Math.max(0, 1 - Math.max(0, (checkInTime.getHours() + (checkInTime.getMinutes() / 60)) - idealStartTime) * 0.1) : 0.5;
          
          productivity = Math.round((timeEfficiency * punctualityScore * 100));
        } else if (status === 'half-day') {
          productivity = 50;
        }
      } else if (!isWorkDay) {
        // Set status for weekends when no record exists
        status = 'weekend';
      } else {
        // No record for a working day - mark as absent only if past day
        if (isPastDay) {
          status = 'absent';
        }
      }

      monthDays.push({
        day: currentDate.getDate(),
        date: currentDate.getDate(),
        fullDate: new Date(currentDate),
        status,
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        checkInTime,
        checkOutTime,
        productivity: Math.min(100, productivity),
        isWorkDay,
        isPastDay
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate summary metrics - only count working days for work-related stats
    const workDays = monthDays.filter(day => day.isWorkDay);
    const pastWorkDays = workDays.filter(day => day.isPastDay);
    
    // Count only work-related statuses from working days
    const presentDays = workDays.filter(day => day.status === 'present').length;
    const halfDays = workDays.filter(day => day.status === 'half-day').length;
    const absentDays = pastWorkDays.filter(day => day.status === 'absent').length;
    const leaveDays = workDays.filter(day => day.status === 'leave').length;
    
    // Count non-working days separately (these shouldn't be in attendance distribution)
    const weekendDays = monthDays.filter(day => day.status === 'weekend').length;
    const holidayDays = monthDays.filter(day => day.status === 'holiday').length;
    
    const totalHoursWorked = workDays.reduce((sum, day) => sum + day.hoursWorked, 0);
    const expectedHours = pastWorkDays.length * 8;
    const avgDailyHours = pastWorkDays.length > 0 ? totalHoursWorked / pastWorkDays.length : 0;
    
    const attendanceRate = pastWorkDays.length > 0 ? 
      Math.round(((presentDays + (halfDays * 0.5)) / pastWorkDays.length) * 100) : 100;
    
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
      presentDays,
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
  }, [attendanceData]);

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
    { name: 'Present', value: monthlyMetrics.presentDays, color: chartColors.secondary },
    { name: 'Half Day', value: monthlyMetrics.halfDays, color: chartColors.accent },
    { name: 'Absent', value: monthlyMetrics.absentDays, color: chartColors.danger },
    { name: 'Leave', value: monthlyMetrics.leaveDays, color: chartColors.purple }
  ].filter(item => item.value > 0);

  // Productivity trend data - filter out weekends and holidays
  const productivityTrendData = monthlyMetrics.recentWorkDays.filter(day => 
    day.status !== 'weekend' && day.status !== 'holiday'
  );

  const MetricCard = ({ icon: Icon, title, value, subtitle, color = "blue", trend }) => (
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
          subtitle="This month"
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