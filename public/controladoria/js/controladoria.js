const STORAGE_KEY = "amorSaudeControladoriaDocsV2";
const LEGACY_STORAGE_KEY = "amorSaudeControladoriaDocs";
const VIEW_MODE_KEY = "lagControladoriaViewMode";
const CONTROL_FILE_DB = "lag-controladoria-files-v1";
const CONTROL_FILE_STORE = "files";

const FOLDERS = [
  "Termos de Responsabilidade",
  "Valores de Médicos",
  "Documentos Administrativos",
  "Modelos e Procedimentos",
  "Pendências por Unidade"
];

const FOLDER_META = {
  "Termos de Responsabilidade": { icon: "fa-file-signature", description: "Termos e declarações" },
  "Valores de Médicos": { icon: "fa-money-check-dollar", description: "Consultas e repasses" },
  "Documentos Administrativos": { icon: "fa-building-shield", description: "Arquivos internos" },
  "Modelos e Procedimentos": { icon: "fa-diagram-project", description: "Rotinas e instruções" },
  "Pendências por Unidade": { icon: "fa-list-check", description: "Acompanhamentos locais" }
};

const DEFAULT_DOCS = [
  {
    id: "doc-termo-atendimento",
    title: "Termo de responsabilidade do atendimento",
    folder: "Termos de Responsabilidade",
    type: "Termo",
    city: "Todas",
    tags: "termo, atendimento, recepção, paciente",
    content: "TERMO DE RESPONSABILIDADE DO ATENDIMENTO\n\nDeclaro que recebi as orientações de atendimento, confirmação de dados, horários e documentos necessários para a realização do procedimento ou consulta.\n\nResponsável pelo atendimento:\nPaciente:\nData:\nAssinatura:",
    note: "Modelo base para adaptar por unidade.",
    updatedAt: new Date().toISOString()
  },
  {
    id: "doc-valores-medicos",
    title: "Tabela de valores médicos",
    folder: "Valores de Médicos",
    type: "Tabela de valores",
    city: "Todas",
    tags: "valores, médicos, consulta, financeiro",
    content: "TABELA DE VALORES MÉDICOS\n\nClínico geral: R$ 00,00\nGinecologia: R$ 00,00\nOftalmologia: R$ 00,00\nReumatologia: R$ 00,00\nFisioterapia: R$ 00,00\n\nObservação: atualizar valores conforme orientação do financeiro.",
    note: "Preencher com os valores aprovados pela gestão.",
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: "doc-procedimento-conferencia",
    title: "Procedimento de conferência diária",
    folder: "Modelos e Procedimentos",
    type: "Procedimento",
    city: "Todas",
    tags: "checklist, rotina, controladoria",
    content: "PROCEDIMENTO DE CONFERÊNCIA DIÁRIA\n\n1. Conferir documentos pendentes.\n2. Validar valores lançados.\n3. Revisar termos assinados.\n4. Registrar pendências por cidade.\n5. Enviar resumo para a liderança.",
    note: "Pode virar checklist por colaborador.",
    updatedAt: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: "doc-pendencias-cerquilho",
    title: "Pendências da unidade Cerquilho",
    folder: "Pendências por Unidade",
    type: "Checklist",
    city: "Cerquilho",
    tags: "pendências, unidade, controladoria",
    content: "PENDÊNCIAS DA UNIDADE\n\nCidade: Cerquilho\nResponsável:\nData:\n\nPendência 1:\nStatus:\nPrazo:\n\nPendência 2:\nStatus:\nPrazo:",
    note: "Duplicar para criar listas de outras cidades.",
    updatedAt: new Date(Date.now() - 259200000).toISOString()
  }
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const byId = (id) => document.getElementById(id);

const ui = {
  foldersGrid: byId("foldersGrid"),
  documentsGrid: byId("documentsGrid"),
  docSearch: byId("docSearch"),
  clearSearch: byId("clearSearch"),
  newDocument: byId("newDocument"),
  documentForm: byId("documentForm"),
  duplicateDocument: byId("duplicateDocument"),
  deleteDocument: byId("deleteDocument"),
  cancelEdit: byId("cancelEdit"),
  showAllFolders: byId("showAllFolders"),
  activeFolderLabel: byId("activeFolderLabel"),
  resultCount: byId("resultCount"),
  editorTitle: byId("editorTitle"),
  saveStatus: byId("saveStatus"),
  statDocs: byId("statDocs"),
  statFolders: byId("statFolders"),
  statTerms: byId("statTerms"),
  statValues: byId("statValues"),
  controlCidadeSelect: byId("controlCidadeSelect"),
  editorPanel: byId("editorPanel"),
  viewerPanel: byId("viewerPanel"),
  viewerContent: byId("viewerContent"),
  viewerFolder: byId("viewerFolder"),
  viewerTitle: byId("viewerTitle"),
  viewerMeta: byId("viewerMeta"),
  viewerText: byId("viewerText"),
  viewerNoteWrap: byId("viewerNoteWrap"),
  viewerNote: byId("viewerNote"),
  closeViewer: byId("closeViewer"),
  closeEditor: byId("closeEditor"),
  controlBackdrop: byId("controlBackdrop"),
  editViewedDocument: byId("editViewedDocument"),
  duplicateViewedDocument: byId("duplicateViewedDocument"),
  copyViewedDocument: byId("copyViewedDocument"),
  typeFilter: byId("typeFilter"),
  cityFilter: byId("cityFilter"),
  sortDocuments: byId("sortDocuments"),
  allDocumentsCount: byId("allDocumentsCount"),
  folderCountBadge: byId("folderCountBadge"),
  lastUpdateLabel: byId("lastUpdateLabel"),
  documentsSummary: byId("documentsSummary"),
  exportDocuments: byId("exportDocuments"),
  importDocuments: byId("importDocuments"),
  storageStatus: byId("storageStatus"),
  contentCounter: byId("contentCounter"),
  noteCounter: byId("noteCounter"),
  toastRegion: byId("toastRegion"),
  sidebar: byId("sidebar"),
  mobileOverlay: byId("mobileOverlay"),
  menuButton: byId("menuButton"),
  themeButton: byId("themeButton"),
  topControlSearch: byId("topControlSearch"),
  viewerAttachment: byId("viewerAttachment"),
  viewerAttachmentName: byId("viewerAttachmentName"),
  viewerAttachmentMeta: byId("viewerAttachmentMeta"),
  downloadViewedAttachment: byId("downloadViewedAttachment"),
  attachmentStatus: byId("attachmentStatus")
};

const fields = {
  id: byId("docId"),
  title: byId("docTitle"),
  folder: byId("docFolder"),
  type: byId("docType"),
  city: byId("docCity"),
  tags: byId("docTags"),
  content: byId("docContent"),
  note: byId("docNote"),
  attachment: byId("docAttachment"),
  removeAttachment: byId("removeAttachment")
};

const state = {
  docs: loadDocs(),
  activeFolder: "",
  viewedId: "",
  editingId: "",
  editorBaseline: "",
  editorDirty: false,
  viewMode: localStorage.getItem(VIEW_MODE_KEY) === "list" ? "list" : "grid",
  lastFocusedElement: null
};

function cloneDefaults() {
  return DEFAULT_DOCS.map((doc) => ({ ...doc }));
}

function makeId() {
  return `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeDocument(doc = {}) {
  const folder = FOLDERS.includes(doc.folder) ? doc.folder : "Documentos Administrativos";
  return {
    id: String(doc.id || makeId()),
    title: String(doc.title || "Documento sem título").trim() || "Documento sem título",
    folder,
    type: String(doc.type || "Documento"),
    city: String(doc.city || "Todas"),
    tags: String(doc.tags || ""),
    content: String(doc.content || ""),
    note: String(doc.note || ""),
    attachmentName: String(doc.attachmentName || ""),
    attachmentType: String(doc.attachmentType || ""),
    attachmentSize: Number(doc.attachmentSize || 0),
    updatedAt: validDate(doc.updatedAt) ? doc.updatedAt : new Date().toISOString()
  };
}

function validDate(value) {
  return Boolean(value && !Number.isNaN(new Date(value).getTime()));
}

function loadDocs() {
  for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(stored) && stored.length) {
        const normalized = stored.map(normalizeDocument);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
      }
    } catch (error) {
      console.warn("Não foi possível ler os documentos salvos.", error);
    }
  }

  const defaults = cloneDefaults();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  } catch (error) {
    console.warn("Não foi possível iniciar o armazenamento local.", error);
  }
  return defaults;
}

function saveDocs(message = "Alterações salvas") {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.docs));
    if (ui.storageStatus) ui.storageStatus.textContent = `Salvo às ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date())}`;
    return true;
  } catch (error) {
    console.error("Não foi possível salvar os documentos.", error);
    showToast("Erro ao salvar", "O navegador não permitiu gravar os dados. Exporte um backup e tente novamente.", "error");
    setStatus("Erro ao salvar", "error");
    return false;
  }
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHTML(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatCity(city) {
  return city === "Tatui" ? "Tatuí" : city;
}

function formatDate(iso, includeTime = true) {
  if (!validDate(iso)) return "Sem data";
  try {
    return new Intl.DateTimeFormat("pt-BR", includeTime
      ? { dateStyle: "short", timeStyle: "short" }
      : { dateStyle: "short" }).format(new Date(iso));
  } catch {
    return "Sem data";
  }
}

function relativeDate(iso) {
  if (!validDate(iso)) return "Sem atualização";
  const difference = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(difference / 60000);
  if (minutes < 1) return "Atualizado agora";
  if (minutes < 60) return `Atualizado há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Atualizado há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Atualizado há ${days} ${days === 1 ? "dia" : "dias"}`;
  return `Atualizado em ${formatDate(iso, false)}`;
}


function currentUserContext() {
  const api = window.LAGSettings;
  const user = api?.getCurrentUser?.() || { role: "admin", unit: getCurrentCity() };
  const role = api?.normalizeRole?.(user.role) || String(user.role || "admin").toLowerCase();
  return { user, role, isAdmin: ["admin", "administrador"].includes(role), city: api?.normalizeCity?.(user.unit) || formatCity(user.unit || getCurrentCity()) };
}

function canSeeDocument(doc) {
  const context = currentUserContext();
  return context.isAdmin || doc.city === "Todas" || formatCity(doc.city) === formatCity(context.city);
}

function openControlFileDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CONTROL_FILE_DB, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(CONTROL_FILE_STORE)) request.result.createObjectStore(CONTROL_FILE_STORE, { keyPath: "id" }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function controlFileAction(mode, callback) {
  const db = await openControlFileDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONTROL_FILE_STORE, mode);
    const request = callback(tx.objectStore(CONTROL_FILE_STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function saveControlAttachment(id, file) {
  return controlFileAction("readwrite", store => store.put({ id, blob: file, name: file.name, type: file.type, size: file.size, savedAt: new Date().toISOString() }));
}
async function getControlAttachment(id) { try { return await controlFileAction("readonly", store => store.get(id)); } catch { return null; } }
async function deleteControlAttachment(id) { try { return await controlFileAction("readwrite", store => store.delete(id)); } catch { return null; } }
function formatBytes(bytes) { if (!bytes) return "0 KB"; const units=["B","KB","MB","GB"]; const index=Math.min(Math.floor(Math.log(bytes)/Math.log(1024)),units.length-1); return `${(bytes/1024**index).toFixed(index?1:0)} ${units[index]}`; }

function docIcon(type) {
  const normalizedType = normalize(type);
  if (normalizedType.includes("valor")) return "fa-money-check-dollar";
  if (normalizedType.includes("termo")) return "fa-file-signature";
  if (normalizedType.includes("check")) return "fa-list-check";
  if (normalizedType.includes("proced")) return "fa-diagram-project";
  return "fa-file-lines";
}

function getCurrentCity() {
  return window.usuarioLogado?.cidade || localStorage.getItem("amorSaudeCidadeSelecionada") || "Cerquilho";
}

function setStatus(text, type = "") {
  if (!ui.saveStatus) return;
  ui.saveStatus.textContent = text;
  ui.saveStatus.className = `status-dot${type ? ` ${type}` : ""}`;
}

function showToast(title, message, type = "success") {
  if (!ui.toastRegion) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const icon = type === "error" ? "fa-circle-exclamation" : type === "success" ? "fa-circle-check" : "fa-circle-info";
  toast.innerHTML = `<i class="fa-solid ${icon}"></i><div><strong>${escapeHTML(title)}</strong><span>${escapeHTML(message)}</span></div>`;
  ui.toastRegion.appendChild(toast);
  window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    window.setTimeout(() => toast.remove(), 180);
  }, 3600);
}

function animateNumber(element, target) {
  if (!element) return;
  const start = Number(element.textContent) || 0;
  const duration = 280;
  const startTime = performance.now();
  const tick = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    element.textContent = Math.round(start + (target - start) * progress);
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function getFilteredDocs() {
  const term = normalize(ui.docSearch?.value);
  const type = ui.typeFilter?.value || "";
  const city = ui.cityFilter?.value || "";

  const filtered = state.docs.filter((doc) => {
    if (!canSeeDocument(doc)) return false;
    const matchesFolder = state.activeFolder ? doc.folder === state.activeFolder : true;
    const matchesType = type ? doc.type === type : true;
    const matchesCity = city ? doc.city === city || doc.city === "Todas" : true;
    const searchable = normalize(`${doc.title} ${doc.folder} ${doc.type} ${doc.city} ${doc.tags} ${doc.content} ${doc.note}`);
    return matchesFolder && matchesType && matchesCity && searchable.includes(term);
  });

  const sort = ui.sortDocuments?.value || "updated-desc";
  return filtered.sort((a, b) => {
    if (sort === "updated-asc") return new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0);
    if (sort === "title-asc") return a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" });
    if (sort === "title-desc") return b.title.localeCompare(a.title, "pt-BR", { sensitivity: "base" });
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  });
}

function updateStats() {
  const visibleDocs = state.docs.filter(canSeeDocument);
  const activeFolders = new Set(visibleDocs.map((doc) => doc.folder)).size;
  const terms = visibleDocs.filter((doc) => normalize(doc.type).includes("termo") || normalize(doc.folder).includes("termos")).length;
  const values = visibleDocs.filter((doc) => normalize(doc.type).includes("valor") || normalize(doc.folder).includes("valores")).length;

  animateNumber(ui.statDocs, visibleDocs.length);
  animateNumber(ui.statFolders, activeFolders);
  animateNumber(ui.statTerms, terms);
  animateNumber(ui.statValues, values);

  if (ui.allDocumentsCount) ui.allDocumentsCount.textContent = `${visibleDocs.length} ${visibleDocs.length === 1 ? "arquivo" : "arquivos"}`;
  if (ui.folderCountBadge) ui.folderCountBadge.textContent = FOLDERS.length;

  const latest = [...visibleDocs].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0];
  if (ui.lastUpdateLabel) ui.lastUpdateLabel.textContent = latest ? relativeDate(latest.updatedAt) : "Sem atualizações";
}

function renderFolders() {
  if (!ui.foldersGrid) return;
  ui.foldersGrid.innerHTML = "";
  ui.showAllFolders?.classList.toggle("is-active", !state.activeFolder);

  FOLDERS.forEach((folder) => {
    const count = state.docs.filter((doc) => canSeeDocument(doc) && doc.folder === folder).length;
    const meta = FOLDER_META[folder] || { icon: "fa-folder", description: "Arquivos internos" };
    const card = document.createElement("button");
    card.type = "button";
    card.className = `folder-card${state.activeFolder === folder ? " active" : ""}`;
    card.dataset.folder = folder;
    card.innerHTML = `
      <span class="folder-icon"><i class="fa-solid ${meta.icon}"></i></span>
      <span class="folder-copy">
        <strong>${escapeHTML(folder)}</strong>
        <small>${count} ${count === 1 ? "arquivo" : "arquivos"} · ${escapeHTML(meta.description)}</small>
      </span>
      <i class="fa-solid fa-chevron-right folder-arrow" aria-hidden="true"></i>
    `;
    ui.foldersGrid.appendChild(card);
  });
}

function documentCardTemplate(doc) {
  const tags = String(doc.tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 2);
  if (doc.city && doc.city !== "Todas") tags.unshift(formatCity(doc.city));

  const content = String(doc.content || "").trim();
  const excerpt = content || "Documento sem conteúdo preenchido.";
  const active = state.viewedId === doc.id || state.editingId === doc.id ? " active" : "";

  return `
    <article class="document-card${active}" data-document-id="${escapeHTML(doc.id)}" tabindex="0" aria-label="Abrir ${escapeHTML(doc.title)}">
      <div class="document-top">
        <div class="doc-icon-title">
          <span class="doc-icon"><i class="fa-solid ${docIcon(doc.type)}"></i></span>
          <div>
            <strong>${escapeHTML(doc.title)}</strong>
            <small>${escapeHTML(doc.folder)}<br>${escapeHTML(relativeDate(doc.updatedAt))}${doc.attachmentName ? " · 📎" : ""}</small>
          </div>
        </div>
        <span class="type-pill" title="${escapeHTML(doc.type)}">${escapeHTML(doc.type)}</span>
      </div>
      <p>${escapeHTML(excerpt.slice(0, 185))}${excerpt.length > 185 ? "…" : ""}</p>
      <div class="tag-row">${tags.length ? tags.map((tag) => `<span>${escapeHTML(tag)}</span>`).join("") : "<span>Sem tags</span>"}</div>
      <div class="document-actions">
        <button class="soft-btn" type="button" data-action="view" data-id="${escapeHTML(doc.id)}"><i class="fa-regular fa-eye"></i> Ver conteúdo</button>
        <button class="primary-btn" type="button" data-action="edit" data-id="${escapeHTML(doc.id)}"><i class="fa-solid fa-pen"></i> Editar</button>
      </div>
    </article>
  `;
}

function renderDocuments() {
  if (!ui.documentsGrid) return;
  const filtered = getFilteredDocs();
  ui.documentsGrid.classList.toggle("is-list", state.viewMode === "list");
  ui.documentsGrid.innerHTML = "";
  if (ui.resultCount) ui.resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? "item" : "itens"}`;

  const filters = [];
  if (state.activeFolder) filters.push(state.activeFolder);
  if (ui.typeFilter?.value) filters.push(ui.typeFilter.value);
  if (ui.cityFilter?.value) filters.push(formatCity(ui.cityFilter.value));
  if (ui.docSearch?.value.trim()) filters.push(`Busca: “${ui.docSearch.value.trim()}”`);
  if (ui.documentsSummary) ui.documentsSummary.textContent = filters.length ? filters.join(" · ") : "Acesse, revise e atualize os arquivos internos.";

  if (!filtered.length) {
    ui.documentsGrid.innerHTML = `
      <div class="empty-state">
        <div>
          <span class="empty-state-icon"><i class="fa-regular fa-folder-open"></i></span>
          <h3>Nenhum documento encontrado</h3>
          <p>Limpe os filtros, selecione outra pasta ou crie um documento novo.</p>
          <button class="primary-btn" type="button" data-empty-action="new"><i class="fa-solid fa-plus"></i> Criar documento</button>
        </div>
      </div>
    `;
    return;
  }

  ui.documentsGrid.innerHTML = filtered.map(documentCardTemplate).join("");
}

