import React, { useState } from "react";
import { Bell, Calendar } from "lucide-react";

const UpdatesSidebar = ({ 
  announcements, 
  holidays, 
  username,
  activityData
}) => {
  const [activeTab, setActiveTab] = useState("announcements");

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl h-full flex flex-col">
      <div className="p-3 sm:p-5 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800 z-10">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-slate-100">Updates</h2>
        <div className="bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 rounded-full h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center text-xs sm:text-sm font-bold shadow-sm">
          {announcements.length}
        </div>
      </div>
      
      <div className="p-2 sm:p-3 sticky top-16 bg-white dark:bg-slate-800 z-10 shadow-sm">
        <div className="flex rounded-lg bg-gray-100 dark:bg-slate-700 p-1">
          {[
            {id: 'announcements', label: 'News'}, 
            {id: 'holidays', label: 'Holidays'}, 
            {id: 'activity', label: 'Activity'}
          ].map(tab => (
            <button 
              key={tab.id}
              className={`flex-1 px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 rounded-md ${
                activeTab === tab.id 
                  ? 'bg-white dark:bg-slate-600 text-cyan-600 dark:text-cyan-400 shadow-sm' 
                  : 'text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-600/50'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-3 sm:p-4">
          {activeTab === 'announcements' && (
            <div className="space-y-3 sm:space-y-4">
              {announcements.length > 0 ? (
                announcements.map((ann, index) => (
                  <div key={ann.id || `announcement-${index}`} className="p-2.5 sm:p-3.5 hover:bg-gray-100/70 dark:hover:bg-slate-700/60 rounded-lg transition-colors duration-200 cursor-pointer shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-slate-700">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-semibold text-gray-700 dark:text-slate-100 text-xs sm:text-sm leading-snug">{ann.title}</h4>
                      <span className="ml-2 flex-shrink-0 bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-medium">New</span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-slate-400 mb-2 leading-relaxed">{ann.content}</p>
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] sm:text-xs text-gray-400 dark:text-slate-500">{ann.date}</p>
                      <button className="text-cyan-600 dark:text-cyan-400 text-[10px] sm:text-xs hover:underline font-semibold">Read more</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500 dark:text-slate-400">No announcements</div>
              )}
            </div>
          )}
          
          {activeTab === 'holidays' && (
            <div className="space-y-2.5 sm:space-y-3.5">
              {holidays.length > 0 ? (
                holidays.map((holiday, index) => (
                  <div key={holiday.id || `holiday-${index}`} className="p-2.5 sm:p-3.5 flex justify-between items-center hover:bg-gray-100/70 dark:hover:bg-slate-700/60 rounded-lg transition-colors duration-200 shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-slate-700">
                    <div>
                      <h4 className="font-semibold text-gray-700 dark:text-slate-100 text-xs sm:text-sm">{holiday.name}</h4>
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">{holiday.date}</p>
                    </div>
                    <div className="bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 p-2 sm:p-2.5 rounded-full shadow-sm">
                      <Calendar size={16} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500 dark:text-slate-400">No upcoming holidays</div>
              )}
            </div>
          )}
          
          {activeTab === 'activity' && (
            <div className="space-y-3 sm:space-y-4">
              {activityData && activityData.length > 0 ? (
                activityData.map((activity, index) => (
                  <div key={activity.id || `activity-${index}`} className="p-2.5 sm:p-3.5 hover:bg-gray-100/70 dark:hover:bg-slate-700/60 rounded-lg transition-colors duration-200 shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-slate-700">
                    <div className="flex items-start gap-2 sm:gap-3.5">
                      <div className={`
                        ${activity.theme === 'cyan' ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' : 
                          activity.theme === 'green' ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-300' :
                          activity.theme === 'purple' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300' : 
                          activity.theme === 'red' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300' :
                          'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300'} 
                        rounded-full w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center flex-shrink-0 text-xs sm:text-sm font-semibold shadow-sm`}>
                        {activity.initials}
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-200 leading-snug">{activity.text}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 mt-0.5">{new Date(activity.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500 dark:text-slate-400">No recent activity</div>
              )}
              <div className="pt-2 text-center">
                <button className="text-cyan-600 dark:text-cyan-400 text-xs sm:text-sm hover:underline font-semibold py-2">View All Activities</button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="sticky bottom-0 border-t border-gray-200 dark:border-slate-700 p-3 sm:p-4 bg-white dark:bg-slate-800 mt-auto">
        <div className="bg-cyan-50 dark:bg-cyan-500/10 border-l-4 border-cyan-500 dark:border-cyan-400 p-3 sm:p-4 rounded-md shadow-md">
          <div className="flex items-center">
            <Bell size={18} className="text-cyan-600 dark:text-cyan-400 mr-2 sm:mr-3" />
            <h3 className="font-semibold text-cyan-800 dark:text-cyan-300 text-xs sm:text-sm">Meeting Reminder</h3>
          </div>
          <p className="text-xs text-cyan-700 dark:text-cyan-300/90 mt-1.5">Team standup at 10:00 AM today</p>
          <div className="mt-2.5 sm:mt-3.5 flex gap-2">
            <button className="text-[10px] sm:text-xs px-2.5 sm:px-3.5 py-1 sm:py-1.5 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-800 focus:ring-cyan-500 shadow-sm">Join</button>
            <button className="text-[10px] sm:text-xs px-2.5 sm:px-3.5 py-1 sm:py-1.5 border border-cyan-500 dark:border-cyan-400 text-cyan-600 dark:text-cyan-400 rounded-md hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition-colors focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-800 focus:ring-cyan-500">Snooze</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdatesSidebar; 