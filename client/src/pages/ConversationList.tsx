import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ConversationListItem, ConversationListResponse, MetricKey } from '../types';

const PAGE_SIZE = 25;

const METRIC_META: Record<MetricKey, { title: string; subtitle: string }> = {
  total: { title: 'Total Chats', subtitle: 'All conversations created in the selected range' },
  csat: { title: 'CSAT Chats', subtitle: 'Conversations rated 4 or 5 by the customer' },
  dsat: { title: 'DSAT Chats', subtitle: 'Conversations rated 1, 2, or 3 by the customer' },
  frt: { title: 'Time to First Reply — slowest first', subtitle: 'Conversations sorted by first-response time (longest at top)' },
  unresolved: { title: 'Unresolved Chats', subtitle: 'Conversations still open or snoozed (no resolution time recorded)' },
};

function fmtDate(unix: number | null): string {
  if (!unix) return '—';
  return new Date(unix * 1000).toISOString().slice(0, 10);
}

function fmtMinSec(seconds: number | null): string {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function stateBadge(state: string) {
  const cls =
    state === 'closed'
      ? 'bg-emerald-100 text-emerald-700'
      : state === 'snoozed'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-sky-100 text-sky-700';
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{state}</span>;
}

function ratingBadge(rating: number | null) {
  if (rating == null) return <span className="text-ink-subtle text-xs">—</span>;
  if (rating >= 4) return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">{rating}</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700">{rating}</span>;
}

function ConversationRow({ c }: { c: ConversationListItem }) {
  const [expanded, setExpanded] = useState(false);
  const summary = c.summary ?? '';
  const preview = summary.replace(/\*\*/g, '').replace(/\n+/g, ' ').slice(0, 140);

  return (
    <>
      <tr className="border-t border-surface-border hover:bg-surface-page transition">
        <td className="px-3 py-2 text-xs text-ink-muted whitespace-nowrap">{fmtDate(c.created_at)}</td>
        <td className="px-3 py-2 text-xs font-mono text-ink-muted">{c.id}</td>
        <td className="px-3 py-2 text-xs text-ink">{c.assignee_name ?? '—'}</td>
        <td className="px-3 py-2">{stateBadge(c.state)}</td>
        <td className="px-3 py-2">{ratingBadge(c.rating)}</td>
        <td className="px-3 py-2 text-xs text-ink-muted whitespace-nowrap">{fmtMinSec(c.first_response_time)}</td>
        <td className="px-3 py-2 text-xs text-ink">
          {summary ? (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-left hover:underline w-full"
              title={expanded ? 'Collapse' : 'Expand summary'}
            >
              {expanded ? '▼' : '▶'} {preview}{!expanded && summary.length > 140 && '…'}
            </button>
          ) : (
            <span className="text-ink-subtle italic">No summary</span>
          )}
        </td>
      </tr>
      {expanded && summary && (
        <tr className="border-t border-surface-border bg-surface-page">
          <td colSpan={7} className="px-6 py-3 text-xs text-ink leading-relaxed whitespace-pre-wrap">
            {summary}
            {c.remark && (
              <div className="mt-3 px-3 py-2 rounded-md bg-white border border-surface-border">
                <div className="text-[10px] uppercase font-semibold text-ink-muted mb-1">Customer remark</div>
                {c.remark}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function ConversationList() {
  const { metric: metricParam } = useParams<{ metric: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const allowed: MetricKey[] = ['total', 'csat', 'dsat', 'frt', 'unresolved'];
  const metric: MetricKey = allowed.includes(metricParam as MetricKey) ? (metricParam as MetricKey) : 'total';
  const start = searchParams.get('start') ?? '';
  const end = searchParams.get('end') ?? '';

  const [data, setData] = useState<ConversationListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!start || !end) {
      setError('Missing date range — open a metric from the dashboard.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPage(1);
    api.conversationsList(metric, start, end)
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError((err as Error).message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [metric, start, end]);

  const meta = METRIC_META[metric];
  const totalPages = data ? Math.max(1, Math.ceil(data.items.length / PAGE_SIZE)) : 1;
  const pageItems = useMemo(() => {
    if (!data) return [];
    const startIdx = (page - 1) * PAGE_SIZE;
    return data.items.slice(startIdx, startIdx + PAGE_SIZE);
  }, [data, page]);

  return (
    <div className="min-h-screen bg-surface-page">
      <header className="bg-white border-b border-surface-border">
        <div className="max-w-[1440px] mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-ink-muted hover:text-ink flex items-center gap-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 4l-4 4 4 4" />
            </svg>
            Back to dashboard
          </button>
          <div className="h-5 border-l border-surface-border" />
          <div>
            <h1 className="text-base font-semibold text-ink">{meta.title}</h1>
            <p className="text-xs text-ink-muted">
              {meta.subtitle} · {start} → {end}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-6">
        {error && (
          <div className="px-3 py-2 mb-4 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">
            {error}
            {(!start || !end) && (
              <div className="mt-1">
                <Link to="/" className="text-brand hover:underline text-xs">Open dashboard</Link>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 skeleton rounded-md" />
            ))}
          </div>
        )}

        {!loading && data && (
          <>
            <div className="text-sm text-ink-muted mb-3">
              <span className="font-semibold text-ink">{data.total}</span> conversation{data.total === 1 ? '' : 's'}
            </div>
            <div className="bg-white rounded-card border border-surface-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-page">
                  <tr className="text-left text-[10px] uppercase tracking-wide text-ink-muted">
                    <th className="px-3 py-2 font-medium">Created</th>
                    <th className="px-3 py-2 font-medium">ID</th>
                    <th className="px-3 py-2 font-medium">Assignee</th>
                    <th className="px-3 py-2 font-medium">State</th>
                    <th className="px-3 py-2 font-medium">Rating</th>
                    <th className="px-3 py-2 font-medium">FRT</th>
                    <th className="px-3 py-2 font-medium">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-ink-muted italic">
                        No conversations match this filter for the selected range.
                      </td>
                    </tr>
                  )}
                  {pageItems.map((c) => <ConversationRow key={c.id} c={c} />)}
                </tbody>
              </table>
            </div>

            {data.total > PAGE_SIZE && (
              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="text-ink-muted">
                  Page {page} of {totalPages} · showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.total)} of {data.total}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-md border border-surface-border text-xs font-medium disabled:opacity-40 hover:bg-white"
                  >
                    ‹ Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-md border border-surface-border text-xs font-medium disabled:opacity-40 hover:bg-white"
                  >
                    Next ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
