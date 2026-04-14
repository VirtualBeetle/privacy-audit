import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

export type SessionType = 'dashboard_session' | 'google_session';

export interface SessionUser {
  type: SessionType;
  // dashboard_session
  tenantId?: string;
  tenantUserId?: string;
  // google_session
  dashboardUserId?: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Decode a JWT payload without verifying the signature (frontend only). */
function decodeJwt(token: string): any {
  try {
    const base64 = token.split('.')[1];
    return JSON.parse(atob(base64.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => {
    const raw = localStorage.getItem('session_user');
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  });

  const login = useCallback((token: string) => {
    const payload = decodeJwt(token);
    if (!payload) return;

    localStorage.setItem('session_token', token);

    const sessionUser: SessionUser =
      payload.type === 'google_session'
        ? {
            type: 'google_session',
            dashboardUserId: payload.dashboardUserId,
            email: payload.email,
            displayName: payload.displayName,
            avatarUrl: payload.avatarUrl,
          }
        : {
            type: 'dashboard_session',
            tenantId: payload.tenantId,
            tenantUserId: payload.tenantUserId,
          };

    localStorage.setItem('session_user', JSON.stringify(sessionUser));
    setUser(sessionUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('session_user');
    setUser(null);
  }, []);

  // Expire the session when the JWT expires.
  useEffect(() => {
    const token = localStorage.getItem('session_token');
    if (!token) return;

    const payload = decodeJwt(token);
    if (!payload?.exp) return;

    const msUntilExpiry = payload.exp * 1000 - Date.now();
    if (msUntilExpiry <= 0) {
      logout();
      return;
    }

    const timer = setTimeout(logout, msUntilExpiry);
    return () => clearTimeout(timer);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
