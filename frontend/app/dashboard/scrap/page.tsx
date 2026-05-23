'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Loader2, Plus, Recycle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Warehouse = 'brak' | 'makulatura';

const MOVEMENTS_BRAK = [
  { value: 'kirim', label: 'Kirim' },
  { value: 'kirim_savdo', label: 'Savdo — sotib olish' },
  { value: 'chiqim', label: 'Chiqim' },
  { value: 'chiqim_ishlatish', label: 'Qayta ishlatish (ishlab chiqarish)' },
];

const MOVEMENTS_MAK = [
  { value: 'kirim', label: 'Kirim' },
  { value: 'kirim_savdo', label: 'Savdo — sotib olish' },
  { value: 'chiqim', label: 'Chiqim' },
  { value: 'chiqim_sotish', label: 'Sotish (sota, so\'m/kg)' },
];

const MOVEMENT_LABELS: Record<string, string> = {
  kirim: 'Kirim',
  kirim_savdo: 'Savdo kirim',
  chiqim: 'Chiqim',
  chiqim_sotish: 'Sotish',
  chiqim_ishlatish: 'Qayta ishlatish',
  kesishdan: 'Kesishdan',
};

export default function ScrapWarehousePage() {
  const canManage = useAuthStore((s) => s.hasPermission('scrap:manage'));
  const [tab, setTab] = useState<Warehouse>('brak');
  const [stock, setStock] = useState<Record<string, number>>({ brak: 0, makulatura: 0 });
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    movementType: 'kirim',
    quantityKg: '',
    pricePerKg: '',
    counterparty: '',
    notes: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiClient.getScrapStock(),
      apiClient.getScrapTransactions({ warehouseType: tab, limit: '40' }),
    ])
      .then(([st, tx]) => {
        const map: Record<string, number> = { brak: 0, makulatura: 0 };
        st.forEach((row) => {
          map[row.warehouse_type] = Number(row.current_weight_kg);
        });
        setStock(map);
        setTransactions(tx.data);
      })
      .catch(() => {
        setTransactions([]);
      })
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const movements = tab === 'brak' ? MOVEMENTS_BRAK : MOVEMENTS_MAK;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(form.quantityKg);
    if (!qty || qty <= 0) {
      toast.error('Og\'irlik kiriting');
      return;
    }
    try {
      await apiClient.addScrapMovement({
        warehouseType: tab,
        movementType: form.movementType,
        quantityKg: qty,
        pricePerKg: form.pricePerKg ? parseFloat(form.pricePerKg) : undefined,
        counterparty: form.counterparty || undefined,
        notes: form.notes || undefined,
      });
      toast.success('Saqlandi');
      setOpen(false);
      setForm({
        movementType: tab === 'brak' ? 'kirim' : 'kirim',
        quantityKg: '',
        pricePerKg: '',
        counterparty: '',
        notes: '',
      });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  return (
    <RoleGuard permission="scrap:read">
      <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Brak va makulatura ombori</h1>
            <p className="text-slate-600 text-sm mt-1">
              Brak — qayta ishlatish mumkin. Makulatura (otxod) — faqat sotish, ishlatilmaydi.
            </p>
          </div>
          {canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-1" />
                  Kirim / chiqim
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {tab === 'brak' ? 'Brak ombori' : 'Makulatura ombori'} — harakat
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <Label>Harakat turi</Label>
                    <Select
                      value={form.movementType}
                      onValueChange={(v) => setForm({ ...form, movementType: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {movements.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Og&apos;irlik (kg)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      className="mt-1"
                      value={form.quantityKg}
                      onChange={(e) => setForm({ ...form, quantityKg: e.target.value })}
                      required
                    />
                  </div>
                  {(form.movementType === 'chiqim_sotish' ||
                    form.movementType === 'kirim_savdo') && (
                    <>
                      <div>
                        <Label>
                          {form.movementType === 'chiqim_sotish'
                            ? 'Sotish narxi (so\'m/kg)'
                            : 'Sotib olish narxi (so\'m/kg, ixtiyoriy)'}
                        </Label>
                        <Input
                          type="number"
                          step="1"
                          className="mt-1"
                          value={form.pricePerKg}
                          onChange={(e) => setForm({ ...form, pricePerKg: e.target.value })}
                          required={form.movementType === 'chiqim_sotish'}
                        />
                      </div>
                      {form.movementType === 'kirim_savdo' && (
                        <div>
                          <Label>Kimdan (kontragent)</Label>
                          <Input
                            className="mt-1"
                            value={form.counterparty}
                            onChange={(e) => setForm({ ...form, counterparty: e.target.value })}
                            required
                          />
                        </div>
                      )}
                    </>
                  )}
                  <div>
                    <Label>Izoh</Label>
                    <Input
                      className="mt-1"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Saqlash
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={tab === 'brak' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('brak')}
          >
            <Recycle className="h-4 w-4 mr-1" />
            Brak ombori
          </Button>
          <Button
            variant={tab === 'makulatura' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('makulatura')}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Makulatura (otxod)
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className={tab === 'brak' ? 'border-green-400 ring-1 ring-green-200' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Brak qoldiq</CardTitle>
              <CardDescription>Qayta ishlatish mumkin</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stock.brak.toLocaleString('uz-UZ')} kg</p>
            </CardContent>
          </Card>
          <Card className={tab === 'makulatura' ? 'border-orange-400 ring-1 ring-orange-200' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Makulatura qoldiq</CardTitle>
              <CardDescription>Faqat sotish (sota)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stock.makulatura.toLocaleString('uz-UZ')} kg</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {tab === 'brak' ? 'Brak' : 'Makulatura'} — harakatlar tarixi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sana</TableHead>
                    <TableHead>Turi</TableHead>
                    <TableHead>kg</TableHead>
                    <TableHead>Summa</TableHead>
                    <TableHead>Qoldiq</TableHead>
                    <TableHead>Izoh</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={String(t.id)}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {t.created_at
                          ? new Date(String(t.created_at)).toLocaleString('uz-UZ')
                          : '—'}
                      </TableCell>
                      <TableCell>{MOVEMENT_LABELS[String(t.movement_type)] || String(t.movement_type)}</TableCell>
                      <TableCell className="font-semibold">{Number(t.quantity_kg).toLocaleString('uz-UZ')}</TableCell>
                      <TableCell>
                        {t.total_amount != null
                          ? `${Number(t.total_amount).toLocaleString('uz-UZ')} so'm`
                          : '—'}
                      </TableCell>
                      <TableCell>{Number(t.balance_after_kg).toLocaleString('uz-UZ')}</TableCell>
                      <TableCell className="text-xs max-w-[140px] truncate">
                        {String(t.cutting_session_code || t.counterparty || t.notes || '—')}
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
