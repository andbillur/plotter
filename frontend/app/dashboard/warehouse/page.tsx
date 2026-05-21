'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { RoleGuard } from '@/components/layout/RoleGuard';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Plus, Loader2, Trash2, Scale, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const COLORS = [
  { value: 'white', label: 'Oq' },
  { value: 'cream', label: 'Krem' },
  { value: 'blue', label: 'Ko\'k' },
  { value: 'grey', label: 'Kulrang' },
  { value: 'other', label: 'Boshqa' },
];

const emptyForm = {
  qrCode: '',
  weightKg: '',
  widthCm: '',
  color: 'white',
  lengthM: '',
};

export default function WarehousePage() {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());
  const canManage = useAuthStore((s) => s.hasPermission('warehouse:manage'));
  const weightRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState({ n: 0, kg: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [knownProduct, setKnownProduct] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(() => {
    setLoading(true);
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

  const resetEntry = (keepSize = true) => {
    setForm({
      qrCode: '',
      weightKg: '',
      widthCm: keepSize ? form.widthCm : '',
      color: keepSize ? form.color : 'white',
      lengthM: '',
    });
    setKnownProduct(null);
    setTimeout(() => weightRef.current?.focus(), 100);
  };

  const handleScanBarcode = async (code: string) => {
    const qr = code.trim();
    setForm((f) => ({ ...f, qrCode: qr }));
    try {
      const scan = await apiClient.scanQr(qr);
      if (scan.type === 'cut_product') {
        const d = scan.data;
        if (d.stock_status === 'omborxonada') {
          toast.error('Bu mahsulot allaqachon omborda');
          return;
        }
        if (d.stock_status === 'jo_natilgan') {
          toast.error('Allaqachon jo\'natilgan');
          return;
        }
        setKnownProduct(d);
        setForm((f) => ({
          ...f,
          qrCode: String(d.qr_code),
          widthCm: String(d.width_cm ?? f.widthCm),
          weightKg: f.weightKg || String(d.weight_kg ?? ''),
          color: String(d.color || f.color),
        }));
        toast.success('Kesilgan o\'ram topildi — tarozidan og\'irlikni kiriting');
        weightRef.current?.focus();
        return;
      }
      setKnownProduct(null);
      toast.info('Yangi etiket — tarozidan og\'irlikni yozing, keyin saqlang');
      weightRef.current?.focus();
    } catch {
      setKnownProduct(null);
      toast.info('Yangi barcode — tarozidan og\'irlik va eni kiriting');
      weightRef.current?.focus();
    }
  };

  const handleSave = async (andNext = false) => {
    const weightKg = parseFloat(form.weightKg);
    const widthCm = parseFloat(form.widthCm);
    if (!form.qrCode.trim()) {
      toast.error('Avval etiket barcodeni skanerlang');
      return;
    }
    if (isNaN(weightKg) || weightKg <= 0) {
      toast.error('Tarozidan og\'irlikni (kg) kiriting');
      weightRef.current?.focus();
      return;
    }
    if (isNaN(widthCm) || widthCm <= 0) {
      toast.error('Eni (sm) kiriting');
      return;
    }

    setSaving(true);
    try {
      const body = {
        qrCode: form.qrCode.trim(),
        weightKg,
        widthCm,
        color: form.color,
        lengthM: form.lengthM ? parseFloat(form.lengthM) : undefined,
      };
      const p = await apiClient.registerWarehouseProduct(body);
      toast.success(`Omborga: ${String(p.qr_code)} — ${weightKg} kg`);
      load();
      if (andNext) resetEntry(true);
      else resetEntry(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <RoleGuard permission="warehouse:read">
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-2xl mx-auto w-full">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Tayyor mahsulot ombori</h1>
          <p className="text-slate-600 mt-1 text-sm">Tarozi → etiket barcode → ombor</p>
        </div>

        <Card className="border-2 border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Scale className="h-5 w-5 text-emerald-700" />
              Tarozi + barcode qabul
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {canManage ? (
              <>
                <ol className="text-sm text-emerald-900 list-decimal list-inside space-y-1">
                  <li>Mahsulotni <strong>taroziga</strong> qo&apos;ying, og&apos;irlikni o&apos;qing</li>
                  <li>Etiketdagi <strong>barcode</strong> ni skanerlang (yopishtirilgan yorliq)</li>
                  <li>Og&apos;irlik va eni/rangni tasdiqlang → saqlang</li>
                </ol>

                <BarcodeScanner
                  label="Etiket barcode / QR"
                  placeholder="Skaner yoki qo'lda kod..."
                  value={form.qrCode}
                  onValueChange={(qrCode) => setForm((f) => ({ ...f, qrCode }))}
                  onScan={handleScanBarcode}
                />

                {form.qrCode && (
                  <p className="text-xs font-mono bg-white rounded border px-2 py-1 break-all">
                    <ScanLine className="inline h-3 w-3 mr-1" />
                    {form.qrCode}
                    {knownProduct ? (
                      <span className="text-emerald-700 ml-2">(kesishdan kelgan)</span>
                    ) : (
                      <span className="text-slate-500 ml-2">(yangi etiket)</span>
                    )}
                  </p>
                )}

                <div>
                  <Label className="text-base font-semibold">Tarozidan og&apos;irlik (kg)</Label>
                  <Input
                    ref={weightRef}
                    type="number"
                    inputMode="decimal"
                    step="0.001"
                    placeholder="Masalan: 25.4"
                    className="min-h-[56px] text-2xl font-bold mt-1 text-center"
                    value={form.weightKg}
                    onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Eni (sm)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      className="min-h-[44px]"
                      value={form.widthCm}
                      onChange={(e) => setForm({ ...form, widthCm: e.target.value })}
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

                <div>
                  <Label>Uzunlik (m) — ixtiyoriy</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    className="min-h-[44px]"
                    value={form.lengthM}
                    onChange={(e) => setForm({ ...form, lengthM: e.target.value })}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    className="flex-1 min-h-[52px] text-base"
                    disabled={saving}
                    onClick={() => handleSave(false)}
                  >
                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Omborga saqlash'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1 min-h-[52px]"
                    disabled={saving}
                    onClick={() => handleSave(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Saqlash va keyingisi
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600">Qabul qilish uchun warehouse:manage ruxsati kerak</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">
              {total.n} dona — {Number(total.kg).toLocaleString('uz-UZ')} kg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ombordagi mahsulotlar</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-4">
            {loading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <p className="text-center text-slate-500 py-8 text-sm">Hali mahsulot yo&apos;q</p>
            ) : (
              <>
                <div className="md:hidden divide-y">
                  {products.map((p) => (
                    <div key={String(p.id)} className="p-4 space-y-1">
                      <p className="font-mono text-sm font-bold break-all">{String(p.qr_code)}</p>
                      <p className="text-sm">
                        {p.width_cm} sm · {Number(p.weight_kg).toLocaleString('uz-UZ')} kg ·{' '}
                        {String(p.color || 'white')}
                      </p>
                      {isSuperAdmin && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => handleDelete(p)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          O&apos;chirish
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Barcode</TableHead>
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
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
