import { audit, clearSessionCookie, destroySession, getSession, json } from "../../_lib/auth.js";

export async function onRequestPost(context) {
  const session = await getSession(context.env, context.request);
  await destroySession(context.env, context.request);
  if (session?.user?.id) await audit(context.env, session.user.id, "logout", "session", session.sessionId, {});
  return json({ success: true }, 200, { "Set-Cookie": clearSessionCookie() });
}
