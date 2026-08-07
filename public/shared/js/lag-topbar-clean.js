(() => {
  "use strict";

  const PUBLIC_PATHS = ["/cadastro-medico/", "/portal-paciente/"];
  const CITY_OPTIONS = ["Todas as cidades", "Cerquilho", "Tatuí", "Embu das Artes", "Itapeva"];
  const SOURCE_CITY_IDS = [
    "homeCitySelect", "dashboardCity", "controlCidadeSelect", "partnerCity",
    "managementCity", "profileHeaderUnit", "odCity", "dreCity",
    "candidateCity", "citySelect"
  ];

  let applying = false;
  let scheduled = 0;

  function isPublicPage() {
    const path = location.pathname;
    return document.body?.dataset.publicPage === "true"
      || document.body?.classList.contains("lag-auth-page")
      || PUBLIC_PATHS.some(part => path.includes(part));
  }

  function getTopbar() {
    return document.querySelector("header.topbar, header.module-topbar, .topbar.control-common-topbar");
  }

  function directMatch(parent, selector) {
    return [...(parent?.children || [])].find(child => child.matches?.(selector)) || null;
  }

  function getSearch(header) {
    const known = header.querySelector(".global-search, .topbar-search, .control-global-search, .profile-search, .topic-breadcrumb, label[class*='search']");
    if (known) return known;
    const input = header.querySelector("input[type='search'], input[id*='Search'], input[id*='search']");
    if (!input) return null;
    return input.closest("label, div") || input;
  }

  function settings() {
    return window.LAGSettings || null;
  }

  function activeCity() {
    const api = settings();
    const user = api?.getCurrentUser?.() || {};
    return api?.getActiveCity?.() || user.unit || localStorage.getItem("lag-active-city") || "Cerquilho";
  }

  function canSwitchCity() {
    const api = settings();
    const user = api?.getCurrentUser?.() || {};
    return Boolean(api?.canSwitchCity?.(user));
  }

  function hideOriginalCityControls() {
    SOURCE_CITY_IDS.forEach(id => {
      const select = document.getElementById(id);
      if (!select || select.id === "lagGlobalCitySelect") return;
      let wrapper = select.closest("label, .unit-select-wrap, .city-select-wrap, .filter-field") || select;
      wrapper.classList.add("lag-clean-original-city-hidden");
    });
  }

  function syncOriginalCityControls(value) {
    SOURCE_CITY_IDS.forEach(id => {
      const select = document.getElementById(id);
      if (!select || select.id === "lagGlobalCitySelect") return;
      let mapped = value;
      if (id === "dreCity") mapped = value === "Todas as cidades" ? "consolidado" : value;
      if (id === "candidateCity") mapped = value === "Todas as cidades" ? "" : value;
      if ([...select.options].some(option => option.value === mapped)) {
        select.value = mapped;
      }
    });
    document.querySelectorAll("[data-active-city]").forEach(node => {
      node.textContent = value;
    });
  }

  function ensureCityControl() {
    let control = document.querySelector(".lag-global-city-control");
    if (control) return control;

    const city = activeCity();
    const switchAllowed = canSwitchCity();

    control = document.createElement("div");
    control.className = `lag-global-city-control${switchAllowed ? "" : " is-locked lag-fixed-city-badge"}`;

    if (switchAllowed) {
      control.setAttribute("aria-label", "Selecionar cidade em uso");
      control.innerHTML = `
        <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
        <select id="lagGlobalCitySelect" aria-label="Cidade em uso">
          ${CITY_OPTIONS.map(option => `<option value="${option}">${option}</option>`).join("")}
        </select>
      `;
      const select = control.querySelector("#lagGlobalCitySelect");
      select.value = city;
      select.addEventListener("change", event => {
        const nextCity = event.target.value;
        const api = settings();
        if (!api?.setActiveCity?.(nextCity, true)) {
          event.target.value = activeCity();
        }
      });
    } else {
      control.setAttribute("aria-label", `Cidade vinculada: ${city}`);
      control.innerHTML = `<i class="fa-solid fa-location-dot" aria-hidden="true"></i><strong>${String(city).replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</strong>`;
    }

    syncOriginalCityControls(city);
    return control;
  }

  function ensureLeft(header) {
    let left = directMatch(header, ".lag-clean-topbar-left");
    if (!left) {
      left = document.createElement("div");
      left.className = "lag-clean-topbar-left";
      header.prepend(left);
    }
    return left;
  }

  function ensureCenter(header) {
    let center = directMatch(header, ".lag-clean-topbar-center");
    if (!center) {
      center = document.createElement("div");
      center.className = "lag-clean-topbar-center";
      header.appendChild(center);
    }
    return center;
  }

  function ensureRight(header) {
    let right = directMatch(header, ".lag-clean-topbar-right");
    if (right) return right;

    const existingActions = directMatch(header, ".topbar-actions, .topbar-menu");
    if (existingActions) {
      right = existingActions;
      right.classList.add("lag-clean-topbar-right", "topbar-actions");
    } else {
      right = document.createElement("div");
      right.className = "topbar-actions lag-clean-topbar-right";
      header.appendChild(right);
    }
    return right;
  }

  function organizeLeft(header, left, center, right, search) {
    const menu = header.querySelector("#menuButton, #menuToggle, .menu-button, .sidebar-toggle");
    if (menu && menu.parentElement !== left) left.appendChild(menu);

    const candidates = [...header.children].filter(node => node !== left && node !== center && node !== right);
    candidates.forEach(node => {
      if (node === search || node.contains?.(search)) return;
      if (node.matches?.(".lag-global-city-control, .lag-global-notifications, .lag-notification-host, .lag-notification-wrap, .profile-button, .topbar-profile")) return;
      if (node.matches?.("script, style")) return;
      left.appendChild(node);
    });

    const leftChildren = [...left.children];
    leftChildren.forEach(node => {
      if (node !== menu && node.matches?.(".icon-button, #themeButton, .module-theme-button")) {
        node.classList.add("lag-topbar-extra-action");
      }
    });
  }

  function organizeCenter(center, search) {
    if (!search) return;
    if (search.parentElement !== center) center.appendChild(search);
    search.classList.add("lag-clean-search");
  }

  function organizeRight(header, right) {
    const city = ensureCityControl();
    const notification = header.querySelector(".lag-global-notifications, .lag-notification-host, .lag-notification-wrap")
      || document.querySelector(".lag-global-notifications");
    const profile = header.querySelector(".profile-button, .topbar-profile")
      || right.querySelector(".profile-button, .topbar-profile");

    if (city.parentElement !== right) right.appendChild(city);
    if (notification && notification.parentElement !== right) right.appendChild(notification);
    if (profile && profile.parentElement !== right) right.appendChild(profile);

    [...right.children].forEach(node => {
      const keep = node === city || node === notification || node === profile || node.matches?.(".lag-global-notifications, .lag-notification-host, .lag-notification-wrap");
      node.classList.toggle("lag-topbar-extra-action", !keep);
    });

    const currentNotification = right.querySelector(".lag-global-notifications, .lag-notification-host, .lag-notification-wrap");
    const desired = [city, currentNotification, profile].filter(Boolean);
    desired.forEach((node, index) => {
      const currentAtIndex = right.children[index];
      if (currentAtIndex !== node) right.insertBefore(node, currentAtIndex || null);
    });
  }

  function apply() {
    if (applying || isPublicPage()) return;
    const header = getTopbar();
    if (!header) return;

    applying = true;
    try {
      header.classList.add("lag-clean-topbar");
      const search = getSearch(header);
      const left = ensureLeft(header);
      const center = ensureCenter(header);
      const right = ensureRight(header);

      organizeLeft(header, left, center, right, search);
    // remove marcas duplicadas
    const brands = [...header.querySelectorAll(":scope > .lag-standard-topbar-brand, :scope > .topbar-brand, :scope > .lag-collapsed-brand, .lag-clean-topbar-left > .lag-standard-topbar-brand, .lag-clean-topbar-left > .topbar-brand, .lag-clean-topbar-left > .lag-collapsed-brand")];
    const primaryBrand = brands.find(node => node.classList.contains("lag-standard-topbar-brand") || node.classList.contains("topbar-brand"));
    brands.forEach(node => { if (primaryBrand && node !== primaryBrand) node.remove(); });
      organizeCenter(center, search);
      organizeRight(header, right);
      hideOriginalCityControls();
      syncOriginalCityControls(activeCity());

      if (header.children[0] !== left) header.prepend(left);
      if (left.nextElementSibling !== center) header.insertBefore(center, left.nextElementSibling);
      if (center.nextElementSibling !== right) header.insertBefore(right, center.nextElementSibling);
    } finally {
      applying = false;
    }
  }

  function schedule() {
    window.clearTimeout(scheduled);
    scheduled = window.setTimeout(apply, 25);
  }

  function start() {
    apply();
    window.setTimeout(apply, 80);
    window.setTimeout(apply, 260);
    window.setTimeout(apply, 700);

    const header = getTopbar();
    if (header) {
      const observer = new MutationObserver(schedule);
      observer.observe(header, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.addEventListener("lag:settings-changed", schedule);
})();
