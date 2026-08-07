import { audit, clean, createPasswordRecord, json, normalizeRole, publicUser, requireSession } from "../../_lib/auth.js";
import { getDb } from "../../_lib/runtime.js";
import { ensureCoreSchema } from "../../_lib/schema.js";

function isAdmin(user) {
  return new Set(["admin", "administrador"]).has(normalizeRole(user.role));
}

export async function onRequestPatch(context) {
  const auth = await requireSession(context);
  if (auth.response) return auth.response;

  await ensureCoreSchema(context.env);
  const db = getDb(context.env);

  const targetId = clean(context.params.id, 80);
  const self = targetId === auth.user.id;
  if (!self && !isAdmin(auth.user)) return json({ error: "Acesso negado." }, 403);

  const current = await db.prepare(`SELECT id, name, email, role, city, phone, permissions_json, active, password_hash, password_salt
    FROM users WHERE id = ? LIMIT 1`).bind(targetId).first();

  if (!current) return json({ error: "Usuário não encontrado." }, 404);

  let input;
  try { input = await context.request.json(); }
  catch { return json({ error: "Dados inválidos." }, 400); }

  const adminEditing = isAdmin(auth.user);
  const name = clean(input.name ?? current.name, 160);
  const email = clean(input.email ?? current.email, 180).toLowerCase();
  const role = adminEditing ? normalizeRole(input.role ?? current.role) : normalizeRole(current.role);
  const city = adminEditing ? clean(input.city ?? input.unit ?? current.city, 100) : current.city;
  const phone = clean(input.phone ?? current.phone, 40);

  let currentPermissions = [];
  try { currentPermissions = JSON.parse(current.permissions_json || "[]"); } catch {}

  const permissions = adminEditing && Array.isArray(input.permissions)
    ? input.permissions.map(value => clean(value, 80)).filter(Boolean)
    : currentPermissions;

  const active = adminEditing && typeof input.active === "boolean"
    ? (input.active ? 1 : 0)
    : Number(current.active ?? 1);

  if (!name || !email) return json({ error: "Nome e e-mail são obrigatórios." }, 400);

  const duplicate = await db.prepare("SELECT id FROM users WHERE lower(email) = lower(?) AND id <> ? LIMIT 1")
    .bind(email, targetId).first();

  if (duplicate) return json({ error: "Este e-mail já está cadastrado." }, 409);

  let passwordHash = current.password_hash;
  let passwordSalt = current.password_salt;

  if (input.password) {
    if (String(input.password).length < 8) return json({ error: "A senha deve ter pelo menos 8 caracteres." }, 400);
    const passwordRecord = await createPasswordRecord(String(input.password));
    passwordHash = passwordRecord.hash;
    passwordSalt = passwordRecord.salt;
  }

  const now = new Date().toISOString();

  await db.prepare(`UPDATE users SET name = ?, email = ?, role = ?, city = ?, phone = ?, permissions_json = ?,
    active = ?, password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?`)
    .bind(name, email, role, city, phone, JSON.stringify(permissions), active, passwordHash, passwordSalt, now, targetId).run();

  await audit(context.env, auth.user.id, "user_update", "user", targetId, { self, role, city });

  const row = await db.prepare(`SELECT id, name, email, role, city, phone, permissions_json, active FROM users WHERE id = ?`).bind(targetId).first();
  return json({ success: true, user: publicUser(row) });
}

export async function onRequestDelete(context) {
  const auth = await requireSession(context);
  if (auth.response) return auth.response;
  if (!isAdmin(auth.user)) return json({ error: "Acesso restrito a administradores." }, 403);

  await ensureCoreSchema(context.env);
  const db = getDb(context.env);

  const targetId = clean(context.params.id, 80);
  if (targetId === auth.user.id) return json({ error: "Você não pode excluir o usuário da sessão atual." }, 400);

  const target = await db.prepare("SELECT id, role FROM users WHERE id = ? LIMIT 1").bind(targetId).first();
  if (!target) return json({ error: "Usuário não encontrado." }, 404);

  if (isAdmin(target)) {
    const count = await db.prepare("SELECT COUNT(*) AS total FROM users WHERE active = 1 AND role IN ('admin','administrador')").first();
    if (Number(count?.total || 0) <= 1) return json({ error: "É necessário manter ao menos um administrador ativo." }, 400);
  }

  await db.batch([
    db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(targetId),
    db.prepare("DELETE FROM app_state WHERE scope_type = 'user' AND scope_id = ?").bind(targetId),
    db.prepare("DELETE FROM users WHERE id = ?").bind(targetId)
  ]);

  await audit(context.env, auth.user.id, "user_delete", "user", targetId, {});
  return json({ success: true });
}
