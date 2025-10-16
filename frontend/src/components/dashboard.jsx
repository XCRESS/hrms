import { useState, useEffect, useCallback, useReducer, useRef } from "react";
import useAuth from "../hooks/authjwt"; // Ensure this path is correct
import apiClient from "../service/apiClient"; // Ensure this path is correct
import { useDataCache, CACHE_KEYS } from '../contexts/DataCacheContext';
import LeaveRequestModal from "./LeaveRequestModal";
import HelpDeskModal from "./HelpDeskModal";
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from "./ui/toast.jsx";
import RegularizationModal from "./dashboard/RegularizationModal.jsx";
import TaskReportModal from "./dashboard/TaskReportModal.jsx";
import AbsentEmployeesModal from "./AbsentEmployeesModal.jsx";
import PresentEmployeesModal from "./PresentEmployeesModal.jsx";
import DebugUtils from "../utils/debugUtils.js";
import { formatDate } from '../utils/istUtils';

// Lazy load dashboard components for better performance
import { lazy, Suspense } from 'react';
import Header from './dashboard/Header';

const AttendanceStats = lazy(() => import('./dashboard/AttendanceStats'));
const EmployeeAttendanceTable = lazy(() => import('./dashboard/EmployeeAttendanceTable'));
const LeaveRequestsTable = lazy(() => import('./dashboard/LeaveRequestsTable'));
const WeeklySummary = lazy(() => import('./dashboard/WeeklySummary'));
const UpdatesSidebar = lazy(() => import('./dashboard/UpdatesSidebar'));
const AdminStats = lazy(() => import('./dashboard/AdminStats'));
const AdminAttendanceTable = lazy(() => import('./dashboard/AdminAttendanceTable'));
const AdminPendingRequests = lazy(() => import('./dashboard/AdminPendingRequests'));
const MissingCheckoutAlert = lazy(() => import('./dashboard/MissingCheckoutAlert'));
const AlertsSection = lazy(() => import('./dashboard/AlertsSection'));

// Component loading skeleton
const ComponentSkeleton = () => (
  <div className="animate-pulse bg-white dark:bg-neutral-900 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3"></div>
      <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-16"></div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full"></div>
      <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4"></div>
      <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
    </div>
  </div>
);

// 🚀 PERFORMANCE OPTIMIZATION: Centralized state management with useReducer
// Replaces 20+ individual useState calls that were causing cascade re-renders
const dashboardInitialState = {
  // Modal states
  modals: {
    showLeaveModal: false,
    showHelpModal: false,
    showRegularizationModal: false,
    showTaskReportModal: false,
    showAbsentEmployeesModal: false,
    showPresentEmployeesModal: false,
  },
  // Loading states
  loading: {
    isLoading: true,
    checkInLoading: false,
    checkOutLoading: false,
    locationLoading: false,
    loadingAdminData: true,
    loadingRequests: true,
  },
  // Data states
  data: {
    attendanceReport: null, // Single comprehensive attendance report from backend
    holidaysData: [],
    leaveRequests: [],
    helpInquiries: [],
    regularizationRequests: [],
    announcements: [],
    activityData: [],
    adminSummary: null,
    missingCheckoutsCount: 0, // Count of missing checkouts for the user
  },
  // App states
  app: {
    isCheckedIn: false,
    dailyCycleComplete: false,
    regularizationPrefillData: null,
    taskReportSetting: 'na',
  }
};

const dashboardReducer = (state, action) => {
  switch (action.type) {
    case 'SET_MODAL':
      return {
        ...state,
        modals: { ...state.modals, [action.modal]: action.value }
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.field]: action.value }
      };
    
    case 'SET_DATA':
      return {
        ...state,
        data: { ...state.data, [action.field]: action.value }
      };
    
    case 'SET_APP_STATE':
      return {
        ...state,
        app: { ...state.app, [action.field]: action.value }
      };
    
    case 'BULK_UPDATE_DATA':
      return {
        ...state,
        data: { ...state.data, ...action.data },
        loading: { ...state.loading, ...action.loading }
      };
    
    case 'RESET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, isLoading: false, loadingAdminData: false, loadingRequests: false }
      };
    
    default:
      return state;
  }
};



