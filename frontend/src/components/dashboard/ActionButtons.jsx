import React from "react";
import { Calendar, HelpCircle, Moon, Sun } from "lucide-react";
import { useTheme } from '../../contexts/ThemeContext';

const ActionButtons = ({ 
  setShowLeaveModal, 
  setShowHelpModal 
}) => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className="flex items-center space-x-1 sm:space-x-2">
      <button 
        onClick={() => setShowLeaveModal(true)}
        className="hidden sm:inline-block px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 whitespace-nowrap"
      >
        Request Leave
      </button>
      
      <button 
        onClick={() => setShowLeaveModal(true)}
        title="Request Leave"
        className="sm:hidden p-2 text-gray-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 bg-gray-100 dark:bg-slate-700 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-offset-slate-900"
      >
        <Calendar size={18} />
      </button>

      <button 
        onClick={() => setShowHelpModal(true)}
        title="Get Help"
        className="p-2 text-gray-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 bg-gray-100 dark:bg-slate-700 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-offset-slate-900"
      >
        <HelpCircle size={18} />
      </button>
      
      <button 
        onClick={toggleTheme}
        title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        className="p-2 text-gray-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 bg-gray-100 dark:bg-slate-700 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-offset-slate-900"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  );
};

export default ActionButtons; 