import React from "react";
import { Clock, User, CheckCircle, XCircle } from "lucide-react";

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
    <header className="bg-white dark:bg-slate-800/90 backdrop-blur-md shadow-lg flex flex-wrap items-center justify-between p-3 transition-colors duration-300">
      <div className="flex items-center mb-2 md:mb-0">
        <div className="bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 p-2 sm:p-2.5 rounded-full mr-2 sm:mr-3.5 shadow-sm">
          <User size={20} />
        </div>
        <div>
          <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-slate-300">Welcome,</p>
          <p className="text-base sm:text-lg font-semibold text-cyan-700 dark:text-cyan-400">{username}</p>
        </div>
        <div className="flex items-center ml-2">
          <button 
            onClick={retryConnection}
            disabled={isLoading}
            className="ml-2 text-[10px] sm:text-xs bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded-full font-medium hover:bg-cyan-200 dark:hover:bg-cyan-500/30 transition-colors"
          >
            {isLoading ? "Connecting..." : "Refresh Data"}
          </button>
        </div>
      </div>
      
      <div className="hidden md:flex items-center justify-center space-x-3 bg-gray-50 dark:bg-slate-700/60 px-5 py-2.5 rounded-xl shadow-inner">
        <Clock size={22} className="text-cyan-600 dark:text-cyan-400" />
        <div className="text-center">
          <p className="text-base font-semibold text-gray-800 dark:text-slate-100">{formatTime(currentTime)}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">{formatDate(currentTime)}</p>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:space-x-2 mt-2 sm:mt-0">
        <button 
          onClick={handleCheckIn} 
          disabled={isCheckedIn || checkInLoading || dailyCycleComplete}
          className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
            dailyCycleComplete
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-slate-700/50 dark:text-slate-500 opacity-70'
              : isCheckedIn || checkInLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-600 dark:text-slate-400' 
              : 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-400'
          } flex-1 sm:flex-auto justify-center`}
        >
          <CheckCircle size={16} className="mr-1 sm:mr-2" />
          {checkInLoading 
            ? "..." 
            : dailyCycleComplete 
              ? "Done for Today" 
              : "Check In"
          }
        </button>
        
        <button 
          onClick={() => {
            console.log('Header: Check out button clicked');
            if (typeof handleCheckOut === 'function') handleCheckOut();
          }}
          disabled={!isCheckedIn || checkOutLoading || dailyCycleComplete}
          className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
            dailyCycleComplete
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-slate-700/50 dark:text-slate-500 opacity-70'
              : !isCheckedIn || checkOutLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-600 dark:text-slate-400' 
              : 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-400'
          } flex-1 sm:flex-auto justify-center`}
        >
          <XCircle size={16} className="mr-1 sm:mr-2" />
          {checkOutLoading 
            ? "..." 
            : dailyCycleComplete 
              ? "Done for Today" 
              : "Check Out"
          }
        </button>
      </div>
    </header>
  );
};

export default Header; 