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
import { ensureCoreSchema } from "../../_lib/schema.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;

  try {
    await ensureCoreSchema(context.env);
    const db = getDb(context.env);

    const result = await db.prepare(`SELECT id, name, email, role, city, phone, permissions_json, active, created_at, updated_at
      FROM users
      ORDER BY active DESC, name COLLATE NOCASE ASC`).all();

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
    if (!input) return json({ error: "Dados inválidos." }, 400);

    const name = clean(input.name, 160);
    const email = clean(input.email, 180).toLowerCase();
    const role = normalizeRole(input.role);
    const city = clean(input.city || input.unit, 100) || auth.user.city || "Cerquilho";
    const phone = clean(input.phone, 40);
    const password = String(input.password || "");

    if (!name) return json({ error: "Informe o nome do usuário." }, 400);
    if (!email || !email.includes("@")) return json({ error: "Informe um e-mail válido." }, 400);
    if (password.length < 8) return json({ error: "A senha deve ter pelo menos 8 caracteres." }, 400);

    await ensureCoreSchema(context.env);
    const db = getDb(context.env);

    const existing = await db.prepare(
      "SELECT id FROM users WHERE lower(email) = lower(?) LIMIT 1"
    ).bind(email).first();

    if (existing) return json({ error: "Este e-mail já está cadastrado." }, 409);

    const passwordRecord = await createPasswordRecord(password);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const permissions = Array.isArray(input.permissions) && input.permissions.length
      ? input.permissions
      : defaultPermissions(role);

    await db.prepare(`INSERT INTO users
      (id, name, email, role, city, phone, password_hash, password_salt, permissions_json, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`)
      .bind(
        id, name, email, role, city, phone,
        passwordRecord.hash, passwordRecord.salt,
        JSON.stringify(permissions), now, now
      ).run();

    await audit(context.env, auth.user.id, "user_create", "user", id, { role, city });

    const row = await db.prepare(`SELECT id, name, email, role, city, phone, permissions_json, active
      FROM users WHERE id = ? LIMIT 1`).bind(id).first();

    return json({ success: true, user: adminUser(row) }, 201);
  } catch (error) {
    console.error("user_create_error", error?.stack || error);
    return json({ error: "Não foi possível criar o usuário agora." }, 500);
  }
}
