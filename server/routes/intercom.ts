import { Router, Request, Response } from 'express';
import {
  fetchConversations,
  fetchConversationsActive,
  getCSATRatings,
  getAgentStats,
  getChatVolume,
  getCSATTrendByWeek,
  getCachedClosedConversations,
} from '../services/intercom';
import { getTopicsForRange } from '../services/topics';
import { DashboardResponse, IntercomConversationSummary } from '../types';

const router = Router();

function parseRange(req: Request): { start: Date; end: Date } {
  const now = new Date();
  const defaultStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const defaultEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  const startRaw = (req.query.start as string) || '';
  const endRaw = (req.query.end as string) || '';
  const start = startRaw ? new Date(`${startRaw}T00:00:00.000Z`) : defaultStart;
  const end = endRaw ? new Date(`${endRaw}T23:59:59.999Z`) : defaultEnd;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid date range');
  }
  return { start, end };
}

function previousRange(start: Date, end: Date): { start: Date; end: Date } {
  const span = end.getTime() - start.getTime();
  return { start: new Date(start.getTime() - span), end: new Date(end.getTime() - span) };
}

function avgFRT(convos: IntercomConversationSummary[]): number {
  const xs = convos.map((c) => c.first_response_time).filter((v): v is number => v != null);
  if (!xs.length) return 0;
  return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
}

function resolutionRate(convos: IntercomConversationSummary[]): number {
  if (!convos.length) return 0;
  const closed = convos.filter((c) => c.state === 'closed' || c.resolution_time != null).length;
  return closed / convos.length;
}

function pctDelta(curr: number, prev: number): number {
  if (!prev) return 0;
  return Number((((curr - prev) / prev) * 100).toFixed(1));
}

function ptDelta(curr: number, prev: number): number {
  return Number((curr - prev).toFixed(1));
}

router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { start, end } = parseRange(req);
    const teamId = process.env.INTERCOM_TEAM_ID;

    const [current, prev, active] = await Promise.all([
      fetchConversations(start, end, teamId),
      (async () => {
        const r = previousRange(start, end);
        return fetchConversations(r.start, r.end, teamId);
      })(),
      fetchConversationsActive(start, end, teamId),
    ]);

    const csatNow = getCSATRatings(current);
    const csatPrev = getCSATRatings(prev);
    const frtNow = avgFRT(current);
    const frtPrev = avgFRT(prev);
    const rrNow = resolutionRate(current);
    const rrPrev = resolutionRate(prev);

    const response: DashboardResponse = {
      metrics: {
        total_chats: current.length,
        total_chats_delta: pctDelta(current.length, prev.length),
        csat_pct: csatNow.csat_pct,
        csat_pct_delta: ptDelta(csatNow.csat_pct, csatPrev.csat_pct),
        dsat_pct: csatNow.dsat_pct,
        dsat_pct_delta: ptDelta(csatNow.dsat_pct, csatPrev.dsat_pct),
        avg_response_time_seconds: frtNow,
        avg_response_time_delta: pctDelta(frtNow, frtPrev),
        resolution_rate: Number(rrNow.toFixed(3)),
        resolution_rate_delta: pctDelta(rrNow, rrPrev),
      },
      chatVolume: getChatVolume(current, start, end),
      csatTrend: getCSATTrendByWeek(current),
      agentStats: getAgentStats(active),
    };

    res.json(response);
  } catch (err) {
    console.error('[/api/dashboard]', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/conversations/closed', async (req: Request, res: Response) => {
  try {
    const { start, end } = parseRange(req);
    const teamId = process.env.INTERCOM_TEAM_ID;
    const limit = Math.min(Number(req.query.limit ?? 25), 100);
    const filter = String(req.query.filter ?? 'all');

    const all = await fetchConversations(start, end, teamId);
    let closed = all.filter((c) => c.state === 'closed');
    closed.sort((a, b) => (b.closed_at ?? 0) - (a.closed_at ?? 0));

    if (filter === 'rated') closed = closed.filter((c) => c.csat_rating != null);
    if (filter === 'csat') closed = closed.filter((c) => c.csat_rating != null && c.csat_rating >= 4);
    if (filter === 'dsat') closed = closed.filter((c) => c.csat_rating != null && c.csat_rating <= 3);

    const ids = closed.slice(0, limit).map((c) => c.id);
    const detailed = await getCachedClosedConversations(ids);

    const indexById = new Map(detailed.map((d) => [d.id, d]));
    const merged = closed.slice(0, limit).map((c) => {
      const d = indexById.get(c.id);
      return {
        id: c.id,
        created_at: c.created_at,
        closed_at: c.closed_at,
        assignee_id: c.assignee_id,
        assignee_name: c.assignee_name,
        rating: c.csat_rating ?? d?.rating ?? null,
        remark: c.csat_remark ?? d?.remark ?? null,
        summary: d?.summary ?? null,
        category:
          (c.csat_rating ?? d?.rating) == null
            ? 'unrated'
            : (c.csat_rating ?? d?.rating)! >= 4
              ? 'csat'
              : 'dsat',
      };
    });

    res.json(merged);
  } catch (err) {
    console.error('[/api/conversations/closed]', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/topics', async (req: Request, res: Response) => {
  try {
    const { start, end } = parseRange(req);
    const teamId = process.env.INTERCOM_TEAM_ID;
    if (!teamId) {
      res.status(500).json({ error: 'INTERCOM_TEAM_ID is not configured' });
      return;
    }
    const topics = await getTopicsForRange(start, end, teamId);
    res.json(topics);
  } catch (err) {
    console.error('[/api/topics]', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
