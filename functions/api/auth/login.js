import { audit, clean, createPasswordRecord, createSession, json, publicUser, sessionCookie, verifyPassword } from "../../_lib/auth.js";

export async function onRequestPost(context) {
  let input;
  try { input = await context.request.json(); }
  catch { return json({ error: "Envie e-mail e senha válidos." }, 400); }

  const email = clean(input.email, 180).toLowerCase();
  const password = String(input.password || "");
  if (!email || !password) return json({ error: "Preencha e-mail e senha." }, 400);

  let user = await context.env.DB.prepare(`SELECT id, name, email, role, city, phone, permissions_json, active, password_hash, password_salt
    FROM users WHERE lower(email) = lower(?) LIMIT 1`).bind(email).first();

  if (!user) {
    const count = await context.env.DB.prepare("SELECT COUNT(*) AS total FROM users").first();
    const initialEmail = clean(context.env.INITIAL_ADMIN_EMAIL || "gestor@lagcontroller.com", 180).toLowerCase();
    const initialPassword = String(context.env.INITIAL_ADMIN_PASSWORD || "");
    if (Number(count?.total || 0) === 0 && initialPassword && email === initialEmail && password === initialPassword) {
      const passwordRecord = await createPasswordRecord(password);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await context.env.DB.prepare(`INSERT INTO users
        (id, name, email, role, city, phone, password_hash, password_salt, permissions_json, active, created_at, updated_at)
        VALUES (?, ?, ?, 'admin', ?, '', ?, ?, ?, 1, ?, ?)`)
        .bind(
          id,
          clean(context.env.INITIAL_ADMIN_NAME || "Dr. Gestor", 160),
          initialEmail,
          clean(context.env.INITIAL_ADMIN_CITY || "Cerquilho", 100),
          passwordRecord.hash,
          passwordRecord.salt,
          JSON.stringify(["home","recepcao","geral","exames","consultas","odontologia","medicos","candidatos","laudos","prontuario","parceiros","almoxarifado","gestao","financeiro","controladoria","treinamentos","perfil"]),
          now,
          now
        ).run();
      user = await context.env.DB.prepare(`SELECT id, name, email, role, city, phone, permissions_json, active, password_hash, password_salt FROM users WHERE id = ?`).bind(id).first();
      await audit(context.env, id, "bootstrap_admin", "user", id, { email: initialEmail });
    }
  }

  if (!user || !user.active || !await verifyPassword(password, user.password_salt, user.password_hash)) {
    await audit(context.env, user?.id || null, "login_failed", "auth", email, {});
    return json({ error: "E-mail ou senha incorretos." }, 401);
  }

  const session = await createSession(context.env, context.request, user.id);
  await audit(context.env, user.id, "login", "session", session.expiresAt, {});
  return json({ success: true, user: publicUser(user) }, 200, { "Set-Cookie": sessionCookie(session.token) });
}
