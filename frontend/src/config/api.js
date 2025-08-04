/**
 * API Configuration for HRMS Buddy
 * Handles environment detection and endpoint management
 */

export const API_CONFIG = {
  // API Endpoints
  ENDPOINTS: {
    LOCAL: 'http://localhost:8000',
    PRODUCTION: 'https://hr-buddy-production.up.railway.app'
  },
  
  // Timeout settings
  TIMEOUT: {
    PRIMARY: 10000,    // 10 seconds for primary endpoint
    FALLBACK: 15000    // 15 seconds for fallback endpoint
  }
};

/**
 * Detect if we're in development environment
 */
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development' || 
         window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname === '192.168.1.1' || // Local network
         window.location.port === '5173' ||              // Vite dev server
         window.location.port === '3000';                // React dev server
};

/**
 * Get the primary API endpoint based on environment
 */
export const getPrimaryEndpoint = () => {
  return isDevelopment() 
    ? API_CONFIG.ENDPOINTS.LOCAL 
    : API_CONFIG.ENDPOINTS.PRODUCTION;
};

/**
 * Get the fallback API endpoint (opposite of primary)
 */
export const getFallbackEndpoint = () => {
  return isDevelopment() 
    ? API_CONFIG.ENDPOINTS.PRODUCTION 
    : API_CONFIG.ENDPOINTS.LOCAL;
};

/**
 * Make API call with automatic fallback
 */
export const apiCallWithFallback = async (endpoint, options = {}) => {
  const primaryUrl = `${getPrimaryEndpoint()}${endpoint}`;
  const fallbackUrl = `${getFallbackEndpoint()}${endpoint}`;
  
  const requestOptions = {
    timeout: API_CONFIG.TIMEOUT.PRIMARY,
    ...options
  };
  
  try {
    console.log(`🔄 [API] Trying primary: ${primaryUrl}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), requestOptions.timeout);
    
    const response = await fetch(primaryUrl, {
      ...requestOptions,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log(`✅ [API] Primary successful: ${primaryUrl}`);
    return response;
    
  } catch (primaryError) {
    console.warn(`❌ [API] Primary failed: ${primaryError.message}`);
    console.log(`🔄 [API] Trying fallback: ${fallbackUrl}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT.FALLBACK);
      
      const response = await fetch(fallbackUrl, {
        ...requestOptions,
        signal: controller.signal,
        timeout: undefined // Remove timeout from options for fallback
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log(`✅ [API] Fallback successful: ${fallbackUrl}`);
      console.info(`ℹ️  [API] Using fallback endpoint. Consider checking primary endpoint.`);
      return response;
      
    } catch (fallbackError) {
      console.error(`❌ [API] Both endpoints failed:`, {
        primary: primaryError.message,
        fallback: fallbackError.message,
        primaryUrl,
        fallbackUrl
      });
      
      throw new Error(`Both API endpoints are unavailable:\n• Primary (${isDevelopment() ? 'Local' : 'Production'}): ${primaryError.message}\n• Fallback (${isDevelopment() ? 'Production' : 'Local'}): ${fallbackError.message}`);
    }
  }
};

/**
 * Get environment info for debugging
 */
export const getEnvironmentInfo = () => {
  return {
    isDev: isDevelopment(),
    hostname: window.location.hostname,
    port: window.location.port,
    nodeEnv: process.env.NODE_ENV,
    primaryEndpoint: getPrimaryEndpoint(),
    fallbackEndpoint: getFallbackEndpoint()
  };
};

// Log environment info on load (only in development)
if (isDevelopment()) {
  console.log('🌐 [API Config] Environment Info:', getEnvironmentInfo());
}