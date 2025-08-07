/**
 * Debug utilities for HRMS application
 */

const DebugUtils = {
  logDebugInfo: (context, data) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 [${context}]`, data);
    }
  },

  logError: (context, error, data = {}) => {
    console.error(`❌ [${context}]`, error, data);
  },

  logPerformance: (context, startTime) => {
    if (process.env.NODE_ENV === 'development') {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`⚡ [${context}] Performance: ${duration.toFixed(2)}ms`);
    }
  }
};

export default DebugUtils;