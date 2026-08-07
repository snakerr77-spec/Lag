import { ALLOWED_STATUS, candidateSelectSql, clean, json, requireStaff } from "../../_lib/candidates.js";

export async function onRequestGet(context) {
  const auth = await requireStaff(context);
  if (auth.response) return auth.response;
  const candidate = await context.env.DB.prepare(`${candidateSelectSql("WHERE id = ?")} LIMIT 1`).bind(context.params.id).first();
  return candidate ? json({ candidato: candidate }) : json({ erro: "Candidato não encontrado." }, 404);
}

export async function onRequestPatch(context) {
  const auth = await requireStaff(context);
  if (auth.response) return auth.response;
  const body = await context.request.json().catch(() => ({}));
  const status = clean(body.status, 30);
  if (!ALLOWED_STATUS.has(status)) return json({ erro: "Status inválido." }, 400);
  const result = await context.env.DB.prepare("UPDATE medical_candidates SET status = ?, updated_at = ? WHERE id = ?")
    .bind(status, new Date().toISOString(), context.params.id).run();
  return result.meta?.changes ? json({ sucesso: true }) : json({ erro: "Candidato não encontrado." }, 404);
}

export async function onRequestDelete(context) {
  const auth = await requireStaff(context);
  if (auth.response) return auth.response;
  const candidate = await context.env.DB.prepare("SELECT resume_key FROM medical_candidates WHERE id = ? LIMIT 1").bind(context.params.id).first();
  if (!candidate) return json({ erro: "Candidato não encontrado." }, 404);
  if (candidate.resume_key) await context.env.CANDIDATE_FILES.delete(candidate.resume_key);
  await context.env.DB.prepare("DELETE FROM medical_candidates WHERE id = ?").bind(context.params.id).run();
  return json({ sucesso: true });
}
