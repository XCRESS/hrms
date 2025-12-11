import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../service/apiClient';
import useAuth from '../../hooks/authjwt';
import { AlertCircle, CheckCircle, XCircle, TestTube, Send, RefreshCw, Save, MapPin } from 'lucide-react';
import { useToast } from '../ui/toast';

import SettingsLayout from './settings/SettingsLayout';
import AttendanceSettings from './settings/AttendanceSettings';
import DepartmentManagement from './settings/DepartmentManagement';

const SettingsPage = () => {
  const user = useAuth();
  const { toast } = useToast();
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

  // Geofence & office locations
  const [officeLocations, setOfficeLocations] = useState([]);
  const [officeLoading, setOfficeLoading] = useState(false);
  const [officeSubmitting, setOfficeSubmitting] = useState(false);
  const [officeForm, setOfficeForm] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radius: 100,
    isActive: true
  });
  
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
    },
    general: {
      locationSetting: 'na',
      taskReportSetting: 'na',
      geofence: {
        enabled: true,
        enforceCheckIn: true,
        enforceCheckOut: true,
        defaultRadius: 100,
        allowWFHBypass: true
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
        },
        general: {
          locationSetting: response.data.general?.locationSetting ?? 'na',
          taskReportSetting: response.data.general?.taskReportSetting ?? 'na',
          geofence: {
            enabled: response.data.general?.geofence?.enabled ?? true,
            enforceCheckIn: response.data.general?.geofence?.enforceCheckIn ?? true,
            enforceCheckOut: response.data.general?.geofence?.enforceCheckOut ?? true,
            defaultRadius: response.data.general?.geofence?.defaultRadius ?? 100,
            allowWFHBypass: response.data.general?.geofence?.allowWFHBypass ?? true
          }
        }
      });
      setOfficeForm((prev) => ({
        ...prev,
        radius: response.data.general?.geofence?.defaultRadius ?? prev.radius
      }));
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

  const handleGeofenceSettingChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      general: {
        ...prev.general,
        geofence: {
          ...prev.general.geofence,
          [field]: field === 'defaultRadius' ? Number(value) : value
        }
      }
    }));
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
        toast({
          variant: "success",
          title: "Settings Saved",
          description: `Department settings updated successfully for ${selectedDepartment}!`
        });
      } else {
        await apiClient.updateGlobalSettings(formData);
        toast({
          variant: "success", 
          title: "Settings Saved",
          description: "Global settings updated successfully!"
        });
      }
      
      await fetchSettings();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: err.message || 'Failed to save settings.'
      });
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
    
    if (!token) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in again to test notifications"
      });
      setTestingNotification(false);
      return;
    }
    
    if (!user || (user.role !== 'admin' && user.role !== 'hr')) {
      toast({
        variant: "destructive", 
        title: "Access Denied",
        description: "Only admin and HR users can test notifications"
      });
      setTestingNotification(false);
      return;
    }
    
    try {
      console.log('Calling testNotification API...');
      
      // Test HR notifications
      console.log('Testing HR notifications...');
      const hrData = await apiClient.testNotification('hr');
      console.log('HR Test Response:', hrData);
      
      // Test milestone alerts
      console.log('Testing milestone alerts...');
      const milestoneData = await apiClient.testNotification('milestone');
      console.log('Milestone Test Response:', milestoneData);
      
      // Test holiday reminders
      console.log('Testing holiday reminders...');
      const holidayData = await apiClient.testNotification('holiday');
      console.log('Holiday Test Response:', holidayData);
      
      // Use the latest response (holiday) for status info
      const data = holidayData;
      
      if (data && data.success) {
        const { details } = data;
        let statusInfo = [];
        if (details && details.emailReady) statusInfo.push('Email ✓');
        if (details && details.whatsappReady) statusInfo.push('WhatsApp ✓');  
        if (details && details.pushReady) statusInfo.push('Push ✓');
        
        if (statusInfo.length === 0) {
          toast({
            variant: "warning",
            title: "Test Completed",
            description: "No notification services are configured. Please configure email or WhatsApp settings to receive notifications."
          });
        } else {
          toast({
            variant: "success",
            title: "All Tests Successful",
            description: `All notification tests passed! Services ready: ${statusInfo.join(', ')}. HR notifications, milestone alerts, and holiday reminders are working. Check your configured channels.`
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Test Failed",
          description: `Server returned: ${data?.message || 'Unknown response format'}`
        });
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
      
      toast({
        variant: "destructive",
        title: "Test Failed",
        description: errorMessage
      });
    } finally {
      setTestingNotification(false);
    }
  };

  const loadOfficeLocations = useCallback(async () => {
    if (!canManageSettings) return;
    setOfficeLoading(true);
    try {
      const response = await apiClient.getOfficeLocations();
      setOfficeLocations(response?.data?.locations || response.locations || []);
    } catch (err) {
      console.error('Failed to load office locations:', err);
      toast({
        variant: "destructive",
        title: "Failed to load office locations",
        description: err.message || 'Please try again.'
      });
    } finally {
      setOfficeLoading(false);
    }
  }, [canManageSettings, toast]);

  useEffect(() => {
    if (activeSection === 'geofence' && canManageSettings) {
      loadOfficeLocations();
    }
  }, [activeSection, canManageSettings, loadOfficeLocations]);

  const handleOfficeInputChange = (field, value) => {
    setOfficeForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUseCurrentOfficeLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "Geolocation Not Supported",
        description: "Your browser does not support location access."
      });
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        });
      });

      setOfficeForm(prev => ({
        ...prev,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }));
    } catch (error) {
      let message = error.message || "Unable to capture location.";
      if (error.code === error.PERMISSION_DENIED) {
        message = "Location permission denied.";
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        message = "Location unavailable.";
      } else if (error.code === error.TIMEOUT) {
        message = "Location request timed out.";
      }
      toast({
        variant: "destructive",
        title: "Location Error",
        description: message
      });
    }
  };

  const handleCreateOfficeLocation = async (e) => {
    e.preventDefault();
    setOfficeSubmitting(true);
    try {
      await apiClient.createOfficeLocation({
        name: officeForm.name,
        address: officeForm.address,
        latitude: parseFloat(officeForm.latitude),
        longitude: parseFloat(officeForm.longitude),
        radius: parseFloat(officeForm.radius),
        isActive: officeForm.isActive
      });
      toast({
        variant: "success",
        title: "Office Location Added",
        description: `${officeForm.name} has been saved.`
      });
      setOfficeForm(prev => ({
        ...prev,
        name: '',
        address: '',
        latitude: '',
        longitude: '',
        radius: formData.general.geofence.defaultRadius || 100,
        isActive: true
      }));
      loadOfficeLocations();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to save location",
        description: err.message || 'Please check the details and try again.'
      });
    } finally {
      setOfficeSubmitting(false);
    }
  };

  const handleToggleOfficeStatus = async (location) => {
    try {
      await apiClient.updateOfficeLocation(location._id, { isActive: !location.isActive });
      loadOfficeLocations();
      toast({
        variant: "success",
        title: "Office Updated",
        description: `${location.name} is now ${!location.isActive ? 'active' : 'inactive'}.`
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to update office",
        description: err.message || 'Please try again.'
      });
    }
  };

  const handleDeleteOfficeLocation = async (locationId) => {
    if (!window.confirm('Are you sure you want to remove this office location?')) return;
    try {
      await apiClient.deleteOfficeLocation(locationId);
      loadOfficeLocations();
      toast({
        variant: "success",
        title: "Office Removed",
        description: "The office location has been deleted."
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to delete office",
        description: err.message || 'Please try again.'
      });
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
      toast({
        variant: "warning",
        title: "Validation Error", 
        description: "Department name is required"
      });
      return;
    }

    try {
      await apiClient.addDepartment({ 
        name: newDeptName.trim()
      });
      
      toast({
        variant: "success",
        title: "Department Added",
        description: "Department added successfully!"
      });
      setShowAddDeptModal(false);
      setNewDeptName('');
      
      fetchDepartmentStats();
      fetchDepartments();
    } catch (err) {
      const errorMessage = err.message || err.data?.message || 'Failed to add department';
      toast({
        variant: "destructive",
        title: "Add Failed",
        description: errorMessage
      });
    }
  };

  const handleRenameDepartment = async () => {
    if (!newDeptName.trim() || !selectedDeptForAction) {
      toast({
        variant: "warning",
        title: "Validation Error",
        description: "Department name is required"
      });
      return;
    }

    try {
      await apiClient.renameDepartment(selectedDeptForAction.name, newDeptName.trim());
      
      toast({
        variant: "success",
        title: "Department Renamed",
        description: "Department renamed successfully!"
      });
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
      toast({
        variant: "destructive",
        title: "Rename Failed",
        description: errorMessage
      });
    }
  };

  const handleDeleteDepartment = async () => {
    if (!selectedDeptForAction) return;

    try {
      const response = await apiClient.deleteDepartment(selectedDeptForAction.name);
      
      toast({
        variant: "success",
        title: "Department Deleted",
        description: `Department deleted successfully! ${response.data.affectedEmployees} employees updated.`
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
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: errorMessage
      });
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
            fetchDepartmentStats={fetchDepartmentStats}
            fetchDepartments={fetchDepartments}
          />
        );
      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notification Settings</h2>
                  <p className="text-slate-600 dark:text-slate-400">Configure notification channels and preferences</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
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
                      Test All
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
          </div>
        );
      case 'general':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-900/20 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">General Settings</h2>
                  <p className="text-slate-600 dark:text-slate-400">System preferences and configurations</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
            
            {/* Location Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Check-in Location Settings</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="location-na"
                    name="general.locationSetting"
                    value="na"
                    checked={formData.general.locationSetting === 'na'}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="location-na" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    <span className="block">N/A - No Location Required</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">Check-in without location tracking</span>
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="location-optional"
                    name="general.locationSetting"
                    value="optional"
                    checked={formData.general.locationSetting === 'optional'}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="location-optional" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    <span className="block">Optional - Allow Check-in Without Location</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">Try to get location, but allow check-in even if permission is denied</span>
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="location-mandatory"
                    name="general.locationSetting"
                    value="mandatory"
                    checked={formData.general.locationSetting === 'mandatory'}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="location-mandatory" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    <span className="block">Mandatory - Location Required</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">Check-in not allowed if location permission is denied or unavailable</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Task Report Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Check-out Task Report Settings</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="task-na"
                    name="general.taskReportSetting"
                    value="na"
                    checked={formData.general.taskReportSetting === 'na'}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="task-na" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    <span className="block">N/A - Direct Check-out</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">Check-out without task report prompt</span>
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="task-optional"
                    name="general.taskReportSetting"
                    value="optional"
                    checked={formData.general.taskReportSetting === 'optional'}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="task-optional" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    <span className="block">Optional - Prompt After Check-out</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">Allow check-out, then ask if employee wants to submit task report</span>
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="task-mandatory"
                    name="general.taskReportSetting"
                    value="mandatory"
                    checked={formData.general.taskReportSetting === 'mandatory'}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="task-mandatory" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    <span className="block">Mandatory - Required for Check-out</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">Check-out not allowed without submitting task report</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
      case 'geofence':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Geo-Fence & Office Locations</h2>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">Manage geo-fenced attendance policies and office coordinates</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Geo-Fence Enforcement</h3>
              <div className="space-y-4">
                <label className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 dark:text-slate-200">Enable Geo-Fenced Attendance</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Require employees to be within office radius to check in/out</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.general.geofence.enabled}
                    onChange={(e) => handleGeofenceSettingChange('enabled', e.target.checked)}
                    className="h-5 w-5 flex-shrink-0"
                  />
                </label>
                <label className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 dark:text-slate-200">Enforce On Check-in</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Block check-in attempts outside the configured radius</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.general.geofence.enforceCheckIn}
                    onChange={(e) => handleGeofenceSettingChange('enforceCheckIn', e.target.checked)}
                    className="h-5 w-5 flex-shrink-0"
                  />
                </label>
                <label className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 dark:text-slate-200">Enforce On Check-out</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Require location validation for check-outs as well</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.general.geofence.enforceCheckOut}
                    onChange={(e) => handleGeofenceSettingChange('enforceCheckOut', e.target.checked)}
                    className="h-5 w-5 flex-shrink-0"
                  />
                </label>
                <label className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 dark:text-slate-200">Allow WFH Requests</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Employees outside the radius can submit WFH requests</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.general.geofence.allowWFHBypass}
                    onChange={(e) => handleGeofenceSettingChange('allowWFHBypass', e.target.checked)}
                    className="h-5 w-5 flex-shrink-0"
                  />
                </label>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Default Radius (meters)</label>
                  <input
                    type="number"
                    min={50}
                    max={500}
                    value={formData.general.geofence.defaultRadius}
                    onChange={(e) => handleGeofenceSettingChange('defaultRadius', e.target.value)}
                    className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Add Office Location</h3>
                <form className="space-y-4" onSubmit={handleCreateOfficeLocation}>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Office Name</label>
                    <input
                      type="text"
                      required
                      value={officeForm.name}
                      onChange={(e) => handleOfficeInputChange('name', e.target.value)}
                      className="mt-1 w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm sm:text-base bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Address (optional)</label>
                    <textarea
                      value={officeForm.address}
                      onChange={(e) => handleOfficeInputChange('address', e.target.value)}
                      rows={2}
                      className="mt-1 w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm sm:text-base bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Latitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        required
                        value={officeForm.latitude}
                        onChange={(e) => handleOfficeInputChange('latitude', e.target.value)}
                        className="mt-1 w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm sm:text-base bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Longitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        required
                        value={officeForm.longitude}
                        onChange={(e) => handleOfficeInputChange('longitude', e.target.value)}
                        className="mt-1 w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm sm:text-base bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Radius (m)</label>
                      <input
                        type="number"
                        min={50}
                        max={1000}
                        value={officeForm.radius}
                        onChange={(e) => handleOfficeInputChange('radius', e.target.value)}
                        className="mt-1 w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <label className="flex items-end gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      Active
                      <input
                        type="checkbox"
                        checked={officeForm.isActive}
                        onChange={(e) => handleOfficeInputChange('isActive', e.target.checked)}
                        className="h-5 w-5"
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleUseCurrentOfficeLocation}
                      className="flex items-center gap-2 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <MapPin className="w-4 h-4" />
                      Use My Current Location
                    </button>
                    <button
                      type="submit"
                      disabled={officeSubmitting}
                      className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                    >
                      {officeSubmitting ? 'Saving...' : 'Add Location'}
                    </button>
                  </div>
                </form>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">Saved Office Locations</h3>
                  <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{officeLocations.length} location{officeLocations.length !== 1 ? 's' : ''}</span>
                </div>
                {officeLoading ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Loading office locations...</p>
                ) : officeLocations.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No office locations configured yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {officeLocations.map(location => (
                      <div key={location._id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">{location.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{location.address || 'No address provided'}</p>
                          </div>
                          <span className={`px-2 sm:px-3 py-1 text-xs rounded-full self-start sm:self-auto ${location.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                            {location.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-3">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Latitude</p>
                            <p className="font-mono text-xs sm:text-sm truncate">{location.coordinates?.latitude}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Longitude</p>
                            <p className="font-mono text-xs sm:text-sm truncate">{location.coordinates?.longitude}</p>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Radius</p>
                            <p className="text-xs sm:text-sm">{location.radius} m</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => handleToggleOfficeStatus(location)}
                            className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {location.isActive ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOfficeLocation(location._id)}
                            className="text-xs sm:text-sm text-red-600 dark:text-red-400 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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