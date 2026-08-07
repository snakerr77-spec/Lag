import { clean, json, normalizeRole, requireSession } from "./auth.js";
import { getDb } from "./runtime.js";
import { ensureCoreSchema } from "./schema.js";

export const MANAGER_ROLES = new Set(["admin", "administrador", "dev"]);

export function isSupportManager(user) {
  return MANAGER_ROLES.has(normalizeRole(user?.role));
}

export async function supportSession(context) {
  const session = await requireSession(context);
  if (session.response) return session;
  await ensureCoreSchema(context.env);
  return session;
}

export function supportJson(data, status = 200) {
  return json(data, status);
}

export function sanitizeMessage(value, max = 4000) {
  return clean(value, max);
}

export function ticketId() {
  return `SUP-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export function detectIntent(message, pageUrl = "") {
  const raw = String(message || "");
  const text = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const page = String(pageUrl || "").toLowerCase();

  const rules = [
    ["login", "Login e acesso", ["login","senha","entrar","acesso","sessao","desconect"]],
    ["prontuario", "Prontuário médico", ["prontuario","paciente","evolucao","anamnese","triagem"]],
    ["medicos", "Médicos e exames", ["medico","exame","agenda","crm","horario"]],
    ["laudos", "Laudos e PDFs", ["laudo","pdf","portal","resultado"]],
    ["almox", "Almoxarifado", ["almox","estoque","produto","scanner","entrada","saida"]],
    ["metas", "Gestão e metas", ["meta","gestao","indicador","faturamento","resultado"]],
    ["documentos", "Controladoria", ["controladoria","documento","arquivo","pasta"]],
    ["parceiros", "Parceiros", ["parceiro","parceria"]],
    ["sidebar", "Sidebar e navegação", ["sidebar","menu","aba","navegacao","link"]],
    ["visual", "Visual e aparência", ["tema","escuro","claro","logo","layout","visual","cor"]],
  ];

  let module = "outro";
  let moduleLabel = "Outro assunto";
  for (const [id, label, words] of rules) {
    if (words.some(word => text.includes(word)) || page.includes(id)) {
      module = id;
      moduleLabel = label;
      break;
    }
  }

  let urgency = "media";
  if (/(nao consigo|travou|bloqueou|parou|erro 500|urgente|nao abre|nao funciona)/.test(text)) urgency = "alta";
  else if (/(duvida|melhoria|sugest|como faco|gostaria)/.test(text)) urgency = "baixa";

  let issue = "Solicitação de suporte";
  if (/(nao aparece|sumiu|desapareceu)/.test(text)) issue = "Informação ou item não aparece";
  else if (/(nao salva|salvar|cadastro|cadastrar|editar)/.test(text)) issue = "Cadastro ou salvamento";
  else if (/(erro|falha|travou|nao funciona)/.test(text)) issue = "Erro de funcionamento";
  else if (/(acesso|permiss)/.test(text)) issue = "Acesso ou permissão";
  else if (/(layout|visual|tema|cor)/.test(text)) issue = "Aparência ou layout";

  return { module, moduleLabel, urgency, issue };
}

export function buildReport({ user, city, message, intent, pageTitle, pageUrl }) {
  const priority = intent.urgency === "alta" ? "ALTA" : intent.urgency === "baixa" ? "BAIXA" : "MÉDIA";
  const recommended = {
    login: "Validar credenciais, sessão e permissões do usuário.",
    prontuario: "Validar fila da recepção, sincronização e dados do prontuário.",
    medicos: "Validar cadastro, agenda e sincronização de médicos/exames.",
    laudos: "Validar upload/consulta de arquivos e vínculos do paciente.",
    almox: "Validar operação, estoque e persistência do registro.",
    metas: "Validar fonte do indicador, período, cidade e persistência.",
    documentos: "Validar arquivo, pasta, cidade e permissão de acesso.",
    sidebar: "Validar permissão do módulo e estado da sidebar.",
    visual: "Validar CSS, tema e responsividade da tela.",
    parceiros: "Validar vínculo de parceiro, cidade e arquivos."
  }[intent.module] || "Reproduzir o cenário informado e validar o módulo indicado.";

  return [
    `RESUMO: ${clean(message, 800)}`,
    `ÁREA: ${intent.moduleLabel}`,
    `TIPO: ${intent.issue}`,
    `PRIORIDADE: ${priority}`,
    `USUÁRIO: ${clean(user?.name || "Usuário", 160)} (${normalizeRole(user?.role || "colaborador")})`,
    `CIDADE: ${clean(city || user?.city || "Cerquilho", 100)}`,
    `PÁGINA: ${clean(pageTitle || "", 180) || "Não informada"}`,
    `ROTA: ${clean(pageUrl || "", 500) || "Não informada"}`,
    `PRÓXIMA VERIFICAÇÃO: ${recommended}`
  ].join("\n");
}

async function workersAIReply(env, context) {
  if (!env?.AI?.run) return "";
  try {
    const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        {
          role: "system",
          content: "Você é a LAG Assist, assistente de suporte de um sistema clínico administrativo. Responda em português do Brasil, de forma humana, breve e profissional. Não peça senhas nem dados médicos sensíveis. Reconheça o problema, diga o que entendeu e explique que um relatório técnico foi criado para o suporte humano. Máximo 90 palavras."
        },
        {
          role: "user",
          content: `Mensagem: ${context.message}\nMódulo identificado: ${context.intent.moduleLabel}\nPrioridade: ${context.intent.urgency}`
        }
      ]
    });
    return clean(response?.response || response?.result?.response || "", 1200);
  } catch (error) {
    console.warn("workers_ai_support_fallback", error?.message || error);
    return "";
  }
}

export async function makeAssistantReply(env, context) {
  const ai = await workersAIReply(env, context);
  if (ai) return ai;

  const prefix = context.intent.urgency === "alta"
    ? "Entendi. Isso parece estar bloqueando sua rotina."
    : context.intent.urgency === "baixa"
      ? "Entendi a sua solicitação."
      : "Entendi o que aconteceu.";

  return `${prefix} Identifiquei o assunto como “${context.intent.moduleLabel}” e já gerei um relatório técnico com a mensagem e o contexto da tela. O atendimento humano pode assumir esta conversa a qualquer momento. Se quiser, envie mais detalhes por aqui enquanto o suporte analisa.`;
}

export async function insertMessage(db, {
  ticketId,
  senderType,
  senderId = "",
  senderName = "",
  message
}) {
  const row = {
    id: crypto.randomUUID(),
    ticketId,
    senderType,
    senderId,
    senderName,
    message: sanitizeMessage(message),
    createdAt: new Date().toISOString()
  };

  await db.prepare(`INSERT INTO support_messages
    (id, ticket_id, sender_type, sender_id, sender_name, message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(row.id, row.ticketId, row.senderType, row.senderId, row.senderName, row.message, row.createdAt)
    .run();

  await db.prepare(`UPDATE support_tickets
    SET last_message_at = ?, updated_at = ?, unread = ?
    WHERE id = ?`)
    .bind(row.createdAt, row.createdAt, senderType === "user" ? 1 : 0, ticketId)
    .run();

  return row;
}

export async function readTicketForSession(db, ticketIdValue, session) {
  const ticket = await db.prepare("SELECT * FROM support_tickets WHERE id = ? LIMIT 1")
    .bind(ticketIdValue).first();

  if (!ticket) return { error: supportJson({ error: "Atendimento não encontrado." }, 404) };

  const manager = isSupportManager(session.user);
  if (!manager && String(ticket.user_id || "") !== String(session.user.id || "")) {
    return { error: supportJson({ error: "Acesso negado." }, 403) };
  }

  return { ticket, manager };
}

export async function listMessages(db, ticketIdValue) {
  const result = await db.prepare(`SELECT id, ticket_id AS ticketId, sender_type AS senderType,
    sender_id AS senderId, sender_name AS senderName, message, created_at AS createdAt
    FROM support_messages
    WHERE ticket_id = ?
    ORDER BY created_at ASC`).bind(ticketIdValue).all();

  return result.results || [];
}

export function publicTicket(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    role: row.role,
    city: row.city,
    module: row.module,
    moduleLabel: row.module_label,
    issue: row.issue,
    urgency: row.urgency,
    description: row.description,
    pageTitle: row.page_title,
    pageUrl: row.page_url,
    status: row.status,
    unread: Boolean(row.unread),
    adminNotes: row.admin_notes,
    aiReport: row.ai_report,
    humanTakeover: Boolean(row.human_takeover),
    assignedTo: row.assigned_to,
    lastMessageAt: row.last_message_at || row.updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
