'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { apiClient } from '@/lib/api';
import { bobinStatusLabels } from '@/lib/constants';
import { useAuthStore } from '@/lib/store';
import type { Bobin } from '@/lib/types';
import { Search, Loader2, Plus, Package } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const COLORS = [
  { value: 'white', label: 'Oq' },
  { value: 'cream', label: 'Krem' },
  { value: 'blue', label: 'Ko\'k' },
  { value: 'grey', label: 'Kulrang' },
  { value: 'other', label: 'Boshqa' },
];

const emptyForm = {
  qrCode: '',
  grammaj: '',
  color: 'white',
  initialWeightKg: '',
  initialLengthM: '',
  widthMm: '',
  supplierName: '',
};

export default function InventoryPage() {
  const canCreate = useAuthStore((s) => s.hasPermission('bobin:create'));
  const [bobins, setBobins] = useState<Bobin[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

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

  const handleScanQr = (code: string) => {
    setForm((f) => ({ ...f, qrCode: code }));
    toast.success('Barcode qabul qilindi');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body: Record<string, unknown> = {
        grammaj: parseFloat(form.grammaj),
        color: form.color,
        initialWeightKg: parseFloat(form.initialWeightKg),
        initialLengthM: parseFloat(form.initialLengthM),
        widthMm: form.widthMm ? parseFloat(form.widthMm) : undefined,
        supplierName: form.supplierName || undefined,
      };
      if (form.qrCode.trim()) body.qrCode = form.qrCode.trim();
      const created = await apiClient.createBobin(body);
      toast.success(`Bobin qo'shildi: ${created.qr_code}`);
      setOpen(false);
      setForm(emptyForm);
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

  const BobinForm = (
    <form onSubmit={handleCreate} className="space-y-4">
      <div className="rounded-lg border bg-slate-50 p-3">
        <BarcodeScanner
          label="Etiket barcode / QR (ixtiyoriy)"
          placeholder="BOB-... yoki skaner"
          codePrefix="BOB-"
          value={form.qrCode}
          onValueChange={(qrCode) => setForm((f) => ({ ...f, qrCode }))}
          onScan={handleScanQr}
        />
        <p className="text-xs text-slate-500 mt-2">Bo&apos;sh qoldirsangiz, tizim avtomatik BOB-... yaratadi</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Grammaj (g/m²)</Label>
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            required
            className="min-h-[44px]"
            value={form.grammaj}
            onChange={(e) => setForm({ ...form, grammaj: e.target.value })}
          />
        </div>
        <div>
          <Label>Rang</Label>
          <Select value={form.color} onValueChange={(color) => setForm({ ...form, color })}>
            <SelectTrigger className="min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLORS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Og&apos;irlik (kg)</Label>
          <Input
            type="number"
            inputMode="decimal"
            step="0.001"
            required
            className="min-h-[44px]"
            value={form.initialWeightKg}
            onChange={(e) => setForm({ ...form, initialWeightKg: e.target.value })}
          />
        </div>
        <div>
          <Label>Uzunlik (m)</Label>
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            required
            className="min-h-[44px]"
            value={form.initialLengthM}
            onChange={(e) => setForm({ ...form, initialLengthM: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label>Eni (mm) — ixtiyoriy</Label>
        <Input
          type="number"
          inputMode="numeric"
          className="min-h-[44px]"
          value={form.widthMm}
          onChange={(e) => setForm({ ...form, widthMm: e.target.value })}
        />
      </div>
      <div>
        <Label>Yetkazib beruvchi</Label>
        <Input
          className="min-h-[44px]"
          value={form.supplierName}
          onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
        />
      </div>
      <Button type="submit" className="w-full min-h-[48px] text-base sticky bottom-0">
        Saqlash
      </Button>
    </form>
  );

  return (
    <RoleGuard permission="bobin:read">
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 pb-safe max-w-4xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Bobinlar</h1>
            <p className="text-slate-600 mt-1 text-sm">Xomashyo — qog&apos;oz rulonlari</p>
          </div>
          {canCreate && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto min-h-[48px] text-base">
                  <Plus className="h-5 w-5 mr-2" />
                  Bobin qo&apos;shish
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle>Yangi bobin qabul qilish</DialogTitle>
                </DialogHeader>
                {BobinForm}
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="QR, gramm yoki rang..."
            className="pl-10 min-h-[48px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
              Bobin topilmadi
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {filtered.map((b) => (
                <Card key={b.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-mono text-sm font-bold break-all">{b.qr_code}</p>
                      <Badge className="shrink-0">{bobinStatusLabels[b.status] || b.status}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-700">
                      <span>Grammaj</span>
                      <span className="font-medium text-right">{b.grammaj} g/m²</span>
                      <span>Rang</span>
                      <span className="font-medium text-right">{b.color}</span>
                      <span>Og&apos;irlik</span>
                      <span className="font-medium text-right">
                        {Number(b.current_weight_kg).toLocaleString('uz-UZ')} kg
                      </span>
                      <span>Uzunlik</span>
                      <span className="font-medium text-right">
                        {Number(b.current_length_m).toLocaleString('uz-UZ')} m
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="hidden md:block">
              <CardContent className="p-0 pt-4 overflow-x-auto">
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
                        <TableCell>
                          <Badge>{bobinStatusLabels[b.status] || b.status}</Badge>
                        </TableCell>
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
