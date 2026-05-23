'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { isValidPowerBiEmbedUrl, normalizePowerBiEmbedUrl } from '@/lib/powerbi';
import { ExternalLink, Loader2, MonitorPlay } from 'lucide-react';
import { toast } from 'sonner';

type PbiConfig = {
  mode: string;
  publicEmbedAllowed: boolean;
  embedUrl: string;
  title: string;
  message?: string;
};

export function PowerBiEmbed() {
  const canManage = useAuthStore((s) => s.hasPermission('cost_config:manage'));
  const [config, setConfig] = useState<PbiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [embedInput, setEmbedInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiClient
      .getPowerBiConfig()
      .then((c) => {
        setConfig(c);
        setEmbedInput(c.embedUrl || '');
        setTitleInput(c.title || 'Plotter CRM — Power BI');
      })
      .catch(() => setConfig(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    const url = normalizePowerBiEmbedUrl(embedInput);
    if (url && !isValidPowerBiEmbedUrl(url)) {
      toast.error('Power BI embed URL noto‘g‘ri (app.powerbi.com yoki publish link)');
      return;
    }
    setSaving(true);
    try {
      const c = await apiClient.setPowerBiConfig({
        embedUrl: url,
        title: titleInput.trim() || 'Plotter CRM — Power BI',
      });
      setConfig(c);
      setEmbedInput(c.embedUrl || '');
      toast.success('Power BI saqlandi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Saqlash xatosi');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      const c = await apiClient.clearPublicPowerBiEmbed();
      setConfig(c);
      setEmbedInput('');
      toast.success('Embed o‘chirildi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
      </div>
    );
  }

  const embedSrc = config?.embedUrl ? normalizePowerBiEmbedUrl(config.embedUrl) : '';

  return (
    <div className="space-y-4">
      {canManage && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-base">Power BI embed sozlash</CardTitle>
            <CardDescription>
              Power BI Service → hisobot → File → Embed report → Publish to web → iframe kodidagi{' '}
              <code className="text-xs">src</code> havolasini qo‘ying.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!config?.publicEmbedAllowed && (
              <p className="text-sm text-amber-800 bg-amber-100 border border-amber-200 rounded p-2">
                Serverda <code>ALLOW_POWERBI_PUBLIC_EMBED=true</code> qo‘ying (Render → API →
                Environment), keyin qayta deploy.
              </p>
            )}
            <div>
              <Label>Hisobot nomi</Label>
              <Input
                className="mt-1 bg-white"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
              />
            </div>
            <div>
              <Label>Embed URL (iframe src)</Label>
              <Input
                className="mt-1 bg-white font-mono text-xs"
                placeholder="https://app.powerbi.com/view?r=..."
                value={embedInput}
                onChange={(e) => setEmbedInput(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleSave} disabled={saving || !config?.publicEmbedAllowed}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Saqlash'}
              </Button>
              <Button type="button" variant="outline" onClick={handleClear} disabled={saving}>
                O‘chirish
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {embedSrc ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MonitorPlay className="h-5 w-5" />
              {config?.title || 'Power BI'}
            </CardTitle>
            <CardDescription>
              Sahifalar (Page 1–5) pastdagi panelda. Login qilgan foydalanuvchilar ko‘radi.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <div className="w-full border-t bg-slate-100" style={{ minHeight: '75vh' }}>
              <iframe
                title={config?.title || 'Power BI'}
                src={embedSrc}
                className="w-full border-0"
                style={{ height: '75vh', minHeight: 560 }}
                allowFullScreen
              />
            </div>
            <div className="p-3 border-t flex justify-end">
              <Button type="button" variant="outline" size="sm" asChild>
                <a href={embedSrc} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Yangi oynada ochish
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-slate-600 text-sm space-y-2">
            <p>Power BI hisobot hali ulangan emas.</p>
            {canManage ? (
              <p>Yuqorida Publish to web havolasini kiriting va Saqlash bosing.</p>
            ) : (
              <p>Administrator embed havolasini sozlamalar orqali qo‘shishi kerak.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
