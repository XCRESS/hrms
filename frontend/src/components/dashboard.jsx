import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  User,
  LogOut,
  HelpCircle,
  Bell,
  Paperclip,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  Moon,
  Sun,
  ChevronDown,
  UploadCloud
} from "lucide-react";
import useAuth from "../hooks/authjwt"; // Ensure this path is correct
import apiClient from "../service/apiClient"; // Ensure this path is correct
import LeaveRequestModal from "./LeaveRequestModal";
import HelpDeskModal from "./HelpDeskModal";
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from "./ui/toast.jsx";
import RegularizationModal from "./dashboard/RegularizationModal.jsx";
import TaskReportModal from "./dashboard/TaskReportModal.jsx";

// Import dashboard components from their subdirectory
import Header from './dashboard/Header';
import AttendanceStats from './dashboard/AttendanceStats';
import AttendanceTable from './dashboard/AttendanceTable'; 
import EmployeeAttendanceTable from './dashboard/EmployeeAttendanceTable';
import LeaveRequestsTable from './dashboard/LeaveRequestsTable';
import WeeklySummary from './dashboard/WeeklySummary';
import UpdatesSidebar from './dashboard/UpdatesSidebar';
import AdminStats from './dashboard/AdminStats'; // Import AdminStats
import AdminAttendanceTable from './dashboard/AdminAttendanceTable';
import AdminPendingRequests from './dashboard/AdminPendingRequests';
import MissingCheckoutAlert from './dashboard/MissingCheckoutAlert';



