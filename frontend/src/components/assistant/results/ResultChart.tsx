import { Bar, BarChart, CartesianGrid, Cell as PieCell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Cell, ChartSpec, ColumnSpec } from '../types';
import { formatCell } from './format';

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
// A single series follows the theme (festive themes recolour --primary), not the fixed chart palette.
const seriesColor = (count: number, i: number) => (count === 1 ? 'var(--primary)' : COLORS[i % COLORS.length]);
const tooltipStyle = {
  backgroundColor: 'var(--popover)',
  color: 'var(--popover-foreground)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
};
const axisTick = { fill: 'var(--muted-foreground)', fontSize: 11 };

interface Props {
  spec: ChartSpec;
  columns: ColumnSpec[];
  rows: Record<string, Cell>[];
}

export function ResultChart({ spec, columns, rows }: Props) {
  const kindOf = (key: string) => columns.find((c) => c.key === key)?.kind;
  const format = (value: unknown, key: string) => formatCell(typeof value === 'number' || typeof value === 'string' ? value : null, kindOf(key));
  const height = spec.type === 'bar' ? Math.min(Math.max(rows.length * 28 + 40, 180), 420) : 260;

  return (
    <div className="h-full w-full" style={{ height }} role="img" aria-label={`${spec.type} chart; use the Table view for exact values`}>
      <ResponsiveContainer width="100%" height="100%">
        {spec.type === 'donut' ? (
          <PieChart>
            <Tooltip contentStyle={tooltipStyle} formatter={(v, _n, item) => format(v, String(item.dataKey ?? spec.series[0]?.key))} />
            <Pie data={rows} dataKey={spec.series[0]?.key ?? 'value'} nameKey={spec.x} innerRadius="55%" outerRadius="85%" paddingAngle={2}>
              {rows.map((_, i) => (
                <PieCell key={i} fill={COLORS[i % COLORS.length]} stroke="var(--background)" />
              ))}
            </Pie>
          </PieChart>
        ) : spec.type === 'line' ? (
          <LineChart data={[...rows].reverse()} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey={spec.x} tick={axisTick} tickLine={false} axisLine={false} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} width={64} tickFormatter={(v) => format(v, spec.series[0]?.key ?? '')} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v, _n, item) => format(v, String(item.dataKey))} />
            {spec.series.map((s, i) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={seriesColor(spec.series.length, i)} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        ) : (
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v) => format(v, spec.series[0]?.key ?? '')} />
            <YAxis type="category" dataKey={spec.x} tick={axisTick} tickLine={false} axisLine={false} width={120} />
            <Tooltip cursor={{ fill: 'var(--muted)' }} contentStyle={tooltipStyle} formatter={(v, _n, item) => format(v, String(item.dataKey))} />
            {spec.series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={seriesColor(spec.series.length, i)} radius={[0, 4, 4, 0]} maxBarSize={22} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
