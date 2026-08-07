import { json } from "../../_lib/auth.js";
import { getDb, safeErrorCode } from "../../_lib/runtime.js";
import { ensureCoreSchema } from "../../_lib/schema.js";

export async function onRequestGet(context) {
  try {
    await ensureCoreSchema(context.env);
    const db = getDb(context.env);
    const row = await db.prepare("SELECT COUNT(*) AS total FROM users WHERE active = 1").first();
    return json({ configured: Number(row?.total || 0) > 0 });
  } catch (error) {
    console.error("auth_status_error", error?.stack || error);
    return json({ configured: false, code: safeErrorCode(error) }, 500);
  }
}
