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
import { api } from '../api/client';

function defaultRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: now.toISOString().slice(0, 10),
    label: 'This month',
  };
}

function fmtMinSec(seconds: number): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface Props {
  user: { email: string };
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: Props) {
  const [range, setRange] = useState<DateRange>(defaultRange);
  const { data, loading, error } = useDashboardData(range);
  const [intercomConfigured, setIntercomConfigured] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    api.config().then((c) => setIntercomConfigured(c.intercom_configured)).catch(() => {});
  }, []);

  useEffect(() => {
    if (error) {
      setToast(error);
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const m = data?.metrics;
  const initialLoading = loading && !data;

  const cards = useMemo(() => ([
    {
      label: 'Total Chats',
      value: m ? m.total_chats.toLocaleString() : '—',
      delta: m?.total_chats_delta,
      hint: 'vs. previous period',
      isPercentDelta: true,
    },
    {
      label: 'CSAT %',
      value: m ? `${m.csat_pct.toFixed(1)}%` : '—',
      delta: m?.csat_pct_delta,
      hint: 'rated 4–5',
      isPercentDelta: false,
    },
    {
      label: 'DSAT %',
      value: m ? `${m.dsat_pct.toFixed(1)}%` : '—',
      delta: m ? -1 * m.dsat_pct_delta : undefined,
      hint: 'rated 1–3',
      isPercentDelta: false,
    },
    {
      label: 'Time to first reply',
      value: m ? fmtMinSec(m.avg_response_time_seconds) : '—',
      delta: m ? -1 * m.avg_response_time_delta : undefined,
      hint: 'bot transfer → first reply · target 2:00',
      isPercentDelta: true,
    },
    {
      label: 'Resolution Rate',
      value: m ? `${Math.round(m.resolution_rate * 100)}%` : '—',
      delta: m?.resolution_rate_delta,
      hint: 'closed / total',
      isPercentDelta: true,
    },
  ]), [m]);

  return (
    <div className="min-h-screen bg-surface-page">
      <TopBar
        range={range}
        onRangeChange={setRange}
        onConnectIntercom={() => {
          setToast('Save token in your .env file as INTERCOM_ACCESS_TOKEN, then restart the server.');
          setTimeout(() => setToast(null), 6000);
        }}
        intercomConfigured={intercomConfigured}
        user={user}
        onLogout={onLogout}
      />

      <MenuBar />

      <main className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
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
