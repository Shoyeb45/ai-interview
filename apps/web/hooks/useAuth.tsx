'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/apiClient';

export type User = {
  id: number;
  name: string;
  email: string;
}
async function fetchCurrentUser() {
  const user = localStorage.getItem('user');
  if (user) {
    return JSON.parse(user) as User;
  }

  return await apiClient.get<User>('/auth/me');
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = apiClient.getAccessToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();
        localStorage.setItem('user', JSON.stringify(currentUser));

        if (currentUser) {
          setUser(currentUser);
        } else {
          // Token invalid → clear and redirect
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setUser(null);
        }
      } catch (err) {
        console.error('Auth check failed', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    localStorage.removeItem('user');
    apiClient.delete('/auth/signout');
    router.push('/login');
  };

  return { user, loading, logout };
};