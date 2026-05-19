'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleGuard } from '@/components/layout/RoleGuard';

export default function SettingsPage() {
  return (
    <RoleGuard permission="cost_config:manage">
      <div className="p-4 sm:p-6">
        <h1 className="text-3xl font-bold">Sozlamalar</h1>
        <p className="text-slate-600 mt-2">Narx konfiguratsiyasi — tez orada</p>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Tannarx parametrlari</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              API: POST /api/analytics/cost-config — admin panel keyingi versiyada.
            </p>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
