// hooks/useAuth.ts
import { useEffect, useState } from "react";
import {jwtDecode} from "jwt-decode";
import { useNavigate } from "react-router-dom";

interface JwtPayload {
  userId: string;      // Standardized field name
  name: string;
  email: string;
  role: string;
  employee?: string;   // ObjectId as string
  employeeId?: string;
  exp?: number;
}

export default function useAuth() {
  const [user, setUser] = useState<JwtPayload | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAndSetUser = () => {
      const token = localStorage.getItem("authToken");
      if (token) {
        try {
          const decoded = jwtDecode<JwtPayload>(token);

          // Check if token has expired
          if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            console.warn("Token has expired, redirecting to login");
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
        } catch (error) {
          console.error("Invalid token, redirecting to login", error);
          localStorage.removeItem("authToken");
          setUser(null);
          navigate("/auth/login", { replace: true });
        }
      } else {
        setUser(null);
      }
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
