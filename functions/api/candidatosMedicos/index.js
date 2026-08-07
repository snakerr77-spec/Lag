import {
  ALLOWED_RESUME_TYPES,
  MAX_RESUME_BYTES,
  candidateSelectSql,
  clean,
  json,
  normalizeCity,
  requireStaff,
  validateTurnstile
} from "../../_lib/candidates.js";
import { getDb, getCandidateFiles } from "../../_lib/runtime.js";
import { ensureCoreSchema } from "../../_lib/schema.js";

export async function onRequestGet(context) {
  const auth = await requireStaff(context);
  if (auth.response) return auth.response;
  await ensureCoreSchema(context.env);

  const url = new URL(context.request.url);
  const status = clean(url.searchParams.get("status"), 30);
  const city = normalizeCity(url.searchParams.get("city"));
  const search = clean(url.searchParams.get("q"), 120);
  const clauses = [];
  const values = [];

  if (status) { clauses.push("status = ?"); values.push(status); }
  if (city) { clauses.push("city = ?"); values.push(city); }
  if (search) {
    clauses.push("(lower(name) LIKE lower(?) OR lower(crm) LIKE lower(?) OR lower(specialty) LIKE lower(?) OR lower(email) LIKE lower(?))");
    const term = `%${search}%`;
    values.push(term, term, term, term);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const db = getDb(context.env);
  const query = db.prepare(`${candidateSelectSql(where)} ORDER BY created_at DESC LIMIT 500`).bind(...values);
  const result = await query.all();
  return json({ candidatos: result.results || [] });
}

export async function onRequestPost(context) {
  await ensureCoreSchema(context.env);

  const form = await context.request.formData();
  const turnstileOk = await validateTurnstile(context.request, context.env, clean(form.get("cf-turnstile-response"), 2048));
  if (!turnstileOk) return json({ erro: "Não foi possível validar o envio." }, 400);

  const name = clean(form.get("name"), 160);
  const phone = clean(form.get("phone"), 40);
  const email = clean(form.get("email"), 180);
  const crm = clean(form.get("crm"), 80);
  const specialty = clean(form.get("specialty"), 120);
  const city = normalizeCity(form.get("city"));
  if (!name || !phone || !email || !crm || !specialty || !city) {
    return json({ erro: "Preencha nome, telefone, e-mail, CRM, especialidade e cidade." }, 400);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const resume = form.get("resume");
  let resumeKey = "";
  let resumeName = "";
  let resumeType = "";
  let resumeSize = 0;
  const bucket = getCandidateFiles(context.env);

  if (resume instanceof File && resume.size > 0) {
    if (!bucket) return json({ erro: "Bucket de currículos não configurado." }, 500);
    if (resume.size > MAX_RESUME_BYTES) return json({ erro: "O currículo deve ter no máximo 10 MB." }, 400);
    if (!ALLOWED_RESUME_TYPES.has(resume.type)) return json({ erro: "Envie o currículo em PDF, DOC ou DOCX." }, 400);

    resumeName = clean(resume.name, 240);
    resumeType = resume.type;
    resumeSize = resume.size;
    const safeName = resumeName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
    resumeKey = `candidatos/${city}/${id}/${safeName}`;

    await bucket.put(resumeKey, resume.stream(), {
      httpMetadata: { contentType: resumeType },
      customMetadata: { candidateId: id, city }
    });
  }

  const source = context.request.headers.get("Cf-Access-Authenticated-User-Email") ? "internal" : "public-form";
  const db = getDb(context.env);

  try {
    await db.prepare(`INSERT INTO medical_candidates (
      id, source, name, specialty, crm, city, phone, email, availability, payment,
      documents, experience, notes, consent, status, created_at, updated_at,
      resume_key, resume_name, resume_type, resume_size
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        id, source, name, specialty, crm, city, phone, email,
        clean(form.get("availability"), 500), clean(form.get("payment"), 500),
        clean(form.get("documents"), 1000), clean(form.get("experience"), 12000),
        clean(form.get("notes") || form.get("experience"), 12000), form.get("consent") === "true" ? 1 : 0,
        "novo", createdAt, createdAt, resumeKey, resumeName, resumeType, resumeSize
      ).run();
  } catch (error) {
    if (resumeKey && bucket) await bucket.delete(resumeKey);
    console.error(error);
    return json({ erro: "Não foi possível salvar a candidatura." }, 500);
  }

  return json({ sucesso: true, id }, 201);
}
