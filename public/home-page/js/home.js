const get = key => { try { return localStorage.getItem(key); } catch { return null; } };
const set = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
const sidebar = document.getElementById("sidebar");
const menuButton = document.getElementById("menuButton");
const overlay = document.getElementById("mobileOverlay");
const search = document.getElementById("globalSearch");
const mobile = () => matchMedia("(max-width:980px)").matches;
const TASK_KEY = "lag-home-daily-pendencies-v1";
const CITY_ROLES = new Set(["admin", "administrador", "gerente", "gestor", "financeiro"]);

const taskUI = {};
let tasks = readTasks();

function settings() { return window.LAGSettings || null; }
function currentUser() { return settings()?.getCurrentUser?.() || { id: "local", name: "Usuário", role: "colaborador", unit: "Cerquilho" }; }
function role() { return settings()?.normalizeRole?.(currentUser().role) || String(currentUser().role || "colaborador").toLowerCase(); }
function canSwitchCity() { return settings()?.canSwitchCity?.(currentUser()) ?? CITY_ROLES.has(role()); }
function activeCity() { return settings()?.getActiveCity?.() || currentUser().unit || "Cerquilho"; }
function cityMatches(taskCity) { return activeCity() === "Todas as cidades" || taskCity === activeCity(); }
function todayKey() { return new Date().toISOString().slice(0, 10); }
function escapeHTML(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }

