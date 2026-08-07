(() => {
  "use strict";

  const settings = window.LAGSettings;
  if (!settings) return;

  const el = {};
  const state = { tab: "account", permissionUserId: null, sidebarLayoutDraft: null, draggedModuleId: null, editingUserId: "", teamQuery: "" };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cache();
    bind();
    render();
    initSidebar();
  }

  function cache() {
    [
      "sidebar", "mobileOverlay", "menuButton", "themeButton", "profileSearch", "sessionUser", "sessionSwitchWrap",
      "accessSummary", "themeSummary", "profileLinkedUnit", "profileForm", "profileName", "profileEmail", "profileUnit", "profileUnitHelp", "profileHeaderUnit", "profileHeaderUnitHelp", "profileRole", "profilePhone", "resetProfile",
      "themeGrid", "permissionUser", "permissionAvatar", "permissionName", "permissionMeta", "permissionRole", "permissionGrid", "permissionCount",
      "selectAllPermissions", "clearPermissions", "savePermissions", "topicForm", "topicName", "topicIcon", "topicDescription", "topicList", "topicListCount",
      "sidebarLayoutList", "saveSidebarLayout", "resetSidebarLayout", "copySidebarCode", "downloadSidebarCode", "sidebarConfigCode",
      "teamForm", "teamUserId", "teamName", "teamEmail", "teamRole", "teamUnit", "teamPhone", "teamPassword", "cancelTeamEdit", "teamSearch", "teamList", "teamCount", "profileToastStack"
    ].forEach(id => { el[id] = document.getElementById(id); });
  }

  function bind() {
    document.querySelectorAll("[data-profile-tab]").forEach(button => button.addEventListener("click", () => openTab(button.dataset.profileTab)));
    el.menuButton.addEventListener("click", toggleSidebar);
    el.mobileOverlay.addEventListener("click", closeMobile);
    window.addEventListener("resize", handleResize);
    el.themeButton.addEventListener("click", cycleTheme);
    el.profileSearch.addEventListener("input", event => filterSettings(event.target.value));
    el.sessionUser?.addEventListener("change", () => {});
    el.profileForm.addEventListener("submit", saveProfile);
    el.profileHeaderUnit?.addEventListener("change", event => {
      if (!settings.canSwitchCity?.()) return;
      settings.setActiveCity(event.target.value, true);
      if (el.profileUnit && !el.profileUnit.disabled) el.profileUnit.value = event.target.value;
      toast(`Unidade em uso alterada para ${event.target.value}.`);
    });
    el.teamRole?.addEventListener("change", syncTeamUnitRules);
    el.resetProfile.addEventListener("click", fillProfile);
    document.querySelectorAll("[data-theme-value]").forEach(button => button.addEventListener("click", () => selectTheme(button.dataset.themeValue)));
    el.permissionUser.addEventListener("change", event => { state.permissionUserId = event.target.value; renderPermissionEditor(); });
    el.selectAllPermissions.addEventListener("click", () => setAllPermissions(true));
    el.clearPermissions.addEventListener("click", () => setAllPermissions(false));
    el.savePermissions.addEventListener("click", persistPermissions);
    el.topicForm.addEventListener("submit", createTopic);
    el.saveSidebarLayout.addEventListener("click", persistSidebarLayout);
    el.teamForm?.addEventListener("submit", saveTeamUser);
    el.cancelTeamEdit?.addEventListener("click", resetTeamForm);
    el.teamSearch?.addEventListener("input", event => { state.teamQuery = event.target.value; renderTeam(); });
    el.teamList?.addEventListener("click", handleTeamAction);
    el.resetSidebarLayout.addEventListener("click", restoreSidebarLayout);
    el.copySidebarCode.addEventListener("click", copySidebarCode);
    el.downloadSidebarCode.addEventListener("click", downloadSidebarCode);
    document.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        el.profileSearch.focus();
      }
    });
    window.addEventListener("lag:theme-changed", renderThemeState);
    window.addEventListener("lag:settings-changed", event => {
      if (["topics", "permissions", "users"].includes(event.detail?.type)) render();
    });
  }

  function render() {
    const user = settings.getCurrentUser();
    const isAdmin = ["admin", "administrador"].includes(settings.normalizeRole(user.role));
    document.querySelectorAll(".admin-only").forEach(node => node.classList.toggle("lag-permission-hidden", !isAdmin));
    if (!isAdmin && ["team", "access", "layout", "topics"].includes(state.tab)) openTab("account");

    fillProfile();
    populateSessionUsers(isAdmin);
    renderThemeState();
    renderAccessSummary();
    if (isAdmin) {
      renderTeam();
      populatePermissionUsers();
      renderPermissionEditor();
      renderSidebarLayout();
      renderTopics();
    }
    settings.refresh();
  }

  function fillProfile() {
    const user = settings.getCurrentUser();
    const lockedUnit = settings.normalizeCity(user.unit || user.city || "Cerquilho");
    el.profileName.value = user.name || "";
    el.profileEmail.value = user.email || "";
    el.profileUnit.value = lockedUnit;
    el.profileUnit.readOnly = true;
    if (el.profileUnitHelp) el.profileUnitHelp.textContent = "A cidade é definida pelo administrador no cadastro do usuário.";
    if (el.profileLinkedUnit) el.profileLinkedUnit.classList.add("is-locked");
    el.profileRole.value = settings.roleLabel(user.role);
    el.profilePhone.value = user.phone || "";
  }

  async function saveProfile(event) {
    event.preventDefault();
    const current = settings.getCurrentUser();
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(current.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: el.profileName.value.trim(),
          email: el.profileEmail.value.trim(),
          phone: el.profilePhone.value.trim()
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar o perfil.");
      const users = settings.getUsers().map(user => user.id === current.id ? { ...user, ...data.user, unit: data.user.city || data.user.unit } : user);
      settings.saveUsers(users);
      if (window.__LAG_CLOUD__) window.__LAG_CLOUD__.user = data.user;
      toast("Perfil atualizado com sucesso.");
      setTimeout(() => window.location.reload(), 350);
    } catch (error) {
      toast(error.message || "Não foi possível salvar o perfil.");
    }
  }

  function populateSessionUsers() {
    if (el.sessionSwitchWrap) el.sessionSwitchWrap.remove();
  }

  function selectTheme(theme) {
    settings.applyTheme(theme);
    renderThemeState();
    toast("Tema aplicado em todo o LAG Controller.");
  }

  function cycleTheme() {
    const current = document.documentElement.dataset.theme || "dark-cyan";
    const themes = settings.THEMES;
    selectTheme(themes[(themes.indexOf(current) + 1) % themes.length]);
  }

  function renderThemeState() {
    const theme = document.documentElement.dataset.theme || "dark-cyan";
    const labels = { "light-blue": "Claro azul", "light-teal": "Claro turquesa", "dark-cyan": "Escuro azul", "dark-purple": "Escuro roxo" };
    el.themeSummary.textContent = labels[theme] || theme;
    document.querySelectorAll("[data-theme-value]").forEach(button => button.classList.toggle("active", button.dataset.themeValue === theme));
    el.themeButton.innerHTML = theme.startsWith("dark") ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  }

  function renderAccessSummary() {
    const user = settings.getCurrentUser();
    if (["admin", "administrador"].includes(settings.normalizeRole(user.role))) {
      el.accessSummary.textContent = "Acesso completo";
      return;
    }
    const count = settings.permissionsFor(user.id).filter(id => id !== "perfil").length;
    el.accessSummary.textContent = `${count} módulos liberados`;
  }


  async function reloadCloudUsers() {
    const response = await fetch("/api/users", { credentials: "same-origin" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível carregar os usuários.");
    const users = (data.users || []).map(user => ({ ...user, unit: user.city || user.unit, initials: user.initials || settings.initialsFor(user.name) }));
    settings.saveUsers(users);
    if (window.__LAG_CLOUD__) window.__LAG_CLOUD__.users = users;
    return users;
  }

  function resetTeamForm() {
    state.editingUserId = "";
    el.teamForm?.reset();
    if (el.teamUserId) el.teamUserId.value = "";
    if (el.teamRole) el.teamRole.value = "gestor";
    if (el.teamUnit) el.teamUnit.value = settings.getCurrentUser()?.unit || "Cerquilho";
    if (el.teamPassword) el.teamPassword.value = "";
    if (el.cancelTeamEdit) el.cancelTeamEdit.hidden = true;
    syncTeamUnitRules();
  }

  function syncTeamUnitRules() {
    if (!el.teamRole || !el.teamUnit) return;
    const role = settings.normalizeRole(el.teamRole.value);
    const canUseAll = ["admin", "administrador", "gestor", "dev"].includes(role);
    const allOption = [...el.teamUnit.options].find(option => option.value === "Todas as cidades");
    if (allOption) allOption.disabled = !canUseAll;
    if (!canUseAll && el.teamUnit.value === "Todas as cidades") el.teamUnit.value = "Cerquilho";
  }

  function slugId(value) {
    const base = String(value || "usuario").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "usuario";
    return `${base}-${Date.now().toString(36).slice(-5)}`;
  }

  async function saveTeamUser(event) {
    event.preventDefault();
    const name = el.teamName.value.trim();
    const email = el.teamEmail.value.trim();
    const role = settings.normalizeRole(el.teamRole.value);
    const city = settings.normalizeCity(el.teamUnit.value);
    const editingId = state.editingUserId || el.teamUserId.value;
    const password = el.teamPassword?.value.trim() || "";
    if (!name || !email) return toast("Preencha nome e e-mail.");
    if (!editingId && password.length < 8) return toast("Informe uma senha com pelo menos 8 caracteres.");
    try {
      const response = await fetch(editingId ? `/api/users/${encodeURIComponent(editingId)}` : "/api/users", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name, email, role, city, phone: el.teamPhone.value.trim(), ...(password ? { password } : {}) })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar o usuário.");
      await reloadCloudUsers();
      toast(editingId ? "Usuário atualizado." : "Novo usuário criado com acesso ao Cloudflare.");
      resetTeamForm();
      renderTeam();
      populatePermissionUsers();
      renderPermissionEditor();
    } catch (error) {
      toast(error.message || "Não foi possível salvar o usuário.");
    }
  }

  function renderTeam() {
    if (!el.teamList) return;
    const term = String(state.teamQuery || "").trim().toLowerCase();
    const users = settings.getUsers().filter(user => !term || `${user.name} ${user.email} ${settings.roleLabel(user.role)} ${user.unit}`.toLowerCase().includes(term));
    el.teamCount.textContent = `${settings.getUsers().length} ${settings.getUsers().length === 1 ? "usuário" : "usuários"}`;
    el.teamList.innerHTML = users.map(user => {
      const current = settings.getCurrentUser();
      const cannotDelete = user.id === current.id || ["admin", "administrador"].includes(settings.normalizeRole(user.role)) && settings.getUsers().filter(item => ["admin", "administrador"].includes(settings.normalizeRole(item.role))).length <= 1;
      return `<article class="team-row" data-team-user="${escapeAttr(user.id)}">
        <span class="team-avatar">${escapeHtml(user.initials || settings.initialsFor(user.name))}</span>
        <div class="team-copy"><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.email)}</small><span>${escapeHtml(settings.roleLabel(user.role))} • ${escapeHtml(user.unit || "Sem unidade")}</span></div>
        <div class="team-row-actions"><button type="button" data-team-action="edit" title="Editar usuário"><i class="fa-solid fa-pen"></i></button><button class="delete" type="button" data-team-action="delete" ${cannotDelete ? "disabled" : ""} title="Excluir usuário"><i class="fa-solid fa-trash"></i></button></div>
      </article>`;
    }).join("") || '<div class="topic-empty"><div><i class="fa-solid fa-user-slash"></i><strong>Nenhum usuário encontrado</strong><small>Altere a busca para visualizar outros acessos.</small></div></div>';
  }

  async function handleTeamAction(event) {
    const button = event.target.closest("[data-team-action]");
    const row = event.target.closest("[data-team-user]");
    if (!button || !row) return;
    const user = settings.getUsers().find(item => item.id === row.dataset.teamUser);
    if (!user) return;
    if (button.dataset.teamAction === "edit") {
      state.editingUserId = user.id;
      el.teamUserId.value = user.id;
      el.teamName.value = user.name || "";
      el.teamEmail.value = user.email || "";
      el.teamRole.value = settings.normalizeRole(user.role);
      el.teamUnit.value = settings.normalizeCity(user.unit || user.city);
      syncTeamUnitRules();
      el.teamPhone.value = user.phone || "";
      if (el.teamPassword) el.teamPassword.value = "";
      el.cancelTeamEdit.hidden = false;
      el.teamName.focus();
      return;
    }
    if (button.dataset.teamAction === "delete" && !button.disabled) {
      if (!window.confirm(`Excluir o usuário “${user.name}”?`)) return;
      try {
        const response = await fetch(`/api/users/${encodeURIComponent(user.id)}`, { method: "DELETE", credentials: "same-origin" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Não foi possível excluir o usuário.");
        await reloadCloudUsers();
        if (state.permissionUserId === user.id) state.permissionUserId = null;
        renderTeam();
        populatePermissionUsers();
        renderPermissionEditor();
        toast("Usuário removido.");
      } catch (error) {
        toast(error.message || "Não foi possível excluir o usuário.");
      }
    }
  }

  function populatePermissionUsers() {
    const users = settings.getUsers();
    if (!state.permissionUserId || !users.some(user => user.id === state.permissionUserId)) {
      state.permissionUserId = users.find(user => !["admin", "administrador"].includes(settings.normalizeRole(user.role)))?.id || users[0]?.id;
    }
    el.permissionUser.innerHTML = users.map(user => `<option value="${escapeAttr(user.id)}" ${user.id === state.permissionUserId ? "selected" : ""}>${escapeHtml(user.name)} — ${escapeHtml(settings.roleLabel(user.role))}</option>`).join("");
  }

  function renderPermissionEditor() {
    const user = settings.getUsers().find(item => item.id === state.permissionUserId);
    if (!user) return;
    const isAdmin = ["admin", "administrador"].includes(settings.normalizeRole(user.role));
    const selected = new Set(settings.permissionsFor(user.id));
    const modules = [
      ...settings.modules,
      ...settings.getTopics().map(topic => ({ id: topic.id, label: topic.name, icon: topic.icon, custom: true }))
    ];

    el.permissionAvatar.textContent = user.initials || settings.initialsFor(user.name);
    el.permissionName.textContent = user.name;
    el.permissionMeta.textContent = `${settings.roleLabel(user.role)} • ${user.unit || "Sem unidade"}`;
    el.permissionRole.textContent = settings.roleLabel(user.role);

    el.permissionGrid.innerHTML = "";
    modules.forEach(module => {
      const targetRole = settings.normalizeRole(user.role);
      const managerOnly = module.id === "candidatos";
      const managerAllowed = ["admin", "administrador", "gerente"].includes(targetRole);
      const locked = module.id === "perfil" || isAdmin || (managerOnly && !managerAllowed);
      const checked = module.id === "perfil" || isAdmin || (managerOnly ? managerAllowed : selected.has(module.id));
      const label = document.createElement("label");
      label.className = `permission-card${checked ? " active" : ""}${locked ? " locked" : ""}`;
      label.innerHTML = `<i class="fa-solid ${escapeAttr(module.icon || "fa-folder")}"></i><span><strong>${escapeHtml(module.label)}</strong><small>${module.custom ? "Tópico personalizado" : module.id === "perfil" ? "Sempre disponível" : "Módulo do sistema"}</small></span><input type="checkbox" value="${escapeAttr(module.id)}" ${checked ? "checked" : ""} ${locked ? "disabled" : ""} />`;
      const checkbox = label.querySelector("input");
      checkbox.addEventListener("change", () => { label.classList.toggle("active", checkbox.checked); updatePermissionCount(); });
      el.permissionGrid.appendChild(label);
    });

    el.selectAllPermissions.disabled = isAdmin;
    el.clearPermissions.disabled = isAdmin;
    el.savePermissions.disabled = isAdmin;
    updatePermissionCount();
  }

  function setAllPermissions(checked) {
    el.permissionGrid.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach(input => {
      input.checked = checked;
      input.closest(".permission-card").classList.toggle("active", checked);
    });
    updatePermissionCount();
  }

  function updatePermissionCount() {
    const count = el.permissionGrid.querySelectorAll('input[type="checkbox"]:checked').length;
    el.permissionCount.textContent = `${count} ${count === 1 ? "módulo selecionado" : "módulos selecionados"}`;
  }

  async function persistPermissions() {
    const user = settings.getUsers().find(item => item.id === state.permissionUserId);
    if (!user || ["admin", "administrador"].includes(settings.normalizeRole(user.role))) return;
    let selected = Array.from(el.permissionGrid.querySelectorAll('input[type="checkbox"]:checked')).map(input => input.value);
    if (!selected.includes("perfil")) selected.push("perfil");
    if (!['gerente'].includes(settings.normalizeRole(user.role))) selected = selected.filter(id => id !== "candidatos");
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ permissions: Array.from(new Set(selected)) })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar as permissões.");
      const users = settings.getUsers().map(item => item.id === user.id ? { ...item, permissions: data.user.permissions } : item);
      settings.saveUsers(users);
      const permissions = settings.getPermissions();
      permissions[user.id] = data.user.permissions;
      settings.savePermissions(permissions);
      toast(`Permissões de ${user.name} atualizadas.`);
      renderPermissionEditor();
    } catch (error) {
      toast(error.message || "Não foi possível salvar as permissões.");
    }
  }

  function syncSidebarLayoutDraft() {
    const current = settings.getSidebarLayout();
    if (!Array.isArray(state.sidebarLayoutDraft)) {
      state.sidebarLayoutDraft = current.map(item => ({ ...item }));
      return;
    }
    const currentIds = new Set(current.map(item => item.id));
    state.sidebarLayoutDraft = state.sidebarLayoutDraft.filter(item => currentIds.has(item.id));
    current.forEach(item => {
      if (!state.sidebarLayoutDraft.some(entry => entry.id === item.id)) state.sidebarLayoutDraft.push({ ...item });
    });
    normalizeDraftOrders();
  }

  function normalizeDraftOrders() {
    settings.sidebarSections.forEach(section => {
      state.sidebarLayoutDraft
        .filter(item => item.section === section.id)
        .sort((a, b) => a.order - b.order)
        .forEach((item, index) => { item.order = index; });
    });
  }

  function renderSidebarLayout() {
    syncSidebarLayoutDraft();
    const items = settings.getSidebarItems();
    const itemMap = new Map(items.map(item => [item.id, item]));
    el.sidebarLayoutList.innerHTML = "";

    settings.sidebarSections.forEach(section => {
      const group = document.createElement("section");
      group.className = "sidebar-layout-group";
      group.dataset.sectionId = section.id;
      const entries = state.sidebarLayoutDraft
        .filter(entry => entry.section === section.id && itemMap.has(entry.id))
        .sort((a, b) => a.order - b.order);
      group.innerHTML = `<header><span><i class="fa-solid fa-bars-staggered"></i></span><div><strong>${escapeHtml(section.label)}</strong><small>${entries.length} ${entries.length === 1 ? "item" : "itens"}</small></div></header><div class="sidebar-layout-dropzone"></div>`;
      const zone = group.querySelector(".sidebar-layout-dropzone");
      entries.forEach((entry, index) => zone.appendChild(createSidebarLayoutRow(entry, itemMap.get(entry.id), index, entries.length)));
      bindDropzone(zone, section.id);
      el.sidebarLayoutList.appendChild(group);
    });
    updateSidebarCodePreview();
  }

  function createSidebarLayoutRow(entry, item, index, total) {
    const row = document.createElement("article");
    row.className = "sidebar-layout-row";
    row.draggable = true;
    row.dataset.moduleId = entry.id;
    row.innerHTML = `
      <button class="sidebar-drag-handle" type="button" title="Arrastar"><i class="fa-solid fa-grip-vertical"></i></button>
      <span class="sidebar-layout-icon"><i class="fa-solid ${escapeAttr(item.icon || "fa-folder")}"></i></span>
      <div class="sidebar-layout-copy"><strong>${escapeHtml(item.label)}</strong><small>${item.custom ? "Tópico criado pelo admin" : "Módulo padrão do sistema"}</small></div>
      <label class="sidebar-section-select"><span>Seção</span><select>${settings.sidebarSections.map(section => `<option value="${escapeAttr(section.id)}" ${section.id === entry.section ? "selected" : ""}>${escapeHtml(section.label)}</option>`).join("")}</select></label>
      <div class="sidebar-layout-arrows"><button type="button" data-direction="up" ${index === 0 ? "disabled" : ""} title="Mover para cima"><i class="fa-solid fa-chevron-up"></i></button><button type="button" data-direction="down" ${index === total - 1 ? "disabled" : ""} title="Mover para baixo"><i class="fa-solid fa-chevron-down"></i></button></div>`;

    row.querySelector("select").addEventListener("change", event => moveModuleToSection(entry.id, event.target.value));
    row.querySelectorAll("[data-direction]").forEach(button => button.addEventListener("click", () => moveModule(entry.id, button.dataset.direction)));
    row.addEventListener("dragstart", event => {
      state.draggedModuleId = entry.id;
      row.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", entry.id);
    });
    row.addEventListener("dragend", () => {
      state.draggedModuleId = null;
      row.classList.remove("dragging");
      document.querySelectorAll(".sidebar-layout-dropzone.drag-over").forEach(node => node.classList.remove("drag-over"));
    });
    row.addEventListener("dragover", event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    });
    row.addEventListener("drop", event => {
      event.preventDefault();
      const sourceId = state.draggedModuleId || event.dataTransfer.getData("text/plain");
      reorderByDrop(sourceId, entry.id, entry.section);
    });
    return row;
  }

  function bindDropzone(zone, sectionId) {
    zone.addEventListener("dragover", event => {
      event.preventDefault();
      zone.classList.add("drag-over");
    });
    zone.addEventListener("dragleave", event => {
      if (!zone.contains(event.relatedTarget)) zone.classList.remove("drag-over");
    });
    zone.addEventListener("drop", event => {
      event.preventDefault();
      zone.classList.remove("drag-over");
      if (event.target.closest(".sidebar-layout-row")) return;
      const sourceId = state.draggedModuleId || event.dataTransfer.getData("text/plain");
      moveModuleToSection(sourceId, sectionId, true);
    });
  }

  function moveModule(moduleId, direction) {
    const entry = state.sidebarLayoutDraft.find(item => item.id === moduleId);
    if (!entry) return;
    const siblings = state.sidebarLayoutDraft.filter(item => item.section === entry.section).sort((a, b) => a.order - b.order);
    const index = siblings.findIndex(item => item.id === moduleId);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;
    const target = siblings[targetIndex];
    const oldOrder = entry.order;
    entry.order = target.order;
    target.order = oldOrder;
    normalizeDraftOrders();
    renderSidebarLayout();
  }

  function moveModuleToSection(moduleId, sectionId, append = true) {
    const entry = state.sidebarLayoutDraft.find(item => item.id === moduleId);
    if (!entry || !settings.sidebarSections.some(section => section.id === sectionId)) return;
    entry.section = sectionId;
    entry.order = append ? state.sidebarLayoutDraft.filter(item => item.section === sectionId && item.id !== moduleId).length : 0;
    normalizeDraftOrders();
    renderSidebarLayout();
  }

  function reorderByDrop(sourceId, targetId, targetSection) {
    if (!sourceId || sourceId === targetId) return;
    const source = state.sidebarLayoutDraft.find(item => item.id === sourceId);
    const target = state.sidebarLayoutDraft.find(item => item.id === targetId);
    if (!source || !target) return;
    source.section = targetSection;
    const siblings = state.sidebarLayoutDraft.filter(item => item.section === targetSection && item.id !== sourceId).sort((a, b) => a.order - b.order);
    const targetIndex = siblings.findIndex(item => item.id === targetId);
    siblings.splice(Math.max(0, targetIndex), 0, source);
    siblings.forEach((item, index) => { item.order = index; });
    normalizeDraftOrders();
    renderSidebarLayout();
  }

  function persistSidebarLayout() {
    state.sidebarLayoutDraft = settings.saveSidebarLayout(state.sidebarLayoutDraft).map(item => ({ ...item }));
    toast("Posições da sidebar salvas e aplicadas em todo o sistema.");
    renderSidebarLayout();
  }

  function restoreSidebarLayout() {
    if (!window.confirm("Restaurar a ordem padrão da sidebar?")) return;
    state.sidebarLayoutDraft = settings.resetSidebarLayout().map(item => ({ ...item }));
    toast("Ordem padrão restaurada.");
    renderSidebarLayout();
  }

  function updateSidebarCodePreview() {
    if (!el.sidebarConfigCode) return;
    el.sidebarConfigCode.textContent = settings.generateSidebarConfig(state.sidebarLayoutDraft || settings.getSidebarLayout());
  }

  async function copySidebarCode() {
    const code = settings.generateSidebarConfig(state.sidebarLayoutDraft || settings.getSidebarLayout());
    try {
      await navigator.clipboard.writeText(code);
      toast("Código da sidebar copiado.");
    } catch {
      const area = document.createElement("textarea");
      area.value = code;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      toast("Código da sidebar copiado.");
    }
  }

  function downloadSidebarCode() {
    const code = settings.generateSidebarConfig(state.sidebarLayoutDraft || settings.getSidebarLayout());
    const blob = new Blob([code], { type: "text/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sidebar-config.js";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Arquivo sidebar-config.js gerado.");
  }

  function createTopic(event) {
    event.preventDefault();
    const topic = settings.addTopic({
      name: el.topicName.value,
      icon: el.topicIcon.value,
      description: el.topicDescription.value,
      active: true
    });
    el.topicForm.reset();
    toast(`Tópico “${topic.name}” criado na sidebar.`);
    renderTopics();
    renderPermissionEditor();
  }

  function renderTopics() {
    const topics = settings.getTopics();
    const permissions = settings.getPermissions();
    el.topicListCount.textContent = `${topics.length} ${topics.length === 1 ? "tópico personalizado" : "tópicos personalizados"}`;
    el.topicList.innerHTML = "";

    if (!topics.length) {
      el.topicList.innerHTML = '<div class="topic-empty"><div><i class="fa-solid fa-layer-group"></i><strong>Nenhum tópico criado</strong><small>Use o formulário ao lado para adicionar uma nova área na sidebar.</small></div></div>';
      return;
    }

    topics.forEach(topic => {
      const accessCount = settings.getUsers().filter(user => ["admin", "administrador"].includes(settings.normalizeRole(user.role)) || (permissions[user.id] || []).includes(topic.id)).length;
      const row = document.createElement("article");
      row.className = "topic-row";
      row.innerHTML = `<span class="topic-row-icon"><i class="fa-solid ${escapeAttr(topic.icon || "fa-folder")}"></i></span><div><strong>${escapeHtml(topic.name)}</strong><small>${escapeHtml(topic.description || "Sem descrição")}</small></div><span class="topic-access-count"><i class="fa-solid fa-users"></i>&nbsp; ${accessCount} acessos</span><label class="topic-toggle" title="Ativar ou ocultar"><input type="checkbox" ${topic.active !== false ? "checked" : ""}><span></span></label><button type="button" class="delete" title="Excluir tópico"><i class="fa-solid fa-trash"></i></button>`;
      row.querySelector(".topic-toggle input").addEventListener("change", event => {
        settings.updateTopic(topic.id, { active: event.target.checked });
        toast(event.target.checked ? "Tópico reativado." : "Tópico ocultado da sidebar.");
        renderTopics();
      });
      row.querySelector("button.delete").addEventListener("click", () => {
        if (!window.confirm(`Excluir o tópico “${topic.name}”?`)) return;
        settings.removeTopic(topic.id);
        toast("Tópico removido.");
        state.sidebarLayoutDraft = null;
        renderSidebarLayout();
        renderTopics();
        renderPermissionEditor();
      });
      el.topicList.appendChild(row);
    });
  }

  function openTab(tab) {
    state.tab = tab;
    document.querySelectorAll("[data-profile-tab]").forEach(button => button.classList.toggle("active", button.dataset.profileTab === tab));
    document.querySelectorAll("[data-profile-panel]").forEach(panel => panel.classList.toggle("active", panel.dataset.profilePanel === tab));
  }

  function filterSettings(value) {
    const term = value.trim().toLowerCase();
    if (!term) {
      document.querySelectorAll(".profile-tab").forEach(button => button.classList.remove("search-match"));
      return;
    }
    const map = [
      { tab: "account", words: "perfil nome email unidade telefone conta" },
      { tab: "appearance", words: "tema aparência cor escuro claro azul roxo" },
      { tab: "team", words: "equipe usuário cargo gestor gerente financeiro laboratório colaborador cidade cadastrar acesso" },
      { tab: "access", words: "permissão acesso usuário admin módulo almoxarifado laudos" },
      { tab: "layout", words: "ordem posição organizar sidebar menu tópico seção código" },
      { tab: "topics", words: "tópico sidebar menu criar página" }
    ];
    const result = map.find(item => item.words.includes(term));
    if (result) openTab(result.tab);
  }

  function toast(message) {
    const node = document.createElement("div");
    node.className = "profile-toast";
    node.innerHTML = `<i class="fa-solid fa-circle-check"></i><span>${escapeHtml(message)}</span>`;
    el.profileToastStack.appendChild(node);
    setTimeout(() => node.remove(), 3200);
  }

  function isMobile() { return matchMedia("(max-width: 980px)").matches; }
  function storageGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
  function storageSet(key, value) { try { localStorage.setItem(key, value); } catch { /* sem armazenamento */ } }
  function initSidebar() {
    if (isMobile()) { document.body.classList.remove("sidebar-hidden"); closeMobile(); return; }
    const hidden = storageGet("lag-sidebar-hidden") !== "false";
    document.body.classList.toggle("sidebar-hidden", hidden);
    el.menuButton.setAttribute("aria-expanded", String(!hidden));
  }
  function toggleSidebar() {
    if (isMobile()) {
      const open = !el.sidebar.classList.contains("open");
      el.sidebar.classList.toggle("open", open);
      el.mobileOverlay.classList.toggle("show", open);
      return;
    }
    const hidden = document.body.classList.toggle("sidebar-hidden");
    storageSet("lag-sidebar-hidden", String(hidden));
  }
  function closeMobile() { el.sidebar.classList.remove("open"); el.mobileOverlay.classList.remove("show"); }
  function handleResize() { if (isMobile()) { document.body.classList.remove("sidebar-hidden"); closeMobile(); } else initSidebar(); }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  function escapeAttr(value) { return escapeHtml(value); }
})();
