import { getDb } from "./runtime.js";
import { ensureCoreSchema } from "./schema.js";

const encoder = new TextEncoder();
const SESSION_COOKIE = "lag_session";
const SESSION_HOURS = 12;
const PBKDF2_ITERATIONS = 210000;

export function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers }
  });
}

export function clean(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

export function normalizeRole(value) {
  const role = clean(value, 40).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const allowed = new Set(["admin", "administrador", "gestor", "gerente", "financeiro", "laboratorio", "colaborador"]);
  return allowed.has(role) ? role : "colaborador";
}

export function defaultPermissions(role) {
  const all = ["home","recepcao","geral","exames","consultas","odontologia","medicos","candidatos","laudos","prontuario","parceiros","almoxarifado","gestao","financeiro","controladoria","treinamentos","perfil"];
  const map = {
    admin: all,
    administrador: all,
    gestor: ["home","recepcao","geral","exames","consultas","odontologia","medicos","laudos","prontuario","parceiros","almoxarifado","gestao","financeiro","controladoria","treinamentos","perfil"],
    gerente: all,
    financeiro: ["home","geral","odontologia","parceiros","almoxarifado","gestao","financeiro","controladoria","perfil"],
    laboratorio: ["home","recepcao","geral","exames","consultas","medicos","laudos","prontuario","almoxarifado","perfil"],
    colaborador: ["home","recepcao","geral","exames","consultas","odontologia","treinamentos","perfil"]
  };
  return [...(map[normalizeRole(role)] || map.colaborador)];
}

export function parsePermissions(value, role) {
  try {
    const parsed = JSON.parse(value || "null");
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {}
  return defaultPermissions(role);
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    role: normalizeRole(row.role),
    unit: row.city,
    city: row.city,
    phone: row.phone || "",
    initials: initialsFor(row.name),
    permissions: parsePermissions(row.permissions_json, row.role)
  };
}

export function initialsFor(name) {
  return clean(name, 160).split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "US";
}

function bytesToHex(buffer) {
  return [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64Url(bytes) {
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const normalized = String(value).replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function textToBase64Url(value) {
  return bytesToBase64Url(encoder.encode(String(value)));
}

function base64UrlToText(value) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

async function signingKey(env) {
  const secret = String(env?.AUTH_SECRET || env?.INITIAL_ADMIN_PASSWORD || "");
  if (!secret) {
    const error = new Error("AUTH_SECRET/INITIAL_ADMIN_PASSWORD não configurado.");
    error.code = "AUTH_SECRET_MISSING";
    throw error;
  }
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signText(env, value) {
  const key = await signingKey(env);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function verifyText(env, value, signature) {
  try {
    const key = await signingKey(env);
    return await crypto.subtle.verify("HMAC", key, base64UrlToBytes(signature), encoder.encode(value));
  } catch {
    return false;
  }
}

export async function createBootstrapAdminSession(env) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + SESSION_HOURS * 60 * 60;
  const payload = textToBase64Url(JSON.stringify({
    typ: "bootstrap-admin",
    iat: now,
    exp,
    nonce: crypto.randomUUID()
  }));
  const signature = await signText(env, payload);
  return {
    token: `b1.${payload}.${signature}`,
    expiresAt: new Date(exp * 1000).toISOString()
  };
}

async function readBootstrapAdminSession(env, token) {
  if (!String(token).startsWith("b1.")) return null;
  const parts = String(token).split(".");
  if (parts.length !== 3) return null;

  const [, payloadText, signature] = parts;
  if (!(await verifyText(env, payloadText, signature))) return null;

  let payload;
  try {
    payload = JSON.parse(base64UrlToText(payloadText));
  } catch {
    return null;
  }

  if (payload?.typ !== "bootstrap-admin") return null;
  if (!payload?.exp || Number(payload.exp) * 1000 <= Date.now()) return null;

  const name = clean(env?.INITIAL_ADMIN_NAME || "DEV Snaker", 160);
  const city = clean(env?.INITIAL_ADMIN_CITY || "Cerquilho", 100);
  const email = clean(env?.INITIAL_ADMIN_EMAIL || "", 180).toLowerCase();

  const user = {
    id: "bootstrap-admin",
    name,
    email,
    role: "admin",
    unit: city,
    city,
    phone: "",
    initials: initialsFor(name),
    permissions: defaultPermissions("admin")
  };

  return {
    user,
    sessionId: "bootstrap-admin",
    expiresAt: new Date(Number(payload.exp) * 1000).toISOString(),
    stateless: true
  };
}

export async function createPasswordRecord(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt);
  return { salt: bytesToBase64Url(salt), hash };
}

export async function verifyPassword(password, saltText, expectedHash) {
  if (!password || !saltText || !expectedHash) return false;
  try {
    const actual = await derivePassword(password, base64UrlToBytes(saltText));
    return timingSafeEqual(actual, expectedHash);
  } catch {
    return false;
  }
}

async function derivePassword(password, salt) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(String(password)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt,
    iterations: PBKDF2_ITERATIONS
  }, key, 256);
  return bytesToHex(bits);
}

function timingSafeEqual(a, b) {
  const left = encoder.encode(String(a));
  const right = encoder.encode(String(b));
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

export function randomToken(byteLength = 32) {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function hashToken(token) {
  return bytesToHex(await crypto.subtle.digest("SHA-256", encoder.encode(String(token))));
}

export function readCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

export function sessionCookie(token, maxAge = SESSION_HOURS * 60 * 60) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function createSession(env, request, userId) {
  await ensureCoreSchema(env);
  const db = getDb(env);
  const token = randomToken();
  const tokenHash = await hashToken(token);
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_HOURS * 60 * 60 * 1000);

  await db.prepare(`INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, user_agent, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      crypto.randomUUID(),
      userId,
      tokenHash,
      expires.toISOString(),
      now.toISOString(),
      clean(request.headers.get("User-Agent"), 500),
      clean(request.headers.get("CF-Connecting-IP"), 80)
    )
    .run();

  return { token, expiresAt: expires.toISOString() };
}

export async function destroySession(env, request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return;

  if (String(token).startsWith("b1.")) return;

  await ensureCoreSchema(env);
  const db = getDb(env);
  await db.prepare("DELETE FROM sessions WHERE token_hash = ?")
    .bind(await hashToken(token))
    .run();
}

export async function getSession(env, request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;

  const bootstrap = await readBootstrapAdminSession(env, token);
  if (bootstrap) return bootstrap;

  await ensureCoreSchema(env);
  const db = getDb(env);
  const tokenHash = await hashToken(token);

  const row = await db.prepare(`SELECT u.id, u.name, u.email, u.role, u.city, u.phone, u.permissions_json, u.active,
      s.id AS session_id, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? LIMIT 1`).bind(tokenHash).first();

  if (!row || !row.active || new Date(row.expires_at).getTime() <= Date.now()) {
    if (row?.session_id) {
      await db.prepare("DELETE FROM sessions WHERE id = ?").bind(row.session_id).run();
    }
    return null;
  }

  return {
    user: publicUser(row),
    sessionId: row.session_id,
    expiresAt: row.expires_at
  };
}

export async function requireSession(context) {
  const session = await getSession(context.env, context.request);
  if (!session) {
    return { response: json({ error: "Sessão expirada ou não autenticada." }, 401) };
  }
  return session;
}

export async function requireAdmin(context) {
  const session = await requireSession(context);
  if (session.response) return session;

  if (!new Set(["admin", "administrador"]).has(normalizeRole(session.user.role))) {
    return { response: json({ error: "Acesso restrito a administradores." }, 403) };
  }
  return session;
}

export async function audit(env, userId, action, targetType, targetId, details = {}) {
  if (userId === "bootstrap-admin") return;

  try {
    await ensureCoreSchema(env);
    const db = getDb(env);
    await db.prepare(`INSERT INTO audit_logs
      (id, user_id, action, target_type, target_id, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        crypto.randomUUID(),
        userId || null,
        clean(action, 80),
        clean(targetType, 80),
        clean(targetId, 160),
        JSON.stringify(details || {}),
        new Date().toISOString()
      )
      .run();
  } catch (error) {
    console.warn("audit_failed", error);
  }
}
