import 'dotenv/config';
import { fetchConversationsActive } from '../server/services/intercom';

const ZOHAIB_ID = '5001976';

(async () => {
  const start = new Date('2026-04-01T00:00:00Z');
  const end = new Date('2026-05-01T00:00:00Z');
  const teamId = process.env.INTERCOM_TEAM_ID;
  const convos = await fetchConversationsActive(start, end, teamId);

  const his = convos.filter((c) => c.repliers_in_window.includes(ZOHAIB_ID));
  const rated = his.filter((c) => c.csat_rating != null);

  console.log(`Zohaib April chats:  total replied = ${his.length}, rated = ${rated.length}`);
  console.log();

  rated
    .slice()
    .sort((a, b) => (a.csat_rating ?? 0) - (b.csat_rating ?? 0))
    .forEach((c) => {
      const created = new Date(c.created_at * 1000).toISOString().slice(0, 10);
      const closed = c.closed_at ? new Date(c.closed_at * 1000).toISOString().slice(0, 10) : '—';
      const remark = c.csat_remark ? `  remark: ${c.csat_remark.slice(0, 80)}` : '';
      console.log(`  rating=${c.csat_rating}  id=${c.id}  state=${c.state}  created=${created}  closed=${closed}${remark}`);
    });

  const low = rated.filter((c) => (c.csat_rating ?? 5) <= 3);
  console.log();
  console.log(`Ratings <= 3: ${low.length}`);
  for (const c of low) {
    console.log(`  id=${c.id}  rating=${c.csat_rating}  remark=${c.csat_remark ?? '(none)'}`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
