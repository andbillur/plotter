'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { apiClient } from '@/lib/api';
import { BiCharts, type BiData } from '@/components/analytics/BiCharts';
import { PowerBiEmbed } from '@/components/analytics/PowerBiEmbed';
import { ReportExportButtons } from '@/components/analytics/ReportExportButtons';
import {
  BarChart3,
  Database,
  Loader2,
  MonitorPlay,
  PieChart,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Tab = 'charts' | 'powerbi' | 'desktop';

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('powerbi');
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
          costPerKgTrend: (d.costPerKgTrend as BiData['costPerKgTrend']) || [],
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
    if (tab === 'charts') loadBi();
  }, [tab, loadBi]);

  useEffect(() => {
    if (tab === 'desktop') {
      apiClient.getPowerBiConnection().then(setConnection).catch(() => setConnection(null));
    }
  }, [tab]);

  return (
    <RoleGuard permission="analytics:dashboard">
      <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Analitika</h1>
            <p className="text-slate-600 mt-1 text-sm">
              Power BI hisobot — saytda. CRM grafiklar — alohida tab.
            </p>
          </div>
          {tab === 'charts' && (
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
              <ReportExportButtons days={parseInt(days, 10) || 90} />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-b pb-2">
          <Button variant={tab === 'powerbi' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('powerbi')}>
            <MonitorPlay className="h-4 w-4 mr-1" />
            Power BI hisobot
          </Button>
          <Button variant={tab === 'charts' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('charts')}>
            <PieChart className="h-4 w-4 mr-1" />
            CRM grafiklar
          </Button>
          <Button variant={tab === 'desktop' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('desktop')}>
            <Database className="h-4 w-4 mr-1" />
            PostgreSQL ulanish
          </Button>
        </div>

        {tab === 'powerbi' && <PowerBiEmbed />}

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
                Power BI Desktop — PostgreSQL
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3 text-slate-700">
              {connection ? (
                <>
                  <p>
                    Server: <code className="bg-slate-100 px-1 rounded">{String(connection.host)}</code> ·
                    Port: {String(connection.port)} · DB: {String(connection.database)}
                  </p>
                  <ul className="list-disc list-inside text-xs font-mono space-y-1">
                    {((connection.views as string[]) || []).map((v) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                  <p className="text-slate-500 text-xs">
                    Saytda ko‘rish uchun hisobotni Power BI Service ga publish qiling va «Power BI
                    hisobot» tabida embed havolani qo‘ying.
                  </p>
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
