'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { apiClient } from '@/lib/api';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ClayPage() {
  const [balance, setBalance] = useState<{ current_stock_kg: number; bag_weight_kg: number } | null>(null);
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [bags, setBags] = useState('1');
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    Promise.all([apiClient.getClayBalance(), apiClient.getClayTransactions({ limit: '30' })])
      .then(([bal, tx]) => {
        setBalance(bal);
        setTransactions(tx.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.receiveClay({ quantityBags: parseInt(bags, 10) });
      toast.success('Kley kirim qilindi');
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  return (
    <RoleGuard permission="clay:read">
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Kley ombori</h1>
            <p className="text-slate-600">Elim zaxirasi</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Kley kirim</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Kley kirim (qop)</DialogTitle></DialogHeader>
              <form onSubmit={handleReceive} className="space-y-4">
                <div>
                  <Label>Qop soni (har biri ~{balance?.bag_weight_kg || 20} kg)</Label>
                  <Input type="number" min="1" value={bags} onChange={(e) => setBags(e.target.value)} />
                </div>
                <Button type="submit" className="w-full">Kirim qilish</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader><CardTitle>Joriy qoldiq</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Loader2 className="animate-spin" /> : (
              <p className="text-4xl font-bold">{Number(balance?.current_stock_kg ?? 0).toLocaleString('uz-UZ')} kg</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Harakatlar</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amal</TableHead>
                  <TableHead>kg</TableHead>
                  <TableHead>Sana</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={String(t.id)}>
                    <TableCell>{String(t.operation)}</TableCell>
                    <TableCell>{Number(t.quantity_kg).toLocaleString('uz-UZ')}</TableCell>
                    <TableCell>{t.created_at ? new Date(String(t.created_at)).toLocaleString('uz-UZ') : '—'}</TableCell>
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
