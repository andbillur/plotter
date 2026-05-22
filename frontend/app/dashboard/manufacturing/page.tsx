'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { apiClient } from '@/lib/api';
import {
  sessionStatusLabels,
  bobinSummaryText,
  formatBobinWidthMm,
  bobinCanStartProduction,
} from '@/lib/constants';
import { PrintQrButton } from '@/components/PrintQrButton';
import { Play, Square, Droplets, Loader2, Scissors, Plus, BarChart3 } from 'lucide-react';
import { fmtKg, fmtRatio, sessionClaySummary } from '@/lib/production-stats';
import { SessionWorkersPanel } from '@/components/SessionWorkersPanel';
import { useAuthStore } from '@/lib/store';
import { isCostAdmin } from '@/lib/admin';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Bobin } from '@/lib/types';

function ProductionStatsGrid({ s }: { s: Record<string, unknown> }) {
  const st = sessionClaySummary(s);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm bg-slate-50 rounded-lg p-3 border">
      <div>
        <p className="text-slate-500">Bobin boshlang&apos;ich</p>
        <p className="font-semibold">{fmtKg(st.start)}</p>
      </div>
      <div>
        <p className="text-slate-500">Ishlatilgan qog&apos;oz</p>
        <p className="font-semibold">{fmtKg(st.paperUsed || s.bobin_consumed_so_far_kg)}</p>
      </div>
      <div>
        <p className="text-slate-500">Kley jami</p>
        <p className="font-semibold text-blue-700">{fmtKg(st.clay)}</p>
      </div>
      <div>
        <p className="text-slate-500">Tayyor chiqish</p>
        <p className="font-semibold">{fmtKg(st.output)}</p>
      </div>
      {st.output > 0 && st.clay > 0 && (
        <>
          <div>
            <p className="text-slate-500">Kley / 1 kg chiqish</p>
            <p className="font-semibold">{fmtRatio(st.clayPerOutput)} kg</p>
          </div>
          <div>
            <p className="text-slate-500">Kley / 1 kg qog&apos;oz</p>
            <p className="font-semibold">{fmtRatio(st.clayPerPaper)} kg</p>
          </div>
        </>
      )}
    </div>
  );
}

