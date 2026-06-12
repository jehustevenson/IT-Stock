'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Asset } from '@/lib/supabase/types';

interface StatusDonutChartProps {
  assets: Asset[];
}

const STATUS_COLORS: Record<string, string> = {
  Available: 'hsl(142 71% 45%)',
  Assigned:  'hsl(221 83% 53%)',
  Faulty:    'hsl(0 84% 60%)',
  Retired:   'hsl(215 16% 65%)',
};

interface TooltipPayloadEntry {
  name?: string | number;
  value?: string | number;
}
interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-card p-2.5 text-xs">
      <p className="font-semibold text-slate-800">{payload[0].name}</p>
      <p className="text-slate-600">
        <span className="font-semibold tabular-nums">{payload[0].value}</span> assets
      </p>
    </div>
  );
};

export default function StatusDonutChart({ assets }: StatusDonutChartProps) {
  const counts: Record<string, number> = {};
  for (const asset of assets) {
    counts[asset.status] = (counts[asset.status] ?? 0) + 1;
  }
  const data  = Object.entries(counts).map(([name, value]) => ({ name, value }));
  const total = assets.length;

  return (
    <div className="card p-5 h-full">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-900">Status Distribution</h2>
        <p className="text-xs text-slate-500 mt-0.5">Current state of all {total} assets</p>
      </div>

      <div className="relative">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry) => (
                <Cell
                  key={`cell-${entry.name}`}
                  fill={STATUS_COLORS[entry.name] ?? 'hsl(215 16% 65%)'}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{total}</p>
            <p className="text-xs text-slate-500">Total</p>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {data.map((entry) => (
          <div key={`legend-${entry.name}`} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: STATUS_COLORS[entry.name] }}
              />
              <span className="text-slate-600">{entry.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 tabular-nums">{entry.value}</span>
              <span className="text-slate-400 tabular-nums w-8 text-right">
                {total > 0 ? Math.round((entry.value / total) * 100) : 0}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}