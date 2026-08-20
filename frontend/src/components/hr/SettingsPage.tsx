import React, { useState, useEffect } from 'react';
import { useToast } from '../ui/toast';
import useAuth from '../../hooks/authjwt';

import {
    useGlobalSettings,
    useDepartmentSettings,
    useUpdateGlobalSettings,
    useUpdateDepartmentSettings,
    useDepartments,
    useDepartmentStats,
    useAddDepartment,
    useRenameDepartment,
    useDeleteDepartment,
    useOfficeLocations,
    useCreateOfficeLocation,
    useUpdateOfficeLocation,
    useDeleteOfficeLocation,
    useRescheduleHrReport,
    useTestHrReport,
    useTestNotification,
} from '../../hooks/queries';

import SettingsLayout from './settings/SettingsLayout';
import AttendanceSettings from './settings/AttendanceSettings';
import DepartmentManagement from './settings/DepartmentManagement';
import AppearanceSettings from './settings/AppearanceSettings';
import NotificationSettings from './settings/NotificationSettings';
import GeneralSettings from './settings/GeneralSettings';
import GeofenceSettings from './settings/GeofenceSettings';
import { SettingsFormData, OfficeFormData, GeofenceSettings as GeofenceSettingsType } from './settings/types';
import { OfficeLocation, GlobalSettings } from '@/types';

