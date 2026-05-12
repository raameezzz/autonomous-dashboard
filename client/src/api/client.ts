import { ClosedConversation, DashboardResponse } from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

export type ClosedFilter = 'all' | 'rated' | 'csat' | 'dsat';

export const api = {
  health: () => request<{ ok: boolean; ts: number }>('/api/health'),
  config: () => request<{ intercom_configured: boolean; anthropic_configured: boolean }>('/api/config'),

  login: (email: string, password: string) =>
    request<{ ok: boolean; user: { email: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ user: { email: string } | null }>('/api/auth/me'),

  dashboard: (start: string, end: string) =>
    request<DashboardResponse>(`/api/dashboard?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),

  closedConversations: (start: string, end: string, filter: ClosedFilter = 'all', limit = 25) =>
    request<ClosedConversation[]>(
      `/api/conversations/closed?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&filter=${filter}&limit=${limit}`,
    ),
};
