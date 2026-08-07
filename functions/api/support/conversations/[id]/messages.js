import {
  insertMessage,
  isSupportManager,
  listMessages,
  makeAssistantReply,
  detectIntent,
  readTicketForSession,
  sanitizeMessage,
  supportJson,
  supportSession
} from "../../../../_lib/support.js";
import { getDb } from "../../../../_lib/runtime.js";

export async function onRequestGet(context) {
  const session = await supportSession(context);
  if (session.response) return session.response;

  const db = getDb(context.env);
  const access = await readTicketForSession(db, context.params.id, session);
  if (access.error) return access.error;

  return supportJson({ messages: await listMessages(db, context.params.id) });
}

export async function onRequestPost(context) {
  const session = await supportSession(context);
  if (session.response) return session.response;

  try {
    const input = await context.request.json().catch(() => null);
    const message = sanitizeMessage(input?.message, 4000);
    if (!message) return supportJson({ error: "Digite uma mensagem." }, 400);

    const db = getDb(context.env);
    const access = await readTicketForSession(db, context.params.id, session);
    if (access.error) return access.error;

    const senderType = access.manager ? "admin" : "user";
    const sent = await insertMessage(db, {
      ticketId: context.params.id,
      senderType,
      senderId: session.user.id,
      senderName: session.user.name || (access.manager ? "Suporte" : "Usuário"),
      message
    });

    const appended = [sent];

    if (access.manager) {
      await db.prepare(`UPDATE support_tickets
        SET human_takeover = 1, assigned_to = ?, status = 'progress', unread = 0, updated_at = ?
        WHERE id = ?`)
        .bind(session.user.name || "Suporte", new Date().toISOString(), context.params.id).run();
    } else if (!Number(access.ticket.human_takeover || 0)) {
      const intent = detectIntent(message, access.ticket.page_url);
      const assistantText = await makeAssistantReply(context.env, { message, intent });
      const assistant = await insertMessage(db, {
        ticketId: context.params.id,
        senderType: "assistant",
        senderId: "lag-assist",
        senderName: "LAG Assist",
        message: assistantText
      });
      appended.push(assistant);
    }

    return supportJson({ success: true, messages: appended });
  } catch (error) {
    console.error("support_message_error", error?.stack || error);
    return supportJson({ error: "Não foi possível enviar a mensagem." }, 500);
  }
}
