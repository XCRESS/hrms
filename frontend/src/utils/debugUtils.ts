/**
 * Debug utilities for HRMS application
 */

interface DebugInfo {
  timestamp: string;
  userAgent: string;
  platform: string;
  language: string;
  online: boolean;
  screenResolution: string;
  windowSize: string;
  timezone: string;
  localStorage?: {
    keys: string[];
  };
  cookies?: string;
}

const DebugUtils = {
  logDebugInfo: (context: string, data: unknown): void => {
    if (import.meta.env.DEV) {
      console.log(`🔍 [${context}]`, data);
    }
  },

  logError: (context: string, error: unknown, data: Record<string, unknown> = {}): void => {
    console.error(`❌ [${context}]`, error, data);
  },

  logPerformance: (context: string, startTime: number): void => {
    if (import.meta.env.DEV) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`⚡ [${context}] Performance: ${duration.toFixed(2)}ms`);
    }
  },

  /**
   * Get all debug information - sanitized for privacy
   * Does not expose sensitive user data in production
   */
  getAllDebugInfo: (): DebugInfo => {
    const info: DebugInfo = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      online: navigator.onLine,
      screenResolution: `${screen.width}x${screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    // Only include additional debug info in development
    if (import.meta.env.DEV) {
      info.localStorage = {
        keys: Object.keys(localStorage),
        // Don't include actual values to avoid exposing tokens/sensitive data
      };
      info.cookies = document.cookie ? 'Present' : 'None';
    }

    return info;
  }
};

export default DebugUtils;
