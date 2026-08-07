import { getDb, getCandidateFiles, getPartnerFiles, safeErrorCode } from "../_lib/runtime.js";
import { ensureCoreSchema } from "../_lib/schema.js";

export async function onRequestGet(context) {
  const result = { ok:false, d1:false, schema:false, candidateFiles:Boolean(getCandidateFiles(context.env)), partnerFiles:Boolean(getPartnerFiles(context.env)), timestamp:new Date().toISOString() };
  try {
    const db = getDb(context.env);
    await db.prepare("SELECT 1 AS ok").first();
    result.d1 = true;
    await ensureCoreSchema(context.env);
    const tables = await db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users','sessions','app_state','audit_logs') ORDER BY name`).all();
    result.tables = (tables.results || []).map(row => row.name);
    result.schema = result.tables.length === 4;
  } catch (error) {
    result.error = safeErrorCode(error);
  }
  result.ok = result.d1 && result.schema && result.candidateFiles && result.partnerFiles;
  return Response.json(result,{status:result.ok?200:500,headers:{"Cache-Control":"no-store"}});
}
