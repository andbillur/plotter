'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

const COLORS = ['#2563eb', '#16a34a', '#ea580c', '#9333ea', '#0891b2', '#ca8a04'];

function fmtDay(day: string) {
  try {
    return new Date(day).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' });
  } catch {
    return day;
  }
}

function fmtMoney(n: number) {
  return `${Math.round(n).toLocaleString('uz-UZ')} so'm`;
}

export type BiData = {
  productionDaily: { day: string; output_kg: number; clay_kg: number; paper_kg: number }[];
  costBreakdown: {
    paper: number;
    clay: number;
    electricity: number;
    labor: number;
    labor_workers: number;
    other: number;
    grand_total: number;
  };
  costPerKgTrend: { day: string; avg_cost_per_kg: number; total_cost: number }[];
  wasteDaily: { day: string; avg_waste_pct: number; output_kg: number }[];
  warehouseStock: { width_cm: number; total_kg: number; item_count: number }[];
  packagingDaily: { day: string; packaging_cost: number }[];
  clayTrend: { day: string; received_kg: number; used_kg: number }[];
};

const prodConfig = {
  output_kg: { label: 'Chiqish (kg)', color: '#2563eb' },
  clay_kg: { label: 'Kley (kg)', color: '#16a34a' },
} satisfies ChartConfig;

const costPieConfig = {
  paper: { label: 'Qog\'oz', color: '#2563eb' },
  clay: { label: 'Kley', color: '#16a34a' },
  electricity: { label: 'Elektr', color: '#ea580c' },
  labor: { label: 'Ish haqi', color: '#9333ea' },
  other: { label: 'Boshqa', color: '#64748b' },
} satisfies ChartConfig;

type Props = { data: BiData; compact?: boolean };

export function BiCharts({ data, compact }: Props) {
  const prodChart = data.productionDaily.map((r) => ({
    ...r,
    label: fmtDay(String(r.day)),
    output_kg: Number(r.output_kg),
    clay_kg: Number(r.clay_kg),
  }));

  const costPie = [
    { name: 'Qog\'oz', value: Number(data.costBreakdown.paper), key: 'paper' },
    { name: 'Kley', value: Number(data.costBreakdown.clay), key: 'clay' },
    { name: 'Elektr', value: Number(data.costBreakdown.electricity), key: 'electricity' },
    { name: 'Ish haqi', value: Number(data.costBreakdown.labor), key: 'labor' },
    { name: 'Boshqa', value: Number(data.costBreakdown.other), key: 'other' },
  ].filter((x) => x.value > 0);

  const costTrend = data.costPerKgTrend.map((r) => ({
    label: fmtDay(String(r.day)),
    avg_cost_per_kg: Number(r.avg_cost_per_kg),
  }));

  const wasteChart = data.wasteDaily.map((r) => ({
    label: fmtDay(String(r.day)),
    avg_waste_pct: Number(r.avg_waste_pct),
  }));

  const warehouseChart = data.warehouseStock.slice(0, 12).map((r) => ({
    name: `${r.width_cm} sm`,
    kg: Number(r.total_kg),
    items: Number(r.item_count),
  }));

  const packChart = data.packagingDaily.map((r) => ({
    label: fmtDay(String(r.day)),
    cost: Number(r.packaging_cost),
  }));

  const clayChart = data.clayTrend.map((r) => ({
    label: fmtDay(String(r.day)),
    used: Number(r.used_kg) || 0,
    received: Number(r.received_kg) || 0,
  }));

  const h = compact ? 'h-[200px]' : 'h-[280px]';

  return (
    <div className={`grid gap-4 ${compact ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 xl:grid-cols-2'}`}>
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-2">Ishlab chiqarish (kunlik kg)</h3>
        <ChartContainer config={prodConfig} className={h}>
          <AreaChart data={prodChart} margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="output_kg" stackId="1" fill="var(--color-output_kg)" fillOpacity={0.4} stroke="var(--color-output_kg)" />
            {!compact && (
              <Area type="monotone" dataKey="clay_kg" stackId="2" fill="var(--color-clay_kg)" fillOpacity={0.3} stroke="var(--color-clay_kg)" />
            )}
            <Legend />
          </AreaChart>
        </ChartContainer>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-2">Tannarx tuzilmasi</h3>
        <ChartContainer config={costPieConfig} className={h}>
          <PieChart>
            <Pie data={costPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={compact ? 70 : 90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {costPie.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip formatter={(v) => fmtMoney(Number(v))} />
          </PieChart>
        </ChartContainer>
        <p className="text-xs text-slate-500 mt-1 text-center">
          Jami: {fmtMoney(Number(data.costBreakdown.grand_total))}
        </p>
      </div>

      {!compact && (
        <>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-2">1 kg chiqish narxi (trend)</h3>
            <ChartContainer config={{ avg_cost_per_kg: { label: 'so\'m/kg', color: '#9333ea' } }} className={h}>
              <LineChart data={costTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip formatter={(v) => fmtMoney(Number(v))} />
                <Line type="monotone" dataKey="avg_cost_per_kg" stroke="#9333ea" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-2">Kesish brak (%)</h3>
            <ChartContainer config={{ avg_waste_pct: { label: 'Brak %', color: '#ea580c' } }} className={h}>
              <BarChart data={wasteChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip />
                <Bar dataKey="avg_waste_pct" fill="#ea580c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-2">Ombor (eni bo&apos;yicha kg)</h3>
            <ChartContainer config={{ kg: { label: 'kg', color: '#2563eb' } }} className={h}>
              <BarChart data={warehouseChart} layout="vertical" margin={{ left: 48 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={56} tick={{ fontSize: 10 }} />
                <ChartTooltip />
                <Bar dataKey="kg" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-2">Qadoqlash xarajati (kunlik)</h3>
            <ChartContainer config={{ cost: { label: 'so\'m', color: '#0891b2' } }} className={h}>
              <AreaChart data={packChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip formatter={(v) => fmtMoney(Number(v))} />
                <Area type="monotone" dataKey="cost" fill="#0891b2" fillOpacity={0.35} stroke="#0891b2" />
              </AreaChart>
            </ChartContainer>
          </div>

          {clayChart.length > 0 && (
            <div className="rounded-xl border bg-white p-4 shadow-sm xl:col-span-2">
              <h3 className="font-semibold text-slate-800 mb-2">Kley kirim / sarfi</h3>
              <ChartContainer
                config={{
                  used: { label: 'Sarf', color: '#ea580c' },
                  received: { label: 'Kirim', color: '#16a34a' },
                }}
                className={h}
              >
                <LineChart data={clayChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip />
                  <Line type="monotone" dataKey="received" stroke="#16a34a" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="used" stroke="#ea580c" strokeWidth={2} dot={false} />
                  <Legend />
                </LineChart>
              </ChartContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
