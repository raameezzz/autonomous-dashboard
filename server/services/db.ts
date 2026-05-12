import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'cache.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS conversation_cache (
    id TEXT PRIMARY KEY,
    closed_at INTEGER,
    assignee_id TEXT,
    rating INTEGER,
    remark TEXT,
    summary TEXT,
    fetched_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_conv_closed_at ON conversation_cache(closed_at);
  CREATE INDEX IF NOT EXISTS idx_conv_assignee ON conversation_cache(assignee_id);

  CREATE TABLE IF NOT EXISTS conversation_parts_cache (
    id TEXT PRIMARY KEY,
    updated_at INTEGER NOT NULL,
    admin_replies TEXT NOT NULL,
    fetched_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_cache (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    fetched_at INTEGER NOT NULL
  );
`);

export interface CachedConversation {
  id: string;
  closed_at: number | null;
  assignee_id: string | null;
  rating: number | null;
  remark: string | null;
  summary: string | null;
  fetched_at: number;
}

const upsertConvoStmt = db.prepare(`
  INSERT INTO conversation_cache (id, closed_at, assignee_id, rating, remark, summary, fetched_at)
  VALUES (@id, @closed_at, @assignee_id, @rating, @remark, @summary, @fetched_at)
  ON CONFLICT(id) DO UPDATE SET
    closed_at = excluded.closed_at,
    assignee_id = excluded.assignee_id,
    rating = excluded.rating,
    remark = excluded.remark,
    summary = excluded.summary,
    fetched_at = excluded.fetched_at
`);

const getConvoStmt = db.prepare(`SELECT * FROM conversation_cache WHERE id = ?`);
const getConvosStmt = db.prepare(`
  SELECT * FROM conversation_cache WHERE id IN (SELECT value FROM json_each(?))
`);

export const conversationCache = {
  upsert(row: CachedConversation) {
    upsertConvoStmt.run(row);
  },
  get(id: string): CachedConversation | undefined {
    return getConvoStmt.get(id) as CachedConversation | undefined;
  },
  getMany(ids: string[]): CachedConversation[] {
    if (!ids.length) return [];
    return getConvosStmt.all(JSON.stringify(ids)) as CachedConversation[];
  },
};

const upsertAdminStmt = db.prepare(`
  INSERT INTO admin_cache (id, name, email, fetched_at)
  VALUES (@id, @name, @email, @fetched_at)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    email = excluded.email,
    fetched_at = excluded.fetched_at
`);
const getAllAdminsStmt = db.prepare(`SELECT * FROM admin_cache`);

export interface CachedAdmin {
  id: string;
  name: string;
  email: string | null;
  fetched_at: number;
}

const upsertPartsStmt = db.prepare(`
  INSERT INTO conversation_parts_cache (id, updated_at, admin_replies, fetched_at)
  VALUES (@id, @updated_at, @admin_replies, @fetched_at)
  ON CONFLICT(id) DO UPDATE SET
    updated_at = excluded.updated_at,
    admin_replies = excluded.admin_replies,
    fetched_at = excluded.fetched_at
`);
const getPartsStmt = db.prepare(`SELECT * FROM conversation_parts_cache WHERE id = ?`);

export interface CachedConversationParts {
  id: string;
  updated_at: number;
  admin_replies: string;
  fetched_at: number;
}

export const conversationPartsCache = {
  upsert(row: CachedConversationParts) {
    upsertPartsStmt.run(row);
  },
  get(id: string): CachedConversationParts | undefined {
    return getPartsStmt.get(id) as CachedConversationParts | undefined;
  },
};

export const adminCache = {
  upsert(row: CachedAdmin) {
    upsertAdminStmt.run(row);
  },
  upsertMany(rows: CachedAdmin[]) {
    const tx = db.transaction((items: CachedAdmin[]) => {
      for (const item of items) upsertAdminStmt.run(item);
    });
    tx(rows);
  },
  all(): CachedAdmin[] {
    return getAllAdminsStmt.all() as CachedAdmin[];
  },
};

export default db;
