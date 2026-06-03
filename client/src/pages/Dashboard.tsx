import { useEffect, useMemo, useState } from 'react';
import TopBar from '../components/TopBar';
import MetricCard from '../components/MetricCard';
import ChatVolumeChart from '../components/ChatVolumeChart';
import CSATTrendChart from '../components/CSATTrendChart';
import { PerformanceTable, RatingCoverageTable } from '../components/EngineerTables';
import RecentConversations from '../components/RecentConversations';
import TopicsBreakdown from '../components/TopicsBreakdown';
import MenuBar from '../components/MenuBar';
import { useDashboardData } from '../hooks/useDashboardData';
import { DateRange } from '../types';

function fmtLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    start: fmtLocal(start),
    end: fmtLocal(now),
    label: 'This month',
  };
}

function fmtMinSec(seconds: number): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function Dashboard() {
  const [range, setRange] = useState<DateRange>(defaultRange);
  const { data, loading, error } = useDashboardData(range);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      setToast(error);
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const m = data?.metrics;
  const initialLoading = loading && !data;

  const rangeQuery = `?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`;
  const cards = useMemo(() => ([
    {
      label: 'Total Chats',
      value: m ? m.total_chats.toLocaleString() : '—',
      delta: m?.total_chats_delta,
      hint: 'vs. previous period',
      isPercentDelta: true,
      to: `/chats/total${rangeQuery}`,
    },
    {
      label: 'CSAT %',
      value: m ? `${m.csat_pct.toFixed(1)}%` : '—',
      delta: m?.csat_pct_delta,
      hint: 'rated 4–5',
      isPercentDelta: false,
      to: `/chats/csat${rangeQuery}`,
    },
    {
      label: 'DSAT %',
      value: m ? `${m.dsat_pct.toFixed(1)}%` : '—',
      delta: m ? -1 * m.dsat_pct_delta : undefined,
      hint: 'rated 1–3',
      isPercentDelta: false,
      to: `/chats/dsat${rangeQuery}`,
    },
    {
      label: 'Time to first reply',
      value: m ? fmtMinSec(m.avg_response_time_seconds) : '—',
      delta: m ? -1 * m.avg_response_time_delta : undefined,
      hint: 'bot transfer → first reply · target 2:00',
      isPercentDelta: true,
      to: `/chats/frt${rangeQuery}`,
    },
    {
      label: 'Resolution Rate',
      value: m ? `${Math.round(m.resolution_rate * 100)}%` : '—',
      delta: m?.resolution_rate_delta,
      hint: 'closed / total',
      isPercentDelta: true,
      to: `/chats/unresolved${rangeQuery}`,
    },
  ]), [m, rangeQuery]);

  return (
    <div className="min-h-screen bg-surface-page">
      <TopBar
        title="Intercom Analytics"
        liveLabel="Live · Intercom"
        range={range}
        onRangeChange={setRange}
      />

      <MenuBar />

      <main className="px-6 py-6 space-y-6">
        <section id="overview" className="space-y-6 scroll-mt-20">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {cards.map((c) => (
              <MetricCard
                key={c.label}
                label={c.label}
                value={c.value}
                delta={c.delta}
                loading={initialLoading}
                hint={c.hint}
                deltaSuffix={c.isPercentDelta ? '%' : 'pt'}
                to={c.to}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChatVolumeChart data={data?.chatVolume ?? []} loading={initialLoading} />
            <CSATTrendChart data={data?.csatTrend ?? []} loading={initialLoading} />
          </div>
        </section>

        <section id="engineers" className="space-y-6 scroll-mt-20">
          <PerformanceTable agents={data?.agentStats ?? []} loading={initialLoading} />
          <RatingCoverageTable agents={data?.agentStats ?? []} loading={initialLoading} />
        </section>

        <section id="conversations" className="scroll-mt-20">
          <RecentConversations range={range} />
        </section>

        <section id="topics" className="scroll-mt-20">
          <TopicsBreakdown range={range} />
        </section>
      </main>

      {toast && (
        <div className="fixed bottom-6 right-6 max-w-sm bg-ink text-white px-4 py-3 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}
    </div>
  );
}
