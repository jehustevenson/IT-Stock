'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,  } from 'recharts';
import { ASSETS } from '@/lib/mockData';

function buildCategoryData() {
  const counts: Record<string, { total: number; available: number; assigned: number; faulty: number }> = {};
  for (const asset of ASSETS) {
    if (!counts[asset.category]) {
      counts[asset.category] = { total: 0, available: 0, assigned: 0, faulty: 0 };
    }
    counts[asset.category].total += 1;
    if (asset.status === 'Available') counts[asset.category].available += 1;
    if (asset.status === 'Assigned') counts[asset.category].assigned += 1;
    if (asset.status === 'Faulty') counts[asset.category].faulty += 1;
  }
  return Object.entries(counts).map(([name, v]) => ({ name, ...v }));
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-card p-3 text-xs">
      <p className="font-semibold text-slate-800 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={`tt-${entry.name}`} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }} />
          <span className="text-slate-600 capitalize">{entry.name}:</span>
          <span className="font-semibold text-slate-800 tabular-nums">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function CategoryBarChart() {
  const data = buildCategoryData();

  return (
    <div className="card p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Assets by Category</h2>
          <p className="text-xs text-slate-500 mt-0.5">Breakdown of all tracked equipment types</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
            Total
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
            Available
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-400" />
            Faulty
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="hsl(214 32% 91%)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(210 40% 96%)' }} />
          <Bar dataKey="total" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} maxBarSize={36} />
          <Bar dataKey="available" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} maxBarSize={36} />
          <Bar dataKey="faulty" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}