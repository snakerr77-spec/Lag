import { json, normalizeRole, requireSession } from "../../_lib/auth.js";
import { getDb } from "../../_lib/runtime.js";
import { ensureCoreSchema } from "../../_lib/schema.js";

function mergeRows(rows) {
  const output = {};
  const order = { global: 0, city: 1, user: 2 };
  [...rows].sort((a, b) => (order[a.scope_type] ?? 9) - (order[b.scope_type] ?? 9)).forEach(row => {
    output[row.state_key] = row.value_text;
  });
  return output;
}

function readCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function selectedCity(request, user) {
  if (normalizeRole(user.role) !== "dev") return user.city;

  const url = new URL(request.url);
  const requested = url.searchParams.get("city") || readCookie(request, "lag_active_city");
  if (!requested || requested === "Todas as cidades") return user.city;

  const allowed = new Set(["Cerquilho", "Tatuí", "Embu das Artes", "Itapeva"]);
  return allowed.has(requested) ? requested : user.city;
}

export async function onRequestGet(context) {
  const session = await requireSession(context);
  if (session.response) return session.response;

  await ensureCoreSchema(context.env);
  const db = getDb(context.env);
  const city = selectedCity(context.request, session.user);

  const result = await db.prepare(`SELECT scope_type, scope_id, state_key, value_text, updated_at
    FROM app_state
    WHERE scope_type = 'global'
       OR (scope_type = 'city' AND scope_id = ?)
       OR (scope_type = 'user' AND scope_id = ?)
    ORDER BY updated_at ASC`).bind(city, session.user.id).all();

  return json({ state: mergeRows(result.results || []) });
}
