import { NavLink } from 'react-router-dom';

interface Props {
  user?: { email: string } | null;
  onLogout?: () => void;
}

const NAV = [
  { to: '/', label: 'Intercom Analytics', icon: ChatIcon },
  { to: '/autonomous-customers', label: 'Autonomous Customers', icon: UsersIcon },
];

export default function Sidebar({ user, onLogout }: Props) {
  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-white border-r border-surface-border h-screen sticky top-0">
      <div className="px-5 py-5 flex items-center gap-3 border-b border-surface-border">
        <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm tracking-tight">
          CW
        </div>
        <div className="leading-tight">
          <div className="text-base font-semibold text-ink">Cloudways</div>
          <div className="text-xs text-ink-muted">Autonomous Team</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-100 text-brand'
                    : 'text-ink-muted hover:bg-surface-page hover:text-ink'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {user && (
        <div className="px-4 py-4 border-t border-surface-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand flex items-center justify-center font-semibold text-xs">
            {user.email[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-ink truncate">{user.email}</div>
            <button onClick={onLogout} className="text-xs text-ink-muted hover:text-ink">
              Sign out
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
