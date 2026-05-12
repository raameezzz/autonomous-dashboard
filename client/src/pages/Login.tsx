import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function Login({ onAuthed }: { onAuthed: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.login(email, password);
      onAuthed(res.user.email);
      navigate('/', { replace: true });
    } catch (err) {
      setError((err as Error).message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-page px-4">
      <div className="w-full max-w-md bg-white rounded-card border border-surface-border shadow-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm">
            CW
          </div>
          <div className="leading-tight">
            <div className="text-base font-semibold text-ink">Cloudways</div>
            <div className="text-xs text-ink-muted">Autonomous Team</div>
          </div>
        </div>
        <h1 className="text-xl font-semibold text-ink mb-1">Autonomous Dashboard</h1>
        <p className="text-sm text-ink-muted mb-6">Sign in to view live support analytics.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="admin@cloudways.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand text-white py-2.5 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-xs text-ink-subtle text-center">
          Default: admin@cloudways.com / changeme — override via .env
        </p>
      </div>
    </div>
  );
}
