// hooks/useAuth.ts
import { useEffect, useState } from "react";
import {jwtDecode} from "jwt-decode";

interface JwtPayload {
  username?: string;
  email?: string;
  // add more fields as needed
}

export default function useAuth() {
  const [user, setUser] = useState<JwtPayload | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("authToken");
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        setUser(decoded);
      } catch (error) {
        console.error("Invalid token");
        setUser(null);
      }
    }
  }, []);

  return user;
}
