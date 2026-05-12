import 'dotenv/config';
import axios from 'axios';

const API = 'https://api.intercom.io';
const TOKEN = process.env.INTERCOM_ACCESS_TOKEN!;
const TEAM_ID = process.env.INTERCOM_TEAM_ID!;

function client() {
  return axios.create({
    baseURL: API,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Intercom-Version': '2.11',
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    timeout: 90_000,
  });
}

(async () => {
  const c = client();

  // Map admin_id → name
  const { data: adminsResp } = await c.get('/admins');
  const adminName = new Map<string, string>();
  for (const a of adminsResp.admins ?? []) adminName.set(String(a.id), a.name);

  const start = Math.floor(new Date('2026-05-01T00:00:00Z').getTime() / 1000);
  const end = Math.floor(new Date('2026-05-08T23:59:59Z').getTime() / 1000);

  // Search by created_at, currently-assigned team = Autonomous
  const filters = {
    operator: 'AND',
    value: [
      { field: 'created_at', operator: '>=', value: start },
      { field: 'created_at', operator: '<=', value: end },
      { field: 'team_assignee_id', operator: '=', value: TEAM_ID },
    ],
  };

  const all: any[] = [];
  let cursor: string | undefined;
  while (true) {
    const body: any = { query: filters, pagination: { per_page: 150 } };
    if (cursor) body.pagination.starting_after = cursor;
    const { data } = await c.post('/conversations/search', body);
    all.push(...(data.conversations ?? []));
    cursor = data?.pages?.next?.starting_after;
    if (!cursor) break;
  }
  console.log(`Conversations created May 1–8 in Autonomous team: ${all.length}\n`);

  // For each conversation, compute Intercom-style FRT:
  //   FRT_botInboxExcluded = first_admin_reply_at - first_assignment_at
  // (falls back to first_admin_reply_at - created_at if first_assignment_at missing)
  type Row = {
    id: string;
    assigneeId: string | null;
    frtCreated: number | null;
    frtAssigned: number | null;
  };
  const rows: Row[] = all.map((cv) => {
    const stats = cv.statistics ?? {};
    const ar = stats.first_admin_reply_at != null ? Number(stats.first_admin_reply_at) : null;
    const as = stats.first_assignment_at != null ? Number(stats.first_assignment_at) : null;
    const created = Number(cv.created_at);
    return {
      id: String(cv.id),
      assigneeId: cv.admin_assignee_id ? String(cv.admin_assignee_id) : null,
      frtCreated: ar && created ? ar - created : null,
      frtAssigned: ar && as ? ar - as : null,
    };
  });

  // Group by current assignee
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    if (!r.assigneeId) continue;
    const g = groups.get(r.assigneeId) ?? [];
    g.push(r);
    groups.set(r.assigneeId, g);
  }

  function avg(xs: number[]): number | null {
    const v = xs.filter((n): n is number => Number.isFinite(n));
    if (!v.length) return null;
    return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
  }
  function fmt(s: number | null): string {
    if (s == null) return '—';
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  console.log(`${'Engineer'.padEnd(28)}  Chats   FRT (created→reply)   FRT (assigned→reply, bot excluded)`);
  console.log(`${'-'.repeat(28)}  -----   -------------------   ----------------------------------`);
  const list = [...groups.entries()].map(([aid, gs]) => ({
    name: adminName.get(aid) ?? `Agent ${aid}`,
    count: gs.length,
    fromCreated: avg(gs.map((g) => g.frtCreated as number)),
    fromAssigned: avg(gs.map((g) => g.frtAssigned as number)),
  }));
  list.sort((a, b) => (a.fromAssigned ?? 9e9) - (b.fromAssigned ?? 9e9));
  for (const r of list) {
    console.log(`${r.name.padEnd(28)}  ${String(r.count).padStart(5)}   ${fmt(r.fromCreated).padStart(19)}   ${fmt(r.fromAssigned).padStart(34)}`);
  }
})().catch((err) => {
  console.error(err.response?.data ?? err);
  process.exit(1);
});
