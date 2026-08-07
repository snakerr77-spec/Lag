import {
  audit,
  clean,
  createPasswordRecord,
  createSession,
  json,
  publicUser,
  sessionCookie,
  verifyPassword
} from "../../_lib/auth.js";
import { getDb, safeErrorCode } from "../../_lib/runtime.js";
import { ensureCoreSchema } from "../../_lib/schema.js";

const ADMIN_PERMISSIONS = [
  "home","recepcao","geral","exames","consultas","odontologia","medicos",
  "candidatos","laudos","prontuario","parceiros","almoxarifado","gestao",
  "financeiro","controladoria","treinamentos","perfil"
];

async function findUser(db, email) {
  return db.prepare(`SELECT id, name, email, role, city, phone, permissions_json, active, password_hash, password_salt
    FROM users WHERE lower(email) = lower(?) LIMIT 1`).bind(email).first();
}

async function createInitialAdmin(context, db, email, password) {
  const passwordRecord = await createPasswordRecord(password);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const name = clean(context.env.INITIAL_ADMIN_NAME || "DEV Snaker", 160);
  const city = clean(context.env.INITIAL_ADMIN_CITY || "Cerquilho", 100);

  await db.prepare(`INSERT INTO users
    (id, name, email, role, city, phone, password_hash, password_salt, permissions_json, active, created_at, updated_at)
    VALUES (?, ?, ?, 'admin', ?, '', ?, ?, ?, 1, ?, ?)`).bind(
      id,
      name,
      email,
      city,
      passwordRecord.hash,
      passwordRecord.salt,
      JSON.stringify(ADMIN_PERMISSIONS),
      now,
      now
    ).run();

  await audit(context.env, id, "bootstrap_admin", "user", id, {});
  return findUser(db, email);
}

async function repairInitialAdmin(context, db, user, email, password) {
  const initialEmail = clean(context.env.INITIAL_ADMIN_EMAIL || "", 180).toLowerCase();
  const initialPassword = String(context.env.INITIAL_ADMIN_PASSWORD || "");
  if (!initialEmail || !initialPassword || email !== initialEmail || password !== initialPassword) return user;

  const passwordValid = await verifyPassword(password, user.password_salt, user.password_hash);
  if (passwordValid) return user;

  const passwordRecord = await createPasswordRecord(password);
  const now = new Date().toISOString();
  await db.prepare(`UPDATE users
    SET password_hash = ?, password_salt = ?, active = 1, role = 'admin', updated_at = ?
    WHERE id = ?`).bind(passwordRecord.hash, passwordRecord.salt, now, user.id).run();

  await audit(context.env, user.id, "bootstrap_admin_repaired", "user", user.id, {});
  return findUser(db, email);
}

export async function onRequestPost(context) {
  try {
    let input;
    try {
      input = await context.request.json();
    } catch {
      return json({ error: "Envie e-mail e senha válidos." }, 400);
    }

    const email = clean(input.email, 180).toLowerCase();
    const password = String(input.password || "");
    if (!email || !password) return json({ error: "Preencha e-mail e senha." }, 400);

    await ensureCoreSchema(context.env);
    const db = getDb(context.env);
    let user = await findUser(db, email);

    const initialEmail = clean(context.env.INITIAL_ADMIN_EMAIL || "", 180).toLowerCase();
    const initialPassword = String(context.env.INITIAL_ADMIN_PASSWORD || "");

    if (!user) {
      const count = await db.prepare("SELECT COUNT(*) AS total FROM users").first();
      const canBootstrap = Number(count?.total || 0) === 0 && initialEmail && initialPassword && email === initialEmail && password === initialPassword;
      if (canBootstrap) user = await createInitialAdmin(context, db, initialEmail, password);
    } else {
      user = await repairInitialAdmin(context, db, user, email, password);
    }

    if (!user || !user.active || !await verifyPassword(password, user.password_salt, user.password_hash)) {
      await audit(context.env, user?.id || null, "login_failed", "auth", "login", {});
      return json({ error: "E-mail ou senha incorretos." }, 401);
    }

    const session = await createSession(context.env, context.request, user.id);
    await audit(context.env, user.id, "login", "session", session.expiresAt, {});
    return json({ success: true, user: publicUser(user) }, 200, {
      "Set-Cookie": sessionCookie(session.token)
    });
  } catch (error) {
    console.error("auth_login_error", error?.stack || error);
    return json({
      error: "Não foi possível concluir o login agora.",
      code: safeErrorCode(error, "AUTH_LOGIN_ERROR")
    }, 500);
  }
}
