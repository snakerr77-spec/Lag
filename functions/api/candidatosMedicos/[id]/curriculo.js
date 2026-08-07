import { requireStaff } from "../../../_lib/candidates.js";
import { getDb, getCandidateFiles } from "../../../_lib/runtime.js";

export async function onRequestGet(context) {
  const auth = await requireStaff(context);
  if (auth.response) return auth.response;

  const db = getDb(context.env);
  const candidate = await db.prepare("SELECT resume_key, resume_name, resume_type FROM medical_candidates WHERE id = ? LIMIT 1")
    .bind(context.params.id).first();

  if (!candidate?.resume_key) return new Response("Currículo não encontrado.", { status: 404 });

  const bucket = getCandidateFiles(context.env);
  if (!bucket) return new Response("Bucket de currículos não configurado.", { status: 500 });

  const file = await bucket.get(candidate.resume_key);
  if (!file) return new Response("Arquivo não encontrado.", { status: 404 });

  const headers = new Headers();
  file.writeHttpMetadata(headers);
  headers.set("Content-Type", candidate.resume_type || "application/octet-stream");
  headers.set("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(candidate.resume_name || "curriculo")}`);
  headers.set("Cache-Control", "private, no-store");
  return new Response(file.body, { headers });
}
