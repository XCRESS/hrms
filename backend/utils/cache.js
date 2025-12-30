/**
 * Simple in-memory cache for API responses
 * Optimized for HRMS application performance improvements
 * 
 * Usage:
 * - Holiday data (changes infrequently) - 1 hour TTL
 * - Employee basic info - 30 minutes TTL
 * - Working day calculations - 1 hour TTL
 */

class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    
    // Clean up expired entries every 10 minutes
    setInterval(() => {
      this.cleanup();
    }, 10 * 60 * 1000);
  }

  /**
   * Set a cache entry with TTL (time to live)
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
   */
  set(key, value, ttl = 5 * 60 * 1000) {
    // Clear existing timer if it exists
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set the cache entry
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttl);

    this.timers.set(key, timer);
  }

  /**
   * Get a cache entry
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if expired/not found
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Check if a key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Delete a cache entry
   * @param {string} key - Cache key
   */
  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memory: this.cache.size * 1024 // Rough estimate in bytes
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`🧹 Cache cleanup: removed ${expiredKeys.length} expired entries`);
    }
  }

  /**
   * Wrapper for async functions with caching
   * @param {string} key - Cache key
   * @param {Function} asyncFn - Async function to cache
   * @param {number} ttl - Time to live in milliseconds
   * @returns {Promise<any>} - Cached or fresh result
   */
  async getOrSet(key, asyncFn, ttl = 5 * 60 * 1000) {
    // Try to get from cache first
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - execute function and cache result
    try {
      const result = await asyncFn();
      this.set(key, result, ttl);
      return result;
    } catch (error) {
      console.error(`Cache error for key ${key}:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const cache = new SimpleCache();

// Cache TTL constants for different data types
export const TTL = {
  HOLIDAYS: 60 * 60 * 1000, // 1 hour (holidays change infrequently)
  EMPLOYEES: 10 * 60 * 1000, // 10 minutes (reasonable balance)
  WORKING_DAYS: 60 * 60 * 1000, // 1 hour (working day calculation)
  ATTENDANCE_SUMMARY: 2 * 60 * 1000, // 2 minutes (frequent but not excessive)
  USER_PROFILE: 30 * 60 * 1000, // 30 minutes (user profile changes occasionally)
  DASHBOARD_STATS: 2 * 60 * 1000 // 2 minutes (dashboard data changes frequently)
};

export default cache;