import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell } from 'recharts';
import { AgentStat } from '../types';

const CSAT_TARGET = 96;
const FRT_TARGET_SECONDS = 120;

const GREEN = '#16A34A';
const RED = '#DC2626';
const AMBER = '#F59E0B';
const SLATE = '#94A3B8';
const TEAL = '#0D9488';

function fmtSeconds(s: number | null): string {
  if (s == null) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function statusFor(csat: number | null): { label: string; className: string } {
  if (csat == null) return { label: 'Not rated', className: 'bg-slate-100 text-slate-600' };
  if (csat >= CSAT_TARGET) return { label: 'On Target', className: 'bg-emerald-100 text-emerald-700' };
  if (csat >= 90) return { label: 'Below Target', className: 'bg-amber-100 text-amber-700' };
  return { label: 'Needs Work', className: 'bg-rose-100 text-rose-700' };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function shortName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

interface Props {
  agents: AgentStat[];
  loading?: boolean;
}

type SortDir = 'asc' | 'desc';

function NameCell({ a }: { a: AgentStat }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand text-xs font-semibold flex items-center justify-center">
        {initials(a.name)}
      </div>
      <div className="text-sm font-medium text-ink truncate max-w-[200px]">{a.name}</div>
    </div>
  );
}

function SortHeader({
  label, active, dir, align = 'left', onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  align?: 'left' | 'right';
  onClick: () => void;
}) {
  return (
    <th
      className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
      onClick={onClick}
    >
      <span className={active ? 'text-ink' : 'text-ink-muted'}>{label}</span>
      {active && <span className="ml-1 text-[10px]">{dir === 'asc' ? '▲' : '▼'}</span>}
    </th>
  );
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      <span className="text-ink-muted">{label}</span>
    </span>
  );
}

function CardHeader({
  title, subtitle, right,
}: {
  title: string;
  subtitle: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 border-b border-surface-border flex items-start justify-between gap-4">
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <p className="text-xs text-ink-muted">{subtitle}</p>
      </div>
      {right && <div className="flex flex-wrap items-center gap-3 text-xs">{right}</div>}
    </div>
  );
}

function ChartFrame({
  loading, hasData, children,
}: {
  loading?: boolean;
  hasData: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 pt-4 pb-2 h-44">
      {loading ? (
        <div className="h-full skeleton rounded" />
      ) : hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex items-center justify-center text-xs text-ink-muted">No data</div>
      )}
    </div>
  );
}

function compareNum(a: number | null | undefined, b: number | null | undefined, dir: SortDir): number {
  const av = a ?? -Infinity;
  const bv = b ?? -Infinity;
  if (av < bv) return dir === 'asc' ? -1 : 1;
  if (av > bv) return dir === 'asc' ? 1 : -1;
  return 0;
}
function compareStr(a: string, b: string, dir: SortDir): number {
  if (a < b) return dir === 'asc' ? -1 : 1;
  if (a > b) return dir === 'asc' ? 1 : -1;
  return 0;
}

// ============================================================
// 1) Performance & Workload — combined: chats, closed, snoozed,
//    resolution rate, CSAT, DSAT, FRT, status
// ============================================================
type PerfKey =
  | 'name'
  | 'chat_count'
  | 'closed_count'
  | 'snoozed_count'
  | 'csat_pct'
  | 'dsat_pct'
  | 'avg_first_response_time';

