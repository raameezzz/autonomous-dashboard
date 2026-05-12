import 'dotenv/config';
import axios from 'axios';

const TOKEN = process.env.INTERCOM_ACCESS_TOKEN!;
const TEAM_ID = process.env.INTERCOM_TEAM_ID!;
const RAMEEZ_ID = '4999147';

const c = axios.create({
  baseURL: 'https://api.intercom.io',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Intercom-Version': '2.11', Accept: 'application/json' },
  timeout: 90_000,
});

(async () => {
  const start = Math.floor(new Date('2026-05-01T00:00:00Z').getTime() / 1000);
  const end = Math.floor(new Date('2026-05-08T23:59:59Z').getTime() / 1000);

  const filters = {
    operator: 'AND',
    value: [
      { field: 'created_at', operator: '>=', value: start },
      { field: 'created_at', operator: '<=', value: end },
      { field: 'team_assignee_id', operator: '=', value: TEAM_ID },
      { field: 'admin_assignee_id', operator: '=', value: RAMEEZ_ID },
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

  console.log(`Rameez's currently-assigned chats created May 1–8: ${all.length}\n`);

  type Row = {
    id: string;
    created_to_reply: number | null;
    lastAssignToReply: number | null;
    lastContactToReply: number | null;
    timeToAdminReply: number | null;
  };
  const rows: Row[] = [];
  for (const cv of all) {
    const stats = cv.statistics ?? {};
    const created = Number(cv.created_at);
    const ar = stats.first_admin_reply_at ? Number(stats.first_admin_reply_at) : null;
    const las = stats.last_assignment_at ? Number(stats.last_assignment_at) : null;
    const lcr = stats.last_contact_reply_at ? Number(stats.last_contact_reply_at) : null;
    const ttar = stats.time_to_admin_reply ?? null;
    rows.push({
      id: String(cv.id),
      created_to_reply: ar && created ? ar - created : null,
      lastAssignToReply: ar && las ? ar - las : null,
      lastContactToReply: ar && lcr ? ar - lcr : null,
      timeToAdminReply: ttar,
    });
  }

  function avg(xs: (number | null)[]): number | null {
    const v = xs.filter((n): n is number => Number.isFinite(n as number));
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  }
  function fmt(s: number | null): string {
    if (s == null) return '—';
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  console.log(`${'id'.padEnd(20)}  ${'created→reply'.padEnd(13)}  ${'assign→reply'.padEnd(13)}  ${'contact→reply'.padEnd(13)}  ${'time_to_admin_reply'}`);
  console.log('-'.repeat(85));
  for (const r of rows) {
    console.log(`${r.id.padEnd(20)}  ${fmt(r.created_to_reply).padEnd(13)}  ${fmt(r.lastAssignToReply).padEnd(13)}  ${fmt(r.lastContactToReply).padEnd(13)}  ${r.timeToAdminReply ?? '—'}`);
  }

  console.log(`\nAverages over ${rows.length} chats:`);
  console.log(`  created → reply:                   ${fmt(avg(rows.map((r) => r.created_to_reply)))}`);
  console.log(`  last_assignment_at → reply:        ${fmt(avg(rows.map((r) => r.lastAssignToReply)))}`);
  console.log(`  last_contact_reply_at → reply:     ${fmt(avg(rows.map((r) => r.lastContactToReply)))}`);
  console.log(`  statistics.time_to_admin_reply:    ${fmt(avg(rows.map((r) => r.timeToAdminReply)))}`);
})().catch((err) => {
  console.error(err.response?.data ?? err);
  process.exit(1);
});
