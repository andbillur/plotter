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
  { id: 'warehouse', label: 'Tayyor mahsulot', href: '/dashboard/warehouse', icon: 'warehouse', permission: 'warehouse:read' },
  { id: 'scrap', label: 'Brak / makulatura', href: '/dashboard/scrap', icon: 'scrap', permission: 'scrap:read' },
  { id: 'shipments', label: 'Jo\'natmalar', href: '/dashboard/shipments', icon: 'shipment', permission: 'shipment:read' },
  { id: 'qr', label: 'QR Skaner', href: '/dashboard/qr-scanner', icon: 'qr', permission: null },
  { id: 'analytics', label: 'Analitika', href: '/dashboard/analytics', icon: 'reports', permission: 'analytics:dashboard' },
  { id: 'employees', label: 'Foydalanuvchilar', href: '/dashboard/employees', icon: 'users', permission: 'users:manage' },
  { id: 'settings', label: 'Sozlamalar', href: '/dashboard/settings', icon: 'settings', permission: 'cost_config:manage' },
];

export function hasPermission(
  permissions: string[],
  code: string | null,
  role?: string
): boolean {
  if (!code) return true;
  if (role === 'super_admin') return true;
  return permissions.includes(code);
}

/** Bobin eni (mm) — ro'yxat va umumiy infoda */
export function formatBobinWidthMm(widthMm?: number | string | null): string {
  if (widthMm == null || widthMm === '') return '—';
  const n = Number(widthMm);
  return Number.isFinite(n) ? `${n} mm` : '—';
}

export function bobinSummaryLines(b: {
  grammaj?: number | string;
  width_mm?: number | string | null;
  current_weight_kg?: number | string;
  current_length_m?: number | string;
  color?: string;
}): string[] {
  const lines: string[] = [];
  if (b.grammaj != null && b.grammaj !== '') lines.push(`${b.grammaj} g/m²`);
  lines.push(`Eni: ${formatBobinWidthMm(b.width_mm)}`);
  if (b.current_weight_kg != null && b.current_weight_kg !== '') {
    lines.push(`${Number(b.current_weight_kg).toLocaleString('uz-UZ')} kg`);
  }
  if (b.current_length_m != null && b.current_length_m !== '') {
    lines.push(`${Number(b.current_length_m).toLocaleString('uz-UZ')} m`);
  }
  if (b.color) lines.push(String(b.color));
  return lines;
}

export function bobinSummaryText(b: Parameters<typeof bobinSummaryLines>[0]): string {
  return bobinSummaryLines(b).join(' · ');
}

/** FINISH dan keyin qoldiq bo'lsa yana ishlab chiqarish mumkin */
export const MIN_BOBIN_REMAINING_KG = 0.01;
export const MIN_BOBIN_REMAINING_M = 0.01;

export function bobinHasWarehouseStock(b: {
  current_weight_kg?: number | string;
  current_length_m?: number | string;
}): boolean {
  const kg = Number(b.current_weight_kg ?? 0);
  const m = Number(b.current_length_m ?? 0);
  return kg > MIN_BOBIN_REMAINING_KG && m > MIN_BOBIN_REMAINING_M;
}

export function bobinCanStartProduction(b: {
  status: string;
  current_weight_kg?: number | string;
  current_length_m?: number | string;
}): boolean {
  if (!bobinHasWarehouseStock(b)) return false;
  if (b.status === 'omborxonada') return true;
  if (b.status === 'ishlatilgan') return true;
  return false;
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