function renderAll() {
  renderFolders();
  renderDocuments();
  updateStats();
}

function setActiveFolder(folder = "") {
  state.activeFolder = folder;
  if (ui.activeFolderLabel) ui.activeFolderLabel.textContent = folder || "Todos os arquivos";
  renderAll();
}

function serializeEditor() {
  return JSON.stringify({
    title: fields.title?.value || "",
    folder: fields.folder?.value || "",
    type: fields.type?.value || "",
    city: fields.city?.value || "",
    tags: fields.tags?.value || "",
    content: fields.content?.value || "",
    note: fields.note?.value || "",
    attachmentName: fields.attachment?.files?.[0]?.name || state.docs.find(item => item.id === fields.id?.value)?.attachmentName || "",
    removeAttachment: Boolean(fields.removeAttachment?.checked)
  });
}

function updateCharacterCounters() {
  if (ui.contentCounter && fields.content) ui.contentCounter.textContent = `${fields.content.value.length.toLocaleString("pt-BR")} / 20.000`;
  if (ui.noteCounter && fields.note) ui.noteCounter.textContent = `${fields.note.value.length.toLocaleString("pt-BR")} / 1.000`;
}

function markEditorPristine() {
  state.editorBaseline = serializeEditor();
  state.editorDirty = false;
  setStatus(state.editingId ? "Editando" : "Novo");
}

