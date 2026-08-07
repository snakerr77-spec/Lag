import { clean, json, normalizeRole, requireSession } from "../../../_lib/auth.js";

function isAdmin(user) {
  return new Set(["admin", "administrador", "gestor", "gerente"]).has(normalizeRole(user.role));
}

export async function onRequestPatch(context) {
  const auth = await requireSession(context);
  if (auth.response) return auth.response;
  if (!isAdmin(auth.user)) return json({ error: "Acesso negado." }, 403);
  const input = await context.request.json();
  const allowed = new Set(["new", "progress", "waiting", "resolved"]);
  const status = allowed.has(input.status) ? input.status : "new";
  const notes = clean(input.adminNotes, 4000);
  await context.env.DB.prepare("UPDATE support_tickets SET status = ?, admin_notes = ?, unread = 0, updated_at = ? WHERE id = ?")
    .bind(status, notes, new Date().toISOString(), context.params.id).run();
  return json({ success: true });
}

export async function onRequestDelete(context) {
  const auth = await requireSession(context);
  if (auth.response) return auth.response;
  if (!isAdmin(auth.user)) return json({ error: "Acesso negado." }, 403);
  await context.env.DB.prepare("DELETE FROM support_tickets WHERE id = ?").bind(context.params.id).run();
  return json({ success: true });
}
