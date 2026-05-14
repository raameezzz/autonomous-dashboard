import { useState } from 'react';
import { DateRange } from '../types';

interface Props {
  value: DateRange;
  onChange: (r: DateRange) => void;
}

type Preset = { key: string; label: string; build: () => DateRange };
type Section = { title: string; presets: Preset[] };

function iso(d: Date): string {
  // Format from LOCAL components so presets like "This month" don't roll back a day
  // for users in positive-UTC timezones (UTC midnight of May 1 in UTC+5 is April 30).
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function startOfWeek(d: Date): Date {
  const dow = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}
function startOfHalf(d: Date): Date {
  const h = Math.floor(d.getMonth() / 6);
  return new Date(d.getFullYear(), h * 6, 1);
}
function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

function rangeFromTo(start: Date, end: Date, label: string): DateRange {
  return { start: iso(start), end: iso(end), label };
}

const SECTIONS: Section[] = [
  {
    title: 'Quick',
    presets: [
      {
        key: 'today',
        label: 'Today',
        build: () => {
          const t = new Date();
          return { start: iso(t), end: iso(t), label: 'Today' };
        },
      },
      {
        key: 'yesterday',
        label: 'Yesterday',
        build: () => {
          const y = addDays(new Date(), -1);
          return { start: iso(y), end: iso(y), label: 'Yesterday' };
        },
      },
    ],
  },
  {
    title: 'Week',
    presets: [
      {
        key: 'this_week',
        label: 'This week',
        build: () => rangeFromTo(startOfWeek(new Date()), new Date(), 'This week'),
      },
      {
        key: 'last_week',
        label: 'Last week',
        build: () => {
          const sw = startOfWeek(new Date());
          const lwStart = addDays(sw, -7);
          const lwEnd = addDays(sw, -1);
          return rangeFromTo(lwStart, lwEnd, 'Last week');
        },
      },
    ],
  },
  {
    title: 'Month',
    presets: [
      {
        key: 'this_month',
        label: 'This month',
        build: () => rangeFromTo(startOfMonth(new Date()), new Date(), 'This month'),
      },
    ],
  },
  {
    title: 'Quarter',
    presets: [
      {
        key: 'this_quarter',
        label: 'This quarter',
        build: () => rangeFromTo(startOfQuarter(new Date()), new Date(), 'This quarter'),
      },
      {
        key: 'last_quarter',
        label: 'Last quarter',
        build: () => {
          const sq = startOfQuarter(new Date());
          const lqStart = new Date(sq.getFullYear(), sq.getMonth() - 3, 1);
          const lqEnd = addDays(sq, -1);
          return rangeFromTo(lqStart, lqEnd, 'Last quarter');
        },
      },
    ],
  },
  {
    title: 'Year',
    presets: [
      {
        key: 'half_ytd',
        label: 'Half year to date',
        build: () => rangeFromTo(startOfHalf(new Date()), new Date(), 'Half year to date'),
      },
      {
        key: 'ytd',
        label: 'Year to date',
        build: () => rangeFromTo(startOfYear(new Date()), new Date(), 'Year to date'),
      },
    ],
  },
];

export default function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(value.start);
  const [customEnd, setCustomEnd] = useState(value.end);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-4 py-2 rounded-lg border border-surface-border bg-white text-sm text-ink hover:bg-surface-page flex items-center gap-2"
      >
        <svg className="w-4 h-4 text-ink-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span>{value.label}</span>
        <svg className="w-3 h-3 text-ink-muted" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[520px] overflow-y-auto bg-white rounded-card border border-surface-border shadow-card z-30 p-2">
          {SECTIONS.map((section) => (
            <div key={section.title} className="mb-1">
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-ink-subtle uppercase tracking-wider">
                {section.title}
              </div>
              {section.presets.map((p) => (
                <button
                  key={p.key}
                  onClick={() => {
                    onChange(p.build());
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-md text-sm hover:bg-surface-page ${
                    value.label === p.label ? 'text-brand font-medium' : 'text-ink'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          ))}
          <div className="border-t border-surface-border mt-2 pt-2 px-2">
            <div className="text-xs text-ink-muted mb-2">Date range</div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="flex-1 text-xs px-2 py-1.5 border border-surface-border rounded"
              />
              <span className="text-xs text-ink-muted">→</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="flex-1 text-xs px-2 py-1.5 border border-surface-border rounded"
              />
            </div>
            <button
              onClick={() => {
                if (customStart && customEnd) {
                  onChange({ start: customStart, end: customEnd, label: `${customStart} → ${customEnd}` });
                  setOpen(false);
                }
              }}
              className="mt-2 w-full bg-brand text-white text-xs font-medium py-1.5 rounded-md hover:bg-brand-600"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
