import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Next.js runs from concord-demo/concord-work-dashboard/, so the
// Concord workspace is one level up. Override with CONCORD_DB_PATH.
const DB_PATH =
  process.env.CONCORD_DB_PATH ||
  path.join(process.cwd(), "..", ".concord", "concord.db");

// Fallback demo database, created on demand when the real Concord workspace
// is not present (e.g. a fresh Vercel deployment). Lets the dashboard ship
// with sample overlap data instead of failing at runtime.
const SEED_PATH = path.join(process.cwd(), ".seed", "concord.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS agents (
  agent_id   TEXT PRIMARY KEY,
  kind       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'active',
  summary    TEXT,
  first_seen TEXT,
  last_seen  TEXT
);
CREATE TABLE IF NOT EXISTS tasks (
  task_id         TEXT PRIMARY KEY,
  title           TEXT,
  agent_id        TEXT,
  expected_files  TEXT NOT NULL DEFAULT '[]',
  version         INTEGER NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TEXT,
  updated_at      TEXT
);
CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY,
  task_id    TEXT,
  tool       TEXT NOT NULL,
  status     TEXT NOT NULL,
  detail     TEXT,
  created_at TEXT NOT NULL
);
`;

const SEED_DATA = `
INSERT INTO agents (agent_id, kind, status, summary, first_seen, last_seen) VALUES
  ('kilo-1', 'kilo-code', 'active', 'Claiming the user API file for testing overlap detection', '2026-11-05T10:15:55.256Z', '2026-11-05T10:40:03.270Z'),
  ('cursor-1', 'cursor', 'active', 'Claiming the same user API file to trigger overlap detection', '2026-11-05T10:41:45.419Z', '2026-11-05T10:41:45.442Z'),
  ('copilot-cli:37562456', 'copilot-cli', 'active', NULL, '2026-11-05T09:30:22.235Z', '2026-11-05T09:30:22.235Z');
INSERT INTO tasks (task_id, title, agent_id, expected_files, version, status, created_at, updated_at) VALUES
  ('TASK-1', 'Test user API task', 'kilo-1', '["src/api/users.ts"]', 2, 'active', '2026-11-05T10:16:47.330Z', '2026-11-05T10:40:03.269Z'),
  ('TASK-2', 'Second agent claims same file', 'cursor-1', '["src/api/users.ts"]', 1, 'active', '2026-11-05T10:41:45.442Z', '2026-11-05T10:41:45.442Z');
INSERT INTO events (id, task_id, tool, status, detail, created_at) VALUES
  (1, 'TASK-1', 'claim_work', 'success', NULL, '2026-11-05T10:16:47.335Z'),
  (2, 'TASK-1', 'claim_work', 'success', NULL, '2026-11-05T10:40:03.270Z'),
  (3, 'TASK-2', 'claim_work', 'success', '1 overlap(s)', '2026-11-05T10:41:45.442Z');
`;

function ensureSeed() {
  fs.mkdirSync(path.dirname(SEED_PATH), { recursive: true });
  const db = new Database(SEED_PATH);
  db.exec(SCHEMA);
  db.exec(SEED_DATA);
  db.close();
}

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    // turbopackIgnore: the filesystem check is intentional — we fall back
    // to a seed DB when the real Concord workspace is absent (e.g. Vercel).
    const primaryExists = fs.existsSync(/*turbopackIgnore: true*/ DB_PATH);
    if (!primaryExists && !fs.existsSync(/*turbopackIgnore: true*/ SEED_PATH)) {
      ensureSeed();
    }
    const target = primaryExists ? DB_PATH : SEED_PATH;
    db = new Database(target, { readonly: true, fileMustExist: true });
  }
  return db;
}

export function dbPath() {
  // turbopackIgnore: same rationale as getDb — this resolves the active DB path.
  const primaryExists = fs.existsSync(/*turbopackIgnore: true*/ DB_PATH);
  return primaryExists ? DB_PATH : SEED_PATH;
}