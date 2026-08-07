import { json, requireSession } from "../../_lib/auth.js";

function mergeRows(rows) {
  const output = {};
  const order = { global: 0, city: 1, user: 2 };
  [...rows].sort((a, b) => (order[a.scope_type] ?? 9) - (order[b.scope_type] ?? 9)).forEach(row => {
    output[row.state_key] = row.value_text;
  });
  return output;
}

export async function onRequestGet(context) {
  const session = await requireSession(context);
  if (session.response) return session.response;
  const result = await context.env.DB.prepare(`SELECT scope_type, scope_id, state_key, value_text, updated_at
    FROM app_state
    WHERE scope_type = 'global'
       OR (scope_type = 'city' AND scope_id = ?)
       OR (scope_type = 'user' AND scope_id = ?)
    ORDER BY updated_at ASC`).bind(session.user.city, session.user.id).all();
  return json({ state: mergeRows(result.results || []) });
}
