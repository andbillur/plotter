'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { BiCharts, type BiData } from '@/components/analytics/BiCharts';
import { PrivateAnalyticsGuide } from '@/components/analytics/PrivateAnalyticsGuide';
import {
  BarChart3,
  Database,
  Loader2,
  Lock,
  PieChart,
  Shield,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Tab = 'charts' | 'desktop';

export default function AnalyticsPage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('charts');
  const [days, setDays] = useState('90');
  const [bi, setBi] = useState<BiData | null>(null);
  const [recentCosts, setRecentCosts] = useState<Record<string, unknown>[]>([]);
  const [topWaste, setTopWaste] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState<Record<string, unknown> | null>(null);

  const loadBi = useCallback(() => {
    setLoading(true);
    apiClient
      .getBiDashboard(parseInt(days, 10) || 90)
      .then((d) => {
        setBi({
          productionDaily: (d.productionDaily || []) as BiData['productionDaily'],
          costBreakdown: (d.costBreakdown || {}) as BiData['costBreakdown'],
          costPerKgTrend: (d.costPerKgTrend || []) as BiData['costPerKgTrend'],
          wasteDaily: (d.wasteDaily || []) as BiData['wasteDaily'],
          warehouseStock: (d.warehouseStock || []) as BiData['warehouseStock'],
          packagingDaily: (d.packagingDaily || []) as BiData['packagingDaily'],
          clayTrend: (d.clayTrend || []) as BiData['clayTrend'],
        });
        setRecentCosts((d.recentCosts || []) as Record<string, unknown>[]);
        setTopWaste((d.topWaste || []) as Record<string, unknown>[]);
      })
      .catch(() => setBi(null))
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => {
    loadBi();
    apiClient.getPowerBiConnection().then(setConnection).catch(() => setConnection(null));
  }, [loadBi]);

  return (
    <RoleGuard permission="analytics:dashboard">
      <div className="p-4 sm:p-6 space-y-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-slate-700" />
              Analitika
            </h1>
            <p className="text-slate-600 mt-1 text-sm flex items-center gap-1">
              <Lock className="h-4 w-4" />
              Sirli ma&apos;lumot — faqat login bilan. Ochiq Power BI embed yo&apos;q.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="border rounded-md px-3 py-2 text-sm bg-white"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            >
              <option value="30">30 kun</option>
              <option value="90">90 kun</option>
              <option value="180">180 kun</option>
              <option value="365">1 yil</option>
            </select>
            <Button variant="outline" size="sm" onClick={loadBi}>
              Yangilash
            </Button>
          </div>
        </div>

        <Card className="border-slate-200">
          <CardContent className="pt-4">
            <PrivateAnalyticsGuide onGoToCharts={() => setTab('charts')} />
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2 border-b pb-2">
          <Button variant={tab === 'charts' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('charts')}>
            <PieChart className="h-4 w-4 mr-1" />
            Grafiklar (himoyalangan)
          </Button>
          <Button variant={tab === 'desktop' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('desktop')}>
            <Database className="h-4 w-4 mr-1" />
            Power BI Desktop
          </Button>
        </div>

        {tab === 'charts' && (
          <>
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
              </div>
            ) : bi ? (
              <>
                <BiCharts data={bi} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">So&apos;nggi tannarx</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Sessiya</TableHead>
                            <TableHead>1 kg</TableHead>
                            <TableHead>Jami</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentCosts.map((r) => (
                            <TableRow key={String(r.session_code)}>
                              <TableCell className="font-mono text-xs">{String(r.session_code)}</TableCell>
                              <TableCell>
                                {Number(r.cost_per_kg_output).toLocaleString('uz-UZ')} so&apos;m
                              </TableCell>
                              <TableCell>
                                {Number(r.grand_total_cost).toLocaleString('uz-UZ')} so&apos;m
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Eng yuqori brak (kesish)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Kod</TableHead>
                            <TableHead>Brak %</TableHead>
                            <TableHead>kg</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topWaste.map((r) => (
                            <TableRow key={String(r.session_code)}>
                              <TableCell className="font-mono text-xs">{String(r.session_code)}</TableCell>
                              <TableCell>{Number(r.waste_percent).toFixed(2)}%</TableCell>
                              <TableCell>{Number(r.waste_kg).toLocaleString('uz-UZ')}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <p className="text-slate-500">Ma&apos;lumot yuklanmadi</p>
            )}
          </>
        )}

        {tab === 'desktop' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Power BI Desktop — mahalliy (sir saqlanadi)
              </CardTitle>
              <CardDescription>
                Hisobot faqat sizning kompyuteringizda. Internetga publish qilmang.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-3 text-slate-700">
              {connection ? (
                <>
                  <p>
                    <span className="text-slate-500">Server:</span>{' '}
                    <code className="bg-slate-100 px-1 rounded">{String(connection.host)}</code>
                  </p>
                  <p>
                    <span className="text-slate-500">Port:</span> {String(connection.port)} ·{' '}
                    <span className="text-slate-500">DB:</span> {String(connection.database)} ·{' '}
                    <span className="text-slate-500">SSL:</span> {String(connection.sslMode)}
                  </p>
                  <p className="font-medium mt-2">View&apos;lar (Power BI da tanlang):</p>
                  <ul className="list-disc list-inside text-xs font-mono space-y-1">
                    {((connection.views as string[]) || []).map((v) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                  <ol className="list-decimal list-inside space-y-2 mt-4 text-slate-600">
                    <li>Power BI Desktop → Get Data → PostgreSQL</li>
                    <li>Render: External Connection yoqing (faqat kerakli IP)</li>
                    <li>
                      <strong>Publish to web qilmang</strong> — aks holda sir ochiladi
                    </li>
                  </ol>
                </>
              ) : (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </RoleGuard>
  );
}
