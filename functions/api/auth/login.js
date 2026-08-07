import { clean, createPasswordRecord, createSession, json, publicUser, sessionCookie, verifyPassword } from "../../_lib/auth.js";
import { getDb, safeErrorCode } from "../../_lib/runtime.js";
import { ensureCoreSchema } from "../../_lib/schema.js";

const ADMIN_PERMISSIONS = ["home","recepcao","geral","exames","consultas","odontologia","medicos","candidatos","laudos","prontuario","parceiros","almoxarifado","gestao","financeiro","controladoria","treinamentos","perfil"];

async function findUser(db, email) {
  return db.prepare(`SELECT id, name, email, role, city, phone, permissions_json, active, password_hash, password_salt
    FROM users WHERE lower(email)=lower(?) LIMIT 1`).bind(email).first();
}

async function upsertInitialAdmin(context, db, email, password) {
  const now = new Date().toISOString();
  const record = await createPasswordRecord(password);
  const name = clean(context.env.INITIAL_ADMIN_NAME || "DEV Snaker", 160);
  const city = clean(context.env.INITIAL_ADMIN_CITY || "Cerquilho", 100);
  const existing = await findUser(db, email);

  if (existing) {
    await db.prepare(`UPDATE users SET name=?, role='admin', city=?, password_hash=?, password_salt=?,
      permissions_json=?, active=1, updated_at=? WHERE id=?`)
      .bind(name, city, record.hash, record.salt, JSON.stringify(ADMIN_PERMISSIONS), now, existing.id).run();
  } else {
    await db.prepare(`INSERT INTO users
      (id,name,email,role,city,phone,password_hash,password_salt,permissions_json,active,created_at,updated_at)
      VALUES (?,?,?,'admin',?,'',?,?,?,1,?,?)`)
      .bind(crypto.randomUUID(), name, email, city, record.hash, record.salt, JSON.stringify(ADMIN_PERMISSIONS), now, now).run();
  }

  return findUser(db, email);
}

export async function onRequestPost(context) {
  let stage = "start";

  try {
    stage = "body";
    const input = await context.request.json().catch(() => null);
    if (!input) return json({ error: "Envie e-mail e senha válidos." }, 400);

    const email = clean(input.email, 180).toLowerCase();
    const password = String(input.password || "");
    if (!email || !password) return json({ error: "Preencha e-mail e senha." }, 400);

    stage = "schema";
    await ensureCoreSchema(context.env);

    stage = "db";
    const db = getDb(context.env);
    const initialEmail = clean(context.env.INITIAL_ADMIN_EMAIL || "", 180).toLowerCase();
    const initialPassword = String(context.env.INITIAL_ADMIN_PASSWORD || "");

    stage = "user_lookup";
    let user = await findUser(db, email);

    if (initialEmail && initialPassword && email === initialEmail && password === initialPassword) {
      stage = "admin_upsert";
      const valid = user && await verifyPassword(password, user.password_salt, user.password_hash).catch(() => false);

      if (!valid || !user?.active || String(user.role).toLowerCase() !== "admin") {
        user = await upsertInitialAdmin(context, db, initialEmail, password);
      }
    }

    stage = "verify";
    const validPassword = user && user.active &&
      await verifyPassword(password, user.password_salt, user.password_hash).catch(() => false);

    if (!validPassword) {
      return json({ error: "E-mail ou senha incorretos." }, 401);
    }

    stage = "session";
    const session = await createSession(context.env, context.request, user.id);

    stage = "response";
    return json({ success: true, user: publicUser(user) }, 200, {
      "Set-Cookie": sessionCookie(session.token)
    });
  } catch (error) {
    console.error("auth_login_error", { stage, error: error?.stack || error });
    return json({
      error: "Não foi possível concluir o login agora.",
      code: safeErrorCode(error, "AUTH_LOGIN_ERROR"),
      stage
    }, 500);
  }
}
