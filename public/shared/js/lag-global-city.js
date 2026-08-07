(() => {
  "use strict";

  const SOURCE_IDS = [
    "homeCitySelect", "dashboardCity", "controlCidadeSelect", "partnerCity", "managementCity",
    "profileHeaderUnit", "odCity", "dreCity", "candidateCity", "citySelect"
  ];

  function skipPage() {
    return document.body?.dataset.publicPage === "true"
      || location.pathname.includes("/cadastro-medico/")
      || location.pathname.includes("/portal-paciente/")
      || ["/", "/index.html"].includes(location.pathname);
  }

  function activeCity() {
    const settings = window.LAGSettings;
    const user = settings?.getCurrentUser?.() || window.__LAG_CLOUD__?.user || {};
    return settings?.getActiveCity?.(user) || user.unit || user.city || "Cerquilho";
  }

  function sourceValue(select, city) {
    if (select.id === "dreCity") return city === "Todas as cidades" ? "consolidado" : city;
    if (select.id === "candidateCity") return city === "Todas as cidades" ? "" : city;
    return city;
  }

  function lockPageControls(city) {
    SOURCE_IDS.map(id => document.getElementById(id)).filter(Boolean).forEach(select => {
      const mapped = sourceValue(select, city);
      if ([...select.options].some(option => option.value === mapped)) {
        const changed = select.value !== mapped;
        select.value = mapped;
        if (changed) select.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const wrapper = select.closest("label, .unit-select-wrap, #homeCityControl");
      wrapper?.classList.add("lag-original-city-control-hidden");
    });
    document.querySelectorAll("[data-active-city]").forEach(node => { node.textContent = city; });
  }

  function buildFixedCityBadge(city) {
    const topbar = document.querySelector("header.topbar, header.module-topbar, .topbar.control-common-topbar");
    if (!topbar || topbar.querySelector(".lag-global-city-control")) return;
    const search = [...topbar.children].find(child => child.matches?.(".global-search, .topbar-search, .control-global-search, .profile-search, label[class*='search']"))
      || topbar.querySelector("input[type='search']")?.closest("label, div");
    if (!search) return;
    let zone = [...topbar.children].find(child => child.classList?.contains("lag-topbar-center-zone"));
    if (!zone) {
      zone = document.createElement("div");
      zone.className = "lag-topbar-center-zone";
      topbar.insertBefore(zone, search);
      zone.appendChild(search);
    }
    const badge = document.createElement("div");
    badge.className = "lag-global-city-control is-locked lag-fixed-city-badge";
    badge.setAttribute("aria-label", `Cidade vinculada: ${city}`);
    badge.innerHTML = `<i class="fa-solid fa-location-dot" aria-hidden="true"></i><strong>${String(city).replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</strong>`;
    zone.appendChild(badge);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (skipPage()) return;
    const city = activeCity();
    lockPageControls(city);
    setTimeout(() => buildFixedCityBadge(city), 0);
  });
})();
