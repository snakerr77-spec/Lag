import { getDb } from "./runtime.js";

let schemaPromise = null;

const TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    role TEXT NOT NULL DEFAULT 'colaborador',
    city TEXT NOT NULL DEFAULT 'Cerquilho',
    phone TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL DEFAULT '',
    password_salt TEXT NOT NULL DEFAULT '',
    permissions_json TEXT NOT NULL DEFAULT '[]',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    user_agent TEXT NOT NULL DEFAULT '',
    ip_address TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS app_state (
    id TEXT PRIMARY KEY,
    scope_type TEXT NOT NULL DEFAULT 'global',
    scope_id TEXT NOT NULL DEFAULT '',
    state_key TEXT NOT NULL,
    value_text TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT '',
    updated_by TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  )`
];

const REQUIRED_COLUMNS = {
  users: {
    name: `TEXT NOT NULL DEFAULT ''`, email: `TEXT NOT NULL DEFAULT ''`, role: `TEXT NOT NULL DEFAULT 'colaborador'`,
    city: `TEXT NOT NULL DEFAULT 'Cerquilho'`, phone: `TEXT NOT NULL DEFAULT ''`, password_hash: `TEXT NOT NULL DEFAULT ''`,
    password_salt: `TEXT NOT NULL DEFAULT ''`, permissions_json: `TEXT NOT NULL DEFAULT '[]'`, active: `INTEGER NOT NULL DEFAULT 1`,
    created_at: `TEXT NOT NULL DEFAULT ''`, updated_at: `TEXT NOT NULL DEFAULT ''`
  },
  sessions: {
    user_id: `TEXT NOT NULL DEFAULT ''`, token_hash: `TEXT NOT NULL DEFAULT ''`, expires_at: `TEXT NOT NULL DEFAULT ''`,
    created_at: `TEXT NOT NULL DEFAULT ''`, user_agent: `TEXT NOT NULL DEFAULT ''`, ip_address: `TEXT NOT NULL DEFAULT ''`
  },
  app_state: {
    scope_type: `TEXT NOT NULL DEFAULT 'global'`, scope_id: `TEXT NOT NULL DEFAULT ''`, state_key: `TEXT NOT NULL DEFAULT ''`,
    value_text: `TEXT NOT NULL DEFAULT ''`, updated_at: `TEXT NOT NULL DEFAULT ''`, updated_by: `TEXT`
  },
  audit_logs: {
    user_id: `TEXT`, action: `TEXT NOT NULL DEFAULT ''`, target_type: `TEXT NOT NULL DEFAULT ''`,
    target_id: `TEXT NOT NULL DEFAULT ''`, details_json: `TEXT NOT NULL DEFAULT '{}'`, created_at: `TEXT NOT NULL DEFAULT ''`
  }
};

async function columnsFor(db, table) {
  const result = await db.prepare(`PRAGMA table_info(${table})`).all();
  return new Set((result.results || []).map(row => row.name));
}

async function ensureColumns(db, table, definitions) {
  const existing = await columnsFor(db, table);
  for (const [name, definition] of Object.entries(definitions)) {
    if (!existing.has(name)) await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`).run();
  }
}

async function applySchema(env) {
  const db = getDb(env);
  for (const sql of TABLE_STATEMENTS) await db.prepare(sql).run();
  for (const [table, definitions] of Object.entries(REQUIRED_COLUMNS)) await ensureColumns(db, table, definitions);
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
    `CREATE INDEX IF NOT EXISTS idx_users_city ON users(city)`,
    `CREATE INDEX IF NOT EXISTS idx_users_active ON users(active)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`,
    `CREATE INDEX IF NOT EXISTS idx_app_state_scope ON app_state(scope_type, scope_id)`,
    `CREATE INDEX IF NOT EXISTS idx_app_state_key ON app_state(state_key)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC)`
  ];
  for (const sql of indexes) {
    try { await db.prepare(sql).run(); } catch (error) { console.warn("schema_index_warning", error?.message || error); }
  }
}

export async function ensureCoreSchema(env) {
  if (!schemaPromise) {
    schemaPromise = applySchema(env).catch(error => { schemaPromise = null; throw error; });
  }
  await schemaPromise;
}
