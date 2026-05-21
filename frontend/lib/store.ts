import { create } from 'zustand';
import type { User } from './types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null, token: string | null) => void;
  logout: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  hasPermission: (code: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,
  setUser: (user, token) => {
    set({ user, token });
    if (token) localStorage.setItem('authToken', token);
    else localStorage.removeItem('authToken');
  },
  logout: () => {
    set({ user: null, token: null });
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  hasPermission: (code) => {
    const user = get().user;
    if (user?.role === 'super_admin') return true;
    const perms = user?.permissions || [];
    return perms.includes(code);
  },
}));

interface UIState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
