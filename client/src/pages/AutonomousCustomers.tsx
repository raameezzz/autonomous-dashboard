import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import TopBar from '../components/TopBar';
import MetricCard from '../components/MetricCard';
import { api } from '../api/client';
import { AutonomousSnapshot, MixpanelBreakdown, MixpanelGroup, MixpanelMetric } from '../types';

function formatValue(m: MixpanelMetric): string {
  if (m.format === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(m.value);
  }
  if (m.format === 'percent') return `${m.value.toFixed(1)}%`;
  return m.value.toLocaleString();
}

const GROUP_META: Record<MixpanelGroup, { id: string; label: string }> = {
  users: { id: 'users', label: 'Users' },
  revenue: { id: 'revenue', label: 'Revenue' },
  churn: { id: 'churn', label: 'Churn' },
  applications: { id: 'applications', label: 'Applications' },
  lifecycle: { id: 'lifecycle', label: 'Lifecycle' },
  csat: { id: 'csat', label: 'CSAT' },
};

const GROUP_ORDER: MixpanelGroup[] = ['users', 'revenue', 'churn', 'applications', 'lifecycle'];

export default function AutonomousCustomers() {
  const [data, setData] = useState<AutonomousSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.autonomous()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const map: Record<MixpanelGroup, { metrics: MixpanelMetric[]; breakdowns: MixpanelBreakdown[] }> = {
      users: { metrics: [], breakdowns: [] },
      revenue: { metrics: [], breakdowns: [] },
      churn: { metrics: [], breakdowns: [] },
      applications: { metrics: [], breakdowns: [] },
      lifecycle: { metrics: [], breakdowns: [] },
      csat: { metrics: [], breakdowns: [] },
    };
    data?.metrics.forEach((m) => map[m.group].metrics.push(m));
    data?.breakdowns.forEach((b) => map[b.group].breakdowns.push(b));
    return map;
  }, [data]);

  return (
    <div className="min-h-screen bg-surface-page">
      <TopBar title="Autonomous Customers" liveLabel="Mixpanel" />

      <main className="px-6 py-6 space-y-8">
        {data && (
          <div className="text-xs text-ink-subtle">
            Source: Mixpanel project {data.source.project_id} · dashboard{' '}
            <span className="font-medium text-ink-muted">{data.source.dashboard_title}</span> · snapshot{' '}
            {data.source.captured_at}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-bad rounded-card px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {GROUP_ORDER.map((group) => {
          const cell = grouped[group];
          if (loading) {
            return (
              <section key={group} className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">{GROUP_META[group].label}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <MetricCard key={i} label="—" value="—" loading hint="loading" />
                  ))}
                </div>
              </section>
            );
          }

          if (!cell.metrics.length && !cell.breakdowns.length) return null;

          return (
            <section key={group} id={group} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
                {GROUP_META[group].label}
              </h2>

              {cell.metrics.length > 0 && groupByRow(cell.metrics).map((rowMetrics, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
                >
                  {rowMetrics.map((m) => (
                    <MetricCard
                      key={m.key}
                      label={m.label}
                      value={formatValue(m)}
                      hint={m.hint}
                    />
                  ))}
                </div>
              ))}

              {cell.breakdowns.map((b) => (
                <BreakdownChart key={b.key} breakdown={b} />
              ))}
            </section>
          );
        })}
      </main>
    </div>
  );
}

function groupByRow(metrics: MixpanelMetric[]): MixpanelMetric[][] {
  const byRow = new Map<number, MixpanelMetric[]>();
  metrics.forEach((m) => {
    const r = m.row ?? 1;
    const list = byRow.get(r) ?? [];
    list.push(m);
    byRow.set(r, list);
  });
  return Array.from(byRow.entries())
    .sort(([a], [b]) => a - b)
    .map(([, list]) => list);
}

function BreakdownChart({ breakdown }: { breakdown: MixpanelBreakdown }) {
  const data = breakdown.rows;
  const total = data.reduce((a, b) => a + b.value, 0);

  return (
    <div className="bg-surface-card border border-surface-border rounded-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-ink">{breakdown.label}</h3>
        <span className="text-xs text-ink-subtle">Total: {total.toLocaleString()}</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 30 }}>
            <CartesianGrid stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#475569' }}
              angle={-25}
              textAnchor="end"
              interval={0}
              height={60}
            />
            <YAxis tick={{ fontSize: 11, fill: '#475569' }} width={40} />
            <Tooltip
              cursor={{ fill: '#F3F4F6' }}
              contentStyle={{
                background: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="value" fill="#1B4DFF" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