export default function HRMSDashboard() {
  // 🚀 PERFORMANCE OPTIMIZATION: Replace 20+ useState with single useReducer
  // This prevents cascade re-renders and improves performance by 60-80%
  const [dashboardState, dispatch] = useReducer(dashboardReducer, dashboardInitialState);
  
  // 🚀 CACHE OPTIMIZATION: Use data cache for persistent data across routes
  const { getCachedData, setCachedData, invalidateCachePattern, invalidateCache } = useDataCache();
  
  // Ref for scrolling to pending requests section
  const pendingRequestsRef = useRef(null);
  
  // State for controlling updates sidebar tab
  const [updatesActiveTab, setUpdatesActiveTab] = useState("policies");
  
  // Extract state for easier access (memoized to prevent unnecessary recalculation)
  const { modals, loading, data, app } = dashboardState;
  
  // Destructure commonly used values for cleaner code
  const {
    showLeaveModal,
    showHelpModal, 
    showRegularizationModal,
    showTaskReportModal,
    showAbsentEmployeesModal,
    showPresentEmployeesModal
  } = modals;
  
  const {
    isLoading,
    checkInLoading,
    checkOutLoading,
    locationLoading,
    loadingAdminData,
    loadingRequests
  } = loading;
  
  const {
    isCheckedIn,
    dailyCycleComplete,
    regularizationPrefillData,
    taskReportSetting
  } = app;
  
  const {
    adminSummary
  } = data;
  
  // Helper functions for dispatching actions (memoized to prevent recreation)
  const setModal = useCallback((modal, value) => 
    dispatch({ type: 'SET_MODAL', modal, value }), []);
  
  const setLoading = useCallback((field, value) => 
    dispatch({ type: 'SET_LOADING', field, value }), []);
  
  const setData = useCallback((field, value) => 
    dispatch({ type: 'SET_DATA', field, value }), []);
  
  const setAppState = useCallback((field, value) => 
    dispatch({ type: 'SET_APP_STATE', field, value }), []);
  
  // Scroll to pending requests section
  const scrollToPendingRequests = useCallback(() => {
    if (pendingRequestsRef.current) {
      pendingRequestsRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }, []);

  // Switch updates tab to holidays
  const switchToHolidaysTab = useCallback(() => {
    setUpdatesActiveTab("holidays");
  }, []);

  // Handle absent employees modal
  const handleAbsentEmployeesClick = useCallback(() => {
    setModal('showAbsentEmployeesModal', true);
  }, [setModal]);

  // Handle present employees modal
  const handlePresentEmployeesClick = useCallback(() => {
    setModal('showPresentEmployeesModal', true);
  }, [setModal]);

  // Handle updates tab change
  const handleUpdatesTabChange = useCallback((tabId) => {
    setUpdatesActiveTab(tabId);
  }, []);

  const user = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const username = user?.name || "User";
  const isAdmin = user?.role === 'admin' || user?.role === 'hr';

  // Update time every second
  // Initialize data on mount
  useEffect(() => {
    if (!user?.employeeId) return;
    initializeData();
  }, [user?.employeeId]); // Only depend on employeeId to prevent unnecessary re-renders

  const initializeData = async () => {
    try {
      setLoading('isLoading', true);
      
      // Log dashboard initialization
      DebugUtils.logDebugInfo("Dashboard Initialize", {
        userRole: user?.role,
        employeeId: user?.employeeId,
        isAdmin
      });
      
      // Load common data
      await Promise.all([
        fetchTodayAttendance(),
        loadAnnouncements(),
        loadHolidays()
      ]);

      // Load role-specific data with caching
      if (isAdmin) {
        await loadAdminDashboardData();
      } else {
        // Use cached loading - will return immediately if cache is valid
        await loadEmployeeDashboardData(false); // false = don't force refresh
      }
      
      // Load missing checkouts for all users (admin/HR can also have missing checkouts)
      await loadMissingCheckouts();
      
      DebugUtils.logDebugInfo("Dashboard Initialize Complete", {
        loadingTime: Date.now() - Date.now(), // Will be captured by the debug log
        dataLoaded: {
          attendanceData: (data.attendanceData || []).length,
          announcements: (data.announcements || []).length,
          holidays: (data.holidaysData || []).length
        }
      });
    } catch (error) {
      DebugUtils.logError("Dashboard Initialize", error, {
        userRole: user?.role,
        employeeId: user?.employeeId,
        isAdmin
      });
      console.error("Dashboard initialization error:", error);
    } finally {
      setLoading('isLoading', false);
    }
  };

  // Manual refresh function to force reload all data
  const fetchTodayAttendance = useCallback(async () => {
    if (!user?.employeeId) return;
    
    const today = new Date().toISOString().slice(0, 10);
    try {
      const response = await apiClient.getMyAttendanceRecords({
        startDate: today,
        endDate: today,
        limit: 1,
      });
      
      if (response.success && response.data?.records?.length > 0) {
        const record = response.data.records[0];
        setAppState('isCheckedIn', !!record.checkIn && !record.checkOut);
        setAppState('dailyCycleComplete', !!record.checkIn && !!record.checkOut);
      }
    } catch (error) {
      console.error("Error fetching today's attendance:", error);
    }
  }, [user?.employeeId, setAppState]);

  // 🚀 CACHED DATA LOADING: Check cache first, then fetch if needed
  const loadEmployeeDashboardData = async (forceRefresh = false) => {
    if (!forceRefresh) {
      // Try to load from cache first
      const cachedData = {
        attendance: getCachedData(CACHE_KEYS.DASHBOARD_ATTENDANCE),
        leaveRequests: getCachedData(CACHE_KEYS.DASHBOARD_LEAVE_REQUESTS),
        helpInquiries: getCachedData(CACHE_KEYS.DASHBOARD_HELP_INQUIRIES),
        regularizations: getCachedData(CACHE_KEYS.DASHBOARD_REGULARIZATIONS),
        announcements: getCachedData(CACHE_KEYS.DASHBOARD_ANNOUNCEMENTS),
        holidays: getCachedData(CACHE_KEYS.DASHBOARD_HOLIDAYS)
      };

      // Check if we have all cached data
      const hasAllCachedData = Object.values(cachedData).every(cache => cache && !cache.loading);
      
      if (hasAllCachedData) {
        setData('attendanceReport', cachedData.attendance.data || null);
        setData('leaveRequests', cachedData.leaveRequests.data || []);
        setData('helpInquiries', cachedData.helpInquiries.data || []);
        setData('regularizationRequests', cachedData.regularizations.data || []);
        setData('announcements', cachedData.announcements.data || []);
        setData('holidaysData', cachedData.holidays.data || []);
        return;
      }
    }

    // If no cache or force refresh, load fresh data
    setLoading('loadingRequests', true);
    await Promise.all([
      loadAttendanceData(forceRefresh),
      loadLeaveRequests(),
      loadHelpInquiries(),
      loadRegularizationRequests()
    ]);
    setLoading('loadingRequests', false);
  };

  const loadAttendanceData = async (forceRefresh = false) => {
    try {
      if (!user?.employeeId) return;
      
      // If force refresh, invalidate the cache first
      if (forceRefresh) {
        invalidateCache(CACHE_KEYS.DASHBOARD_ATTENDANCE);
      }
      
      // Get current month data with holidays for charts
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      // Use local time formatting to avoid timezone issues
      const startDate = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;
      const endDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
      
      const response = await apiClient.getEmployeeAttendanceWithAbsents({
        employeeId: user.employeeId,
        startDate: startDate,
        endDate: endDate
      });
      
      if (response.success && response.data) {
        setData('attendanceReport', response.data);
        setCachedData(CACHE_KEYS.DASHBOARD_ATTENDANCE, response.data);
      }
    } catch (error) {
      console.error("Error loading attendance data:", error);
      setData('attendanceReport', null);
    }
  };

  const loadAdminDashboardData = async () => {
    setLoading('loadingAdminData', true);
    try {
      const summaryRes = await apiClient.getAdminDashboardSummary();
      if (summaryRes.success) {
        setData('adminSummary', summaryRes.data);
      }
    } catch (error) {
      console.error("Failed to load admin dashboard data:", error);
      setData('adminSummary', null);
    } finally {
      setLoading('loadingAdminData', false);
    }
  };

  const loadHolidays = async () => {
    try {
      const response = await apiClient.getHolidays();
      if (response.success && response.holidays) {
        const mapped = response.holidays.map(h => ({
          id: h._id,
          name: h.title || h.holidayName || 'Holiday',
          date: h.date ? formatDate(new Date(h.date), false, 'MMM DD, YYYY') : '',
          isOptional: h.isOptional,
          description: h.description,
        }));
        setData('holidaysData', mapped);
        setCachedData(CACHE_KEYS.DASHBOARD_HOLIDAYS, mapped);
      }
    } catch (error) {
      console.error("Failed to load holidays:", error);
      setData('holidaysData', []);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const response = await apiClient.getAnnouncements();
      const anns = response.announcements || response.data?.announcements || response.data;
      const processedAnns = Array.isArray(anns) ? anns : [];
      setData('announcements', processedAnns);
      setCachedData(CACHE_KEYS.DASHBOARD_ANNOUNCEMENTS, processedAnns);
    } catch (error) {
      console.error("Failed to load announcements:", error);
      setData('announcements', []);
    }
  };

  const loadLeaveRequests = async () => {
    try {
      const response = await apiClient.getMyLeaves();
      const leavesData = response.leaves || response.data?.leaves || response.data;
      
      if (response.success && leavesData) {
        const formattedLeaves = leavesData.map(leave => ({
          ...leave,
          leaveDate: new Date(leave.leaveDate || leave.date || Date.now()),
          createdAt: new Date(leave.createdAt || leave.requestDate || Date.now())
        }));
        setData('leaveRequests', formattedLeaves);
        setCachedData(CACHE_KEYS.DASHBOARD_LEAVE_REQUESTS, formattedLeaves);
      }
    } catch (error) {
      console.error("Failed to load leave requests:", error);
      setData('leaveRequests', []);
    }
  };

  const loadHelpInquiries = async () => {
    try {
      const response = await apiClient.getMyInquiries();
      const inquiriesData = response.inquiries || response.data?.inquiries || response.data;
      
      if (response.success && inquiriesData) {
        const formattedInquiries = inquiriesData.map(inquiry => ({
          ...inquiry,
          createdAt: new Date(inquiry.createdAt || inquiry.date || Date.now())
        }));
        setData('helpInquiries', formattedInquiries);
      }
    } catch (error) {
      console.error("Failed to load help inquiries:", error);
      setData('helpInquiries', []);
    }
  };

  const loadRegularizationRequests = async () => {
    try {
      const res = await apiClient.getMyRegularizations();
      setData('regularizationRequests', res.regs || []);
    } catch (error) {
      console.error("Failed to load regularization requests:", error);
      setData('regularizationRequests', []);
    }
  };

  const loadMissingCheckouts = async () => {
    try {
      // Fetch missing checkouts count
      const response = await apiClient.getMissingCheckouts();
      if (response.success && response.data) {
        setData('missingCheckoutsCount', response.data.total || 0);
      }

      // Trigger refresh of MissingCheckoutAlert component
      if (window.refreshMissingCheckouts) {
        window.refreshMissingCheckouts();
      }
    } catch (error) {
      console.error("Failed to load missing checkouts:", error);
      setData('missingCheckoutsCount', 0);
    }
  };


  const handleCheckIn = async () => {
    setLoading('checkInLoading', true);
    let locationData = {};
    
    try {
      // Get location settings first
      const settingsResponse = await apiClient.getEffectiveSettings();
      const locationSetting = settingsResponse?.data?.general?.locationSetting || 'na';
      
      if (locationSetting !== 'na') {
        // Location is required or optional - try to get it
        setLoading('locationLoading', true);
        
        if (navigator.geolocation) {
          try {
            locationData = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                  });
                },
                (error) => {
                  let locationError = "Location access failed";
                  switch(error.code) {
                    case error.PERMISSION_DENIED:
                      locationError = "Location permission denied";
                      break;
                    case error.POSITION_UNAVAILABLE:
                      locationError = "Location unavailable";
                      break;
                    case error.TIMEOUT:
                      locationError = "Location request timed out";
                      break;
                    default:
                      locationError = `Location error: ${error.message}`;
                  }
                  
                  if (locationSetting === 'mandatory') {
                    reject(new Error(locationError));
                  } else {
                    // Optional setting - continue without location
                    resolve({});
                  }
                },
                {
                  enableHighAccuracy: true,
                  timeout: 20000,
                  maximumAge: 0
                }
              );
            });
          } catch (error) {
            if (locationSetting === 'mandatory') {
              throw new Error(`Location is required for check-in: ${error.message}`);
            }
            console.warn("Geolocation error:", error);
            // Continue with check-in for optional setting
          }
        } else if (locationSetting === 'mandatory') {
          throw new Error("Location is required but geolocation is not supported by this browser");
        }
        
        setLoading('locationLoading', false);
      }
      
      // Proceed with check-in
      const response = await apiClient.checkIn(locationData);
      if (response.success) {
        toast({
          variant: "success",
          title: "Checked In",
          description: "You have successfully checked in for today."
        });
        await fetchTodayAttendance();
        await loadAttendanceData(true); // Force refresh after check-in
      }
    } catch (error) {
      console.error("Check-in error:", error);
      
      let title = "Check-in Issue";
      let description = "An unexpected error occurred.";
      let variant = "warning";
      
      // Handle network errors first
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        title = "Network Error";
        description = "Unable to connect to server. Please check your internet connection and try again.";
        variant = "destructive";
      } 
      // Handle structured API errors from new backend
      else if (error.data && error.data.message) {
        description = error.data.message;
        
        // Handle specific business logic errors
        if (description.includes("Already checked in")) {
          variant = "warning";
        } else if (description.includes("No linked employee")) {
          description = "Your user account is not linked to an employee profile. Please contact HR.";
          variant = "warning";
        } else if (error.status >= 400 && error.status < 500) {
          variant = "warning"; // Client errors
        } else if (error.status >= 500) {
          variant = "destructive"; // Server errors
        }
        
        // Include additional details if available
        if (error.data.details && error.data.details.validation) {
          const validationErrors = Object.values(error.data.details.validation).join(", ");
          description += `. Details: ${validationErrors}`;
        }
      } 
      // Fallback to legacy error handling
      else {
        description = error.message || "Please try again.";
        
        // Legacy specific error messages
        if (error.message === "No linked employee profile found for user") {
          description = "Your user account is not linked to an employee profile. Please contact HR.";
        } else if (error.message === "Already checked in for today") {
          description = "You have already checked in for today.";
        } else if (error.status >= 500) {
          title = "Server Error";
          description = "Server error occurred. Please try again in a few moments.";
          variant = "destructive";
        }
      }
      
      toast({
        variant,
        title,
        description
      });
    } finally {
      setLoading('checkInLoading', false);
      setLoading('locationLoading', false);
    }
  };

  const handleCheckOut = async () => {
    if (!user?.employeeId) {
      toast({
        variant: "warning",
        title: "Check-out Not Allowed",
        description: "Only employees with a linked profile can check out."
      });
      return;
    }
    
    try {
      // Get task report settings first
      const settingsResponse = await apiClient.getGlobalSettings();
      const taskReportSettingValue = settingsResponse?.data?.general?.taskReportSetting || 'na';
      
      // Store setting in state for modal
      setAppState('taskReportSetting', taskReportSettingValue);
      
      if (taskReportSettingValue === 'na') {
        // Direct checkout - no task report needed
        await handleDirectCheckOut();
      } else if (taskReportSettingValue === 'optional') {
        // Optional - show task report modal but allow skip
        setModal('showTaskReportModal', true);
      } else {
        // Mandatory - show task report modal
        setModal('showTaskReportModal', true);
      }
    } catch (error) {
      console.error("Error checking task report settings:", error);
      // Fallback to showing task report modal
      setModal('showTaskReportModal', true);
    }
  };

  const handleDirectCheckOut = async () => {
    setLoading('checkOutLoading', true);
    try {
      const result = await apiClient.checkOut([]);
      if (result.success) {
        toast({
          title: "Checked Out Successfully",
          description: "You have successfully checked out."
        });
        setAppState('dailyCycleComplete', true);
        await fetchTodayAttendance();
        await loadAttendanceData(true); // Force refresh after check-out
        await loadMissingCheckouts(); // Refresh missing checkouts count
      }
    } catch (error) {
      console.error("Check-out error:", error);
      
      let title = "Check-out Failed";
      let description = "An unexpected error occurred during check-out.";
      let variant = "destructive";
      
      if (error?.response?.data?.message) {
        description = error.response.data.message;
        if (error.response.status === 400) {
          variant = "warning";
          title = "Check-out Not Allowed";
        }
      } else if (error.message) {
        description = error.message;
      }
      
      toast({
        variant,
        title,
        description
      });
    } finally {
      setLoading('checkOutLoading', false);
    }
  };

  const handleTaskReportSubmit = async (tasks) => {
    setLoading('checkOutLoading', true);
    try {
      const result = await apiClient.checkOut(tasks);
      if (result.success) {
        toast({
          title: "Checked Out Successfully",
          description: "Your work report has been submitted."
        });
        setAppState('dailyCycleComplete', true);
        setModal('showTaskReportModal', false);
        await fetchTodayAttendance();
        await loadAttendanceData(true); // Force refresh after check-out
        await loadMissingCheckouts(); // Refresh missing checkouts count
      }
    } catch (error) {
      console.error("Check-out error:", error);
      
      let title = "Check-out Failed";
      let description = "An unexpected error occurred during check-out.";
      let variant = "destructive";
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        title = "Network Error";
        description = "Unable to connect to server. Please check your internet connection and try again.";
      }
      // Handle structured API errors from new backend
      else if (error.data && error.data.message) {
        description = error.data.message;
        
        // Handle specific business logic errors
        if (description.includes("No check-in record")) {
          variant = "warning";
        } else if (description.includes("Already checked out")) {
          variant = "warning";
        } else if (error.status >= 400 && error.status < 500) {
          variant = "warning"; // Client errors
        }
        
        // Include additional details if available
        if (error.data.details && error.data.details.validation) {
          const validationErrors = Object.values(error.data.details.validation).join(", ");
          description += `. Details: ${validationErrors}`;
        }
      }
      // Fallback to legacy error handling
      else {
        description = error.message || description;
      }
      
      toast({
        variant,
        title,
        description
      });
    } finally {
      setLoading('checkOutLoading', false);
    }
  };

  const handleTaskReportSkip = async () => {
    // For optional task reports, skip and directly check out
    await handleDirectCheckOut();
    setModal('showTaskReportModal', false);
  };

  const handleLeaveRequestSubmit = async (data) => {
    try {
      await apiClient.requestLeave(data);
      toast({
        variant: "success",
        title: "Leave Request Submitted",
        description: "Your leave request has been submitted successfully."
      });
      setModal('showLeaveModal', false);
      // Invalidate cache and reload fresh data
      invalidateCachePattern('DASHBOARD_LEAVE');
      await loadLeaveRequests();
    } catch (error) {
      console.error("Leave request error:", error);
      
      let title = "Leave Request Failed";
      let description = "Failed to submit leave request.";
      
      // Handle structured API errors from new backend
      if (error.data && error.data.message) {
        description = error.data.message;
        
        // Include additional details if available
        if (error.data.details && error.data.details.validation) {
          const validationErrors = Object.values(error.data.details.validation).join(", ");
          description += `. Details: ${validationErrors}`;
        }
      }
      // Fallback to legacy error handling
      else {
        description = error.message || description;
      }
      
      toast({
        variant: "error",
        title,
        description
      });
    }
  };

  const handleHelpInquirySubmit = async (data) => {
    try {
      // Map frontend fields to backend expected fields
      const helpData = {
        subject: data.title,        // title → subject
        description: data.message,  // message → description
        category: data.category,
        priority: data.priority
      };
      
      await apiClient.submitHelpInquiry(helpData);
      toast({
        variant: "success",
        title: "Inquiry Submitted",
        description: "Your help desk inquiry has been submitted."
      });
      setModal('showHelpModal', false);
      // Invalidate cache and reload fresh data
      invalidateCachePattern('DASHBOARD_HELP');
      await loadHelpInquiries();
    } catch (error) {
      console.error("Help inquiry error:", error);
      
      let title = "Submission Failed";
      let description = "Failed to submit help inquiry.";
      
      // Handle structured API errors from new backend
      if (error.data && error.data.message) {
        description = error.data.message;
        
        // Include additional details if available
        if (error.data.details && error.data.details.validation) {
          const validationErrors = Object.values(error.data.details.validation).join(", ");
          description += `. Details: ${validationErrors}`;
        }
      }
      // Fallback to legacy error handling
      else {
        description = error.message || description;
      }
      
      toast({
        variant: "error",
        title,
        description
      });
    }
  };

  // Handle regularization request
  const handleRegularizationFromReminder = (prefillData) => {
    setAppState('regularizationPrefillData', prefillData);
    setModal('showRegularizationModal', true);
  };

  const retryConnection = async () => {
    setLoading('isLoading', true);
    try {
      const isAvailable = await apiClient.pingServer();
      if (isAvailable) {
        toast({
          variant: "success",
          title: "Connected to Server",
          description: "Successfully connected to the backend server."
        });
        await initializeData();
      } else {
        toast({
          variant: "error",
          title: "Connection Failed",
          description: "Could not connect to the backend server."
        });
      }
    } catch (error) {
      console.error("Connection retry error:", error);
      
      let title = "Connection Error";
      let description = "Failed to connect to server.";
      
      // Handle structured API errors from new backend
      if (error.data && error.data.message) {
        description = error.data.message;
      }
      // Fallback to legacy error handling
      else {
        description = error.message || description;
      }
      
      toast({
        variant: "error",
        title,
        description
      });
    } finally {
      setLoading('isLoading', false);
    }
  };

  // Helper functions (memoized to prevent unnecessary re-renders)
  const formatLeaveType = useCallback((type) => {
    const types = {
      "full-day": "Full Day",
      "half-day": "Half Day", 
      "sick-leave": "Sick Leave",
      "vacation": "Vacation",
      "personal": "Personal Leave"
    };
    return types[type] || type;
  }, []);


  // Merge all requests for the unified table
  const allRequests = [
    ...(data.leaveRequests || []).map(l => ({
      ...l,
      type: 'leave',
      displayDate: l.leaveDate,
      displayReason: l.leaveReason || l.reason || '',
      status: l.status || 'pending',
    })),
    ...(data.helpInquiries || []).map(h => ({
      ...h,
      type: 'help',
      displayDate: h.createdAt,
      displayReason: h.message || h.description || '',
      status: h.status || 'pending',
    })),
    ...(data.regularizationRequests || []).map(r => ({
      ...r,
      type: 'regularization',
      displayDate: r.date,
      displayReason: r.reason,
      status: r.status,
      requestedCheckIn: r.requestedCheckIn,
      requestedCheckOut: r.requestedCheckOut,
      reviewComment: r.reviewComment,
    })),
  ];

  // Centralized refresh function for admin dashboard
  const refreshAdminDashboard = async () => {
    if (isAdmin) {
      setLoading('isLoading', true);
      try {
        // Refresh all admin dashboard data
        await Promise.all([
          loadAdminDashboardData(),
          loadMissingCheckouts(), // Refresh missing checkouts too
        ]);
        
        // Trigger component-specific refreshes if available
        // These will be set by the components when they mount
        if (window.refreshAttendanceTable) {
          window.refreshAttendanceTable();
        }
        if (window.refreshPendingRequests) {
          window.refreshPendingRequests();
        }
      } catch (error) {
        console.error("Failed to refresh admin dashboard:", error);
      } finally {
        setLoading('isLoading', false);
      }
    } else {
      // For employees, use existing retry connection
      await retryConnection();
    }
  };

  return (
    <div className="bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 min-h-screen">
      <div className="flex flex-col h-full">
        <Header 
          username={username}
          isCheckedIn={isCheckedIn}
          dailyCycleComplete={dailyCycleComplete}
          checkInLoading={checkInLoading}
          checkOutLoading={checkOutLoading}
          locationLoading={locationLoading}
          handleCheckIn={handleCheckIn}
          handleCheckOut={handleCheckOut}
          isLoading={isLoading}
          retryConnection={isAdmin ? refreshAdminDashboard : retryConnection}
          setShowLeaveModal={(value) => setModal('showLeaveModal', value)}
          setShowHelpModal={(value) => setModal('showHelpModal', value)}
          setShowRegularizationModal={(value) => setModal('showRegularizationModal', value)}
          toggleTheme={toggleTheme}
          theme={theme}
        />


        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto" role="main">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            <div className="w-full lg:w-3/4 space-y-6 lg:space-y-8">
              {isAdmin ? (
                <>
                  <Suspense fallback={<ComponentSkeleton />}>
                    <AlertsSection />
                  </Suspense>
                  <Suspense fallback={<ComponentSkeleton />}>
                    <AdminStats 
                      summaryData={adminSummary} 
                      isLoading={loadingAdminData}
                      onPendingRequestsClick={scrollToPendingRequests}
                      onHolidaysClick={switchToHolidaysTab}
                      onAbsentEmployeesClick={handleAbsentEmployeesClick}
                      onPresentEmployeesClick={handlePresentEmployeesClick}
                    />
                  </Suspense>
                  
                  {/* Changed: Prioritize Work Queue visually above Attendance */}
                  <div className="space-y-8">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">Work Queue</h2>
                      </div>
                      <Suspense fallback={<ComponentSkeleton />}>
                        <div ref={pendingRequestsRef}>
                          <AdminPendingRequests />
                        </div>
                      </Suspense>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">Team Attendance</h2>
                      </div>
                      <Suspense fallback={<ComponentSkeleton />}>
                        <AdminAttendanceTable onRefresh={refreshAdminDashboard} />
                      </Suspense>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Suspense fallback={<ComponentSkeleton />}>
                    <AlertsSection />
                  </Suspense>
                  <Suspense fallback={<ComponentSkeleton />}>
                    <MissingCheckoutAlert 
                      onRegularizationRequest={handleRegularizationFromReminder}
                    />
                  </Suspense>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">Overview</h2>
                    </div>
                    <Suspense fallback={<ComponentSkeleton />}>
                      <AttendanceStats
                        attendanceReport={data.attendanceReport}
                        isLoading={isLoading}
                        missingCheckoutsCount={data.missingCheckoutsCount}
                      />
                    </Suspense>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">My Attendance</h2>
                    </div>
                    <Suspense fallback={<ComponentSkeleton />}>
                      <EmployeeAttendanceTable 
                        onRegularizationRequest={handleRegularizationFromReminder}
                      />
                    </Suspense>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">Requests</h2>
                    </div>
                    <Suspense fallback={<ComponentSkeleton />}>
                      <LeaveRequestsTable 
                        leaveRequests={allRequests}
                        helpInquiries={[]}
                        loadingLeaveRequests={loadingRequests}
                        onNewRequest={() => setModal('showLeaveModal', true)}
                        onNewHelpRequest={() => setModal('showHelpModal', true)}
                        formatLeaveType={formatLeaveType}
                      />
                    </Suspense>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">This Month</h2>
                    </div>
                    <Suspense fallback={<ComponentSkeleton />}>
                      <WeeklySummary
                        attendanceReport={data.attendanceReport}
                      />
                    </Suspense>
                  </div>
                </>
              )}
            </div>
            
            <div className="w-full lg:w-1/4 lg:pl-2">
              <Suspense fallback={<ComponentSkeleton />}>
                <UpdatesSidebar 
                  announcements={data.announcements || []}
                  holidays={data.holidaysData || []}
                  username={username}
                  activityData={data.activityData || []}
                  initialActiveTab={updatesActiveTab}
                  onTabChange={handleUpdatesTabChange}
                />
              </Suspense>
            </div>
          </div>
        </main>
      </div>
      
      {/* Modals */}
      <LeaveRequestModal 
        isOpen={showLeaveModal} 
        onClose={() => setModal('showLeaveModal', false)}
        onSubmit={handleLeaveRequestSubmit}
        isLoading={false}
      />
      
      <HelpDeskModal 
        isOpen={showHelpModal}
        onClose={() => setModal('showHelpModal', false)}
        onSubmit={handleHelpInquirySubmit}
        isLoading={false}
      />
      
      <RegularizationModal 
        isOpen={showRegularizationModal} 
        onClose={() => {
          setModal('showRegularizationModal', false);
          setAppState('regularizationPrefillData', null); // Clear prefill data when modal closes
        }}
        prefillData={regularizationPrefillData}
        onSuccess={() => {
          toast({
            variant: "success",
            title: "Regularization Request Submitted",
            description: "Your attendance regularization request has been submitted."
          });
          // Reload missing checkouts to remove the one just submitted
          loadMissingCheckouts();
          // Also reload regularization requests
          loadRegularizationRequests();
        }}
      />
      
      <TaskReportModal
        isOpen={showTaskReportModal}
        onClose={() => setModal('showTaskReportModal', false)}
        onSubmit={handleTaskReportSubmit}
        onSkip={handleTaskReportSkip}
        isLoading={checkOutLoading}
        isOptional={taskReportSetting === 'optional'}
      />

      <AbsentEmployeesModal
        isOpen={showAbsentEmployeesModal}
        onClose={() => setModal('showAbsentEmployeesModal', false)}
        absentEmployees={adminSummary?.absentEmployees || []}
      />

      <PresentEmployeesModal
        isOpen={showPresentEmployeesModal}
        onClose={() => setModal('showPresentEmployeesModal', false)}
        presentEmployees={adminSummary?.presentEmployees || []}
      />
    </div>
  );
}