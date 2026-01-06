/**
 * HTTP Client using Ky
 * Lightweight HTTP client for external API calls
 */

import ky, { type KyInstance, type Options } from 'ky';
import logger, { logExternalAPI } from './logger.js';

/**
 * Create a configured ky instance
 */
const createHttpClient = (baseOptions: Options = {}): KyInstance => {
  return ky.create({
    timeout: 30000, // 30 seconds default timeout
    retry: {
      limit: 2,
      methods: ['get', 'put', 'head', 'delete', 'options', 'trace'],
      statusCodes: [408, 413, 429, 500, 502, 503, 504],
    },
    hooks: {
      beforeRequest: [
        (request) => {
          logger.debug(
            {
              method: request.method,
              url: request.url,
            },
            'HTTP request initiated'
          );
        },
      ],
      afterResponse: [
        async (request, options, response) => {
          const duration = performance.now();
          const service = new URL(request.url).hostname;

          logExternalAPI(
            service,
            request.url,
            request.method,
            response.status,
            duration
          );

          return response;
        },
      ],
      beforeError: [
        (error) => {
          const { request, response } = error;
          const service = new URL(request.url).hostname;

          logger.error(
            {
              service,
              url: request.url,
              method: request.method,
              status: response?.status,
              error: error.message,
            },
            'HTTP request failed'
          );

          return error;
        },
      ],
    },
    ...baseOptions,
  });
};

/**
 * Default HTTP client instance
 */
export const httpClient = createHttpClient();

/**
 * Create a custom HTTP client with specific options
 */
export const createClient = createHttpClient;

/**
 * Convenience methods for common HTTP operations
 */
export const http = {
  /**
   * GET request
   */
  async get<T = unknown>(url: string, options?: Options): Promise<T> {
    return httpClient.get(url, options).json<T>();
  },

  /**
   * POST request
   */
  async post<T = unknown>(url: string, data?: unknown, options?: Options): Promise<T> {
    return httpClient.post(url, { json: data, ...options }).json<T>();
  },

  /**
   * PUT request
   */
  async put<T = unknown>(url: string, data?: unknown, options?: Options): Promise<T> {
    return httpClient.put(url, { json: data, ...options }).json<T>();
  },

  /**
   * PATCH request
   */
  async patch<T = unknown>(url: string, data?: unknown, options?: Options): Promise<T> {
    return httpClient.patch(url, { json: data, ...options }).json<T>();
  },

  /**
   * DELETE request
   */
  async delete<T = unknown>(url: string, options?: Options): Promise<T> {
    return httpClient.delete(url, options).json<T>();
  },

  /**
   * HEAD request
   */
  async head(url: string, options?: Options): Promise<Response> {
    return httpClient.head(url, options);
  },
};

export default http;
