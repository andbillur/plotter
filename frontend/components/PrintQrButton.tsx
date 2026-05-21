'use client';

import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

type Props = {
  code: string;
  title?: string;
  lines?: string[];
  size?: 'sm' | 'icon';
  className?: string;
};

function qrImageUrl(code: string, px = 180) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${px}x${px}&data=${encodeURIComponent(code)}&margin=8`;
}

export function printQrLabel(code: string, title?: string, lines: string[] = []) {
  const w = window.open('', '_blank', 'width=400,height=520');
  if (!w) {
    alert('Chop etish uchun popup ruxsatini yoqing');
    return;
  }
  const extra = lines.filter(Boolean).map((l) => `<p class="line">${l}</p>`).join('');
  w.document.write(`<!DOCTYPE html><html><head><title>${code}</title>
<style>
  @page { size: 80mm 50mm; margin: 4mm; }
  body { font-family: system-ui, sans-serif; text-align: center; margin: 0; padding: 8px; }
  h1 { font-size: 11px; margin: 0 0 4px; color: #444; font-weight: 600; }
  .code { font-size: 14px; font-weight: 700; font-family: monospace; margin: 6px 0; word-break: break-all; }
  img { width: 42mm; height: 42mm; }
  .line { font-size: 11px; margin: 2px 0; color: #333; }
</style></head><body>
  ${title ? `<h1>${title}</h1>` : ''}
  <img src="${qrImageUrl(code)}" alt="QR" />
  <p class="code">${code}</p>
  ${extra}
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
</body></html>`);
  w.document.close();
}

export function PrintQrButton({ code, title, lines = [], size = 'sm', className }: Props) {
  if (!code?.trim()) return null;

  const handlePrint = () => printQrLabel(code.trim(), title, lines);

  if (size === 'icon') {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={className}
        title="QR chop etish"
        onClick={handlePrint}
      >
        <Printer className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" className={className} onClick={handlePrint}>
      <Printer className="h-3 w-3 mr-1" />
      Chop
    </Button>
  );
}
