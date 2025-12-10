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
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 min-h-screen">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Configure your HRMS</p>
          </div>
          
          <nav className="p-4 space-y-2">
            {settingsNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    isActive 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SettingsLayout;