function updateEditorDirtyState() {
  state.editorDirty = serializeEditor() !== state.editorBaseline;
  setStatus(state.editorDirty ? "Não salvo" : (state.editingId ? "Editando" : "Novo"), state.editorDirty ? "unsaved" : "");
  updateCharacterCounters();
}

function fillEditor(doc) {
  if (!fields.id) return;
  fields.id.value = doc?.id || "";
  fields.title.value = doc?.title || "";
  fields.folder.value = doc?.folder || state.activeFolder || "Termos de Responsabilidade";
  fields.type.value = doc?.type || "Documento";
  fields.city.value = doc?.city || getCurrentCity() || "Todas";
  fields.tags.value = doc?.tags || "";
  fields.content.value = doc?.content || "";
  fields.note.value = doc?.note || "";
  if (fields.attachment) fields.attachment.value = "";
  if (fields.removeAttachment) fields.removeAttachment.checked = false;
  if (ui.attachmentStatus) ui.attachmentStatus.textContent = doc?.attachmentName ? `Arquivo atual: ${doc.attachmentName} (${formatBytes(doc.attachmentSize)})` : "PDF, Word, Excel ou imagem";
  ui.editorTitle.textContent = doc?.id ? "Editar documento" : "Novo documento";
  ui.deleteDocument.disabled = !doc?.id;
  ui.duplicateDocument.disabled = !doc?.id;
  fields.title.classList.remove("field-error");
  updateCharacterCounters();
  markEditorPristine();
}

