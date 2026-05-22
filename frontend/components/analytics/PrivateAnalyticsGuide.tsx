'use client';

import { Lock, Monitor, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  onGoToCharts?: () => void;
};

/** Sirli ma'lumot — Publish to web ishlatilmaydi */
export function PrivateAnalyticsGuide({ onGoToCharts }: Props) {
  return (
    <div className="space-y-4 text-sm text-slate-700">
      <div className="rounded-lg border border-slate-300 bg-slate-50 p-4 flex gap-3">
        <Lock className="h-6 w-6 text-slate-700 shrink-0" />
        <div>
          <p className="font-semibold text-slate-900">Ma&apos;lumot sir saqlanadi</p>
          <p className="mt-1 text-slate-600">
            <strong>Publish to web</strong> va ochiq Power BI embed CRM da{' '}
            <strong>o&apos;chirilgan</strong>. Tannarx, oyliklar, ishlab chiqarish ko‘rsatkichlari
            faqat tizimga <strong>login</strong> qilgan foydalanuvchilarga ko‘rinadi.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="font-medium text-green-900 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            CRM grafiklar (tavsiya)
          </p>
          <p className="text-green-800 mt-2 text-xs">
            Brauzerda Analitika → Grafiklar. Ma&apos;lumot serverdan, JWT bilan himoyalangan.
          </p>
          {onGoToCharts && (
            <Button type="button" size="sm" className="mt-3" variant="outline" onClick={onGoToCharts}>
              Grafiklarga o‘tish
            </Button>
          )}
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="font-medium text-blue-900 flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Power BI Desktop (mahalliy)
          </p>
          <p className="text-blue-800 mt-2 text-xs">
            Faqat ofis kompyuterida. PostgreSQL ulanish — hisobot internetga chiqmaydi. Ulanish
            bo‘limidagi server ma&apos;lumotlari.
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Ochiq embed kerak bo‘lsa (tavsiya etilmaydi) serverda{' '}
        <code className="bg-slate-100 px-1 rounded">ALLOW_POWERBI_PUBLIC_EMBED=true</code> — hozir
        o‘chiq.
      </p>
    </div>
  );
}
