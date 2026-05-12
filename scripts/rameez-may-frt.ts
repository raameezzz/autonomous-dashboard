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

  // Search: chats currently assigned to Rameez, on Autonomous team, created May 1–8.
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

  console.log(`Rameez Yar Khan — chats currently assigned to him, created May 1–8, 2026`);
  console.log(`Found ${all.length} chats\n`);

  type Row = {
    idx: number;
    id: string;
    created: string;
    state: string;
    rating: string;
    frt_raw: number | null;          // first_admin_reply_at - created_at
    frt_post_bot: number | null;     // first_admin_reply_at - last_assignment_before_first_reply
    anchor_label: string;
  };

  const rows: Row[] = [];

  for (let i = 0; i < all.length; i++) {
    const cv = all[i];
    const stats = cv.statistics ?? {};
    const created = Number(cv.created_at);
    const ar = stats.first_admin_reply_at ? Number(stats.first_admin_reply_at) : null;

    // Fetch parts to find last assignment event before first admin reply (bot-inbox-excluded anchor).
    let postBot: number | null = null;
    let anchorLabel = 'created_at';
    if (ar) {
      const { data: detail } = await c.get(`/conversations/${cv.id}`);
      const parts: any[] = detail?.conversation_parts?.conversation_parts ?? [];
      const assignments = parts
        .filter((p) => (p.part_type === 'assignment' || p.part_type === 'default_assignment') && p.created_at)
        .map((p) => Number(p.created_at))
        .sort((a, b) => a - b);
      const before = assignments.filter((t) => t <= ar);
      const anchor = before.length ? before[before.length - 1] : created;
      if (before.length) anchorLabel = before.length === 1 ? 'default_assignment' : 'last assignment';
      postBot = Math.max(0, ar - anchor);
    }

    rows.push({
      idx: i + 1,
      id: String(cv.id),
      created: new Date(created * 1000).toISOString().replace('T', ' ').slice(0, 19),
      state: cv.state ?? 'unknown',
      rating: cv?.conversation_rating?.rating != null ? String(cv.conversation_rating.rating) : '—',
      frt_raw: ar ? ar - created : null,
      frt_post_bot: postBot,
      anchor_label: anchorLabel,
    });
  }

  function fmt(s: number | null): string {
    if (s == null) return '—';
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  rows.sort((a, b) => a.created.localeCompare(b.created));

  console.log(`${'#'.padStart(3)}  ${'created'.padEnd(19)}  ${'state'.padEnd(8)}  ${'rating'.padEnd(6)}  ${'FRT (raw)'.padStart(10)}  ${'FRT (post-bot)'.padStart(15)}  anchor                conversation id`);
  console.log('-'.repeat(120));
  for (const r of rows) {
    console.log(
      `${String(r.idx).padStart(3)}  ${r.created}  ${r.state.padEnd(8)}  ${r.rating.padEnd(6)}  ${fmt(r.frt_raw).padStart(10)}  ${fmt(r.frt_post_bot).padStart(15)}  ${r.anchor_label.padEnd(20)}  ${r.id}`
    );
  }

  const rawValid = rows.map((r) => r.frt_raw).filter((n): n is number => Number.isFinite(n));
  const postValid = rows.map((r) => r.frt_post_bot).filter((n): n is number => Number.isFinite(n));
  const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  console.log('\nSummary across all chats with first_admin_reply_at:');
  console.log(`  count:            ${rawValid.length}`);
  console.log(`  avg raw:          ${fmt(avg(rawValid))} (${avg(rawValid)}s)`);
  console.log(`  avg post-bot:     ${fmt(avg(postValid))} (${avg(postValid)}s)`);
  console.log(`  median raw:       ${fmt(median(rawValid))}`);
  console.log(`  median post-bot:  ${fmt(median(postValid))}`);
  console.log(`  on target ≤2:00 (post-bot):  ${postValid.filter((s) => s <= 120).length} of ${postValid.length}`);
})().catch((err) => {
  console.error(err.response?.data ?? err);
  process.exit(1);
});