function openModal(panel) {
  state.lastFocusedElement = document.activeElement;
  document.body.classList.add("control-modal-open");
  ui.controlBackdrop.hidden = false;
  panel.hidden = false;
  requestAnimationFrame(() => {
    ui.controlBackdrop.classList.add("is-visible");
    panel.classList.add("is-modal-open");
  });
}

function hideModal(panel) {
  panel.classList.remove("is-modal-open");
  ui.controlBackdrop.classList.remove("is-visible");
  window.setTimeout(() => {
    panel.hidden = true;
    if (ui.viewerPanel.hidden && ui.editorPanel.hidden) {
      ui.controlBackdrop.hidden = true;
      document.body.classList.remove("control-modal-open");
      state.lastFocusedElement?.focus?.();
    }
  }, 190);
}

function openViewer(id) {
  const doc = state.docs.find((item) => item.id === id);
  if (!doc) return;

  state.viewedId = id;
  state.editingId = "";
  ui.viewerFolder.textContent = doc.folder || "Documento";
  ui.viewerTitle.textContent = doc.title || "Documento";
  ui.viewerMeta.innerHTML = [doc.type, formatCity(doc.city || "Todas"), formatDate(doc.updatedAt)]
    .filter(Boolean)
    .map((item) => `<span>${escapeHTML(item)}</span>`)
    .join("");
  ui.viewerText.textContent = doc.content || "Sem conteúdo preenchido.";
  ui.viewerNote.textContent = doc.note || "";
  ui.viewerNoteWrap.hidden = !doc.note;
  if (ui.viewerAttachment) {
    ui.viewerAttachment.hidden = !doc.attachmentName;
    ui.viewerAttachmentName.textContent = doc.attachmentName || "Arquivo anexado";
    ui.viewerAttachmentMeta.textContent = doc.attachmentName ? `${doc.attachmentType || "Documento"} • ${formatBytes(doc.attachmentSize)}` : "";
  }

  ui.editorPanel.classList.remove("is-modal-open");
  ui.editorPanel.hidden = true;
  openModal(ui.viewerPanel);
  window.setTimeout(() => ui.closeViewer?.focus(), 70);
  renderDocuments();
}

