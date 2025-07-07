import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, X, Calendar, AlertCircle } from 'lucide-react';
import apiClient from '../../service/apiClient';

const MissingCheckoutAlert = ({ onRegularizationRequest }) => {
  const [missingCheckouts, setMissingCheckouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    loadMissingCheckouts();
  }, []);

  const loadMissingCheckouts = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getMissingCheckouts();
      
      if (response.success && response.data?.missingCheckouts) {
        setMissingCheckouts(response.data.missingCheckouts);
      } else {
        setMissingCheckouts([]);
      }
    } catch (error) {
      console.error("Failed to load missing checkouts:", error);
      setMissingCheckouts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date));
  };

  const formatTime = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(date));
  };

  const handleRegularizationClick = (attendance) => {
    const attendanceDate = new Date(attendance.date);
    
    // Default check-in and check-out times
    const defaultCheckIn = new Date(attendanceDate);
    defaultCheckIn.setHours(9, 30, 0, 0);
    
    const defaultCheckOut = new Date(attendanceDate);
    defaultCheckOut.setHours(17, 30, 0, 0);
    
    onRegularizationRequest({
      date: attendance.date,
      checkIn: attendance.checkIn || defaultCheckIn,
      suggestedCheckOut: defaultCheckOut
    });
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Don't show if loading, dismissed, or no missing checkouts
  if (loading || dismissed || missingCheckouts.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 sm:p-6 mb-6 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 space-y-3 sm:space-y-0">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-800 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-1">
              Missing Checkout Alert
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              You have {missingCheckouts.length} day{missingCheckouts.length > 1 ? 's' : ''} with missing checkout times
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 p-1 self-start"
          title="Dismiss alert"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3">
        {missingCheckouts.map((attendance, index) => (
          <div
            key={attendance._id || index}
            className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-amber-100 dark:border-amber-800"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium text-sm sm:text-base">{formatDate(attendance.date)}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm sm:text-base">Check-in: {formatTime(attendance.checkIn)}</span>
                </div>
                <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium">No checkout recorded</span>
                </div>
              </div>
              <button
                onClick={() => handleRegularizationClick(attendance)}
                className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 w-full sm:w-auto"
              >
                Request Regularization
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-800/30 rounded-lg">
        <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">
          <strong>💡 Tip:</strong> Submit regularization requests for missing checkout times to ensure accurate attendance records.
        </p>
      </div>
    </div>
  );
};

export default MissingCheckoutAlert;