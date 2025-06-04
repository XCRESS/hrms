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
import RegularizationModal from "./dashboard/RegularizationModal";

// Import dashboard components from their subdirectory
import Header from './dashboard/Header';
import ActionButtons from './dashboard/ActionButtons';
import AttendanceStats from './dashboard/AttendanceStats';
import AttendanceTable from './dashboard/AttendanceTable'; 
import LeaveRequestsTable from './dashboard/LeaveRequestsTable';
import WeeklySummary from './dashboard/WeeklySummary';
import UpdatesSidebar from './dashboard/UpdatesSidebar';

// Mock data for initial rendering only - will be replaced with real data from API
const mockAttendanceData = [
  { status: "present", date: new Date(2025, 4, 6), checkIn: new Date(2025, 4, 6, 9, 5), checkOut: new Date(2025, 4, 6, 17, 30), reason: "" },
  { status: "present", date: new Date(2025, 4, 5), checkIn: new Date(2025, 4, 5, 8, 55), checkOut: new Date(2025, 4, 5, 18, 0), reason: "" },
  { status: "half-day", date: new Date(2025, 4, 4), checkIn: new Date(2025, 4, 4, 9, 0), checkOut: new Date(2025, 4, 4, 13, 0), reason: "Doctor's appointment" },
  { status: "absent", date: new Date(2025, 4, 3), checkIn: null, checkOut: null, reason: "Sick leave" },
  { status: "present", date: new Date(2025, 4, 2), checkIn: new Date(2025, 4, 2, 9, 10), checkOut: new Date(2025, 4, 2, 17, 45), reason: "" },
];
const announcements = [
  { id: 1, title: "Company Picnic", content: "Annual company picnic scheduled for May 20th", date: "May 3, 2025" },
  { id: 2, title: "New Policy Update", content: "Updated remote work policy available on the intranet", date: "May 1, 2025" },
  { id: 3, title: "System Maintenance", content: "HRMS will be under maintenance on May 10th from 10PM-2AM", date: "Apr 29, 2025" },
];
const holidays = [
  { date: "May 12, 2025", name: "Company Foundation Day" },
  { date: "May 27, 2025", name: "Memorial Day" },
];