function closeViewer() {
  state.viewedId = "";
  hideModal(ui.viewerPanel);
  renderDocuments();
}

function openEditor(id = "") {
  const doc = id ? state.docs.find((item) => item.id === id) : null;
  state.editingId = doc?.id || "";
  state.viewedId = doc?.id || "";
  fillEditor(doc);
  ui.viewerPanel.classList.remove("is-modal-open");
  ui.viewerPanel.hidden = true;
  openModal(ui.editorPanel);
  window.setTimeout(() => fields.title?.focus(), 90);
  renderDocuments();
}

function requestCloseEditor() {
  if (state.editorDirty && !window.confirm("Fechar o editor sem salvar as alterações?")) return;
  const returnId = state.editingId;
  state.editorDirty = false;
  hideModal(ui.editorPanel);
  if (returnId && state.docs.some((doc) => doc.id === returnId)) {
    window.setTimeout(() => openViewer(returnId), 195);
  } else {
    state.editingId = "";
    state.viewedId = "";
    renderDocuments();
  }
}

async function upsertDocument(event) {
  event.preventDefault();
  fields.title.classList.remove("field-error");
  const title = fields.title.value.trim();

  if (!title) {
    fields.title.classList.add("field-error");
    fields.title.focus();
    setStatus("Informe o nome", "error");
    showToast("Nome obrigatório", "Digite um nome para salvar o documento.", "error");
    return;
  }

  setStatus("Salvando…", "saving");
  const id = fields.id.value || makeId();
  const context = currentUserContext();
  const existing = state.docs.find(item => item.id === id);
  const city = context.isAdmin ? fields.city.value : context.city;
  const selectedFile = fields.attachment?.files?.[0];
  if (selectedFile && selectedFile.size > 20 * 1024 * 1024) { setStatus("Arquivo muito grande", "error"); showToast("Arquivo muito grande", "Use um documento de até 20 MB.", "error"); return; }
  if (fields.removeAttachment?.checked) await deleteControlAttachment(id);
  if (selectedFile) await saveControlAttachment(id, selectedFile);
  const payload = normalizeDocument({
    id,
    title,
    folder: fields.folder.value,
    type: fields.type.value,
    city,
    tags: fields.tags.value.trim(),
    content: fields.content.value.trim(),
    note: fields.note.value.trim(),
    attachmentName: fields.removeAttachment?.checked ? "" : (selectedFile?.name || existing?.attachmentName || ""),
    attachmentType: fields.removeAttachment?.checked ? "" : (selectedFile?.type || existing?.attachmentType || ""),
    attachmentSize: fields.removeAttachment?.checked ? 0 : (selectedFile?.size || existing?.attachmentSize || 0),
    updatedAt: new Date().toISOString()
  });

  const index = state.docs.findIndex((item) => item.id === id);
  if (index >= 0) state.docs[index] = payload;
  else state.docs.unshift(payload);

  if (!saveDocs()) return;
  state.editorDirty = false;
  state.editingId = "";
  state.viewedId = id;
  setStatus("Salvo", "saved");
  renderAll();
  hideModal(ui.editorPanel);
  window.setTimeout(() => openViewer(id), 195);
  showToast("Documento salvo", `“${payload.title}” foi atualizado com sucesso.`, "success");
}

