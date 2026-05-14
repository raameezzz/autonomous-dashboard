import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ConversationList from './pages/ConversationList';
import { api } from './api/client';

type AuthState = { status: 'loading' } | { status: 'in'; user: { email: string } } | { status: 'out' };

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    api.me()
      .then((r) => setAuth(r.user ? { status: 'in', user: r.user } : { status: 'out' }))
      .catch(() => setAuth({ status: 'out' }));
  }, []);

  if (auth.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  const handleLogout = async () => {
    try { await api.logout(); } catch { /* ignore */ }
    setAuth({ status: 'out' });
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={
          auth.status === 'in'
            ? <Navigate to="/" replace />
            : <Login onAuthed={(email) => setAuth({ status: 'in', user: { email } })} />
        }
      />
      {auth.status === 'in' ? (
        <>
          <Route path="/" element={<Dashboard user={auth.user} onLogout={handleLogout} />} />
          <Route path="/chats/:metric" element={<ConversationList />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
}
