'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { apiClient } from '@/lib/api';
import { sessionStatusLabels } from '@/lib/constants';
import { Play, Plus, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const COLORS = ['white', 'cream', 'blue', 'grey', 'other'];

export default function CuttingPage() {
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([]);
  const [activeSession, setActiveSession] = useState<Record<string, unknown> | null>(null);
  const [products, setProducts] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [ppQr, setPpQr] = useState('');
  const [inputKg, setInputKg] = useState('');
  const [prodForm, setProdForm] = useState({ widthCm: '', weightKg: '', color: 'white' });

  const load = useCallback(() => {
    apiClient
      .getCuttingSessions({ limit: '50' })
      .then((res) => {
        setSessions(res.data);
        const open = res.data.find((s) => s.status === 'boshlangan');
        if (open) {
          setActiveSession(open);
          apiClient.getCuttingSession(String(open.id)).then((d) => setProducts(d.products || []));
        } else {
          setActiveSession(null);
          setProducts([]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleStart = async () => {
    try {
      const s = await apiClient.startCutting({
        parentPaperQrCode: ppQr,
        inputWeightKg: parseFloat(inputKg),
      });
      toast.success(`Kesish boshlandi: ${(s as { session_code: string }).session_code}`);
      setPpQr('');
      setInputKg('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  const handleAddProduct = async () => {
    if (!activeSession) return;
    try {
      await apiClient.addCuttingProduct(String(activeSession.id), {
        widthCm: parseFloat(prodForm.widthCm),
        weightKg: parseFloat(prodForm.weightKg),
        color: prodForm.color,
      });
      toast.success('O\'ram qo\'shildi (QR avtomatik)');
      setProdForm({ widthCm: '', weightKg: '', color: 'white' });
      const d = await apiClient.getCuttingSession(String(activeSession.id));
      setProducts(d.products || []);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  const handleFinish = async () => {
    if (!activeSession) return;
    try {
      await apiClient.finishCutting(String(activeSession.id));
      toast.success('Kesish tugallandi');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  return (
    <RoleGuard permission="cutting:read">
      <div className="p-4 sm:p-6 space-y-6">
        <h1 className="text-3xl font-bold">Kesish</h1>

        {!activeSession && (
          <Card>
            <CardHeader><CardTitle className="flex gap-2 items-center"><Play className="h-5 w-5" />Sessiya boshlash</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Input placeholder="Ona qog'oz QR" value={ppQr} onChange={(e) => setPpQr(e.target.value)} className="max-w-xs" />
              <Input placeholder="Kirish og'irligi (kg)" type="number" value={inputKg} onChange={(e) => setInputKg(e.target.value)} className="max-w-xs" />
              <Button onClick={handleStart}>Boshlash</Button>
            </CardContent>
          </Card>
        )}

        {activeSession && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle>Faol: {String(activeSession.session_code)} — Brak: {Number(activeSession.waste_percent || 0).toFixed(1)}%</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label>Eni (sm)</Label>
                  <Input value={prodForm.widthCm} onChange={(e) => setProdForm({ ...prodForm, widthCm: e.target.value })} />
                </div>
                <div>
                  <Label>Og&apos;irlik (kg)</Label>
                  <Input value={prodForm.weightKg} onChange={(e) => setProdForm({ ...prodForm, weightKg: e.target.value })} />
                </div>
                <div>
                  <Label>Rang</Label>
                  <Input list="colors" value={prodForm.color} onChange={(e) => setProdForm({ ...prodForm, color: e.target.value })} />
                  <datalist id="colors">{COLORS.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddProduct} className="w-full"><Plus className="h-4 w-4 mr-1" />O&apos;ram</Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="default" onClick={handleFinish}><CheckCircle className="h-4 w-4 mr-1" />Kesishni tugatish</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>QR</TableHead>
                    <TableHead>Eni</TableHead>
                    <TableHead>kg</TableHead>
                    <TableHead>Rang</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={String(p.id)}>
                      <TableCell className="font-mono text-xs">{String(p.qr_code)}</TableCell>
                      <TableCell>{p.width_cm} sm</TableCell>
                      <TableCell>{p.weight_kg}</TableCell>
                      <TableCell>{String(p.color)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Tarix</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead>Brak %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={String(s.id)}>
                      <TableCell className="font-mono">{String(s.session_code)}</TableCell>
                      <TableCell><Badge>{sessionStatusLabels[String(s.status)] || String(s.status)}</Badge></TableCell>
                      <TableCell>{Number(s.waste_percent || 0).toFixed(2)}%</TableCell>
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
