import React from 'react';
import { Settings, Clock, Building2, Users, Shield, Bell, type LucideIcon } from 'lucide-react';

interface SettingsNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

interface SettingsNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  className?: string;
}

const SettingsNavigation: React.FC<SettingsNavigationProps> = ({
  activeSection,
  onSectionChange,
  className = ""
}) => {
  const settingsNavItems: SettingsNavItem[] = [
    {
      id: 'attendance',
      label: 'Attendance',
      icon: Clock,
      description: 'Work hours, thresholds, and attendance policies'
    },
    {
      id: 'departments',
      label: 'Departments',
      icon: Building2,
      description: 'Manage departments and assignments'
    },
    {
      id: 'general',
      label: 'General',
      icon: Settings,
      description: 'System preferences and configurations'
    },
    {
      id: 'users',
      label: 'User Management',
      icon: Users,
      description: 'User roles and permissions'
    },
    {
      id: 'security',
      label: 'Security',
      icon: Shield,
      description: 'Security settings and access control'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      description: 'Email and system notifications'
    }
  ];

  return (
    <nav className={`space-y-2 ${className}`}>
      <div className="px-3 py-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Settings
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure your HRMS system
        </p>
      </div>

      <div className="space-y-1">
        {settingsNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`
                w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200
                ${isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }
              `}
            >
              <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
              }`} />
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm ${
                  isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {item.label}
                </div>
                <div className={`text-xs leading-tight mt-0.5 ${
                  isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default SettingsNavigation;