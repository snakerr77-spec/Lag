import { getDb, getCandidateFiles, getPartnerFiles, safeErrorCode } from "../_lib/runtime.js";
import { ensureCoreSchema } from "../_lib/schema.js";

export async function onRequestGet(context) {
  try {
    await ensureCoreSchema(context.env);
    const db = getDb(context.env);
    const probe = await db.prepare("SELECT 1 AS ok").first();
    return Response.json({
      ok: Number(probe?.ok || 0) === 1,
      d1: true,
      candidateFiles: Boolean(getCandidateFiles(context.env)),
      partnerFiles: Boolean(getPartnerFiles(context.env))
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("health_error", error?.stack || error);
    return Response.json({
      ok: false,
      code: safeErrorCode(error)
    }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
