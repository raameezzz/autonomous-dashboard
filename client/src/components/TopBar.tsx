import { useState } from 'react';
import DateRangePicker from './DateRangePicker';
import { DateRange } from '../types';

interface Props {
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
  onConnectIntercom: (token: string) => void;
  intercomConfigured: boolean;
  user?: { email: string } | null;
  onLogout?: () => void;
}

export default function TopBar({
  range,
  onRangeChange,
  onConnectIntercom,
  intercomConfigured,
  user,
  onLogout,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [token, setToken] = useState('');

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

        <button
          onClick={() => setModalOpen(true)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            intercomConfigured
              ? 'bg-white text-ink border border-surface-border hover:bg-surface-page'
              : 'bg-brand text-white hover:bg-brand-600'
          }`}
        >
          {intercomConfigured ? 'Reconnect Intercom' : 'Connect Intercom'}
        </button>

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

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-card shadow-xl w-full max-w-md p-6 border border-surface-border">
            <h2 className="text-lg font-semibold text-ink">Connect Intercom</h2>
            <p className="text-sm text-ink-muted mt-1">
              Paste your Intercom Access Token. The server will use it for live data.
            </p>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="dG9rZW46..."
              className="mt-4 w-full px-3 py-2 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <div className="mt-2 text-xs text-ink-subtle">
              Get one at <span className="font-mono">app.intercom.com → Developer Hub → Authentication</span>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm text-ink-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onConnectIntercom(token.trim());
                  setModalOpen(false);
                  setToken('');
                }}
                disabled={!token.trim()}
                className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
