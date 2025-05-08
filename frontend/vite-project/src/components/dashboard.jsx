import { useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  User, 
  LogOut, 
  HelpCircle, 
  Bell, 
  MessageSquare,
  Paperclip,
  Send,
  X,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

// Mock data - in a real app, you would fetch this from your API
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
  // State for various components
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [leaveType, setLeaveType] = useState("full-day");
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [activeTab, setActiveTab] = useState("announcements");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [inquiryTitle, setInquiryTitle] = useState("");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  // Mock username (would come from JWT in a real app)
  const username = "John Doe"; 

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate attendance statistics
  const currentMonth = currentTime.getMonth();
  const currentYear = currentTime.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  const presentDays = mockAttendanceData.filter(day => day.status === "present").length;
  const absentDays = mockAttendanceData.filter(day => day.status === "absent").length;
  const halfDays = mockAttendanceData.filter(day => day.status === "half-day").length;
  const holidaysCount = holidays.length;

  // Handle check-in/out
  const handleCheckIn = () => {
    setIsCheckedIn(true);
    // In a real app, you would send this to your API
    console.log("Checked in at", new Date().toLocaleTimeString());
  };

  const handleCheckOut = () => {
    setIsCheckedIn(false);
    // In a real app, you would send this to your API
    console.log("Checked out at", new Date().toLocaleTimeString());
  };

  // Handle leave submission
  const handleLeaveSubmit = () => {
    console.log("Leave request submitted:", { leaveType, leaveDate, leaveReason });
    setShowLeaveModal(false);
    // Reset form
    setLeaveType("full-day");
    setLeaveDate("");
    setLeaveReason("");
  };

  // Handle help/inquiry submission
  const handleInquirySubmit = () => {
    console.log("Inquiry submitted:", { 
      title: inquiryTitle, 
      message: inquiryMessage, 
      isAnonymous,
      file: selectedFile 
    });
    setShowHelpModal(false);
    // Reset form
    setInquiryTitle("");
    setInquiryMessage("");
    setIsAnonymous(false);
    setSelectedFile(null);
  };

  // Format date for display
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  // Format time for display
  const formatTime = (date) => {
    if (!date) return "—";
    return new Intl.DateTimeFormat('en-US', { 
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  // Leave request modal
  const LeaveModal = () => {
    if (!showLeaveModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Request Leave</h3>
            <button 
              onClick={() => setShowLeaveModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Leave Type</label>
              <select 
                value={leaveType} 
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full border rounded-md p-2"
              >
                <option value="full-day">Full Day</option>
                <option value="half-day">Half Day</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input 
                type="date" 
                value={leaveDate} 
                onChange={(e) => setLeaveDate(e.target.value)} 
                className="w-full border rounded-md p-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Reason</label>
              <textarea 
                value={leaveReason} 
                onChange={(e) => setLeaveReason(e.target.value)} 
                placeholder="Briefly explain your reason for leave..." 
                className="w-full border rounded-md p-2 h-24"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <button 
              onClick={() => setShowLeaveModal(false)}
              className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleLeaveSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Submit Request
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Help inquiry modal
  const HelpModal = () => {
    if (!showHelpModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Get Help</h3>
            <button 
              onClick={() => setShowHelpModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input 
                value={inquiryTitle} 
                onChange={(e) => setInquiryTitle(e.target.value)} 
                placeholder="Brief subject of your inquiry" 
                className="w-full border rounded-md p-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <textarea 
                value={inquiryMessage} 
                onChange={(e) => setInquiryMessage(e.target.value)} 
                placeholder="How can we help you?" 
                className="w-full border rounded-md p-2 h-24"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Attachment (Optional)</label>
              <input 
                type="file" 
                onChange={(e) => setSelectedFile(e.target.files[0])} 
                className="w-full border rounded-md p-2"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="anonymous-mode"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="anonymous-mode" className="text-sm">
                Submit anonymously
              </label>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <button 
              onClick={() => setShowHelpModal(false)}
              className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleInquirySubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Submit Inquiry
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm flex items-center justify-between p-4">
          <div className="flex items-center">
            <User className="h-5 w-5 text-blue-600 mr-2" />
            <p className="text-sm font-medium">Welcome, <span className="text-blue-600">{username}</span></p>
          </div>
          
          <div className="flex items-center justify-center space-x-2">
            <Clock className="h-5 w-5 text-gray-500" />
            <div className="text-center">
              <p className="text-lg font-semibold">{formatTime(currentTime)}</p>
              <p className="text-xs text-gray-600">{formatDate(currentTime)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleCheckIn} 
              disabled={isCheckedIn}
              className={`px-3 py-1 rounded-md text-sm ${isCheckedIn 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                : 'bg-green-600 text-white hover:bg-green-700'}`}
            >
              Check In
            </button>
            
            <button 
              onClick={handleCheckOut} 
              disabled={!isCheckedIn}
              className={`px-3 py-1 rounded-md text-sm ${!isCheckedIn 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                : 'bg-red-600 text-white hover:bg-red-700'}`}
            >
              Check Out
            </button>
            
            <button 
              onClick={() => setShowLeaveModal(true)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              Request Leave
            </button>
            
            <button 
              onClick={() => setShowHelpModal(true)}
              className="p-1 text-gray-600 hover:text-gray-800"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Main Column */}
            <div className="w-full md:w-3/4 space-y-4">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm font-medium text-gray-500">Days this Month</p>
                  <p className="text-2xl font-bold">{daysInMonth}</p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm font-medium text-gray-500">Present Days</p>
                  <p className="text-2xl font-bold text-green-600">{presentDays}</p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm font-medium text-gray-500">Absent Days</p>
                  <p className="text-2xl font-bold text-red-600">{absentDays}</p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm font-medium text-gray-500">Holidays</p>
                  <p className="text-2xl font-bold text-blue-600">{holidaysCount}</p>
                </div>
              </div>
              
              {/* Attendance Table */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">Attendance History</h2>
                  <p className="text-sm text-gray-500">Your attendance records for this month</p>
                </div>
                <div className="p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="pb-2 font-medium">Date</th>
                          <th className="pb-2 font-medium">Status</th>
                          <th className="pb-2 font-medium">Check In</th>
                          <th className="pb-2 font-medium">Check Out</th>
                          <th className="pb-2 font-medium">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockAttendanceData.map((record, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-3">
                              {new Intl.DateTimeFormat('en-US', { 
                                day: 'numeric',
                                month: 'short',
                                weekday: 'short'
                              }).format(record.date)}
                            </td>
                            <td className="py-3">
                              {record.status === "present" && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                  Present
                                </span>
                              )}
                              {record.status === "absent" && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                                  Absent
                                </span>
                              )}
                              {record.status === "half-day" && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                                  Half Day
                                </span>
                              )}
                            </td>
                            <td className="py-3">{record.checkIn ? formatTime(record.checkIn) : "—"}</td>
                            <td className="py-3">{record.checkOut ? formatTime(record.checkOut) : "—"}</td>
                            <td className="py-3">{record.reason || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Sidebar */}
            <div className="w-full md:w-1/4">
              <div className="bg-white rounded-lg shadow h-full">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">Updates</h2>
                </div>
                
                <div className="p-4">
                  <div className="flex border-b">
                    <button 
                      className={`px-4 py-2 ${activeTab === 'announcements' 
                        ? 'border-b-2 border-blue-600 text-blue-600' 
                        : 'text-gray-500'}`}
                      onClick={() => setActiveTab('announcements')}
                    >
                      News
                    </button>
                    <button 
                      className={`px-4 py-2 ${activeTab === 'holidays' 
                        ? 'border-b-2 border-blue-600 text-blue-600' 
                        : 'text-gray-500'}`}
                      onClick={() => setActiveTab('holidays')}
                    >
                      Holidays
                    </button>
                    <button 
                      className={`px-4 py-2 ${activeTab === 'activity' 
                        ? 'border-b-2 border-blue-600 text-blue-600' 
                        : 'text-gray-500'}`}
                      onClick={() => setActiveTab('activity')}
                    >
                      Activity
                    </button>
                  </div>
                  
                  {activeTab === 'announcements' && (
                    <div className="divide-y">
                      {announcements.map((announcement) => (
                        <div key={announcement.id} className="py-4">
                          <h4 className="font-medium">{announcement.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{announcement.content}</p>
                          <p className="text-xs text-gray-400 mt-2">{announcement.date}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {activeTab === 'holidays' && (
                    <div className="divide-y">
                      {holidays.map((holiday, index) => (
                        <div key={index} className="py-4 flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{holiday.name}</h4>
                            <p className="text-xs text-gray-500">{holiday.date}</p>
                          </div>
                          <Calendar className="h-4 w-4 text-blue-500" />
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {activeTab === 'activity' && (
                    <div className="divide-y">
                      <div className="py-4">
                        <div className="flex items-start gap-2">
                          <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                            JD
                          </div>
                          <div>
                            <p className="text-sm">You checked in at 9:05 AM</p>
                            <p className="text-xs text-gray-500">Today</p>
                          </div>
                        </div>
                      </div>
                      <div className="py-4">
                        <div className="flex items-start gap-2">
                          <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                            JD
                          </div>
                          <div>
                            <p className="text-sm">Your leave request was approved</p>
                            <p className="text-xs text-gray-500">Yesterday</p>
                          </div>
                        </div>
                      </div>
                      <div className="py-4">
                        <div className="flex items-start gap-2">
                          <div className="bg-green-100 text-green-800 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                            HR
                          </div>
                          <div>
                            <p className="text-sm">HR updated company policy</p>
                            <p className="text-xs text-gray-500">2 days ago</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="border-t p-4">
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                    <div className="flex items-center">
                      <Bell className="h-4 w-4 text-blue-500 mr-2" />
                      <h3 className="font-medium text-blue-800">Meeting Reminder</h3>
                    </div>
                    <p className="text-sm text-blue-600 mt-1">Team standup at 10:00 AM today</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      
      {/* Modals */}
      <LeaveModal />
      <HelpModal />
    </div>
  );
}