import DateRangePicker from './DateRangePicker';
import { DateRange } from '../types';

interface Props {
  title: string;
  liveLabel?: string;
  range?: DateRange;
  onRangeChange?: (r: DateRange) => void;
}

export default function TopBar({ title, liveLabel, range, onRangeChange }: Props) {
  return (
    <header className="bg-white border-b border-surface-border">
      <div className="px-6 py-4 flex items-center gap-6">
        <h1 className="text-lg font-semibold text-ink">{title}</h1>

        {liveLabel && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-emerald-700">{liveLabel}</span>
          </div>
        )}

        <div className="flex-1" />

        {range && onRangeChange && <DateRangePicker value={range} onChange={onRangeChange} />}
      </div>
    </header>
  );
}
