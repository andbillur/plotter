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
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { PrintQrButton } from '@/components/PrintQrButton';
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
    qrCode: '',
    createLabel: true,
  });
  const [lastLabel, setLastLabel] = useState<{ qr: string; kg: number; title: string } | null>(
    null
  );

  const isOutbound =
    form.movementType === 'chiqim' ||
    form.movementType === 'chiqim_sotish' ||
    form.movementType === 'chiqim_ishlatish';
  const qrPrefix = tab === 'brak' ? 'BRK' : 'MAK';

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

  const handleScanLot = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setForm((f) => ({ ...f, qrCode: trimmed }));
    if (!isOutbound) {
      toast.success('Kod qabul qilindi');
      return;
    }
    try {
      const lot = await apiClient.getScrapLotByQr(trimmed);
      if (lot.warehouse_type !== tab) {
        toast.error(
          lot.warehouse_type === 'brak'
            ? 'Bu BRK etiketi — Brak omboriga o\'ting'
            : 'Bu MAK etiketi — Makulatura omboriga o\'ting'
        );
        return;
      }
      setForm((f) => ({
        ...f,
        qrCode: lot.qr_code,
        quantityKg: String(lot.weight_kg),
      }));
      toast.success(`${lot.qr_code} — ${lot.weight_kg} kg`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Etiket topilmadi');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(form.quantityKg);
    if (!qty || qty <= 0) {
      toast.error('Og\'irlik kiriting');
      return;
    }
    try {
      const res = await apiClient.addScrapMovement({
        warehouseType: tab,
        movementType: form.movementType,
        quantityKg: qty,
        pricePerKg: form.pricePerKg ? parseFloat(form.pricePerKg) : undefined,
        counterparty: form.counterparty || undefined,
        notes: form.notes || undefined,
        qrCode: form.qrCode.trim() || undefined,
        createLabel:
          !isOutbound &&
          (form.movementType === 'kirim' || form.movementType === 'kirim_savdo') &&
          form.createLabel,
      });
      const createdQr = res.qr_code ? String(res.qr_code) : '';
      if (createdQr) {
        setLastLabel({
          qr: createdQr,
          kg: qty,
          title: tab === 'brak' ? 'Brak etiketi' : 'Makulatura etiketi',
        });
        toast.success(`Saqlandi — etiket: ${createdQr}`);
      } else {
        toast.success('Saqlandi');
      }
      setOpen(false);
      setForm({
        movementType: 'kirim',
        quantityKg: '',
        pricePerKg: '',
        counterparty: '',
        notes: '',
        qrCode: '',
        createLabel: true,
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
                  <BarcodeScanner
                    label={
                      isOutbound
                        ? `Etiket barcode (${qrPrefix}-...)`
                        : `Barcode (ixtiyoriy, ${qrPrefix}-...)`
                    }
                    placeholder={
                      isOutbound
                        ? 'Chiqim uchun etiketni skanerlang...'
                        : 'Skaner yoki qo\'lda kod...'
                    }
                    codePrefix={qrPrefix}
                    value={form.qrCode}
                    onValueChange={(qrCode) => setForm({ ...form, qrCode })}
                    onScan={handleScanLot}
                  />
                  {form.qrCode && (
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono bg-slate-50 rounded border px-2 py-2 break-all">
                      <span className="flex-1 min-w-0">{form.qrCode}</span>
                      <PrintQrButton
                        code={form.qrCode}
                        title={tab === 'brak' ? 'Brak' : 'Makulatura'}
                        lines={
                          form.quantityKg ? [`${form.quantityKg} kg`] : undefined
                        }
                        size="sm"
                      />
                    </div>
                  )}
                  <div>
                    <Label>Harakat turi</Label>
                    <Select
                      value={form.movementType}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          movementType: v,
                          qrCode: '',
                          quantityKg: '',
                        })
                      }
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
                  {!isOutbound &&
                    (form.movementType === 'kirim' || form.movementType === 'kirim_savdo') && (
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.createLabel}
                          onChange={(e) =>
                            setForm({ ...form, createLabel: e.target.checked })
                          }
                          className="rounded"
                        />
                        Yangi etiket (barcode) yaratish — {qrPrefix}-...
                      </label>
                    )}
                  <div>
                    <Label>
                      Og&apos;irlik (kg)
                      {isOutbound && form.qrCode
                        ? ' — etiketdan'
                        : isOutbound
                          ? ' yoki etiket skanerlang'
                          : ''}
                    </Label>
                    <Input
                      type="number"
                      step="0.001"
                      className="mt-1"
                      value={form.quantityKg}
                      onChange={(e) => setForm({ ...form, quantityKg: e.target.value })}
                      required
                      readOnly={isOutbound && !!form.qrCode}
                    />
                  </div>
                  {isOutbound && !form.qrCode && (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
                      Chiqim / sotish / qayta ishlatish uchun <strong>{qrPrefix}-</strong>{' '}
                      etiketini skanerlang. Etiketsiz qo&apos;lda kg — faqat umumiy ombor
                      qoldig&apos;idan (eski qoldiq).
                    </p>
                  )}
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

        {lastLabel && (
          <Card className="border-green-300 bg-green-50">
            <CardContent className="pt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm">
                Oxirgi etiket:{' '}
                <span className="font-mono font-bold">{lastLabel.qr}</span> ·{' '}
                {lastLabel.kg} kg
              </p>
              <PrintQrButton
                code={lastLabel.qr}
                title={lastLabel.title}
                lines={[`${lastLabel.kg} kg`]}
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => setLastLabel(null)}>
                Yopish
              </Button>
            </CardContent>
          </Card>
        )}

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
                    <TableHead>Barcode</TableHead>
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
                      <TableCell className="font-mono text-xs">
                        {t.qr_code ? (
                          <span className="flex items-center gap-1">
                            {String(t.qr_code)}
                            <PrintQrButton
                              code={String(t.qr_code)}
                              size="icon"
                              lines={[`${Number(t.quantity_kg)} kg`]}
                            />
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
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
