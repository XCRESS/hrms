// Debug utility functions for HRMS frontend
// These utilities help developers and support teams debug issues

/**
 * Global debug utility that provides comprehensive error information
 */
export const DebugUtils = {
  // Get all stored debug information
  getAllDebugInfo: () => {
    return {
      timestamp: new Date().toISOString(),
      environment: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      },
      localStorage: {
        hasAuthToken: !!localStorage.getItem('authToken'),
        authTokenLength: localStorage.getItem('authToken')?.length || 0,
        keys: Object.keys(localStorage)
      },
      errorLogs: {
        apiErrors: window.apiErrorLog || [],
        networkErrors: window.networkErrors || [],
        loginErrors: window.loginErrors || [],
        profileErrors: window.profileErrors || [],
        reactErrors: window.reactErrors || [],
        lastAuthError: window.lastAuthError || null
      },
      console: {
        lastErrors: DebugUtils.getRecentConsoleErrors(),
        warningCount: DebugUtils.getConsoleWarningCount()
      }
    };
  },

  // Get recent console errors (if available)
  getRecentConsoleErrors: () => {
    return window.consoleErrors || [];
  },

  // Get console warning count
  getConsoleWarningCount: () => {
    return window.consoleWarnings || 0;
  },

  // Log structured debug information
  logDebugInfo: (context, data) => {
    console.group(`🔍 Debug Info: ${context}`);
    console.log('📊 Data:', data);
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📍 URL:', window.location.href);
    console.groupEnd();
  },

  // Enhanced error logging
  logError: (context, error, additionalData = {}) => {
    const errorInfo = {
      context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      additionalData,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    console.error(`🚨 Error in ${context}:`, errorInfo);

    // Store in global error log
    if (!window.structuredErrors) window.structuredErrors = [];
    window.structuredErrors.push(errorInfo);

    // Keep only last 50 errors
    if (window.structuredErrors.length > 50) {
      window.structuredErrors = window.structuredErrors.slice(-50);
    }
  },

  // Copy debug info to clipboard
  copyDebugInfoToClipboard: () => {
    const debugInfo = DebugUtils.getAllDebugInfo();
    
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))
      .then(() => {
        console.log('✅ Debug info copied to clipboard');
        return true;
      })
      .catch(err => {
        console.error('❌ Failed to copy to clipboard:', err);
        return false;
      });
  },

  // Clear all debug logs
  clearDebugLogs: () => {
    delete window.apiErrorLog;
    delete window.networkErrors;
    delete window.loginErrors;
    delete window.profileErrors;
    delete window.reactErrors;
    delete window.lastAuthError;
    delete window.structuredErrors;
    delete window.consoleErrors;
    console.log('🧹 All debug logs cleared');
  },

  // Check for common issues
  performHealthCheck: () => {
    const issues = [];

    // Check authentication
    const hasToken = !!localStorage.getItem('authToken');
    if (!hasToken) {
      issues.push({ type: 'auth', message: 'No authentication token found' });
    }

    // Check for network issues
    if (!navigator.onLine) {
      issues.push({ type: 'network', message: 'Device appears to be offline' });
    }

    // Check for recent API errors
    const apiErrors = window.apiErrorLog || [];
    if (apiErrors.length > 5) {
      issues.push({ type: 'api', message: `High number of API errors: ${apiErrors.length}` });
    }

    // Check for network errors
    const networkErrors = window.networkErrors || [];
    if (networkErrors.length > 3) {
      issues.push({ type: 'network', message: `Multiple network errors detected: ${networkErrors.length}` });
    }

    return {
      healthy: issues.length === 0,
      issues,
      timestamp: new Date().toISOString()
    };
  },

  // Display debug panel (for development)
  showDebugPanel: () => {
    const debugInfo = DebugUtils.getAllDebugInfo();
    const healthCheck = DebugUtils.performHealthCheck();

    console.group('🔍 HRMS Debug Panel');
    console.log('📊 Full Debug Info:', debugInfo);
    console.log('🏥 Health Check:', healthCheck);
    console.log('📋 Summary:', {
      apiErrors: debugInfo.errorLogs.apiErrors.length,
      networkErrors: debugInfo.errorLogs.networkErrors.length,
      authToken: debugInfo.localStorage.hasAuthToken ? 'Present' : 'Missing',
      onlineStatus: navigator.onLine ? 'Online' : 'Offline'
    });
    console.groupEnd();

    return debugInfo;
  }
};

// Enhance console error capturing
(function() {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  if (!window.consoleErrors) window.consoleErrors = [];
  if (!window.consoleWarnings) window.consoleWarnings = 0;

  console.error = function(...args) {
    // Store error for debugging
    window.consoleErrors.push({
      message: args.join(' '),
      timestamp: new Date().toISOString(),
      stack: new Error().stack
    });

    // Keep only last 25 errors
    if (window.consoleErrors.length > 25) {
      window.consoleErrors = window.consoleErrors.slice(-25);
    }

    // Call original console.error
    originalError.apply(console, args);
  };

  console.warn = function(...args) {
    window.consoleWarnings++;
    originalWarn.apply(console, args);
  };
})();

// Make debug utils globally available
window.DebugUtils = DebugUtils;

export default DebugUtils;