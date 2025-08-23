import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../service/apiClient';
import useAuth from '../../hooks/authjwt';
import { AlertCircle, CheckCircle, XCircle, TestTube, Send } from 'lucide-react';

import SettingsLayout from './settings/SettingsLayout';
import AttendanceSettings from './settings/AttendanceSettings';
import DepartmentManagement from './settings/DepartmentManagement';

const SettingsPage = () => {
  const user = useAuth();
  const [activeSection, setActiveSection] = useState('attendance');
  const [settings, setSettings] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState({ type: '', content: '' });
  const [testingNotification, setTestingNotification] = useState(false);
  
  // Department management state
  const [departmentStats, setDepartmentStats] = useState([]);
  const [loadingDeptStats, setLoadingDeptStats] = useState(false);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showRenameDeptModal, setShowRenameDeptModal] = useState(false);
  const [showDeleteDeptModal, setShowDeleteDeptModal] = useState(false);
  const [selectedDeptForAction, setSelectedDeptForAction] = useState(null);
  const [newDeptName, setNewDeptName] = useState('');
  const [expandedDept, setExpandedDept] = useState(null);
  
  // Form data state
  const [formData, setFormData] = useState({
    attendance: {
      lateThreshold: '',
      workStartTime: '',
      workEndTime: '',
      halfDayEndTime: '',
      minimumWorkHours: 4,
      fullDayHours: 8,
      workingDays: [1, 2, 3, 4, 5, 6],
      nonWorkingDays: [0],
      saturdayWorkType: 'full',
      saturdayHolidays: []
    },
    notifications: {
      hrEmails: [],
      hrPhones: [],
      emailEnabled: true,
      whatsappEnabled: false,
      pushEnabled: true,
      holidayReminderEnabled: true,
      holidayReminderDays: 1,
      milestoneAlertsEnabled: true,
      milestoneTypes: {
        threeMonths: true,
        sixMonths: true,
        oneYear: true
      }
    }
  });

  const canManageSettings = user && (user.role === 'admin' || user.role === 'hr');

  const resetMessages = () => {
    setError(null);
    setMessage({ type: '', content: '' });
  };

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    resetMessages();
    try {
      let response;
      if (selectedDepartment) {
        response = await apiClient.getDepartmentSettings(selectedDepartment);
      } else {
        response = await apiClient.getGlobalSettings();
      }
      
      setSettings(response.data);
      setFormData({
        attendance: {
          ...response.data.attendance,
          workingDays: response.data.attendance.workingDays || [1, 2, 3, 4, 5, 6],
          nonWorkingDays: response.data.attendance.nonWorkingDays || [0],
          saturdayHolidays: response.data.attendance.saturdayHolidays || []
        },
        notifications: {
          hrEmails: response.data.notifications?.hrEmails || [],
          hrPhones: response.data.notifications?.hrPhones || [],
          emailEnabled: response.data.notifications?.emailEnabled ?? true,
          whatsappEnabled: response.data.notifications?.whatsappEnabled ?? false,
          pushEnabled: response.data.notifications?.pushEnabled ?? true,
          holidayReminderEnabled: response.data.notifications?.holidayReminderEnabled ?? true,
          holidayReminderDays: response.data.notifications?.holidayReminderDays ?? 1,
          milestoneAlertsEnabled: response.data.notifications?.milestoneAlertsEnabled ?? true,
          milestoneTypes: {
            threeMonths: response.data.notifications?.milestoneTypes?.threeMonths ?? true,
            sixMonths: response.data.notifications?.milestoneTypes?.sixMonths ?? true,
            oneYear: response.data.notifications?.milestoneTypes?.oneYear ?? true
          }
        }
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch settings.');
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, [selectedDepartment]);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await apiClient.getDepartments();
      setDepartments(response.data.departments || []);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  }, []);

  const fetchDepartmentStats = useCallback(async () => {
    if (!canManageSettings) return;
    
    setLoadingDeptStats(true);
    try {
      const response = await apiClient.getDepartmentStats();
      setDepartmentStats(response.data.departments || []);
    } catch (err) {
      console.error('Failed to fetch department stats:', err);
      setError('Failed to fetch department statistics');
    } finally {
      setLoadingDeptStats(false);
    }
  }, [canManageSettings]);

  useEffect(() => {
    if (canManageSettings) {
      fetchSettings();
      fetchDepartments();
      if (activeSection === 'departments') {
        fetchDepartmentStats();
      }
    }
  }, [canManageSettings, fetchSettings, fetchDepartments, fetchDepartmentStats, activeSection]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const keys = name.split('.');
    
    if (keys.length === 2) {
      const [section, field] = keys;
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) : value)
        }
      }));
    }
  };

  const handleWorkingDayChange = (day, isWorking) => {
    setFormData(prev => {
      const currentWorkingDays = [...prev.attendance.workingDays];
      const currentNonWorkingDays = [...prev.attendance.nonWorkingDays];
      
      if (isWorking) {
        if (!currentWorkingDays.includes(day)) {
          currentWorkingDays.push(day);
        }
        const nonWorkingIndex = currentNonWorkingDays.indexOf(day);
        if (nonWorkingIndex > -1) {
          currentNonWorkingDays.splice(nonWorkingIndex, 1);
        }
      } else {
        const workingIndex = currentWorkingDays.indexOf(day);
        if (workingIndex > -1) {
          currentWorkingDays.splice(workingIndex, 1);
        }
        if (!currentNonWorkingDays.includes(day)) {
          currentNonWorkingDays.push(day);
        }
      }
      
      return {
        ...prev,
        attendance: {
          ...prev.attendance,
          workingDays: currentWorkingDays.sort(),
          nonWorkingDays: currentNonWorkingDays.sort()
        }
      };
    });
  };

  const handleSaturdayHolidayChange = (saturdayNumber, isHoliday) => {
    setFormData(prev => {
      const currentSaturdayHolidays = [...prev.attendance.saturdayHolidays];
      
      if (isHoliday) {
        if (!currentSaturdayHolidays.includes(saturdayNumber)) {
          currentSaturdayHolidays.push(saturdayNumber);
        }
      } else {
        const index = currentSaturdayHolidays.indexOf(saturdayNumber);
        if (index > -1) {
          currentSaturdayHolidays.splice(index, 1);
        }
      }
      
      return {
        ...prev,
        attendance: {
          ...prev.attendance,
          saturdayHolidays: currentSaturdayHolidays.sort()
        }
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    resetMessages();
    
    try {
      if (selectedDepartment) {
        await apiClient.updateDepartmentSettings(selectedDepartment, formData);
        setMessage({ type: 'success', content: `Department settings updated successfully for ${selectedDepartment}!` });
      } else {
        await apiClient.updateGlobalSettings(formData);
        setMessage({ type: 'success', content: 'Global settings updated successfully!' });
      }
      
      await fetchSettings();
    } catch (err) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleDepartmentChange = (e) => {
    setSelectedDepartment(e.target.value);
    resetMessages();
  };

  const handleRefresh = () => {
    fetchSettings();
    if (activeSection === 'departments') {
      fetchDepartmentStats();
    }
  };

  const handleTestNotification = async () => {
    setTestingNotification(true);
    resetMessages();
    
    // Check if user is authenticated
    const token = localStorage.getItem('authToken');
    console.log('Testing notification with user:', user?.role, 'token exists:', !!token);
    
    try {
      const data = await apiClient.post('/notifications/test', { 
        type: 'hr' 
      });
      
      console.log('API Response:', data);
      
      if (data && data.success) {
        const { details } = data;
        let statusInfo = [];
        if (details && details.emailReady) statusInfo.push('Email ✓');
        if (details && details.whatsappReady) statusInfo.push('WhatsApp ✓');  
        if (details && details.pushReady) statusInfo.push('Push ✓');
        
        if (statusInfo.length === 0) {
          setMessage({ 
            type: 'success', 
            content: 'Test completed, but no notification services are configured. Please configure email or WhatsApp settings to receive notifications.' 
          });
        } else {
          setMessage({ 
            type: 'success', 
            content: `Test notification sent successfully! Services ready: ${statusInfo.join(', ')}. Check your configured channels.` 
          });
        }
      } else {
        setError(`Server returned: ${data?.message || 'Unknown response format'}`);
      }
    } catch (err) {
      console.error('Test notification error:', err);
      let errorMessage = 'Failed to send test notification';
      
      if (err.response) {
        // Server responded with error status
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Check if backend is running.';
      } else {
        // Something else happened
        errorMessage = err.message || 'Unknown error occurred';
      }
      
      setError(errorMessage);
    } finally {
      setTestingNotification(false);
    }
  };

  // Department management handlers
  const openAddModal = () => {
    setShowAddDeptModal(true);
    setNewDeptName('');
    resetMessages();
  };

  const openRenameModal = (dept) => {
    setSelectedDeptForAction(dept);
    setNewDeptName(dept.name);
    setShowRenameDeptModal(true);
    resetMessages();
  };

  const openDeleteModal = (dept) => {
    setSelectedDeptForAction(dept);
    setShowDeleteDeptModal(true);
    resetMessages();
  };

  const handleAddDepartment = async () => {
    if (!newDeptName.trim()) {
      setError('Department name is required');
      return;
    }

    try {
      await apiClient.addDepartment({ 
        name: newDeptName.trim()
      });
      
      setMessage({ type: 'success', content: 'Department added successfully!' });
      setShowAddDeptModal(false);
      setNewDeptName('');
      
      fetchDepartmentStats();
      fetchDepartments();
    } catch (err) {
      const errorMessage = err.message || err.data?.message || 'Failed to add department';
      setError(errorMessage);
    }
  };

  const handleRenameDepartment = async () => {
    if (!newDeptName.trim() || !selectedDeptForAction) {
      setError('Department name is required');
      return;
    }

    try {
      await apiClient.renameDepartment(selectedDeptForAction.name, newDeptName.trim());
      
      setMessage({ type: 'success', content: 'Department renamed successfully!' });
      setShowRenameDeptModal(false);
      setNewDeptName('');
      setSelectedDeptForAction(null);
      
      fetchDepartmentStats();
      fetchDepartments();
      
      if (selectedDepartment === selectedDeptForAction.name) {
        setSelectedDepartment(newDeptName.trim());
      }
    } catch (err) {
      const errorMessage = err.message || err.data?.message || 'Failed to rename department';
      setError(errorMessage);
    }
  };

  const handleDeleteDepartment = async () => {
    if (!selectedDeptForAction) return;

    try {
      const response = await apiClient.deleteDepartment(selectedDeptForAction.name);
      
      setMessage({ 
        type: 'success', 
        content: `Department deleted successfully! ${response.data.affectedEmployees} employees updated.` 
      });
      setShowDeleteDeptModal(false);
      setSelectedDeptForAction(null);
      
      fetchDepartmentStats();
      fetchDepartments();
      
      if (selectedDepartment === selectedDeptForAction.name) {
        setSelectedDepartment('');
      }
    } catch (err) {
      const errorMessage = err.message || err.data?.message || 'Failed to delete department';
      setError(errorMessage);
    }
  };

  if (!canManageSettings) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Access Denied</h2>
          <p className="text-slate-600 dark:text-slate-400">You don't have permission to access settings.</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'attendance':
        return (
          <AttendanceSettings
            formData={formData}
            selectedDepartment={selectedDepartment}
            departments={departments}
            loading={loading}
            saving={saving}
            onInputChange={handleInputChange}
            onWorkingDayChange={handleWorkingDayChange}
            onSaturdayHolidayChange={handleSaturdayHolidayChange}
            onSave={handleSave}
            onRefresh={handleRefresh}
            onDepartmentChange={handleDepartmentChange}
          />
        );
      case 'departments':
        return (
          <DepartmentManagement
            departmentStats={departmentStats}
            loadingDeptStats={loadingDeptStats}
            expandedDept={expandedDept}
            setExpandedDept={setExpandedDept}
            openAddModal={openAddModal}
            openRenameModal={openRenameModal}
            openDeleteModal={openDeleteModal}
            showAddDeptModal={showAddDeptModal}
            showRenameDeptModal={showRenameDeptModal}
            showDeleteDeptModal={showDeleteDeptModal}
            setShowAddDeptModal={setShowAddDeptModal}
            setShowRenameDeptModal={setShowRenameDeptModal}
            setShowDeleteDeptModal={setShowDeleteDeptModal}
            newDeptName={newDeptName}
            setNewDeptName={setNewDeptName}
            selectedDeptForAction={selectedDeptForAction}
            setSelectedDeptForAction={setSelectedDeptForAction}
            handleAddDepartment={handleAddDepartment}
            handleRenameDepartment={handleRenameDepartment}
            handleDeleteDepartment={handleDeleteDepartment}
            resetMessages={resetMessages}
          />
        );
      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notification Settings</h2>
                <p className="text-slate-600 dark:text-slate-400">Configure notification channels and preferences</p>
              </div>
            </div>

            {/* HR Contact Information */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">HR Contact Information</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    HR Email Addresses
                  </label>
                  <div className="space-y-2">
                    {formData.notifications.hrEmails.map((email, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            const newEmails = [...formData.notifications.hrEmails];
                            newEmails[index] = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              notifications: { ...prev.notifications, hrEmails: newEmails }
                            }));
                          }}
                          className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                          placeholder="hr@company.com"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newEmails = formData.notifications.hrEmails.filter((_, i) => i !== index);
                            setFormData(prev => ({
                              ...prev,
                              notifications: { ...prev.notifications, hrEmails: newEmails }
                            }));
                          }}
                          className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, hrEmails: [...prev.notifications.hrEmails, ''] }
                        }));
                      }}
                      className="w-full px-3 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                    >
                      + Add Email
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    HR WhatsApp Numbers
                  </label>
                  <div className="space-y-2">
                    {formData.notifications.hrPhones.map((phone, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => {
                            const newPhones = [...formData.notifications.hrPhones];
                            newPhones[index] = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              notifications: { ...prev.notifications, hrPhones: newPhones }
                            }));
                          }}
                          className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                          placeholder="+919876543210"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newPhones = formData.notifications.hrPhones.filter((_, i) => i !== index);
                            setFormData(prev => ({
                              ...prev,
                              notifications: { ...prev.notifications, hrPhones: newPhones }
                            }));
                          }}
                          className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, hrPhones: [...prev.notifications.hrPhones, ''] }
                        }));
                      }}
                      className="w-full px-3 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                    >
                      + Add Phone
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Channels */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Notification Channels</h3>
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={testingNotification}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {testingNotification ? (
                    <>
                      <TestTube className="w-4 h-4 animate-pulse" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Test
                    </>
                  )}
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">Email Notifications</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Send detailed notifications via email</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.notifications.emailEnabled}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, emailEnabled: e.target.checked }
                    }))}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">WhatsApp Notifications</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Send instant alerts via WhatsApp</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.notifications.whatsappEnabled}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, whatsappEnabled: e.target.checked }
                    }))}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">Browser Push Notifications</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Show notifications in browser</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.notifications.pushEnabled}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, pushEnabled: e.target.checked }
                    }))}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Employee Milestone Alerts */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Employee Milestone Alerts</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Get notified about employee anniversaries</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.notifications.milestoneAlertsEnabled}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, milestoneAlertsEnabled: e.target.checked }
                  }))}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>
              {formData.notifications.milestoneAlertsEnabled && (
                <div className="space-y-3 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.notifications.milestoneTypes.threeMonths}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          milestoneTypes: { ...prev.notifications.milestoneTypes, threeMonths: e.target.checked }
                        }
                      }))}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">3 Month Anniversary</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.notifications.milestoneTypes.sixMonths}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          milestoneTypes: { ...prev.notifications.milestoneTypes, sixMonths: e.target.checked }
                        }
                      }))}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">6 Month Anniversary</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.notifications.milestoneTypes.oneYear}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          milestoneTypes: { ...prev.notifications.milestoneTypes, oneYear: e.target.checked }
                        }
                      }))}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">1 Year Anniversary</label>
                  </div>
                </div>
              )}
            </div>

            {/* Holiday Reminders */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Holiday Reminders</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Notify employees about upcoming holidays</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.notifications.holidayReminderEnabled}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, holidayReminderEnabled: e.target.checked }
                  }))}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>
              {formData.notifications.holidayReminderEnabled && (
                <div className="pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Days before holiday to remind:
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="7"
                      value={formData.notifications.holidayReminderDays}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, holidayReminderDays: parseInt(e.target.value) }
                      }))}
                      className="w-16 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        );
      case 'general':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-900/20 rounded-lg">
                <AlertCircle className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">General Settings</h2>
                <p className="text-slate-600 dark:text-slate-400">System preferences and configurations</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <p className="text-slate-600 dark:text-slate-400">General settings coming soon...</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <SettingsLayout 
      activeSection={activeSection} 
      onSectionChange={setActiveSection}
    >
      {/* Messages */}
      {(error || message.content) && (
        <div className="mb-6">
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              <XCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}
          {message.content && (
            <div className={`flex items-center gap-2 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
            }`}>
              <CheckCircle className="w-5 h-5" />
              <span>{message.content}</span>
            </div>
          )}
        </div>
      )}

      {renderContent()}
    </SettingsLayout>
  );
};

export default SettingsPage;