'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/apiClient';
import { getCurrentUser } from '@/lib/mockApi';
import { hasRoleInRoles } from '@/lib/roles';
import type { User } from '@/types/schema';
import { toast } from 'sonner';

const STORAGE_USER = 'user';

async function fetchCurrentUser(): Promise<User | null> {
  const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_USER) : null;
  if (stored) {
    try {
      return JSON.parse(stored) as User;
    } catch {
      // ignore
    }
  }
  const token = apiClient.getAccessToken();
  if (!token) return null;

  try {
    const user = await apiClient.get<User>('/auth/me');
    if (user && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_USER, JSON.stringify(user));
    }
    return user ?? null;
  } catch {
    // Fallback to mock when backend /auth/me is not available
    const mockUser = await getCurrentUser();
    if (mockUser && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_USER, JSON.stringify(mockUser));
    }
    return mockUser;
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    const token = apiClient.getAccessToken();
    if (!token) {
      setUser(null);
      if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_USER);
      setLoading(false);
      return;
    }
    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error('Auth check failed', err);
      toast.error('Please login again.');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const logout = () => {
    if (apiClient.getAccessToken()) {
      void apiClient.delete('/auth/signout').catch(() => {});
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem(STORAGE_USER);
    }
    setUser(null);
    router.push('/');
  };

  /** Derived from /auth/me roles (supports string[] or { code }[]) */
  const isHiringManager = hasRoleInRoles(
    user?.roles as unknown[] | undefined,
    'HIRING_MANAGER'
  );

  const hasRole = useCallback(
    (code: 'USER' | 'HIRING_MANAGER') =>
      hasRoleInRoles(user?.roles as unknown[] | undefined, code),
    [user?.roles]
  );

  return {
    user,
    loading,
    logout,
    isHiringManager,
    hasRole,
    refreshUser,
  };
}
