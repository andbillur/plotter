'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { QrCode, CheckCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { bobinStatusLabels, formatBobinWidthMm } from '@/lib/constants';
import { toast } from 'sonner';

const actionLabels: Record<string, string> = {
  start_production: 'Ishlab chiqarishni boshlash',
  start_cutting: 'Kesishni boshlash',
  add_to_plot: 'PLOTga qo\'shish',
  receive_bobin: 'Bobin qabul',
  receive_clay: 'Kley kirim',
  register_warehouse: 'Omborga qo\'shish',
  add_to_shipment: 'Jo\'natmaga qo\'shish',
};

type ScanResult = {
  type: string;
  data: Record<string, unknown>;
  allowedActions: string[];
  hint?: string;
  parentPapersAvailable?: Record<string, unknown>[];
};

export default function QRScannerPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);

  const lookupCode = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    setCode(trimmed);
    setLoading(true);
    setResult(null);
    try {
      const res = await apiClient.scanQr(trimmed);
      setResult(res);
      toast.success('QR topildi');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'QR topilmadi');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleScanFromCamera = (scanned: string) => {
    lookupCode(scanned);
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-2xl mx-auto w-full">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <QrCode className="h-8 w-8" />
          QR Skaner
        </h1>
        <p className="text-slate-600 mt-1 text-sm">
          Bobin, ona qog&apos;oz, kesilgan o&apos;ram yoki tayyor mahsulot
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Skaner yoki qo&apos;lda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BarcodeScanner
            label="QR / barcode"
            placeholder="BOB-, PP-, CUT-, PS-..."
            value={code}
            onValueChange={setCode}
            onScan={handleScanFromCamera}
          />
          <Button
            type="button"
            className="w-full min-h-[48px] text-base"
            disabled={loading || !code.trim()}
            onClick={() => lookupCode(code)}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-5 w-5 mr-2" />
            )}
            Tekshirish
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900 flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5" />
              Natija: {result.type}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm space-y-1">
              {result.type === 'bobin' && (
                <>
                  <p>
                    <strong>QR:</strong> {String(result.data.qr_code)}
                  </p>
                  <p>
                    <strong>Holat:</strong>{' '}
                    {bobinStatusLabels[String(result.data.status)] || String(result.data.status)}
                  </p>
                  <p>
                    <strong>Eni:</strong> {formatBobinWidthMm(result.data.width_mm as number)}
                  </p>
                  <p>
                    <strong>Og&apos;irlik:</strong> {Number(result.data.current_weight_kg)} kg
                  </p>
                  <p>
                    <strong>Uzunlik:</strong> {Number(result.data.current_length_m)} m
                  </p>
                </>
              )}
              {result.type === 'parent_paper' && (
                <>
                  <p>
                    <strong>QR:</strong> {String(result.data.qr_code)}
                  </p>
                  <p>
                    <strong>Og&apos;irlik:</strong> {Number(result.data.weight_kg)} kg
                  </p>
                </>
              )}
              {result.type === 'production_session' && (
                <>
                  <p>
                    <strong>Sessiya:</strong> {String(result.data.session_code)}
                  </p>
                  <p className="text-amber-800">
                    {result.hint || 'Bu PS kodi — kesish uchun PP- kerak'}
                  </p>
                  {(result.parentPapersAvailable?.length ?? 0) > 0 && (
                    <ul className="list-disc list-inside font-mono text-sm">
                      {result.parentPapersAvailable!.map((p) => (
                        <li key={String(p.id)}>
                          {String(p.qr_code)} — {Number(p.weight_kg)} kg
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              {(result.type === 'scrap_brak' || result.type === 'scrap_makulatura') && (
                <>
                  <p>
                    <strong>Etiket:</strong> {String(result.data.qr_code)}
                  </p>
                  <p>
                    <strong>Ombor:</strong>{' '}
                    {result.type === 'scrap_brak' ? 'Brak (qayta ishlatish)' : 'Makulatura (sota)'}
                  </p>
                  <p>
                    <strong>Og&apos;irlik:</strong> {Number(result.data.weight_kg)} kg
                  </p>
                  <p>
                    <strong>Holat:</strong> {String(result.data.status)}
                  </p>
                </>
              )}
              {result.type === 'cut_product' && (
                <>
                  <p>
                    <strong>QR:</strong> {String(result.data.qr_code)}
                  </p>
                  <p>
                    <strong>Og&apos;irlik:</strong> {Number(result.data.weight_kg)} kg
                  </p>
                  <p>
                    <strong>Eni:</strong> {Number(result.data.width_cm)} sm
                  </p>
                  <p>
                    <strong>Rang:</strong> {String(result.data.color || 'white')}
                  </p>
                </>
              )}
            </div>
            {result.allowedActions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {result.allowedActions.map((a) => (
                  <Badge key={a} variant="outline">
                    {actionLabels[a] || a}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
