import { getSession, normalizeRole, publicUser } from "./_lib/auth.js";
import { getDb } from "./_lib/runtime.js";

const PUBLIC_HTML = new Set([
  "/", "/index.html",
  "/cadastro-medico", "/cadastro-medico/", "/cadastro-medico/index.html",
  "/odontologia/assinatura.html"
]);

const PUBLIC_PREFIXES = [
  "/cadastro-medico/",
  "/laudos-medicos/portal-paciente/"
];

function isHtmlPath(pathname) {
  return pathname === "/" || pathname.endsWith("/") || pathname.endsWith(".html");
}

function safeJson(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

function readCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function stateCityFor(request, user) {
  if (normalizeRole(user.role) !== "dev") return user.city;

  const requested = readCookie(request, "lag_active_city");
  if (!requested || requested === "Todas as cidades") return user.city;

  const allowed = new Set(["Cerquilho", "Tatuí", "Embu das Artes", "Itapeva"]);
  return allowed.has(requested) ? requested : user.city;
}

async function loadState(env, user, request) {
  const db = getDb(env);
  const city = stateCityFor(request, user);
  const result = await db.prepare(`SELECT scope_type, state_key, value_text, updated_at
    FROM app_state
    WHERE scope_type = 'global'
       OR (scope_type = 'city' AND scope_id = ?)
       OR (scope_type = 'user' AND scope_id = ?)
    ORDER BY CASE scope_type WHEN 'global' THEN 0 WHEN 'city' THEN 1 ELSE 2 END, updated_at ASC`)
    .bind(city, user.id).all();

  const state = {};
  for (const row of result.results || []) state[row.state_key] = row.value_text;
  return state;
}

async function loadUsers(env, user) {
  if (!new Set(["admin", "administrador"]).has(normalizeRole(user.role))) return [user];
  const db = getDb(env);
  const result = await db.prepare(`SELECT id, name, email, role, city, phone, permissions_json, active
    FROM users WHERE active = 1 ORDER BY name COLLATE NOCASE ASC`).all();
  return (result.results || []).map(publicUser);
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  if (pathname.startsWith("/api/")) return context.next();
  if (!isHtmlPath(pathname)) return context.next();

  const isPublic = PUBLIC_HTML.has(pathname) || PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix));

  let session = null;
  try {
    session = await getSession(context.env, context.request);
  } catch (error) {
    console.error("session_load_error", error?.stack || error);
  }

  if (isPublic && session && (pathname === "/" || pathname === "/index.html")) {
    return Response.redirect(new URL("/home-page/index.html", url), 302);
  }

  if (!isPublic && !session) {
    const login = new URL("/index.html", url);
    login.searchParams.set("redirect", pathname + url.search);
    return Response.redirect(login, 302);
  }

  const response = await context.next();
  const contentType = response.headers.get("Content-Type") || "";
  if (!session || !contentType.includes("text/html")) return response;

  let state = {};
  let users = [session.user];
  try {
    state = await loadState(context.env, session.user, context.request);
    users = await loadUsers(context.env, session.user);
  } catch (error) {
    console.error("bootstrap_load_error", error?.stack || error);
  }

  const bootstrap = {
    enabled: true,
    user: session.user,
    users,
    permissions: Object.fromEntries(users.map(user => [user.id, user.permissions || []])),
    state,
    sessionExpiresAt: session.expiresAt
  };

  const injection = `<script>window.__LAG_CLOUD__=${safeJson(bootstrap)};</script><script src="/shared/js/lag-cloud-sync.js?v=20260807"></script>`;
  let html = await response.text();
  html = html.includes("</head>") ? html.replace("</head>", `${injection}</head>`) : `${injection}${html}`;

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.delete("Content-Length");
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}
