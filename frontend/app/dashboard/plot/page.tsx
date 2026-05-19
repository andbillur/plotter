'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { apiClient } from '@/lib/api';
import { Plus, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function PlotPage() {
  const [plots, setPlots] = useState<Record<string, unknown>[]>([]);
  const [active, setActive] = useState<Record<string, unknown> | null>(null);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [widthCm, setWidthCm] = useState('202');
  const [productQr, setProductQr] = useState('');

  const load = useCallback(async () => {
    const [list, act] = await Promise.all([
      apiClient.getPlots({ limit: '30' }),
      apiClient.getActivePlot(),
    ]);
    setPlots(list.data);
    setActive(act);
    if (act?.id) {
      const detail = await apiClient.getPlot(String(act.id));
      setItems(detail.items || []);
    } else setItems([]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    try {
      await apiClient.createPlot({ widthCm: parseFloat(widthCm) });
      toast.success('PLOT ochildi');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  const handleAddItem = async () => {
    if (!active?.id || !productQr) return;
    try {
      const scan = await apiClient.scanQr(productQr);
      if (scan.type !== 'cut_product') {
        toast.error('Bu kesilgan mahsulot QR emas');
        return;
      }
      await apiClient.addPlotItem(String(active.id), scan.id);
      toast.success('PLOTga qo\'shildi');
      setProductQr('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  const handleClose = async () => {
    if (!active?.id) return;
    try {
      const res = await apiClient.closePlot(String(active.id));
      toast.success(`PLOT yopildi. Keyingi: ${(res as { nextPlotNumber: string }).nextPlotNumber}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  return (
    <RoleGuard permission="plot:read">
      <div className="p-4 sm:p-6 space-y-6">
        <h1 className="text-3xl font-bold">PLOT partiyalar</h1>

        {!active && (
          <Card>
            <CardHeader><CardTitle>Yangi PLOT</CardTitle></CardHeader>
            <CardContent className="flex gap-3">
              <div>
                <Label>Eni (sm)</Label>
                <Input value={widthCm} onChange={(e) => setWidthCm(e.target.value)} className="max-w-[120px]" />
              </div>
              <Button className="self-end" onClick={handleCreate}><Plus className="h-4 w-4 mr-1" />Ochish</Button>
            </CardContent>
          </Card>
        )}

        {active && (
          <Card className="border-green-300 bg-green-50">
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>{String(active.plot_number)} — {active.width_cm} sm</span>
                <Badge>Ochiq</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>{active.total_items} dona, {Number(active.total_weight_kg).toLocaleString('uz-UZ')} kg</p>
              <div className="flex gap-3">
                <Input placeholder="Kesilgan o'ram QR" value={productQr} onChange={(e) => setProductQr(e.target.value)} className="max-w-sm" />
                <Button onClick={handleAddItem}>Qo&apos;shish</Button>
                <Button variant="destructive" onClick={handleClose}><Lock className="h-4 w-4 mr-1" />Yopish → omborga</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>QR</TableHead>
                    <TableHead>kg</TableHead>
                    <TableHead>Rang</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((p) => (
                    <TableRow key={String(p.id)}>
                      <TableCell className="font-mono text-xs">{String(p.qr_code)}</TableCell>
                      <TableCell>{p.weight_kg}</TableCell>
                      <TableCell>{String(p.color || 'white')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Barcha PLOTlar</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Raqam</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead>kg</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plots.map((p) => (
                    <TableRow key={String(p.id)}>
                      <TableCell>{String(p.plot_number)}</TableCell>
                      <TableCell>{p.status === 'ochiq' ? 'Ochiq' : 'Yopiq'}</TableCell>
                      <TableCell>{Number(p.total_weight_kg).toLocaleString('uz-UZ')}</TableCell>
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
