import 'dotenv/config';
import axios from 'axios';

const TOKEN = process.env.INTERCOM_ACCESS_TOKEN!;
const c = axios.create({
  baseURL: 'https://api.intercom.io',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Intercom-Version': '2.11', Accept: 'application/json' },
  timeout: 90_000,
});

const CHAT_ID = '215474139196414'; // Rameez's first chat from earlier list (created May 1, FRT 3:51 in our metric)

(async () => {
  const { data } = await c.get(`/conversations/${CHAT_ID}`);
  console.log('id:', data.id);
  console.log('created_at:', new Date(data.created_at * 1000).toISOString(), `(${data.created_at})`);
  console.log('updated_at:', new Date(data.updated_at * 1000).toISOString());
  console.log('admin_assignee_id:', data.admin_assignee_id);
  console.log('team_assignee_id:', data.team_assignee_id);
  console.log('state:', data.state);
  console.log('\n--- statistics ---');
  for (const [k, v] of Object.entries(data.statistics ?? {})) {
    if (k.endsWith('_at') && typeof v === 'number') {
      console.log(`  ${k}: ${new Date((v as number) * 1000).toISOString()}  (${v})`);
    } else {
      console.log(`  ${k}: ${v}`);
    }
  }

  console.log('\n--- ai_agent ---');
  console.log(JSON.stringify(data.ai_agent ?? {}, null, 2));

  console.log('\n--- parts (first 25) ---');
  const parts = data.conversation_parts?.conversation_parts ?? [];
  console.log(`Total parts: ${parts.length}`);
  for (const p of parts.slice(0, 25)) {
    const ts = new Date(p.created_at * 1000).toISOString().replace('T', ' ').slice(0, 19);
    const author = p.author ? `${p.author.type}:${p.author.name ?? p.author.id ?? '?'}` : '?';
    const body = p.body ? p.body.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').slice(0, 60) : '';
    console.log(`  [${ts}] ${p.part_type.padEnd(28)} ${author.padEnd(30)} ${body}`);
  }
})().catch((err) => {
  console.error(err.response?.data ?? err);
  process.exit(1);
});