async function removeDocument() {
  const id = state.editingId || state.viewedId;
  if (!id) return;
  const doc = state.docs.find((item) => item.id === id);
  if (!window.confirm(`Excluir “${doc?.title || "documento"}”? Esta ação não pode ser desfeita.`)) return;

  state.docs = state.docs.filter((item) => item.id !== id);
  await deleteControlAttachment(id);
  state.editingId = "";
  state.viewedId = "";
  state.editorDirty = false;
  saveDocs();
  hideModal(ui.editorPanel);
  hideModal(ui.viewerPanel);
  renderAll();
  showToast("Documento excluído", "O arquivo foi removido da biblioteca.", "success");
}

function duplicateById(id) {
  const doc = state.docs.find((item) => item.id === id);
  if (!doc) return;
  const copy = normalizeDocument({
    ...doc,
    id: makeId(),
    title: `${doc.title} — cópia`,
    attachmentName: "", attachmentType: "", attachmentSize: 0,
    updatedAt: new Date().toISOString()
  });
  state.docs.unshift(copy);
  saveDocs();
  renderAll();
  if (!ui.editorPanel.hidden) hideModal(ui.editorPanel);
  if (!ui.viewerPanel.hidden) hideModal(ui.viewerPanel);
  window.setTimeout(() => openViewer(copy.id), 195);
  showToast("Documento duplicado", "Uma nova cópia foi criada.", "success");
}

