'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { apiClient } from '@/lib/api';
import { bobinStatusLabels } from '@/lib/constants';
import type { Bobin } from '@/lib/types';
import { Search, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
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
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    grammaj: '',
    color: 'white',
    initialWeightKg: '',
    initialLengthM: '',
    widthMm: '',
    supplierName: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    apiClient
      .getBobins({ limit: '100' })
      .then((res) => setBobins(res.data))
      .catch(() => setBobins([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiClient.createBobin({
        grammaj: parseFloat(form.grammaj),
        color: form.color,
        initialWeightKg: parseFloat(form.initialWeightKg),
        initialLengthM: parseFloat(form.initialLengthM),
        widthMm: form.widthMm ? parseFloat(form.widthMm) : undefined,
        supplierName: form.supplierName || undefined,
      });
      toast.success(`Bobin qo'shildi: ${created.qr_code}`);
      setOpen(false);
      setForm({ grammaj: '', color: 'white', initialWeightKg: '', initialLengthM: '', widthMm: '', supplierName: '' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  const filtered = bobins.filter(
    (b) =>
      b.qr_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(b.grammaj).includes(searchTerm) ||
      b.color.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <RoleGuard permission="bobin:read">
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Bobinlar</h1>
            <p className="text-slate-600 mt-1">Xomashyo — qog&apos;oz rulonlari</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Bobin qo&apos;shish
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yangi bobin qabul qilish</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Grammaj (g/m²)</Label>
                    <Input type="number" step="0.01" required value={form.grammaj} onChange={(e) => setForm({ ...form, grammaj: e.target.value })} />
                  </div>
                  <div>
                    <Label>Rang</Label>
                    <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Og&apos;irlik (kg)</Label>
                    <Input type="number" step="0.001" required value={form.initialWeightKg} onChange={(e) => setForm({ ...form, initialWeightKg: e.target.value })} />
                  </div>
                  <div>
                    <Label>Uzunlik (m)</Label>
                    <Input type="number" step="0.01" required value={form.initialLengthM} onChange={(e) => setForm({ ...form, initialLengthM: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Eni (mm) — ixtiyoriy</Label>
                  <Input type="number" value={form.widthMm} onChange={(e) => setForm({ ...form, widthMm: e.target.value })} />
                </div>
                <div>
                  <Label>Yetkazib beruvchi</Label>
                  <Input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} />
                </div>
                <Button type="submit" className="w-full">Saqlash (QR avtomatik)</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input placeholder="Qidirish..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <Card>
          <CardContent className="p-0 pt-4">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>QR</TableHead>
                    <TableHead>Grammaj</TableHead>
                    <TableHead>Rang</TableHead>
                    <TableHead>kg</TableHead>
                    <TableHead>m</TableHead>
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
                      <TableCell><Badge>{bobinStatusLabels[b.status] || b.status}</Badge></TableCell>
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
