import axios, { AxiosInstance } from 'axios';
import {
  IntercomConversationSummary,
  CSATResult,
  AgentStat,
  ChatVolumePoint,
  ClosedConversation,
} from '../types';
import { adminCache, conversationCache, conversationPartsCache, CachedConversation } from './db';

const INTERCOM_API = 'https://api.intercom.io';
const PAGE_SIZE = 150;
const ADMIN_TTL_MS = 60 * 60 * 1000;

function getClient(): AxiosInstance {
  const token = process.env.INTERCOM_ACCESS_TOKEN;
  if (!token) throw new Error('INTERCOM_ACCESS_TOKEN is not set');
  return axios.create({
    baseURL: INTERCOM_API,
    headers: {
      Authorization: `Bearer ${token}`,
      'Intercom-Version': '2.11',
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    timeout: 90_000,
  });
}

function toUnix(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  return Math.floor(d.getTime() / 1000);
}

function isAiResolved(convo: any): boolean {
  return convo?.ai_agent?.resolution_state === 'resolved'
    || convo?.ai_agent?.resolution_state === 'assumed_resolved';
}

let adminMapMemo: { map: Map<string, string>; loadedAt: number } | null = null;

export async function refreshAdmins(): Promise<Map<string, string>> {
  const client = getClient();
  const { data } = await client.get('/admins');
  const admins: { id: string; name: string; email?: string }[] = (data?.admins ?? []).map((a: any) => ({
    id: String(a.id),
    name: a.name ?? `Agent ${a.id}`,
    email: a.email ?? null,
  }));
  adminCache.upsertMany(admins.map((a) => ({ ...a, email: a.email ?? null, fetched_at: Date.now() })));
  const map = new Map<string, string>();
  for (const a of admins) map.set(a.id, a.name);
  adminMapMemo = { map, loadedAt: Date.now() };
  return map;
}

export async function getAdminMap(): Promise<Map<string, string>> {
  if (adminMapMemo && Date.now() - adminMapMemo.loadedAt < ADMIN_TTL_MS) return adminMapMemo.map;
  const cached = adminCache.all();
  if (cached.length) {
    const map = new Map<string, string>();
    for (const a of cached) map.set(a.id, a.name);
    adminMapMemo = { map, loadedAt: Date.now() - (ADMIN_TTL_MS - 60_000) };
  }
  try {
    return await refreshAdmins();
  } catch (err) {
    console.error('[refreshAdmins]', (err as Error).message);
    return adminMapMemo?.map ?? new Map();
  }
}

let teamAdminsMemo: { teamId: string; ids: Set<string>; loadedAt: number } | null = null;

export async function getTeamAdminIds(teamId: string): Promise<Set<string>> {
  if (teamAdminsMemo && teamAdminsMemo.teamId === teamId && Date.now() - teamAdminsMemo.loadedAt < ADMIN_TTL_MS) {
    return teamAdminsMemo.ids;
  }
  try {
    const client = getClient();
    const { data } = await client.get(`/teams/${teamId}`);
    const ids = new Set<string>((data?.admin_ids ?? []).map((id: any) => String(id)));
    teamAdminsMemo = { teamId, ids, loadedAt: Date.now() };
    return ids;
  } catch (err) {
    console.error('[getTeamAdminIds]', (err as Error).message);
    return teamAdminsMemo?.ids ?? new Set();
  }
}

function summarize(convo: any, adminMap: Map<string, string>): IntercomConversationSummary {
  const stats = convo?.statistics ?? {};
  const csat = convo?.conversation_rating ?? null;
  const assigneeId = convo?.admin_assignee_id ? String(convo.admin_assignee_id) : null;
  const tagNames: string[] = (convo?.tags?.tags ?? []).map((t: any) => t?.name).filter(Boolean);
  const closedAt: number | null = stats.last_close_at ?? stats.first_close_at ?? null;

  return {
    id: String(convo.id),
    created_at: convo.created_at,
    updated_at: convo.updated_at ?? convo.created_at,
    closed_at: closedAt,
    first_response_time: stats.first_admin_reply_at && convo.created_at
      ? Number(stats.first_admin_reply_at) - Number(convo.created_at)
      : null,
    resolution_time: closedAt && convo.created_at ? Number(closedAt) - Number(convo.created_at) : null,
    assignee_id: assigneeId,
    assignee_name: assigneeId ? (adminMap.get(assigneeId) ?? `Agent ${assigneeId}`) : null,
    csat_rating: csat?.rating ?? null,
    csat_remark: csat?.remark ?? null,
    tags: tagNames,
    state: convo?.state ?? 'unknown',
    ai_resolved: isAiResolved(convo),
    repliers_in_window: [],
  };
}

export async function fetchConversations(
  startDate: Date,
  endDate: Date,
  teamId?: string,
): Promise<IntercomConversationSummary[]> {
  const client = getClient();
  const start = toUnix(startDate);
  const end = toUnix(endDate);
  const adminMap = await getAdminMap();

  const baseFilters: any[] = [
    { field: 'created_at', operator: '>=', value: start },
    { field: 'created_at', operator: '<=', value: end },
  ];
  if (teamId) baseFilters.push({ field: 'team_assignee_id', operator: '=', value: teamId });

  const results: IntercomConversationSummary[] = [];
  let next: string | undefined;
  let pages = 0;
  const MAX_PAGES = 20;

  while (pages < MAX_PAGES) {
    const body: any = {
      query: { operator: 'AND', value: baseFilters },
      pagination: { per_page: PAGE_SIZE },
    };
    if (next) body.pagination.starting_after = next;
    const { data } = await client.post('/conversations/search', body);
    const convos = (data?.conversations ?? []) as any[];
    for (const c of convos) results.push(summarize(c, adminMap));

    const cursor = data?.pages?.next?.starting_after;
    if (!cursor) break;
    next = cursor;
    pages += 1;
  }

  const concurrency = 10;
  let cursorIdx = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, results.length) }, async () => {
      while (cursorIdx < results.length) {
        const i = cursorIdx++;
        await enrichFrt(results[i]);
      }
    }),
  );

  return results;
}

