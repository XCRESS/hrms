import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../service/apiClient';
import useAuth from '../../hooks/authjwt';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

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