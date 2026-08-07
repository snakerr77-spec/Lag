(() => {
  "use strict";

  const STORE_KEY = "lag-global-notifications-v2";
  const DISMISSED_KEY = "lag-global-notifications-dismissed-v2";
  const GOAL_KEY = "lag-goal-snapshot-v1";
  const WEEKLY_KEY = "lag-weekly-alert-v1";
  const MANAGEMENT_GOALS_KEY = "lag-management-goals-v2";
  const HOST_SELECTORS = [
    ".topbar-actions",
    ".topbar-menu",
    ".header-actions",
    ".module-actions",
    ".profile-actions",
    ".top-actions"
  ];

  const safeJSON = (value, fallback) => {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  };

  const normalizeText = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  function settings() {
    return window.LAGSettings || null;
  }

  function user() {
    return settings()?.getCurrentUser?.() || {
      id: localStorage.getItem("lag-current-user-id") || "local-user",
      name: "Usuário",
      role: "colaborador",
      unit: localStorage.getItem("lag-active-city") || "Cerquilho"
    };
  }

  function city() {
    return settings()?.getActiveCity?.() || user().unit || "Cerquilho";
  }

  function userScope() {
    const current = user();
    return `${current.id || current.email || current.name || "local-user"}:${city()}`;
  }

  function readStore() {
    const value = safeJSON(localStorage.getItem(STORE_KEY), []);
    return Array.isArray(value) ? value : [];
  }

  function writeStore(items) {
    localStorage.setItem(STORE_KEY, JSON.stringify(items));
  }

  function readDismissed() {
    const value = safeJSON(localStorage.getItem(DISMISSED_KEY), {});
    return value && typeof value === "object" ? value : {};
  }

  function writeDismissed(value) {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(value));
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2
    }).format(Number(value) || 0);
  }

  function createId(prefix = "notification") {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function currentPeriod() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  function managementGoalStore() {
    const store = safeJSON(localStorage.getItem(MANAGEMENT_GOALS_KEY), null);
    return store && store.version === 2 && store.periods ? store : null;
  }

  function cityKeys(value) {
    const normalized = String(value || "");
    if (normalizeText(normalized) === "todas as cidades") return ["Cerquilho", "Tatuí", "Embu das Artes", "Itapeva"];
    return [normalized, normalized === "Tatui" ? "Tatuí" : normalized === "Tatuí" ? "Tatui" : normalized];
  }

  function managementMetricsForCity(store, period, currentCity) {
    for (const key of cityKeys(currentCity)) {
      const metrics = store?.periods?.[period]?.[key];
      if (Array.isArray(metrics)) return metrics;
    }
    return [];
  }

  function hasManagementGoalsForCity(currentCity = city()) {
    const store = managementGoalStore();
    if (!store) return false;
    const period = store.activePeriod || currentPeriod();
    if (normalizeText(currentCity) === "todas as cidades") {
      return cityKeys(currentCity).some(key => managementMetricsForCity(store, period, key).some(metric => Number(metric.target) > 0));
    }
    return managementMetricsForCity(store, period, currentCity).some(metric => Number(metric.target) > 0);
  }

  function managementGoalNotifications() {
    const store = managementGoalStore();
    if (!store) return [];
    const period = store.activePeriod || currentPeriod();
    const currentCity = city();
    const cities = normalizeText(currentCity) === "todas as cidades" ? cityKeys(currentCity) : [currentCity];
    const items = [];

    cities.forEach(unitCity => {
      const metrics = managementMetricsForCity(store, period, unitCity);
      metrics.forEach(metric => {
        const target = Number(metric.target || 0);
        const result = Number(metric.result || 0);
        if (!target || result >= target) return;
        const achieved = Math.max(0, (result / target) * 100);
        const missingPercent = Math.max(0, 100 - achieved);
        const missingValue = Math.max(0, target - result);
        const missingLabel = (missingPercent < 10 ? missingPercent.toFixed(1) : Math.round(missingPercent).toString()).replace(".", ",");
        const achievedLabel = (achieved < 10 ? achieved.toFixed(1) : Math.round(achieved).toString()).replace(".", ",");
        const severity = achieved < 75 ? "danger" : "warning";
        const isCurrency = metric.type === "currency";
        const valueFormatter = isCurrency
          ? formatMoney
          : value => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(Number(value) || 0);
        items.push({
          id: `management-goal:${unitCity}:${period}:${metric.id || normalizeText(metric.name)}:${Math.round(target * 100)}:${Math.round(result * 100)}`,
          type: "management-goal",
          severity,
          title: `${severity === "danger" ? "Meta crítica" : "Meta abaixo"} — ${metric.name || "Indicador"}`,
          message: `Faltam ${missingLabel}% para ${unitCity} atingir esta meta.`,
          details: [
            `Atingido: ${achievedLabel}%`,
            `Falta: ${valueFormatter(missingValue)}`,
            `Resultado: ${valueFormatter(result)} de ${valueFormatter(target)}`
          ],
          city: unitCity,
          audience: "all",
          action: { label: "Abrir Gestão e metas", href: "gestao/index.html" },
          persistentHome: true,
          createdAt: store.updatedAt || new Date().toISOString()
        });
      });
    });

    return items
      .sort((a, b) => (a.severity === "danger" ? -1 : 1) - (b.severity === "danger" ? -1 : 1))
      .slice(0, 20);
  }

  function goalNotification() {
    if (hasManagementGoalsForCity()) return null;
    const snapshot = safeJSON(localStorage.getItem(GOAL_KEY), null);
    const currentCity = city();
    const cityVariants = [currentCity, currentCity === "Tatui" ? "Tatuí" : currentCity === "Tatuí" ? "Tatui" : currentCity];
    let unit = cityVariants.map((key) => snapshot?.units?.[key]).find(Boolean);
    let updatedAt = snapshot?.updatedAt || "current";
    if (!unit) {
      const cities = window.LAG_DRIVE_MANIFEST?.cities || {};
      const records = cityVariants.map((key) => cities[key]).find((value) => Array.isArray(value) && value.length) || [];
      const record = Array.isArray(records) ? records[0] : null;
      if (record) {
        unit = {
          current: Number(record.summary?.result || record.dashboardData?.resumo?.geral?.faturamento || 0),
          goal: Number(record.summary?.goal || 0),
          pending: Number(record.summary?.pending || 0)
        };
        updatedAt = record.modifiedAt || window.LAG_DRIVE_MANIFEST?.syncedAt || "drive";
      }
    }
    if (!unit) return null;

    const current = Number(unit.current || 0);
    const goal = Number(unit.goal || 0);
    if (unit.hasGoal === false) return null;
    if (!goal) {
      return {
        id: `goal-missing:${currentCity}:${updatedAt}`,
        type: "goal",
        severity: "warning",
        title: `Meta não cadastrada — ${currentCity}`,
        message: "Defina uma meta para ativar o acompanhamento automático da unidade.",
        details: [current ? `Resultado atual: ${formatMoney(current)}` : "Sem resultado consolidado"],
        city: currentCity,
        audience: "all",
        action: { label: "Abrir Gestão e metas", href: "gestao/index.html" },
        persistentHome: true,
        createdAt: updatedAt || new Date().toISOString()
      };
    }

    const percent = Math.round((current / goal) * 100);
    if (percent >= 100) return null;
    const severity = percent < 75 ? "danger" : "warning";
    return {
      id: `goal-low:${currentCity}:${updatedAt}:${percent}`,
      type: "goal",
      severity,
      title: percent < 75 ? `Meta crítica — ${currentCity}` : `Meta abaixo do esperado — ${currentCity}`,
      message: percent < 75
        ? "O resultado da unidade está abaixo do nível seguro. Revise pendências e ações da equipe."
        : "A unidade ainda não atingiu a meta definida para o período.",
      details: [`${percent}% da meta`, `Resultado: ${formatMoney(current)}`, `Meta: ${formatMoney(goal)}`],
      city: currentCity,
      audience: "all",
      action: { label: "Ver Gestão e metas", href: "gestao/index.html" },
      persistentHome: true,
      createdAt: updatedAt || new Date().toISOString()
    };
  }

  function pendingNotification() {
    const snapshot = safeJSON(localStorage.getItem(GOAL_KEY), null);
    const currentCity = city();
    const cityVariants = [currentCity, currentCity === "Tatui" ? "Tatuí" : currentCity === "Tatuí" ? "Tatui" : currentCity];
    const unit = cityVariants.map((key) => snapshot?.units?.[key]).find(Boolean);
    const pending = Number(unit?.pending || 0);
    if (pending < 8) return null;
    return {
      id: `pending:${currentCity}:${snapshot?.updatedAt || "current"}:${pending}`,
      type: "pending",
      severity: pending >= 12 ? "danger" : "info",
      title: `Pendências da unidade — ${currentCity}`,
      message: `${pending} itens ainda precisam de acompanhamento pela equipe.`,
      details: [`${pending} pendências abertas`],
      city: currentCity,
      audience: "all",
      action: { label: "Abrir Controladoria", href: "controladoria/index.html" },
      createdAt: snapshot?.updatedAt || new Date().toISOString()
    };
  }

  function scheduledWeeklyNotification() {
    const cfg = safeJSON(localStorage.getItem(WEEKLY_KEY), null);
    if (!cfg?.popup) return null;
    const now = new Date();
    if (now.getDay() !== 1 || now.getHours() < 8) return null;
    const day = now.toISOString().slice(0, 10);
    return {
      id: `weekly:${city()}:${day}`,
      type: "weekly",
      severity: "info",
      title: "Resumo semanal disponível",
      message: "O resultado da semana anterior e a próxima meta estão prontos para revisão.",
      details: ["Segunda-feira, após 8h"],
      city: city(),
      audience: "all",
      action: { label: "Abrir Gestão e metas", href: "gestao/index.html" },
      createdAt: now.toISOString()
    };
  }

  function audienceMatches(item) {
    const currentUser = user();
    const currentRole = settings()?.normalizeRole?.(currentUser.role) || normalizeText(currentUser.role);
    const currentCity = normalizeText(city());
    const itemCity = normalizeText(item.city || "all");
    const roles = Array.isArray(item.roles) ? item.roles.map(normalizeText) : [];
    const cityAllowed = !itemCity || itemCity === "all" || itemCity === "todas" || itemCity === currentCity;
    const roleAllowed = !roles.length || roles.includes(currentRole);
    const notExpired = !item.expiresAt || new Date(item.expiresAt).getTime() > Date.now();
    return cityAllowed && roleAllowed && notExpired;
  }

  function allNotifications() {
    const system = [...managementGoalNotifications(), goalNotification(), pendingNotification(), scheduledWeeklyNotification()].filter(Boolean);
    const custom = readStore().filter(audienceMatches);
    const dismissed = readDismissed()[userScope()] || {};
    return [...system, ...custom]
      .filter((item) => !dismissed[item.id])
      .sort((a, b) => {
        const rank = { danger: 4, warning: 3, info: 2, success: 1 };
        return (rank[b.severity] || 0) - (rank[a.severity] || 0) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  }

  function resolveHref(href) {
    if (!href) return "";
    if (/^(https?:|mailto:|tel:|#)/.test(href)) return href;
    const depth = location.pathname.split("/").filter(Boolean).length;
    if (location.protocol === "file:") {
      if (href.startsWith("../")) return href;
      return `../${href.replace(/^\.\//, "")}`;
    }
    if (href.startsWith("../")) return href;
    return `${depth > 1 ? "../" : ""}${href.replace(/^\.\//, "")}`;
  }

  function findHost() {
    for (const selector of HOST_SELECTORS) {
      const host = document.querySelector(selector);
      if (host) return host;
    }
    const topbar = document.querySelector(".topbar, header");
    if (topbar) {
      const host = document.createElement("div");
      host.className = "lag-notification-fallback-host";
      topbar.appendChild(host);
      return host;
    }
    return document.body;
  }

  function ensureCenter() {
    if (document.querySelector(".lag-global-notifications")) return;
    const host = findHost();
    [...host.querySelectorAll("button, a")].forEach((element) => {
      const label = `${element.getAttribute("aria-label") || ""} ${element.id || ""} ${element.className || ""}`;
      if (/notifica|notification/i.test(label) && !element.closest(".lag-global-notifications")) {
        element.hidden = true;
        element.setAttribute("aria-hidden", "true");
      }
    });
    const wrap = document.createElement("div");
    wrap.className = `lag-global-notifications${host === document.body ? " is-floating" : ""}`;
    wrap.innerHTML = `
      <button class="lag-global-notification-button" type="button" aria-label="Abrir notificações" aria-expanded="false">
        <i class="fa-regular fa-bell"></i>
        <span class="lag-global-notification-count" hidden>0</span>
      </button>
      <section class="lag-global-notification-panel" hidden aria-label="Central de notificações">
        <header class="lag-global-notification-head">
          <div><strong>Notificações</strong><small>Avisos do seu perfil e unidade</small></div>
          <button type="button" data-notification-clear>Limpar visíveis</button>
        </header>
        <div class="lag-global-notification-list"></div>
      </section>`;
    host.insertBefore(wrap, host.firstChild);

    const button = wrap.querySelector(".lag-global-notification-button");
    const panel = wrap.querySelector(".lag-global-notification-panel");
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      panel.hidden = !panel.hidden;
      button.setAttribute("aria-expanded", String(!panel.hidden));
    });
    panel.addEventListener("click", (event) => event.stopPropagation());
    panel.querySelector("[data-notification-clear]").addEventListener("click", () => {
      allNotifications().forEach((item) => dismiss(item.id, false));
      refresh();
    });
    document.addEventListener("click", () => {
      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
    });
  }

  function severityIcon(severity) {
    return severity === "danger" ? "fa-triangle-exclamation"
      : severity === "warning" ? "fa-bullseye"
      : severity === "success" ? "fa-circle-check"
      : "fa-circle-info";
  }

  function renderCenter() {
    const wrap = document.querySelector(".lag-global-notifications");
    if (!wrap) return;
    const items = allNotifications();
    const count = wrap.querySelector(".lag-global-notification-count");
    const list = wrap.querySelector(".lag-global-notification-list");
    const button = wrap.querySelector(".lag-global-notification-button");
    count.hidden = !items.length;
    count.textContent = String(items.length);
    button.classList.toggle("has-alert", items.some((item) => ["danger", "warning"].includes(item.severity)));

    if (!items.length) {
      list.innerHTML = `<div class="lag-global-notification-empty"><i class="fa-regular fa-circle-check"></i><strong>Tudo em ordem</strong><span>Nenhum alerta importante no momento.</span></div>`;
      return;
    }

    list.innerHTML = items.map((item) => `
      <article class="lag-global-notification-item is-${item.severity || "info"}" data-notification-id="${item.id}">
        <span class="lag-global-notification-icon"><i class="fa-solid ${severityIcon(item.severity)}"></i></span>
        <div class="lag-global-notification-copy">
          <div class="lag-global-notification-title-row"><strong>${escapeHTML(item.title)}</strong><button type="button" data-notification-dismiss="${item.id}" aria-label="Tirar notificação"><i class="fa-solid fa-xmark"></i></button></div>
          <p>${escapeHTML(item.message || "")}</p>
          ${Array.isArray(item.details) && item.details.length ? `<div class="lag-global-notification-tags">${item.details.map((detail) => `<span>${escapeHTML(detail)}</span>`).join("")}</div>` : ""}
          ${item.action?.href ? `<a class="lag-global-notification-action" href="${resolveHref(item.action.href)}">${escapeHTML(item.action.label || "Abrir")} <i class="fa-solid fa-arrow-right"></i></a>` : ""}
        </div>
      </article>`).join("");

    list.querySelectorAll("[data-notification-dismiss]").forEach((button) => {
      button.addEventListener("click", () => dismiss(button.dataset.notificationDismiss));
    });
  }

  function renderHomeBanner() {
    if (document.body.dataset.moduleId !== "home") return;
    document.querySelectorAll(".lag-global-home-alert").forEach((node) => node.remove());
    const item = allNotifications().find((notification) => notification.persistentHome || ["danger", "warning"].includes(notification.severity));
    if (!item) return;
    const hero = document.querySelector(".home-hero");
    if (!hero) return;
    const alert = document.createElement("section");
    alert.className = `lag-global-home-alert is-${item.severity || "warning"}`;
    alert.innerHTML = `
      <span class="lag-global-home-alert-icon"><i class="fa-solid ${severityIcon(item.severity)}"></i></span>
      <div><strong>${escapeHTML(item.title)}</strong><p>${escapeHTML(item.message || "")}</p>${Array.isArray(item.details) ? `<div>${item.details.map((detail) => `<span>${escapeHTML(detail)}</span>`).join("")}</div>` : ""}</div>
      ${item.action?.href ? `<a href="${resolveHref(item.action.href)}">${escapeHTML(item.action.label || "Abrir")}</a>` : ""}
      <button type="button" data-home-alert-dismiss aria-label="Fechar alerta"><i class="fa-solid fa-xmark"></i></button>`;
    hero.insertAdjacentElement("afterend", alert);
    alert.querySelector("[data-home-alert-dismiss]").addEventListener("click", () => dismiss(item.id));
  }

  function escapeHTML(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function dismiss(id, doRefresh = true) {
    const dismissed = readDismissed();
    const scope = userScope();
    dismissed[scope] = dismissed[scope] || {};
    dismissed[scope][id] = Date.now();
    writeDismissed(dismissed);
    if (doRefresh) refresh();
  }

  function push(notification = {}) {
    const item = {
      id: notification.id || createId("custom"),
      severity: notification.severity || "info",
      title: notification.title || "Nova notificação",
      message: notification.message || "",
      details: Array.isArray(notification.details) ? notification.details : [],
      city: notification.city || "all",
      roles: Array.isArray(notification.roles) ? notification.roles : [],
      action: notification.action || null,
      createdAt: notification.createdAt || new Date().toISOString(),
      expiresAt: notification.expiresAt || null,
      persistentHome: Boolean(notification.persistentHome)
    };
    const store = readStore();
    const index = store.findIndex((existing) => existing.id === item.id);
    if (index >= 0) store[index] = item;
    else store.unshift(item);
    writeStore(store.slice(0, 100));
    refresh();
    return item.id;
  }

  function remove(id) {
    writeStore(readStore().filter((item) => item.id !== id));
    refresh();
  }

  function refresh() {
    ensureCenter();
    renderCenter();
    renderHomeBanner();
  }

  function init() {
    ensureCenter();
    refresh();
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("storage", (event) => {
    if ([STORE_KEY, DISMISSED_KEY, GOAL_KEY, WEEKLY_KEY, MANAGEMENT_GOALS_KEY, "lag-active-city", "lag-current-user-id"].includes(event.key)) refresh();
  });
  window.addEventListener("lag:settings-changed", refresh);
  window.addEventListener("lag:notifications-changed", refresh);

  window.LAGNotifications = {
    push,
    remove,
    dismiss,
    refresh,
    list: allNotifications
  };
})();
