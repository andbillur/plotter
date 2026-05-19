'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { apiClient } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function PlotPage() {
  const [plots, setPlots] = useState<Record<string, unknown>[]>([]);
  const [active, setActive] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiClient.getPlots({ limit: '30' }), apiClient.getActivePlot()])
      .then(([list, act]) => {
        setPlots(list.data);
        setActive(act);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <RoleGuard permission="plot:read">
      <div className="p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">PLOT partiyalar</h1>
          <p className="text-slate-600 mt-2">Kesilgan o&apos;ramlar yig&apos;indisi</p>
        </div>

        {active && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-900">Ochiq PLOT</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono font-bold">{String(active.plot_number)}</p>
              <p className="text-sm mt-1">
                Eni: {active.width_cm} sm — {active.total_items} dona,{' '}
                {Number(active.total_weight_kg).toLocaleString('uz-UZ')} kg
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0 pt-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Raqam</TableHead>
                    <TableHead>Eni (sm)</TableHead>
                    <TableHead>Dona</TableHead>
                    <TableHead>Og&apos;irlik (kg)</TableHead>
                    <TableHead>Holat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plots.map((p) => (
                    <TableRow key={String(p.id)}>
                      <TableCell className="font-mono">{String(p.plot_number)}</TableCell>
                      <TableCell>{p.width_cm}</TableCell>
                      <TableCell>{p.total_items}</TableCell>
                      <TableCell>{Number(p.total_weight_kg).toLocaleString('uz-UZ')}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'ochiq' ? 'default' : 'secondary'}>
                          {p.status === 'ochiq' ? 'Ochiq' : 'Yopiq'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
