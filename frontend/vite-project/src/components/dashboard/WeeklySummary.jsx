import React, { useEffect, useState } from "react";

const WeeklySummary = ({ attendanceData }) => {
  // Generate more dynamic productivity data based on the current week
  const [productivityData, setProductivityData] = useState([]);
  
  useEffect(() => {
    // Generate productivity data matching current week days
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    // Only show days up to today
    const daysToShow = [];
    for (let i = 1; i <= 5; i++) { // Monday to Friday
      if (i <= currentDay || (currentDay === 0 && i <= 5)) { // If today is Sunday, show the whole week
        daysToShow.push(i);
      }
    }
    
    // Generate random productivity data for the days we're showing
    const newProductivityData = daysToShow.map(day => {
      // Create more realistic data - higher in middle of week, lower on Monday/Friday
      let baseProd;
      if (day === 1 || day === 5) baseProd = 75; // Monday and Friday
      else if (day === 2 || day === 4) baseProd = 85; // Tuesday and Thursday
      else baseProd = 90; // Wednesday
      
      // Add some randomness
      const randomVariation = Math.floor(Math.random() * 10) - 5; // -5 to +5
      const productivity = Math.max(70, Math.min(98, baseProd + randomVariation));
      
      return {
        day: dayNames[day],
        productivity
      };
    });
    
    setProductivityData(newProductivityData);
  }, []);

  // Calculate weekly attendance
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Set to Monday of this week
  
  const isDateInCurrentWeek = (date) => {
    const checkDate = new Date(date);
    return checkDate >= startOfWeek && checkDate <= today;
  };

  // Safer processing of attendance data
  const safeAttendanceData = Array.isArray(attendanceData) ? attendanceData : [];
  
  const weeklyAttendance = safeAttendanceData.filter(record => 
    record?.date && isDateInCurrentWeek(new Date(record.date))
  );
  
  const presentThisWeek = weeklyAttendance.filter(day => day.status === "present").length;
  const absentThisWeek = weeklyAttendance.filter(day => day.status === "absent").length;
  const halfDaysThisWeek = weeklyAttendance.filter(day => day.status === "half-day").length;
  
  // Calculate business days elapsed this week (Mon-Fri)
  const daysSoFarThisWeek = Math.min(5, Math.floor((today - startOfWeek) / (1000 * 60 * 60 * 24)) + 1);
  
  // More accurate attendance rate calculation
  const totalDaysAccountedFor = presentThisWeek + absentThisWeek + (halfDaysThisWeek * 0.5);
  const attendanceRate = daysSoFarThisWeek > 0 
    ? Math.round((totalDaysAccountedFor / daysSoFarThisWeek) * 100) 
    : 100;
  
  // Calculate average weekly productivity
  const avgProductivity = productivityData.length 
    ? Math.round(productivityData.reduce((sum, day) => sum + day.productivity, 0) / productivityData.length) 
    : 0;
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-3 sm:p-5">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-slate-100 mb-1">Weekly Summary</h2>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mb-4">Productivity & attendance metrics</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Weekly Attendance</h3>
          <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-3 relative overflow-hidden">
            {/* Visual indicator of attendance rate */}
            <div 
              className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-green-400 to-cyan-500" 
              style={{ width: `${attendanceRate}%` }}
            ></div>
            
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-600 dark:text-slate-400">Attendance Rate:</span>
              <span className={`text-sm font-semibold ${
                attendanceRate >= 90 ? 'text-green-600 dark:text-green-400' :
                attendanceRate >= 80 ? 'text-cyan-600 dark:text-cyan-400' :
                attendanceRate >= 70 ? 'text-amber-600 dark:text-amber-400' :
                'text-red-600 dark:text-red-400'
              }`}>{attendanceRate}%</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-slate-400">Present Days:</span>
                <span className="font-medium text-gray-800 dark:text-slate-200">{presentThisWeek}/{daysSoFarThisWeek}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-slate-400">Absent Days:</span>
                <span className="font-medium text-gray-800 dark:text-slate-200">{absentThisWeek}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-slate-400">Half Days:</span>
                <span className="font-medium text-gray-800 dark:text-slate-200">{halfDaysThisWeek}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Weekly Productivity</h3>
          <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-3 relative overflow-hidden">
            {/* Visual indicator of average productivity */}
            <div 
              className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-cyan-400 to-purple-500" 
              style={{ width: `${avgProductivity}%` }}
            ></div>
            
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-600 dark:text-slate-400">Average:</span>
              <span className={`text-sm font-semibold ${
                avgProductivity >= 90 ? 'text-purple-600 dark:text-purple-400' :
                avgProductivity >= 80 ? 'text-cyan-600 dark:text-cyan-400' :
                avgProductivity >= 70 ? 'text-amber-600 dark:text-amber-400' :
                'text-red-600 dark:text-red-400'
              }`}>{avgProductivity}%</span>
            </div>
            <div className="space-y-2">
              {productivityData.length > 0 ? (
                productivityData.map(day => (
                  <div key={day.day} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-slate-400">{day.day}:</span>
                      <span className="font-medium text-gray-800 dark:text-slate-200">{day.productivity}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-1.5 rounded-full ${
                          day.productivity >= 90 ? 'bg-purple-500 dark:bg-purple-400' :
                          day.productivity >= 80 ? 'bg-cyan-500 dark:bg-cyan-400' :
                          day.productivity >= 70 ? 'bg-amber-500 dark:bg-amber-400' :
                          'bg-red-500 dark:bg-red-400'
                        }`}
                        style={{ width: `${day.productivity}%`, transition: 'width 1s ease-in-out' }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-2 text-gray-500 dark:text-slate-400 text-xs">
                  No productivity data available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklySummary; 