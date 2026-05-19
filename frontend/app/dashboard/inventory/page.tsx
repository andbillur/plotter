'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { apiClient } from '@/lib/api';
import { bobinStatusLabels } from '@/lib/constants';
import type { Bobin } from '@/lib/types';
import { Search, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function InventoryPage() {
  const [bobins, setBobins] = useState<Bobin[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .getBobins({ limit: '100' })
      .then((res) => setBobins(res.data))
      .catch(() => setBobins([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = bobins.filter(
    (b) =>
      b.qr_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(b.grammaj).includes(searchTerm) ||
      b.color.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalWeight = bobins.reduce((s, b) => s + Number(b.current_weight_kg), 0);

  return (
    <RoleGuard permission="bobin:read">
      <div className="p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Bobinlar (xomashyo)</h1>
          <p className="text-slate-600 mt-2">Qog&apos;oz rulonlari ombori</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Jami bobinlar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bobins.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Jami og&apos;irlik (kg)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalWeight.toLocaleString('uz-UZ')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Omborda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {bobins.filter((b) => b.status === 'omborxonada').length}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="QR, grammaj yoki rang bo&apos;yicha qidirish..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-8 text-center text-slate-500">Bobinlar topilmadi</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>QR</TableHead>
                    <TableHead>Grammaj</TableHead>
                    <TableHead>Rang</TableHead>
                    <TableHead>Og&apos;irlik (kg)</TableHead>
                    <TableHead>Uzunlik (m)</TableHead>
                    <TableHead>Holat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">{b.qr_code}</TableCell>
                      <TableCell>{b.grammaj}</TableCell>
                      <TableCell>{b.color}</TableCell>
                      <TableCell>{Number(b.current_weight_kg).toLocaleString('uz-UZ')}</TableCell>
                      <TableCell>{Number(b.current_length_m).toLocaleString('uz-UZ')}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {bobinStatusLabels[b.status] || b.status}
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
