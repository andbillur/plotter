/** Tannarx, ishchilar — faqat super_admin yoki cost_config:manage */
export function isCostAdmin(user: {
  role?: string;
  permissions?: string[];
} | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'super_admin' || (user.permissions?.includes('cost_config:manage') ?? false);
}
