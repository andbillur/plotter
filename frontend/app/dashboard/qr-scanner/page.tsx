'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { QrCode, CheckCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { bobinStatusLabels } from '@/lib/constants';
import { toast } from 'sonner';

const actionLabels: Record<string, string> = {
  start_production: 'Ishlab chiqarishni boshlash',
  start_cutting: 'Kesishni boshlash',
  add_to_plot: 'PLOTga qo\'shish',
  receive_bobin: 'Bobin qabul',
  receive_clay: 'Kley kirim',
};

export default function QRScannerPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<{
    type: string;
    data: Record<string, unknown>;
    allowedActions: string[];
    hint?: string;
    parentPapersAvailable?: Record<string, unknown>[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await apiClient.scanQr(code.trim());
      setResult(res);
      toast.success('QR topildi');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'QR topilmadi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">QR Skaner</h1>
        <p className="text-slate-600 mt-2">Bobin, ona qoghoz yoki kesilgan o&apos;ram</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR kod kiritish
          </CardTitle>
          <CardDescription>Skaner yoki qo&apos;lda kiriting</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="QR kod..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            className="text-lg"
          />
          <Button onClick={handleScan} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tekshirish'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900 flex items-center gap-2">
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
                    <strong>Og&apos;irlik:</strong> {Number(result.data.current_weight_kg)} kg
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
                        <li key={String(p.id)}>{String(p.qr_code)} — {Number(p.weight_kg)} kg</li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              {result.type === 'cut_product' && (
                <>
                  <p>
                    <strong>Og&apos;irlik:</strong> {Number(result.data.weight_kg)} kg
                  </p>
                  <p>
                    <strong>Eni:</strong> {Number(result.data.width_cm)} sm
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
