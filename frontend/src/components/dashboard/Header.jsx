import React, { useState, useEffect, memo } from "react";
import { Clock, User, CheckCircle, XCircle, RefreshCw, Calendar, HelpCircle, Moon, Sun, LogIn, LogOut, MapPin, Edit3 } from "lucide-react";
import { formatTime, formatDate } from "../../utils/istUtils";
import useProfilePicture from "../../hooks/useProfilePicture";

// Separate memoized component for time display to prevent unnecessary re-renders
const TimeDisplay = memo(() => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Using standardized IST utils functions

  return (
    <div className="hidden sm:flex items-center gap-3 bg-white dark:bg-neutral-800 px-4 py-3 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700">
      <div className="bg-neutral-100 dark:bg-neutral-700 p-2 rounded-full">
        <Clock size={16} className="text-neutral-600 dark:text-neutral-300" />
      </div>
      <div>
        <p className="text-base font-medium text-neutral-700 dark:text-neutral-200 tabular-nums">{formatTime(currentTime)}</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{formatDate(currentTime, false, 'DD MMMM YYYY')}</p>
      </div>
    </div>
  );
});

const Header = ({
  username,
  isCheckedIn,
  dailyCycleComplete,
  checkInLoading,
  checkOutLoading,
  locationLoading,
  handleCheckIn,
  handleCheckOut,
  isLoading,
  retryConnection,
  setShowLeaveModal,
  setShowHelpModal,
  setShowRegularizationModal,
  toggleTheme,
  theme
}) => {
  const { profilePicture } = useProfilePicture();
  
  return (
    <header className="bg-gradient-to-r from-white to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 shadow-lg p-4 transition-all duration-300 rounded-xl border border-neutral-200 dark:border-neutral-700">
      {/* Top section: Welcome and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
        {/* Welcome Message */}
        <div className="flex items-center mb-4 sm:mb-0">
          {profilePicture?.s3Url ? (
            <div className="w-12 h-12 rounded-xl shadow-lg overflow-hidden ring-2 ring-white/20 dark:ring-black/20">
              <img 
                src={profilePicture.s3Url} 
                alt={username}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="bg-gradient-to-br from-[#EBA04B] to-[#D4881A] text-white p-3 rounded-xl shadow-lg">
              <User size={22} />
            </div>
          )}
          <div className="ml-4">
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Welcome back,</p>
            <p className="text-xl font-bold" style={{ color: '#FEE2A1' }}>
              {username}
            </p>
          </div>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                 <button 
                    onClick={() => setShowLeaveModal(true)}
                    title="Request Leave"
                    className="p-2.5 text-neutral-600 dark:text-neutral-300 hover:text-cyan-600 dark:hover:text-cyan-400 bg-white dark:bg-neutral-700 rounded-xl shadow-md hover:shadow-lg border border-neutral-200 dark:border-neutral-600 transition-all duration-200 hover:scale-105"
                >
                    <Calendar size={18} />
                </button>
                <button 
                    onClick={() => setShowRegularizationModal(true)}
                    title="Regularize Attendance"
                    className="p-2.5 text-neutral-600 dark:text-neutral-300 hover:text-cyan-600 dark:hover:text-cyan-400 bg-white dark:bg-neutral-700 rounded-xl shadow-md hover:shadow-lg border border-neutral-200 dark:border-neutral-600 transition-all duration-200 hover:scale-105"
                >
                    <Edit3 size={18} />
                </button>
                <button 
                    onClick={() => setShowHelpModal(true)}
                    title="Get Help"
                    className="p-2.5 text-neutral-600 dark:text-neutral-300 hover:text-cyan-600 dark:hover:text-cyan-400 bg-white dark:bg-neutral-700 rounded-xl shadow-md hover:shadow-lg border border-neutral-200 dark:border-neutral-600 transition-all duration-200 hover:scale-105"
                >
                    <HelpCircle size={18} />
                </button>
                <button 
                    onClick={toggleTheme}
                    title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    className="p-2.5 text-neutral-600 dark:text-neutral-300 hover:text-cyan-600 dark:hover:text-cyan-400 bg-white dark:bg-neutral-700 rounded-xl shadow-md hover:shadow-lg border border-neutral-200 dark:border-neutral-600 transition-all duration-200 hover:scale-105"
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                 <button 
                    onClick={retryConnection}
                    disabled={isLoading}
                    className="p-2.5 text-neutral-600 dark:text-neutral-300 hover:text-cyan-600 dark:hover:text-cyan-400 bg-white dark:bg-neutral-700 rounded-xl shadow-md hover:shadow-lg border border-neutral-200 dark:border-neutral-600 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    aria-label="Refresh Data"
                >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>
            {/* Time Display */}
            <TimeDisplay />
        </div>
      </div>

      {/* Bottom section: Action Buttons */}
      <div className="grid grid-cols-2 gap-4 w-full mt-6">
        <button
          onClick={handleCheckIn}
          disabled={isCheckedIn || checkInLoading || locationLoading || dailyCycleComplete}
          className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-900 shadow-lg border ${
            dailyCycleComplete
              ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed dark:bg-neutral-700/50 dark:text-neutral-500 border-neutral-300 dark:border-neutral-600'
              : isCheckedIn || checkInLoading || locationLoading
              ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed dark:bg-neutral-600 dark:text-neutral-400 border-neutral-400 dark:border-neutral-500'
              : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 focus:ring-green-400 border-green-600 hover:shadow-xl'
          }`}
        >
          {locationLoading ? (
            <>
              <MapPin size={18} className="mr-2 animate-pulse" />
              Getting location...
            </>
          ) : (
            <>
              <LogIn size={18} className="mr-2" />
              {checkInLoading
                ? "Checking in..."
                : dailyCycleComplete
                  ? "Completed"
                  : "Check In"}
            </>
          )}
        </button>

        <button
          onClick={handleCheckOut}
          disabled={!isCheckedIn || checkOutLoading || dailyCycleComplete}
          className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-900 shadow-lg border ${
            dailyCycleComplete
              ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed dark:bg-neutral-700/50 dark:text-neutral-500 border-neutral-300 dark:border-neutral-600'
              : !isCheckedIn || checkOutLoading
              ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed dark:bg-neutral-600 dark:text-neutral-400 border-neutral-400 dark:border-neutral-500'
              : 'bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 focus:ring-red-400 border-red-600 hover:shadow-xl'
          }`}
        >
          <LogOut size={18} className="mr-2" />
          {checkOutLoading
            ? "Checking out..."
            : dailyCycleComplete
              ? "Completed"
              : "Check Out"}
        </button>
      </div>
    </header>
  );
};

export default Header; 