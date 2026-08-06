import { audit, clean, createPasswordRecord, defaultPermissions, json, normalizeRole, publicUser, requireAdmin } from "../../_lib/auth.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  const result = await context.env.DB.prepare(`SELECT id, name, email, role, city, phone, permissions_json, active, created_at, updated_at
    FROM users ORDER BY active DESC, name COLLATE NOCASE ASC`).all();
  return json({ users: (result.results || []).map(publicUser) });
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  let input;
  try { input = await context.request.json(); }
  catch { return json({ error: "Dados inválidos." }, 400); }

  const name = clean(input.name, 160);
  const email = clean(input.email, 180).toLowerCase();
  const role = normalizeRole(input.role);
  const city = clean(input.city || input.unit, 100) || auth.user.city;
  const phone = clean(input.phone, 40);
  const password = String(input.password || "");
  if (!name || !email || !password || password.length < 8) return json({ error: "Preencha nome, e-mail e uma senha com pelo menos 8 caracteres." }, 400);

  const existing = await context.env.DB.prepare("SELECT id FROM users WHERE lower(email) = lower(?) LIMIT 1").bind(email).first();
  if (existing) return json({ error: "Este e-mail já está cadastrado." }, 409);
  const passwordRecord = await createPasswordRecord(password);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const permissions = Array.isArray(input.permissions) ? input.permissions : defaultPermissions(role);
  await context.env.DB.prepare(`INSERT INTO users
    (id, name, email, role, city, phone, password_hash, password_salt, permissions_json, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`)
    .bind(id, name, email, role, city, phone, passwordRecord.hash, passwordRecord.salt, JSON.stringify(permissions), now, now).run();
  await audit(context.env, auth.user.id, "user_create", "user", id, { email, role, city });
  const row = await context.env.DB.prepare(`SELECT id, name, email, role, city, phone, permissions_json, active FROM users WHERE id = ?`).bind(id).first();
  return json({ success: true, user: publicUser(row) }, 201);
}