export default function ManufacturingPage() {
  const user = useAuthStore((s) => s.user);
  const showWorkersPanel = isCostAdmin(user);
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([]);
  const [active, setActive] = useState<Record<string, unknown>[]>([]);
  const [machines, setMachines] = useState<Record<string, unknown>[]>([]);
  const [warehouseBobins, setWarehouseBobins] = useState<Bobin[]>([]);
  const [loading, setLoading] = useState(true);
  const [bobinQr, setBobinQr] = useState('');
  const [selectedBobin, setSelectedBobin] = useState<Bobin | null>(null);
  const [machineId, setMachineId] = useState('');
  const [finishForm, setFinishForm] = useState({ outputWeightKg: '', bobinRemainingWeightKg: '' });
  const [splitSessionId, setSplitSessionId] = useState('');
  const [splitWeights, setSplitWeights] = useState('200,200,200');
  const [lastSplitPapers, setLastSplitPapers] = useState<Record<string, unknown>[]>([]);
  const [clayKg, setClayKg] = useState('20');
  const [detailSession, setDetailSession] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      apiClient.getProductionSessions({ limit: '50' }),
      apiClient.getActiveProductionSessions(),
      apiClient.getMachines(),
      apiClient.getBobinsInWarehouse(),
    ])
      .then(([list, act, m, bobins]) => {
        setSessions(list.data);
        setActive(act);
        setMachines(m.filter((x) => x.machine_type === 'production'));
        setWarehouseBobins(bobins.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const finished = sessions.filter((s) => s.status === 'tugallangan');
    if (!finished.length || splitSessionId) return;
    const s = finished[0];
    setSplitSessionId(String(s.id));
    const out = Number(s.output_weight_kg);
    if (out > 0) {
      const each = Math.round((out / 3) * 10) / 10;
      setSplitWeights(Array(3).fill(each).join(','));
    }
  }, [sessions, splitSessionId]);

  const handleScanBobin = async (code: string) => {
    setBobinQr(code);
    try {
      const b = await apiClient.getBobinByQr(code);
      if (!bobinCanStartProduction(b)) {
        toast.error(
          b.status === 'ishlatilgan'
            ? 'Bobin to\'liq ishlatilgan (qoldiq yo\'q)'
            : `Bobin holati: ${b.status} — ishlab chiqarish mumkin emas`
        );
        return;
      }
      setSelectedBobin(b);
      toast.success('Bobin topildi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bobin topilmadi');
    }
  };

  const selectBobin = (b: Bobin) => {
    setSelectedBobin(b);
    setBobinQr(b.qr_code);
  };

  const handleStart = async () => {
    const qr = bobinQr.trim() || selectedBobin?.qr_code;
    if (!qr || !machineId) {
      toast.error('Bobin barcode va mashina tanlang');
      return;
    }
    try {
      const s = await apiClient.startProduction({ bobinQrCode: qr, machineId });
      toast.success(`Sessiya boshlandi: ${(s as { session_code: string }).session_code}`);
      setBobinQr('');
      setSelectedBobin(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  const handleClay = async (sessionId: string, kg?: number) => {
    const qty = kg ?? parseFloat(clayKg);
    if (!qty || qty <= 0) {
      toast.error('Kley og\'irligini kiriting');
      return;
    }
    try {
      const res = await apiClient.addClayToSession(sessionId, { quantityKg: qty });
      const total = (res as { totalClayUsedKg?: number }).totalClayUsedKg;
      toast.success(
        total != null
          ? `+${qty} kg kley — jami: ${Number(total).toLocaleString('uz-UZ')} kg`
          : `${qty} kg kley qo'shildi`
      );
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  const openSessionDetail = async (sessionId: string) => {
    setDetailLoading(true);
    try {
      const d = await apiClient.getProductionSession(sessionId);
      setDetailSession(d);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleFinish = async (sessionId: string) => {
    const remaining = parseFloat(finishForm.bobinRemainingWeightKg);
    try {
      const res = await apiClient.finishProduction(sessionId, {
        outputWeightKg: parseFloat(finishForm.outputWeightKg),
        bobinRemainingWeightKg: remaining,
      });
      const cost = res.costReport;
      let clayMsg = '';
      if (cost) {
        const clay = Number(cost.clay_used_kg);
        const paper = Number(cost.paper_used_kg);
        const perPaper = paper > 0 ? clay / paper : null;
        clayMsg = ` Kley jami ${fmtKg(clay)}; ${fmtRatio(perPaper)} kg/ishl. qog'oz; ${fmtRatio(cost.clay_per_kg_paper)} kg/tayyor chiqish.`;
      }
      if (remaining > 0.01) {
        toast.success(
          `FINISH — bobinda ${remaining} kg qoldi.${clayMsg} SPLIT qiling.`,
          { duration: 10000 }
        );
      } else {
        toast.success(`FINISH tugadi.${clayMsg} SPLIT qiling.`, { duration: 10000 });
      }
      setFinishForm({ outputWeightKg: '', bobinRemainingWeightKg: '' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  const handleSplit = async () => {
    if (!splitSessionId) {
      toast.error('Sessiya tanlang');
      return;
    }
    const weights = splitWeights.split(',').map((w) => parseFloat(w.trim())).filter((n) => !isNaN(n));
    if (!weights.length) {
      toast.error('Og\'irliklarni vergul bilan kiriting');
      return;
    }
    try {
      const created = await apiClient.splitParentPaper({
        sessionId: splitSessionId,
        children: weights.map((weightKg) => ({ weightKg })),
      });
      setLastSplitPapers(created);
      toast.success(`${created.length} ta ona qog\'oz yaratildi — Kesish sahifasida PP kodlarini ishlating`, { duration: 8000 });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  const finishedSessions = sessions.filter((s) => s.status === 'tugallangan');

  return (
    <RoleGuard permission="production:read">
      <div className="p-4 sm:p-6 space-y-6">
        <h1 className="text-3xl font-bold">Ishlab chiqarish</h1>

        {active.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Play className="h-5 w-5" />START — bobin ochish</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <BarcodeScanner
                label="Bobin barcode / QR skaner"
                placeholder="BOB-... yoki skaner"
                onScan={handleScanBobin}
              />
              {selectedBobin && (
                <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm">
                  <p className="font-mono font-bold">{selectedBobin.qr_code}</p>
                  <p>{bobinSummaryText(selectedBobin)}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-3 items-end">
                <Select value={machineId} onValueChange={setMachineId}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Mashina" /></SelectTrigger>
                  <SelectContent>
                    {machines.map((m) => (
                      <SelectItem key={String(m.id)} value={String(m.id)}>{String(m.name)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleStart}>Mashinani boshlash</Button>
              </div>
              {warehouseBobins.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-2">Ombordagi bobinlar (bosib tanlang)</p>
                  <div className="flex flex-wrap gap-2">
                    {warehouseBobins.slice(0, 12).map((b) => (
                      <Button
                        key={b.id}
                        type="button"
                        size="sm"
                        variant={selectedBobin?.id === b.id ? 'default' : 'outline'}
                        className="font-mono text-xs"
                        onClick={() => selectBobin(b)}
                      >
                        {b.qr_code.slice(-8)} · {formatBobinWidthMm(b.width_mm)} · {b.current_weight_kg}kg
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {active.length > 0 && (
          <Card className="border-blue-300 bg-blue-50">
            <CardHeader><CardTitle>Faol sessiyalar</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {active.map((s) => (
                <div key={String(s.id)} className="border rounded-lg p-4 bg-white space-y-3">
                  <div className="flex justify-between flex-wrap gap-2">
                    <span className="font-mono font-bold">{String(s.session_code)}</span>
                    <span className="text-sm font-mono">{String(s.bobin_qr)}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Bobin: {fmtKg(s.bobin_weight_at_start_kg)} boshlang&apos;ich
                    {Number(s.bobin_consumed_so_far_kg) > 0 &&
                      ` · ${fmtKg(s.bobin_consumed_so_far_kg)} ishlatildi`}
                  </p>
                  <ProductionStatsGrid s={s} />
                  {showWorkersPanel && (
                    <SessionWorkersPanel
                      sessionId={String(s.id)}
                      loadPool={() =>
                        apiClient.getProductionWorkersPool() as Promise<
                          { id: string; full_name: string; monthly_salary: number }[]
                        >
                      }
                      loadAssigned={async () => {
                        const d = await apiClient.getProductionSession(String(s.id));
                        const w = (d.workers || []) as {
                          id: string;
                          full_name: string;
                          kg_per_minute: number;
                        }[];
                        return w;
                      }}
                      onSave={(workers) =>
                        apiClient.setProductionSessionWorkers(String(s.id), workers).then(() => undefined)
                      }
                    />
                  )}
                  <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        inputMode="decimal"
                        className="w-24 min-h-[40px]"
                        value={clayKg}
                        onChange={(e) => setClayKg(e.target.value)}
                      />
                      <Button size="sm" variant="outline" onClick={() => handleClay(String(s.id))}>
                        <Droplets className="h-4 w-4 mr-1" />
                        Kley qo&apos;shish
                      </Button>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => openSessionDetail(String(s.id))}>
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Tarix
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm"><Square className="h-4 w-4 mr-1" />FINISH</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>FINISH — {String(s.session_code)}</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Tayyor mahsulot (kg)</Label>
                            <Input value={finishForm.outputWeightKg} onChange={(e) => setFinishForm({ ...finishForm, outputWeightKg: e.target.value })} />
                          </div>
                          <div>
                            <Label>Qolgan bobin (kg)</Label>
                            <p className="text-xs text-slate-500 mb-1">
                              0 dan katta bo&apos;lsa bobin yana <strong>omborda</strong> — keyin qayta ishlatish mumkin
                            </p>
                            <Input
                              type="number"
                              step="0.001"
                              inputMode="decimal"
                              value={finishForm.bobinRemainingWeightKg}
                              onChange={(e) => setFinishForm({ ...finishForm, bobinRemainingWeightKg: e.target.value })}
                            />
                          </div>
                          <Button className="w-full" onClick={() => handleFinish(String(s.id))}>Yakunlash</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scissors className="h-5 w-5" />
              Ona qog&apos;oz SPLIT (kesish uchun QR yaratadi)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">FINISH qilingan sessiyani bo&apos;laklarga bo&apos;ling — har biri uchun <strong>PP-...</strong> QR chiqadi.</p>
            <Select
              value={splitSessionId}
              onValueChange={(id) => {
                setSplitSessionId(id);
                const s = finishedSessions.find((x) => String(x.id) === id);
                if (s?.output_weight_kg) {
                  const out = Number(s.output_weight_kg);
                  const n = 3;
                  const each = Math.round((out / n) * 10) / 10;
                  setSplitWeights(Array(n).fill(each).join(','));
                }
              }}
            >
              <SelectTrigger><SelectValue placeholder="Tugallangan sessiya" /></SelectTrigger>
              <SelectContent>
                {finishedSessions.map((s) => (
                  <SelectItem key={String(s.id)} value={String(s.id)}>
                    {String(s.session_code)} — chiqish {fmtKg(s.output_weight_kg)}, kley {fmtKg(s.total_clay_used_kg)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div>
              <Label>Bo&apos;lak og&apos;irliklari (kg), vergul bilan</Label>
              <Input placeholder="540,540,540" value={splitWeights} onChange={(e) => setSplitWeights(e.target.value)} />
            </div>
            <Button onClick={handleSplit} disabled={!splitSessionId}>
              <Plus className="h-4 w-4 mr-1" />SPLIT qilish
            </Button>
            {lastSplitPapers.length > 0 && (
              <div className="rounded-lg border-2 border-green-400 bg-green-50 p-4 space-y-2">
                <p className="font-semibold text-green-900">Yaratilgan ona qog&apos;oz QR (kesish uchun):</p>
                {lastSplitPapers.map((p) => (
                  <div key={String(p.id)} className="flex flex-wrap justify-between items-center gap-2 font-mono text-sm bg-white p-2 rounded">
                    <span className="font-bold text-green-800">{String(p.qr_code)}</span>
                    <span>{Number(p.weight_kg).toLocaleString('uz-UZ')} kg</span>
                    <PrintQrButton
                      code={String(p.qr_code)}
                      title="Ona qog'oz"
                      lines={[`${Number(p.weight_kg)} kg`]}
                    />
                  </div>
                ))}
                <p className="text-xs text-green-700">Bu kodlarni etiketga yoping, keyin Kesish sahifasida skanerlang.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Barcha sessiyalar — kley hisobi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-4">
            {loading ? (
              <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>
            ) : (
              <>
                <div className="md:hidden divide-y">
                  {sessions.map((s) => {
                    const st = sessionClaySummary(s);
                    return (
                      <div key={String(s.id)} className="p-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="font-mono font-bold">{String(s.session_code)}</span>
                          <Badge>{sessionStatusLabels[String(s.status)] || String(s.status)}</Badge>
                        </div>
                        <p className="text-xs font-mono text-slate-600">{String(s.bobin_qr)}</p>
                        <p className="text-sm">
                          Bobin {fmtKg(st.start)} → ishlatilgan {fmtKg(st.paperUsed)} · kley{' '}
                          <strong>{fmtKg(st.clay)}</strong> · chiqish {fmtKg(st.output)}
                        </p>
                        {st.output > 0 && (
                          <p className="text-xs text-blue-800">
                            {fmtRatio(st.clayPerOutput)} kg kley / 1 kg chiqish ·{' '}
                            {fmtRatio(st.clayPerPaper)} kg kley / 1 kg qog&apos;oz
                          </p>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openSessionDetail(String(s.id))}>
                          Batafsil
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kod</TableHead>
                        <TableHead>Bobin</TableHead>
                        <TableHead>Bobin kg</TableHead>
                        <TableHead>Ishl. qog&apos;oz</TableHead>
                        <TableHead>Kley jami</TableHead>
                        <TableHead>Chiqish</TableHead>
                        <TableHead>Kley/kg chiqish</TableHead>
                        <TableHead>Kley/kg qog&apos;oz</TableHead>
                        <TableHead>Holat</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((s) => (
                        <TableRow key={String(s.id)}>
                          <TableCell className="font-mono text-xs">{String(s.session_code)}</TableCell>
                          <TableCell className="font-mono text-xs">{String(s.bobin_qr || '—')}</TableCell>
                          <TableCell>{fmtKg(s.bobin_weight_at_start_kg)}</TableCell>
                          <TableCell>{fmtKg(s.bobin_used_kg)}</TableCell>
                          <TableCell className="font-medium text-blue-700">
                            {fmtKg(s.total_clay_used_kg)}
                          </TableCell>
                          <TableCell>{fmtKg(s.output_weight_kg)}</TableCell>
                          <TableCell>{fmtRatio(s.clay_per_kg_output)}</TableCell>
                          <TableCell>{fmtRatio(s.clay_per_kg_paper)}</TableCell>
                          <TableCell>
                            <Badge>{sessionStatusLabels[String(s.status)] || String(s.status)}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => openSessionDetail(String(s.id))}>
                              Batafsil
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!detailSession} onOpenChange={(o) => !o && setDetailSession(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {detailSession ? String(detailSession.session_code) : 'Sessiya'}
              </DialogTitle>
            </DialogHeader>
            {detailLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
            ) : detailSession ? (
              <div className="space-y-4 text-sm">
                <ProductionStatsGrid s={detailSession} />
                <div>
                  <p className="font-medium mb-2">Kley qo&apos;shishlar tarixi</p>
                  {(detailSession.clayAdditions as Record<string, unknown>[])?.length ? (
                    <ul className="space-y-1 border rounded-lg divide-y">
                      {(detailSession.clayAdditions as Record<string, unknown>[]).map((a) => (
                        <li key={String(a.id)} className="flex justify-between px-3 py-2">
                          <span>
                            {a.added_at
                              ? new Date(String(a.added_at)).toLocaleString('uz-UZ')
                              : '—'}
                          </span>
                          <span className="font-semibold">+{fmtKg(a.quantity_kg)}</span>
                          <span className="text-slate-500">jami {fmtKg(a.cumulative_kg)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500">Hali kley qo&apos;shilmagan</p>
                  )}
                </div>
                {detailSession.costReport && (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3 space-y-1">
                    <p className="font-medium text-green-900">Tannarx hisoboti (FINISH)</p>
                    <p>Kley: {fmtKg((detailSession.costReport as Record<string, unknown>).clay_used_kg)}</p>
                    <p>Qog&apos;oz ishlatilgan: {fmtKg((detailSession.costReport as Record<string, unknown>).paper_used_kg)}</p>
                    <p>
                      Ish haqi (ishchilar):{' '}
                      {Number((detailSession.costReport as Record<string, unknown>).labor_workers_cost || 0).toLocaleString('uz-UZ')} so&apos;m
                    </p>
                    <p>
                      Jami tannarx:{' '}
                      {Number((detailSession.costReport as Record<string, unknown>).grand_total_cost || 0).toLocaleString('uz-UZ')} so&apos;m
                    </p>
                    <p>1 kg chiqish narxi: {Number((detailSession.costReport as Record<string, unknown>).cost_per_kg_output).toLocaleString('uz-UZ')} so&apos;m</p>
                  </div>
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
