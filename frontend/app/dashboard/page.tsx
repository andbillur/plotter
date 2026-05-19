'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { roleDisplayNames } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Factory, Droplets, Layers, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .getDashboard()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const production = stats?.production as Record<string, number> | undefined;
  const plots = stats?.plots as Record<string, number> | undefined;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Xush kelibsiz, {user?.name?.split(' ')[0] || user?.username}
        </h1>
        <p className="text-slate-600 mt-2">
          {user?.role ? roleDisplayNames[user.role] : ''} — umumiy ko&apos;rinish
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Faol ishlab chiqarish</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{production?.active ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Bugun tugallangan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{production?.finished_today ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ochiq PLOT</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{plots?.open_plots ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Kley qoldig&apos;i (kg)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Number(stats?.clayBalanceKg ?? 0).toLocaleString('uz-UZ')}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">Tezkor havolalar</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link href="/dashboard/inventory">
            <Button variant="outline" className="w-full justify-start">
              <Package className="h-4 w-4 mr-2" /> Bobinlar
            </Button>
          </Link>
          <Link href="/dashboard/clay">
            <Button variant="outline" className="w-full justify-start">
              <Droplets className="h-4 w-4 mr-2" /> Kley
            </Button>
          </Link>
          <Link href="/dashboard/manufacturing">
            <Button variant="outline" className="w-full justify-start">
              <Factory className="h-4 w-4 mr-2" /> Ishlab chiqarish
            </Button>
          </Link>
          <Link href="/dashboard/plot">
            <Button variant="outline" className="w-full justify-start">
              <Layers className="h-4 w-4 mr-2" /> PLOT
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
