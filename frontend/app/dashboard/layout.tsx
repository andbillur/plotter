'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Header />
          <main className="flex-1 overflow-auto bg-slate-50 pb-[env(safe-area-inset-bottom)]">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
