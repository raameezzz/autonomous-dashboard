interface Props {
  label: string;
  value: string;
  delta?: number;
  loading?: boolean;
  hint?: string;
  deltaSuffix?: string;
}

export default function MetricCard({ label, value, delta, loading, hint, deltaSuffix = '%' }: Props) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="bg-surface-tile rounded-card p-5 min-w-0">
      <div className="text-xs uppercase tracking-wide text-ink-muted font-medium">{label}</div>
      {loading ? (
        <div className="mt-3 h-8 w-24 skeleton rounded" />
      ) : (
        <div className="mt-2 text-3xl font-semibold text-ink tracking-tight">{value}</div>
      )}
      <div className="mt-2 flex items-center gap-2">
        {typeof delta === 'number' && !loading ? (
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold ${
              positive ? 'text-ok' : 'text-bad'
            }`}
          >
            <svg
              className="w-3 h-3"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {positive ? <path d="M3 8l3-3 3 3" /> : <path d="M3 4l3 3 3-3" />}
            </svg>
            {Math.abs(delta).toFixed(1)}{deltaSuffix}
          </span>
        ) : null}
        {hint && <span className="text-xs text-ink-subtle">{hint}</span>}
      </div>
    </div>
  );
}
