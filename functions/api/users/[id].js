import {
  adminUser,
  audit,
  clean,
  createPasswordRecord,
  json,
  normalizeRole,
  requireSession
} from "../../_lib/auth.js";
import { getDb } from "../../_lib/runtime.js";

function isAdmin(user) {
  return new Set(["admin", "administrador"]).has(normalizeRole(user?.role));
}

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

async function resolveTargetId(context, db, requestedId, auth) {
  if (requestedId !== "bootstrap-admin") return requestedId;

  // O login inicial usa uma sessão stateless chamada "bootstrap-admin".
  // Para edição, localizamos o registro real do administrador pelo e-mail
  // configurado nos Secrets do Cloudflare.
  const email = clean(
    context.env.INITIAL_ADMIN_EMAIL || auth.user?.email || "",
    180
  ).toLowerCase();

  if (!email) return requestedId;

  const row = await db.prepare(
    "SELECT id FROM users WHERE lower(email) = lower(?) LIMIT 1"
  ).bind(email).first();

  return row?.id || requestedId;
}

function safePermissions(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function updateErrorResponse(error) {
  const message = String(error?.message || "");

  if (/UNIQUE constraint failed: users\.email/i.test(message)) {
    return json({ error: "Este e-mail já está sendo usado por outro usuário." }, 409);
  }

  if (/no such table: users/i.test(message)) {
    return json({ error: "A tabela de usuários ainda não está disponível no D1." }, 500);
  }

  console.error("user_update_error", error?.stack || error);
  return json({
    error: "Não foi possível atualizar o usuário agora.",
    code: "USER_UPDATE_FAILED"
  }, 500);
}

export async function onRequestPatch(context) {
  const auth = await requireSession(context);
  if (auth.response) return auth.response;

  try {
    const db = getDb(context.env);

    // Mantém a edição de usuários independente das migrações do módulo de suporte.
    await ensureUsersTable(db);

    const requestedId = clean(context.params.id, 120);
    if (!requestedId) return json({ error: "Usuário inválido." }, 400);

    const targetId = await resolveTargetId(context, db, requestedId, auth);
    const self = requestedId === auth.user.id || targetId === auth.user.id;
    const adminEditing = isAdmin(auth.user);

    if (!self && !adminEditing) {
      return json({ error: "Acesso negado." }, 403);
    }

    const current = await db.prepare(`SELECT
        id, name, email, role, city, phone, permissions_json, active,
        password_hash, password_salt, created_at, updated_at
      FROM users
      WHERE id = ?
      LIMIT 1`)
      .bind(targetId)
      .first();

    if (!current) {
      return json({
        error: requestedId === "bootstrap-admin"
          ? "O administrador inicial ainda não possui um registro correspondente no D1."
          : "Usuário não encontrado."
      }, 404);
    }

    const input = await context.request.json().catch(() => null);
    if (!input || typeof input !== "object") {
      return json({ error: "Dados inválidos." }, 400);
    }

    const name = clean(input.name ?? current.name, 160);
    const email = clean(input.email ?? current.email, 180).toLowerCase();
    const phone = clean(input.phone ?? current.phone, 40);

    const role = adminEditing
      ? normalizeRole(input.role ?? current.role)
      : normalizeRole(current.role);

    const city = adminEditing
      ? clean(input.city ?? input.unit ?? current.city, 100)
      : clean(current.city, 100);

    if (!name) return json({ error: "Informe o nome do usuário." }, 400);
    if (!email || !email.includes("@")) {
      return json({ error: "Informe um e-mail válido." }, 400);
    }
    if (!city) return json({ error: "Informe a cidade do usuário." }, 400);

    const duplicate = await db.prepare(
      "SELECT id FROM users WHERE lower(email) = lower(?) AND id <> ? LIMIT 1"
    ).bind(email, targetId).first();

    if (duplicate) {
      return json({ error: "Este e-mail já está sendo usado por outro usuário." }, 409);
    }

    let permissions = safePermissions(current.permissions_json);

    if (adminEditing && Array.isArray(input.permissions)) {
      permissions = [...new Set(
        input.permissions
          .map(value => clean(value, 80))
          .filter(Boolean)
      )];
    }

    const active = adminEditing && typeof input.active === "boolean"
      ? (input.active ? 1 : 0)
      : Number(current.active ?? 1) === 0 ? 0 : 1;

    const now = new Date().toISOString();
    const newPassword = String(input.password || "");

    if (newPassword) {
      if (newPassword.length < 8) {
        return json({ error: "A nova senha deve ter pelo menos 8 caracteres." }, 400);
      }

      const passwordRecord = await createPasswordRecord(newPassword);

      await db.prepare(`UPDATE users SET
          name = ?,
          email = ?,
          role = ?,
          city = ?,
          phone = ?,
          permissions_json = ?,
          active = ?,
          password_hash = ?,
          password_salt = ?,
          updated_at = ?
        WHERE id = ?`)
        .bind(
          name,
          email,
          role,
          city,
          phone,
          JSON.stringify(permissions),
          active,
          passwordRecord.hash,
          passwordRecord.salt,
          now,
          targetId
        )
        .run();
    } else {
      // Quando a senha não foi alterada, não toca no hash/salt existente.
      await db.prepare(`UPDATE users SET
          name = ?,
          email = ?,
          role = ?,
          city = ?,
          phone = ?,
          permissions_json = ?,
          active = ?,
          updated_at = ?
        WHERE id = ?`)
        .bind(
          name,
          email,
          role,
          city,
          phone,
          JSON.stringify(permissions),
          active,
          now,
          targetId
        )
        .run();
    }

    const row = await db.prepare(`SELECT
        id, name, email, role, city, phone, permissions_json, active
      FROM users
      WHERE id = ?
      LIMIT 1`)
      .bind(targetId)
      .first();

    if (!row) {
      return json({ error: "O usuário foi atualizado, mas não pôde ser recarregado." }, 500);
    }

    // Auditoria não pode bloquear a edição.
    try {
      await audit(context.env, auth.user.id, "user_update", "user", targetId, {
        self,
        role,
        city,
        passwordChanged: Boolean(newPassword)
      });
    } catch (auditError) {
      console.warn("user_update_audit_warning", auditError?.message || auditError);
    }

    return json({
      success: true,
      user: adminUser(row)
    });
  } catch (error) {
    return updateErrorResponse(error);
  }
}

export async function onRequestDelete(context) {
  const auth = await requireSession(context);
  if (auth.response) return auth.response;

  if (!isAdmin(auth.user)) {
    return json({ error: "Acesso restrito a administradores." }, 403);
  }

  try {
    const db = getDb(context.env);
    await ensureUsersTable(db);

    const requestedId = clean(context.params.id, 120);
    const targetId = await resolveTargetId(context, db, requestedId, auth);

    if (requestedId === auth.user.id || targetId === auth.user.id) {
      return json({ error: "Você não pode excluir o usuário da sessão atual." }, 400);
    }

    const target = await db.prepare(
      "SELECT id, role FROM users WHERE id = ? LIMIT 1"
    ).bind(targetId).first();

    if (!target) return json({ error: "Usuário não encontrado." }, 404);

    if (isAdmin(target)) {
      const count = await db.prepare(
        "SELECT COUNT(*) AS total FROM users WHERE active = 1 AND role IN ('admin','administrador')"
      ).first();

      if (Number(count?.total || 0) <= 1) {
        return json({
          error: "É necessário manter ao menos um administrador ativo."
        }, 400);
      }
    }

    // Tabelas auxiliares podem não existir em instalações antigas.
    try {
      await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(targetId).run();
    } catch {}
    try {
      await db.prepare(
        "DELETE FROM app_state WHERE scope_type = 'user' AND scope_id = ?"
      ).bind(targetId).run();
    } catch {}

    await db.prepare("DELETE FROM users WHERE id = ?").bind(targetId).run();

    try {
      await audit(context.env, auth.user.id, "user_delete", "user", targetId, {});
    } catch {}

    return json({ success: true });
  } catch (error) {
    console.error("user_delete_error", error?.stack || error);
    return json({ error: "Não foi possível excluir o usuário agora." }, 500);
  }
}
