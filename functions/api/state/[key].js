import { audit, clean, json, normalizeRole, requireSession } from "../../_lib/auth.js";
import { getDb } from "../../_lib/runtime.js";
import { ensureCoreSchema } from "../../_lib/schema.js";

const RESERVED_KEYS = new Set([
  "lag-current-user-id", "lag-user-role", "lag-active-city", "lag-users-v1", "lag-permissions-v1",
  "lag-auth-session-v1", "lag-auth-session-temp-v1"
]);

function safeKey(value) {
  const key = clean(decodeURIComponent(String(value || "")), 180);
  if (!/^lag-[a-zA-Z0-9._:-]+$/.test(key)) return "";
  return key;
}

function scopeFor(session, requested) {
  const scope = ["user", "city", "global"].includes(requested) ? requested : "city";
  if (scope === "global" && !new Set(["admin", "administrador"]).has(normalizeRole(session.user.role))) return null;
  if (scope === "user") return { type: "user", id: session.user.id };
  if (scope === "global") return { type: "global", id: "global" };
  return { type: "city", id: session.user.city };
}

export async function onRequestPut(context) {
  const session = await requireSession(context);
  if (session.response) return session.response;

  await ensureCoreSchema(context.env);
  const db = getDb(context.env);

  const key = safeKey(context.params.key);
  if (!key || RESERVED_KEYS.has(key)) return json({ error: "Chave de armazenamento não permitida." }, 400);

  let input;
  try { input = await context.request.json(); }
  catch { return json({ error: "Conteúdo inválido." }, 400); }

  const value = typeof input.value === "string" ? input.value : JSON.stringify(input.value ?? null);
  if (value.length > 2_000_000) return json({ error: "O registro ultrapassa o limite de 2 MB." }, 413);

  const scope = scopeFor(session, input.scope);
  if (!scope) return json({ error: "Apenas administradores podem alterar dados globais." }, 403);

  const now = new Date().toISOString();

  await db.prepare(`INSERT INTO app_state
    (id, scope_type, scope_id, state_key, value_text, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(scope_type, scope_id, state_key)
    DO UPDATE SET value_text = excluded.value_text, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
    .bind(crypto.randomUUID(), scope.type, scope.id, key, value, now, session.user.id).run();

  return json({ success: true, updatedAt: now });
}

export async function onRequestDelete(context) {
  const session = await requireSession(context);
  if (session.response) return session.response;

  await ensureCoreSchema(context.env);
  const db = getDb(context.env);

  const key = safeKey(context.params.key);
  if (!key || RESERVED_KEYS.has(key)) return json({ error: "Chave de armazenamento não permitida." }, 400);

  const url = new URL(context.request.url);
  const scope = scopeFor(session, url.searchParams.get("scope") || "city");
  if (!scope) return json({ error: "Apenas administradores podem excluir dados globais." }, 403);

  await db.prepare("DELETE FROM app_state WHERE scope_type = ? AND scope_id = ? AND state_key = ?")
    .bind(scope.type, scope.id, key).run();

  await audit(context.env, session.user.id, "state_delete", "app_state", key, { scope: scope.type });
  return json({ success: true });
}
