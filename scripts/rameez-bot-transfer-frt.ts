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
  console.log(`Rameez Yar Khan — ${all.length} chats currently assigned to him, created May 1–8, 2026`);
  console.log(`Bot-transfer anchor = first part_type='assignment' authored by a bot (not default_assignment, not admin reassignment)\n`);

  type Row = {
    id: string;
    created: number;
    botTransferAt: number | null;
    firstAdminReplyAt: number | null;        // ANY admin's first reply
    firstRameezReplyAt: number | null;       // Rameez's own first reply
    notes: string;
  };
  const rows: Row[] = [];

  for (const cv of all) {
    const { data: detail } = await c.get(`/conversations/${cv.id}`);
    const parts: any[] = detail?.conversation_parts?.conversation_parts ?? [];
    let botTransferAt: number | null = null;
    let firstAdminReplyAt: number | null = null;
    let firstRameezReplyAt: number | null = null;
    const reassigns: number[] = [];

    for (const p of parts) {
      const t = Number(p.created_at);
      if (p.part_type === 'assignment' && p.author?.type === 'bot') {
        if (botTransferAt == null) botTransferAt = t;
      }
      if (p.part_type === 'assignment' && p.author?.type === 'admin') {
        reassigns.push(t);
      }
      if (p.part_type === 'comment' && p.author?.type === 'admin' && p.author?.id) {
        if (firstAdminReplyAt == null) firstAdminReplyAt = t;
        if (String(p.author.id) === RAMEEZ_ID && firstRameezReplyAt == null) firstRameezReplyAt = t;
      }
    }
    rows.push({
      id: String(cv.id),
      created: Number(cv.created_at),
      botTransferAt,
      firstAdminReplyAt,
      firstRameezReplyAt,
      notes: reassigns.length ? `${reassigns.length} admin reassign(s)` : '',
    });
  }

  rows.sort((a, b) => a.created - b.created);

  function fmt(s: number | null): string {
    if (s == null) return '—';
    const sec = Math.max(0, Math.round(s));
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  }
  function ts(n: number | null): string {
    return n ? new Date(n * 1000).toISOString().replace('T', ' ').slice(0, 19) : '—';
  }

  console.log(`${'#'.padStart(3)}  ${'created'.padEnd(19)}  ${'bot transfer'.padEnd(19)}  ${'first admin reply'.padEnd(19)}  ${'Rameez first reply'.padEnd(19)}  ${'transfer→1st admin'.padStart(18)}  ${'transfer→Rameez'.padStart(15)}  notes`);
  console.log('-'.repeat(160));
  let i = 0;
  const transferToFirstAdmin: number[] = [];
  const transferToRameez: number[] = [];
  for (const r of rows) {
    i += 1;
    const a = r.botTransferAt && r.firstAdminReplyAt ? r.firstAdminReplyAt - r.botTransferAt : null;
    const b = r.botTransferAt && r.firstRameezReplyAt ? r.firstRameezReplyAt - r.botTransferAt : null;
    if (a != null) transferToFirstAdmin.push(Math.max(0, a));
    if (b != null) transferToRameez.push(Math.max(0, b));
    console.log(
      `${String(i).padStart(3)}  ${ts(r.created)}  ${ts(r.botTransferAt)}  ${ts(r.firstAdminReplyAt)}  ${ts(r.firstRameezReplyAt)}  ${fmt(a).padStart(18)}  ${fmt(b).padStart(15)}  ${r.notes}`
    );
  }

  function avg(xs: number[]): number {
    return xs.length ? Math.round(xs.reduce((s, n) => s + n, 0) / xs.length) : 0;
  }
  function median(xs: number[]): number {
    const s = [...xs].sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)] : 0;
  }

  console.log(`\nSummary across ${rows.length} chats:`);
  console.log(`  bot transfer → first admin reply (any admin):`);
  console.log(`    counted: ${transferToFirstAdmin.length}   avg: ${fmt(avg(transferToFirstAdmin))}   median: ${fmt(median(transferToFirstAdmin))}`);
  console.log(`  bot transfer → Rameez's own first reply:`);
  console.log(`    counted: ${transferToRameez.length}   avg: ${fmt(avg(transferToRameez))}   median: ${fmt(median(transferToRameez))}`);
})().catch((err) => {
  console.error(err.response?.data ?? err);
  process.exit(1);
});