interface AdminReply { admin_id: string; created_at: number }
interface PartsData { replies: AdminReply[]; bot_transfer_at: number | null }

async function fetchAdminReplies(conversationId: string): Promise<{ updated_at: number; data: PartsData }> {
  const client = getClient();
  const { data } = await client.get(`/conversations/${conversationId}`);
  const updatedAt = Number(data?.updated_at ?? data?.created_at ?? 0);
  const parts: any[] = data?.conversation_parts?.conversation_parts ?? [];
  const replies: AdminReply[] = [];
  let botTransferAt: number | null = null;
  const src = data?.source;
  if (src?.author?.type === 'admin' && src?.author?.id && (src.delivered_as === 'admin_initiated' || src.type === 'conversation')) {
    replies.push({ admin_id: String(src.author.id), created_at: Number(data.created_at) });
  }
  for (const p of parts) {
    if (!p?.created_at) continue;
    if (p.part_type === 'comment' && p.author?.type === 'admin' && p.author?.id) {
      replies.push({ admin_id: String(p.author.id), created_at: Number(p.created_at) });
    }
    // Bot transfer = first part_type='assignment' authored by a bot. Skip default_assignment
    // (initial bot self-assignment at creation) and admin-authored re-assignments.
    if (botTransferAt == null && p.part_type === 'assignment' && p.author?.type === 'bot') {
      botTransferAt = Number(p.created_at);
    }
  }
  return { updated_at: updatedAt, data: { replies, bot_transfer_at: botTransferAt } };
}

