'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { roleDisplayNames } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Factory, Droplets, Layers, Loader2, BarChart3 } from 'lucide-react';
import { ReportExportButtons } from '@/components/analytics/ReportExportButtons';
import { BiCharts, type BiData } from '@/components/analytics/BiCharts';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [bi, setBi] = useState<BiData | null>(null);
  const [loading, setLoading] = useState(true);
  const showBi =
    user?.role === 'super_admin' ||
    user?.role === 'direktor' ||
    (user?.permissions?.includes('analytics:dashboard') ?? false);

  useEffect(() => {
    if (!user) return;
    const tasks: Promise<void>[] = [
      apiClient
        .getDashboard()
        .then(setStats)
        .catch(() => setStats(null))
        .then(() => undefined),
    ];
    if (showBi) {
      tasks.push(
        apiClient
          .getBiDashboard(30)
          .then((d) => {
            setBi({
              productionDaily: (d.productionDaily || []) as BiData['productionDaily'],
              costBreakdown: {
                paper: Number((d.costBreakdown as Record<string, number>)?.paper) || 0,
                clay: Number((d.costBreakdown as Record<string, number>)?.clay) || 0,
                electricity: Number((d.costBreakdown as Record<string, number>)?.electricity) || 0,
                labor: Number((d.costBreakdown as Record<string, number>)?.labor) || 0,
                labor_workers: Number((d.costBreakdown as Record<string, number>)?.labor_workers) || 0,
                other: Number((d.costBreakdown as Record<string, number>)?.other) || 0,
                grand_total: Number((d.costBreakdown as Record<string, number>)?.grand_total) || 0,
              },
              costPerKgTrend: (d.costPerKgTrend || []) as BiData['costPerKgTrend'],
              wasteDaily: (d.wasteDaily || []) as BiData['wasteDaily'],
              warehouseStock: (d.warehouseStock || []) as BiData['warehouseStock'],
              packagingDaily: (d.packagingDaily || []) as BiData['packagingDaily'],
              clayTrend: (d.clayTrend || []) as BiData['clayTrend'],
            });
          })
          .catch(() => setBi(null))
          .then(() => undefined)
      );
    }
    Promise.all(tasks).finally(() => setLoading(false));
  }, [showBi, user]);

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

      {showBi && bi && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Analitika (30 kun)
            </h2>
            <div className="flex flex-wrap gap-2 items-center">
              <Link href="/dashboard/analytics">
                <Button variant="outline" size="sm">
                  To&apos;liq analitika
                </Button>
              </Link>
              <ReportExportButtons days={30} />
            </div>
          </div>
          <BiCharts data={bi} compact />
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
