import { fetchConversations, getCachedClosedConversations } from './intercom';

export interface TopicCategory {
  name: string;
  description: string;
  count: number;
  percent: number;
  example_ids: string[];
}

export interface TopicsResponse {
  start: string;
  end: string;
  total_closed: number;
  total_categorized: number;
  categories: TopicCategory[];
  generated_at: number;
}

function extractQuestion(summary: string | null): string {
  if (!summary) return '';
  const m = summary.match(/\*\*Question\*\*\s*([\s\S]*?)(?:\n\s*\*\*Summary\*\*|\n\s*\*\*|$)/i);
  const q = m ? m[1].trim() : summary.slice(0, 600);
  return q.replace(/\s+/g, ' ').trim();
}

interface Rule {
  name: string;
  description: string;
  re: RegExp;
}

// Priority-ordered classification rules. First match wins, so order matters:
// - Migration first → post-migration symptoms still attribute to Migration.
// - SSL/DNS before Cache/Performance so cipher-mismatch and propagation issues don't get pulled into caching/perf.
// - Security & whitelist before WordPress/Caching so IP/Cloudflare WAF tickets don't get pulled into those.
// - Performance before Downtime so "slow" doesn't grab pure downtime tickets.
// Patterns include multilingual cues observed in cached summaries (es/it/pt/zh/th/fr).
const RULES: Rule[] = [
  {
    name: 'Migration',
    description: 'Flexible→Autonomous moves, migrations into Cloudways, cloning, post-migration breakage',
    re: /\bmigrat|migration|move(d)? from|switch(ed)? from|cutover|transfer(red)? (the )?(site|domain|app)|came from cloudflare|cloudflare pro|move(d)? to autonomous|flexible to autonomous|from flexible|new server move|cloning|搬遷|migrar|migración|migrazione|migração/i,
  },
  {
    name: 'Plan & scaling',
    description: 'Plan upgrades/downgrades, Enterprise, autoscaling, pod sizing, account changes, free-trial gating',
    re: /\b(upgrade|downgrade)\b.*\b(plan|tier|enterprise|pods?|autoscal)|\b(autoscal|scaling)\b|\benterprise plan\b|\bgrowth plan\b|\bscale plan\b|\bautonomous plan\b.*\b(upgrade|move|switch)|\bpods?\b|\bremove (the )?flexible (server|app)\b|\bretain only the autonomous\b|\bplan limit\b|\bquota\b|\binsufficient resources?\b|\bfree trial\b|\bautonomous packages?\b|\badd (an? )?autonomous (site|account)|\bmanaging multiple .* applications?\b|\brestauración\b/i,
  },
  {
    name: 'Billing & usage',
    description: 'Overage, unexpected charges, visit-count discrepancies, bandwidth visibility, usage stats',
    re: /\b(billing|invoice|charge|charges|overage|refund|payment|credit card|prorat|subscription)\b|\bcost(s)? (estimation|comparison)|\bGA4\b|\busage (stat|data)|\bbandwidth\b.*\b(consum|usage|charge|overage)|\bvisit count|\bbilled visit|\bincrease.* bandwidth|\bunexpected (cost|charge|billing)|\bincreased costs?|\bbilled \$/i,
  },
  {
    name: 'Access & credentials',
    description: 'SFTP, staging logins, .htpasswd, password resets, SSH keys, admin user management',
    re: /\bSFTP\b|\bFTP\b|\bfile permission|\bstaging (site|backend|login|access|environment)|\.htpasswd|\bcan(?:'|no)t (log ?in|access)\b.*\bstaging|\bverification required\b|\bunable to (log ?in|access) (the )?(staging|wp-admin)|\bSSH key|\bSSH access|\breset.* password|\bcredentials|\badd .*admin user|\badmin user/i,
  },
  {
    name: 'SSL',
    description: 'Cipher mismatch, SNI, certificate issues (when not DNS-driven)',
    re: /\bSSL\b|\bcertificate\b|\bERR_SSL|\bcipher mismatch|\bhttps issue|\blets ?encrypt\b|\bSNI\b/i,
  },
  {
    name: 'DNS',
    description: 'A records, propagation, domain not resolving, finding server IP, subdomain/redirect setup',
    re: /\bDNS\b|\bA record\b|\bCNAME\b|\bnameserver\b|\bpropagat|\bnot resolving\b|\bpoint(ing)? to (the )?(cloudways|autonomous|server) IP|\bMX record\b|\bdomain (verification|not going live|change)|\bdomain.* not resolving|\bobtain.* (server )?IP|\bstatic IP|\bsubdomain\b/i,
  },
  {
    name: 'Email & SMTP',
    description: 'Elastic Mail/Email deliverability, suppression lists, SMTP configuration',
    re: /\bSMTP\b|\bemail (deliver|configur|delivery|spf|dkim|dmarc)|\bmailgun\b|\brackspace email|\belastic (mail|email)|\bemail .*(bounc|not (sending|delivering)|suppress|suspend)|\bmail deliverability|\bemail suppress/i,
  },
  {
    name: 'Database',
    description: 'MySQL/MariaDB, missing tables, collation, slow queries, DB password changes',
    re: /\b(mysql|mariadb)\b|\bdatabase (collation|connection|table|missing|error|optimi[sz]ation|server|password)|\bdb (connection|table|error|max|password)|\bmissing (database )?table|\bwp_redirection_logs|\bslow .*queries|\bupdate the database password/i,
  },
  {
    name: 'Security & whitelist',
    description: 'Cloudflare WAF rules, IP whitelisting, Imunify360, Malware Protection, bot/geo-block, compromises',
    re: /\b(whitelist|allowlist|block(ing)? (ip|china|country|traffic|bots?)|firewall (rule|whitelist)|imunify360|malware protection|malware infection|bot (protection|attack|blocking)|brute[- ]force|geo[- ]?block|rate[- ]?limit|fail2ban|wp-?admin .*(restrict|whitelist|secure)|IP (rule|restriction|whitelist)|cloudflare (firewall|custom rules?|rule|WAF|admin (access )?rules?|under attack mode)|access denied by|compromise|site compromise|hack(ed)?|unauthorized .*modifications?|malicious traffic|vulnerability scan|update.* webcore.* malware|turnstile|bandwidth spike.*bot|allow IPs?)\b/i,
  },
  {
    name: 'Caching & Redis',
    description: 'Redis/Relay, Object Cache Pro, Breeze, Varnish, WP Rocket, Cloudflare cache, cache conflicts',
    re: /\b(redis|relay|object ?cache ?pro|objectcache\b|breeze|varnish|wp[- ]?rocket|cloudflare cache|cache (conflict|purge|clear|extension|delay|issue)|purge .*cache|cache .*purge|caching (delay|issue|conflict|configuration|problems?)|filestore cach|cdn cach|disable caching|server-?level cache|clearing.* cache|cache .*not clearing)/i,
  },
  {
    name: 'Performance & slowness',
    description: 'Slow admin, memory spikes, load-test failures, sluggish front/back-end',
    re: /\b(slow|slowness|sluggish|high load|cpu (spike|load|usage)|memory (limit|exhaustion|spike|usage)|response time|latency|load test(s)?|loader\.io|performance (issue|problem)|takes (too )?long|loading time|loading slowly|response.*slow|slow .*(loading|response|admin|save)|lent(o|a|itud|ezza)|carga lent|tempo? di caricamento|admin-ajax\.php.*delay|excess.*delay)/i,
  },
  {
    name: 'Site downtime / errors',
    description: 'Site unreachable, 5xx, frozen NGINX, "can\'t be reached," intermittent timeouts',
    re: /\b(down|downtime|unreachable|offline|inaccessible|outage|crash(ed)?|froze(n)?|nginx error|err_connection|site can(?:'|no)t be reached|not loading|stopped working|not working|displayed an error|524\b|504\b|502\b|503\b|500\b|intermittent timeout|website was down|site was down|no cargaba|no carga|sito.* down|sito.* lent|無法連接|無法登入|เว็บค้าง|เซิร์ฟเวอร์ล่ม|quedas|tela preta|inaccesible)/i,
  },
  {
    name: 'WordPress / WooCommerce',
    description: 'Plugin/theme issues, 404s, wp-admin crashes, wp-cron, fatal errors, OG/SEO, multisite',
    re: /\b(wp-?admin|wordpress|woocommerce|woo |plugin (error|conflict|update|missing|not working|deactivat|deletion|delete)|theme (error|conflict|update)|wp-?cron|cron (job|hook|schedule)|404\b|403\b|fatal error|php (error|fatal|warning|notice)|all-in-one wp migration|elementor|og (thumbnail|graph)|seo|gutenberg|update wordpress|disable plugin|wordfence|memberpress|buddyboss|learndash|simple banner|tickera|child pages?|custom post type|staging.*publish|publishing changes from staging|blank cart|critical errors? on post|newsletter campaign.*error)/i,
  },
  {
    name: 'Server admin & ops',
    description: 'Disk/logs, debug-log accumulation, redirect rules, .htaccess, backup/restore, PHP config, Apache/Nginx',
    re: /\b(disk (space|usage|full)|debug log|logs? folder|logs? accumulat|wc-?logs|redirect (rule|from|to)|server-?level rule|http 410|\.htaccess|nginx (config|rule)|apache (config|rule)|increase .*(memory|limit)|server readiness|server upgrade|server config|server-side cron|action scheduler|backup (folder|creation|restore|frequency)|restore from.* backup|access .*application logs|application logs|export.* (logs?|data)|openresty|web server|PHP-?FPM|content-?length|PHP (post|version)|composer|meilisearch|forwarding|better stack)/i,
  },
];

const OTHER: TopicCategory = {
  name: 'Other / uncategorized',
  description: 'Tickets that didn\'t cleanly match a primary topic (SLA inquiries, cross-host A/B, data exports, niche)',
  count: 0,
  percent: 0,
  example_ids: [],
};

export function categorizeQuestion(q: string): string {
  for (const r of RULES) if (r.re.test(q)) return r.name;
  return OTHER.name;
}

// In-memory memoization. Keyed by start+end+teamId. TTL keeps the topics widget snappy
// across repeated re-opens of the same date range without blocking on Intercom refetch.
const memo = new Map<string, { ts: number; value: TopicsResponse }>();
const TTL_MS = 10 * 60 * 1000;

export async function getTopicsForRange(
  startDate: Date,
  endDate: Date,
  teamId: string,
): Promise<TopicsResponse> {
  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);
  const key = `${teamId}|${startStr}|${endStr}`;
  const cached = memo.get(key);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.value;

  const all = await fetchConversations(startDate, endDate, teamId);
  const closed = all.filter((c) => c.state === 'closed');
  const detailed = await getCachedClosedConversations(closed.map((c) => c.id));
  const byId = new Map(detailed.map((d) => [d.id, d]));

  const buckets = new Map<string, { description: string; ids: string[] }>();
  let categorized = 0;

  for (const c of closed) {
    const d = byId.get(c.id);
    const q = extractQuestion(d?.summary ?? null);
    if (!q) continue;
    categorized++;
    const cat = categorizeQuestion(q);
    const desc = RULES.find((r) => r.name === cat)?.description ?? OTHER.description;
    if (!buckets.has(cat)) buckets.set(cat, { description: desc, ids: [] });
    buckets.get(cat)!.ids.push(c.id);
  }

  const categories: TopicCategory[] = [...buckets.entries()]
    .map(([name, { description, ids }]) => ({
      name,
      description,
      count: ids.length,
      percent: categorized ? Number(((ids.length / categorized) * 100).toFixed(1)) : 0,
      example_ids: ids.slice(0, 5),
    }))
    .sort((a, b) => b.count - a.count);

  const value: TopicsResponse = {
    start: startStr,
    end: endStr,
    total_closed: closed.length,
    total_categorized: categorized,
    categories,
    generated_at: Date.now(),
  };
  memo.set(key, { ts: Date.now(), value });
  return value;
}
