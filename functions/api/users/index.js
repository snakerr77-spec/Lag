import {
  adminUser,
  audit,
  clean,
  createPasswordRecord,
  defaultPermissions,
  json,
  normalizeRole,
  requireAdmin
} from "../../_lib/auth.js";
import { getDb } from "../../_lib/runtime.js";

async function ensureUsersTable(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'colaborador',
    city TEXT NOT NULL DEFAULT 'Cerquilho',
    phone TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL DEFAULT '',
    password_salt TEXT NOT NULL DEFAULT '',
    permissions_json TEXT NOT NULL DEFAULT '[]',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  )`).run();

  const columns = await db.prepare("PRAGMA table_info(users)").all();
  const existing = new Set((columns.results || []).map(row => row.name));

  const required = {
    name: "TEXT NOT NULL DEFAULT ''",
    email: "TEXT NOT NULL DEFAULT ''",
    role: "TEXT NOT NULL DEFAULT 'colaborador'",
    city: "TEXT NOT NULL DEFAULT 'Cerquilho'",
    phone: "TEXT NOT NULL DEFAULT ''",
    password_hash: "TEXT NOT NULL DEFAULT ''",
    password_salt: "TEXT NOT NULL DEFAULT ''",
    permissions_json: "TEXT NOT NULL DEFAULT '[]'",
    active: "INTEGER NOT NULL DEFAULT 1",
    created_at: "TEXT NOT NULL DEFAULT ''",
    updated_at: "TEXT NOT NULL DEFAULT ''"
  };

  for (const [name, definition] of Object.entries(required)) {
    if (!existing.has(name)) {
      await db.prepare(`ALTER TABLE users ADD COLUMN ${name} ${definition}`).run();
    }
  }
}

function safeCreateError(error) {
  const message = String(error?.message || "");
  if (/UNIQUE constraint failed: users\.email/i.test(message)) {
    return json({ error: "Este e-mail já está cadastrado." }, 409);
  }
  console.error("user_create_error", error?.stack || error);
  return json({
    error: "Não foi possível criar o usuário agora.",
    code: "USER_CREATE_FAILED"
  }, 500);
}

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;

  try {
    const db = getDb(context.env);
    await ensureUsersTable(db);

    const result = await db.prepare(`SELECT
        id, name, email, role, city, phone, permissions_json, active, created_at, updated_at
      FROM users
      ORDER BY active DESC, name COLLATE NOCASE ASC`)
      .all();

    return json({ users: (result.results || []).map(adminUser) });
  } catch (error) {
    console.error("users_list_error", error?.stack || error);
    return json({ error: "Não foi possível carregar os usuários." }, 500);
  }
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;

  try {
    const input = await context.request.json().catch(() => null);
    if (!input || typeof input !== "object") {
      return json({ error: "Dados inválidos." }, 400);
    }

    const name = clean(input.name, 160);
    const email = clean(input.email, 180).toLowerCase();
    const role = normalizeRole(input.role);
    const city = clean(input.city || input.unit, 100) || auth.user.city || "Cerquilho";
    const phone = clean(input.phone, 40);
    const password = String(input.password || "");

    if (!name) return json({ error: "Informe o nome do usuário." }, 400);
    if (!email || !email.includes("@")) {
      return json({ error: "Informe um e-mail válido." }, 400);
    }
    if (password.length < 8) {
      return json({ error: "A senha deve ter pelo menos 8 caracteres." }, 400);
    }

    const db = getDb(context.env);
    await ensureUsersTable(db);

    const existing = await db.prepare(
      "SELECT id FROM users WHERE lower(email) = lower(?) LIMIT 1"
    ).bind(email).first();

    if (existing) {
      return json({ error: "Este e-mail já está cadastrado." }, 409);
    }

    const passwordRecord = await createPasswordRecord(password);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const permissions = Array.isArray(input.permissions) && input.permissions.length
      ? [...new Set(input.permissions.map(value => clean(value, 80)).filter(Boolean))]
      : defaultPermissions(role);

    await db.prepare(`INSERT INTO users (
        id, name, email, role, city, phone,
        password_hash, password_salt, permissions_json,
        active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`)
      .bind(
        id,
        name,
        email,
        role,
        city,
        phone,
        passwordRecord.hash,
        passwordRecord.salt,
        JSON.stringify(permissions),
        now,
        now
      )
      .run();

    const row = await db.prepare(`SELECT
        id, name, email, role, city, phone, permissions_json, active
      FROM users
      WHERE id = ?
      LIMIT 1`)
      .bind(id)
      .first();

    try {
      await audit(context.env, auth.user.id, "user_create", "user", id, {
        role,
        city
      });
    } catch {}

    return json({
      success: true,
      user: adminUser(row)
    }, 201);
  } catch (error) {
    return safeCreateError(error);
  }
}
