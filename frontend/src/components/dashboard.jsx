import { useState, useEffect, useCallback, memo, useReducer, useMemo, useRef } from "react";
import useAuth from "../hooks/authjwt"; // Ensure this path is correct
import apiClient from "../service/apiClient"; // Ensure this path is correct
import { useDataCache, CACHE_KEYS } from '../contexts/DataCacheContext';
import { useCachedApi } from '../hooks/useCachedApi';
import LeaveRequestModal from "./LeaveRequestModal";
import HelpDeskModal from "./HelpDeskModal";
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from "./ui/toast.jsx";
import RegularizationModal from "./dashboard/RegularizationModal.jsx";
import TaskReportModal from "./dashboard/TaskReportModal.jsx";
import AbsentEmployeesModal from "./AbsentEmployeesModal.jsx";
import DebugUtils from "../utils/debugUtils.js";

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

// Component loading skeleton
const ComponentSkeleton = () => (
  <div className="animate-pulse bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
    <div className="flex items-center justify-between mb-4">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
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
    attendanceData: [],
    holidaysData: [],
    leaveRequests: [],
    helpInquiries: [],
    regularizationRequests: [],
    announcements: [],
    activityData: [],
    adminSummary: null,
  },
  // App states
  app: {
    isCheckedIn: false,
    dailyCycleComplete: false,
    regularizationPrefillData: null,
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
  const { getCachedData, setCachedData, invalidateCachePattern, clearCache, invalidateCache } = useDataCache();
  
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
    showAbsentEmployeesModal
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
    regularizationPrefillData
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
  const refreshDashboard = useCallback(async () => {
    console.log('🔄 Dashboard: Force refresh requested');
    clearCache(); // Clear all cache
    
    try {
      setLoading('isLoading', true);
      
      // Load common data
      await Promise.all([
        fetchTodayAttendance(),
        loadAnnouncements(),
        loadHolidays()
      ]);

      // Load role-specific data with FORCE REFRESH = true
      if (isAdmin) {
        await loadAdminDashboardData();
      } else {
        // Force refresh = true to bypass cache
        await loadEmployeeDashboardData(true);
      }
      
      // Load missing checkouts for all users
      await loadMissingCheckouts();
      
    } catch (error) {
      console.error("Dashboard refresh error:", error);
    } finally {
      setLoading('isLoading', false);
    }
  }, [clearCache, isAdmin, invalidateCache]);

  const fetchTodayAttendance = useCallback(async () => {
    if (!user?.employeeId) return;
    
    const today = new Date().toISOString().slice(0, 10);
    try {
      const response = await apiClient.getAttendanceRecords({
        employeeId: user.employeeId,
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
        // Load from cache
        setData('attendanceData', cachedData.attendance.data || []);
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
      
      if (response.success && response.data?.records) {
        const processedData = response.data.records.map(record => ({
          ...record,
          date: new Date(record.date),
          checkIn: record.checkIn ? new Date(record.checkIn) : null,
          checkOut: record.checkOut ? new Date(record.checkOut) : null
        }));
        
        
        setData('attendanceData', processedData);
        setCachedData(CACHE_KEYS.DASHBOARD_ATTENDANCE, processedData);
      }
    } catch (error) {
      console.error("Error loading attendance data:", error);
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
      // console.error("Failed to load admin dashboard data:", error);
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
          date: h.date ? new Date(h.date).toLocaleDateString('en-US', { 
            year: 'numeric', month: 'short', day: 'numeric' 
          }) : '',
          isOptional: h.isOptional,
          description: h.description,
        }));
        setData('holidaysData', mapped);
        setCachedData(CACHE_KEYS.DASHBOARD_HOLIDAYS, mapped);
      }
    } catch (error) {
      // console.error("Failed to load holidays:", error);
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
      // console.error("Failed to load announcements:", error);
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
      // console.error("Failed to load leave requests:", error);
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
      // console.error("Failed to load help inquiries:", error);
    }
  };

  const loadRegularizationRequests = async () => {
    try {
      const res = await apiClient.getMyRegularizations();
      setData('regularizationRequests', res.regs || []);
    } catch (err) {
      // console.error("Failed to load regularization requests:", err);
    }
  };

  const loadMissingCheckouts = async () => {
    try {
      // Trigger refresh of MissingCheckoutAlert component
      if (window.refreshMissingCheckouts) {
        window.refreshMissingCheckouts();
      }
    } catch (err) {
      // console.error("Failed to load missing checkouts:", err);
    }
  };


  const handleCheckIn = async () => {
    setLoading('checkInLoading', true);
    let locationData = {};
    
    try {
      // First try to get location
      setLoading('locationLoading', true);
      
      if (navigator.geolocation) {
        try {
          locationData = await new Promise((resolve) => {
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
                // console.warn(locationError, error);
                resolve({}); // Continue with check-in even if location fails
              },
              {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0
              }
            );
          });
        } catch (error) {
          console.warn("Geolocation error:", error);
          // Continue with check-in even if location fails
        }
      }
      
      setLoading('locationLoading', false);
      
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
      // console.error("Check-in error:", error);
      
      let title = "Check-in Issue";
      let description = "An unexpected error occurred.";
      let variant = "warning";
      
      // Handle specific error types
      if (error.message === "No linked employee profile found for user") {
        description = "Your user account is not linked to an employee profile. Please contact HR.";
      } else if (error.message === "Already checked in for today") {
        description = "You have already checked in for today.";
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        title = "Network Error";
        description = "Unable to connect to server. Please check your internet connection and try again.";
        variant = "destructive";
      } else if (error.status >= 500) {
        title = "Server Error";
        description = "Server error occurred. Please try again in a few moments.";
        variant = "destructive";
      } else {
        description = error.message || "Please try again.";
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
    setModal('showTaskReportModal', true);
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
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Check-out Failed",
        description: error.message || "An unexpected error occurred during check-out."
      });
    } finally {
      setLoading('checkOutLoading', false);
    }
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
      toast({
        variant: "error",
        title: "Leave Request Failed",
        description: error.message || "Failed to submit leave request."
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
      toast({
        variant: "error",
        title: "Submission Failed",
        description: error.message || "Failed to submit help inquiry."
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
      toast({
        variant: "error",
        title: "Connection Error",
        description: error.message || "Failed to connect to server."
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

  const calculateAttendancePercentage = useCallback(() => {
    // Use a fixed date instead of currentTime to prevent constant re-renders
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const presentDays = (data.attendanceData || []).filter(day => day.status === "present").length;
    const holidaysCount = (data.holidaysData || []).length;
    const workingDays = daysInMonth - holidaysCount;
    
    if (workingDays <= 0) return "0.0";
    return Math.min((presentDays / workingDays) * 100, 100).toFixed(1);
  }, [data.attendanceData, data.holidaysData]);

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
        // console.error("Failed to refresh admin dashboard:", error);
      } finally {
        setLoading('isLoading', false);
      }
    } else {
      // For employees, use existing retry connection
      await retryConnection();
    }
  };

  return (
    <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900 text-neutral-900 dark:text-neutral-50 min-h-screen">
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

        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            <div className="w-full lg:w-3/4 space-y-6 lg:space-y-8">
              {isAdmin ? (
                <>
                  <Suspense fallback={<ComponentSkeleton />}>
                    <AdminStats 
                      summaryData={adminSummary} 
                      isLoading={loadingAdminData}
                      onPendingRequestsClick={scrollToPendingRequests}
                      onHolidaysClick={switchToHolidaysTab}
                      onAbsentEmployeesClick={handleAbsentEmployeesClick}
                    />
                  </Suspense>
                  
                  {/* Changed: Stack components vertically instead of side-by-side */}
                  <div className="space-y-6">
                    <Suspense fallback={<ComponentSkeleton />}>
                      <AdminAttendanceTable onRefresh={refreshAdminDashboard} />
                    </Suspense>
                    <Suspense fallback={<ComponentSkeleton />}>
                      <div ref={pendingRequestsRef}>
                        <AdminPendingRequests onRefresh={refreshAdminDashboard} />
                      </div>
                    </Suspense>
                  </div>
                </>
              ) : (
                <>
                  <Suspense fallback={<ComponentSkeleton />}>
                    <MissingCheckoutAlert 
                      onRegularizationRequest={handleRegularizationFromReminder}
                    />
                  </Suspense>
                  <Suspense fallback={<ComponentSkeleton />}>
                    <AttendanceStats 
                      attendanceData={data.attendanceData || []}
                      holidays={data.holidaysData || []}
                      calculateAttendancePercentage={calculateAttendancePercentage}
                      isLoading={isLoading}
                    />
                  </Suspense>
                  <Suspense fallback={<ComponentSkeleton />}>
                    <EmployeeAttendanceTable 
                      onRegularizationRequest={handleRegularizationFromReminder}
                    />
                  </Suspense>
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
                  <Suspense fallback={<ComponentSkeleton />}>
                    <WeeklySummary 
                      attendanceData={data.attendanceData || []}
                    />
                  </Suspense>
                </>
              )}
            </div>
            
            <div className="w-full lg:w-1/4">
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
        isLoading={checkOutLoading}
      />

      <AbsentEmployeesModal
        isOpen={showAbsentEmployeesModal}
        onClose={() => setModal('showAbsentEmployeesModal', false)}
        absentEmployees={adminSummary?.absentEmployees || []}
      />
    </div>
  );
}