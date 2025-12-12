import React from 'react';
import { Settings, Clock, Building2, Bell, MapPin } from 'lucide-react';

const SettingsLayout = ({ activeSection, onSectionChange, children }) => {
  const settingsNav = [
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'geofence', label: 'Geo Fence', icon: MapPin },
    { id: 'general', label: 'General', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto">
        {/* Sticky Tab Bar */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="px-4 sm:px-6">
            <div className="flex items-center gap-4 sm:gap-6 py-3 sm:py-4">
              {/* Settings Title - Hidden on mobile for space */}
              <h1 className="hidden sm:block text-lg font-semibold text-slate-900 dark:text-slate-100 flex-shrink-0">
                Settings
              </h1>

              {/* Vertical Divider - Hidden on mobile */}
              <div className="hidden sm:block w-px h-6 bg-slate-300 dark:bg-slate-600" />

              {/* Horizontal Tab Navigation */}
              <nav className="flex-1 flex overflow-x-auto scrollbar-hide gap-1">
                {settingsNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => onSectionChange(item.id)}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                        isActive
                          ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                          : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden sm:inline">{item.label}</span>
                      <span className="sm:hidden text-xs">{item.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 sm:px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SettingsLayout;