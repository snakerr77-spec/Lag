import { json, requireSession } from "../../_lib/auth.js";

export async function onRequestGet(context) {
  const session = await requireSession(context);
  if (session.response) return session.response;
  return json({ user: session.user, expiresAt: session.expiresAt });
}
