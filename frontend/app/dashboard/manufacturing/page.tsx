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
import { sessionStatusLabels } from '@/lib/constants';
import { Play, Square, Droplets, Loader2, Scissors, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Bobin } from '@/lib/types';

export default function ManufacturingPage() {
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
  const [splitWeights, setSplitWeights] = useState('540,540,540');

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

  const handleScanBobin = async (code: string) => {
    setBobinQr(code);
    try {
      const b = await apiClient.getBobinByQr(code);
      if (b.status !== 'omborxonada') {
        toast.error(`Bobin holati: ${b.status} — faqat ombordagilar ishlatiladi`);
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

  const handleClay = async (sessionId: string, kg: number) => {
    try {
      await apiClient.addClayToSession(sessionId, { quantityKg: kg });
      toast.success(`${kg} kg kley qo'shildi`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  const handleFinish = async (sessionId: string) => {
    try {
      await apiClient.finishProduction(sessionId, {
        outputWeightKg: parseFloat(finishForm.outputWeightKg),
        bobinRemainingWeightKg: parseFloat(finishForm.bobinRemainingWeightKg),
      });
      toast.success('FINISH — endi SPLIT qiling (ona qog\'oz QR)');
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
      toast.success(`${created.length} ta ona qog\'oz — QR: ${created.map((c: { qr_code: string }) => c.qr_code).join(', ')}`);
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
                  <p>{selectedBobin.grammaj} g/m² — {Number(selectedBobin.current_weight_kg).toLocaleString('uz-UZ')} kg</p>
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
                        {b.qr_code.slice(-8)} · {b.current_weight_kg}kg
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
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleClay(String(s.id), 20)}>
                      <Droplets className="h-4 w-4 mr-1" />+20 kg kley
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
                            <Input value={finishForm.bobinRemainingWeightKg} onChange={(e) => setFinishForm({ ...finishForm, bobinRemainingWeightKg: e.target.value })} />
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
            <Select value={splitSessionId} onValueChange={setSplitSessionId}>
              <SelectTrigger><SelectValue placeholder="Tugallangan sessiya" /></SelectTrigger>
              <SelectContent>
                {finishedSessions.map((s) => (
                  <SelectItem key={String(s.id)} value={String(s.id)}>
                    {String(s.session_code)} — {Number(s.output_weight_kg).toLocaleString('uz-UZ')} kg
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div>
              <Label>Bo&apos;lak og&apos;irliklari (kg), vergul bilan</Label>
              <Input placeholder="540,540,540" value={splitWeights} onChange={(e) => setSplitWeights(e.target.value)} />
            </div>
            <Button onClick={handleSplit}><Plus className="h-4 w-4 mr-1" />SPLIT qilish</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Barcha sessiyalar</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead>Chiqish kg</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={String(s.id)}>
                      <TableCell className="font-mono">{String(s.session_code)}</TableCell>
                      <TableCell><Badge>{sessionStatusLabels[String(s.status)] || String(s.status)}</Badge></TableCell>
                      <TableCell>{Number(s.output_weight_kg || 0).toLocaleString('uz-UZ')}</TableCell>
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
