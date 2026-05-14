import { Link } from 'react-router-dom';

interface Props {
  label: string;
  value: string;
  delta?: number;
  loading?: boolean;
  hint?: string;
  deltaSuffix?: string;
  to?: string;
}

function CardBody({
  label,
  value,
  delta,
  loading,
  hint,
  deltaSuffix = '%',
  clickable,
}: Omit<Props, 'to'> & { clickable: boolean }) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div
      className={`bg-surface-tile rounded-card p-5 min-w-0 transition ${
        clickable ? 'cursor-pointer hover:ring-2 hover:ring-brand/40 hover:bg-white' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-wide text-ink-muted font-medium">{label}</div>
        {clickable && !loading && (
          <svg className="w-3.5 h-3.5 text-ink-subtle" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 2l4 4-4 4" />
          </svg>
        )}
      </div>
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

export default function MetricCard(props: Props) {
  const { to, ...rest } = props;
  if (to) {
    return (
      <Link to={to} className="block focus:outline-none focus:ring-2 focus:ring-brand/60 rounded-card">
        <CardBody {...rest} clickable />
      </Link>
    );
  }
  return <CardBody {...rest} clickable={false} />;
}
