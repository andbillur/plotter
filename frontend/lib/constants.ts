import type { UserRole } from './types';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const roleDisplayNames: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  omborchi: 'Omborchi',
  mashina_operatori: 'Mashina operatori',
  kesuvchi_ishchi: 'Kesuvchi ishchi',
  direktor: 'Direktor',
};

/** Menyu — permission kod bo'yicha filtrlanadi */
export const navigationItems = [
  { id: 'dashboard', label: 'Bosh sahifa', href: '/dashboard', icon: 'dashboard', permission: null as string | null },
  { id: 'bobins', label: 'Bobinlar', href: '/dashboard/inventory', icon: 'inventory', permission: 'bobin:read' },
  { id: 'clay', label: 'Kley', href: '/dashboard/clay', icon: 'clay', permission: 'clay:read' },
  { id: 'production', label: 'Ishlab chiqarish', href: '/dashboard/manufacturing', icon: 'factory', permission: 'production:read' },
  { id: 'cutting', label: 'Kesish', href: '/dashboard/cutting', icon: 'cut', permission: 'cutting:read' },
  { id: 'plot', label: 'PLOT', href: '/dashboard/plot', icon: 'plot', permission: 'plot:read' },
  { id: 'qr', label: 'QR Skaner', href: '/dashboard/qr-scanner', icon: 'qr', permission: null },
  { id: 'reports', label: 'Hisobotlar', href: '/dashboard/reports', icon: 'reports', permission: 'analytics:dashboard' },
  { id: 'employees', label: 'Foydalanuvchilar', href: '/dashboard/employees', icon: 'users', permission: 'users:manage' },
  { id: 'settings', label: 'Sozlamalar', href: '/dashboard/settings', icon: 'settings', permission: 'cost_config:manage' },
];

export function hasPermission(permissions: string[], code: string | null): boolean {
  if (!code) return true;
  return permissions.includes(code);
}

export const bobinStatusLabels: Record<string, string> = {
  omborxonada: 'Omborda',
  mashinada: 'Mashinada',
  ishlatilgan: 'Ishlatilgan',
  qaytarilgan: 'Qaytarilgan',
};

export const sessionStatusLabels: Record<string, string> = {
  boshlangan: 'Boshlangan',
  tugallangan: 'Tugallangan',
  bekor_qilingan: 'Bekor qilingan',
};

export const DEFAULT_PAGE_SIZE = 20;
