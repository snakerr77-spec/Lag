(() => {
  "use strict";

  function rootUrl() {
    return new URL("/index.html", window.location.origin).href;
  }

  window.LAGAuth = {
    getSession: () => window.__LAG_CLOUD__?.user ? { userId: window.__LAG_CLOUD__.user.id, ...window.__LAG_CLOUD__.user } : null,
    clearSession: () => {},
    isAuthenticated: () => Boolean(window.__LAG_CLOUD__?.user)
  };

  window.sairDaConta = async function sairDaConta() {
    if (window.LAGCloud?.logout) return window.LAGCloud.logout();
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }); } catch {}
    window.location.href = rootUrl();
  };

  const publicPage = document.body?.dataset.publicPage === "true"
    || window.location.pathname.includes("/cadastro-medico/")
    || window.location.pathname.includes("/laudos-medicos/portal-paciente/")
    || ["/", "/index.html"].includes(window.location.pathname);
  if (publicPage) return;

  // Em produção, o middleware do Cloudflare protege as páginas antes do HTML ser entregue.
  if (!window.__LAG_CLOUD__?.user && !["localhost", "127.0.0.1"].includes(location.hostname)) {
    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`${rootUrl()}?redirect=${redirect}`);
  }
})();
