(() => {
  "use strict";

  function isPublicPage() {
    const path = location.pathname;
    return document.body?.dataset.publicPage === "true"
      || path.includes("/cadastro-medico/")
      || path.includes("/portal-paciente/")
      || document.body?.classList.contains("lag-auth-page");
  }

  function topbar() {
    return document.querySelector("header.topbar, header.module-topbar, .topbar.control-common-topbar");
  }

  function makeBrand(isHome) {
    const link = document.createElement("a");
    link.className = "lag-standard-topbar-brand";
    link.href = isHome ? "./index.html" : "../home-page/index.html";
    link.innerHTML = `
      <img class="lag-theme-logo" src="../assets/images/logo-lag-badge.png" data-logo-light="../assets/images/logo-lag-badge.png" data-logo-dark="../assets/images/logo-lag-badge.png" alt="LAG Controller">
      <span><strong>LAG Controller</strong><small>Portal interno</small></span>`;
    return link;
  }

  function findDirect(parent, selectors) {
    for (const selector of selectors) {
      const match = [...parent.children].find(child => child.matches?.(selector));
      if (match) return match;
    }
    return null;
  }

  function ensureCenterZone(header) {
    let zone = findDirect(header, [".lag-topbar-center-zone"]);
    if (zone) return zone;

    const search = findDirect(header, [
      ".global-search", ".topbar-search", ".control-global-search", ".profile-search", ".topic-breadcrumb", "label[class*='search']"
    ]) || header.querySelector("input[type='search']")?.closest("label, div");

    zone = document.createElement("div");
    zone.className = "lag-topbar-center-zone";
    if (search) zone.appendChild(search);
    header.appendChild(zone);
    return zone;
  }

  function ensureCityControl(zone) {
    let city = zone.querySelector(".lag-global-city-control");
    if (city) return city;
    const settings = window.LAGSettings;
    const user = settings?.getCurrentUser?.() || window.__LAG_CLOUD__?.user || {};
    const active = settings?.getActiveCity?.() || user.unit || user.city || "Cerquilho";
    city = document.createElement("div");
    city.className = "lag-global-city-control is-locked lag-fixed-city-badge";
    city.setAttribute("aria-label", `Cidade vinculada: ${active}`);
    city.innerHTML = `<i class="fa-solid fa-location-dot"></i><strong>${String(active).replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</strong>`;
    zone.appendChild(city);
    return city;
  }

  function ensureActions(header) {
    let actions = findDirect(header, [".topbar-actions", ".topbar-menu"]);
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "topbar-actions";
      header.appendChild(actions);
    }
    return actions;
  }

  function standardize(allowCityFallback = false) {
    if (isPublicPage()) return;
    const header = topbar();
    if (!header || header.classList.contains("lag-clean-topbar")) return;

    const isHome = document.body?.dataset.moduleId === "home" || location.pathname.includes("/home-page/");
    header.classList.add("lag-topbar-standardized");

    const menu = header.querySelector(":scope > #menuButton, :scope > #menuToggle, :scope > .menu-button, :scope > .sidebar-toggle")
      || document.getElementById("menuButton") || document.getElementById("menuToggle");
    if (menu) menu.classList.add("lag-standard-menu");

    let brand = header.querySelector(":scope > .lag-standard-topbar-brand");
    if (!brand) {
      const existing = findDirect(header, [".topbar-brand"]);
      if (existing) {
        existing.classList.add("lag-standard-topbar-brand");
        brand = existing;
      } else {
        brand = makeBrand(isHome);
        if (menu?.nextSibling) header.insertBefore(brand, menu.nextSibling);
        else header.prepend(brand);
      }
    }

    const zone = ensureCenterZone(header);
    if (zone.querySelector(".lag-global-city-control")) {
      // O controle global já foi criado pelo script original.
    } else if (allowCityFallback) {
      ensureCityControl(zone);
    }
    const actions = ensureActions(header);

    const profile = header.querySelector(".profile-button, .topbar-profile");
    if (profile && profile.parentElement !== actions) actions.appendChild(profile);

    // Mantém o host de notificações dentro das ações, sem alterar sua lógica.
    const notificationHost = header.querySelector(".lag-notification-host, .lag-notification-wrap");
    if (notificationHost && notificationHost.parentElement !== actions) actions.insertBefore(notificationHost, actions.firstChild);

    // Garante a ordem exata sem remover elementos funcionais.
    if (menu) header.appendChild(menu);
    header.appendChild(brand);
    header.appendChild(zone);
    header.appendChild(actions);
  }

  function run() {
    standardize(false);
    setTimeout(() => standardize(true), 60);
    setTimeout(() => standardize(true), 240);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();

  window.addEventListener("lag:settings-changed", () => setTimeout(() => standardize(true), 0));
})();
