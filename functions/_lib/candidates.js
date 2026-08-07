import { requireSession, normalizeRole } from "./auth.js";
export const STAFF_ROLES = new Set(["admin", "administrador", "gerente"]);
export const ALLOWED_STATUS = new Set(["novo", "analise", "entrevista", "aprovado", "recusado"]);
export const ALLOWED_RESUME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);
export const MAX_RESUME_BYTES = 10 * 1024 * 1024;

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders }
  });
}

export function clean(value, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}

export function normalizeCity(value) {
  const city = clean(value, 80);
  if (city === "Tatui") return "Tatuí";
  return city;
}

export async function requireStaff(context) {
  const session = await requireSession(context);
  if (session.response) return { response: session.response };
  if (!STAFF_ROLES.has(normalizeRole(session.user.role))) {
    return { response: json({ erro: "Usuário sem permissão para acessar candidatos médicos." }, 403) };
  }
  return { user: session.user };
}

export async function validateTurnstile(request, env, token) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET);
  body.append("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) body.append("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  const result = await response.json().catch(() => ({}));
  return Boolean(result.success);
}

export function candidateSelectSql(where = "") {
  return `SELECT id, source, name, specialty, crm, city, phone, email, availability, payment,
    documents, experience, notes, consent, status, created_at AS createdAt, updated_at AS updatedAt,
    resume_key AS resumeId, resume_name AS resumeName, resume_type AS resumeType, resume_size AS resumeSize
    FROM medical_candidates ${where}`;
}
