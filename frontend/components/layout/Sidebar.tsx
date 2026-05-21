'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, useUIStore } from '@/lib/store';
import { navigationItems, roleDisplayNames, hasPermission } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Package,
  Factory,
  Scissors,
  Layers,
  QrCode,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Droplets,
  Truck,
  Boxes,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  inventory: Package,
  clay: Droplets,
  factory: Factory,
  cut: Scissors,
  plot: Layers,
  warehouse: Boxes,
  shipment: Truck,
  qr: QrCode,
  reports: BarChart3,
  users: Users,
  settings: Settings,
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);

  if (!user) return null;

  const perms = user.permissions || [];
  const visibleItems = navigationItems.filter((item) =>
    hasPermission(perms, item.permission, user.role)
  );

  const handleLogout = async () => {
    const { apiClient } = await import('@/lib/api');
    await apiClient.logout().catch(() => {});
    logout();
    router.push('/login');
  };

  return (
    <>
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white transition-all duration-300 z-40 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="px-6 py-8 border-b border-slate-800">
            <h1 className="text-xl font-bold">Plotter CRM</h1>
            <p className="text-xs text-slate-400 mt-1">Qog&apos;oz fabrikasi</p>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
            {visibleItems.map((item) => {
              const Icon = iconMap[item.icon] || LayoutDashboard;
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link key={item.id} href={item.href} onClick={() => setSidebarOpen(false)}>
                  <button
                    type="button"
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors touch-manipulation min-h-[44px] ${
                      isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-800 p-4 space-y-4">
            <div className="px-4 py-3 bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-400">Foydalanuvchi</p>
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-xs text-slate-400 mt-1">
                {roleDisplayNames[user.role] || user.role}
              </p>
            </div>
            <Button variant="destructive" className="w-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Chiqish
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={toggleSidebar} />
      )}
    </>
  );
}
