import 'dotenv/config';
import axios from 'axios';

const TOKEN = process.env.INTERCOM_ACCESS_TOKEN!;
const c = axios.create({
  baseURL: 'https://api.intercom.io',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Intercom-Version': '2.11', Accept: 'application/json' },
  timeout: 90_000,
});

const CHAT_IDS = [
  '215474139196414', // Rameez chat 1, our FRT 3:51
  '215474210526211', // Rameez chat with FRT 1:13
  '215474196019463', // FRT 2:02
];

(async () => {
  for (const id of CHAT_IDS) {
    const { data } = await c.get(`/conversations/${id}`);
    const stats = data.statistics ?? {};
    const parts: any[] = data.conversation_parts?.conversation_parts ?? [];
    console.log(`\n=== Conversation ${id} ===`);
    console.log(`created:           ${new Date(data.created_at * 1000).toISOString()}`);
    console.log(`first_assignment:  ${stats.first_assignment_at ? new Date(stats.first_assignment_at * 1000).toISOString() : '—'}`);
    console.log(`last_assignment:   ${stats.last_assignment_at ? new Date(stats.last_assignment_at * 1000).toISOString() : '—'}`);
    console.log(`first_admin_reply: ${stats.first_admin_reply_at ? new Date(stats.first_admin_reply_at * 1000).toISOString() : '—'}`);
    console.log(`current admin:     ${data.admin_assignee_id}`);
    console.log(`current team:      ${data.team_assignee_id}`);
    console.log(`\nAssignment + comment events:`);
    for (const p of parts) {
      if (
        p.part_type === 'assignment'
        || p.part_type === 'default_assignment'
        || (p.part_type === 'comment' && p.author?.type === 'admin')
      ) {
        const t = new Date(p.created_at * 1000).toISOString().replace('T', ' ').slice(0, 19);
        const author = p.author ? `${p.author.type}/${p.author.id ?? '?'}` : '?';
        const body = (p.body ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').slice(0, 70);
        const assignedTo = p.assigned_to ? JSON.stringify(p.assigned_to) : '';
        console.log(`  [${t}] ${p.part_type.padEnd(20)} author=${author.padEnd(15)} ${assignedTo} ${body ? '"' + body + '"' : ''}`);
      }
    }
  }
})().catch((err) => {
  console.error(err.response?.data ?? err);
  process.exit(1);
});
