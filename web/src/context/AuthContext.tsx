import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, setToken, tryRefresh } from '../lib/api';
import type { User } from '../lib/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: {
    fullName: string;
    email: string;
    password: string;
    role: 'STUDENT' | 'STORE_OWNER';
    storeName?: string;
  }) => Promise<string | null>;
  verifyOtp: (email: string, code: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await tryRefresh();
      if (token) {
        try {
          const me = await api.get<User>('/auth/me');
          setUser(me);
        } catch {
          setToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ accessToken: string; user: User }>('/auth/login', {
      email,
      password,
    });
    setToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(
    async (input: {
      fullName: string;
      email: string;
      password: string;
      role: 'STUDENT' | 'STORE_OWNER';
      storeName?: string;
    }) => {
      const payload: Record<string, unknown> = {
        fullName: input.fullName,
        email: input.email,
        password: input.password,
        role: input.role,
      };
      if (input.storeName && input.storeName.trim().length >= 2) {
        payload.storeName = input.storeName.trim();
      }
      const res = await api.post<{ id: string; devOtp?: string }>('/auth/register', payload);
      return res.devOtp ?? null;
    },
    [],
  );

  const verifyOtp = useCallback(async (email: string, code: string) => {
    const u = await api.post<User>('/auth/verify-otp', { email, code });
    return u;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => undefined);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.get<User>('/auth/me');
      setUser(me);
    } catch {
      /* keep current */
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, verifyOtp, logout, refreshUser }),
    [user, loading, login, register, verifyOtp, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
