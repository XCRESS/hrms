import React from 'react';
import useAuth from '../../hooks/authjwt';
import { SlidersHorizontal, Palette, BellRing, ShieldCheck, LockKeyhole } from 'lucide-react';

const SettingsPage = () => {
  const userObject = useAuth();
  if (!userObject) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading user information...</div>;
  }
  const user = userObject;

  // Placeholder for future settings sections
  const settingsSections = [
    {
      title: 'Account Settings',
      icon: <LockKeyhole size={24} className="text-cyan-600 dark:text-cyan-400" />,
      description: 'Manage your password and personal information.',
      features: [
        'Change Password (redirect to dedicated page or modal)',
        'Update Profile Information (e.g., contact details - if applicable)',
      ],
      roles: ['employee', 'hr', 'admin'],
    },
    {
      title: 'Appearance',
      icon: <Palette size={24} className="text-cyan-600 dark:text-cyan-400" />,
      description: 'Customize the look and feel of the application.',
      features: [
        'Theme (Light/Dark Mode Toggle)',
        // 'Language Preferences',
      ],
      roles: ['employee', 'hr', 'admin'],
    },
    {
      title: 'Notification Preferences',
      icon: <BellRing size={24} className="text-cyan-600 dark:text-cyan-400" />,
      description: 'Configure how you receive notifications.',
      features: [
        'Email Notifications for approvals, announcements, etc.',
        'In-app Notification Settings',
      ],
      roles: ['employee', 'hr', 'admin'],
    },
    {
      title: 'System Configuration',
      icon: <SlidersHorizontal size={24} className="text-cyan-600 dark:text-cyan-400" />,
      description: 'Manage system-wide settings (Admin/HR only).',
      features: [
        'Company Details (Name, Logo)',
        'Default Leave Policies (view/edit)',
        'Working Hours & Days Setup',
        'User Role Management (view/edit access levels)',
      ],
      roles: ['admin', 'hr'],
    },
    {
      title: 'Security Settings',
      icon: <ShieldCheck size={24} className="text-cyan-600 dark:text-cyan-400" />,
      description: 'Manage security options for your account and the system.',
      features: [
        'Two-Factor Authentication (2FA) Setup',
        'View Audit Logs (Admin/HR)',
        'Data Privacy Settings',
      ],
      roles: ['admin', 'hr', 'employee'],
    },
  ];

  const availableSections = settingsSections.filter(section => section.roles.includes(user.role));

  return (
    <div className="max-w-7xl mx-auto mt-8 p-4 md:p-6 bg-white dark:bg-slate-900 rounded-xl shadow-xl text-slate-900 dark:text-slate-50">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-cyan-700 dark:text-cyan-300">Settings</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your account preferences and application settings.</p>
      </div>

      {availableSections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableSections.map((section, index) => (
            <div key={index} className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-cyan-100 dark:bg-cyan-700/30 rounded-full mr-4">
                  {section.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{section.title}</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 h-12">{section.description}</p>
              <ul className="space-y-2 text-sm">
                {section.features.map((feature, fIndex) => (
                  <li key={fIndex} className="flex items-center text-slate-500 dark:text-slate-400">
                    <span className="h-2 w-2 bg-cyan-500 rounded-full mr-2.5 flex-shrink-0"></span>
                    {feature}
                  </li>
                ))}
              </ul>
              {/* Placeholder for actual setting controls or links */}
              <div className="mt-5 text-right">
                <button className="px-4 py-2 text-xs font-medium text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-700/30 hover:bg-cyan-200 dark:hover:bg-cyan-600/40 rounded-md transition-colors">
                  Manage {section.title.split(' ')[0]}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-slate-500 dark:text-slate-400">
          <SlidersHorizontal size={48} className="mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold">No Settings Available</h3>
          <p className="text-sm">There are no settings applicable to your current role.</p>
        </div>
      )}
    </div>
  );
};

export default SettingsPage; 