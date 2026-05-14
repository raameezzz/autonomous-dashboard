import { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { api } from '../api/client';
import { DateRange, TopicsResponse } from '../types';

interface Props {
  range: DateRange;
}

// Distinct hues so each slice is readable; sized for up to ~15 categories.
const PALETTE = [
  '#1B4DFF', '#7C3AED', '#0EA5E9', '#F59E0B', '#10B981',
  '#EF4444', '#EC4899', '#14B8A6', '#8B5CF6', '#F97316',
  '#0891B2', '#84CC16', '#A855F7', '#DC2626', '#6366F1',
];

const TOP_N = 5;

export default function TopicsBreakdown({ range }: Props) {
  const [data, setData] = useState<TopicsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setExpanded(false);
    api
      .topics(range.start, range.end)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError((err as Error).message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range.start, range.end]);

  const colored = useMemo(
    () => (data?.categories ?? []).map((c, i) => ({ ...c, color: PALETTE[i % PALETTE.length] })),
    [data],
  );

  const visible = expanded ? colored : colored.slice(0, TOP_N);
  const hiddenCount = Math.max(0, colored.length - TOP_N);
  const max = colored.length ? Math.max(1, ...colored.map((c) => c.count)) : 1;

  return (
    <div className="bg-white rounded-card border border-surface-border p-5 shadow-card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">Chat Topics — Autonomous team</h3>
          <p className="text-xs text-ink-muted">
            Closed conversations created {range.start} → {range.end}
            {data && `, classified by primary topic`}
          </p>
        </div>
        {data && (
          <div className="text-xs text-ink-muted">
            <span className="font-semibold text-ink">{data.total_categorized}</span> of{' '}
            <span className="font-semibold text-ink">{data.total_closed}</span> closed chats categorized
          </div>
        )}
      </div>

      {error && (
        <div className="px-3 py-2 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to load topics: {error}
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 skeleton rounded-md" />
          ))}
          <p className="text-xs text-ink-muted italic mt-2">
            Categorizing chats… this can take 30-90s for fresh date ranges while we enrich conversation summaries.
          </p>
        </div>
      )}

      {!loading && data && colored.length === 0 && (
        <div className="text-xs text-ink-muted italic">No categorized chats in this range.</div>
      )}

      {!loading && data && colored.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={colored}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={110}
                  paddingAngle={1}
                  strokeWidth={1}
                  stroke="#ffffff"
                >
                  {colored.map((c) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, _name: string, ctx: { payload?: { name?: string; percent?: number } }) => [
                    `${value} (${ctx.payload?.percent?.toFixed(1) ?? '0'}%)`,
                    ctx.payload?.name ?? '',
                  ]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div>
            <ul className="space-y-2">
              {visible.map((cat) => {
                const widthPct = Math.max(2, Math.round((cat.count / max) * 100));
                return (
                  <li
                    key={cat.name}
                    className="px-3 py-2 rounded-md border border-surface-border hover:border-brand/40 transition"
                    title={cat.description}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: cat.color }} />
                      <span className="font-medium text-ink text-sm truncate flex-1">{cat.name}</span>
                      <span className="text-ink-muted whitespace-nowrap text-xs">
                        <span className="font-semibold text-ink">{cat.count}</span> · {cat.percent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${widthPct}%`, background: cat.color }}
                      />
                    </div>
                    <p className="text-[11px] text-ink-muted mt-1 leading-snug">{cat.description}</p>
                  </li>
                );
              })}
            </ul>

            {hiddenCount > 0 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-3 text-xs font-medium text-brand hover:underline"
              >
                {expanded ? '▲ Show top 5' : `▼ See more (${hiddenCount})`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
