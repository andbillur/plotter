'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { apiClient } from '@/lib/api';
import { Plus, Loader2, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const COLORS = ['white', 'cream', 'blue', 'grey', 'other'];

export default function WarehousePage() {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());
  const [products, setProducts] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState({ n: 0, kg: 0 });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ widthCm: '', weightKg: '', color: 'white', lengthM: '' });

  const load = useCallback(() => {
    Promise.all([apiClient.getWarehouseProducts({ limit: '100' }), apiClient.getWarehouseSummary()])
      .then(([list, sum]) => {
        setProducts(list.data);
        setTotal(sum.total as { n: number; kg: number });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (p: Record<string, unknown>) => {
    if (!confirm(`${p.qr_code} — ombordan o'chirilsinmi?`)) return;
    try {
      await apiClient.deleteWarehouseProduct(String(p.id));
      toast.success('Mahsulot o\'chirildi');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const p = await apiClient.registerWarehouseProduct({
        widthCm: parseFloat(form.widthCm),
        weightKg: parseFloat(form.weightKg),
        color: form.color,
        lengthM: form.lengthM ? parseFloat(form.lengthM) : undefined,
      });
      toast.success(`Omborga qo'shildi: ${(p as { qr_code: string }).qr_code}`);
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  return (
    <RoleGuard permission="warehouse:read">
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Tayyor mahsulot ombori</h1>
            <p className="text-slate-600">kg, o&apos;lcham, rang, QR kod</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Mahsulot qo&apos;shish</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Tayyor mahsulot (QR avtomatik)</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Eni (sm)</Label>
                    <Input required type="number" value={form.widthCm} onChange={(e) => setForm({ ...form, widthCm: e.target.value })} />
                  </div>
                  <div>
                    <Label>Og&apos;irlik (kg)</Label>
                    <Input required type="number" step="0.001" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Rang</Label>
                  <Input list="wh-colors" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                  <datalist id="wh-colors">{COLORS.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <Button type="submit" className="w-full">Saqlash</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{total.n} dona — {Number(total.kg).toLocaleString('uz-UZ')} kg</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0 pt-4">
            {loading ? (
              <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>QR</TableHead>
                    <TableHead>Eni (sm)</TableHead>
                    <TableHead>kg</TableHead>
                    <TableHead>Rang</TableHead>
                    {isSuperAdmin && <TableHead className="w-12" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={String(p.id)}>
                      <TableCell className="font-mono text-xs">{String(p.qr_code)}</TableCell>
                      <TableCell>{p.width_cm}</TableCell>
                      <TableCell>{Number(p.weight_kg).toLocaleString('uz-UZ')}</TableCell>
                      <TableCell>{String(p.color || 'white')}</TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-600"
                            onClick={() => handleDelete(p)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
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
