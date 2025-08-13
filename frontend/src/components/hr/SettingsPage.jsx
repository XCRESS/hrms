import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../service/apiClient';
import useAuth from '../../hooks/authjwt';
import { Settings, Clock, Users, Calendar, CheckCircle, XCircle, Save, RefreshCw, AlertCircle } from 'lucide-react';

const SettingsPage = () => {
  const user = useAuth();
  const [settings, setSettings] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState({ type: '', content: '' });
  
  // Form data state
  const [formData, setFormData] = useState({
    attendance: {
      lateThreshold: '',
      workStartTime: '',
      workEndTime: '',
      halfDayEndTime: '',
      lateArrivalTime: '',
      minimumWorkHours: 4,
      fullDayHours: 8,
      halfDayHours: 4,
      workingDays: [1, 2, 3, 4, 5, 6],
      nonWorkingDays: [0],
      saturdayWorkType: 'full'
    }
  });

  const canManageSettings = user && (user.role === 'admin' || user.role === 'hr');

  const resetMessages = () => {
    setError(null);
    setMessage({ type: '', content: '' });
  };

  // Convert working days array to object for easier checkbox handling
  const workingDaysToObj = (daysArray) => {
    const daysObj = {};
    [0, 1, 2, 3, 4, 5, 6].forEach(day => {
      daysObj[day] = daysArray.includes(day);
    });
    return daysObj;
  };

  // Convert working days object back to array
  const objToWorkingDays = (daysObj) => {
    return Object.entries(daysObj)
      .filter(([, isWorking]) => isWorking)
      .map(([day]) => parseInt(day));
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
      // Keep the 24-hour format for time inputs
      setFormData({
        attendance: {
          ...response.data.attendance,
          workingDays: response.data.attendance.workingDays || [1, 2, 3, 4, 5, 6],
          nonWorkingDays: response.data.attendance.nonWorkingDays || [0]
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

  useEffect(() => {
    if (canManageSettings) {
      fetchSettings();
      fetchDepartments();
    }
  }, [canManageSettings, fetchSettings, fetchDepartments]);

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
        // Add to working days, remove from non-working days
        if (!currentWorkingDays.includes(day)) {
          currentWorkingDays.push(day);
        }
        const nonWorkingIndex = currentNonWorkingDays.indexOf(day);
        if (nonWorkingIndex > -1) {
          currentNonWorkingDays.splice(nonWorkingIndex, 1);
        }
      } else {
        // Remove from working days, add to non-working days
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
          workingDays: currentWorkingDays.sort((a, b) => a - b),
          nonWorkingDays: currentNonWorkingDays.sort((a, b) => a - b)
        }
      };
    });
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    resetMessages();
    
    try {
      let response;
      if (selectedDepartment) {
        response = await apiClient.updateDepartmentSettings(selectedDepartment, formData);
      } else {
        response = await apiClient.updateGlobalSettings(formData);
      }
      
      setSettings(response.data);
      setMessage({ type: 'success', content: `${selectedDepartment ? 'Department' : 'Global'} settings updated successfully!` });
      
      // Refresh the form data with the updated settings
      setFormData({
        attendance: {
          ...response.data.attendance,
          workingDays: response.data.attendance.workingDays || [1, 2, 3, 4, 5, 6],
          nonWorkingDays: response.data.attendance.nonWorkingDays || [0]
        }
      });
    } catch (err) {
      setError(err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleDepartmentChange = (e) => {
    setSelectedDepartment(e.target.value);
    resetMessages();
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Helper function to convert 24-hour time to 12-hour for display
  const formatTimeForDisplay = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  if (!canManageSettings) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-300">
              You don't have permission to access the settings page. Please contact your administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Settings</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            Configure attendance rules, working hours, and department-specific settings
          </p>
        </div>

        {/* Department Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <Users className="h-5 w-5 text-gray-500" />
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Settings Scope
            </label>
            <select
              id="department"
              value={selectedDepartment}
              onChange={handleDepartmentChange}
              className="flex-1 max-w-xs rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Global Settings</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept} Department</option>
              ))}
            </select>
            <button
              onClick={fetchSettings}
              disabled={loading}
              className="p-2 text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-500 mr-3" />
              <span className="text-red-800 dark:text-red-200">{error}</span>
            </div>
          </div>
        )}

        {message.content && (
          <div className={`${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/50 border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/50 border-red-200 dark:border-red-700'} border rounded-lg p-4 mb-6`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mr-3" />
              )}
              <span className={`${message.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                {message.content}
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <div className="text-gray-600 dark:text-gray-300">Loading settings...</div>
          </div>
        ) : settings && (
          <form onSubmit={handleSaveSettings} className="space-y-8">
            {/* Attendance Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Attendance Configuration</h2>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Time Settings */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Working Hours</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Work Start Time
                        {formData.attendance.workStartTime && (
                          <span className="text-xs text-gray-500 ml-2">
                            ({formatTimeForDisplay(formData.attendance.workStartTime)})
                          </span>
                        )}
                      </label>
                      <input
                        type="time"
                        name="attendance.workStartTime"
                        value={formData.attendance.workStartTime}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Work End Time
                      </label>
                      <input
                        type="time"
                        name="attendance.workEndTime"
                        value={formData.attendance.workEndTime}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Late Threshold
                      </label>
                      <input
                        type="time"
                        name="attendance.lateThreshold"
                        value={formData.attendance.lateThreshold}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Arrival after this time marks employee as "late" but still present
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Half Day End Time
                      </label>
                      <input
                        type="time"
                        name="attendance.halfDayEndTime"
                        value={formData.attendance.halfDayEndTime}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Late Arrival Time
                      </label>
                      <input
                        type="time"
                        name="attendance.lateArrivalTime"
                        value={formData.attendance.lateArrivalTime}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Arrival after this time is considered significantly late
                      </p>
                    </div>
                  </div>
                </div>

                {/* Work Hours Thresholds */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Work Hours Thresholds</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    These rules determine how work hours are calculated into attendance status
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Minimum Work Hours
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        name="attendance.minimumWorkHours"
                        value={formData.attendance.minimumWorkHours}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Less than this = Absent
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Day Hours
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        name="attendance.fullDayHours"
                        value={formData.attendance.fullDayHours}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Hours needed for full attendance
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Half Day Hours
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        name="attendance.halfDayHours"
                        value={formData.attendance.halfDayHours}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Minimum hours for half-day attendance
                      </p>
                    </div>
                  </div>
                </div>

                {/* Working Days */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Working Days</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Select Working Days
                      </label>
                      <div className="space-y-2">
                        {dayNames.map((day, index) => (
                          <label key={index} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.attendance.workingDays.includes(index)}
                              onChange={(e) => handleWorkingDayChange(index, e.target.checked)}
                              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 mr-3"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Saturday Work Type
                      </label>
                      <select
                        name="attendance.saturdayWorkType"
                        value={formData.attendance.saturdayWorkType}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="full">Full Day</option>
                        <option value="half">Half Day</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;