export default function HRMSDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showRegularizationModal, setShowRegularizationModal] = useState(false);
  const [showTaskReportModal, setShowTaskReportModal] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkOutLoading, setCheckOutLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [holidaysData, setHolidaysData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyCycleComplete, setDailyCycleComplete] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [helpInquiries, setHelpInquiries] = useState([]);
  const [regularizationRequests, setRegularizationRequests] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [adminSummary, setAdminSummary] = useState(null);
  const [loadingAdminData, setLoadingAdminData] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  
  const [regularizationPrefillData, setRegularizationPrefillData] = useState(null);

  const user = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const username = user?.name || "User";
  const isAdmin = user?.role === 'admin' || user?.role === 'hr';

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize data on mount
  useEffect(() => {
    if (!user) return;
    initializeData();
  }, [user]);

  const initializeData = async () => {
    try {
      setIsLoading(true);
      
      // Load common data
      await Promise.all([
        fetchTodayAttendance(),
        loadAnnouncements(),
        loadHolidays()
      ]);

      // Load role-specific data
      if (isAdmin) {
        await loadAdminDashboardData();
      } else {
        await loadEmployeeDashboardData();
      }
      
      // Load missing checkouts for all users (admin/HR can also have missing checkouts)
      await loadMissingCheckouts();
    } catch (error) {
      console.error("Initialization failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
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
        setIsCheckedIn(!!record.checkIn && !record.checkOut);
        setDailyCycleComplete(!!record.checkIn && !!record.checkOut);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const loadEmployeeDashboardData = async () => {
    setLoadingRequests(true);
    await Promise.all([
      loadAttendanceData(),
      loadLeaveRequests(),
      loadHelpInquiries(),
      loadRegularizationRequests()
    ]);
    setLoadingRequests(false);
  };

  const loadAttendanceData = async () => {
    try {
      if (!user?.employeeId) return;
      
      // Get current month data with holidays for charts
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];
      
      const response = await apiClient.getEmployeeAttendanceWithAbsents({
        employeeId: user.employeeId,
        startDate: startDate,
        endDate: endDate
      });
      
      if (response.success && response.data?.records) {
        setAttendanceData(response.data.records.map(record => ({
          ...record,
          date: new Date(record.date),
          checkIn: record.checkIn ? new Date(record.checkIn) : null,
          checkOut: record.checkOut ? new Date(record.checkOut) : null
        })));
      }
    } catch (error) {
      console.error("Failed to load attendance data:", error);
    }
  };

  const loadAdminDashboardData = async () => {
    setLoadingAdminData(true);
    try {
      const summaryRes = await apiClient.getAdminDashboardSummary();
      if (summaryRes.success) {
        setAdminSummary(summaryRes.data);
      }
    } catch (error) {
      console.error("Failed to load admin dashboard data:", error);
    } finally {
      setLoadingAdminData(false);
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
        setHolidaysData(mapped);
      }
    } catch (error) {
      console.error("Failed to load holidays:", error);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const response = await apiClient.getAnnouncements();
      const anns = response.announcements || response.data?.announcements || response.data;
      setAnnouncements(Array.isArray(anns) ? anns : []);
    } catch (error) {
      console.error("Failed to load announcements:", error);
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
        setLeaveRequests(formattedLeaves);
      }
    } catch (error) {
      console.error("Failed to load leave requests:", error);
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
        setHelpInquiries(formattedInquiries);
      }
    } catch (error) {
      console.error("Failed to load help inquiries:", error);
    }
  };

  const loadRegularizationRequests = async () => {
    try {
      const res = await apiClient.getMyRegularizations();
      setRegularizationRequests(res.regs || []);
    } catch (err) {
      console.error("Failed to load regularization requests:", err);
    }
  };

  const loadMissingCheckouts = async () => {
    try {
      // Trigger refresh of MissingCheckoutAlert component
      if (window.refreshMissingCheckouts) {
        window.refreshMissingCheckouts();
      }
    } catch (err) {
      console.error("Failed to load missing checkouts:", err);
    }
  };


  const handleCheckIn = async () => {
    setCheckInLoading(true);
    let locationData = {};
    
    try {
      // First try to get location
      setLocationLoading(true);
      
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
                console.warn(locationError, error);
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
      
      setLocationLoading(false);
      
      // Proceed with check-in
      const response = await apiClient.checkIn(locationData);
      if (response.success) {
        toast({
          variant: "success",
          title: "Checked In",
          description: "You have successfully checked in for today."
        });
        await fetchTodayAttendance();
        await loadAttendanceData();
      }
    } catch (error) {
      console.error("Check-in error:", error);
      
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
      setCheckInLoading(false);
      setLocationLoading(false);
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
    setShowTaskReportModal(true);
  };

  const handleTaskReportSubmit = async (tasks) => {
    setCheckOutLoading(true);
    try {
      const result = await apiClient.checkOut(tasks);
      if (result.success) {
        toast({
          title: "Checked Out Successfully",
          description: "Your work report has been submitted."
        });
        setDailyCycleComplete(true);
        setShowTaskReportModal(false);
        await fetchTodayAttendance();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Check-out Failed",
        description: error.message || "An unexpected error occurred during check-out."
      });
    } finally {
      setCheckOutLoading(false);
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
      setShowLeaveModal(false);
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
      setShowHelpModal(false);
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
    setRegularizationPrefillData(prefillData);
    setShowRegularizationModal(true);
  };

  const retryConnection = async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  // Helper functions
  const formatDate = (date) => new Intl.DateTimeFormat('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  }).format(date);
  
  const formatTime = (date) => date ? new Intl.DateTimeFormat('en-US', { 
    hour: '2-digit', minute: '2-digit', hour12: true 
  }).format(date) : "—";

  const formatLeaveType = (type) => {
    const types = {
      "full-day": "Full Day",
      "half-day": "Half Day", 
      "sick-leave": "Sick Leave",
      "vacation": "Vacation",
      "personal": "Personal Leave"
    };
    return types[type] || type;
  };

  const calculateAttendancePercentage = () => {
    const currentMonth = currentTime.getMonth();
    const currentYear = currentTime.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const presentDays = attendanceData.filter(day => day.status === "present").length;
    const holidaysCount = holidaysData.length;
    const workingDays = daysInMonth - holidaysCount;
    
    if (workingDays <= 0) return "0.0";
    return Math.min((presentDays / workingDays) * 100, 100).toFixed(1);
  };

  // Merge all requests for the unified table
  const allRequests = [
    ...(leaveRequests || []).map(l => ({
      ...l,
      type: 'leave',
      displayDate: l.leaveDate,
      displayReason: l.leaveReason || l.reason || '',
      status: l.status || 'pending',
    })),
    ...(helpInquiries || []).map(h => ({
      ...h,
      type: 'help',
      displayDate: h.createdAt,
      displayReason: h.message || h.description || '',
      status: h.status || 'pending',
    })),
    ...(regularizationRequests || []).map(r => ({
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
      setIsLoading(true);
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
        setIsLoading(false);
      }
    } else {
      // For employees, use existing retry connection
      await retryConnection();
    }
  };

  return (
    <div className="flex bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900 text-neutral-900 dark:text-neutral-50">
      <div className="flex-1 flex flex-col">
        <Header 
          username={username}
          currentTime={currentTime}
          formatDate={formatDate}
          formatTime={formatTime}
          isCheckedIn={isCheckedIn}
          dailyCycleComplete={dailyCycleComplete}
          checkInLoading={checkInLoading}
          checkOutLoading={checkOutLoading}
          locationLoading={locationLoading}
          handleCheckIn={handleCheckIn}
          handleCheckOut={handleCheckOut}
          isLoading={isLoading}
          retryConnection={isAdmin ? refreshAdminDashboard : retryConnection}
          setShowLeaveModal={setShowLeaveModal}
          setShowHelpModal={setShowHelpModal}
          toggleTheme={toggleTheme}
          theme={theme}
        />

        {/* Regularization Button */}
        <div className="mx-4 mt-4 flex justify-end">
          <button
            className="px-3 py-2 sm:px-4 sm:py-2 bg-cyan-600 text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-cyan-700 transition-colors"
            onClick={() => setShowRegularizationModal(true)}
          >
            <span className="hidden sm:inline">Regularize Attendance</span>
            <span className="sm:hidden">Regularize</span>
          </button>
        </div>
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            <div className="w-full lg:w-3/4 space-y-6 lg:space-y-8">
              {isAdmin ? (
                <>
                  <AdminStats summaryData={adminSummary} isLoading={loadingAdminData} />
                  
                  {/* Changed: Stack components vertically instead of side-by-side */}
                  <div className="space-y-6">
                    <AdminAttendanceTable onRefresh={refreshAdminDashboard} />
                    <AdminPendingRequests onRefresh={refreshAdminDashboard} />
                  </div>
                </>
              ) : (
                <>
                  <MissingCheckoutAlert 
                    onRegularizationRequest={handleRegularizationFromReminder}
                  />
                  <AttendanceStats 
                    attendanceData={attendanceData}
                    holidays={holidaysData}
                    formatTime={formatTime}
                    calculateAttendancePercentage={calculateAttendancePercentage}
                    isLoading={isLoading}
                  />
                  <EmployeeAttendanceTable 
                    onRegularizationRequest={handleRegularizationFromReminder}
                  />
                  <LeaveRequestsTable 
                    leaveRequests={allRequests}
                    helpInquiries={[]}
                    loadingLeaveRequests={loadingRequests}
                    onNewRequest={() => setShowLeaveModal(true)}
                    onNewHelpRequest={() => setShowHelpModal(true)}
                    formatLeaveType={formatLeaveType}
                  />
                  <WeeklySummary 
                    attendanceData={attendanceData}
                  />
                </>
              )}
            </div>
            
            <div className="w-full lg:w-1/4">
              <UpdatesSidebar 
                announcements={announcements}
                holidays={holidaysData}
                username={username}
                activityData={activityData}
              />
            </div>
          </div>
        </main>
      </div>
      
      {/* Modals */}
      <LeaveRequestModal 
        isOpen={showLeaveModal} 
        onClose={() => setShowLeaveModal(false)}
        onSubmit={handleLeaveRequestSubmit}
        isLoading={false}
      />
      
      <HelpDeskModal 
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        onSubmit={handleHelpInquirySubmit}
        isLoading={false}
      />
      
      <RegularizationModal 
        isOpen={showRegularizationModal} 
        onClose={() => {
          setShowRegularizationModal(false);
          setRegularizationPrefillData(null); // Clear prefill data when modal closes
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
        onClose={() => setShowTaskReportModal(false)}
        onSubmit={handleTaskReportSubmit}
        isLoading={checkOutLoading}
      />
    </div>
  );
}