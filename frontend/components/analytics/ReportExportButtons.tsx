'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/constants';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  days: number;
};

async function downloadExport(format: 'excel' | 'pdf', days: number) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const res = await fetch(`${API_BASE_URL}/analytics/export/${format}?days=${days}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const stamp = new Date().toISOString().slice(0, 10);
  const ext = format === 'excel' ? 'xlsx' : 'pdf';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `plotter-hisobot-${days}kun-${stamp}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ReportExportButtons({ days }: Props) {
  const [loading, setLoading] = useState<'excel' | 'pdf' | null>(null);

  const handle = async (format: 'excel' | 'pdf') => {
    setLoading(format);
    try {
      await downloadExport(format, days);
      toast.success(format === 'excel' ? 'Excel yuklandi' : 'PDF yuklandi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Yuklab olish xatoligi');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!!loading}
        onClick={() => handle('excel')}
      >
        {loading === 'excel' ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <FileSpreadsheet className="h-4 w-4 mr-2 text-green-700" />
        )}
        Excel (.xlsx)
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!!loading}
        onClick={() => handle('pdf')}
      >
        {loading === 'pdf' ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <FileText className="h-4 w-4 mr-2 text-red-700" />
        )}
        PDF
      </Button>
    </div>
  );
}
