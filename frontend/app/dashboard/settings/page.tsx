'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { roleDisplayNames } from '@/lib/constants';
import { Loader2, Save, Settings2, History, User, UserPlus } from 'lucide-react';
import { CostWorkersAdmin } from '@/components/CostWorkersAdmin';
import { billingWidthCm, calcPackagingCost } from '@/lib/cost-calc';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const DEFAULTS = {
  paperPricePerKg: '3500',
  clayPricePerKg: '8000',
  electricityCostPerKg: '150',
  laborCostPerKg: '200',
  otherCostPerKg: '0',
  packagingPricePerMeter: '6000',
  workMinutesPerMonth: '12480',
};

type CostForm = {
  paperPricePerKg: string;
  clayPricePerKg: string;
  electricityCostPerKg: string;
  laborCostPerKg: string;
  otherCostPerKg: string;
  packagingPricePerMeter: string;
  workMinutesPerMonth: string;
};

function configToForm(c: Record<string, unknown> | null): CostForm {
  if (!c) return { ...DEFAULTS };
  return {
    paperPricePerKg: String(c.paper_price_per_kg ?? DEFAULTS.paperPricePerKg),
    clayPricePerKg: String(c.clay_price_per_kg ?? DEFAULTS.clayPricePerKg),
    electricityCostPerKg: String(c.electricity_cost_per_kg ?? DEFAULTS.electricityCostPerKg),
    laborCostPerKg: String(c.labor_cost_per_kg ?? DEFAULTS.laborCostPerKg),
    otherCostPerKg: String(c.other_cost_per_kg ?? DEFAULTS.otherCostPerKg),
    packagingPricePerMeter: String(c.packaging_price_per_meter ?? DEFAULTS.packagingPricePerMeter),
    workMinutesPerMonth: String(c.work_minutes_per_month ?? DEFAULTS.workMinutesPerMonth),
  };
}

