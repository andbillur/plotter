'use client';

import { useAuthStore, useUIStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, Settings, LogOut, User, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { roleDisplayNames } from '@/lib/constants';

export function Header() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  const handleLogout = async () => {
    await apiClient.logout().catch(() => {});
    logout();
    router.push('/login');
  };

  return (
    <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-20 safe-area-inset-top">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="lg:hidden min-h-[44px] min-w-[44px]">
          <Menu className="h-6 w-6" />
        </Button>
        <h2 className="text-base sm:text-lg font-semibold text-slate-800 truncate">Plotter CRM</h2>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5 text-slate-600" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                <span className="text-sm font-semibold text-slate-700">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:inline text-sm font-medium text-slate-700">
                {user?.name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-semibold">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.username}</p>
                <p className="text-xs text-slate-400">
                  {user?.role ? roleDisplayNames[user.role] : ''}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
              <User className="h-4 w-4 mr-2" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Sozlamalar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="h-4 w-4 mr-2" />
              Chiqish
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
