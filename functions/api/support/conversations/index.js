import {
  buildReport,
  detectIntent,
  insertMessage,
  isSupportManager,
  makeAssistantReply,
  publicTicket,
  sanitizeMessage,
  supportJson,
  supportSession,
  ticketId
} from "../../../_lib/support.js";
import { getDb } from "../../../_lib/runtime.js";

export async function onRequestGet(context) {
  const session = await supportSession(context);
  if (session.response) return session.response;

  const db = getDb(context.env);
  const manager = isSupportManager(session.user);

  let sql = "SELECT * FROM support_tickets";
  const values = [];

  if (!manager) {
    sql += " WHERE user_id = ?";
    values.push(session.user.id);
  }

  sql += " ORDER BY COALESCE(NULLIF(last_message_at,''), created_at) DESC LIMIT 200";
  const result = await db.prepare(sql).bind(...values).all();

  return supportJson({
    manager,
    tickets: (result.results || []).map(publicTicket)
  });
}

export async function onRequestPost(context) {
  const session = await supportSession(context);
  if (session.response) return session.response;

  try {
    const input = await context.request.json().catch(() => null);
    if (!input) return supportJson({ error: "Mensagem inválida." }, 400);

    const message = sanitizeMessage(input.message, 4000);
    if (message.length < 3) return supportJson({ error: "Escreva uma mensagem para o suporte." }, 400);

    const city = sanitizeMessage(input.city || session.user.city || "Cerquilho", 100);
    const pageTitle = sanitizeMessage(input.pageTitle, 180);
    const pageUrl = sanitizeMessage(input.pageUrl, 500);
    const intent = detectIntent(message, pageUrl);
    const report = buildReport({
      user: session.user,
      city,
      message,
      intent,
      pageTitle,
      pageUrl
    });

    const id = ticketId();
    const now = new Date().toISOString();
    const db = getDb(context.env);

    await db.prepare(`INSERT INTO support_tickets (
      id,user_id,user_name,user_email,role,city,module,module_label,issue,urgency,description,
      page_title,page_url,browser,status,unread,admin_notes,ai_report,human_takeover,
      assigned_to,last_message_at,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'new',1,'',?,0,'',?,?,?)`)
      .bind(
        id,
        session.user.id,
        session.user.name || "Usuário",
        session.user.email || "",
        session.user.role || "",
        city,
        intent.module,
        intent.moduleLabel,
        intent.issue,
        intent.urgency,
        message,
        pageTitle,
        pageUrl,
        sanitizeMessage(input.browser, 500),
        report,
        now,
        now,
        now
      ).run();

    const userMessage = await insertMessage(db, {
      ticketId: id,
      senderType: "user",
      senderId: session.user.id,
      senderName: session.user.name || "Usuário",
      message
    });

    const assistantText = await makeAssistantReply(context.env, { message, intent });
    const assistantMessage = await insertMessage(db, {
      ticketId: id,
      senderType: "assistant",
      senderId: "lag-assist",
      senderName: "LAG Assist",
      message: assistantText
    });

    const ticket = await db.prepare("SELECT * FROM support_tickets WHERE id = ? LIMIT 1").bind(id).first();

    return supportJson({
      success: true,
      ticket: publicTicket(ticket),
      messages: [userMessage, assistantMessage]
    }, 201);
  } catch (error) {
    console.error("support_conversation_create_error", error?.stack || error);
    return supportJson({ error: "Não foi possível iniciar o atendimento." }, 500);
  }
}
