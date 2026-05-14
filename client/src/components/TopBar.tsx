import DateRangePicker from './DateRangePicker';
import { DateRange } from '../types';

interface Props {
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
  user?: { email: string } | null;
  onLogout?: () => void;
}

export default function TopBar({ range, onRangeChange, user, onLogout }: Props) {
  return (
    <header className="bg-white border-b border-surface-border">
      <div className="max-w-[1440px] mx-auto px-6 py-4 flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm tracking-tight">
            CW
          </div>
          <div className="leading-tight">
            <div className="text-base font-semibold text-ink">Cloudways</div>
            <div className="text-xs text-ink-muted">Autonomous Team</div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-medium text-emerald-700">Live · Intercom</span>
        </div>

        <div className="flex-1" />

        <DateRangePicker value={range} onChange={onRangeChange} />

        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-surface-border">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand flex items-center justify-center font-semibold text-xs">
              {user.email[0]?.toUpperCase()}
            </div>
            <button
              onClick={onLogout}
              className="text-xs text-ink-muted hover:text-ink"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
