(() => {
  "use strict";
  const byId = (id) => document.getElementById(id);

  function isMobile() { return window.matchMedia("(max-width: 980px)").matches; }
  function closeSidebar() {
    document.body.classList.remove("sidebar-mobile-open");
    byId("sidebar")?.classList.remove("open");
    byId("sidebarOverlay")?.classList.remove("show");
    byId("menuButton")?.setAttribute("aria-expanded", "false");
  }
  function toggleSidebar() {
    if (isMobile()) {
      const open = !byId("sidebar")?.classList.contains("open");
      byId("sidebar")?.classList.toggle("open", open);
      byId("sidebarOverlay")?.classList.toggle("show", open);
      document.body.classList.toggle("sidebar-mobile-open", open);
      byId("menuButton")?.setAttribute("aria-expanded", String(open));
      return;
    }
    const hidden = document.body.classList.toggle("sidebar-hidden");
    localStorage.setItem("lag-sidebar-hidden", String(hidden));
    byId("menuButton")?.setAttribute("aria-expanded", String(!hidden));
  }
  function syncGlobalSearch(value) {
    const target = document.querySelector(".tab-panel.active")?.id === "exames" ? byId("buscaExame") : byId("buscaMedico");
    if (!target) return;
    target.value = String(value || "");
    target.dispatchEvent(new Event("input", { bubbles: true }));
  }

  document.addEventListener("DOMContentLoaded", () => {
    const savedHidden = localStorage.getItem("lag-sidebar-hidden") === "true";
    if (!isMobile() && savedHidden) document.body.classList.add("sidebar-hidden");
    byId("menuButton")?.setAttribute("aria-expanded", String(!savedHidden));
    byId("menuButton")?.addEventListener("click", toggleSidebar);
    byId("sidebarOverlay")?.addEventListener("click", closeSidebar);
    document.querySelectorAll("#sidebar a").forEach((link) => link.addEventListener("click", () => { if (isMobile()) closeSidebar(); }));
    byId("moduleGlobalSearch")?.addEventListener("input", (event) => syncGlobalSearch(event.target.value));
    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        byId("moduleGlobalSearch")?.focus();
      }
      if (event.key === "Escape") closeSidebar();
    });
    window.addEventListener("resize", () => { if (!isMobile()) closeSidebar(); });
  });
})();