async function loadPartsData(id: string, summaryUpdatedAt: number): Promise<PartsData> {
  const cached = conversationPartsCache.get(id);
  if (cached && cached.updated_at >= summaryUpdatedAt) {
    try {
      const raw = JSON.parse(cached.admin_replies);
      if (raw && typeof raw === 'object' && Array.isArray(raw.replies) && 'bot_transfer_at' in raw) {
        return raw as PartsData;
      }
    } catch { /* fall through to refetch */ }
  }
  try {
    const fresh = await fetchAdminReplies(id);
    conversationPartsCache.upsert({
      id,
      updated_at: fresh.updated_at || summaryUpdatedAt,
      admin_replies: JSON.stringify(fresh.data),
      fetched_at: Date.now(),
    });
    return fresh.data;
  } catch (err) {
    console.error(`[fetchAdminReplies] ${id}:`, (err as Error).message);
    return { replies: [], bot_transfer_at: null };
  }
}

async function enrichFrt(s: IntercomConversationSummary): Promise<PartsData> {
  const parts = await loadPartsData(s.id, s.updated_at);
  if (!parts.replies.length) {
    s.first_response_time = null;
  } else {
    const firstReplyAt = parts.replies.reduce((m, r) => (r.created_at < m ? r.created_at : m), parts.replies[0].created_at);
    const anchor = parts.bot_transfer_at ?? s.created_at;
    s.first_response_time = Math.max(0, firstReplyAt - anchor);
  }
  return parts;
}

async function enrichSummary(
  s: IntercomConversationSummary,
  startUnix: number,
  endUnix: number,
  teamAdmins: Set<string>,
): Promise<void> {
  const parts = await enrichFrt(s);
  const ids = new Set<string>();
  for (const r of parts.replies) {
    if (r.created_at >= startUnix && r.created_at <= endUnix && teamAdmins.has(r.admin_id)) {
      ids.add(r.admin_id);
    }
  }
  s.repliers_in_window = Array.from(ids);
}

export async function fetchConversationsActive(
  startDate: Date,
  endDate: Date,
  teamId?: string,
): Promise<IntercomConversationSummary[]> {
  const client = getClient();
  const start = toUnix(startDate);
  const end = toUnix(endDate);
  const adminMap = await getAdminMap();
  const teamAdmins = teamId ? await getTeamAdminIds(teamId) : new Set(adminMap.keys());

  const baseFilters: any[] = [
    { field: 'updated_at', operator: '>=', value: start },
    { field: 'created_at', operator: '<=', value: end },
  ];
  if (teamId) baseFilters.push({ field: 'team_assignee_id', operator: '=', value: teamId });

  const summaries: IntercomConversationSummary[] = [];
  let next: string | undefined;
  let pages = 0;
  const MAX_PAGES = 30;
  while (pages < MAX_PAGES) {
    const body: any = {
      query: { operator: 'AND', value: baseFilters },
      pagination: { per_page: PAGE_SIZE },
    };
    if (next) body.pagination.starting_after = next;
    const { data } = await client.post('/conversations/search', body);
    const convos = (data?.conversations ?? []) as any[];
    for (const c of convos) summaries.push(summarize(c, adminMap));
    const cursor = data?.pages?.next?.starting_after;
    if (!cursor) break;
    next = cursor;
    pages += 1;
  }

  const concurrency = 10;
  let cursorIdx = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, summaries.length) }, async () => {
      while (cursorIdx < summaries.length) {
        const i = cursorIdx++;
        await enrichSummary(summaries[i], start, end, teamAdmins);
      }
    }),
  );

  return summaries.filter((s) => s.repliers_in_window.length > 0);
}

export interface RawConversation {
  id: string;
  closed_at: number | null;
  assignee_id: string | null;
  rating: number | null;
  remark: string | null;
  summary: string | null;
}

