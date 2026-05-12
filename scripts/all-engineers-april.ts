import 'dotenv/config';
import { fetchConversationsActive, getAdminMap, getTeamAdminIds } from '../server/services/intercom';

(async () => {
  const start = new Date('2026-04-01T00:00:00Z');
  const end = new Date('2026-05-01T00:00:00Z');
  const teamId = process.env.INTERCOM_TEAM_ID!;
  const [adminMap, teamAdmins, convos] = await Promise.all([
    getAdminMap(),
    getTeamAdminIds(teamId),
    fetchConversationsActive(start, end, teamId),
  ]);

  const perAdmin = new Map<string, { ratings: number[] }>();
  for (const id of teamAdmins) perAdmin.set(id, { ratings: [] });
  for (const c of convos) {
    if (c.csat_rating == null) continue;
    for (const adminId of c.repliers_in_window) {
      const slot = perAdmin.get(adminId);
      if (slot) slot.ratings.push(c.csat_rating);
    }
  }

  console.log(`April 2026  ·  team conversations active = ${convos.length}\n`);
  const rows: Array<{ name: string; rated: number; csatPct: number; dsatPct: number; dist: Record<number, number> }> = [];
  for (const [adminId, { ratings }] of perAdmin) {
    const name = adminMap.get(adminId) ?? `Agent ${adminId}`;
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of ratings) dist[r] = (dist[r] ?? 0) + 1;
    const sat = dist[4] + dist[5];
    const dsat = dist[1] + dist[2] + dist[3];
    const total = ratings.length;
    rows.push({
      name,
      rated: total,
      csatPct: total ? Math.round((sat / total) * 1000) / 10 : 0,
      dsatPct: total ? Math.round((dsat / total) * 1000) / 10 : 0,
      dist,
    });
  }

  rows.sort((a, b) => b.csatPct - a.csatPct || b.rated - a.rated);
  console.log('Engineer                         Rated  CSAT%   DSAT%   1  2  3  4  5');
  console.log('-------------------------------- -----  ------  ------  -  -  -  -  -');
  for (const r of rows) {
    const fmt = `${r.name.padEnd(32)} ${String(r.rated).padStart(5)}  ${String(r.csatPct).padStart(5)}%  ${String(r.dsatPct).padStart(5)}%  `
      + `${r.dist[1]}  ${r.dist[2]}  ${r.dist[3]}  ${r.dist[4]}  ${r.dist[5]}`;
    console.log(fmt);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
