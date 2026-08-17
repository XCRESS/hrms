/**
 * API Configuration for HRMS Buddy
 * Handles environment detection and endpoint management
 *
 * NOTE: this module keeps its own endpoint list, separate from the
 * VITE_API_URL used by `lib/axios.ts`. Prefer the axios instance for normal
 * API calls; this exists for the chatbot's primary/fallback retry behaviour.
 */

export const API_CONFIG = {
  // API Endpoints
  ENDPOINTS: {
    LOCAL: 'http://localhost:4000/api',
    PRODUCTION: 'https://hrms-backend.up.railway.app/api'
  },

  // Timeout settings - Increased for OpenAI function calling
  TIMEOUT: {
    PRIMARY: 30000,    // 30 seconds for primary endpoint (OpenAI can be slow)
    FALLBACK: 45000    // 45 seconds for fallback endpoint
  }
} as const;

export interface EnvironmentInfo {
  isDev: boolean;
  hostname: string;
  port: string;
  mode: string;
  primaryEndpoint: string;
  fallbackEndpoint: string;
}

export interface ApiCallOptions extends Omit<RequestInit, 'signal'> {
  timeout?: number;
}

/**
 * Detect if we're in development environment
 */
export const isDevelopment = (): boolean => {
  return import.meta.env.DEV ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '192.168.1.1' || // Local network
    window.location.port === '5173' ||            // Vite dev server
    window.location.port === '3000';              // React dev server
};

/**
 * Get the primary API endpoint based on environment
 */
export const getPrimaryEndpoint = (): string => {
  return isDevelopment()
    ? API_CONFIG.ENDPOINTS.LOCAL
    : API_CONFIG.ENDPOINTS.PRODUCTION;
};

/**
 * Get the fallback API endpoint (opposite of primary)
 */
export const getFallbackEndpoint = (): string => {
  return isDevelopment()
    ? API_CONFIG.ENDPOINTS.PRODUCTION
    : API_CONFIG.ENDPOINTS.LOCAL;
};

/** Run a fetch with an abort-based timeout. */
const fetchWithTimeout = async (
  url: string,
  options: ApiCallOptions,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { timeout: _timeout, ...init } = options;
    const response = await fetch(url, { ...init, signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Make API call with automatic fallback
 */
export const apiCallWithFallback = async (
  endpoint: string,
  options: ApiCallOptions = {}
): Promise<Response> => {
  const primaryUrl = `${getPrimaryEndpoint()}${endpoint}`;
  const fallbackUrl = `${getFallbackEndpoint()}${endpoint}`;

  try {
    return await fetchWithTimeout(
      primaryUrl,
      options,
      options.timeout ?? API_CONFIG.TIMEOUT.PRIMARY
    );
  } catch (primaryError) {
    const primaryMessage =
      primaryError instanceof Error ? primaryError.message : String(primaryError);

    try {
      return await fetchWithTimeout(fallbackUrl, options, API_CONFIG.TIMEOUT.FALLBACK);
    } catch (fallbackError) {
      const fallbackMessage =
        fallbackError instanceof Error ? fallbackError.message : String(fallbackError);

      throw new Error(
        `Both API endpoints are unavailable:\n` +
        `• Primary (${isDevelopment() ? 'Local' : 'Production'}): ${primaryMessage}\n` +
        `• Fallback (${isDevelopment() ? 'Production' : 'Local'}): ${fallbackMessage}`
      );
    }
  }
};

/**
 * Get environment info for debugging
 */
export const getEnvironmentInfo = (): EnvironmentInfo => {
  return {
    isDev: isDevelopment(),
    hostname: window.location.hostname,
    port: window.location.port,
    mode: import.meta.env.MODE,
    primaryEndpoint: getPrimaryEndpoint(),
    fallbackEndpoint: getFallbackEndpoint()
  };
};
