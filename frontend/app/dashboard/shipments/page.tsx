'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { apiClient } from '@/lib/api';
import { Plus, QrCode, Truck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Record<string, unknown>[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeShip, setActiveShip] = useState<Record<string, unknown> | null>(null);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState('');
  const [dest, setDest] = useState('');
  const [customer, setCustomer] = useState('');

  const load = useCallback(() => {
    apiClient
      .getShipments({ limit: '50' })
      .then((res) => {
        setShipments(res.data);
        const draft = res.data.find((s) => s.status === 'tayyorlanmoqda');
        if (draft && !activeId) setActiveId(String(draft.id));
      })
      .finally(() => setLoading(false));
  }, [activeId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (activeId) {
      apiClient.getShipment(activeId).then((s) => {
        setActiveShip(s);
        setItems(s.items || []);
      });
    }
  }, [activeId]);

  const handleCreate = async () => {
    try {
      const s = await apiClient.createShipment({ destination: dest, customerName: customer });
      toast.success(`Jo'natma: ${(s as { shipment_code: string }).shipment_code}`);
      setActiveId(String((s as { id: string }).id));
      setDest('');
      setCustomer('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  const handleScan = async () => {
    if (!activeId || !qr) return;
    try {
      await apiClient.scanShipmentItem(activeId, qr.trim());
      toast.success('QR qo\'shildi');
      setQr('');
      const s = await apiClient.getShipment(activeId);
      setActiveShip(s);
      setItems(s.items || []);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  const handleFinish = async () => {
    if (!activeId) return;
    try {
      await apiClient.finishShipment(activeId);
      toast.success('Jo\'natma yuborildi');
      setActiveId(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  return (
    <RoleGuard permission="shipment:read">
      <div className="p-4 sm:p-6 space-y-6">
        <h1 className="text-3xl font-bold flex items-center gap-2"><Truck className="h-8 w-8" />Jo&apos;natmalar</h1>

        <Card>
          <CardHeader><CardTitle>Yangi jo&apos;natma</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Input placeholder="Mijoz" value={customer} onChange={(e) => setCustomer(e.target.value)} className="max-w-xs" />
            <Input placeholder="Manzil" value={dest} onChange={(e) => setDest(e.target.value)} className="max-w-xs" />
            <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-1" />Yaratish</Button>
          </CardContent>
        </Card>

        {activeShip && activeShip.status === 'tayyorlanmoqda' && (
          <Card className="border-purple-300 bg-purple-50">
            <CardHeader>
              <CardTitle>{String(activeShip.shipment_code)} — QR skanerlash</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>{activeShip.total_items} dona, {Number(activeShip.total_weight_kg).toLocaleString('uz-UZ')} kg</p>
              <div className="flex gap-3">
                <Input
                  placeholder="Tayyor mahsulot QR (ombordan)"
                  value={qr}
                  onChange={(e) => setQr(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                  className="max-w-md"
                />
                <Button onClick={handleScan}><QrCode className="h-4 w-4 mr-1" />Qo&apos;shish</Button>
                <Button variant="default" onClick={handleFinish}>Jo&apos;natish</Button>
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
                  {items.map((i) => (
                    <TableRow key={String(i.id)}>
                      <TableCell className="font-mono text-xs">{String(i.qr_code)}</TableCell>
                      <TableCell>{i.weight_kg}</TableCell>
                      <TableCell>{String(i.color)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Ro&apos;yxat</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Mijoz</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((s) => (
                    <TableRow key={String(s.id)}>
                      <TableCell className="font-mono">{String(s.shipment_code)}</TableCell>
                      <TableCell>{String(s.customer_name || '—')}</TableCell>
                      <TableCell>
                        <Badge>{s.status === 'tayyorlanmoqda' ? 'Tayyorlanmoqda' : 'Jo\'natilgan'}</Badge>
                      </TableCell>
                      <TableCell>
                        {s.status === 'tayyorlanmoqda' && (
                          <Button size="sm" variant="outline" onClick={() => setActiveId(String(s.id))}>
                            Ochish
                          </Button>
                        )}
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
