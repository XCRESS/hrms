// hooks/useAuth.ts
import { useEffect, useState } from "react";
import {jwtDecode} from "jwt-decode";

interface JwtPayload {
  id?: string;
  _id?: string;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
  employeeId?: string;
  exp?: number;
}

export default function useAuth() {
  const [user, setUser] = useState<JwtPayload | null>(null);

  useEffect(() => {
    const checkAndSetUser = () => {
      const token = localStorage.getItem("authToken");
      if (token) {
        try {
          const decoded = jwtDecode<JwtPayload>(token);
          
          // Check if token has expired
          if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            console.warn("Token has expired, logging out");
            localStorage.removeItem("authToken");
            setUser(null);
            return;
          }
          
          setUser(decoded);
        } catch (error) {
          console.error("Invalid token", error);
          localStorage.removeItem("authToken");
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };
    
    // Check immediately on component mount
    checkAndSetUser();
    
    // Also set up an interval to periodically check (every minute)
    const interval = setInterval(checkAndSetUser, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return user;
}
