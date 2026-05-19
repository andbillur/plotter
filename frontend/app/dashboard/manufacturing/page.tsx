'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { apiClient } from '@/lib/api';
import { sessionStatusLabels } from '@/lib/constants';
import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ManufacturingPage() {
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([]);
  const [active, setActive] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.getProductionSessions({ limit: '50' }),
      apiClient.getActiveProductionSessions(),
    ])
      .then(([list, act]) => {
        setSessions(list.data);
        setActive(act);
      })
      .catch(() => {
        setSessions([]);
        setActive([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <RoleGuard permission="production:read">
      <div className="p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Ishlab chiqarish</h1>
          <p className="text-slate-600 mt-2">Sessiyalar: START → kley → FINISH</p>
        </div>

        {active.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Faol sessiyalar ({active.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {active.map((s) => (
                <div key={String(s.id)} className="flex justify-between text-sm">
                  <span className="font-mono">{String(s.session_code)}</span>
                  <span>{String(s.machine_name)} — {String(s.bobin_qr)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Barcha sessiyalar</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead>Boshlangan</TableHead>
                    <TableHead>Qog&apos;oz (kg)</TableHead>
                    <TableHead>Chiqish (kg)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={String(s.id)}>
                      <TableCell className="font-mono">{String(s.session_code)}</TableCell>
                      <TableCell>
                        <Badge>
                          {sessionStatusLabels[String(s.status)] || String(s.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {s.started_at
                          ? new Date(String(s.started_at)).toLocaleString('uz-UZ')
                          : '—'}
                      </TableCell>
                      <TableCell>{Number(s.bobin_used_kg || 0).toLocaleString('uz-UZ')}</TableCell>
                      <TableCell>{Number(s.output_weight_kg || 0).toLocaleString('uz-UZ')}</TableCell>
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
