import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface Props {
  data: { week: string; csat_pct: number; dsat_pct: number; target: number }[];
  loading?: boolean;
}

const GREEN = '#16A34A';
const RED = '#DC2626';
const TARGET_GREEN = '#86EFAC';

export default function CSATTrendChart({ data, loading }: Props) {
  return (
    <div className="bg-white rounded-card border border-surface-border p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">CSAT / DSAT Trend</h3>
          <p className="text-xs text-ink-muted">Weekly % satisfied (4–5) and dissatisfied (1–3)</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5" style={{ background: GREEN }} />
            <span className="text-ink-muted">CSAT %</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5" style={{ background: RED }} />
            <span className="text-ink-muted">DSAT %</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed" style={{ borderColor: TARGET_GREEN }} />
            <span className="text-ink-muted">Target 96%</span>
          </span>
        </div>
      </div>
      <div className="h-64">
        {loading ? (
          <div className="h-full skeleton rounded" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="week" tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 96, 100]} tickLine={false} axisLine={false} width={36} unit="%" />
              <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => `${v}%`} />
              <ReferenceLine y={96} stroke={TARGET_GREEN} strokeDasharray="6 6" label={{ value: '96% target', position: 'right', fill: '#16A34A', fontSize: 10 }} />
              <Line type="monotone" dataKey="csat_pct" name="CSAT %" stroke={GREEN} strokeWidth={2.5} dot={{ r: 4, fill: GREEN }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="dsat_pct" name="DSAT %" stroke={RED} strokeWidth={2} dot={{ r: 3, fill: RED }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
