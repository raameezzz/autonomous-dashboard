import 'dotenv/config';
import { fetchConversationsActive, getAdminMap } from '../server/services/intercom';

const RAMEEZ_ID_NAME = 'rameez';

(async () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = now;
  const teamId = process.env.INTERCOM_TEAM_ID;
  const [adminMap, convos] = await Promise.all([
    getAdminMap(),
    fetchConversationsActive(start, end, teamId),
  ]);

  const rameezId = Array.from(adminMap.entries()).find(
    ([, name]) => name.toLowerCase().includes(RAMEEZ_ID_NAME),
  )?.[0];
  if (!rameezId) throw new Error('Rameez admin not found');

  const his = convos
    .filter((c) => c.repliers_in_window.includes(rameezId))
    .sort((a, b) => a.created_at - b.created_at);

  const frts: number[] = [];
  console.log(`Rameez (id=${rameezId}) — chats replied to ${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}`);
  console.log(`Total chats: ${his.length}\n`);
  console.log(`  ${'#'.padStart(3)} ${'created'.padEnd(19)} ${'state'.padEnd(8)} ${'rating'.padEnd(7)} ${'FRT'.padStart(10)}  id`);
  console.log('  ' + '-'.repeat(70));
  his.forEach((c, i) => {
    const created = new Date(c.created_at * 1000).toISOString().replace('T', ' ').slice(0, 19);
    const frt = c.first_response_time;
    const frtStr = frt == null ? '—' : `${Math.floor(frt / 60)}:${String(frt % 60).padStart(2, '0')}`;
    const rating = c.csat_rating == null ? '—' : String(c.csat_rating);
    if (frt != null) frts.push(frt);
    console.log(`  ${String(i + 1).padStart(3)} ${created.padEnd(19)} ${c.state.padEnd(8)} ${rating.padEnd(7)} ${frtStr.padStart(10)}  ${c.id}`);
  });

  if (frts.length) {
    const sorted = [...frts].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const avg = Math.round(frts.reduce((a, b) => a + b, 0) / frts.length);
    const onTarget = frts.filter((f) => f <= 120).length;
    console.log(`\n  Avg:     ${Math.floor(avg / 60)}:${String(avg % 60).padStart(2, '0')} (${avg}s)`);
    console.log(`  Median:  ${Math.floor(median / 60)}:${String(median % 60).padStart(2, '0')} (${median}s)`);
    console.log(`  ≤ 2:00:  ${onTarget} of ${frts.length} chats (${Math.round(onTarget / frts.length * 100)}%)`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