function readTasks() {
  try {
    const stored = JSON.parse(localStorage.getItem(TASK_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch { return []; }
}
function saveTasks() {
  localStorage.setItem(TASK_KEY, JSON.stringify(tasks));
  window.dispatchEvent(new CustomEvent("lag:daily-tasks-changed"));
}
function makeId() { return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }

function syncMenu() {
  const hidden = document.body.classList.contains("sidebar-hidden");
  menuButton?.setAttribute("aria-expanded", String(!hidden));
  menuButton?.setAttribute("aria-label", hidden ? "Abrir menu lateral" : "Fechar menu lateral");
}
function initSidebar() {
  if (get("lag-sidebar-hidden") === null) set("lag-sidebar-hidden", "true");
  const hidden = get("lag-sidebar-hidden") !== "false";
  document.body.classList.toggle("sidebar-hidden", hidden);
  if (mobile()) { sidebar?.classList.remove("open"); overlay?.classList.remove("show"); }
  syncMenu();
}
function toggleSidebar() {
  if (mobile()) {
    const open = !sidebar?.classList.contains("open");
    sidebar?.classList.toggle("open", open);
    overlay?.classList.toggle("show", open);
    document.body.classList.toggle("sidebar-hidden", !open);
  } else {
    const hidden = document.body.classList.toggle("sidebar-hidden");
    set("lag-sidebar-hidden", String(hidden));
  }
  syncMenu();
}
function closeSidebar() {
  sidebar?.classList.remove("open");
  overlay?.classList.remove("show");
  if (mobile()) document.body.classList.add("sidebar-hidden");
  syncMenu();
}

function filterHome(value) {
  if (taskUI.taskSearch) {
    taskUI.taskSearch.value = value;
    renderTasks();
  }
}

function populateCityControl() {
  const select = document.getElementById("homeCitySelect");
  const wrap = document.getElementById("homeCityControl");
  const cities = settings()?.cities || ["Todas as cidades", "Cerquilho", "Tatuí", "Embu das Artes", "Itapeva"];
  if (!select || !wrap) return;
  select.innerHTML = cities.map(city => `<option value="${escapeHTML(city)}">${escapeHTML(city)}</option>`).join("");
  select.value = activeCity();
  const allowed = canSwitchCity();
  wrap.classList.toggle("is-locked", !allowed);
  select.disabled = !allowed;
  wrap.title = allowed ? "Selecione a unidade que deseja acompanhar" : "A unidade foi definida no acesso deste usuário";
  document.getElementById("homeCityPermissionText").textContent = allowed ? "Você pode alternar entre as unidades" : "Unidade definida no acesso do usuário";
  document.getElementById("homeAccessNote").textContent = allowed
    ? "Seu cargo permite acompanhar uma unidade específica ou consolidar todas as cidades."
    : "Seu cargo acessa somente a cidade vinculada ao usuário no momento do cadastro.";
  document.querySelectorAll("[data-active-city]").forEach(node => node.textContent = activeCity());
  document.getElementById("workloadCityLabel").textContent = activeCity();
}

function taskUsers() {
  return (settings()?.getUsers?.() || []).filter(user => (settings()?.normalizeRole?.(user.role) || user.role) === "colaborador");
}
function assigneeFor(id) { return (settings()?.getUsers?.() || []).find(user => user.id === id); }
function canManageTasks() { return CITY_ROLES.has(role()); }
function canToggleTask(task) { return canManageTasks() || task.assigneeId === currentUser().id; }

function populateTaskControls() {
  const collaborators = taskUsers();
  const filter = taskUI.taskCollaboratorFilter;
  if (filter) {
    const selected = filter.value;
    filter.innerHTML = '<option value="">Todos os colaboradores</option>' + collaborators.map(user => `<option value="${escapeHTML(user.id)}">${escapeHTML(user.name)}</option>`).join("");
    if ([...filter.options].some(option => option.value === selected)) filter.value = selected;
  }
  if (taskUI.taskAssignee) {
    const available = collaborators.filter(user => activeCity() === "Todas as cidades" || user.unit === activeCity() || user.unit === "Todas as cidades");
    taskUI.taskAssignee.innerHTML = available.length
      ? available.map(user => `<option value="${escapeHTML(user.id)}">${escapeHTML(user.name)} — ${escapeHTML(user.unit)}</option>`).join("")
      : '<option value="">Nenhum colaborador disponível nesta cidade</option>';
  }
  if (taskUI.taskCity) {
    const cities = (settings()?.cities || []).filter(city => city !== "Todas as cidades");
    taskUI.taskCity.innerHTML = cities.map(city => `<option value="${escapeHTML(city)}">${escapeHTML(city)}</option>`).join("");
    taskUI.taskCity.value = activeCity() === "Todas as cidades" ? (cities[0] || "Cerquilho") : activeCity();
    taskUI.taskCity.disabled = activeCity() !== "Todas as cidades" && !canSwitchCity();
  }
  taskUI.addDailyTask?.classList.toggle("is-hidden", !canManageTasks());
}

function visibleTasks() {
  const query = String(taskUI.taskSearch?.value || "").trim().toLocaleLowerCase("pt-BR");
  const collaborator = taskUI.taskCollaboratorFilter?.value || "";
  const status = taskUI.taskStatusFilter?.value || "open";
  return tasks.filter(task => {
    if (!cityMatches(task.city)) return false;
    if (collaborator && task.assigneeId !== collaborator) return false;
    if (status === "open" && task.done) return false;
    if (status === "done" && !task.done) return false;
    const user = assigneeFor(task.assigneeId);
    return !query || `${task.title} ${task.note || ""} ${user?.name || ""}`.toLocaleLowerCase("pt-BR").includes(query);
  }).sort((a, b) => Number(a.done) - Number(b.done) || (a.priority === "alta" ? -1 : b.priority === "alta" ? 1 : 0) || String(a.deadline || "23:59").localeCompare(String(b.deadline || "23:59")));
}

function taskTemplate(task) {
  const assignee = assigneeFor(task.assigneeId) || { name: "Colaborador removido", initials: "--" };
  const priorityLabel = task.priority === "alta" ? "Alta" : task.priority === "baixa" ? "Baixa" : "Normal";
  return `<article class="daily-task${task.done ? " is-done" : ""}" data-task-id="${escapeHTML(task.id)}">
    <button class="task-check" type="button" data-task-action="toggle" ${canToggleTask(task) ? "" : "disabled"} aria-label="${task.done ? "Reabrir" : "Concluir"} pendência"><i class="fa-solid ${task.done ? "fa-check" : "fa-circle"}"></i></button>
    <span class="task-avatar">${escapeHTML(assignee.initials || assignee.name.split(/\\s+/).slice(0,2).map(part => part[0]).join(""))}</span>
    <div class="task-copy"><strong>${escapeHTML(task.title)}</strong><small>${escapeHTML(assignee.name)} • ${escapeHTML(task.city)}${task.deadline ? ` • até ${escapeHTML(task.deadline)}` : ""}</small>${task.note ? `<p>${escapeHTML(task.note)}</p>` : ""}</div>
    <span class="task-priority ${escapeHTML(task.priority)}">${priorityLabel}</span>
    ${canManageTasks() ? '<button class="task-delete" type="button" data-task-action="delete" aria-label="Excluir"><i class="fa-solid fa-trash"></i></button>' : ''}
  </article>`;
}

function renderTasks() {
  const list = visibleTasks();
  taskUI.dailyTaskList.innerHTML = list.map(taskTemplate).join("");
  taskUI.dailyTaskEmpty.hidden = Boolean(list.length);
  const cityTasks = tasks.filter(task => cityMatches(task.city));
  document.getElementById("taskOpenCount").textContent = cityTasks.filter(task => !task.done).length;
  document.getElementById("taskHighCount").textContent = cityTasks.filter(task => !task.done && task.priority === "alta").length;
  document.getElementById("taskPeopleCount").textContent = new Set(cityTasks.filter(task => !task.done).map(task => task.assigneeId)).size;
  document.getElementById("taskDoneCount").textContent = cityTasks.filter(task => task.done && task.completedDate === todayKey()).length;
  renderWorkload(cityTasks);
}

function renderWorkload(cityTasks) {
  const collaborators = taskUsers().filter(user => activeCity() === "Todas as cidades" || user.unit === activeCity());
  const rows = collaborators.map(user => {
    const userTasks = cityTasks.filter(task => task.assigneeId === user.id);
    const open = userTasks.filter(task => !task.done).length;
    const done = userTasks.filter(task => task.done).length;
    const total = Math.max(1, open + done);
    const percent = Math.round((done / total) * 100);
    return `<div class="workload-row"><span class="task-avatar">${escapeHTML(user.initials || "--")}</span><div><strong>${escapeHTML(user.name)}</strong><small>${open} em aberto • ${done} concluídas</small><i><b style="width:${percent}%"></b></i></div><em>${open}</em></div>`;
  });
  taskUI.collaboratorWorkload.innerHTML = rows.join("") || '<div class="workload-empty"><i class="fa-solid fa-users"></i><span>Nenhum colaborador cadastrado para esta unidade.</span></div>';
}

function openTaskModal() {
  if (!canManageTasks()) return;
  populateTaskControls();
  taskUI.dailyTaskForm.reset();
  if (taskUI.taskCity) taskUI.taskCity.value = activeCity() === "Todas as cidades" ? "Cerquilho" : activeCity();
  taskUI.taskModal.hidden = false;
  document.body.classList.add("task-modal-open");
  setTimeout(() => taskUI.taskTitle?.focus(), 30);
}
function closeTaskModal() {
  taskUI.taskModal.hidden = true;
  document.body.classList.remove("task-modal-open");
}
function addTask(event) {
  event.preventDefault();
  const assignee = assigneeFor(taskUI.taskAssignee.value);
  if (!assignee) return;
  tasks.unshift({
    id: makeId(),
    title: taskUI.taskTitle.value.trim(),
    assigneeId: assignee.id,
    city: taskUI.taskCity.value,
    priority: taskUI.taskPriority.value,
    deadline: taskUI.taskDeadline.value,
    note: taskUI.taskNote.value.trim(),
    done: false,
    createdAt: new Date().toISOString(),
    createdBy: currentUser().id
  });
  saveTasks();
  closeTaskModal();
  renderTasks();
}
function handleTaskAction(event) {
  const button = event.target.closest("[data-task-action]");
  const row = event.target.closest("[data-task-id]");
  if (!button || !row) return;
  const task = tasks.find(item => item.id === row.dataset.taskId);
  if (!task) return;
  if (button.dataset.taskAction === "toggle" && canToggleTask(task)) {
    task.done = !task.done;
    task.completedDate = task.done ? todayKey() : "";
  }
  if (button.dataset.taskAction === "delete" && canManageTasks()) {
    tasks = tasks.filter(item => item.id !== task.id);
  }
  saveTasks();
  renderTasks();
}

function cacheTaskUI() {
  ["addDailyTask","taskSearch","taskCollaboratorFilter","taskStatusFilter","dailyTaskList","dailyTaskEmpty","collaboratorWorkload","taskModal","dailyTaskForm","taskTitle","taskAssignee","taskCity","taskPriority","taskDeadline","taskNote"].forEach(id => taskUI[id] = document.getElementById(id));
}

function bindTaskEvents() {
  taskUI.addDailyTask?.addEventListener("click", openTaskModal);
  taskUI.dailyTaskForm?.addEventListener("submit", addTask);
  taskUI.dailyTaskList?.addEventListener("click", handleTaskAction);
  [taskUI.taskSearch, taskUI.taskCollaboratorFilter, taskUI.taskStatusFilter].forEach(control => control?.addEventListener(control === taskUI.taskSearch ? "input" : "change", renderTasks));
  document.querySelectorAll("[data-close-task-modal]").forEach(button => button.addEventListener("click", closeTaskModal));
  document.getElementById("homeCitySelect")?.addEventListener("change", event => {
    if (!canSwitchCity()) return;
    settings()?.setActiveCity?.(event.target.value, false);
    populateCityControl();
    populateTaskControls();
    renderTasks();
    window.LAGNotifications?.refresh?.();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initSidebar();
  cacheTaskUI();
  populateCityControl();
  populateTaskControls();
  bindTaskEvents();
  renderTasks();
  const date = document.getElementById("currentDate");
  if (date) date.innerHTML = `<i class="fa-regular fa-calendar"></i> ${new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date())}`;
  menuButton?.addEventListener("click", toggleSidebar);
  overlay?.addEventListener("click", closeSidebar);
  search?.addEventListener("input", event => filterHome(event.target.value));
  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); search?.focus(); }
    if (event.key === "Escape" && !taskUI.taskModal?.hidden) closeTaskModal();
  });
  window.addEventListener("resize", () => { if (mobile()) closeSidebar(); else initSidebar(); });
  window.addEventListener("lag:settings-changed", () => { populateCityControl(); populateTaskControls(); renderTasks(); });
  window.addEventListener("storage", event => { if (event.key === TASK_KEY) { tasks = readTasks(); renderTasks(); } });
});
