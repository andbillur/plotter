'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

export type WorkerRow = { workerId: string; kgPerMinute: string };

type PoolWorker = {
  id: string;
  full_name: string;
  monthly_salary: number;
};

type Props = {
  sessionId: string;
  loadPool: () => Promise<PoolWorker[]>;
  loadAssigned: () => Promise<{ id: string; full_name: string; kg_per_minute: number }[]>;
  onSave: (workers: { workerId: string; kgPerMinute: number }[]) => Promise<void>;
};

export function SessionWorkersPanel({ sessionId, loadPool, loadAssigned, onSave }: Props) {
  const [pool, setPool] = useState<PoolWorker[]>([]);
  const [rows, setRows] = useState<WorkerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([loadPool(), loadAssigned()])
      .then(([p, assigned]) => {
        if (cancelled) return;
        setPool(p);
        setRows(
          assigned.length
            ? assigned.map((w) => ({
                workerId: String(w.id),
                kgPerMinute: String(w.kg_per_minute),
              }))
            : []
        );
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, loadPool, loadAssigned]);

  const addRow = () => setRows([...rows, { workerId: '', kgPerMinute: '' }]);

  const handleSave = async () => {
    const workers = rows
      .filter((r) => r.workerId && parseFloat(r.kgPerMinute) > 0)
      .map((r) => ({ workerId: r.workerId, kgPerMinute: parseFloat(r.kgPerMinute) }));
    if (!workers.length) {
      toast.error('Kamida bitta ishchi va kg/min kiriting');
      return;
    }
    setSaving(true);
    try {
      await onSave(workers);
      toast.success('Ishchilar saqlandi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Ishchilar yuklanmoqda...
      </div>
    );
  }

  if (!pool.length) {
    return (
      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
        Ishchilar ro&apos;yxati bo&apos;sh. Sozlamalar → Ishchilar bo&apos;limida qo&apos;shing.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
      <p className="text-sm font-medium flex items-center gap-1">
        <Users className="h-4 w-4" />
        Ishchilar (oylik → kg/min bo&apos;yicha hisob)
      </p>
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[140px]">
            <Label className="text-xs">Ishchi</Label>
            <Select
              value={row.workerId || undefined}
              onValueChange={(v) => {
                const next = [...rows];
                next[i] = { ...next[i], workerId: v };
                setRows(next);
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tanlang" />
              </SelectTrigger>
              <SelectContent>
                {pool.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.full_name} ({Number(w.monthly_salary).toLocaleString('uz-UZ')} so&apos;m/oy)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-28">
            <Label className="text-xs">kg/min</Label>
            <Input
              type="number"
              step="0.01"
              className="h-9"
              placeholder="2.5"
              value={row.kgPerMinute}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...next[i], kgPerMinute: e.target.value };
                setRows(next);
              }}
            />
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={addRow}>
          <Plus className="h-4 w-4 mr-1" />
          Ishchi qo&apos;shish
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Saqlash'}
        </Button>
      </div>
    </div>
  );
}
