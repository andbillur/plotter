'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function ReportsPage() {
  const [costs, setCosts] = useState<Record<string, unknown>[]>([]);
  const [waste, setWaste] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiClient.getCostReports(), apiClient.getWasteReports()])
      .then(([c, w]) => {
        setCosts(c);
        setWaste(w);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <RoleGuard permission="analytics:dashboard">
      <div className="p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Hisobotlar</h1>
          <p className="text-slate-600 mt-2">Tannarx va brak</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Tannarx hisoboti</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sessiya</TableHead>
                      <TableHead>1 kg narxi</TableHead>
                      <TableHead>Jami</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costs.map((r) => (
                      <TableRow key={String(r.id)}>
                        <TableCell>{String(r.session_code)}</TableCell>
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
                <CardTitle>Brak hisoboti (kesish)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kod</TableHead>
                      <TableHead>Brak (kg)</TableHead>
                      <TableHead>Brak %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waste.map((r) => (
                      <TableRow key={String(r.id)}>
                        <TableCell>{String(r.session_code)}</TableCell>
                        <TableCell>{Number(r.waste_kg).toLocaleString('uz-UZ')}</TableCell>
                        <TableCell>{Number(r.waste_percent).toFixed(2)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
