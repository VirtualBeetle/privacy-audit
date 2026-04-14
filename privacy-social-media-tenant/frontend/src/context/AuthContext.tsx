import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthUser {
  user_id: string;
  role: 'user' | 'admin';
  token: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (token: string, role: 'user' | 'admin', user_id: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role') as 'user' | 'admin' | null;
    const user_id = localStorage.getItem('user_id');
    if (token && role && user_id) setUser({ token, role, user_id });
    setIsLoading(false);
  }, []);

  const login = (token: string, role: 'user' | 'admin', user_id: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('user_id', user_id);
    setUser({ token, role, user_id });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user_id');
    setUser(null);
    window.location.href = '/login';
  };

  return <AuthContext.Provider value={{ user, login, logout, isLoading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
