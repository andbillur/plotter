'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { apiClient } from '@/lib/api';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, setUser, setLoading } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;

    const checkAuth = async () => {
      const storedToken = localStorage.getItem('authToken');
      if (!storedToken) {
        router.push('/login');
        setReady(true);
        setLoading(false);
        return;
      }

      apiClient.setToken(storedToken);
      try {
        const currentUser = await apiClient.getCurrentUser();
        setUser(currentUser, storedToken);
      } catch {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        router.push('/login');
      } finally {
        setReady(true);
        setLoading(false);
      }
    };

    checkAuth();
  }, [mounted, setUser, setLoading, router]);

  if (!mounted || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