function formatMoney(n: number) {
  return `${n.toLocaleString('uz-UZ')} so'm`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState<CostForm>({ ...DEFAULTS });
  const [current, setCurrent] = useState<Record<string, unknown> | null>(null);
  const [history, setHistory] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workers, setWorkers] = useState<Record<string, unknown>[]>([]);
  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiClient.getCostConfig(),
      apiClient.getCostConfigHistory(8),
      apiClient.getCostWorkers().catch(() => []),
    ])
      .then(([cfg, hist, w]) => {
        setCurrent(cfg);
        setForm(configToForm(cfg));
        setHistory(hist);
        setWorkers(w);
      })
      .catch(() => {
        setForm({ ...DEFAULTS });
        setHistory([]);
        setWorkers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const paperPricePerKg = parseFloat(form.paperPricePerKg);
    const clayPricePerKg = parseFloat(form.clayPricePerKg);
    const electricityCostPerKg = parseFloat(form.electricityCostPerKg) || 0;
    const laborCostPerKg = parseFloat(form.laborCostPerKg) || 0;
    const otherCostPerKg = parseFloat(form.otherCostPerKg) || 0;
    const packagingPricePerMeter = parseFloat(form.packagingPricePerMeter) || 6000;
    const workMinutesPerMonth = parseInt(form.workMinutesPerMonth, 10) || 12480;

    if (!paperPricePerKg || !clayPricePerKg) {
      toast.error('Qog\'oz va kley narxi majburiy');
      return;
    }

    setSaving(true);
    try {
      const saved = await apiClient.saveCostConfig({
        paperPricePerKg,
        clayPricePerKg,
        electricityCostPerKg,
        laborCostPerKg,
        otherCostPerKg,
        packagingPricePerMeter,
        workMinutesPerMonth,
      });
      setCurrent(saved);
      toast.success('Tannarx saqlandi — yangi ishlab chiqarish hisobotlarida qo\'llanadi');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Saqlash xatoligi');
    } finally {
      setSaving(false);
    }
  };

  const packPreview = calcPackagingCost(202, parseFloat(form.packagingPricePerMeter) || 6000);

  const previewPerKg =
    (parseFloat(form.paperPricePerKg) || 0) +
    (parseFloat(form.clayPricePerKg) || 0) +
    (parseFloat(form.electricityCostPerKg) || 0) +
    (parseFloat(form.laborCostPerKg) || 0) +
    (parseFloat(form.otherCostPerKg) || 0);

  return (
    <RoleGuard permission="cost_config:manage">
      <div className="p-3 sm:p-6 space-y-6 max-w-3xl mx-auto w-full">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Settings2 className="h-8 w-8 text-slate-700" />
            Sozlamalar
          </h1>
          <p className="text-slate-600 mt-1 text-sm">
            Tannarx parametrlari — ishlab chiqarish FINISH hisobotlarida ishlatiladi
          </p>
        </div>

        {user && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Profil
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p>
                <span className="text-slate-500">Ism:</span> {user.name}
              </p>
              <p>
                <span className="text-slate-500">Login:</span> {user.username}
              </p>
              <p>
                <span className="text-slate-500">Rol:</span>{' '}
                {roleDisplayNames[user.role] || user.role}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Tannarx parametrlari</CardTitle>
            <CardDescription>
              Har bir parametr <strong>1 kg tayyor mahsulot</strong> uchun so&apos;m (UZS). Yangi saqlash
              eski konfiguratsiyani almashtirmaydi — tarixda saqlanadi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-5">
                {current && (
                  <div className="rounded-lg bg-slate-50 border p-3 text-sm flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">Joriy</Badge>
                    <span className="text-slate-600">
                      {formatDate(String(current.valid_from || current.created_at))}
                    </span>
                    <span className="text-slate-500">· {String(current.currency || 'UZS')}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Qog&apos;oz narxi (1 kg)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="1"
                      required
                      className="min-h-[44px] mt-1"
                      value={form.paperPricePerKg}
                      onChange={(e) => setForm({ ...form, paperPricePerKg: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Kley narxi (1 kg)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="1"
                      required
                      className="min-h-[44px] mt-1"
                      value={form.clayPricePerKg}
                      onChange={(e) => setForm({ ...form, clayPricePerKg: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Elektr energiya (1 kg)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="1"
                      className="min-h-[44px] mt-1"
                      value={form.electricityCostPerKg}
                      onChange={(e) => setForm({ ...form, electricityCostPerKg: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Ish haqi (1 kg)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="1"
                      className="min-h-[44px] mt-1"
                      value={form.laborCostPerKg}
                      onChange={(e) => setForm({ ...form, laborCostPerKg: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Qadoqlash (salafan/karton) — 1 metr narxi</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      className="min-h-[44px] mt-1"
                      value={form.packagingPricePerMeter}
                      onChange={(e) => setForm({ ...form, packagingPricePerMeter: e.target.value })}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      202 sm → {billingWidthCm(202)} sm = 2 m × narx. Misol: {formatMoney(packPreview.cost)}
                    </p>
                  </div>
                  <div>
                    <Label>Oyda ish minutlari (ish haqi hisobi)</Label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      className="min-h-[44px] mt-1"
                      value={form.workMinutesPerMonth}
                      onChange={(e) => setForm({ ...form, workMinutesPerMonth: e.target.value })}
                    />
                    <p className="text-xs text-slate-500 mt-1">Standart: 8 soat × 26 kun ≈ 12480</p>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Boshqa xarajatlar (1 kg)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="1"
                      className="min-h-[44px] mt-1"
                      value={form.otherCostPerKg}
                      onChange={(e) => setForm({ ...form, otherCostPerKg: e.target.value })}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                  <p className="font-medium">Taxminiy jami (qog&apos;oz + kley + ... birlashtirilgan):</p>
                  <p className="text-2xl font-bold mt-1">{formatMoney(previewPerKg)} / kg</p>
                  <p className="text-xs text-blue-700 mt-2">
                    Haqiqiy FINISH hisoboti sessiya ma&apos;lumotlariga qarab alohida hisoblanadi.
                  </p>
                </div>

                <Button type="submit" className="w-full sm:w-auto min-h-[48px] text-base" disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Save className="h-5 w-5 mr-2" />
                  )}
                  Saqlash
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Ishchilar (oylik maosh)
            </CardTitle>
            <CardDescription>
              Faqat admin: oylik va bo&apos;lim (soha) tahrirlash. Sessiyaga biriktirish — Ishlab chiqarish /
              Kesish (admin ko&apos;radi).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CostWorkersAdmin workers={workers} onReload={load} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              O&apos;zgarishlar tarixi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-4">
            {history.length === 0 ? (
              <p className="text-sm text-slate-500 p-6">Hali tarix yo&apos;q</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sana</TableHead>
                      <TableHead>Qog&apos;oz</TableHead>
                      <TableHead>Kley</TableHead>
                      <TableHead>Elektr</TableHead>
                      <TableHead>Ish haqi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((h, i) => (
                      <TableRow key={String(h.id)} className={i === 0 ? 'bg-green-50' : ''}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatDate(String(h.valid_from || h.created_at))}
                          {i === 0 && (
                            <Badge className="ml-1" variant="default">
                              Joriy
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{Number(h.paper_price_per_kg).toLocaleString('uz-UZ')}</TableCell>
                        <TableCell>{Number(h.clay_price_per_kg).toLocaleString('uz-UZ')}</TableCell>
                        <TableCell>{Number(h.electricity_cost_per_kg).toLocaleString('uz-UZ')}</TableCell>
                        <TableCell>{Number(h.labor_cost_per_kg).toLocaleString('uz-UZ')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
