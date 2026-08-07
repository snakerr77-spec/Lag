(() => {
  "use strict";
  const settings = window.LAGSettings;
  if (!settings) return;
  const el = {};
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    ["sidebar", "mobileOverlay", "menuButton", "themeButton", "breadcrumbName", "topicTitle", "topicDescription", "topicIcon", "topicAccessCount", "addContentButton", "topicBuilder"].forEach(id => el[id] = document.getElementById(id));
    const id = new URLSearchParams(location.search).get("id");
    const topic = settings.getTopics().find(item => item.id === id);
    if (!topic) {
      el.topicTitle.textContent = "Tópico não encontrado";
      el.topicDescription.textContent = "Este tópico foi removido ou o endereço está incorreto.";
      return;
    }
    document.title = `LAG Controller | ${topic.name}`;
    el.breadcrumbName.textContent = topic.name;
    el.topicTitle.textContent = topic.name;
    el.topicDescription.textContent = topic.description || "Área personalizada criada pelo administrador.";
    el.topicIcon.innerHTML = `<i class="fa-solid ${topic.icon || "fa-folder"}"></i>`;
    const permissions = settings.getPermissions();
    el.topicAccessCount.textContent = settings.getUsers().filter(user => settings.normalizeRole(user.role) === "admin" || (permissions[user.id] || []).includes(topic.id)).length;
    document.querySelectorAll(".admin-topic-action").forEach(node => node.classList.toggle("lag-permission-hidden", settings.normalizeRole(settings.getCurrentUser().role) !== "admin"));
    el.menuButton.addEventListener("click", toggleSidebar);
    el.mobileOverlay.addEventListener("click", closeMobile);
    el.themeButton.addEventListener("click", cycleTheme);
    el.addContentButton.addEventListener("click", () => el.topicBuilder.scrollIntoView({ behavior: "smooth" }));
    el.topicBuilder.querySelectorAll("[data-template]").forEach(button => button.addEventListener("click", () => alert(`Modelo “${button.textContent.trim()}” selecionado. Esta estrutura pode ser desenvolvida na próxima etapa.`)));
    initSidebar();
  }

  function cycleTheme() {
    const current = document.documentElement.dataset.theme || "dark-cyan";
    const themes = settings.THEMES;
    settings.applyTheme(themes[(themes.indexOf(current) + 1) % themes.length]);
  }
  function isMobile() { return matchMedia("(max-width: 980px)").matches; }
  function get(key) { try { return localStorage.getItem(key); } catch { return null; } }
  function set(key, value) { try { localStorage.setItem(key, value); } catch { /* vazio */ } }
  function initSidebar() { if (isMobile()) { document.body.classList.remove("sidebar-hidden"); return; } const hidden = get("lag-sidebar-hidden") !== "false"; document.body.classList.toggle("sidebar-hidden", hidden); }
  function toggleSidebar() { if (isMobile()) { const open = !el.sidebar.classList.contains("open"); el.sidebar.classList.toggle("open", open); el.mobileOverlay.classList.toggle("show", open); } else { const hidden = document.body.classList.toggle("sidebar-hidden"); set("lag-sidebar-hidden", String(hidden)); } }
  function closeMobile() { el.sidebar.classList.remove("open"); el.mobileOverlay.classList.remove("show"); }
})();