async function copyViewedContent() {
  const doc = state.docs.find((item) => item.id === state.viewedId);
  if (!doc) return;
  const text = `${doc.title}\n\n${doc.content || ""}${doc.note ? `\n\nObservação interna:\n${doc.note}` : ""}`;
  let copied = false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch (_) {
    copied = false;
  }

  if (!copied) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try { copied = document.execCommand("copy"); } catch (_) { copied = false; }
    textarea.remove();
  }

  showToast(copied ? "Conteúdo copiado" : "Não foi possível copiar", copied ? "O texto foi enviado para a área de transferência." : "Selecione o texto e copie manualmente.", copied ? "success" : "error");
}


async function downloadViewedAttachment() {
  const doc = state.docs.find(item => item.id === state.viewedId);
  if (!doc?.attachmentName) return;
  const record = await getControlAttachment(doc.id);
  if (!record?.blob) { showToast("Arquivo indisponível", "O anexo não foi encontrado neste navegador.", "error"); return; }
  const url = URL.createObjectURL(record.blob);
  const link = document.createElement("a"); link.href = url; link.download = doc.attachmentName; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function clearFilters() {
  ui.docSearch.value = "";
  ui.typeFilter.value = "";
  ui.cityFilter.value = "";
  ui.sortDocuments.value = "updated-desc";
  setActiveFolder("");
  ui.docSearch.focus();
}

function setViewMode(mode) {
  state.viewMode = mode === "list" ? "list" : "grid";
  localStorage.setItem(VIEW_MODE_KEY, state.viewMode);
  $$('[data-view-mode]').forEach((button) => {
    const active = button.dataset.viewMode === state.viewMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderDocuments();
}

function syncCity(city) {
  const context = currentUserContext();
  const finalCity = context.isAdmin ? (city || getCurrentCity()) : context.city;
  if (ui.controlCidadeSelect && [...ui.controlCidadeSelect.options].some((option) => formatCity(option.value) === formatCity(finalCity))) { ui.controlCidadeSelect.value = [...ui.controlCidadeSelect.options].find(option => formatCity(option.value) === formatCity(finalCity))?.value || finalCity; ui.controlCidadeSelect.disabled = !context.isAdmin; }
  if (fields.city) { fields.city.disabled = !context.isAdmin; if (!context.isAdmin) fields.city.value = context.city === "Tatuí" ? "Tatui" : context.city; }
  if (ui.cityFilter && !context.isAdmin) { ui.cityFilter.value = context.city === "Tatuí" ? "Tatui" : context.city; ui.cityFilter.disabled = true; }
  $$('[data-user-city]').forEach((element) => { element.textContent = formatCity(finalCity); });
}

function exportData() {
  const payload = {
    app: "LAG Controller - Controladoria",
    version: 2,
    exportedAt: new Date().toISOString(),
    documents: state.docs
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lag-controladoria-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Backup exportado", "O arquivo JSON foi gerado com todos os documentos.", "success");
}

async function importData(file) {
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const incoming = Array.isArray(parsed) ? parsed : parsed.documents;
    if (!Array.isArray(incoming) || !incoming.length) throw new Error("Arquivo sem documentos válidos.");
    const normalized = incoming.map(normalizeDocument);
    if (!window.confirm(`Importar ${normalized.length} documento(s)? Os dados atuais serão substituídos.`)) return;
    state.docs = normalized;
    state.activeFolder = "";
    saveDocs();
    renderAll();
    showToast("Backup importado", `${normalized.length} documento(s) foram restaurados.`, "success");
  } catch (error) {
    console.error(error);
    showToast("Arquivo inválido", "Selecione um backup JSON exportado pela Controladoria.", "error");
  } finally {
    ui.importDocuments.value = "";
  }
}

function handleDocumentGridClick(event) {
  const emptyAction = event.target.closest("[data-empty-action='new']");
  if (emptyAction) {
    openEditor();
    return;
  }

  const actionButton = event.target.closest("button[data-action]");
  if (actionButton) {
    event.stopPropagation();
    const id = actionButton.dataset.id;
    if (actionButton.dataset.action === "edit") openEditor(id);
    else openViewer(id);
    return;
  }

  const card = event.target.closest("[data-document-id]");
  if (card) openViewer(card.dataset.documentId);
}

function bindEvents() {
  ui.newDocument?.addEventListener("click", () => openEditor());
  ui.documentForm?.addEventListener("submit", upsertDocument);
  ui.documentForm?.addEventListener("input", updateEditorDirtyState);
  ui.documentForm?.addEventListener("change", updateEditorDirtyState);
  ui.deleteDocument?.addEventListener("click", removeDocument);
  ui.duplicateDocument?.addEventListener("click", () => duplicateById(state.editingId || state.viewedId));
  ui.cancelEdit?.addEventListener("click", requestCloseEditor);
  ui.closeEditor?.addEventListener("click", requestCloseEditor);
  ui.closeViewer?.addEventListener("click", closeViewer);
  ui.editViewedDocument?.addEventListener("click", () => openEditor(state.viewedId));
  ui.duplicateViewedDocument?.addEventListener("click", () => duplicateById(state.viewedId));
  ui.copyViewedDocument?.addEventListener("click", copyViewedContent);
  ui.downloadViewedAttachment?.addEventListener("click", downloadViewedAttachment);
  fields.attachment?.addEventListener("change", () => { const file = fields.attachment.files?.[0]; if (ui.attachmentStatus) ui.attachmentStatus.textContent = file ? `${file.name} • ${formatBytes(file.size)}` : "PDF, Word, Excel ou imagem"; updateEditorDirtyState(); });
  document.querySelector(".control-file-drop")?.addEventListener("click", () => fields.attachment?.click());
  ui.menuButton?.addEventListener("click", toggleControlSidebar);
  ui.mobileOverlay?.addEventListener("click", closeControlSidebar);
  ui.themeButton?.addEventListener("click", cycleControlTheme);
  ui.topControlSearch?.addEventListener("input", event => { ui.docSearch.value = event.target.value; renderDocuments(); });
  ui.clearSearch?.addEventListener("click", clearFilters);
  ui.showAllFolders?.addEventListener("click", () => setActiveFolder(""));
  ui.foldersGrid?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-folder]");
    if (card) setActiveFolder(card.dataset.folder);
  });
  ui.documentsGrid?.addEventListener("click", handleDocumentGridClick);
  ui.documentsGrid?.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-document-id]")) {
      event.preventDefault();
      openViewer(event.target.dataset.documentId);
    }
  });

  [ui.docSearch, ui.typeFilter, ui.cityFilter, ui.sortDocuments].forEach((control) => {
    control?.addEventListener(control === ui.docSearch ? "input" : "change", renderDocuments);
  });

  $$('[data-view-mode]').forEach((button) => button.addEventListener("click", () => setViewMode(button.dataset.viewMode)));
  ui.exportDocuments?.addEventListener("click", exportData);
  ui.importDocuments?.addEventListener("change", () => importData(ui.importDocuments.files?.[0]));

  ui.controlCidadeSelect?.addEventListener("change", () => {
    if (!currentUserContext().isAdmin) return;
    localStorage.setItem("amorSaudeCidadeSelecionada", ui.controlCidadeSelect.value);
    syncCity(ui.controlCidadeSelect.value);
    showToast("Unidade atualizada", `A unidade padrão agora é ${formatCity(ui.controlCidadeSelect.value)}.`, "success");
  });

  ui.controlBackdrop?.addEventListener("click", () => {
    if (!ui.editorPanel.hidden) requestCloseEditor();
    else if (!ui.viewerPanel.hidden) closeViewer();
  });

  window.addEventListener("keydown", (event) => {
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.key.toLowerCase() === "k") {
      event.preventDefault();
      ui.docSearch?.focus();
      ui.docSearch?.select();
    }
    if (modifier && event.key.toLowerCase() === "n") {
      event.preventDefault();
      openEditor();
    }
    if (modifier && event.key.toLowerCase() === "s" && !ui.editorPanel.hidden) {
      event.preventDefault();
      ui.documentForm?.requestSubmit();
    }
    if (event.key === "Escape" && document.body.classList.contains("control-modal-open")) {
      if (!ui.editorPanel.hidden) requestCloseEditor();
      else closeViewer();
    }
  });

  window.addEventListener("beforeunload", (event) => {
    if (!state.editorDirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const incoming = JSON.parse(event.newValue);
      if (Array.isArray(incoming)) {
        state.docs = incoming.map(normalizeDocument);
        renderAll();
        showToast("Dados atualizados", "A biblioteca foi sincronizada com outra aba.", "success");
      }
    } catch (_) {
      // Ignora dados inválidos de outra aba.
    }
  });

  window.addEventListener("usuario-carregado", (event) => syncCity(event.detail?.cidade));
}


