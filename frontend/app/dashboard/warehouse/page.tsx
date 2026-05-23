'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
import { PrintQrButton } from '@/components/PrintQrButton';
import { expectedNetWeightKg, STANDARD_WIDTH_KG } from '@/lib/expected-weight';
import { Plus, Loader2, Trash2, Scale, ScanLine } from 'lucide-react';
import { toast } from 'sonner';

const COLORS = [
  { value: 'white', label: 'Oq' },
  { value: 'cream', label: 'Krem' },
  { value: 'blue', label: 'Ko\'k' },
  { value: 'grey', label: 'Kulrang' },
  { value: 'other', label: 'Boshqa' },
];

const emptyForm = {
  qrCode: '',
  realWeightKg: '',
  netWeightKg: '',
  widthCm: '',
  color: 'white',
  lengthM: '',
};

export default function WarehousePage() {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());
  const canManage = useAuthStore((s) => s.hasPermission('warehouse:manage'));
  const realRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState<{ n: number; kg: number; net_kg?: number }>({ n: 0, kg: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [knownProduct, setKnownProduct] = useState<Record<string, unknown> | null>(null);
  const [lastSaved, setLastSaved] = useState<{
    qr: string;
    realKg: number;
    netKg: number;
    width: number;
    color: string;
  } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([apiClient.getWarehouseProducts({ limit: '100' }), apiClient.getWarehouseSummary()])
      .then(([list, sum]) => {
        setProducts(list.data);
        const t = sum.total as Record<string, unknown>;
        setTotal({
          n: Number(t.n) || 0,
          kg: Number(t.kg) || 0,
          net_kg: Number(t.net_kg) || 0,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const applyWidth = (widthStr: string) => {
    const w = parseFloat(widthStr);
    const net = expectedNetWeightKg(w);
    setForm((f) => ({
      ...f,
      widthCm: widthStr,
      netWeightKg: net != null ? String(net) : '',
    }));
  };

  const weightDiff = useMemo(() => {
    const net = parseFloat(form.netWeightKg);
    const real = parseFloat(form.realWeightKg);
    if (!Number.isFinite(net) || !Number.isFinite(real) || net <= 0) return null;
    return Math.round((real - net) * 1000) / 1000;
  }, [form.netWeightKg, form.realWeightKg]);

  const resetEntry = (keepSize = true) => {
    setForm({
      qrCode: '',
      realWeightKg: '',
      netWeightKg: keepSize && form.widthCm ? form.netWeightKg : '',
      widthCm: keepSize ? form.widthCm : '',
      color: keepSize ? form.color : 'white',
      lengthM: '',
    });
    setKnownProduct(null);
    setTimeout(() => realRef.current?.focus(), 100);
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
        const w = String(d.width_cm ?? '');
        const net =
          d.net_weight_kg != null
            ? Number(d.net_weight_kg)
            : expectedNetWeightKg(Number(d.width_cm));
        setKnownProduct(d);
        setForm((f) => ({
          ...f,
          qrCode: String(d.qr_code),
          widthCm: w,
          netWeightKg: net != null ? String(net) : '',
          realWeightKg: '',
          color: String(d.color || f.color),
        }));
        toast.success('Kesishdan keldi — faqat tarozi (real) kg kiriting');
        realRef.current?.focus();
        return;
      }
      setKnownProduct(null);
      toast.info('Yangi etiket — eni, keyin tarozi (real kg)');
      realRef.current?.focus();
    } catch {
      setKnownProduct(null);
      realRef.current?.focus();
    }
  };

  const handleSave = async () => {
    const realWeightKg = parseFloat(form.realWeightKg);
    const widthCm = parseFloat(form.widthCm);
    const netWeightKg = parseFloat(form.netWeightKg);
    if (!form.qrCode.trim()) {
      toast.error('Avval etiket barcodeni skanerlang');
      return;
    }
    if (isNaN(realWeightKg) || realWeightKg <= 0) {
      toast.error('Tarozidan REAL og\'irlikni (kg) kiriting');
      realRef.current?.focus();
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
        realWeightKg,
        widthCm,
        netWeightKg: !isNaN(netWeightKg) ? netWeightKg : undefined,
        color: form.color,
        lengthM: form.lengthM ? parseFloat(form.lengthM) : undefined,
      };
      const p = await apiClient.registerWarehouseProduct(body);
      const net = Number(p.net_weight_kg ?? netWeightKg);
      setLastSaved({
        qr: String(p.qr_code),
        realKg: realWeightKg,
        netKg: net,
        width: widthCm,
        color: form.color,
      });
      toast.success(`Ombor: real ${realWeightKg} kg, net ${net} kg`);
      load();
      resetEntry(true);
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

  const fmtKg = (p: Record<string, unknown>) => {
    const net = p.net_weight_kg != null ? Number(p.net_weight_kg) : null;
    const real = p.real_weight_kg != null ? Number(p.real_weight_kg) : Number(p.weight_kg);
    return { net, real };
  };

  return (
    <RoleGuard permission="warehouse:read">
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-2xl mx-auto w-full min-w-0 overflow-x-hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Tayyor mahsulot ombori</h1>
          <p className="text-slate-600 mt-1 text-sm">Net (standart) + Real (tarozi)</p>
        </div>

        <Card className="border-2 border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-2 px-4 sm:px-6">
            <CardTitle className="text-lg flex items-center gap-2">
              <Scale className="h-5 w-5 text-emerald-700 shrink-0" />
              Tarozi + barcode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6 pb-6">
            {canManage ? (
              <>
                <div className="text-xs text-emerald-900 bg-white/80 rounded-lg p-2 border border-emerald-200">
                  <p className="font-medium mb-1">Standart net (eni bo&apos;yicha):</p>
                  <p>
                    {STANDARD_WIDTH_KG.map((x) => `${x.width} sm → ${x.kg} kg`).join(' · ')}
                  </p>
                </div>

                <BarcodeScanner
                  label="Etiket barcode / QR"
                  placeholder="Skaner yoki qo'lda kod..."
                  value={form.qrCode}
                  onValueChange={(qrCode) => setForm((f) => ({ ...f, qrCode }))}
                  onScan={handleScanBarcode}
                />

                {form.qrCode && (
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono bg-white rounded border px-2 py-2 break-all">
                    <ScanLine className="h-3 w-3 shrink-0" />
                    <span className="flex-1 min-w-0">{form.qrCode}</span>
                    <PrintQrButton code={form.qrCode} title="Tayyor mahsulot" size="sm" />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Eni (sm)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      className="min-h-[48px] text-lg"
                      value={form.widthCm}
                      onChange={(e) => applyWidth(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-slate-600">Net og&apos;irlik (kg) — standart</Label>
                    <Input
                      readOnly
                      className="min-h-[48px] text-lg bg-slate-100 font-semibold"
                      value={form.netWeightKg}
                      tabIndex={-1}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold text-emerald-900">
                    Real og&apos;irlik (kg) — tarozi
                  </Label>
                  <Input
                    ref={realRef}
                    type="number"
                    inputMode="decimal"
                    step="0.001"
                    placeholder="Tarozidan o'qing"
                    className="min-h-[56px] text-2xl font-bold mt-1 text-center border-emerald-400"
                    value={form.realWeightKg}
                    onChange={(e) => setForm({ ...form, realWeightKg: e.target.value })}
                  />
                  {weightDiff != null && (
                    <p
                      className={`text-sm mt-2 text-center font-medium ${
                        Math.abs(weightDiff) > 0.3 ? 'text-amber-700' : 'text-slate-600'
                      }`}
                    >
                      Farq (real − net): {weightDiff > 0 ? '+' : ''}
                      {weightDiff} kg
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Rang</Label>
                    <Select value={form.color} onValueChange={(color) => setForm({ ...form, color })}>
                      <SelectTrigger className="min-h-[48px]">
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
                  <div>
                    <Label>Uzunlik (m)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      className="min-h-[48px]"
                      value={form.lengthM}
                      onChange={(e) => setForm({ ...form, lengthM: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    className="w-full min-h-[52px] text-base"
                    disabled={saving}
                    onClick={handleSave}
                  >
                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Omborga saqlash'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full min-h-[48px]"
                    disabled={saving}
                    onClick={handleSave}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Saqlash va keyingisi
                  </Button>
                </div>

                {lastSaved && (
                  <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm space-y-1">
                    <p className="font-mono font-bold break-all">{lastSaved.qr}</p>
                    <p>
                      {lastSaved.width} sm · Net {lastSaved.netKg} kg · Real {lastSaved.realKg} kg
                    </p>
                    <PrintQrButton
                      code={lastSaved.qr}
                      title="Tayyor mahsulot"
                      lines={[
                        `${lastSaved.width} sm`,
                        `Net ${lastSaved.netKg} kg`,
                        `Real ${lastSaved.realKg} kg`,
                      ]}
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-600">Qabul uchun warehouse:manage kerak</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 px-4">
            <p className="text-xl sm:text-2xl font-bold">
              {total.n} dona
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Real (tarozi): <strong>{Number(total.kg).toLocaleString('uz-UZ')} kg</strong>
              {total.net_kg ? (
                <> · Net jami: {Number(total.net_kg).toLocaleString('uz-UZ')} kg</>
              ) : null}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-base">Ombordagi mahsulotlar</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-4">
            {loading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <p className="text-center text-slate-500 py-8 text-sm px-4">Hali mahsulot yo&apos;q</p>
            ) : (
              <div className="divide-y md:hidden">
                {products.map((p) => {
                  const { net, real } = fmtKg(p);
                  return (
                    <div key={String(p.id)} className="p-4 space-y-2 min-w-0">
                      <p className="font-mono text-sm font-bold break-all">{String(p.qr_code)}</p>
                      <p className="text-sm">
                        {p.width_cm} sm · {String(p.color || 'white')}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-slate-100 rounded p-2">
                          <span className="text-slate-500 block text-xs">Net</span>
                          <span className="font-semibold">
                            {net != null ? `${net.toLocaleString('uz-UZ')} kg` : '—'}
                          </span>
                        </div>
                        <div className="bg-emerald-50 rounded p-2 border border-emerald-200">
                          <span className="text-emerald-700 block text-xs">Real</span>
                          <span className="font-bold">
                            {real.toLocaleString('uz-UZ')} kg
                          </span>
                        </div>
                      </div>
                      {isSuperAdmin && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="w-full min-h-[44px]"
                          onClick={() => handleDelete(p)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          O&apos;chirish
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {!loading && products.length > 0 && (
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="p-3">Barcode</th>
                      <th className="p-3">Eni</th>
                      <th className="p-3">Net kg</th>
                      <th className="p-3">Real kg</th>
                      <th className="p-3">Rang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => {
                      const { net, real } = fmtKg(p);
                      return (
                        <tr key={String(p.id)} className="border-b">
                          <td className="p-3 font-mono text-xs">{String(p.qr_code)}</td>
                          <td className="p-3">{p.width_cm}</td>
                          <td className="p-3">{net != null ? net.toLocaleString('uz-UZ') : '—'}</td>
                          <td className="p-3 font-semibold">{real.toLocaleString('uz-UZ')}</td>
                          <td className="p-3">{String(p.color)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
