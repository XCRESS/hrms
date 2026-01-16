/**
 * Token Storage Abstraction
 * Provides a safe, testable interface for token management
 * - SSR-safe (checks for window)
 * - Testable (can mock easily)
 * - Centralized (single source of truth)
 * - Future-proof (easy to switch to httpOnly cookies)
 */

class TokenStorage {
  private readonly TOKEN_KEY = 'authToken';
  private readonly TOKEN_EXPIRES_KEY = 'authTokenExpiresAt';

  /**
   * Get the authentication token
   * Returns null if not found or in SSR context
   */
  get(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.warn('Failed to read token from localStorage:', error);
      return null;
    }
  }

  /**
   * Store the authentication token and parse expiration
   */
  set(token: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.TOKEN_KEY, token);

      // Parse JWT to extract expiration time
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp) {
          const expiresAt = payload.exp * 1000; // Convert to milliseconds
          localStorage.setItem(this.TOKEN_EXPIRES_KEY, expiresAt.toString());
        }
      } catch (parseError) {
        console.warn('Failed to parse token expiration:', parseError);
      }
    } catch (error) {
      console.error('Failed to store token in localStorage:', error);
    }
  }

  /**
   * Remove the authentication token and expiration
   */
  remove(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.TOKEN_EXPIRES_KEY);
    } catch (error) {
      console.warn('Failed to remove token from localStorage:', error);
    }
  }

  /**
   * Check if token is expired
   */
  isExpired(): boolean {
    if (typeof window === 'undefined') return true;

    try {
      const expiresAt = localStorage.getItem(this.TOKEN_EXPIRES_KEY);
      if (!expiresAt) return true;

      const expirationTime = parseInt(expiresAt, 10);
      return Date.now() > expirationTime;
    } catch (error) {
      console.warn('Failed to check token expiration:', error);
      return true;
    }
  }

  /**
   * Check if token exists and is not expired
   */
  exists(): boolean {
    const token = this.get();
    return !!token && !this.isExpired();
  }

  /**
   * Get the time remaining until token expires (in milliseconds)
   * Returns null if no expiration is set or token doesn't exist
   */
  getTimeUntilExpiry(): number | null {
    if (typeof window === 'undefined') return null;

    try {
      const expiresAt = localStorage.getItem(this.TOKEN_EXPIRES_KEY);
      if (!expiresAt) return null;

      const expirationTime = parseInt(expiresAt, 10);
      const timeRemaining = expirationTime - Date.now();
      return timeRemaining > 0 ? timeRemaining : 0;
    } catch (error) {
      console.warn('Failed to get time until expiry:', error);
      return null;
    }
  }
}

export const tokenStorage = new TokenStorage();