const SettingsPage: React.FC = () => {
    const user = useAuth();
    const { toast } = useToast();
    const [activeSection, setActiveSection] = useState('attendance');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [isTestingHrReport, setIsTestingHrReport] = useState(false);
    const [testingNotification, setTestingNotification] = useState(false);
    const [creatingLocation, setCreatingLocation] = useState(false);

    // Department management state
    const [showAddDeptModal, setShowAddDeptModal] = useState(false);
    const [showRenameDeptModal, setShowRenameDeptModal] = useState(false);
    const [showDeleteDeptModal, setShowDeleteDeptModal] = useState(false);
    const [selectedDeptForAction, setSelectedDeptForAction] = useState<any | null>(null);
    const [newDeptName, setNewDeptName] = useState('');
    const [expandedDept, setExpandedDept] = useState<string | null>(null);

    // Form data state
    const [formData, setFormData] = useState<SettingsFormData>({
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
            emailEnabled: true,
            pushEnabled: true,
            holidayReminderEnabled: true,
            holidayReminderDays: 1,
            milestoneAlertsEnabled: true,
            milestoneTypes: {
                threeMonths: true,
                sixMonths: true,
                oneYear: true
            },
            dailyHrAttendanceReport: {
                enabled: false,
                sendTime: '19:00',
                includeAbsentees: true,
                subjectLine: 'Daily Attendance Report - {date}'
            },
            hrEmailTypes: {
                leaveRequests: true,
                wfhRequests: true,
                regularizationRequests: true,
                helpRequests: true,
                employeeMilestones: true,
                expenseRequests: true
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

    // React Query hooks
    const { data: globalSettingsData, isLoading: globalSettingsLoading, refetch: refetchGlobalSettings } = useGlobalSettings({
        enabled: !!canManageSettings && !selectedDepartment
    });

    const { data: departmentSettingsData, isLoading: departmentSettingsLoading, refetch: refetchDepartmentSettings } = useDepartmentSettings(selectedDepartment, {
        enabled: !!canManageSettings && !!selectedDepartment
    });

    const { data: departments = [] } = useDepartments({ enabled: !!canManageSettings });

    const shouldFetchDeptStats = activeSection === 'departments' && !!canManageSettings;
    const { data: departmentStats = [], isLoading: loadingDeptStats } = useDepartmentStats({
        enabled: shouldFetchDeptStats
    });

    const shouldFetchOfficeLocations = activeSection === 'geofence' && !!canManageSettings;
    const { data: officeLocations = [], isLoading: officeLoading } = useOfficeLocations({
        enabled: shouldFetchOfficeLocations
    });

    // Mutations
    const updateGlobalSettingsMutation = useUpdateGlobalSettings();
    const updateDepartmentSettingsMutation = useUpdateDepartmentSettings();
    const addDepartmentMutation = useAddDepartment();
    const renameDepartmentMutation = useRenameDepartment();
    const deleteDepartmentMutation = useDeleteDepartment();
    const createOfficeLocationMutation = useCreateOfficeLocation();
    const updateOfficeLocationMutation = useUpdateOfficeLocation();
    const deleteOfficeLocationMutation = useDeleteOfficeLocation();
    const rescheduleHrReportMutation = useRescheduleHrReport();
    const testHrReportMutation = useTestHrReport();
    const testNotificationMutation = useTestNotification();

    const loading = selectedDepartment ? departmentSettingsLoading : globalSettingsLoading;
    const saving = updateGlobalSettingsMutation.isPending || updateDepartmentSettingsMutation.isPending;


    // Sync React Query data to formData
    useEffect(() => {
        const settingsData = selectedDepartment ? departmentSettingsData : globalSettingsData;
        if (!settingsData) return;

        // Department settings carry no notifications section; the optional
        // chaining below falls back to defaults for whatever is absent.
        const response = settingsData as Partial<GlobalSettings>;

        setFormData({
            attendance: {
                ...response.attendance,
                workingDays: response.attendance?.workingDays || [1, 2, 3, 4, 5, 6],
                nonWorkingDays: response.attendance?.nonWorkingDays || [0],
                saturdayHolidays: response.attendance?.saturdayHolidays || [],
                lateThreshold: response.attendance?.lateThreshold || '',
                workStartTime: response.attendance?.workStartTime || '',
                workEndTime: response.attendance?.workEndTime || '',
                halfDayEndTime: response.attendance?.halfDayEndTime || '',
                minimumWorkHours: response.attendance?.minimumWorkHours || 4,
                fullDayHours: response.attendance?.fullDayHours || 8,
                saturdayWorkType: response.attendance?.saturdayWorkType || 'full',
            },
            notifications: {
                hrEmails: response.notifications?.hrEmails || [],
                emailEnabled: response.notifications?.emailEnabled ?? true,
                pushEnabled: response.notifications?.pushEnabled ?? true,
                holidayReminderEnabled: response.notifications?.holidayReminderEnabled ?? true,
                holidayReminderDays: response.notifications?.holidayReminderDays ?? 1,
                milestoneAlertsEnabled: response.notifications?.milestoneAlertsEnabled ?? true,
                milestoneTypes: {
                    threeMonths: response.notifications?.milestoneTypes?.threeMonths ?? true,
                    sixMonths: response.notifications?.milestoneTypes?.sixMonths ?? true,
                    oneYear: response.notifications?.milestoneTypes?.oneYear ?? true
                },
                dailyHrAttendanceReport: {
                    enabled: response.notifications?.dailyHrAttendanceReport?.enabled ?? false,
                    sendTime: response.notifications?.dailyHrAttendanceReport?.sendTime ?? '19:00',
                    includeAbsentees: response.notifications?.dailyHrAttendanceReport?.includeAbsentees ?? true,
                    subjectLine: response.notifications?.dailyHrAttendanceReport?.subjectLine ?? 'Daily Attendance Report - {date}'
                },
                hrEmailTypes: {
                    leaveRequests: response.notifications?.hrEmailTypes?.leaveRequests ?? true,
                    wfhRequests: response.notifications?.hrEmailTypes?.wfhRequests ?? true,
                    regularizationRequests: response.notifications?.hrEmailTypes?.regularizationRequests ?? true,
                    helpRequests: response.notifications?.hrEmailTypes?.helpRequests ?? true,
                    employeeMilestones: response.notifications?.hrEmailTypes?.employeeMilestones ?? true,
                    expenseRequests: response.notifications?.hrEmailTypes?.expenseRequests ?? true
                }
            },
            general: {
                locationSetting: response.general?.locationSetting ?? 'na',
                taskReportSetting: response.general?.taskReportSetting ?? 'na',
                geofence: {
                    enabled: response.general?.geofence?.enabled ?? true,
                    enforceCheckIn: response.general?.geofence?.enforceCheckIn ?? true,
                    enforceCheckOut: response.general?.geofence?.enforceCheckOut ?? true,
                    defaultRadius: response.general?.geofence?.defaultRadius ?? 100,
                    allowWFHBypass: response.general?.geofence?.allowWFHBypass ?? true
                }
            }
        });
    }, [globalSettingsData, departmentSettingsData, selectedDepartment]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        // Checkbox specific logic
        const checked = (e.target as HTMLInputElement).checked;

        const keys = name.split('.');

        if (keys.length === 2) {
            const [section, field] = keys as [keyof SettingsFormData, string];

            // Need to cast to any to handle dynamic nested update
            setFormData(prev => ({
                ...prev,
                [section]: {
                    ...(prev[section] as any),
                    [field]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) : value)
                }
            }));
        }
    };

    const handleError = (err: any, customTitle: string) => {
        const errorMsg = err.message || err.data?.message || 'Action failed';
        toast({
            variant: "destructive",
            title: customTitle,
            description: errorMsg
        });
    };

    // --- Geofence Handlers ---
    const handleUpdateGeofence = (newSettings: GeofenceSettingsType) => {
        setFormData(prev => ({
            ...prev,
            general: {
                ...prev.general,
                geofence: newSettings
            }
        }));
    };

    const handleCreateOfficeLocation = async (data: OfficeFormData) => {
        setCreatingLocation(true);
        try {
            await createOfficeLocationMutation.mutateAsync({
                name: data.name,
                address: data.address,
                latitude: typeof data.latitude === 'string' ? parseFloat(data.latitude) : data.latitude,
                longitude: typeof data.longitude === 'string' ? parseFloat(data.longitude) : data.longitude,
                radius: data.radius,
                isActive: data.isActive
            });
            toast({
                variant: "success",
                title: "Office Location Added",
                description: `${data.name} has been saved.`
            });
            // Reset form happens in GeofenceSettings now (controlled) or manually reset there.
        } catch (err: any) {
            handleError(err, "Failed to save location");
        } finally {
            setCreatingLocation(false);
        }
    };

    const handleToggleOfficeStatus = async (location: OfficeLocation) => {
        try {
            await updateOfficeLocationMutation.mutateAsync({
                locationId: location._id,
                updates: { isActive: !location.isActive }
            });
            toast({
                variant: "success",
                title: "Office Updated",
                description: `${location.name} is now ${!location.isActive ? 'active' : 'inactive'}.`
            });
        } catch (err: any) {
            handleError(err, "Failed to update office");
        }
    };

    const handleDeleteOfficeLocation = async (locationId: string) => {
        if (!window.confirm('Are you sure you want to remove this office location?')) return;
        try {
            await deleteOfficeLocationMutation.mutateAsync(locationId);
            toast({
                variant: "success",
                title: "Office Removed",
                description: "The office location has been deleted."
            });
        } catch (err: any) {
            handleError(err, "Failed to delete office");
        }
    };

    // --- Attendance Handlers ---
    const handleWorkingDayChange = (day: number, isWorking: boolean) => {
        setFormData(prev => {
            const currentWorkingDays = [...prev.attendance.workingDays];
            const currentNonWorkingDays = [...(prev.attendance.nonWorkingDays || [])];

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

    const handleSaturdayHolidayChange = (saturdayNumber: number, isHoliday: boolean) => {
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

    // --- Save / Reset ---
    const handleSave = async () => {

        try {
            if (selectedDepartment) {
                // The department endpoint only accepts attendance + general.
                // Sending notifications would be silently stripped by Zod.
                await updateDepartmentSettingsMutation.mutateAsync({
                    departmentName: selectedDepartment,
                    settings: {
                        attendance: formData.attendance,
                        general: formData.general
                    }
                });
                toast({
                    variant: "success",
                    title: "Settings Saved",
                    description: `Department settings updated successfully for ${selectedDepartment}!`
                });
            } else {
                await updateGlobalSettingsMutation.mutateAsync(formData);

                // Reschedule the cron job so enabled/sendTime changes take effect
                // immediately. Runs on disable too, so the job is torn down.
                await rescheduleHrReportMutation.mutateAsync();

                toast({
                    variant: "success",
                    title: "Settings Saved",
                    description: "Global settings updated successfully!"
                });
            }
        } catch (err: any) {
            handleError(err, "Save Failed");
        }
    };

    const handleReset = () => {
        if (window.confirm('Discard all unsaved changes and reload settings?')) {
            if (selectedDepartment) {
                refetchDepartmentSettings();
            } else {
                refetchGlobalSettings();
            }
        }
    };

    const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedDepartment(e.target.value);
    };

    // --- Testing Handlers ---
    const handleTestDailyHrAttendanceReport = async () => {
        if (!formData.notifications.hrEmails || formData.notifications.hrEmails.length === 0) {
            toast({
                variant: "destructive",
                title: "Configuration Required",
                description: "Please configure HR emails first"
            });
            return;
        }

        setIsTestingHrReport(true);
        try {
            await testHrReportMutation.mutateAsync();
            toast({
                variant: "success",
                title: "Test Report Sent",
                description: `Test report sent successfully to ${formData.notifications.hrEmails.length} HR email(s)!`
            });
        } catch (err: any) {
            handleError(err, "Test Failed");
        } finally {
            setIsTestingHrReport(false);
        }
    };

    const handleTestNotification = async () => {
        if (!canManageSettings) {
            toast({
                variant: "destructive",
                title: "Access Denied",
                description: "Only admin and HR users can test notifications"
            });
            return;
        }

        setTestingNotification(true);

        try {
            // Exercise each notification type in turn; the last response carries
            // the service-readiness details we report below.
            await testNotificationMutation.mutateAsync('hr');
            await testNotificationMutation.mutateAsync('milestone');
            const responseData = await testNotificationMutation.mutateAsync('holiday');

            if (responseData && responseData.success) {
                const { details } = responseData;
                const statusInfo = [];
                if (details && details.emailReady) statusInfo.push('Email ✓');
                if (details && details.pushReady) statusInfo.push('Push ✓');

                if (statusInfo.length === 0) {
                    toast({
                        variant: "warning",
                        title: "Test Completed",
                        description: "No notification services are configured."
                    });
                } else {
                    toast({
                        variant: "success",
                        title: "All Tests Successful",
                        description: `All notification tests passed! Services ready: ${statusInfo.join(', ')}.`
                    });
                }
            } else {
                toast({
                    variant: "destructive",
                    title: "Test Failed",
                    description: `Server returned: ${responseData?.message || 'Unknown response format'}`
                });
            }
        } catch (err: any) {
            handleError(err, "Test Failed");
        } finally {
            setTestingNotification(false);
        }
    };

    // --- Department Actions ---
    const openAddModal = () => {
        setShowAddDeptModal(true);
        setNewDeptName('');
    };

    const openRenameModal = (dept: any) => {
        setSelectedDeptForAction(dept);
        setNewDeptName(dept.name);
        setShowRenameDeptModal(true);
    };

    const openDeleteModal = (dept: any) => {
        setSelectedDeptForAction(dept);
        setShowDeleteDeptModal(true);
    };

    const handleAddDepartment = async () => {
        if (!newDeptName.trim()) {
            toast({ variant: "warning", title: "Validation Error", description: "Department name is required" });
            return;
        }
        try {
            await addDepartmentMutation.mutateAsync({ name: newDeptName.trim() });
            toast({ variant: "success", title: "Department Added", description: "Department added successfully!" });
            setShowAddDeptModal(false);
            setNewDeptName('');
        } catch (err: any) { handleError(err, "Add Failed"); }
    };

    const handleRenameDepartment = async () => {
        if (!newDeptName.trim() || !selectedDeptForAction) {
            toast({ variant: "warning", title: "Validation Error", description: "Department name is required" });
            return;
        }
        try {
            await renameDepartmentMutation.mutateAsync({ oldName: selectedDeptForAction.name, newName: newDeptName.trim() });
            toast({ variant: "success", title: "Department Renamed", description: "Department renamed successfully!" });
            setShowRenameDeptModal(false);
            setNewDeptName('');
            setSelectedDeptForAction(null);
            if (selectedDepartment === selectedDeptForAction.name) setSelectedDepartment(newDeptName.trim());
        } catch (err: any) { handleError(err, "Rename Failed"); }
    };

    const handleDeleteDepartment = async () => {
        if (!selectedDeptForAction) return;
        try {
            const response = await deleteDepartmentMutation.mutateAsync(selectedDeptForAction.name);
            toast({
                variant: "success",
                title: "Department Deleted",
                description: `Department deleted successfully! ${response?.affectedEmployees ?? 0} employees updated.`
            });
            setShowDeleteDeptModal(false);
            setSelectedDeptForAction(null);
            if (selectedDepartment === selectedDeptForAction.name) setSelectedDepartment('');
        } catch (err: any) { handleError(err, "Delete Failed"); }
    };

    // --- Render Content ---
    const renderContent = () => {
        switch (activeSection) {
            case 'attendance':
                return (
                    <AttendanceSettings
                        formData={formData} // Matches AttendanceSettings structure largely (mapped in types.ts now)
                        selectedDepartment={selectedDepartment}
                        departments={departments}
                        loading={loading}
                        saving={saving}
                        onInputChange={handleInputChange}
                        onWorkingDayChange={handleWorkingDayChange}
                        onSaturdayHolidayChange={handleSaturdayHolidayChange}
                        onSave={handleSave}
                        onReset={handleReset}
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
                    />
                );
            case 'notifications':
                return (
                    <NotificationSettings
                        notifications={formData.notifications}
                        onUpdate={(newNotes) => setFormData(prev => ({ ...prev, notifications: newNotes }))}
                        onTestNotification={handleTestNotification}
                        testingNotification={testingNotification}
                        onTestHrReport={handleTestDailyHrAttendanceReport}
                        testingHrReport={isTestingHrReport}
                        onSave={handleSave}
                        onReset={handleReset}
                        loading={loading}
                        saving={saving}
                    />
                );
            case 'general':
                return (
                    <GeneralSettings
                        generalSettings={formData.general}
                        onUpdate={(newGen) => setFormData(prev => ({ ...prev, general: newGen }))}
                        onSave={handleSave}
                        onReset={handleReset}
                        loading={loading}
                        saving={saving}
                    />
                );
            case 'appearance':
                return <AppearanceSettings />;
            case 'geofence':
                return (
                    <GeofenceSettings
                        geofenceSettings={formData.general.geofence}
                        officeLocations={officeLocations}
                        onUpdateGeofence={handleUpdateGeofence}
                        onCreateLocation={handleCreateOfficeLocation}
                        onDeleteLocation={handleDeleteOfficeLocation}
                        onToggleLocation={handleToggleOfficeStatus}
                        onSave={handleSave}
                        onReset={handleReset}
                        loading={loading}
                        officeLoading={officeLoading}
                        saving={saving}
                        creatingLocation={creatingLocation}
                    />
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
            {renderContent()}
        </SettingsLayout>
    );
};

export default SettingsPage;
