import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { jwtDecode } from 'jwt-decode';
import { tokenStorage } from '@/lib/tokenStorage';

export type Role = 'admin' | 'hr' | 'employee';

interface TokenPayload {
  role?: string;
  exp?: number;
}

/**
 * Read the current role straight from the stored JWT.
 *
 * Deliberately synchronous: this runs during render on every guarded
 * navigation, so it must not fetch, await, or trigger an effect. Decoding an
 * already-in-memory token is a few microseconds and adds no routing latency.
 */
export function getCurrentRole(): Role | null {
  const token = tokenStorage.get();
  if (!token) return null;

  try {
    const { role } = jwtDecode<TokenPayload>(token);
    if (role === 'admin' || role === 'hr' || role === 'employee') {
      return role;
    }
    return null;
  } catch {
    return null;
  }
}

interface RequireRoleProps {
  /** Roles permitted to render this branch of the route tree. */
  roles: readonly Role[];
  children: ReactNode;
}

/**
 * Route-level authorization guard.
 *
 * The backend is still the security boundary — this exists so an unauthorized
 * user is redirected instead of rendering a page shell that then fails every
 * API call with 403.
 */
export default function RequireRole({ roles, children }: RequireRoleProps) {
  const location = useLocation();

  if (!tokenStorage.exists()) {
    return (
      <Navigate
        to="/auth/login?reason=session_expired"
        state={{ from: location }}
        replace
      />
    );
  }

  const role = getCurrentRole();

  if (!role) {
    return (
      <Navigate
        to="/auth/login?reason=session_expired"
        state={{ from: location }}
        replace
      />
    );
  }

  if (!roles.includes(role)) {
    // Authenticated but not permitted — send them somewhere they can use.
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