export async function fetchConversationDetails(conversationId: string): Promise<RawConversation> {
  const client = getClient();
  const { data } = await client.get(`/conversations/${conversationId}`);
  const stats = data?.statistics ?? {};
  const rating = data?.conversation_rating ?? null;
  const assigneeId = data?.admin_assignee_id ? String(data.admin_assignee_id) : null;
  const closedAt: number | null = stats.last_close_at ?? stats.first_close_at ?? null;

  const parts: any[] = data?.conversation_parts?.conversation_parts ?? [];
  const summaryPart = [...parts].reverse().find((p) => p.part_type === 'conversation_summary' && p.body);
  const summary = summaryPart ? cleanSummary(summaryPart.body) : null;

  return {
    id: String(data.id),
    closed_at: closedAt,
    assignee_id: assigneeId,
    rating: rating?.rating ?? null,
    remark: rating?.remark ?? null,
    summary,
  };
}

export async function getCachedClosedConversations(
  ids: string[],
  options: { concurrency?: number; maxAgeMs?: number } = {},
): Promise<ClosedConversation[]> {
  const concurrency = options.concurrency ?? 5;
  const maxAge = options.maxAgeMs ?? 6 * 60 * 60 * 1000;
  const adminMap = await getAdminMap();

  const cached = new Map(conversationCache.getMany(ids).map((r) => [r.id, r]));
  const toFetch = ids.filter((id) => {
    const c = cached.get(id);
    return !c || (Date.now() - c.fetched_at) > maxAge;
  });

  let cursor = 0;
  const fetched = new Map<string, RawConversation>();
  await Promise.all(
    Array.from({ length: Math.min(concurrency, toFetch.length) }, async () => {
      while (cursor < toFetch.length) {
        const idx = cursor++;
        const id = toFetch[idx];
        try {
          const r = await fetchConversationDetails(id);
          fetched.set(id, r);
          const row: CachedConversation = {
            id: r.id,
            closed_at: r.closed_at,
            assignee_id: r.assignee_id,
            rating: r.rating,
            remark: r.remark,
            summary: r.summary,
            fetched_at: Date.now(),
          };
          conversationCache.upsert(row);
        } catch (err) {
          console.error(`[fetchConversationDetails] ${id}:`, (err as Error).message);
        }
      }
    }),
  );

  return ids.map((id) => {
    const fresh = fetched.get(id);
    const c = fresh ?? cached.get(id);
    if (!c) {
      return {
        id,
        created_at: 0,
        closed_at: null,
        assignee_id: null,
        assignee_name: null,
        rating: null,
        remark: null,
        summary: null,
        category: 'unrated' as const,
      };
    }
    const rating = c.rating;
    const category: ClosedConversation['category'] =
      rating == null ? 'unrated' : rating >= 4 ? 'csat' : 'dsat';
    return {
      id: c.id,
      created_at: 0,
      closed_at: c.closed_at,
      assignee_id: c.assignee_id,
      assignee_name: c.assignee_id ? (adminMap.get(c.assignee_id) ?? `Agent ${c.assignee_id}`) : null,
      rating,
      remark: c.remark,
      summary: c.summary,
      category,
    };
  });
}

