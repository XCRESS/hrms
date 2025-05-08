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

// Mock data (remains the same)
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

const DARK_MODE_KEY = 'hrms_dark_theme_professional_v2'; // Updated key for the new theme

const applyDarkModeToDocument = (isDark) => {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// --- Leave Request Modal ---
const LeaveRequestModal = ({ isOpen, onClose, onSubmit }) => {
  const [leaveType, setLeaveType] = useState("full-day");
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ leaveType, leaveDate, leaveReason });
    setLeaveType("full-day");
    setLeaveDate("");
    setLeaveReason("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-6 md:p-8 transform transition-all duration-300 ease-out scale-95 animate-modal-pop-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-slate-100">Request Leave</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="leaveType" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Leave Type</label>
            <div className="relative">
              <select
                id="leaveType"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full appearance-none bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block p-2.5 pr-8"
              >
                <option value="full-day">Full Day</option>
                <option value="half-day">Half Day</option>
                <option value="sick-leave">Sick Leave</option>
                <option value="vacation">Vacation</option>
                <option value="personal">Personal Leave</option>
              </select>
              <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label htmlFor="leaveDate" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Date</label>
            <input
              id="leaveDate"
              type="date"
              value={leaveDate}
              onChange={(e) => setLeaveDate(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block p-2.5"
              required
            />
          </div>

          <div>
            <label htmlFor="leaveReason" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Reason</label>
            <textarea
              id="leaveReason"
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="Provide a brief reason for your leave..."
              rows="4"
              className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block p-2.5"
              required
            />
          </div>

          <div className="flex justify-end items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700/80 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600/80 focus:ring-4 focus:outline-none focus:ring-gray-200 dark:focus:ring-slate-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:ring-4 focus:outline-none focus:ring-cyan-300 dark:bg-cyan-500 dark:hover:bg-cyan-600 dark:focus:ring-cyan-700 rounded-lg transition-colors"
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
      <style jsx global>{`
        @keyframes modal-pop-in {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-modal-pop-in {
          animation: modal-pop-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

// --- Help Desk Modal ---
const HelpDeskModal = ({ isOpen, onClose, onSubmit }) => {
  const [inquiryTitle, setInquiryTitle] = useState("");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ title: inquiryTitle, message: inquiryMessage, file: selectedFile, isAnonymous });
    setInquiryTitle("");
    setInquiryMessage("");
    setSelectedFile(null);
    setIsAnonymous(false);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-6 md:p-8 transform transition-all duration-300 ease-out scale-95 animate-modal-pop-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-slate-100">Submit an Inquiry</h2>
           <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="inquiryTitleModal" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Title</label>
            <input
              id="inquiryTitleModal"
              type="text"
              value={inquiryTitle}
              onChange={(e) => setInquiryTitle(e.target.value)}
              placeholder="e.g., Payroll issue, IT support"
              className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block p-2.5"
              required
            />
          </div>

          <div>
            <label htmlFor="inquiryMessageModal" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Message</label>
            <textarea
              id="inquiryMessageModal"
              value={inquiryMessage}
              onChange={(e) => setInquiryMessage(e.target.value)}
              placeholder="Describe your issue or question in detail..."
              rows="4"
              className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block p-2.5"
              required
            />
          </div>
          
          <div>
            <label htmlFor="fileAttachmentModal" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Attach File (Optional)</label>
            <label
              htmlFor="fileAttachmentInputModal"
              className="flex flex-col items-center justify-center w-full h-28 border-2 border-gray-300 dark:border-slate-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600/70 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-8 h-8 mb-2 text-gray-500 dark:text-slate-400" />
                <p className="mb-1 text-sm text-gray-500 dark:text-slate-400">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-500">PNG, JPG, PDF (MAX. 5MB)</p>
              </div>
              <input id="fileAttachmentInputModal" type="file" className="hidden" onChange={handleFileChange} />
            </label>
            {selectedFile && <p className="mt-2 text-xs text-gray-600 dark:text-slate-400">Selected: {selectedFile.name}</p>}
          </div>

          <div className="flex items-center">
            <input
              id="anonymousCheckModal"
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 text-cyan-600 bg-gray-100 border-gray-300 rounded focus:ring-cyan-500 dark:focus:ring-cyan-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
            />
            <label htmlFor="anonymousCheckModal" className="ml-2 text-sm font-medium text-gray-900 dark:text-slate-300">Submit Anonymously</label>
          </div>

          <div className="flex justify-end items-center gap-3 pt-4">
             <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700/80 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600/80 focus:ring-4 focus:outline-none focus:ring-gray-200 dark:focus:ring-slate-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:ring-4 focus:outline-none focus:ring-cyan-300 dark:bg-cyan-500 dark:hover:bg-cyan-600 dark:focus:ring-cyan-700 rounded-lg transition-colors"
            >
              Send Inquiry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default function HRMSDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [activeTab, setActiveTab] = useState("announcements");
  const [darkMode, setDarkMode] = useState(false); // Default to false, will be updated by useEffect
  const user = useAuth();
  const username = user?.name || "User";

  useEffect(() => {
    const savedMode = localStorage.getItem(DARK_MODE_KEY);
    let newModeIsDark;
    if (savedMode !== null) {
      newModeIsDark = savedMode === 'true';
    } else {
      newModeIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      localStorage.setItem(DARK_MODE_KEY, newModeIsDark.toString());
    }
    setDarkMode(newModeIsDark);
    applyDarkModeToDocument(newModeIsDark);
  }, []);

  const toggleDarkMode = () => {
    const newDarkModeValue = !darkMode;
    setDarkMode(newDarkModeValue);
    localStorage.setItem(DARK_MODE_KEY, newDarkModeValue.toString());
    applyDarkModeToDocument(newDarkModeValue);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentMonth = currentTime.getMonth();
  const currentYear = currentTime.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  const presentDays = mockAttendanceData.filter(day => day.status === "present").length;
  const absentDays = mockAttendanceData.filter(day => day.status === "absent").length;
  const halfDays = mockAttendanceData.filter(day => day.status === "half-day").length;
  const holidaysCount = holidays.length;

  const handleCheckIn = async () => { setIsCheckedIn(true); console.log("Checked In"); };
  const handleCheckOut = async () => { setIsCheckedIn(false); console.log("Checked Out"); };

  const handleLeaveRequestSubmit = (data) => {
    console.log("Leave request submitted:", data);
    setShowLeaveModal(false);
  };

  const handleHelpInquirySubmit = (data) => {
    console.log("Inquiry submitted:", data);
    setShowHelpModal(false);
  };

  const formatDate = (date) => new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  const formatTime = (date) => date ? new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(date) : "—";

  const calculateAttendancePercentage = () => {
    const workingDays = daysInMonth - holidaysCount;
    if (workingDays <= 0) return "0.0";
    return Math.min((presentDays / workingDays) * 100, 100).toFixed(1);
  };

  return (
    <div className={`flex w-full min-h-screen bg-gray-100 dark:bg-slate-900 transition-colors duration-300`}>
      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-slate-800/90 backdrop-blur-md shadow-lg flex items-center justify-between p-4 transition-colors duration-300">
          <div className="flex items-center">
            <div className="bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 p-2.5 rounded-full mr-3.5 shadow-sm">
              <User size={22} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-300">Welcome,</p>
              <p className="text-lg font-semibold text-cyan-700 dark:text-cyan-400">{username}</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center justify-center space-x-3 bg-gray-50 dark:bg-slate-700/60 px-5 py-2.5 rounded-xl shadow-inner">
            <Clock size={22} className="text-cyan-600 dark:text-cyan-400" />
            <div className="text-center">
              <p className="text-base font-semibold text-gray-800 dark:text-slate-100">{formatTime(currentTime)}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{formatDate(currentTime)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button 
              onClick={handleCheckIn} 
              disabled={isCheckedIn}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 whitespace-nowrap ${isCheckedIn 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-600 dark:text-slate-400' 
                : 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-400'}`}
            >
              <CheckCircle size={18} className="mr-2" />
              Check In
            </button>
            
            <button 
              onClick={handleCheckOut} 
              disabled={!isCheckedIn}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 whitespace-nowrap ${!isCheckedIn 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-600 dark:text-slate-400' 
                : 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-400'}`}
            >
              <XCircle size={18} className="mr-2" />
              Check Out
            </button>
            
            <button 
              onClick={() => setShowLeaveModal(true)}
              className="hidden sm:inline-block px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              Request Leave
            </button>
            
            <button 
              onClick={() => setShowLeaveModal(true)}
              title="Request Leave"
              className="sm:hidden p-2.5 text-gray-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 bg-gray-100 dark:bg-slate-700 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-offset-slate-900"
            >
              <Calendar size={20} />
            </button>

            <button 
              onClick={() => setShowHelpModal(true)}
              title="Get Help"
              className="p-2.5 text-gray-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 bg-gray-100 dark:bg-slate-700 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-offset-slate-900"
            >
              <HelpCircle size={20} />
            </button>
            
            <button 
              onClick={toggleDarkMode}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-2.5 text-gray-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 bg-gray-100 dark:bg-slate-700 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-offset-slate-900"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            <div className="w-full lg:w-3/4 space-y-4 lg:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
                {[
                  { title: "Days this Month", value: daysInMonth, icon: Calendar, color: "cyan", barWidth: '100%' },
                  { title: "Present Days", value: presentDays, icon: CheckCircle, color: "green", barWidth: `${calculateAttendancePercentage()}%`, subText: `${calculateAttendancePercentage()}% att.` },
                  { title: "Absent Days", value: absentDays, icon: XCircle, color: "red", barWidth: `${(absentDays / (daysInMonth || 1)) * 100}%` },
                  { title: "Half Days", value: halfDays, icon: AlertCircle, color: "amber", barWidth: `${(halfDays / (daysInMonth || 1)) * 100}%` },
                  { title: "Holidays", value: holidaysCount, icon: Calendar, color: "purple", barWidth: `${(holidaysCount / (daysInMonth || 1)) * 100}%` },
                ].map((card) => {
                  const Icon = card.icon;
                  // Define color classes based on light/dark mode and card type
                  const textClasses = { cyan: "text-cyan-600 dark:text-cyan-400", green: "text-green-600 dark:text-green-400", red: "text-red-600 dark:text-red-400", amber: "text-amber-600 dark:text-amber-400", purple: "text-purple-600 dark:text-purple-400"};
                  const iconClasses = { cyan: "text-cyan-500 dark:text-cyan-400", green: "text-green-500 dark:text-green-400", red: "text-red-500 dark:text-red-400", amber: "text-amber-500 dark:text-amber-400", purple: "text-purple-500 dark:text-purple-400"};
                  const barClasses = { cyan: "bg-cyan-500 dark:bg-cyan-500", green: "bg-green-500 dark:bg-green-500", red: "bg-red-500 dark:bg-red-500", amber: "bg-amber-500 dark:bg-amber-500", purple: "bg-purple-500 dark:bg-purple-500"};
                  
                  return (
                    <div key={card.title} className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-5 transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-1.5">
                      <div className="flex items-center justify-between mb-3.5">
                        <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{card.title}</p>
                        <Icon size={26} className={`${iconClasses[card.color]}`} />
                      </div>
                      <p className={`text-3xl font-bold ${textClasses[card.color]}`}>{card.value}</p>
                      <div className="mt-3.5 h-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-2 ${barClasses[card.color]} rounded-full transition-all duration-500`} style={{ width: card.barWidth }}></div>
                      </div>
                      {card.subText && <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">{card.subText}</p>}
                    </div>
                  );
                })}
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl transition-colors duration-200">
                <div className="p-5 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100">Attendance History</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Your records for May 2025</p>
                  </div>
                  <div className="bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 px-3.5 py-1.5 rounded-full text-sm font-medium shadow-sm">
                    May 2025
                  </div>
                </div>
                <div className="p-3">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-gray-500 dark:text-slate-400 border-b-2 border-gray-200 dark:border-slate-700">
                          <th className="py-3.5 px-3 font-semibold">Date</th>
                          <th className="py-3.5 px-3 font-semibold">Status</th>
                          <th className="py-3.5 px-3 font-semibold">Check In</th>
                          <th className="py-3.5 px-3 font-semibold">Check Out</th>
                          <th className="py-3.5 px-3 font-semibold">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockAttendanceData.map((record, index) => (
                          <tr key={index} className="border-b border-gray-100 dark:border-slate-700/70 hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors text-sm">
                            <td className="py-3.5 px-3 text-gray-700 dark:text-slate-200">
                              {new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', weekday: 'short' }).format(record.date)}
                            </td>
                            <td className="py-3.5 px-3">
                              {record.status === "present" && <span className="px-3 py-1 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold">Present</span>}
                              {record.status === "absent" && <span className="px-3 py-1 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 rounded-full text-xs font-semibold">Absent</span>}
                              {record.status === "half-day" && <span className="px-3 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full text-xs font-semibold">Half Day</span>}
                            </td>
                            <td className="py-3.5 px-3 text-gray-600 dark:text-slate-300">{formatTime(record.checkIn)}</td>
                            <td className="py-3.5 px-3 text-gray-600 dark:text-slate-300">{formatTime(record.checkOut)}</td>
                            <td className="py-3.5 px-3 text-gray-600 dark:text-slate-300 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]" title={record.reason}>{record.reason || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              {/* Weekly Chart Section Placeholder - Add your chart component or styling here */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-5">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100 mb-1">Weekly Summary</h2>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Productivity & attendance metrics</p>
                  <div className="text-center py-8 text-gray-400 dark:text-slate-500">
                    {/* Replace with actual chart component */}
                    Chart Data / Visualization Placeholder
                  </div>
              </div>

            </div>
            
            <div className="w-full lg:w-1/4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl h-full flex flex-col">
                <div className="p-5 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100">Updates</h2>
                  <div className="bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 rounded-full h-8 w-8 flex items-center justify-center text-sm font-bold shadow-sm">
                    {announcements.length}
                  </div>
                </div>
                <div className="p-1.5">
                  <div className="flex border-b border-gray-200 dark:border-slate-700 mx-3">
                    {[ {id: 'announcements', label: 'News'}, {id: 'holidays', label: 'Holidays'}, {id: 'activity', label: 'Activity'} ].map(tab => (
                      <button 
                        key={tab.id}
                        className={`flex-1 px-2 py-3.5 text-sm font-medium transition-all duration-200 focus:outline-none rounded-t-md ${activeTab === tab.id 
                          ? 'border-b-2 border-cyan-500 text-cyan-600 dark:text-cyan-400 dark:border-cyan-400 bg-cyan-50/50 dark:bg-cyan-500/5' 
                          : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                        onClick={() => setActiveTab(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="p-4 overflow-y-auto" style={{maxHeight: 'calc(100vh - 480px)'}}> {/* Adjust max-h if needed */}
                     {activeTab === 'announcements' && (
                      <div className="space-y-4">
                        {announcements.map((ann) => (
                          <div key={ann.id} className="p-3.5 hover:bg-gray-100/70 dark:hover:bg-slate-700/60 rounded-lg transition-colors duration-200 cursor-pointer shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-slate-700">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-semibold text-gray-700 dark:text-slate-100 text-sm leading-snug">{ann.title}</h4>
                              <span className="ml-2 flex-shrink-0 bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs px-2.5 py-1 rounded-full font-medium">New</span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-slate-400 mb-2 leading-relaxed">{ann.content}</p>
                            <div className="flex justify-between items-center">
                              <p className="text-xs text-gray-400 dark:text-slate-500">{ann.date}</p>
                              <button className="text-cyan-600 dark:text-cyan-400 text-xs hover:underline font-semibold">Read more</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                     {activeTab === 'holidays' && (
                      <div className="space-y-3.5">
                        {holidays.map((holiday, index) => (
                          <div key={index} className="p-3.5 flex justify-between items-center hover:bg-gray-100/70 dark:hover:bg-slate-700/60 rounded-lg transition-colors duration-200 shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-slate-700">
                            <div>
                              <h4 className="font-semibold text-gray-700 dark:text-slate-100 text-sm">{holiday.name}</h4>
                              <p className="text-xs text-gray-500 dark:text-slate-400">{holiday.date}</p>
                            </div>
                            <div className="bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 p-2.5 rounded-full shadow-sm">
                              <Calendar size={18} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {activeTab === 'activity' && (
                       <div className="space-y-4">
                        {[
                          { text: `You checked in at 9:05 AM`, time: 'Today', initials: username.charAt(0).toUpperCase(), theme: 'cyan' },
                          { text: `Your leave request was approved`, time: 'Yesterday', initials: username.charAt(0).toUpperCase(), theme: 'cyan' },
                          { text: `HR updated company policy`, time: '2 days ago', initials: 'HR', theme: 'green' },
                        ].map((activity, index) => (
                          <div key={index} className="p-3.5 hover:bg-gray-100/70 dark:hover:bg-slate-700/60 rounded-lg transition-colors duration-200 shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-slate-700">
                            <div className="flex items-start gap-3.5">
                              <div className={`
                                ${activity.theme === 'cyan' ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' : 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-300'} 
                                rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0 text-sm font-semibold shadow-sm`}>
                                {activity.initials}
                              </div>
                              <div>
                                <p className="text-sm text-gray-700 dark:text-slate-200 leading-snug">{activity.text}</p>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{activity.time}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                         <div className="pt-2 text-center">
                          <button className="text-cyan-600 dark:text-cyan-400 text-sm hover:underline font-semibold py-2">View All Activities</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-slate-700 p-4 mt-auto">
                  <div className="bg-cyan-50 dark:bg-cyan-500/10 border-l-4 border-cyan-500 dark:border-cyan-400 p-4 rounded-md shadow-md">
                    <div className="flex items-center">
                      <Bell size={20} className="text-cyan-600 dark:text-cyan-400 mr-3" />
                      <h3 className="font-semibold text-cyan-800 dark:text-cyan-300 text-sm">Meeting Reminder</h3>
                    </div>
                    <p className="text-sm text-cyan-700 dark:text-cyan-300/90 mt-1.5">Team standup at 10:00 AM today</p>
                    <div className="mt-3.5 flex gap-2.5">
                      <button className="text-xs px-3.5 py-1.5 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-800 focus:ring-cyan-500 shadow-sm">Join</button>
                      <button className="text-xs px-3.5 py-1.5 border border-cyan-500 dark:border-cyan-400 text-cyan-600 dark:text-cyan-400 rounded-md hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition-colors focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-800 focus:ring-cyan-500">Snooze</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      
      <LeaveRequestModal 
        isOpen={showLeaveModal} 
        onClose={() => setShowLeaveModal(false)}
        onSubmit={handleLeaveRequestSubmit} 
      />
      <HelpDeskModal 
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        onSubmit={handleHelpInquirySubmit}
      />
    </div>
  );
}