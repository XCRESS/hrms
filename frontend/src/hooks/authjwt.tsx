// hooks/useAuth.ts
import { useEffect, useState } from "react";
import {jwtDecode} from "jwt-decode";
import { useNavigate } from "react-router";

interface JwtPayload {
  userId: string;      // Standardized field name
  name: string;
  email: string;
  role: string;
  employee?: string;   // ObjectId as string
  employeeId?: string;
  exp?: number;
}

/**
 * Decode the stored token into a user, or null if absent/expired/invalid.
 * Pure and synchronous so it can seed state during the first render.
 */
function readUserFromToken(): JwtPayload | null {
  const token = localStorage.getItem("authToken");
  if (!token) return null;

  try {
    const decoded = jwtDecode<JwtPayload>(token);
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

export default function useAuth() {
  // Seeded from the token during the first render rather than left null until
  // an effect runs. Consumers gate their UI on this value, and starting at null
  // meant "not resolved yet" was indistinguishable from "not permitted" — pages
  // flashed an Access Denied screen for a frame before auth resolved, and
  // queries gated on the role were disabled on that first pass.
  const [user, setUser] = useState<JwtPayload | null>(readUserFromToken);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAndSetUser = () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setUser(null);
        return;
      }

      const decoded = readUserFromToken();

      // readUserFromToken returns null for both an expired and a malformed
      // token; either way the stored token is no longer usable.
      if (!decoded) {
        console.warn("Token expired or invalid, redirecting to login");
        localStorage.removeItem("authToken");
        setUser(null);
        navigate("/auth/login", { replace: true });
        return;
      }

      // Only update user if it actually changed to prevent unnecessary re-renders
      setUser(prev => {
        if (!prev || JSON.stringify(prev) !== JSON.stringify(decoded)) {
          return decoded;
        }
        return prev;
      });
    };

    // Listen for token refresh events from API
    const handleTokenRefresh = (event: CustomEvent) => {
      const token = event.detail?.token;
      if (token) {
        try {
          console.log('🔄 Token refreshed, updating user state');
          const decoded = jwtDecode<JwtPayload>(token);
          setUser(decoded);
        } catch (error) {
          console.error('Failed to decode refreshed token', error);
        }
      }
    };

    window.addEventListener('tokenRefreshed', handleTokenRefresh as EventListener);

    // Check immediately on component mount
    checkAndSetUser();

    // Also set up an interval to periodically check (every 5 minutes)
    const interval = setInterval(checkAndSetUser, 300000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('tokenRefreshed', handleTokenRefresh as EventListener);
    };
  }, [navigate]);

  return user;
}