function cleanSummary(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<b>/gi, '**')
    .replace(/<\/b>/gi, '**')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function getCSATRatings(conversations: IntercomConversationSummary[]): CSATResult {
  const dist: CSATResult['distribution'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let sum = 0;
  for (const c of conversations) {
    if (c.csat_rating == null) continue;
    const r = Math.max(1, Math.min(5, Math.round(c.csat_rating))) as 1 | 2 | 3 | 4 | 5;
    dist[r] += 1;
    total += 1;
    sum += r;
  }
  if (!total) {
    return { csat_pct: 0, dsat_pct: 0, neutral_pct: 0, totalResponses: 0, avg: 0, distribution: dist };
  }
  const sat = dist[4] + dist[5];
  const unsat = dist[1] + dist[2] + dist[3];
  return {
    csat_pct: Math.round((sat / total) * 1000) / 10,
    dsat_pct: Math.round((unsat / total) * 1000) / 10,
    neutral_pct: 0,
    totalResponses: total,
    avg: Number((sum / total).toFixed(2)),
    distribution: dist,
  };
}

export function getAgentStats(conversations: IntercomConversationSummary[]): AgentStat[] {
  const adminNames = new Map<string, string>();
  for (const a of adminCache.all()) adminNames.set(a.id, a.name);

  const groups = new Map<string, IntercomConversationSummary[]>();
  for (const c of conversations) {
    const repliers = c.repliers_in_window.length
      ? c.repliers_in_window
      : (c.assignee_id ? [c.assignee_id] : []);
    for (const adminId of repliers) {
      const list = groups.get(adminId) ?? [];
      list.push(c);
      groups.set(adminId, list);
    }
  }

  const stats: AgentStat[] = [];
  for (const [adminId, convos] of groups) {
    const ratings = convos.map((c) => c.csat_rating).filter((r): r is number => r != null);
    const sat = ratings.filter((r) => r >= 4).length;
    const dsat = ratings.filter((r) => r <= 3).length;
    // FRT bucketed by current assignee only — matches Intercom's "Average FRT by teammate currently assigned" semantics.
    const frts = convos
      .filter((c) => c.assignee_id === adminId)
      .map((c) => c.first_response_time)
      .filter((r): r is number => r != null);
    const closedCount = convos.filter((c) => c.state === 'closed').length;
    const snoozedCount = convos.filter((c) => c.state === 'snoozed').length;
    const resolved = convos.filter((c) => c.state === 'closed' || c.resolution_time != null).length;
    const name = adminNames.get(adminId)
      ?? convos.find((c) => c.assignee_id === adminId && c.assignee_name)?.assignee_name
      ?? `Agent ${adminId}`;

    stats.push({
      assignee_id: adminId,
      name,
      chat_count: convos.length,
      closed_count: closedCount,
      snoozed_count: snoozedCount,
      csat_pct: ratings.length ? Math.round((sat / ratings.length) * 1000) / 10 : null,
      dsat_pct: ratings.length ? Math.round((dsat / ratings.length) * 1000) / 10 : null,
      avg_first_response_time: frts.length ? Math.round(frts.reduce((a, b) => a + b, 0) / frts.length) : null,
      resolution_rate: convos.length ? Number((resolved / convos.length).toFixed(3)) : 0,
      rated_count: ratings.length,
    });
  }

  stats.sort((a, b) => (b.csat_pct ?? -1) - (a.csat_pct ?? -1) || b.chat_count - a.chat_count);
  return stats;
}

export function getChatVolume(
  conversations: IntercomConversationSummary[],
  startDate: Date,
  endDate: Date,
): ChatVolumePoint[] {
  const buckets = new Map<string, ChatVolumePoint>();
  const day = 24 * 60 * 60 * 1000;
  for (let t = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
       t <= endDate.getTime();
       t += day) {
    const key = isoDay(new Date(t));
    buckets.set(key, { date: key, total: 0, ai_resolved: 0 });
  }

  for (const c of conversations) {
    const key = isoDay(new Date(c.created_at * 1000));
    const point = buckets.get(key) ?? { date: key, total: 0, ai_resolved: 0 };
    point.total += 1;
    if (c.ai_resolved) point.ai_resolved += 1;
    buckets.set(key, point);
  }

  return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getCSATTrendByWeek(
  conversations: IntercomConversationSummary[],
): { week: string; csat_pct: number; dsat_pct: number; target: number }[] {
  const groups = new Map<string, number[]>();
  for (const c of conversations) {
    if (c.csat_rating == null) continue;
    const week = isoWeek(new Date(c.created_at * 1000));
    const arr = groups.get(week) ?? [];
    arr.push(c.csat_rating);
    groups.set(week, arr);
  }
  return Array.from(groups.entries())
    .map(([week, ratings]) => {
      const sat = ratings.filter((r) => r >= 4).length;
      const dsat = ratings.filter((r) => r <= 3).length;
      return {
        week,
        csat_pct: Math.round((sat / ratings.length) * 1000) / 10,
        dsat_pct: Math.round((dsat / ratings.length) * 1000) / 10,
        target: 96,
      };
    })
    .sort((a, b) => a.week.localeCompare(b.week));
}

function isoWeek(d: Date): string {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
