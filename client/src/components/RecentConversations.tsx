import { useEffect, useState } from 'react';
import { api, ClosedFilter } from '../api/client';
import { ClosedConversation, DateRange } from '../types';

interface Props {
  range: DateRange;
}

const FILTERS: { key: ClosedFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'rated', label: 'Rated' },
  { key: 'csat', label: 'CSAT' },
  { key: 'dsat', label: 'DSAT' },
];

function ratingBadge(rating: number | null) {
  if (rating == null) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">UNRATED</span>;
  }
  if (rating >= 4) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
        CSAT · {rating}/5
      </span>
    );
  }
  if (rating <= 2) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700">
        DSAT · {rating}/5
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
      NEUTRAL · {rating}/5
    </span>
  );
}

function fmtRelative(ts: number | null): string {
  if (!ts) return '—';
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function ConversationCard({ c }: { c: ClosedConversation }) {
  const [expanded, setExpanded] = useState(false);
  const summary = c.summary ?? '';
  const collapsedSummary = summary.length > 280 ? summary.slice(0, 280).trimEnd() + '…' : summary;

  return (
    <div className="border border-surface-border rounded-lg p-4 bg-white hover:border-brand/50 transition">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {ratingBadge(c.rating)}
          <span className="text-xs text-ink-muted truncate">
            {c.assignee_name ?? 'Unassigned'}
          </span>
        </div>
        <div className="text-xs text-ink-subtle whitespace-nowrap">
          closed {fmtRelative(c.closed_at)}
        </div>
      </div>

      {c.remark && (
        <div className="mb-2 px-3 py-2 rounded-md bg-surface-tile border-l-2 border-brand text-sm text-ink italic">
          “{c.remark}”
        </div>
      )}

      {summary ? (
        <div className="text-sm text-ink-muted whitespace-pre-line leading-relaxed">
          {expanded ? summary : collapsedSummary}
          {summary.length > 280 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="ml-1 text-brand text-xs font-medium hover:underline"
            >
              {expanded ? 'show less' : 'show more'}
            </button>
          )}
        </div>
      ) : (
        <div className="text-xs text-ink-subtle italic">No Fin summary available for this chat.</div>
      )}
    </div>
  );
}

export default function RecentConversations({ range }: Props) {
  const [filter, setFilter] = useState<ClosedFilter>('rated');
  const [data, setData] = useState<ClosedConversation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.closedConversations(range.start, range.end, filter, 25)
      .then((rows) => { if (!cancelled) { setData(rows); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError((err as Error).message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [range.start, range.end, filter]);

  return (
    <div className="bg-white rounded-card border border-surface-border shadow-card p-5 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">Recent Closed Conversations</h3>
          <p className="text-xs text-ink-muted">
            {data?.length ?? 0} conversations · Fin summary, CSAT rating, customer remark
          </p>
        </div>
        <div className="flex items-center gap-1 bg-surface-page rounded-lg p-0.5 border border-surface-border">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                filter === f.key ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1 -mr-1">
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 skeleton rounded-lg" />
        ))}
        {!loading && data && data.length === 0 && (
          <div className="text-center py-12 text-sm text-ink-muted">
            No conversations match this filter.
          </div>
        )}
        {!loading && data && data.map((c) => <ConversationCard key={c.id} c={c} />)}
      </div>
    </div>
  );
}
