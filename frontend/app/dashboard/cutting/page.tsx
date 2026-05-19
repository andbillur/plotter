'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function CuttingPage() {
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .getCuttingSessions({ limit: '50' })
      .then((res) => setSessions(res.data))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <RoleGuard permission="cutting:read">
      <div className="p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Kesish</h1>
          <p className="text-slate-600 mt-2">Kesish sessiyalari va brak</p>
        </div>

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
                    <TableHead>Kod</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead>Kirish (kg)</TableHead>
                    <TableHead>Chiqish (kg)</TableHead>
                    <TableHead>Brak (kg)</TableHead>
                    <TableHead>Brak %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={String(s.id)}>
                      <TableCell className="font-mono">{String(s.session_code)}</TableCell>
                      <TableCell>
                        <Badge>{sessionStatusLabels[String(s.status)] || String(s.status)}</Badge>
                      </TableCell>
                      <TableCell>{Number(s.input_weight_kg).toLocaleString('uz-UZ')}</TableCell>
                      <TableCell>{Number(s.total_output_kg).toLocaleString('uz-UZ')}</TableCell>
                      <TableCell>{Number(s.waste_kg).toLocaleString('uz-UZ')}</TableCell>
                      <TableCell>{Number(s.waste_percent).toFixed(2)}%</TableCell>
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
