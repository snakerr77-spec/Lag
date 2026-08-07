import { clean, json, normalizeRole, requireSession } from "../../../_lib/auth.js";
import { getDb } from "../../../_lib/runtime.js";
import { ensureCoreSchema } from "../../../_lib/schema.js";

function sanitize(value, max = 300) {
  return clean(value, max);
}

function isAdmin(user) {
  return new Set(["admin", "administrador", "gestor", "gerente"]).has(normalizeRole(user.role));
}

export async function onRequestPost(context) {
  const auth = await requireSession(context);
  if (auth.response) return auth.response;

  try {
    await ensureCoreSchema(context.env);
    const db = getDb(context.env);
    const input = await context.request.json();

    const ticket = {
      id: sanitize(input.id || crypto.randomUUID(), 60),
      userId: auth.user.id,
      userName: auth.user.name,
      userEmail: auth.user.email,
      role: auth.user.role,
      city: auth.user.city,
      module: sanitize(input.module, 80),
      moduleLabel: sanitize(input.moduleLabel, 120),
      issue: sanitize(input.issue, 180),
      urgency: sanitize(input.urgency, 30),
      description: sanitize(input.description, 1800),
      pageTitle: sanitize(input.pageTitle, 180),
      pageUrl: sanitize(input.pageUrl, 500),
      browser: sanitize(input.browser, 500),
      createdAt: sanitize(input.createdAt, 50) || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!ticket.module || !ticket.issue || ticket.description.length < 12) {
      return json({ error: "Dados incompletos." }, 400);
    }

    await db.prepare(`INSERT INTO support_tickets (
      id,user_id,user_name,user_email,role,city,module,module_label,issue,urgency,description,page_title,page_url,browser,status,unread,admin_notes,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'new',1,'',?,?)`)
      .bind(
        ticket.id, ticket.userId, ticket.userName, ticket.userEmail, ticket.role, ticket.city,
        ticket.module, ticket.moduleLabel, ticket.issue, ticket.urgency, ticket.description,
        ticket.pageTitle, ticket.pageUrl, ticket.browser, ticket.createdAt, ticket.updatedAt
      )
      .run();

    return json({ success: true, id: ticket.id });
  } catch (error) {
    console.error(error);
    return json({ error: "Não foi possível registrar o chamado." }, 500);
  }
}

export async function onRequestGet(context) {
  const auth = await requireSession(context);
  if (auth.response) return auth.response;
  if (!isAdmin(auth.user)) return json({ error: "Acesso negado." }, 403);

  await ensureCoreSchema(context.env);
  const db = getDb(context.env);

  const url = new URL(context.request.url);
  const status = sanitize(url.searchParams.get("status"), 30);
  const city = sanitize(url.searchParams.get("city"), 100);

  let sql = "SELECT * FROM support_tickets WHERE 1=1";
  const values = [];

  if (status) { sql += " AND status = ?"; values.push(status); }
  if (city) { sql += " AND city = ?"; values.push(city); }

  sql += " ORDER BY created_at DESC LIMIT 500";

  const result = await db.prepare(sql).bind(...values).all();
  return json({ tickets: result.results || [] });
}
