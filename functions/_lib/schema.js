import { getDb } from "./runtime.js";

let schemaReady = false;
let schemaPromise = null;

const CORE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    role TEXT NOT NULL DEFAULT 'colaborador',
    city TEXT NOT NULL DEFAULT 'Cerquilho',
    phone TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    permissions_json TEXT NOT NULL DEFAULT '[]',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
  `CREATE INDEX IF NOT EXISTS idx_users_city ON users(city)`,
  `CREATE INDEX IF NOT EXISTS idx_users_active ON users(active)`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    user_agent TEXT NOT NULL DEFAULT '',
    ip_address TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`,
  `CREATE TABLE IF NOT EXISTS app_state (
    id TEXT PRIMARY KEY,
    scope_type TEXT NOT NULL CHECK (scope_type IN ('global','city','user')),
    scope_id TEXT NOT NULL,
    state_key TEXT NOT NULL,
    value_text TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    UNIQUE(scope_type, scope_id, state_key),
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_app_state_scope ON app_state(scope_type, scope_id)`,
  `CREATE INDEX IF NOT EXISTS idx_app_state_key ON app_state(state_key)`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC)`
];

async function applyCoreSchema(env) {
  const db = getDb(env);

  const probe = await db.prepare(`SELECT COUNT(*) AS total
    FROM sqlite_master
    WHERE type = 'table'
      AND name IN ('users','sessions','app_state','audit_logs')`).first();

  if (Number(probe?.total || 0) === 4) {
    schemaReady = true;
    return;
  }

  for (const sql of CORE_STATEMENTS) {
    await db.prepare(sql).run();
  }
  schemaReady = true;
}

export async function ensureCoreSchema(env) {
  if (schemaReady) return;
  if (!schemaPromise) {
    schemaPromise = applyCoreSchema(env).catch(error => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}
