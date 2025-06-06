import React from "react";
import { Clock, User, CheckCircle, XCircle, RefreshCw, Calendar, HelpCircle, Moon, Sun } from "lucide-react";

const Header = ({
  username,
  currentTime,
  formatDate,
  formatTime,
  isCheckedIn,
  dailyCycleComplete,
  checkInLoading,
  checkOutLoading,
  handleCheckIn,
  handleCheckOut,
  isLoading,
  retryConnection,
  setShowLeaveModal,
  setShowHelpModal,
  toggleTheme,
  theme
}) => {
  return (
    <header className="bg-white dark:bg-slate-800/90 shadow-lg p-3 transition-colors duration-300 rounded-xl">
      {/* Top section: Welcome and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
        {/* Welcome Message */}
        <div className="flex items-center mb-3 sm:mb-0">
          <div className="bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 p-2.5 rounded-full mr-3 shadow-sm">
            <User size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-slate-300">Welcome,</p>
            <p className="text-lg font-semibold text-cyan-700 dark:text-cyan-400">{username}</p>
          </div>
        </div>

        {/* Action Icons */}
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
                 <button 
                    onClick={() => setShowLeaveModal(true)}
                    title="Request Leave"
                    className="p-2 text-gray-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 bg-gray-100 dark:bg-slate-700 rounded-full transition-colors duration-200"
                >
                    <Calendar size={18} />
                </button>
                <button 
                    onClick={() => setShowHelpModal(true)}
                    title="Get Help"
                    className="p-2 text-gray-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 bg-gray-100 dark:bg-slate-700 rounded-full transition-colors duration-200"
                >
                    <HelpCircle size={18} />
                </button>
                <button 
                    onClick={toggleTheme}
                    title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    className="p-2 text-gray-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 bg-gray-100 dark:bg-slate-700 rounded-full transition-colors duration-200"
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                 <button 
                    onClick={retryConnection}
                    disabled={isLoading}
                    className="p-2 text-gray-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 bg-gray-100 dark:bg-slate-700 rounded-full transition-colors"
                    aria-label="Refresh Data"
                >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>
            {/* Time Display */}
            <div className="hidden sm:flex items-center space-x-3 bg-gray-50 dark:bg-slate-700/60 px-4 py-2 rounded-xl shadow-inner ml-2">
                <Clock size={20} className="text-cyan-600 dark:text-cyan-400" />
                <div className="text-right">
                    <p className="text-base font-semibold text-gray-800 dark:text-slate-100">{formatTime(currentTime)}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{formatDate(currentTime)}</p>
                </div>
            </div>
        </div>
      </div>

      {/* Bottom section: Action Buttons */}
      <div className="grid grid-cols-2 gap-2 w-full mt-3">
        <button
          onClick={handleCheckIn}
          disabled={isCheckedIn || checkInLoading || dailyCycleComplete}
          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
            dailyCycleComplete
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-slate-700/50 dark:text-slate-500 opacity-70'
              : isCheckedIn || checkInLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-600 dark:text-slate-400'
              : 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-400'
          }`}
        >
          <CheckCircle size={16} className="mr-2" />
          {checkInLoading
            ? "..."
            : dailyCycleComplete
              ? "Done"
              : "Check In"}
        </button>

        <button
          onClick={handleCheckOut}
          disabled={!isCheckedIn || checkOutLoading || dailyCycleComplete}
          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
            dailyCycleComplete
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-slate-700/50 dark:text-slate-500 opacity-70'
              : !isCheckedIn || checkOutLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-600 dark:text-slate-400'
              : 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-400'
          }`}
        >
          <XCircle size={16} className="mr-2" />
          {checkOutLoading
            ? "..."
            : dailyCycleComplete
              ? "Done"
              : "Check Out"}
        </button>
      </div>
    </header>
  );
};

export default Header; 