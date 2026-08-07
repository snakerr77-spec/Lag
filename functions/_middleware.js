import {
  getSession,
  normalizeRole,
  publicUser
} from "./_lib/auth.js";


/* =========================================================
   COMPATIBILIDADE COM BINDINGS CLOUDFLARE
   ========================================================= */

function normalizeBindings(env) {
  if (!env) return;

  /*
   * O código do LAG utiliza:
   *
   * env.DB
   * env.CANDIDATE_FILES
   * env.PARTNER_FILES
   *
   * Mas no painel da Cloudflare os recursos podem ter sido
   * cadastrados usando o próprio nome do recurso.
   */

  try {
    if (!env.DB && env["lag-controller-db"]) {
      env.DB = env["lag-controller-db"];
    }

    if (!env.CANDIDATE_FILES && env["lag-candidate-files"]) {
      env.CANDIDATE_FILES = env["lag-candidate-files"];
    }

    if (!env.PARTNER_FILES && env["lag-partner-files"]) {
      env.PARTNER_FILES = env["lag-partner-files"];
    }
  } catch (error) {
    console.warn("binding_alias_warning", error);
  }
}


/* =========================================================
   PÁGINAS PÚBLICAS
   ========================================================= */

const PUBLIC_HTML = new Set([
  "/",
  "/index.html",

  "/cadastro-medico",
  "/cadastro-medico/",
  "/cadastro-medico/index.html",

  "/odontologia/assinatura.html"
]);


const PUBLIC_PREFIXES = [
  "/cadastro-medico/",
  "/laudos-medicos/portal-paciente/"
];


/* =========================================================
   HELPERS
   ========================================================= */

function isHtmlPath(pathname) {
  return (
    pathname === "/" ||
    pathname.endsWith("/") ||
    pathname.endsWith(".html")
  );
}


function safeJson(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}


/* =========================================================
   CARREGAR ESTADO DO SISTEMA
   ========================================================= */

async function loadState(env, user) {
  if (!env.DB) {
    console.error("DB binding não encontrado em loadState");
    return {};
  }

  const result = await env.DB
    .prepare(`
      SELECT
        scope_type,
        state_key,
        value_text,
        updated_at
      FROM app_state
      WHERE
        scope_type = 'global'

        OR (
          scope_type = 'city'
          AND scope_id = ?
        )

        OR (
          scope_type = 'user'
          AND scope_id = ?
        )

      ORDER BY
        CASE scope_type
          WHEN 'global' THEN 0
          WHEN 'city' THEN 1
          ELSE 2
        END,
        updated_at ASC
    `)
    .bind(
      user.city,
      user.id
    )
    .all();

  const state = {};

  for (const row of result.results || []) {
    state[row.state_key] = row.value_text;
  }

  return state;
}


/* =========================================================
   CARREGAR USUÁRIOS
   ========================================================= */

async function loadUsers(env, user) {
  const adminRoles = new Set([
    "admin",
    "administrador"
  ]);

  if (!adminRoles.has(normalizeRole(user.role))) {
    return [user];
  }

  if (!env.DB) {
    console.error("DB binding não encontrado em loadUsers");
    return [user];
  }

  const result = await env.DB
    .prepare(`
      SELECT
        id,
        name,
        email,
        role,
        city,
        phone,
        permissions_json,
        active
      FROM users
      WHERE active = 1
      ORDER BY name COLLATE NOCASE ASC
    `)
    .all();

  return (result.results || []).map(publicUser);
}


/* =========================================================
   MIDDLEWARE PRINCIPAL
   ========================================================= */

export async function onRequest(context) {
  /*
   * Primeiro normalizamos os bindings.
   * Isso precisa acontecer ANTES das rotas /api/.
   */
  normalizeBindings(context.env);

  const url = new URL(context.request.url);
  const pathname = url.pathname;


  /* =======================================================
     ROTAS DE API

     Não bloqueamos aqui.
     Cada endpoint /functions/api/... cuida de sua própria
     autenticação.
     ======================================================= */

  if (pathname.startsWith("/api/")) {
    return context.next();
  }


  /* =======================================================
     ARQUIVOS ESTÁTICOS

     CSS, JS, imagens, fontes etc.
     ======================================================= */

  if (!isHtmlPath(pathname)) {
    return context.next();
  }


  /* =======================================================
     VERIFICAR SE PÁGINA É PÚBLICA
     ======================================================= */

  const isPublic =
    PUBLIC_HTML.has(pathname) ||
    PUBLIC_PREFIXES.some(prefix =>
      pathname.startsWith(prefix)
    );


  /* =======================================================
     BUSCAR SESSÃO
     ======================================================= */

  let session = null;

  try {
    session = await getSession(
      context.env,
      context.request
    );
  } catch (error) {
    /*
     * Página de login não deve cair com erro 500 só porque
     * ainda existe alguma configuração incorreta no banco.
     */
    console.error(
      "session_load_error",
      error
    );

    session = null;
  }


  /* =======================================================
     USUÁRIO JÁ LOGADO ABRINDO LOGIN
     ======================================================= */

  if (
    isPublic &&
    session &&
    (
      pathname === "/" ||
      pathname === "/index.html"
    )
  ) {
    return Response.redirect(
      new URL(
        "/home-page/index.html",
        url
      ),
      302
    );
  }


  /* =======================================================
     PÁGINA PRIVADA SEM LOGIN
     ======================================================= */

  if (!isPublic && !session) {
    const login = new URL(
      "/index.html",
      url
    );

    login.searchParams.set(
      "redirect",
      pathname + url.search
    );

    return Response.redirect(
      login,
      302
    );
  }


  /* =======================================================
     CONTINUAR PARA ARQUIVO/PÁGINA
     ======================================================= */

  const response = await context.next();

  const contentType =
    response.headers.get("Content-Type") || "";


  /*
   * Só injetamos os dados Cloudflare nas páginas HTML
   * quando existe uma sessão válida.
   */

  if (
    !session ||
    !contentType.includes("text/html")
  ) {
    return response;
  }


  /* =======================================================
     CARREGAR BOOTSTRAP CLOUD
     ======================================================= */

  let state = {};
  let users = [session.user];

  try {
    state = await loadState(
      context.env,
      session.user
    );

    users = await loadUsers(
      context.env,
      session.user
    );
  } catch (error) {
    console.error(
      "bootstrap_load_error",
      error
    );
  }


  const permissions = Object.fromEntries(
    users.map(user => [
      user.id,
      user.permissions || []
    ])
  );


  const bootstrap = {
    enabled: true,

    user: session.user,

    users,

    permissions,

    state,

    sessionExpiresAt:
      session.expiresAt
  };


  /* =======================================================
     INJETAR DADOS NA PÁGINA
     ======================================================= */

  const injection = `
<script>
window.__LAG_CLOUD__ = ${safeJson(bootstrap)};
</script>

<script src="/shared/js/lag-cloud-sync.js?v=20260807"></script>
`;


  let html = await response.text();


  if (html.includes("</head>")) {
    html = html.replace(
      "</head>",
      `${injection}</head>`
    );
  } else {
    html =
      injection +
      html;
  }


  /* =======================================================
     HEADERS
     ======================================================= */

  const headers =
    new Headers(response.headers);

  headers.set(
    "Cache-Control",
    "private, no-store"
  );

  headers.delete(
    "Content-Length"
  );


  return new Response(
    html,
    {
      status: response.status,
      statusText: response.statusText,
      headers
    }
  );
}
