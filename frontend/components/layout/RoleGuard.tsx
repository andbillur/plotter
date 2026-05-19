'use client';

import { useAuthStore } from '@/lib/store';

interface RoleGuardProps {
  children: React.ReactNode;
  permission?: string;
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, permission, fallback }: RoleGuardProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);

  if (permission && !hasPermission(permission)) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-[40vh] p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Ruxsat yo&apos;q</h1>
            <p className="text-gray-600 mt-2">Bu sahifaga kirish huquqingiz yo&apos;q.</p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}
