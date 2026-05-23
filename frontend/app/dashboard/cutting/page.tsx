'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { apiClient } from '@/lib/api';
import { sessionStatusLabels } from '@/lib/constants';
import { PrintQrButton } from '@/components/PrintQrButton';
import { Play, Plus, CheckCircle, Loader2, Info, List } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { SessionWorkersPanel } from '@/components/SessionWorkersPanel';
import { useAuthStore } from '@/lib/store';
import { isCostAdmin } from '@/lib/admin';
import { calcPackagingCost } from '@/lib/cost-calc';
import { expectedNetWeightKg, STANDARD_WIDTH_KG } from '@/lib/expected-weight';
import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const COLORS = ['white', 'cream', 'blue', 'grey', 'other'];

export default function CuttingPage() {
  const user = useAuthStore((s) => s.user);
  const showWorkersPanel = isCostAdmin(user);
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([]);
  const [availablePapers, setAvailablePapers] = useState<Record<string, unknown>[]>([]);
  const [activeSession, setActiveSession] = useState<Record<string, unknown> | null>(null);
  const [products, setProducts] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [ppQr, setPpQr] = useState('');
  const [inputKg, setInputKg] = useState('');
  const [selectedPaper, setSelectedPaper] = useState<Record<string, unknown> | null>(null);
  const [prodForm, setProdForm] = useState({ widthCm: '', weightKg: '', color: 'white' });
  const [packPricePerM, setPackPricePerM] = useState(6000);

  useEffect(() => {
    apiClient.getCostConfig().then((c) => {
      if (c?.packaging_price_per_meter) setPackPricePerM(Number(c.packaging_price_per_meter));
    }).catch(() => {});
  }, []);

  const packPreview = useMemo(() => {
    const w = parseFloat(prodForm.widthCm);
    if (!w || w <= 0) return null;
    return calcPackagingCost(w, packPricePerM);
  }, [prodForm.widthCm, packPricePerM]);

  const load = useCallback(() => {
    Promise.all([
      apiClient.getCuttingSessions({ limit: '50' }),
      apiClient.getParentPapersAvailableForCutting(),
    ])
      .then(([cutRes, papers]) => {
        setSessions(cutRes.data);
        setAvailablePapers(papers);
        const open = cutRes.data.find((s) => s.status === 'boshlangan');
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

  const selectPaper = (p: Record<string, unknown>) => {
    setSelectedPaper(p);
    setPpQr(String(p.qr_code));
    setInputKg(String(p.weight_kg));
  };

  const handleScanPaper = async (code: string) => {
    const trimmed = code.trim();
    setPpQr(trimmed);

    if (/^PS-/i.test(trimmed)) {
      try {
        const p = await apiClient.scanQr(trimmed);
        if (p.type === 'production_session') {
          const avail = (p as { parentPapersAvailable?: Record<string, unknown>[] }).parentPapersAvailable;
          if (avail && avail.length > 0) {
            selectPaper(avail[0]);
            toast.success(`PS emas, PP tanlandi: ${avail[0].qr_code}`);
          } else {
            toast.error('Bu PS sessiya. Ishlab chiqarish → SPLIT qiling (PP- kod chiqadi)', { duration: 6000 });
          }
          return;
        }
      } catch {
        toast.error('Bu PS (ishlab chiqarish) kodi. Avval SPLIT qiling — faqat PP-... ishlaydi', { duration: 6000 });
        return;
      }
    }

    if (/^BOB-/i.test(trimmed)) {
      toast.error('Bu bobin kodi. Kesish uchun PP-... (ona qog\'oz) skanerlang', { duration: 5000 });
      return;
    }

    try {
      const p = await apiClient.scanQr(trimmed);
      if (p.type === 'parent_paper') {
        const d = p.data;
        if (d.is_cut) {
          toast.error('Bu ona qog\'oz allaqachon kesilgan');
          return;
        }
        selectPaper(d);
        toast.success('Ona qog\'oz topildi');
      } else if (p.type === 'production_session') {
        const avail = (p as { parentPapersAvailable?: Record<string, unknown>[] }).parentPapersAvailable;
        if (avail?.length) {
          selectPaper(avail[0]);
          toast.success(`PP tanlandi: ${avail[0].qr_code}`);
        } else {
          toast.error((p as { hint?: string }).hint || 'Avval SPLIT qiling');
        }
      } else {
        toast.error(`Bu ${p.type} — faqat PP-... (ona qog\'oz)`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Topilmadi. Kod PP-... bilan boshlanishi kerak');
    }
  };

  const handleStart = async () => {
    if (!ppQr || !inputKg) {
      toast.error('Ona qog\'oz va og\'irlik kerak');
      return;
    }
    try {
      const s = await apiClient.startCutting({
        parentPaperQrCode: ppQr.trim(),
        inputWeightKg: parseFloat(inputKg),
      });
      toast.success(`Kesish boshlandi: ${(s as { session_code: string }).session_code}`);
      setPpQr('');
      setInputKg('');
      setSelectedPaper(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  const applyCutWidth = (widthStr: string) => {
    const w = parseFloat(widthStr);
    const net = expectedNetWeightKg(w);
    setProdForm((f) => ({
      ...f,
      widthCm: widthStr,
      weightKg: net != null ? String(net) : f.weightKg,
    }));
  };

  const handleAddProduct = async () => {
    if (!activeSession) return;
    const widthCm = parseFloat(prodForm.widthCm);
    if (!widthCm) {
      toast.error('Eni (sm) kiriting');
      return;
    }
    const net = expectedNetWeightKg(widthCm);
    try {
      await apiClient.addCuttingProduct(String(activeSession.id), {
        widthCm,
        netWeightKg: net ?? undefined,
        weightKg: prodForm.weightKg ? parseFloat(prodForm.weightKg) : undefined,
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
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto w-full min-w-0 overflow-x-hidden">
        <h1 className="text-2xl sm:text-3xl font-bold">Kesish</h1>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4 text-sm text-blue-900 space-y-2">
            <p className="font-semibold flex items-center gap-2"><Info className="h-4 w-4" />Ona qog&apos;oz kodi qayerdan?</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800">
              <li>Ishlab chiqarish FINISH dan keyin <strong>SPLIT</strong> — har bo&aposlak uchun <strong className="text-red-700">PP-...</strong> QR (PS-... emas!)</li>
              <li>Etiketdagi <strong>PP-</strong> kodini skanerlang yoki ro&apos;yxatdan tanlang</li>
              <li>Kesishda shu PP kod bilan boshlang</li>
            </ol>
            <p className="text-xs font-mono bg-white/60 p-2 rounded border border-blue-200">
              ❌ PS-20250520-001 — ishlab chiqarish · ✅ PP-20250520-001 — ona qog&apos;oz (kesish)
            </p>
          </CardContent>
        </Card>

        {!activeSession && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex gap-2 items-center"><Play className="h-5 w-5" />Kesishni boshlash</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <BarcodeScanner
                  label="Ona qog'oz barcode / QR"
                  placeholder="PP-... (ona qogoz) — PS- emas!"
                  onScan={handleScanPaper}
                />
                {selectedPaper && (
                  <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm">
                    <p className="font-mono font-bold">{String(selectedPaper.qr_code)}</p>
                    <p>{Number(selectedPaper.weight_kg).toLocaleString('uz-UZ')} kg — {String(selectedPaper.session_code || '')}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <Label>Kirish og&apos;irligi (kg)</Label>
                    <Input type="number" step="0.001" value={inputKg} onChange={(e) => setInputKg(e.target.value)} className="max-w-[140px]" />
                  </div>
                  <Button onClick={handleStart} disabled={!ppQr}>Boshlash</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <List className="h-5 w-5" />
                  Kesishga tayyor ona qog&apos;ozlar ({availablePapers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {availablePapers.length === 0 ? (
                  <p className="p-6 text-slate-500 text-sm">
                    Hozircha ona qog&apos;oz yo&apos;q. Avval ishlab chiqarishda FINISH va SPLIT qiling.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>QR kod</TableHead>
                        <TableHead>kg</TableHead>
                        <TableHead>Sessiya</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availablePapers.map((p) => (
                        <TableRow key={String(p.id)} className={selectedPaper?.id === p.id ? 'bg-green-50' : ''}>
                          <TableCell className="font-mono text-xs">
                            <span className="inline-flex items-center gap-1">
                              {String(p.qr_code)}
                              <PrintQrButton code={String(p.qr_code)} title="Ona qog'oz" lines={[`${p.weight_kg} kg`]} size="icon" />
                            </span>
                          </TableCell>
                          <TableCell>{Number(p.weight_kg).toLocaleString('uz-UZ')}</TableCell>
                          <TableCell>{String(p.session_code || '—')}</TableCell>
                          <TableCell className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => selectPaper(p)}>
                              Tanlash
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeSession && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle>Faol: {String(activeSession.session_code)} — Brak: {Number(activeSession.waste_percent || 0).toFixed(1)}%</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {showWorkersPanel && (
                <SessionWorkersPanel
                  sessionId={String(activeSession.id)}
                  rateUnit="kg/min"
                  loadPool={() =>
                    apiClient.getCuttingWorkersPool() as Promise<
                      { id: string; full_name: string; monthly_salary: number }[]
                    >
                  }
                  loadAssigned={async () => {
                    const d = await apiClient.getCuttingSession(String(activeSession.id));
                    const w = (d.workers || []) as {
                      id: string;
                      full_name: string;
                      kg_per_minute: number;
                    }[];
                    return w;
                  }}
                  onSave={(workers) =>
                    apiClient.setCuttingSessionWorkers(String(activeSession.id), workers).then(() => undefined)
                  }
                />
              )}
              <p className="text-xs text-orange-900 bg-white/70 rounded p-2 border border-orange-200">
                Net: {STANDARD_WIDTH_KG.map((x) => `${x.width}→${x.kg}`).join(', ')} kg
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Eni (sm)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    className="min-h-[48px] text-lg"
                    value={prodForm.widthCm}
                    onChange={(e) => applyCutWidth(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Net og&apos;irlik (kg) — avtomatik</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    className="min-h-[48px] text-lg bg-white font-semibold"
                    value={prodForm.weightKg}
                    onChange={(e) => setProdForm({ ...prodForm, weightKg: e.target.value })}
                  />
                  <p className="text-xs text-slate-600 mt-1">Kerak bo&apos;lsa qo&apos;lda tuzating</p>
                </div>
                <div>
                  <Label>Rang</Label>
                  <Input
                    list="colors"
                    className="min-h-[48px]"
                    value={prodForm.color}
                    onChange={(e) => setProdForm({ ...prodForm, color: e.target.value })}
                  />
                  <datalist id="colors">{COLORS.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <div className="flex items-end sm:col-span-2">
                  <Button onClick={handleAddProduct} className="w-full min-h-[48px]">
                    <Plus className="h-4 w-4 mr-1" />
                    O&apos;ram qo&apos;shish
                  </Button>
                </div>
              </div>
              {packPreview && (
                <p className="text-sm text-orange-900 bg-white/80 border border-orange-200 rounded p-2">
                  Qadoqlash: {prodForm.widthCm} sm → hisobda <strong>{packPreview.billingWidthCm} sm</strong> (
                  {packPreview.meters} m) × {packPreview.pricePerMeter.toLocaleString('uz-UZ')} ={' '}
                  <strong>{packPreview.cost.toLocaleString('uz-UZ')} so&apos;m</strong>
                  <span className="text-xs block mt-1 text-slate-600">
                    Narxni Sozlamalar → Qadoqlash (1 metr) dan o&apos;zgartirasiz
                  </span>
                </p>
              )}
              <Button variant="default" className="w-full sm:w-auto min-h-[48px]" onClick={handleFinish}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Kesishni tugatish
              </Button>
              <div className="md:hidden divide-y border rounded-lg bg-white">
                {products.map((p) => (
                  <div key={String(p.id)} className="p-3 text-sm">
                    <p className="font-mono text-xs font-bold break-all">{String(p.qr_code)}</p>
                    <p>{p.width_cm} sm · Net {Number(p.net_weight_kg ?? p.weight_kg)} kg · {String(p.color)}</p>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>QR</TableHead>
                      <TableHead>Eni</TableHead>
                      <TableHead>Net kg</TableHead>
                      <TableHead>Rang</TableHead>
                      <TableHead>Qadoqlash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p) => (
                      <TableRow key={String(p.id)}>
                        <TableCell className="font-mono text-xs">{String(p.qr_code)}</TableCell>
                        <TableCell>{p.width_cm} sm</TableCell>
                        <TableCell>{Number(p.net_weight_kg ?? p.weight_kg)}</TableCell>
                        <TableCell>{String(p.color)}</TableCell>
                        <TableCell className="text-xs">
                          {Number(p.packaging_cost || 0).toLocaleString('uz-UZ')} so&apos;m
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Tarix</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>
            ) : (
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