function isControlMobile() { return matchMedia("(max-width:980px)").matches; }
function openControlSidebar() { localStorage.setItem("lag-sidebar-hidden", "false"); document.body.classList.remove("sidebar-hidden"); ui.menuButton?.setAttribute("aria-expanded", "true"); }
function toggleControlSidebar() {
  if (isControlMobile()) { const open = !ui.sidebar?.classList.contains("open"); ui.sidebar?.classList.toggle("open", open); ui.mobileOverlay?.classList.toggle("show", open); return; }
  const hidden = document.body.classList.toggle("sidebar-hidden"); localStorage.setItem("lag-sidebar-hidden", String(hidden)); ui.menuButton?.setAttribute("aria-expanded", String(!hidden));
}
function closeControlSidebar() { ui.sidebar?.classList.remove("open"); ui.mobileOverlay?.classList.remove("show"); }
function cycleControlTheme() { const api=window.LAGSettings; if(!api)return; const current=document.documentElement.dataset.theme||"dark-cyan"; api.applyTheme(api.THEMES[(api.THEMES.indexOf(current)+1)%api.THEMES.length]); }

function init() {
  openControlSidebar();
  bindEvents();
  syncCity();
  setViewMode(state.viewMode);
  updateCharacterCounters();
  renderAll();
}

init();
