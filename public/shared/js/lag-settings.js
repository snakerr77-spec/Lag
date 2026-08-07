(() => {
  "use strict";

  const KEYS = {
    theme: "lag-dashboard-theme",
    currentUser: "lag-current-user-id",
    users: "lag-users-v1",
    permissions: "lag-permissions-v1",
    topics: "lag-custom-topics-v1",
    sidebarLayout: "lag-sidebar-layout-v2",
    role: "lag-user-role",
    activeCity: "lag-active-city"
  };

  const THEMES = ["light-blue", "light-teal", "dark-cyan", "dark-purple"];
  const MODULES = [
    { id: "home", label: "Home", icon: "fa-house", href: "../home-page/index.html" },
    { id: "recepcao", label: "Recepção", icon: "fa-hospital-user", href: "../recepcao/index.html" },
    { id: "geral", label: "Visão geral", icon: "fa-chart-pie", href: "../controle/index.html?view=geral" },
    { id: "exames", label: "Exames", icon: "fa-microscope", href: "../controle/index.html?view=exames" },
    { id: "consultas", label: "Consultas", icon: "fa-user-doctor", href: "../controle/index.html?view=consultas" },
    { id: "odontologia", label: "Odontologia", icon: "fa-tooth", href: "../odontologia/index.html" },
    { id: "medicos", label: "Médicos e exames", icon: "fa-stethoscope", href: "../medicos-exames/index.html" },
    { id: "candidatos", label: "Candidatos médicos", icon: "fa-user-doctor", href: "../contratacao-medicos/index.html" },
    { id: "laudos", label: "Laudos médicos", icon: "fa-file-medical", href: "../laudos-medicos/index.html" },
    { id: "prontuario", label: "Prontuário", icon: "fa-notes-medical", href: "../prontuario-medico/index.html" },
    { id: "parceiros", label: "Parceiros", icon: "fa-handshake", href: "../parceiros/index.html" },
    { id: "almoxarifado", label: "Almoxarifado", icon: "fa-boxes-stacked", href: "../almoxarifado/index.html" },
    { id: "gestao", label: "Gestão e metas", icon: "fa-bullseye", href: "../gestao/index.html" },
    { id: "financeiro", label: "Financeiro / DRE", icon: "fa-chart-line", href: "../financeiro/index.html" },
    { id: "controladoria", label: "Controladoria", icon: "fa-folder-tree", href: "../controladoria/index.html" },
    { id: "treinamentos", label: "Treinamentos", icon: "fa-graduation-cap", href: "../treinamentos/index.html" },
    { id: "perfil", label: "Meu perfil", icon: "fa-user-gear", href: "../perfil/index.html" }
  ];

  // As quatro áreas abaixo formam a estrutura fixa da sidebar.
  // O administrador pode mover os tópicos entre elas, mas não pode excluir
  // nem renomear Principal, Gestão, Administração e Conta.
  const SIDEBAR_SECTIONS = [
    { id: "principal", label: "Principal" },
    { id: "gestao", label: "Gestão" },
    { id: "administracao", label: "Administração" },
    { id: "conta", label: "Conta" }
  ];

  const CODE_DEFAULT_LAYOUT = Array.isArray(window.LAG_SIDEBAR_CONFIG?.layout)
    ? window.LAG_SIDEBAR_CONFIG.layout
    : [
        { id: "home", section: "principal", order: 0 },
        { id: "recepcao", section: "principal", order: 1 },
        { id: "geral", section: "principal", order: 2 },
        { id: "exames", section: "principal", order: 2 },
        { id: "consultas", section: "principal", order: 3 },
        { id: "medicos", section: "gestao", order: 0 },
        { id: "candidatos", section: "gestao", order: 1 },
        { id: "laudos", section: "gestao", order: 2 },
        { id: "prontuario", section: "gestao", order: 3 },
        { id: "almoxarifado", section: "gestao", order: 4 },
        { id: "controladoria", section: "gestao", order: 5 },
        { id: "treinamentos", section: "administracao", order: 0 },
        { id: "perfil", section: "conta", order: 0 }
      ];

  const CITIES = ["Todas as cidades", "Cerquilho", "Tatuí", "Embu das Artes", "Itapeva"];
  const CITY_SWITCH_ROLES = ["dev"];

  const DEFAULT_USERS = [
    { id: "admin", name: "Dr. Gestor", email: "gestor@lagcontroller.com", role: "admin", unit: "Cerquilho", initials: "DG" },
    { id: "carlos-lima", name: "Carlos Lima", email: "carlos@lagcontroller.com", role: "laboratorio", unit: "Cerquilho", initials: "CL" },
    { id: "juliana-martins", name: "Juliana Martins", email: "juliana@lagcontroller.com", role: "financeiro", unit: "Cerquilho", initials: "JM" },
    { id: "bianca-souza", name: "Bianca Souza", email: "bianca@lagcontroller.com", role: "colaborador", unit: "Cerquilho", initials: "BS" },
    { id: "gestor-tatui", name: "Gestor Tatuí", email: "gestor.tatui@lagcontroller.com", role: "gestor", unit: "Tatuí", initials: "GT" },
    { id: "gerente-cerquilho", name: "Gerente Cerquilho", email: "gerente.cerquilho@lagcontroller.com", role: "gerente", unit: "Cerquilho", initials: "GC" },
  ];

  const ROLE_LABELS = {
    admin: "Administrador",
    administrador: "Administrador",
    financeiro: "Financeiro",
    laboratorio: "Laboratório",
    "laboratório": "Laboratório",
    colaborador: "Colaborador",
    gerente: "Gerente",
    gestor: "Gestor",
    dev: "Dev",
  };

  const DEFAULT_ACCESS = {
    admin: MODULES.map(module => module.id),
    gestor: ["home", "recepcao", "geral", "exames", "consultas", "odontologia", "medicos", "laudos", "prontuario", "parceiros", "almoxarifado", "gestao", "financeiro", "controladoria", "treinamentos", "perfil"],
    gerente: ["home", "recepcao", "geral", "exames", "consultas", "odontologia", "medicos", "candidatos", "laudos", "prontuario", "parceiros", "almoxarifado", "gestao", "financeiro", "controladoria", "treinamentos", "perfil"],
    laboratorio: ["home", "recepcao", "geral", "exames", "consultas", "medicos", "laudos", "prontuario", "almoxarifado", "perfil"],
    financeiro: ["home", "geral", "odontologia", "parceiros", "almoxarifado", "gestao", "financeiro", "controladoria", "perfil"],
    colaborador: ["home", "recepcao", "geral", "exames", "consultas", "odontologia", "treinamentos", "perfil"]
  };

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch { /* armazenamento indisponível */ }
  }

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(storageGet(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    storageSet(key, JSON.stringify(value));
  }

  function normalizeRole(role) {
    return String(role || "colaborador")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function initialsFor(name) {
    return String(name || "Usuário")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0] || "")
      .join("")
      .toUpperCase();
  }

  function normalizeCity(city) {
    const value = String(city || "Cerquilho").trim();
    const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (["todas", "todas as cidades", "todas cidades", "all"].includes(normalized)) return "Todas as cidades";
    return CITIES.find(item => item.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === normalized) || value;
  }

  function canSwitchCity(user = getCurrentUser()) {
    return Boolean(user) && CITY_SWITCH_ROLES.includes(normalizeRole(user.role));
  }

  function defaultAccessForRole(role) {
    const normalized = normalizeRole(role);
    return [...(DEFAULT_ACCESS[normalized] || ["home", "perfil"])];
  }

  function canManageCity(city, user = getCurrentUser()) {
    if (!user) return false;
    if (canSwitchCity(user)) return true;
    return normalizeCity(user.unit) === normalizeCity(city);
  }

  function ensureData() {
    if (window.__LAG_CLOUD__?.user) {
      const cloudUser = window.__LAG_CLOUD__.user;
      const cloudUsers = Array.isArray(window.__LAG_CLOUD__.users) && window.__LAG_CLOUD__.users.length
        ? window.__LAG_CLOUD__.users
        : [cloudUser];
      writeJson(KEYS.users, cloudUsers.map(user => ({
        ...user,
        role: normalizeRole(user.role),
        unit: normalizeCity(user.unit || user.city || "Cerquilho"),
        initials: user.initials || initialsFor(user.name)
      })));
      writeJson(KEYS.permissions, window.__LAG_CLOUD__.permissions || { [cloudUser.id]: cloudUser.permissions || defaultAccessForRole(cloudUser.role) });
      storageSet(KEYS.currentUser, cloudUser.id);
      storageSet(KEYS.role, normalizeRole(cloudUser.role));
      const cloudLinkedCity = normalizeCity(cloudUser.unit || cloudUser.city || "Cerquilho");
      const cloudSavedCity = normalizeCity(storageGet(KEYS.activeCity) || cloudLinkedCity);
      storageSet(
        KEYS.activeCity,
        CITY_SWITCH_ROLES.includes(normalizeRole(cloudUser.role)) && CITIES.includes(cloudSavedCity)
          ? cloudSavedCity
          : cloudLinkedCity
      );
      if (!THEMES.includes(storageGet(KEYS.theme))) storageSet(KEYS.theme, "light-blue");
      if (storageGet("lag-sidebar-hidden") === null) storageSet("lag-sidebar-hidden", "false");
      return;
    }
    let users = readJson(KEYS.users, null);
    if (!Array.isArray(users) || !users.length) {
      users = DEFAULT_USERS.map(user => ({ ...user }));
      writeJson(KEYS.users, users);
    } else {
      DEFAULT_USERS.forEach(defaultUser => {
        if (!users.some(user => user.id === defaultUser.id)) users.push({ ...defaultUser });
      });
      users = users.map(user => {
        const role = normalizeRole(user.role) === "medico" ? "colaborador" : normalizeRole(user.role);
        const unit = !CITY_SWITCH_ROLES.includes(role) && normalizeCity(user.unit) === "Todas as cidades" ? "Cerquilho" : normalizeCity(user.unit);
        return { ...user, role, unit };
      });
      writeJson(KEYS.users, users);
    }

    let permissions = readJson(KEYS.permissions, null);
    if (!permissions || typeof permissions !== "object" || Array.isArray(permissions)) {
      permissions = {};
    }

    users.forEach(user => {
      const role = normalizeRole(user.role);
      if (["admin", "administrador"].includes(role)) {
        permissions[user.id] = MODULES.map(module => module.id);
      } else if (!Array.isArray(permissions[user.id])) {
        permissions[user.id] = [...(DEFAULT_ACCESS[role] || ["home", "perfil"])];
      }
      if (!permissions[user.id].includes("perfil")) permissions[user.id].push("perfil");
    });
    // Migração única: adiciona os novos módulos aos cargos já existentes sem
    // apagar permissões personalizadas configuradas pelo administrador.
    if (storageGet("lag-module-permissions-migration-20260802") !== "done") {
      users.forEach(user => {
        const defaults = defaultAccessForRole(user.role);
        permissions[user.id] = Array.from(new Set([...(permissions[user.id] || []), ...defaults]));
      });
      storageSet("lag-module-permissions-migration-20260802", "done");
    }
    if (storageGet("lag-recepcao-permissions-migration-20260805") !== "done") {
      users.forEach(user => {
        const role = normalizeRole(user.role);
        if (["admin", "administrador", "gestor", "gerente", "laboratorio", "colaborador"].includes(role)) {
          permissions[user.id] = Array.from(new Set([...(permissions[user.id] || []), "recepcao"]));
        }
      });
      storageSet("lag-recepcao-permissions-migration-20260805", "done");
    }
    if (storageGet("lag-manager-candidates-migration-20260803") !== "done") {
      users.forEach(user => {
        const role = normalizeRole(user.role);
        if (["admin", "administrador", "gerente"].includes(role)) {
          permissions[user.id] = Array.from(new Set([...(permissions[user.id] || []), "candidatos"]));
        } else {
          permissions[user.id] = (permissions[user.id] || []).filter(id => id !== "candidatos");
        }
      });
      storageSet("lag-manager-candidates-migration-20260803", "done");
    }
    // Migração: o antigo módulo Ultrassom/Cliente foi incorporado aos Laudos Médicos.
    if (storageGet("lag-ultrassom-merged-into-laudos-v1") !== "done") {
      Object.keys(permissions).forEach(userId => {
        permissions[userId] = Array.from(new Set((permissions[userId] || []).filter(id => id !== "ultrassom").concat("laudos")));
      });
      const savedLayout = readJson(KEYS.sidebarLayout, null);
      if (Array.isArray(savedLayout)) writeJson(KEYS.sidebarLayout, savedLayout.filter(item => item?.id !== "ultrassom"));
      storageSet("lag-ultrassom-merged-into-laudos-v1", "done");
    }
    writeJson(KEYS.permissions, permissions);

    const topics = readJson(KEYS.topics, []);
    if (!Array.isArray(topics)) writeJson(KEYS.topics, []);
    else {
      const migratedTopics = topics.filter(topic => !normalizeRole(topic?.name).startsWith("laudos") && topic?.id !== "laudos");
      if (migratedTopics.length !== topics.length) writeJson(KEYS.topics, migratedTopics);
    }

    const currentId = storageGet(KEYS.currentUser);
    if (!users.some(user => user.id === currentId)) storageSet(KEYS.currentUser, users[0].id);
    const selectedUser = users.find(user => user.id === (storageGet(KEYS.currentUser) || users[0]?.id)) || users[0];
    if (!storageGet(KEYS.activeCity) && selectedUser) storageSet(KEYS.activeCity, normalizeCity(selectedUser.unit));

    const theme = storageGet(KEYS.theme);
    if (!THEMES.includes(theme)) storageSet(KEYS.theme, "light-blue");

    if (storageGet("lag-sidebar-hidden") === null) storageSet("lag-sidebar-hidden", "false");
    if (storageGet("lag-sidebar-fixed-navigation-20260804") !== "done") {
      storageSet("lag-sidebar-hidden", "false");
      storageSet("lag-sidebar-fixed-navigation-20260804", "done");
    }
  }

  function getUsers() {
    return readJson(KEYS.users, DEFAULT_USERS).map(user => ({
      ...user,
      role: normalizeRole(user.role),
      initials: user.initials || initialsFor(user.name)
    }));
  }

  function saveUsers(users) {
    const normalizedUsers = users.map(user => {
      const role = normalizeRole(user.role) === "medico" ? "colaborador" : normalizeRole(user.role);
      let unit = normalizeCity(user.unit);
      if (!CITY_SWITCH_ROLES.includes(role) && unit === "Todas as cidades") unit = "Cerquilho";
      return {
        ...user,
        role,
        unit,
        initials: user.initials || initialsFor(user.name)
      };
    });
    writeJson(KEYS.users, normalizedUsers);
    const permissions = getPermissions();
    normalizedUsers.forEach(user => {
      if (!Array.isArray(permissions[user.id])) permissions[user.id] = defaultAccessForRole(user.role);
      if (!permissions[user.id].includes("perfil")) permissions[user.id].push("perfil");
    });
    Object.keys(permissions).forEach(userId => { if (!normalizedUsers.some(user => user.id === userId)) delete permissions[userId]; });
    writeJson(KEYS.permissions, permissions);
    window.dispatchEvent(new CustomEvent("lag:settings-changed", { detail: { type: "users" } }));
  }

  function getCurrentUser() {
    const users = getUsers();
    const cloudId = window.__LAG_CLOUD__?.user?.id;
    const currentId = cloudId || storageGet(KEYS.currentUser) || users[0]?.id;
    return users.find(user => user.id === currentId) || (window.__LAG_CLOUD__?.user ? {
      ...window.__LAG_CLOUD__.user,
      unit: window.__LAG_CLOUD__.user.unit || window.__LAG_CLOUD__.user.city,
      initials: window.__LAG_CLOUD__.user.initials || initialsFor(window.__LAG_CLOUD__.user.name)
    } : users[0]);
  }

  function setCurrentUser() {
    return false;
  }

  function getActiveCity(user = getCurrentUser()) {
    const linkedCity = normalizeCity(user?.unit || user?.city || "Cerquilho");
    if (!canSwitchCity(user)) return linkedCity;

    const savedCity = normalizeCity(storageGet(KEYS.activeCity) || linkedCity);
    return CITIES.includes(savedCity) ? savedCity : linkedCity;
  }

  function setActiveCity(city, reloadPage = false) {
    const user = getCurrentUser();
    if (!canSwitchCity(user)) return false;

    const nextCity = normalizeCity(city);
    if (!CITIES.includes(nextCity)) return false;

    storageSet(KEYS.activeCity, nextCity);
    document.cookie = `lag_active_city=${encodeURIComponent(nextCity)}; Path=/; SameSite=Lax; Max-Age=31536000`;

    document.querySelectorAll("[data-active-city]").forEach(node => {
      node.textContent = nextCity;
    });

    window.dispatchEvent(new CustomEvent("lag:settings-changed", {
      detail: { type: "active-city", city: nextCity }
    }));

    if (reloadPage) window.location.reload();
    return true;
  }

  function getPermissions() {
    return readJson(KEYS.permissions, {});
  }

  function savePermissions(permissions) {
    writeJson(KEYS.permissions, permissions);
    window.dispatchEvent(new CustomEvent("lag:settings-changed", { detail: { type: "permissions" } }));
  }

  function permissionsFor(userId) {
    const user = getUsers().find(item => item.id === userId) || getCurrentUser();
    if (!user) return ["perfil"];
    if (normalizeRole(user.role) === "admin") {
      return [...MODULES.map(module => module.id), ...getTopics().filter(topic => topic.active !== false).map(topic => topic.id)];
    }
    const permissions = getPermissions();
    return Array.isArray(permissions[user.id]) ? permissions[user.id] : ["home", "perfil"];
  }

  function canAccess(moduleId, userId) {
    if (!moduleId || moduleId === "perfil") return true;
    const user = getUsers().find(item => item.id === userId) || getCurrentUser();
    if (!user) return false;
    const role = normalizeRole(user.role);
    if (moduleId === "candidatos") return ["admin", "administrador", "gerente"].includes(role);
    if (["admin", "administrador"].includes(role)) return true;
    return permissionsFor(user.id).includes(moduleId);
  }

  function getTopics() {
    return readJson(KEYS.topics, []).filter(topic => topic && topic.id && topic.name);
  }

  function saveTopics(topics) {
    writeJson(KEYS.topics, topics);
    window.dispatchEvent(new CustomEvent("lag:settings-changed", { detail: { type: "topics" } }));
  }

  function addTopic(topic) {
    const topics = getTopics();
    const id = topic.id || `topico-${Date.now().toString(36)}`;
    const normalized = {
      id,
      name: String(topic.name || "Novo tópico").trim(),
      description: String(topic.description || "").trim(),
      icon: String(topic.icon || "fa-folder").replace(/[^a-z0-9-]/gi, ""),
      active: topic.active !== false,
      createdAt: topic.createdAt || new Date().toISOString()
    };
    topics.push(normalized);
    saveTopics(topics);

    const permissions = getPermissions();
    const admin = getUsers().find(user => normalizeRole(user.role) === "admin");
    if (admin) {
      permissions[admin.id] = Array.from(new Set([...(permissions[admin.id] || []), id]));
      savePermissions(permissions);
    }
    return normalized;
  }

  function removeTopic(topicId) {
    saveTopics(getTopics().filter(topic => topic.id !== topicId));
    const permissions = getPermissions();
    Object.keys(permissions).forEach(userId => {
      permissions[userId] = (permissions[userId] || []).filter(moduleId => moduleId !== topicId);
    });
    savePermissions(permissions);
  }

  function updateTopic(topicId, patch) {
    const topics = getTopics().map(topic => topic.id === topicId ? { ...topic, ...patch } : topic);
    saveTopics(topics);
  }

  function getSidebarItems() {
    const customTopics = getTopics().map(topic => ({
      id: topic.id,
      label: topic.name,
      icon: topic.icon || "fa-folder",
      href: `../topico/index.html?id=${encodeURIComponent(topic.id)}`,
      custom: true,
      active: topic.active !== false
    }));
    return [...MODULES.map(module => ({ ...module, custom: false, active: true })), ...customTopics];
  }

  function defaultSectionFor(id, custom = false) {
    if (custom) return "gestao";
    const map = {
      home: "principal", recepcao: "principal",
      geral: "administracao", exames: "administracao", consultas: "administracao", odontologia: "administracao", treinamentos: "administracao", financeiro: "administracao", controladoria: "administracao",
      almoxarifado: "gestao", prontuario: "gestao", parceiros: "gestao", medicos: "gestao", candidatos: "gestao", laudos: "gestao", gestao: "gestao",
      perfil: "conta"
    };
    return map[id] || "gestao";
  }

  function normalizeSidebarLayout(layout) {
    const items = getSidebarItems();
    const itemMap = new Map(items.map(item => [item.id, item]));
    const sectionIds = new Set(SIDEBAR_SECTIONS.map(section => section.id));
    const source = Array.isArray(layout) ? layout : [];
    const normalized = [];
    const seen = new Set();

    source.forEach((entry, index) => {
      if (!entry || !itemMap.has(entry.id) || seen.has(entry.id)) return;
      const item = itemMap.get(entry.id);
      normalized.push({
        id: entry.id,
        section: sectionIds.has(entry.section) ? entry.section : defaultSectionFor(entry.id, item.custom),
        order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : index
      });
      seen.add(entry.id);
    });

    items.forEach(item => {
      if (seen.has(item.id)) return;
      const section = defaultSectionFor(item.id, item.custom);
      const nextOrder = normalized.filter(entry => entry.section === section).length;
      normalized.push({ id: item.id, section, order: nextOrder });
      seen.add(item.id);
    });

    SIDEBAR_SECTIONS.forEach(section => {
      normalized
        .filter(entry => entry.section === section.id)
        .sort((a, b) => a.order - b.order)
        .forEach((entry, index) => { entry.order = index; });
    });
    return normalized;
  }

  function getSidebarLayout() {
    const saved = readJson(KEYS.sidebarLayout, null);
    return normalizeSidebarLayout(Array.isArray(saved) ? saved : CODE_DEFAULT_LAYOUT);
  }

  function saveSidebarLayout(layout) {
    const normalized = normalizeSidebarLayout(layout);
    writeJson(KEYS.sidebarLayout, normalized);
    window.dispatchEvent(new CustomEvent("lag:settings-changed", { detail: { type: "sidebarLayout" } }));
    return normalized;
  }

  function resetSidebarLayout() {
    const normalized = normalizeSidebarLayout(CODE_DEFAULT_LAYOUT);
    writeJson(KEYS.sidebarLayout, normalized);
    window.dispatchEvent(new CustomEvent("lag:settings-changed", { detail: { type: "sidebarLayout" } }));
    return normalized;
  }

  function generateSidebarConfig(layout = getSidebarLayout()) {
    const normalized = normalizeSidebarLayout(layout);
    return `window.LAG_SIDEBAR_CONFIG = ${JSON.stringify({ layout: normalized }, null, 2)};\n`;
  }

  function updateThemedLogos() {
    const safeTheme = document.documentElement.dataset.theme || "light-blue";
    const useDark = safeTheme.startsWith("dark");
    document.querySelectorAll("img[data-logo-light][data-logo-dark]").forEach(img => {
      const nextSrc = useDark ? img.dataset.logoDark : img.dataset.logoLight;
      if (nextSrc && img.getAttribute("src") !== nextSrc) img.setAttribute("src", nextSrc);
    });
  }

  function applyTheme(theme, persist = true) {
    const safeTheme = THEMES.includes(theme) ? theme : "dark-cyan";
    document.documentElement.dataset.theme = safeTheme;
    if (persist) storageSet(KEYS.theme, safeTheme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", safeTheme.startsWith("dark") ? "#061426" : "#f4f8fc");
    updateThemedLogos();
    window.dispatchEvent(new CustomEvent("lag:theme-changed", { detail: { theme: safeTheme } }));
  }

  function roleLabel(role) {
    const normalized = normalizeRole(role);
    return ROLE_LABELS[normalized] || normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  function detectCurrentModule() {
    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    if (path.includes("/home-page/")) return "home";
    if (path.includes("/recepcao/")) return "recepcao";
    if (path.includes("/controle/")) {
      const view = params.get("view") || "geral";
      return ["geral", "exames", "consultas"].includes(view) ? view : "geral";
    }
    if (path.includes("/odontologia/")) return "odontologia";
    if (path.includes("/parceiros/")) return "parceiros";
    if (path.includes("/financeiro/")) return "financeiro";
    if (path.includes("/gestao/")) return "gestao";
    if (path.includes("/laudos-medicos/")) return "laudos";
    if (path.includes("/contratacao-medicos/")) return "candidatos";
    if (path.includes("/almoxarifado/")) return "almoxarifado";
    if (path.includes("/perfil/")) return "perfil";
    if (path.includes("/topico/")) return params.get("id") || "topico";
    if (path.includes("medicos-exames")) return "medicos";
    if (path.includes("prontuario")) return "prontuario";
    if (path.includes("controladoria")) return "controladoria";
    if (path.includes("treinamentos")) return "treinamentos";
    return document.body?.dataset.moduleId || "home";
  }

  function updateIdentity() {
    const user = getCurrentUser();
    if (!user) return;
    storageSet(KEYS.role, normalizeRole(user.role));

    document.querySelectorAll("[data-current-user-name]").forEach(node => { node.textContent = user.name; });
    document.querySelectorAll("[data-current-user-role]").forEach(node => { node.textContent = roleLabel(user.role); });
    document.querySelectorAll("[data-current-user-unit]").forEach(node => { node.textContent = user.unit || "—"; });
    document.querySelectorAll("[data-active-city]").forEach(node => { node.textContent = getActiveCity(user); });
    document.querySelectorAll("[data-current-user-initials]").forEach(node => { node.textContent = user.initials || initialsFor(user.name); });

    document.querySelectorAll(".profile-button strong").forEach(node => { node.textContent = user.name; });
    document.querySelectorAll(".profile-button small").forEach(node => { node.textContent = roleLabel(user.role); });
    document.querySelectorAll(".profile-avatar").forEach(node => { node.textContent = user.initials || initialsFor(user.name); });

    const heroTitle = document.querySelector(".home-hero h1");
    if (heroTitle && !heroTitle.hasAttribute("data-static-title")) {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
      heroTitle.innerHTML = `${greeting}, <span data-current-user-name></span>`;
      heroTitle.querySelector("[data-current-user-name]").textContent = user.name;
    }

    document.querySelectorAll("button.profile-button").forEach(button => {
      if (button.dataset.profileBound === "true") return;
      button.dataset.profileBound = "true";
      button.addEventListener("click", () => { window.location.href = "../perfil/index.html"; });
    });
  }

  function moduleFromElement(element) {
    if (element.dataset.moduleId) return element.dataset.moduleId;
    if (element.dataset.homeView) return element.dataset.homeView;
    if (element.dataset.section) return element.dataset.section;
    if (element.dataset.view) return element.dataset.view;
    const href = element.getAttribute?.("href") || "";
    if (href.includes("home-page")) return "home";
    if (href.includes("recepcao")) return "recepcao";
    if (href.includes("view=geral")) return "geral";
    if (href.includes("view=exames")) return "exames";
    if (href.includes("view=consultas")) return "consultas";
    if (href.includes("odontologia")) return "odontologia";
    if (href.includes("parceiros")) return "parceiros";
    if (href.includes("financeiro")) return "financeiro";
    if (href.includes("/gestao")) return "gestao";
    if (href.includes("medicos-exames")) return "medicos";
    if (href.includes("contratacao-medicos")) return "candidatos";
    if (href.includes("laudos-medicos")) return "laudos";
    if (href.includes("prontuario")) return "prontuario";
    if (href.includes("controladoria")) return "controladoria";
    if (href.includes("treinamentos")) return "treinamentos";
    if (href.includes("almoxarifado")) return "almoxarifado";
    if (href.includes("perfil")) return "perfil";
    return null;
  }

  function clearInjectedTopics(nav) {
    nav.querySelectorAll(".lag-custom-topic, .lag-injected-module, .lag-custom-divider, .lag-layout-divider, .lag-sidebar-section-label").forEach(node => node.remove());
  }

  function injectTopics() {
    const nav = document.querySelector(".sidebar-nav");
    if (!nav) return;
    clearInjectedTopics(nav);

    const currentModule = detectCurrentModule();
    MODULES.forEach(module => {
      if (nav.querySelector(`[data-module-id="${module.id}"]`)) return;
      const link = document.createElement("a");
      link.className = `nav-item lag-injected-module${currentModule === module.id ? " active" : ""}`;
      link.href = module.href;
      link.dataset.moduleId = module.id;
      link.title = module.label;
      link.innerHTML = `<i class="fa-solid ${escapeHtml(module.icon)}"></i><span>${escapeHtml(module.label)}</span>`;
      nav.appendChild(link);
    });

    const topics = getTopics().filter(topic => topic.active !== false && canAccess(topic.id));
    topics.forEach(topic => {
      const link = document.createElement("a");
      link.className = `nav-item lag-custom-topic${currentModule === topic.id ? " active" : ""}`;
      link.href = `../topico/index.html?id=${encodeURIComponent(topic.id)}`;
      link.dataset.moduleId = topic.id;
      link.title = topic.name;
      link.innerHTML = `<i class="fa-solid ${escapeHtml(topic.icon || "fa-folder")}"></i><span>${escapeHtml(topic.name)}</span>`;
      nav.appendChild(link);
    });
  }

  function applySidebarLayout() {
    const nav = document.querySelector(".sidebar-nav");
    if (!nav) return;

    nav.querySelectorAll(".nav-divider, .lag-layout-divider, .lag-sidebar-section-label").forEach(node => node.remove());
    const nodes = new Map();
    nav.querySelectorAll(".nav-item").forEach(item => {
      const moduleId = moduleFromElement(item);
      if (moduleId && !nodes.has(moduleId)) nodes.set(moduleId, item);
    });

    const layout = getSidebarLayout();
    const fragment = document.createDocumentFragment();
    const appended = new Set();
    let visibleSectionCount = 0;

    SIDEBAR_SECTIONS.forEach(section => {
      const entries = layout
        .filter(entry => entry.section === section.id && nodes.has(entry.id))
        .sort((a, b) => a.order - b.order);
      const hasVisibleItem = entries.some(entry => canAccess(entry.id));
      if (!entries.length || !hasVisibleItem) return;

      if (visibleSectionCount > 0) {
        const divider = document.createElement("div");
        divider.className = "nav-divider lag-layout-divider";
        fragment.appendChild(divider);
      }
      const label = document.createElement("span");
      label.className = "lag-sidebar-section-label";
      label.textContent = section.label;
      fragment.appendChild(label);

      entries.forEach(entry => {
        fragment.appendChild(nodes.get(entry.id));
        appended.add(entry.id);
      });
      visibleSectionCount += 1;
    });

    nodes.forEach((node, id) => {
      if (!appended.has(id)) fragment.appendChild(node);
    });
    nav.replaceChildren(fragment);
  }

  function applyPermissionsToUi() {
    document.querySelectorAll("[data-module-id], [data-home-view], .quick-access-card, .home-alert a").forEach(element => {
      const moduleId = moduleFromElement(element);
      if (!moduleId) return;
      element.classList.toggle("lag-permission-hidden", !canAccess(moduleId));
    });

    const current = detectCurrentModule();
    document.querySelectorAll(".sidebar-nav .nav-item").forEach(item => {
      const moduleId = moduleFromElement(item);
      item.classList.toggle("active", moduleId === current);
    });
  }

  function showDeniedIfNeeded() {
    const current = detectCurrentModule();
    if (!current || current === "perfil" || canAccess(current)) return;
    if (document.querySelector(".lag-access-denied-overlay")) return;

    const user = getCurrentUser();
    const overlay = document.createElement("div");
    overlay.className = "lag-access-denied-overlay";
    overlay.innerHTML = `
      <section>
        <span class="lag-denied-icon"><i class="fa-solid fa-lock"></i></span>
        <span class="lag-denied-kicker">Acesso restrito</span>
        <h1>Você não possui acesso a este módulo</h1>
        <p>O perfil <strong>${escapeHtml(user?.name || "atual")}</strong> precisa receber esta permissão de um administrador.</p>
        <div>
          <a href="../home-page/index.html"><i class="fa-solid fa-house"></i> Voltar para a Home</a>
          <a class="secondary" href="../perfil/index.html"><i class="fa-solid fa-user-gear"></i> Abrir meu perfil</a>
        </div>
      </section>`;
    document.body.appendChild(overlay);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function refresh() {
    updateIdentity();
    updateThemedLogos();
    injectTopics();
    applySidebarLayout();
    applyPermissionsToUi();
    showDeniedIfNeeded();
  }

  ensureData();
  const initialUser = getCurrentUser();
  if (initialUser) storageSet(KEYS.role, normalizeRole(initialUser.role));
  applyTheme(storageGet(KEYS.theme) || "light-blue", false);

  window.LAGSettings = {
    KEYS,
    THEMES,
    modules: MODULES,
    sidebarSections: SIDEBAR_SECTIONS,
    cities: CITIES,
    defaultAccessForRole,
    normalizeCity,
    canSwitchCity,
    canManageCity,
    getSidebarItems,
    getSidebarLayout,
    saveSidebarLayout,
    resetSidebarLayout,
    generateSidebarConfig,
    getUsers,
    saveUsers,
    getCurrentUser,
    setCurrentUser,
    getActiveCity,
    setActiveCity,
    getPermissions,
    savePermissions,
    permissionsFor,
    canAccess,
    getTopics,
    saveTopics,
    addTopic,
    removeTopic,
    updateTopic,
    applyTheme,
    roleLabel,
    normalizeRole,
    initialsFor,
    detectCurrentModule,
    refresh
  };

  document.addEventListener("DOMContentLoaded", refresh);
  window.addEventListener("storage", event => {
    if (Object.values(KEYS).includes(event.key)) window.location.reload();
  });
  window.addEventListener("lag:settings-changed", refresh);
})();
