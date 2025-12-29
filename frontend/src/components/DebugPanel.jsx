import React, { useState, useEffect } from 'react';
import { Bug, X, Copy, Trash2, Wifi, WifiOff } from 'lucide-react';
import DebugUtils from '../utils/debugUtils.js';

const DebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshDebugInfo = () => {
    const info = DebugUtils.getAllDebugInfo();
    setDebugInfo(info);
  };

  const copyAllDebugInfo = () => {
    if (debugInfo) {
      navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))
        .then(() => {
          alert('Debug information copied to clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy debug info:', err);
        });
    }
  };

  const clearAllLogs = () => {
    if (confirm('Are you sure you want to clear all debug logs?')) {
      DebugUtils.clearDebugLogs();
      refreshDebugInfo();
    }
  };

  // eslint-disable-next-line no-undef
  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <>
      {/* Debug Toggle Button */}
      <div className="fixed bottom-4 right-4 z-[9999]">
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) refreshDebugInfo();
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 flex items-center gap-2"
        >
          <Bug className="h-5 w-5" />
          {!isOnline && <WifiOff className="h-4 w-4 text-red-300" />}
        </button>
      </div>

      {/* Debug Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-96 max-h-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[9999] overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-purple-600 text-white">
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              <h3 className="font-semibold">Debug Panel</h3>
              {!isOnline && <WifiOff className="h-4 w-4 text-red-300" />}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-purple-700 p-1 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto max-h-80">
            {debugInfo ? (
              <div className="space-y-4">
                {/* Status Summary */}
                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                  <h4 className="font-semibold text-sm mb-2">Status</h4>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>Online:</span>
                      <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                        {isOnline ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Auth Token:</span>
                      <span className={debugInfo.localStorage.hasAuthToken ? 'text-green-600' : 'text-red-600'}>
                        {debugInfo.localStorage.hasAuthToken ? 'Present' : 'Missing'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Error Counts */}
                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                  <h4 className="font-semibold text-sm mb-2">Errors</h4>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>API Errors:</span>
                      <span className={debugInfo.errorLogs.apiErrors.length > 0 ? 'text-red-600' : 'text-green-600'}>
                        {debugInfo.errorLogs.apiErrors.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Network Errors:</span>
                      <span className={debugInfo.errorLogs.networkErrors.length > 0 ? 'text-red-600' : 'text-green-600'}>
                        {debugInfo.errorLogs.networkErrors.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Login Errors:</span>
                      <span className={debugInfo.errorLogs.loginErrors.length > 0 ? 'text-red-600' : 'text-green-600'}>
                        {debugInfo.errorLogs.loginErrors.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>React Errors:</span>
                      <span className={debugInfo.errorLogs.reactErrors.length > 0 ? 'text-red-600' : 'text-green-600'}>
                        {debugInfo.errorLogs.reactErrors.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent API Errors */}
                {debugInfo.errorLogs.apiErrors.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                    <h4 className="font-semibold text-sm mb-2 text-red-800 dark:text-red-200">
                      Recent API Errors
                    </h4>
                    <div className="text-xs space-y-2 max-h-32 overflow-y-auto">
                      {debugInfo.errorLogs.apiErrors.slice(-3).map((error, index) => (
                        <div key={index} className="text-red-700 dark:text-red-300">
                          <div><strong>{error.endpoint}</strong></div>
                          <div>{error.status} - {error.message}</div>
                          <div className="opacity-75">{new Date(error.timestamp).toLocaleTimeString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={refreshDebugInfo}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={copyAllDebugInfo}
                    className="flex-1 px-3 py-2 bg-green-600 text-white text-xs rounded hover:bg-green-700 flex items-center justify-center gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </button>
                  <button
                    onClick={clearAllLogs}
                    className="flex-1 px-3 py-2 bg-red-600 text-white text-xs rounded hover:bg-red-700 flex items-center justify-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <button
                  onClick={refreshDebugInfo}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Load Debug Info
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DebugPanel;