export function PerformanceTable({ agents, loading }: Props) {
  const [sortKey, setSortKey] = useState<PerfKey>('csat_pct');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function toggle(k: PerfKey) {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir(k === 'name' ? 'asc' : 'desc');
    }
  }

  const sorted = useMemo(() => {
    const xs = [...agents];
    xs.sort((a, b) => {
      const primary = sortKey === 'name'
        ? compareStr(a.name, b.name, sortDir)
        : compareNum(a[sortKey] as number | null, b[sortKey] as number | null, sortDir);
      if (primary !== 0) return primary;
      return compareNum(a.chat_count, b.chat_count, 'desc');
    });
    return xs;
  }, [agents, sortKey, sortDir]);

  const chartData = useMemo(
    () => sorted.map((a) => ({
      name: shortName(a.name),
      Closed: a.closed_count,
      Snoozed: a.snoozed_count,
      Open: Math.max(0, a.chat_count - a.closed_count - a.snoozed_count),
      CSAT: a.csat_pct ?? null,
    })),
    [sorted],
  );

  return (
    <div className="bg-white rounded-card border border-surface-border shadow-card overflow-hidden">
      <CardHeader
        title="Performance & Workload"
        subtitle={`Engineer chats, CSAT and time to first reply · CSAT target ${CSAT_TARGET}% · reply target 2:00 (bot transfer → first reply)`}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-3 pt-2 pb-1">
        <div>
          <div className="px-2 pt-2 pb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-ink">Closed / Snoozed / Open</span>
            <div className="flex items-center gap-3 text-xs">
              <LegendChip color={GREEN} label="Closed" />
              <LegendChip color={AMBER} label="Snoozed" />
              <LegendChip color={SLATE} label="Open" />
            </div>
          </div>
          <ChartFrame loading={loading} hasData={chartData.length > 0}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={0} />
              <YAxis tickLine={false} axisLine={false} width={28} tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="Closed" stackId="a" fill={GREEN} />
              <Bar dataKey="Snoozed" stackId="a" fill={AMBER} />
              <Bar dataKey="Open" stackId="a" fill={SLATE} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartFrame>
        </div>
        <div>
          <div className="px-2 pt-2 pb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-ink">CSAT % per engineer</span>
            <div className="flex items-center gap-3 text-xs">
              <LegendChip color={RED} label="CSAT %" />
              <span className="text-ink-muted">target {CSAT_TARGET}%</span>
            </div>
          </div>
          <ChartFrame loading={loading} hasData={chartData.length > 0}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={0} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={36} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => `${v.toFixed(1)}%`} />
              <ReferenceLine
                y={CSAT_TARGET}
                stroke={GREEN}
                strokeDasharray="4 4"
                label={{ value: `${CSAT_TARGET}%`, fontSize: 10, fill: GREEN, position: 'right' }}
              />
              <Bar dataKey="CSAT" fill={RED} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartFrame>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-page">
            <tr>
              <SortHeader label="Engineer" active={sortKey === 'name'} dir={sortDir} onClick={() => toggle('name')} />
              <SortHeader label="Chats" align="right" active={sortKey === 'chat_count'} dir={sortDir} onClick={() => toggle('chat_count')} />
              <SortHeader label="Closed" align="right" active={sortKey === 'closed_count'} dir={sortDir} onClick={() => toggle('closed_count')} />
              <SortHeader label="Snoozed" align="right" active={sortKey === 'snoozed_count'} dir={sortDir} onClick={() => toggle('snoozed_count')} />
              <SortHeader label="CSAT %" active={sortKey === 'csat_pct'} dir={sortDir} onClick={() => toggle('csat_pct')} />
              <SortHeader label="DSAT %" align="right" active={sortKey === 'dsat_pct'} dir={sortDir} onClick={() => toggle('dsat_pct')} />
              <SortHeader label="Time to reply" align="right" active={sortKey === 'avg_first_response_time'} dir={sortDir} onClick={() => toggle('avg_first_response_time')} />
              <th className="px-3 py-2.5 text-xs font-semibold text-ink-muted uppercase tracking-wide text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t border-surface-border">
                <td className="px-3 py-3" colSpan={8}><div className="h-5 skeleton rounded" /></td>
              </tr>
            ))}
            {!loading && sorted.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-sm text-ink-muted" colSpan={8}>
                  No engineer data for this range yet.
                </td>
              </tr>
            )}
            {!loading && sorted.map((a) => {
              const status = statusFor(a.csat_pct);
              const csatPct = a.csat_pct ?? 0;
              return (
                <tr key={a.assignee_id} className="border-t border-surface-border hover:bg-surface-page/60">
                  <td className="px-3 py-3"><NameCell a={a} /></td>
                  <td className="px-3 py-3 text-sm text-ink text-right tabular-nums">{a.chat_count}</td>
                  <td className="px-3 py-3 text-sm text-ink text-right tabular-nums">{a.closed_count}</td>
                  <td className="px-3 py-3 text-sm text-ink text-right tabular-nums">{a.snoozed_count}</td>
                  <td className="px-3 py-3 min-w-[160px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-surface-tile overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, csatPct)}%`,
                            background: csatPct >= CSAT_TARGET ? '#16A34A' : csatPct >= 90 ? '#F59E0B' : '#DC2626',
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-ink tabular-nums w-12 text-right">
                        {a.csat_pct != null ? `${a.csat_pct.toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-right tabular-nums">
                    <span className={a.dsat_pct != null && a.dsat_pct > 0 ? 'text-bad font-medium' : 'text-ink-muted'}>
                      {a.dsat_pct != null ? `${a.dsat_pct.toFixed(1)}%` : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-right tabular-nums">
                    <span
                      className={
                        a.avg_first_response_time == null
                          ? 'text-ink-muted'
                          : a.avg_first_response_time <= FRT_TARGET_SECONDS
                            ? 'text-emerald-600 font-medium'
                            : 'text-bad font-medium'
                      }
                    >
                      {fmtSeconds(a.avg_first_response_time)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// 3) Rating Coverage — chats, rated, unrated, CSAT, DSAT
// ============================================================
type RateKey = 'name' | 'chat_count' | 'rated_count' | 'unrated_count' | 'csat_pct' | 'dsat_pct';

export function RatingCoverageTable({ agents, loading }: Props) {
  const [sortKey, setSortKey] = useState<RateKey>('rated_count');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function toggle(k: RateKey) {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir(k === 'name' ? 'asc' : 'desc');
    }
  }

  const sorted = useMemo(() => {
    const xs = [...agents];
    xs.sort((a, b) => {
      let primary = 0;
      if (sortKey === 'name') {
        primary = compareStr(a.name, b.name, sortDir);
      } else if (sortKey === 'unrated_count') {
        primary = compareNum(a.chat_count - a.rated_count, b.chat_count - b.rated_count, sortDir);
      } else {
        primary = compareNum(a[sortKey] as number | null, b[sortKey] as number | null, sortDir);
      }
      if (primary !== 0) return primary;
      return compareNum(a.chat_count, b.chat_count, 'desc');
    });
    return xs;
  }, [agents, sortKey, sortDir]);

  const totals = useMemo(() => {
    let rated = 0;
    let chats = 0;
    for (const a of sorted) {
      rated += a.rated_count;
      chats += a.chat_count;
    }
    const unrated = Math.max(0, chats - rated);
    const pct = chats ? Math.round((rated / chats) * 1000) / 10 : 0;
    return { rated, unrated, chats, pct };
  }, [sorted]);

  const pieData = useMemo(
    () => [
      { name: 'Rated', value: totals.rated, color: TEAL },
      { name: 'Unrated', value: totals.unrated, color: SLATE },
    ],
    [totals],
  );

  return (
    <div className="bg-white rounded-card border border-surface-border shadow-card overflow-hidden">
      <CardHeader
        title="Rating Coverage"
        subtitle="Share of chats that received a CSAT rating"
        right={
          <>
            <LegendChip color={TEAL} label="Rated" />
            <LegendChip color={SLATE} label="Unrated" />
          </>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <div className="border-r border-surface-border lg:py-4 px-3 flex flex-col items-center justify-center">
          <div className="w-full h-56">
            {loading ? (
              <div className="h-full skeleton rounded" />
            ) : totals.chats > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={78}
                    paddingAngle={2}
                    stroke="white"
                    strokeWidth={2}
                    labelLine={false}
                  >
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(v: number, n: string) => [`${v} chats`, n]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-ink-muted">No data</div>
            )}
          </div>
          <div className="mt-2 text-center">
            <div className="text-xl font-semibold text-ink tabular-nums">{totals.pct.toFixed(1)}%</div>
            <div className="text-xs text-ink-muted">{totals.rated} of {totals.chats} chats rated</div>
          </div>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-page">
            <tr>
              <SortHeader label="Engineer" active={sortKey === 'name'} dir={sortDir} onClick={() => toggle('name')} />
              <SortHeader label="Chats" align="right" active={sortKey === 'chat_count'} dir={sortDir} onClick={() => toggle('chat_count')} />
              <SortHeader label="Rated" align="right" active={sortKey === 'rated_count'} dir={sortDir} onClick={() => toggle('rated_count')} />
              <SortHeader label="Unrated" align="right" active={sortKey === 'unrated_count'} dir={sortDir} onClick={() => toggle('unrated_count')} />
              <SortHeader label="CSAT %" align="right" active={sortKey === 'csat_pct'} dir={sortDir} onClick={() => toggle('csat_pct')} />
              <SortHeader label="DSAT %" align="right" active={sortKey === 'dsat_pct'} dir={sortDir} onClick={() => toggle('dsat_pct')} />
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t border-surface-border">
                <td className="px-3 py-3" colSpan={6}><div className="h-5 skeleton rounded" /></td>
              </tr>
            ))}
            {!loading && sorted.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-sm text-ink-muted" colSpan={6}>
                  No engineer data for this range yet.
                </td>
              </tr>
            )}
            {!loading && sorted.map((a) => {
              const unrated = a.chat_count - a.rated_count;
              return (
                <tr key={a.assignee_id} className="border-t border-surface-border hover:bg-surface-page/60">
                  <td className="px-3 py-3"><NameCell a={a} /></td>
                  <td className="px-3 py-3 text-sm text-ink text-right tabular-nums">{a.chat_count}</td>
                  <td className="px-3 py-3 text-sm text-ink text-right tabular-nums">{a.rated_count}</td>
                  <td className="px-3 py-3 text-sm text-ink-muted text-right tabular-nums">{unrated}</td>
                  <td className="px-3 py-3 text-sm text-right tabular-nums">
                    {a.csat_pct != null ? `${a.csat_pct.toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-3 py-3 text-sm text-right tabular-nums">
                    <span className={a.dsat_pct != null && a.dsat_pct > 0 ? 'text-bad font-medium' : 'text-ink-muted'}>
                      {a.dsat_pct != null ? `${a.dsat_pct.toFixed(1)}%` : '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
