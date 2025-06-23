import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, X, Calendar } from 'lucide-react';

const CheckoutReminder = ({ missingCheckouts, onRegularizationRequest, onDismiss }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!missingCheckouts || missingCheckouts.length === 0) {
    return null;
  }

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
    onRegularizationRequest({
      date: attendance.date,
      checkIn: attendance.checkIn,
      // Suggest a default checkout time (e.g., 8 hours after check-in)
      suggestedCheckOut: new Date(new Date(attendance.checkIn).getTime() + 8 * 60 * 60 * 1000)
    });
  };

  if (!isExpanded) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {missingCheckouts.length} missing checkout{missingCheckouts.length > 1 ? 's' : ''} require attention
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium text-sm"
          >
            View Details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-6 mb-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-800 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
              Missing Checkout Reminder
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              You have {missingCheckouts.length} day{missingCheckouts.length > 1 ? 's' : ''} where you forgot to check out
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(false)}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 p-1"
            title="Minimize"
          >
            <X className="w-4 h-4" />
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 text-sm font-medium px-2 py-1 rounded"
              title="Dismiss all reminders"
            >
              Dismiss All
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {missingCheckouts.map((attendance, index) => (
          <div
            key={attendance._id || index}
            className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-amber-100 dark:border-amber-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">{formatDate(attendance.date)}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
                  <Clock className="w-4 h-4" />
                  <span>Check-in: {formatTime(attendance.checkIn)}</span>
                </div>
                <div className="text-amber-600 dark:text-amber-400 text-sm font-medium">
                  No checkout recorded
                </div>
              </div>
              <button
                onClick={() => handleRegularizationClick(attendance)}
                className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              >
                Request Regularization
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-800/30 rounded-lg">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>💡 Tip:</strong> To avoid this in the future, make sure to check out before leaving the office. 
          You can submit a regularization request to add your missing checkout time.
        </p>
      </div>
    </div>
  );
};

export default CheckoutReminder; 