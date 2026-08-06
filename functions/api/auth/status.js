import { json } from "../../_lib/auth.js";
export async function onRequestGet(context) {
  const row = await context.env.DB.prepare("SELECT COUNT(*) AS total FROM users WHERE active = 1").first();
  return json({ configured: Number(row?.total || 0) > 0 });
}