export default function HRMSDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkOutLoading, setCheckOutLoading] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [helpLoading, setHelpLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("announcements");
  const [attendanceData, setAttendanceData] = useState([]);
  const [holidaysData, setHolidaysData] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Track initial loading state
  const [dailyCycleComplete, setDailyCycleComplete] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [helpInquiries, setHelpInquiries] = useState([]); // Add state for help inquiries
  const [loadingLeaveRequests, setLoadingLeaveRequests] = useState(false);
  const [loadingHelpInquiries, setLoadingHelpInquiries] = useState(false); // Add loading state for help inquiries
  const [showRegularizationModal, setShowRegularizationModal] = useState(false);
  const [regularizationRequests, setRegularizationRequests] = useState([]);
  const user = useAuth();
  const username = user?.name || "User";
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  // Initialize and load data
  useEffect(() => {
    async function initializeData() {
      try {
        setIsLoading(true);
        
        // Try to connect to the server
        const isServerAvailable = await apiClient.pingServer();
        
        if (!isServerAvailable) {
          toast({
            id: "server-unavailable",
            variant: "error",
            title: "Server Unavailable",
            description: "Cannot connect to the server. Please try again later."
          });
        } else {
          // Server is available, proceed with initialization
          console.log("Server available, loading data");
        }
      } catch (error) {
        console.error("Initialization failed:", error);
        toast({
          id: "init-error",
          variant: "error",
          title: "Initialization Error",
          description: "Failed to initialize the application."
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    initializeData();
  }, [toast]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load data when initialization is complete
  useEffect(() => {
    if (isLoading) return;
    // Fetch backend-driven attendance state
    fetchTodayAttendance();
    // Load other data from API
    console.log("Initial data loading - attempting to connect to backend database");
    const loadAllData = async () => {
      try {
        await Promise.all([
          loadAttendanceData(),
          loadHolidays(),
          loadLeaveRequests(),
          loadHelpInquiries(),
          loadRegularizationRequests(),
        ]);
        console.log("Initial data loading complete");
      } catch (error) {
        console.error("Error during initial data loading:", error);
        // Individual load functions will handle their own errors
      }
    };
    loadAllData();
  }, [isLoading]);

  const loadAttendanceData = async () => {
    try {
      // API call for attendance data
      let params = { limit: 10 };
      if (user && user.employeeId) {
        params.employeeId = user.employeeId;
      }
      const response = await apiClient.getAttendanceRecords(params);
      if (response.success && response.data && response.data.records && response.data.records.length > 0) {
        setAttendanceData(response.data.records.map(record => ({
          ...record,
          date: new Date(record.date),
          checkIn: record.checkIn ? new Date(record.checkIn) : null,
          checkOut: record.checkOut ? new Date(record.checkOut) : null
        })));
      } else {
        setAttendanceData([]);
        toast({
          id: "attendance-empty-" + new Date().getTime(),
          variant: "warning",
          title: "No Attendance Records",
          description: "No attendance records found"
        });
      }
    } catch (error) {
      console.error("Failed to load attendance data:", error);
      if (error.status === 401 || error.status === 403) {
        toast({
          id: "auth-error-attendance",
          variant: "warning",
          title: "Authentication Error",
          description: "Please log in again to access your data"
        });
      } else {
        toast({
          id: "attendance-error-fetch",
          variant: "error",
          title: "Failed to Fetch Data",
          description: "Could not load attendance records"
        });
      }
      setAttendanceData([]);
    }
  };
  
  const loadHolidays = async () => {
    try {
      // API call for holidays
      const response = await apiClient.getHolidays();
      if (response.success && response.data && response.data.holidays && response.data.holidays.length > 0) {
        setHolidaysData(response.data.holidays);
      } else {
        // If no data is returned, use initial empty state
        setHolidaysData([]);
      }
    } catch (error) {
      console.error("Failed to load holidays:", error);
      
      // Show error only if it's not an authentication error (which is already shown)
      if (error.status !== 401 && error.status !== 403) {
        toast({
          id: "holidays-error",
          variant: "warning",
          title: "Failed to Load Holidays",
          description: "Could not load holiday data"
        });
      }
      
      // Set empty array if error
      setHolidaysData([]);
    }
  };

  const loadLeaveRequests = async () => {
    try {
      setLoadingLeaveRequests(true);
      console.log("Loading leave requests");
      
      // Attempt to fetch leave requests from the database
      try {
        console.log("Attempting to fetch leave requests from database");
        const response = await apiClient.getMyLeaves();
        console.log("Leave API response:", response);
        
        // Check for different response structures (leaves vs data field)
        const leavesData = response.leaves || (response.data ? response.data.leaves || response.data : null);
        
        if (response && response.success && leavesData) {
          console.log("SUCCESS: Received leave data from API:", leavesData);
          
          // Format dates from string to Date objects
          const formattedLeaves = leavesData.map(leave => ({
            ...leave,
            leaveDate: new Date(leave.leaveDate || leave.date || Date.now()),
            createdAt: new Date(leave.createdAt || leave.created_at || leave.requestDate || Date.now())
          }));
          
          // Use the data from the server
          setLeaveRequests(formattedLeaves);
        } else {
          console.warn("API response was successful but lacks expected data structure:", response);
          // Set empty array
          setLeaveRequests([]);
        }
      } catch (error) {
        console.error("Error fetching leaves from API:", error, "Status:", error.status);
        
        // Show appropriate error message
        if (error.status === 401 || error.status === 403) {
          console.warn("Authentication error");
          
          // Special case for missing employee ID
          if (error.message && error.message.includes("Employee ID missing")) {
            toast({
              id: "missing-employee-id-leave",
              variant: "warning",
              title: "Profile Incomplete",
              description: "Your employee profile is incomplete. Please contact HR to update your profile."
            });
          } else {
            toast({
              id: "auth-error-leave",
              variant: "warning",
              title: "Authentication Issue",
              description: "Please log in again to access your data"
            });
          }
        } else {
          console.warn("Failed to fetch leave data");
          toast({
            id: "server-error-leave",
            variant: "error",
            title: "Connection Failed",
            description: "Could not connect to the server. Please try again later."
          });
        }
        
        // Set empty array
        setLeaveRequests([]);
      }
    } catch (error) {
      console.error("Critical error loading leave requests:", error);
      // Set empty array
      setLeaveRequests([]);
    } finally {
      setLoadingLeaveRequests(false);
    }
  };

  const loadHelpInquiries = async () => {
    try {
      setLoadingHelpInquiries(true);
      console.log("Loading help inquiries");
      
      // Attempt to fetch help inquiries from database
      try {
        console.log("Attempting to fetch help inquiries from database");
        const response = await apiClient.getMyInquiries();
        console.log("Help API response:", response);
        
        // Check for different response structures (data vs inquiries field)
        const inquiriesData = response.inquiries || (response.data ? response.data.inquiries || response.data : null);
        
        if (response && response.success && inquiriesData) {
          console.log("SUCCESS: Received help data from API:", inquiriesData);
          
          // Format dates from string to Date objects
          const formattedInquiries = inquiriesData.map(inquiry => ({
            ...inquiry,
            createdAt: new Date(inquiry.createdAt || inquiry.created_at || inquiry.date || Date.now())
          }));
          
          // Use the data from the server
          setHelpInquiries(formattedInquiries);
        } else {
          console.warn("API response was successful but lacks expected data structure:", response);
          // Set empty array
          setHelpInquiries([]);
        }
      } catch (error) {
        console.error("Error fetching help inquiries from API:", error, "Status:", error.status);
        
        // Show appropriate error message
        if (error.status === 401 || error.status === 403) {
          console.warn("Authentication error");
          
          // Special case for missing employee ID
          if (error.message && error.message.includes("Employee ID missing")) {
            toast({
              id: "missing-employee-id-help",
              variant: "warning",
              title: "Profile Incomplete",
              description: "Your employee profile is incomplete. Please contact HR to update your profile."
            });
          } else {
            toast({
              id: "auth-error-help",
              variant: "warning",
              title: "Authentication Issue",
              description: "Please log in again to access your data"
            });
          }
        } else {
          console.warn("Failed to fetch help data");
          toast({
            id: "server-error-help",
            variant: "error", 
            title: "Connection Failed",
            description: "Could not connect to the server. Please try again later."
          });
        }
        
        // Set empty array
        setHelpInquiries([]);
      }
    } catch (error) {
      console.error("Critical error loading help inquiries:", error);
      // Set empty array
      setHelpInquiries([]);
    } finally {
      setLoadingHelpInquiries(false);
    }
  };

  const loadRegularizationRequests = async () => {
    try {
      const res = await apiClient.getMyRegularizations();
      setRegularizationRequests(res.regs || []);
    } catch (err) {
      setRegularizationRequests([]);
    }
  };

  // Helper to fetch today's attendance and set check-in/out state
  const fetchTodayAttendance = async () => {
    if (!user?.employeeId) {
      setIsCheckedIn(false);
      setDailyCycleComplete(false);
      console.log('No user or employeeId');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    try {
      const response = await apiClient.getAttendanceRecords({
        employeeId: user.employeeId,
        startDate: today,
        endDate: today,
        limit: 1,
      });
      if (response.success && response.data && response.data.records && response.data.records.length > 0) {
        const record = response.data.records[0];
        console.log('Attendance record:', record);
        setIsCheckedIn(!!record.checkIn && !record.checkOut);
        setDailyCycleComplete(!!record.checkIn && !!record.checkOut);
        console.log('Set isCheckedIn:', !!record.checkIn && !record.checkOut, 'Set dailyCycleComplete:', !!record.checkIn && !!record.checkOut);
      } else {
        setIsCheckedIn(false);
        setDailyCycleComplete(false);
        console.log('No attendance record for today');
      }
    } catch (error) {
      setIsCheckedIn(false);
      setDailyCycleComplete(false);
      console.log('Error fetching attendance:', error);
    }
  };

  // Update handleCheckIn to refresh backend state and log
  const handleCheckIn = async () => {
    try {
      setCheckInLoading(true);
      try {
        const response = await apiClient.checkIn();
        if (response.success) {
          toast({
            id: "checkin-success-" + new Date().getTime(),
            variant: "success",
            title: "Checked In",
            description: "You have successfully checked in for today."
          });
          await fetchTodayAttendance();
          loadAttendanceData();
        }
      } catch (apiError) {
        let description = apiError.message || "You have already checked in for today.";
        if (apiError.message === "No linked employee profile found for user") {
          description = "Your user account is not linked to an employee profile. Please contact HR.";
        }
        toast({
          id: "checkin-validation-" + new Date().getTime(),
          variant: "warning",
          title: "Check-in Issue",
          description
        });
        await fetchTodayAttendance();
      }
    } catch (error) {
      toast({
        id: "checkin-critical-error-" + new Date().getTime(),
        variant: "error",
        title: "Check-in Error",
        description: "An unexpected error occurred."
      });
    } finally {
      setCheckInLoading(false);
    }
  };

  // Update handleCheckOut to refresh backend state and log
  const handleCheckOut = async () => {
    if (!canCheckInOut) {
      toast({
        id: "checkout-not-allowed-" + new Date().getTime(),
        variant: "warning",
        title: "Check-out Not Allowed",
        description: "Only employees with a linked profile can check out."
      });
      return;
    }
    try {
      setCheckOutLoading(true);
      try {
        const response = await apiClient.checkOut();
        if (response.success) {
          toast({
            id: "checkout-success-" + new Date().getTime(),
            variant: "success",
            title: "Checked Out",
            description: "You have successfully checked out for today."
          });
          await fetchTodayAttendance();
          loadAttendanceData();
        } else {
          toast({
            id: "checkout-api-fail-" + new Date().getTime(),
            variant: "warning",
            title: "Check-out Issue",
            description: response.message || "Could not complete check-out."
          });
        }
      } catch (apiError) {
        let description = apiError.message || "There was an issue with your check-out.";
        if (apiError.message === "No linked employee profile found for user") {
          description = "Your user account is not linked to an employee profile. Please contact HR.";
        }
        if (apiError.message === "No check-in record found for today") {
          toast({
            id: "checkout-validation-no-checkin-" + new Date().getTime(),
            variant: "warning",
            title: "Not Checked In",
            description
          });
        } else if (apiError.message === "Already checked out for today") {
          toast({
            id: "checkout-validation-already-out-" + new Date().getTime(),
            variant: "warning",
            title: "Already Checked Out",
            description
          });
        } else {
          toast({
            id: "checkout-api-error-" + new Date().getTime(),
            variant: "error",
            title: "Check-out Failed",
            description
          });
        }
        await fetchTodayAttendance();
      }
    } catch (error) {
      toast({
        id: "checkout-critical-error-" + new Date().getTime(),
        variant: "error",
        title: "Check-out Error",
        description: "An unexpected error occurred."
      });
    } finally {
      setCheckOutLoading(false);
    }
  };

  const handleLeaveRequestSubmit = async (data) => {
    try {
      setLeaveLoading(true);
      
      const response = await apiClient.requestLeave(data);
      
      console.log("Leave request submitted:", response);
      
      toast({
        id: "leave-success-" + new Date().getTime(),
        variant: "success",
        title: "Leave Request Submitted",
        description: "Your leave request has been submitted successfully."
      });
      
      // Refresh leave requests to show the new one
      loadLeaveRequests();
      
      setShowLeaveModal(false);
    } catch (error) {
      console.error("Leave request failed:", error);
      
      toast({
        id: "leave-error-" + new Date().getTime(),
        variant: "error",
        title: "Leave Request Failed",
        description: error.message || "Failed to submit leave request. Please try again."
      });
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleHelpInquirySubmit = async (data) => {
    try {
      setHelpLoading(true);
      
      // Submit inquiry via API
      const inquiryData = {
        title: data.title,
        message: data.message,
        category: data.category || "technical",
        priority: data.priority || "medium"
      };
      
      const response = await apiClient.submitHelpInquiry(inquiryData);
      
      // Load updated help inquiries
      loadHelpInquiries();
      
      toast({
        id: "help-success-" + new Date().getTime(),
        variant: "success",
        title: "Inquiry Submitted",
        description: "Your help desk inquiry has been successfully submitted."
      });
      
      // Close modal after submission
      setShowHelpModal(false);
    } catch (error) {
      console.error("Help inquiry submission failed:", error);
      
      toast({
        id: "help-error-submit-" + new Date().getTime(),
        variant: "error",
        title: "Submission Failed",
        description: error.message || "Failed to submit help inquiry. Please try again."
      });
    } finally {
      setHelpLoading(false);
    }
  };

  const retryConnection = async () => {
    try {
      setIsLoading(true);
      
      // Check if the backend server is available
      const isAvailable = await apiClient.pingServer();
      
      if (isAvailable) {
        toast({
          id: "server-reconnected-" + Date.now(),
          variant: "success",
          title: "Connected to Server",
          description: "Successfully connected to the backend server."
        });
        
        // Clear out old data
        setLeaveRequests([]);
        setHelpInquiries([]);
        
        // Reload all data after successful connection
        await Promise.all([
          loadAttendanceData(),
          loadHolidays(),
          loadLeaveRequests(),
          loadHelpInquiries()
        ]);
        
        console.log("Data refreshed from the server successfully");
      } else {
        toast({
          id: "server-unavailable-" + Date.now(),
          variant: "error",
          title: "Connection Failed",
          description: "Could not connect to the backend server."
        });
        
        // Clear any existing data since we can't connect
        setLeaveRequests([]);
        setHelpInquiries([]);
      }
    } catch (error) {
      console.error("Server retry connection failed:", error);
      toast({
        id: "server-error-" + Date.now(),
        variant: "error",
        title: "Connection Error",
        description: error.message || "Failed to connect to server."
      });
      
      // Clear any existing data
      setLeaveRequests([]);
      setHelpInquiries([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date) => new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  const formatTime = (date) => date ? new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(date) : "—";

  const currentMonth = currentTime.getMonth();
  const currentYear = currentTime.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  const presentDays = attendanceData.filter(day => day.status === "present").length;
  const absentDays = attendanceData.filter(day => day.status === "absent").length;
  const halfDays = attendanceData.filter(day => day.status === "half-day").length;
  const holidaysCount = holidaysData.length;

  const calculateAttendancePercentage = () => {
    const workingDays = daysInMonth - holidaysCount;
    if (workingDays <= 0) return "0.0";
    return Math.min((presentDays / workingDays) * 100, 100).toFixed(1);
  };

  // Add the leave type formatter helper function
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

  // Only show check-in/out for users with a linked employee profile
  const canCheckInOut = user && (user.employee || user.employeeId);

  // Merge all requests for the LeaveRequestsTable
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

  return (
    <div className={`flex w-full min-h-screen bg-gray-100 dark:bg-slate-900 transition-colors duration-300`}>
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
          handleCheckIn={handleCheckIn}
          handleCheckOut={handleCheckOut}
          isLoading={isLoading}
          retryConnection={retryConnection}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        <div className="ml-auto mr-4 mt-4 flex gap-2">
          {user && (user.role === "employee" || user.role === "hr" || user.role === "admin") && (
            <button
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors order-1"
              onClick={() => setShowRegularizationModal(true)}
            >
              Regularize Attendance
            </button>
          )}
          <ActionButtons 
            setShowLeaveModal={setShowLeaveModal}
            setShowHelpModal={setShowHelpModal}
          />
        </div>
        
        <main className="flex-1 p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            <div className="w-full lg:w-3/4 space-y-4 lg:space-y-6">
              <AttendanceStats 
                attendanceData={attendanceData}
                holidays={holidaysData}
                formatTime={formatTime}
                calculateAttendancePercentage={calculateAttendancePercentage}
              />
              
              <AttendanceTable 
                attendanceData={attendanceData}
                formatTime={formatTime}
              />
              
              <LeaveRequestsTable 
                leaveRequests={allRequests}
                helpInquiries={[]}
                loadingLeaveRequests={loadingLeaveRequests || loadingHelpInquiries}
                onNewRequest={() => setShowLeaveModal(true)}
                onNewHelpRequest={() => setShowHelpModal(true)}
                formatLeaveType={formatLeaveType}
              />
              
              <WeeklySummary 
                attendanceData={attendanceData}
              />
            </div>
            
            <div className="w-full lg:w-1/4">
              <UpdatesSidebar 
                announcements={announcements}
                holidays={holidaysData}
                username={username}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            </div>
          </div>
        </main>
      </div>
      
      <LeaveRequestModal 
        isOpen={showLeaveModal} 
        onClose={() => setShowLeaveModal(false)}
        onSubmit={handleLeaveRequestSubmit} 
        isLoading={leaveLoading}
      />
      <HelpDeskModal 
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        onSubmit={handleHelpInquirySubmit}
        isLoading={helpLoading}
      />
      <RegularizationModal 
        isOpen={showRegularizationModal} 
        onClose={() => setShowRegularizationModal(false)}
        onSuccess={() => toast({
          id: "regularization-success-" + new Date().getTime(),
          variant: "success",
          title: "Regularization Request Submitted",
          description: "Your attendance regularization request has been submitted."
        })}
      />
    </div>
  );
}