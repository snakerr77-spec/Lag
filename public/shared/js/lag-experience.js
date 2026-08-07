(() => {
  "use strict";

  const SNAPSHOT_KEY = "lag-goal-snapshot-v1";
  const DISMISS_PREFIX = "lag-goal-alert-dismissed:";
  const DEFAULT_UNITS = {
    "Cerquilho": { current: 28450, goal: 38000, pending: 6 },
    "Tatuí": { current: 25100, goal: 32000, pending: 9 },
    "Embu das Artes": { current: 34900, goal: 40000, pending: 4 },
    "Itapeva": { current: 22800, goal: 30000, pending: 11 }
  };

  const safeJson = (value, fallback) => { try { return JSON.parse(value) ?? fallback; } catch { return fallback; } };
  const settings = () => window.LAGSettings;
  const currentCity = () => settings()?.getActiveCity?.() || settings()?.getCurrentUser?.()?.unit || "Cerquilho";
  const role = () => settings()?.normalizeRole?.(settings()?.getCurrentUser?.()?.role) || "colaborador";

  function snapshot() {
    const saved = safeJson(localStorage.getItem(SNAPSHOT_KEY), null);
    if (saved?.units) return saved;
    const seeded = { updatedAt: "initial", units: DEFAULT_UNITS };
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(seeded));
    return seeded;
  }

  function unitMetric(city = currentCity()) {
    const data = snapshot().units?.[city] || DEFAULT_UNITS[city] || DEFAULT_UNITS.Cerquilho;
    const current = Number(data.current || 0);
    const hasGoal = data.hasGoal !== false;
    const goal = hasGoal ? Math.max(1, Number(data.goal || 1)) : 0;
    return { ...data, current, goal, hasGoal, percent: hasGoal ? Math.round((current / goal) * 100) : 100, city };
  }

  function dynamicGreeting() {
    if (document.body.dataset.moduleId !== "home") return;
    const title = document.querySelector(".home-hero h1");
    const description = document.querySelector(".home-hero p");
    if (!title) return;
    const city = currentCity();
    title.textContent = "Painel operacional da unidade";
    if (description) {
      description.textContent = `Acompanhe indicadores, gestão clínica, controladoria, treinamentos e rotinas da unidade ${city} em um ambiente mais objetivo, profissional e organizado.`;
    }
  }

  function ensureNotificationButton() {
    if (document.querySelector(".lag-notification-wrap")) return;
    const actions = document.querySelector(".topbar-actions, .topbar-menu");
    if (!actions) return;

    let existing = [...actions.querySelectorAll("button, a")].find(el => /notifica/i.test(el.getAttribute("aria-label") || ""));
    const wrap = document.createElement("div");
    wrap.className = "lag-notification-wrap";
    const button = existing || document.createElement("button");
    if (!existing) {
      button.type = "button";
      button.className = "icon-button";
      button.setAttribute("aria-label", "Notificações");
      button.innerHTML = '<i class="fa-regular fa-bell"></i>';
      actions.insertBefore(wrap, actions.firstChild);
      wrap.appendChild(button);
    } else {
      existing.replaceWith(wrap);
      wrap.appendChild(existing);
    }
    button.classList.add("lag-notification-button");
    button.querySelectorAll(".notification-badge").forEach(node => node.remove());

    const panel = document.createElement("section");
    panel.className = "lag-notification-panel";
    panel.hidden = true;
    wrap.appendChild(panel);

    button.addEventListener("click", event => {
      event.stopPropagation();
      panel.hidden = !panel.hidden;
      button.setAttribute("aria-expanded", String(!panel.hidden));
    });
    panel.addEventListener("click", event => event.stopPropagation());
    document.addEventListener("click", () => { panel.hidden = true; button.setAttribute("aria-expanded", "false"); });
    renderNotifications();
  }

  function renderNotifications() {
    const wrap = document.querySelector(".lag-notification-wrap");
    const button = wrap?.querySelector(".lag-notification-button");
    const panel = wrap?.querySelector(".lag-notification-panel");
    if (!button || !panel) return;
    const metric = unitMetric();
    const alerts = [];
    if (metric.hasGoal && metric.percent < 80) {
      alerts.push({ icon: "fa-bullseye", title: `Meta abaixo do esperado — ${metric.city}`, text: `A unidade atingiu ${metric.percent}% da meta atual. Acesse Gestão e metas para revisar o plano da semana.`, value: `${metric.percent}%` });
    }
    if (Number(metric.pending || 0) >= 9) {
      alerts.push({ icon: "fa-list-check", title: "Pendências da unidade", text: `${metric.pending} itens ainda precisam de acompanhamento.`, value: String(metric.pending) });
    }
    button.classList.toggle("has-alert", alerts.length > 0);
    button.querySelector(".lag-notification-count")?.remove();
    if (alerts.length) {
      const count = document.createElement("span");
      count.className = "lag-notification-count";
      count.textContent = String(alerts.length);
      button.appendChild(count);
    }
    panel.innerHTML = `<header class="lag-notification-head"><div><strong>Notificações</strong><small>Avisos do seu perfil e unidade</small></div><button type="button" data-open-goals>Ver metas</button></header><div class="lag-notification-list">${alerts.length ? alerts.map(item => `<article class="lag-notification-item"><i class="fa-solid ${item.icon}"></i><div><strong>${item.title}</strong><small>${item.text}</small></div><b>${item.value}</b></article>`).join("") : '<p class="lag-notification-empty">Nenhum alerta importante no momento.</p>'}</div>`;
    panel.querySelector("[data-open-goals]")?.addEventListener("click", () => { window.location.href = "../gestao/index.html"; });
  }

  function persistentHomeGoalAlert() {
    if (document.body.dataset.moduleId !== "home") return;
    const metric = unitMetric();
    if (!metric.hasGoal || metric.percent >= 80) return;
    const snap = snapshot();
    const dismissKey = `${DISMISS_PREFIX}${metric.city}:${snap.updatedAt || "initial"}`;
    if (localStorage.getItem(dismissKey) === "1") return;
    const hero = document.querySelector(".home-hero");
    if (!hero || document.querySelector(".home-goal-alert")) return;
    const alert = document.createElement("section");
    alert.className = "home-goal-alert";
    alert.innerHTML = `<span><i class="fa-solid fa-triangle-exclamation"></i></span><div><strong>Meta de ${metric.city} está abaixo do esperado</strong><small>Resultado atual: ${metric.percent}% da meta. Este aviso ficará visível até você fechá-lo ou a meta receber uma nova atualização.</small></div><button type="button" aria-label="Fechar aviso"><i class="fa-solid fa-xmark"></i></button>`;
    hero.insertAdjacentElement("afterend", alert);
    alert.querySelector("button").addEventListener("click", () => { localStorage.setItem(dismissKey, "1"); alert.remove(); });
  }

  function addLightBeam() {
    if (document.body.dataset.moduleId !== "home") return;
    const visual = document.querySelector(".home-hero-visual");
    if (!visual || visual.querySelector(".home-light-beam")) return;
    visual.insertAdjacentHTML("afterbegin", '<span class="home-light-beam"></span><span class="home-light-beam beam-two"></span>');
  }


  function ensureCollapsedBrand() {
    const sidebar = document.querySelector("#sidebar, .module-sidebar");
    const topbar = document.querySelector(".topbar, .module-topbar");
    if (!sidebar || !topbar || ["portal-paciente","home"].includes(document.body.dataset.moduleId)) return;
    if (topbar.querySelector(".lag-collapsed-brand, .topbar-brand, .lag-standard-topbar-brand")) return;

    const brand = document.createElement("a");
    brand.className = "lag-collapsed-brand";
    brand.href = "../home-page/index.html";
    brand.setAttribute("aria-label", "LAG Controller — Home");
    brand.innerHTML = `
      <span class="lag-collapsed-brand-mark"><img class="lag-theme-logo" src="../assets/images/logo-lag-badge.png" data-logo-light="../assets/images/logo-lag-badge.png" data-logo-dark="../assets/images/logo-lag-badge.png" alt=""></span>
      <span class="lag-collapsed-brand-copy"><strong>LAG Controller</strong><small>Painel interno</small></span>`;

    const menu = topbar.querySelector("#menuButton, #menuToggle, .menu-button, .sidebar-toggle");
    menu?.insertAdjacentElement("afterend", brand);
    if (!menu) topbar.prepend(brand);
  }


  function ensureGlobalUnitContext() {
    const sidebar = document.querySelector("#sidebar, .module-sidebar");
    const topbar = document.querySelector(".topbar, .module-topbar");
    if (!sidebar || !topbar || document.body.dataset.moduleId === "portal-paciente") return;

    let context = topbar.querySelector(".lag-global-unit-context, .home-topbar-context, .profile-topbar-context, .goals-page-context");
    if (!context) {
      context = document.createElement("div");
      context.className = "lag-global-unit-context";
      context.setAttribute("aria-label", "Contexto da unidade");
      context.innerHTML = `<span>Central operacional</span><strong>Painel da unidade</strong><small><i class="fa-solid fa-location-dot"></i> <b data-active-city></b><i class="context-separator"></i><em data-current-user-role></em></small>`;
      const menu = topbar.querySelector("#menuButton, #menuToggle, .menu-button, .sidebar-toggle");
      menu?.insertAdjacentElement("afterend", context);
      if (!menu) topbar.prepend(context);
    } else {
      context.classList.add("lag-global-unit-context");
      context.innerHTML = `<span>Central operacional</span><strong>Painel da unidade</strong><small><i class="fa-solid fa-location-dot"></i> <b data-active-city></b><i class="context-separator"></i><em data-current-user-role></em></small>`;
    }
    updateGlobalUnitContext();
  }

  function updateGlobalUnitContext() {
    const api = settings();
    const user = api?.getCurrentUser?.();
    const city = api?.getActiveCity?.() || user?.unit || "Cerquilho";
    const userRole = api?.roleLabel?.(user?.role) || "Perfil";
    document.querySelectorAll(".lag-global-unit-context [data-active-city]").forEach(node => { node.textContent = city; });
    document.querySelectorAll(".lag-global-unit-context [data-current-user-role]").forEach(node => { node.textContent = userRole; });
  }


  function applyManagerLinks() {
    const allowed = ["admin", "administrador", "gerente"].includes(role());
    document.querySelectorAll('a[href*="contratacao-medicos"], [data-module-id="candidatos"]').forEach(link => {
      link.hidden = !allowed;
      link.classList.toggle("lag-permission-hidden", !allowed);
    });
  }

  function enforceCandidateAccess() {
    if (document.body.dataset.moduleId !== "candidatos") return;
    if (["admin", "administrador", "gerente"].includes(role())) return;
    document.body.innerHTML = `<main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#f4f8fd;font-family:Inter,sans-serif"><section style="max-width:560px;padding:34px;border:1px solid #d9e5f1;border-radius:24px;background:white;text-align:center;box-shadow:0 24px 60px rgba(15,52,94,.12)"><span style="width:64px;height:64px;margin:auto;display:grid;place-items:center;border-radius:20px;background:#e8f2ff;color:#147cf3;font-size:24px"><i class="fa-solid fa-lock"></i></span><h1 style="margin:18px 0 8px;color:#0b2442">Acesso exclusivo da Gerência</h1><p style="color:#667b92;line-height:1.65">A aba Candidatos médicos está disponível somente para usuários com perfil Gerente ou Administrador.</p><a href="../home-page/index.html" style="display:inline-flex;margin-top:14px;padding:12px 18px;border-radius:12px;background:#147cf3;color:white;text-decoration:none;font-weight:800">Voltar para a Home</a></section></main>`;
  }

  function init() {
    dynamicGreeting();
    addLightBeam();
    ensureGlobalUnitContext();
    ensureCollapsedBrand();
    applyManagerLinks();
    enforceCandidateAccess();
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("storage", event => {
    if ([SNAPSHOT_KEY, "lag-current-user-id", "lag-active-city"].includes(event.key)) {
      window.LAGNotifications?.refresh?.();
      dynamicGreeting();
    }
  });
  window.addEventListener("lag:settings-changed", () => { window.LAGNotifications?.refresh?.(); dynamicGreeting(); updateGlobalUnitContext(); });
  window.LAGExperience = { unitMetric };
})();
