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

export default function ClayPage() {
  const [balance, setBalance] = useState<{ current_stock_kg: number; bag_weight_kg: number } | null>(
    null
  );
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiClient.getClayBalance(), apiClient.getClayTransactions({ limit: '30' })])
      .then(([bal, tx]) => {
        setBalance(bal);
        setTransactions(tx.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <RoleGuard permission="clay:read">
      <div className="p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Kley ombori</h1>
          <p className="text-slate-600 mt-2">Elim zaxirasi va harakatlar</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Joriy qoldiq</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <p className="text-3xl font-bold">
                {Number(balance?.current_stock_kg ?? 0).toLocaleString('uz-UZ')} kg
              </p>
            )}
            <p className="text-sm text-slate-500 mt-1">
              1 qop = {balance?.bag_weight_kg ?? 20} kg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>So&apos;nggi harakatlar</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amal</TableHead>
                  <TableHead>Miqdor (kg)</TableHead>
                  <TableHead>Qoldiq</TableHead>
                  <TableHead>Sana</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={String(t.id)}>
                    <TableCell>{String(t.operation)}</TableCell>
                    <TableCell>{Number(t.quantity_kg).toLocaleString('uz-UZ')}</TableCell>
                    <TableCell>{Number(t.balance_after_kg).toLocaleString('uz-UZ')}</TableCell>
                    <TableCell>
                      {t.created_at
                        ? new Date(String(t.created_at)).toLocaleString('uz-UZ')
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
