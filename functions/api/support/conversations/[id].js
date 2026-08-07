import {
  isSupportManager,
  listMessages,
  publicTicket,
  readTicketForSession,
  sanitizeMessage,
  supportJson,
  supportSession
} from "../../../_lib/support.js";
import { getDb } from "../../../_lib/runtime.js";

export async function onRequestGet(context) {
  const session = await supportSession(context);
  if (session.response) return session.response;

  const db = getDb(context.env);
  const access = await readTicketForSession(db, context.params.id, session);
  if (access.error) return access.error;

  if (access.manager && access.ticket.unread) {
    await db.prepare("UPDATE support_tickets SET unread = 0 WHERE id = ?").bind(context.params.id).run();
    access.ticket.unread = 0;
  }

  return supportJson({
    manager: access.manager,
    ticket: publicTicket(access.ticket),
    messages: await listMessages(db, context.params.id)
  });
}

export async function onRequestPatch(context) {
  const session = await supportSession(context);
  if (session.response) return session.response;
  if (!isSupportManager(session.user)) return supportJson({ error: "Acesso negado." }, 403);

  const input = await context.request.json().catch(() => ({}));
  const allowed = new Set(["new", "progress", "waiting", "resolved"]);
  const status = allowed.has(input.status) ? input.status : "progress";
  const notes = sanitizeMessage(input.adminNotes, 4000);
  const takeover = input.humanTakeover === false ? 0 : 1;
  const assignedTo = sanitizeMessage(input.assignedTo || session.user.name || "Suporte", 160);
  const now = new Date().toISOString();

  const db = getDb(context.env);
  const result = await db.prepare(`UPDATE support_tickets
    SET status = ?, admin_notes = ?, human_takeover = ?, assigned_to = ?, unread = 0, updated_at = ?
    WHERE id = ?`)
    .bind(status, notes, takeover, assignedTo, now, context.params.id).run();

  if (!result.meta?.changes) return supportJson({ error: "Atendimento não encontrado." }, 404);

  const ticket = await db.prepare("SELECT * FROM support_tickets WHERE id = ? LIMIT 1")
    .bind(context.params.id).first();

  return supportJson({ success: true, ticket: publicTicket(ticket) });
}
