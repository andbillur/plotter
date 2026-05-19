'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { apiClient } from '@/lib/api';
import { sessionStatusLabels } from '@/lib/constants';
import { Play, Square, Droplets, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ManufacturingPage() {
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([]);
  const [active, setActive] = useState<Record<string, unknown>[]>([]);
  const [machines, setMachines] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [bobinQr, setBobinQr] = useState('');
  const [machineId, setMachineId] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [finishForm, setFinishForm] = useState({ outputWeightKg: '', bobinRemainingWeightKg: '' });

  const load = useCallback(() => {
    Promise.all([
      apiClient.getProductionSessions({ limit: '50' }),
      apiClient.getActiveProductionSessions(),
      apiClient.getMachines(),
    ])
      .then(([list, act, m]) => {
        setSessions(list.data);
        setActive(act);
        setMachines(m.filter((x) => x.machine_type === 'production'));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleStart = async () => {
    if (!bobinQr || !machineId) {
      toast.error('Bobin QR va mashina tanlang');
      return;
    }
    try {
      const s = await apiClient.startProduction({ bobinQrCode: bobinQr, machineId });
      toast.success(`Sessiya boshlandi: ${(s as { session_code: string }).session_code}`);
      setBobinQr('');
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
      const res = await apiClient.finishProduction(sessionId, {
        outputWeightKg: parseFloat(finishForm.outputWeightKg),
        bobinRemainingWeightKg: parseFloat(finishForm.bobinRemainingWeightKg),
      });
      toast.success('Sessiya tugallandi, tannarx hisoblandi');
      setSelectedId(null);
      load();
      console.log(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  return (
    <RoleGuard permission="production:read">
      <div className="p-4 sm:p-6 space-y-6">
        <h1 className="text-3xl font-bold">Ishlab chiqarish</h1>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Play className="h-5 w-5" />START</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Input placeholder="Bobin QR kod" value={bobinQr} onChange={(e) => setBobinQr(e.target.value)} className="max-w-xs" />
            <Select value={machineId} onValueChange={setMachineId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Mashina" /></SelectTrigger>
              <SelectContent>
                {machines.map((m) => (
                  <SelectItem key={String(m.id)} value={String(m.id)}>{String(m.name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleStart}>Boshlash</Button>
          </CardContent>
        </Card>

        {active.length > 0 && (
          <Card className="border-blue-300 bg-blue-50">
            <CardHeader><CardTitle>Faol sessiyalar</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {active.map((s) => (
                <div key={String(s.id)} className="border rounded-lg p-4 bg-white space-y-3">
                  <div className="flex justify-between">
                    <span className="font-mono font-bold">{String(s.session_code)}</span>
                    <span className="text-sm">{String(s.bobin_qr)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleClay(String(s.id), 20)}>
                      <Droplets className="h-4 w-4 mr-1" />+20 kg kley
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => setSelectedId(String(s.id))}>
                          <Square className="h-4 w-4 mr-1" />FINISH
                        </Button>
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

        <Card>
          <CardHeader><CardTitle>Barcha sessiyalar</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div> : (
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
