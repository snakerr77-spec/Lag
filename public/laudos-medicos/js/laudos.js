(() => {
  "use strict";

  if (location.protocol === "file:") {
    window.location.replace("http://127.0.0.1:5500/laudos-medicos/index.html");
    return;
  }
  if (location.hostname === "localhost") {
    window.location.replace(`http://127.0.0.1:${location.port || "5500"}${location.pathname}${location.search}${location.hash}`);
    return;
  }

  const settings = window.LAGSettings;
  if (!settings) return;

  const STORAGE_CATEGORIES = "lag-medical-report-categories-v2";
  const STORAGE_FOLDERS = "lag-medical-report-folders-v2";
  const STORAGE_REPORTS = "lag-medical-reports-v2";
  const LEGACY_FOLDERS = "lag-medical-report-folders-v1";
  const LEGACY_REPORTS = "lag-medical-reports-v1";
  const STORAGE_CITY = "lag-active-city";
  const DB_NAME = "lag-medical-reports-files";
  const DB_STORE = "pdfs";
  const CITIES = settings.cities || ["Cerquilho", "Tatuí", "Embu das Artes", "Itapeva"];

  const DEFAULT_CATEGORIES = [
    { name: "Cardiologia", icon: "fa-heart-pulse", description: "Laudos e exames cardiológicos." },
    { name: "Neurologia", icon: "fa-brain", description: "Laudos e exames neurológicos." },
    { name: "Ultrassom", icon: "fa-images", description: "Laudos e imagens de ultrassonografia." }
  ];

  const state = {
    city: "Cerquilho",
    categoryId: "",
    folderId: "",
    categories: [],
    folders: [],
    reports: [],
    editingId: "",
    removedImageIds: new Set(),
    viewerUrls: []
  };

  const el = {};
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cache();
    loadData();
    configureAccess();
    bind();
    render();
    openSidebarByDefault();
  }

  function cache() {
    [
      "sidebar", "mobileOverlay", "menuButton", "themeButton", "reportSearch", "citySelect", "cityAccessText", "cityLockIcon", "activeCityLabel",
      "totalReports", "totalCategories", "totalFolders", "finalizedReports", "categoryTabs", "newCategoryButton", "activeCategoryToolbar", "activeCategoryIcon",
      "newFolderButton", "newReportButton", "folderBadge", "allFolderCount", "folderList", "statusFilter", "doctorFilter", "sortFilter", "clearFilters",
      "activeFolderName", "activeCategoryTitle", "resultSummary", "reportsList", "modalBackdrop", "reportModal", "folderModal", "categoryModal",
      "reportForm", "folderForm", "categoryForm", "reportId", "patientName", "patientCpf", "patientBirthDate", "examDate", "reportCategory", "examType", "doctorName",
      "reportCity", "reportFolder", "reportStatus", "reportFile", "selectedFileName", "reportImages", "selectedImagesName", "imageUploadSection", "imageCountBadge", "existingImagesList", "pdfRequirementMark", "patientVisible", "reportNotes", "folderName", "folderCategory", "folderCity",
      "folderDescription", "categoryName", "categoryIcon", "categoryCity", "categoryDescription", "imagesModal", "imagesViewerMeta", "imagesViewerGrid", "copyPatientPortalLink", "openPatientPortal", "toastStack"
    ].forEach(id => { el[id] = document.getElementById(id); });
  }

  function loadData() {
    let categories = readJson(STORAGE_CATEGORIES, null);
    if (!Array.isArray(categories)) {
      categories = [];
      CITIES.forEach(city => DEFAULT_CATEGORIES.forEach(item => categories.push(makeCategory(item.name, city, item.icon, item.description, true))));
      writeJson(STORAGE_CATEGORIES, categories);
    }

    let folders = readJson(STORAGE_FOLDERS, null);
    if (!Array.isArray(folders)) {
      const legacy = readJson(LEGACY_FOLDERS, []);
      folders = Array.isArray(legacy) ? legacy.map(folder => migrateFolder(folder, categories)).filter(Boolean) : [];
      writeJson(STORAGE_FOLDERS, folders);
    }

    let reports = readJson(STORAGE_REPORTS, null);
    if (!Array.isArray(reports)) {
      const legacy = readJson(LEGACY_REPORTS, []);
      reports = Array.isArray(legacy) ? legacy.map(report => migrateReport(report, categories, folders)).filter(Boolean) : [];
      writeJson(STORAGE_REPORTS, reports);
    }

    // Incorpora Ultrassom ao módulo de laudos em todas as cidades.
    CITIES.forEach(city => {
      let ultrasoundCategory = categories.find(category => normalizeCity(category.city) === normalizeCity(city) && normalize(category.name) === "ultrassom");
      if (!ultrasoundCategory) {
        ultrasoundCategory = makeCategory("Ultrassom", city, "fa-images", "Laudos e imagens de ultrassonografia.", true);
        categories.push(ultrasoundCategory);
      }
      const hasUltrasoundFolder = folders.some(folder => folder.categoryId === ultrasoundCategory.id && normalizeCity(folder.city) === normalizeCity(city));
      if (!hasUltrasoundFolder) folders.push({
        id: `folder-${slug(city)}-ultrassom`,
        name: "Ultrassom",
        categoryId: ultrasoundCategory.id,
        city: normalizeCity(city),
        description: "PDFs e imagens dos exames de ultrassonografia.",
        createdAt: new Date().toISOString()
      });
    });

    state.categories = categories.map(category => ({
      ...category,
      city: normalizeCity(category.city),
      icon: safeIcon(category.icon),
      name: String(category.name || "Categoria médica").trim()
    }));
    state.folders = folders.map(folder => ({ ...folder, city: normalizeCity(folder.city) }));
    state.reports = reports.map(report => ({
      ...report,
      city: normalizeCity(report.city),
      birthDate: String(report.birthDate || ""),
      patientVisible: report.patientVisible !== false,
      images: Array.isArray(report.images) ? report.images : []
    }));

    writeJson(STORAGE_CATEGORIES, state.categories);
    writeJson(STORAGE_FOLDERS, state.folders);
    writeJson(STORAGE_REPORTS, state.reports);
  }

  function migrateFolder(folder, categories) {
    const city = normalizeCity(folder?.city || "Cerquilho");
    const category = categoryFromLegacy(categories, city, folder?.specialty || folder?.category || "Cardiologia");
    if (!category) return null;
    return {
      id: folder.id || makeId("folder"),
      name: String(folder.name || "Pasta de laudos"),
      categoryId: category.id,
      city,
      description: String(folder.description || ""),
      createdAt: folder.createdAt || new Date().toISOString()
    };
  }

  function migrateReport(report, categories, folders) {
    const city = normalizeCity(report?.city || "Cerquilho");
    const category = categoryFromLegacy(categories, city, report?.specialty || report?.category || "Cardiologia");
    if (!category) return null;
    const folder = folders.find(item => item.id === report.folderId && item.categoryId === category.id && normalizeCity(item.city) === city);
    return {
      ...report,
      id: report.id || makeId("report"),
      city,
      categoryId: category.id,
      folderId: folder?.id || "",
      updatedAt: report.updatedAt || new Date().toISOString()
    };
  }

  function categoryFromLegacy(categories, city, value) {
    const label = legacyCategoryLabel(value);
    let category = categories.find(item => normalizeCity(item.city) === city && normalize(item.name) === normalize(label));
    if (!category) {
      category = makeCategory(label, city, iconForName(label), `Categoria migrada: ${label}.`, true);
      categories.push(category);
    }
    return category;
  }

  function legacyCategoryLabel(value) {
    const normalized = normalize(value);
    if (normalized.includes("cardio")) return "Cardiologia";
    if (normalized.includes("neuro")) return "Neurologia";
    if (normalized.includes("ultra") || normalized.includes("usg")) return "Ultrassom";
    const text = String(value || "Categoria médica").trim();
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function makeCategory(name, city, icon = "fa-stethoscope", description = "", deterministic = false) {
    const normalizedCity = normalizeCity(city);
    return {
      id: deterministic ? `category-${slug(normalizedCity)}-${slug(name)}` : makeId(`category-${slug(normalizedCity)}-${slug(name)}`),
      name: String(name || "Categoria médica").trim(),
      city: normalizedCity,
      icon: safeIcon(icon),
      description: String(description || "").trim(),
      createdAt: new Date().toISOString()
    };
  }

  function makeFolder(name, categoryId, city, description = "") {
    return {
      id: makeId("folder"),
      name: String(name || "Pasta").trim(),
      categoryId,
      city: normalizeCity(city),
      description: String(description || "").trim(),
      createdAt: new Date().toISOString()
    };
  }

  function configureAccess() {
    const user = settings.getCurrentUser();
    const role = currentRole();
    const admin = isAdmin();
    const userCity = normalizeCity(user?.unit || CITIES[0]);
    const activeCity = typeof settings.getActiveCity === "function"
      ? normalizeCity(settings.getActiveCity(user))
      : normalizeCity(admin ? storageGet(STORAGE_CITY) || userCity : userCity);

    state.city = CITIES.includes(activeCity) ? activeCity : userCity;
    populateCitySelects();
    el.citySelect.value = state.city;
    el.reportCity.value = state.city;
    el.folderCity.value = state.city;
    el.categoryCity.value = state.city;

    // A cidade principal da tela continua vinculada ao login. Somente o Admin
    // troca a unidade ativa; médicos podem escolher a cidade apenas no envio do PDF.
    el.citySelect.disabled = !admin;
    el.reportCity.disabled = !(admin || role === "medico");
    el.folderCity.disabled = !admin;
    el.categoryCity.disabled = !admin;
    el.cityLockIcon.hidden = admin;
    el.cityAccessText.textContent = admin
      ? "Administrador: você pode alternar entre as quatro cidades."
      : role === "medico"
        ? `Médico vinculado a ${state.city}. No cadastro do laudo você pode escolher a cidade de destino do PDF.`
        : `${settings.roleLabel(role)} vinculado(a) à unidade ${state.city}. Somente um administrador pode alterar a cidade principal.`;

    document.querySelectorAll(".manager-only").forEach(node => node.classList.toggle("lag-permission-hidden", !isManager()));
    document.querySelectorAll(".uploader-only").forEach(node => node.classList.toggle("lag-permission-hidden", !canUpload()));
  }

  function populateCitySelects() {
    const options = CITIES.map(city => `<option value="${escapeAttr(city)}">${escapeHtml(city)}</option>`).join("");
    [el.citySelect, el.reportCity, el.folderCity, el.categoryCity].forEach(select => { select.innerHTML = options; });
  }

  function bind() {
    el.menuButton.addEventListener("click", toggleSidebar);
    el.mobileOverlay.addEventListener("click", closeMobileSidebar);
    el.themeButton.addEventListener("click", cycleTheme);
    el.citySelect.addEventListener("change", changeActiveCity);
    el.categoryTabs.addEventListener("click", handleCategoryAction);
    el.newCategoryButton.addEventListener("click", openCategoryModal);
    el.newFolderButton.addEventListener("click", openFolderModal);
    el.newReportButton.addEventListener("click", () => openReportModal());
    el.folderList.addEventListener("click", handleFolderClick);
    document.querySelector('[data-folder-id=""]')?.addEventListener("click", () => { state.folderId = ""; render(); });
    [el.reportSearch, el.statusFilter, el.doctorFilter, el.sortFilter].forEach(control => control.addEventListener(control === el.reportSearch ? "input" : "change", renderReports));
    el.clearFilters.addEventListener("click", clearFilters);
    el.reportsList.addEventListener("click", handleReportAction);
    el.reportForm.addEventListener("submit", saveReport);
    el.folderForm.addEventListener("submit", saveFolder);
    el.categoryForm.addEventListener("submit", saveCategory);
    el.reportFile.addEventListener("change", updateSelectedFile);
    el.reportImages.addEventListener("change", updateSelectedImages);
    el.existingImagesList.addEventListener("click", handleExistingImageRemove);
    el.patientCpf.addEventListener("input", event => { event.target.value = formatCpf(event.target.value); });
    el.copyPatientPortalLink.addEventListener("click", () => copyPatientPortalLink());
    el.reportCity.addEventListener("change", () => {
      storageSet("lag-last-report-city", normalizeCity(el.reportCity.value));
      populateReportCategories(el.reportCity.value);
      updateImagingFields();
    });
    el.reportCategory.addEventListener("change", () => {
      populateReportFolders(el.reportCity.value, el.reportCategory.value);
      updateImagingFields();
    });
    el.reportFolder.addEventListener("change", updateImagingFields);
    el.folderCity.addEventListener("change", () => populateFolderCategories(el.folderCity.value));
    document.querySelectorAll("[data-close-report]").forEach(button => button.addEventListener("click", closeReportModal));
    document.querySelectorAll("[data-close-folder]").forEach(button => button.addEventListener("click", closeFolderModal));
    document.querySelectorAll("[data-close-category]").forEach(button => button.addEventListener("click", closeCategoryModal));
    document.querySelectorAll("[data-close-images]").forEach(button => button.addEventListener("click", closeImagesModal));
    el.modalBackdrop.addEventListener("click", closeAllModals);
    document.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); el.reportSearch.focus(); }
      if (event.key === "Escape") closeAllModals();
    });
  }

  function changeActiveCity() {
    if (!isAdmin()) {
      el.citySelect.value = state.city;
      return toast("Somente o administrador pode alterar a cidade.", "error");
    }
    state.city = normalizeCity(el.citySelect.value);
    state.categoryId = "";
    state.folderId = "";
    if (typeof settings.setActiveCity === "function") settings.setActiveCity(state.city, false);
    else storageSet(STORAGE_CITY, state.city);
    render();
  }

  function render() {
    ensureActiveCategory();
    el.citySelect.value = state.city;
    el.activeCityLabel.textContent = state.city;
    renderStats();
    renderCategories();
    renderFolders();
    renderDoctorFilter();
    renderReports();
  }

  function ensureActiveCategory() {
    const categories = currentCategories();
    if (!categories.some(category => category.id === state.categoryId)) {
      state.categoryId = categories[0]?.id || "";
      state.folderId = "";
    }
    const category = activeCategory();
    el.activeCategoryTitle.textContent = category?.name || "Nenhuma categoria criada";
    el.activeCategoryToolbar.textContent = category?.name || "Crie uma categoria";
    el.activeCategoryIcon.innerHTML = `<i class="fa-solid ${escapeAttr(category?.icon || "fa-stethoscope")}"></i>`;
  }

  function currentCategories(city = state.city) {
    return state.categories
      .filter(category => normalizeCity(category.city) === normalizeCity(city))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }

  function activeCategory() {
    return state.categories.find(category => category.id === state.categoryId && normalizeCity(category.city) === state.city) || null;
  }

  function visibleReportsBase() {
    return state.reports.filter(report => normalizeCity(report.city) === state.city);
  }

  function renderStats() {
    const reports = visibleReportsBase();
    const categories = currentCategories();
    const folders = state.folders.filter(folder => normalizeCity(folder.city) === state.city);
    el.totalReports.textContent = reports.length;
    el.totalCategories.textContent = categories.length;
    el.totalFolders.textContent = folders.length;
    el.finalizedReports.textContent = reports.filter(report => report.status === "finalizado").length;
  }

  function renderCategories() {
    const categories = currentCategories();
    if (!categories.length) {
      el.categoryTabs.innerHTML = `<div class="category-empty"><i class="fa-solid fa-layer-group"></i><div><strong>Nenhuma categoria em ${escapeHtml(state.city)}</strong><small>Crie Cardiologia, Neurologia ou qualquer outra área médica.</small></div>${isManager() ? '<button type="button" data-create-first-category><i class="fa-solid fa-plus"></i> Criar agora</button>' : ""}</div>`;
      return;
    }

    el.categoryTabs.innerHTML = categories.map(category => {
      const count = state.reports.filter(report => normalizeCity(report.city) === state.city && report.categoryId === category.id).length;
      const selected = category.id === state.categoryId;
      return `<article class="category-tab ${selected ? "active" : ""}">
        <button class="category-tab-main" type="button" data-category-id="${escapeAttr(category.id)}" aria-pressed="${selected}">
          <span><i class="fa-solid ${escapeAttr(category.icon)}"></i></span>
          <div><strong>${escapeHtml(category.name)}</strong><small>${escapeHtml(category.description || "Categoria de laudos")}</small></div>
          <b>${count}</b>
        </button>
        ${isManager() ? `<button class="category-delete" type="button" data-category-delete="${escapeAttr(category.id)}" title="Excluir categoria"><i class="fa-solid fa-trash"></i></button>` : ""}
      </article>`;
    }).join("");
  }

  function currentFolders(city = state.city, categoryId = state.categoryId) {
    return state.folders
      .filter(folder => normalizeCity(folder.city) === normalizeCity(city) && folder.categoryId === categoryId)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }

  function renderFolders() {
    const folders = currentFolders();
    const category = activeCategory();
    if (!folders.some(folder => folder.id === state.folderId)) state.folderId = "";
    el.folderBadge.textContent = folders.length;
    el.allFolderCount.textContent = visibleReportsBase().filter(report => report.categoryId === state.categoryId).length;
    document.querySelector('[data-folder-id=""]')?.classList.toggle("active", !state.folderId);

    el.folderList.innerHTML = folders.map(folder => {
      const count = state.reports.filter(report => report.folderId === folder.id).length;
      return `<div class="folder-row ${state.folderId === folder.id ? "active" : ""}" data-folder-id="${escapeAttr(folder.id)}">
        <span><i class="fa-solid ${escapeAttr(category?.icon || "fa-folder")}"></i></span>
        <div><strong>${escapeHtml(folder.name)}</strong><small>${escapeHtml(folder.description || category?.name || "Pasta de laudos")}</small></div>
        ${isManager() ? `<div class="folder-actions"><button type="button" data-folder-delete="${escapeAttr(folder.id)}" title="Excluir pasta"><i class="fa-solid fa-trash"></i></button></div>` : `<b>${count}</b>`}
      </div>`;
    }).join("");

    const selected = folders.find(folder => folder.id === state.folderId);
    el.activeFolderName.textContent = selected?.name || "Todos os laudos";
  }

  function renderDoctorFilter() {
    const currentValue = el.doctorFilter.value;
    const doctors = [...new Set(visibleReportsBase().filter(report => report.categoryId === state.categoryId).map(report => report.doctor).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
    el.doctorFilter.innerHTML = '<option value="">Todos os médicos</option>' + doctors.map(doctor => `<option value="${escapeAttr(doctor)}">${escapeHtml(doctor)}</option>`).join("");
    if (doctors.includes(currentValue)) el.doctorFilter.value = currentValue;
  }

  function filteredReports() {
    const term = normalize(el.reportSearch.value);
    const status = el.statusFilter.value;
    const doctor = el.doctorFilter.value;
    const reports = visibleReportsBase().filter(report => {
      if (report.categoryId !== state.categoryId) return false;
      if (state.folderId && report.folderId !== state.folderId) return false;
      if (status && report.status !== status) return false;
      if (doctor && report.doctor !== doctor) return false;
      if (term && !normalize(`${report.patient} ${report.cpf} ${report.doctor} ${report.examType} ${report.fileName} ${report.notes}`).includes(term)) return false;
      return true;
    });

    const sort = el.sortFilter.value;
    reports.sort((a, b) => {
      if (sort === "date-asc") return String(a.examDate || "").localeCompare(String(b.examDate || ""));
      if (sort === "patient-asc") return String(a.patient || "").localeCompare(String(b.patient || ""), "pt-BR");
      return String(b.examDate || b.updatedAt || "").localeCompare(String(a.examDate || a.updatedAt || ""));
    });
    return reports;
  }

  function renderReports() {
    const category = activeCategory();
    el.activeCategoryTitle.textContent = category?.name || "Nenhuma categoria criada";
    if (!category) {
      el.resultSummary.textContent = "Crie uma categoria para começar";
      el.reportsList.innerHTML = `<div class="empty-reports"><div><i class="fa-solid fa-layer-group"></i><h3>Crie a primeira categoria</h3><p>Organize os laudos de ${escapeHtml(state.city)} por área médica. Apenas administradores e gestores podem criar categorias.</p></div></div>`;
      return;
    }

    const reports = filteredReports();
    el.resultSummary.textContent = `${reports.length} ${reports.length === 1 ? "laudo encontrado" : "laudos encontrados"}`;
    if (!reports.length) {
      el.reportsList.innerHTML = `<div class="empty-reports"><div><i class="fa-solid fa-file-circle-plus"></i><h3>Nenhum laudo nesta seleção</h3><p>Adicione um PDF ou altere os filtros para localizar documentos de ${escapeHtml(category.name)} em ${escapeHtml(state.city)}.</p></div></div>`;
      return;
    }

    el.reportsList.innerHTML = reports.map(report => {
      const folder = state.folders.find(item => item.id === report.folderId);
      const released = report.status === "finalizado" && report.patientVisible !== false;
      return `<article class="report-card" data-report-id="${escapeAttr(report.id)}">
        <span class="pdf-icon"><i class="fa-solid fa-file-pdf"></i></span>
        <div class="report-patient"><strong>${escapeHtml(report.patient || "Paciente não informado")}</strong><small>${escapeHtml(report.examType || "Exame")} • ${report.fileName ? escapeHtml(report.fileName) : "Sem PDF"}${report.images?.length ? ` • ${report.images.length} imagem(ns)` : ""}</small></div>
        <div class="report-meta"><strong>${escapeHtml(report.doctor || "Médico não informado")}</strong><small>${escapeHtml(folder?.name || category.name)}</small></div>
        <div class="report-meta"><strong>${formatDate(report.examDate)}</strong><small>${escapeHtml(category.name)} • ${report.fileSize ? formatBytes(report.fileSize) : "Somente imagens"}</small></div>
        <span class="status-pill ${escapeAttr(report.status || "rascunho")}">${escapeHtml(statusLabel(report.status || "rascunho"))}</span>
        <div class="report-actions">
          ${report.fileName ? `<button type="button" data-report-action="open" title="Abrir PDF"><i class="fa-solid fa-eye"></i></button><button type="button" data-report-action="download" title="Baixar PDF"><i class="fa-solid fa-download"></i></button>` : ""}
          ${report.images?.length ? `<button type="button" data-report-action="images" title="Ver imagens"><i class="fa-solid fa-images"></i></button>` : ""}
          ${released ? `<button type="button" data-report-action="test-portal" title="Testar acesso deste paciente"><i class="fa-solid fa-user-shield"></i></button><button type="button" data-report-action="share" title="Copiar link do paciente"><i class="fa-solid fa-link"></i></button>` : ""}
          ${canUpload() ? (released
            ? `<button type="button" data-report-action="unrelease" title="Retirar do portal do paciente"><i class="fa-solid fa-lock"></i></button>`
            : `<button type="button" data-report-action="release" title="Finalizar e liberar no portal"><i class="fa-solid fa-unlock-keyhole"></i></button>`) : ""}
          ${isManager() ? `<button type="button" data-report-action="edit" title="Editar"><i class="fa-solid fa-pen"></i></button><button class="delete" type="button" data-report-action="delete" title="Excluir"><i class="fa-solid fa-trash"></i></button>` : ""}
        </div>
      </article>`;
    }).join("");
  }

  function handleCategoryAction(event) {
    if (event.target.closest("[data-create-first-category]")) return openCategoryModal();
    const deleteButton = event.target.closest("[data-category-delete]");
    if (deleteButton) return deleteCategory(deleteButton.dataset.categoryDelete);
    const button = event.target.closest("[data-category-id]");
    if (!button) return;
    state.categoryId = button.dataset.categoryId;
    state.folderId = "";
    render();
  }

  function handleFolderClick(event) {
    const deleteButton = event.target.closest("[data-folder-delete]");
    if (deleteButton) return deleteFolder(deleteButton.dataset.folderDelete);
    const row = event.target.closest("[data-folder-id]");
    if (!row) return;
    state.folderId = row.dataset.folderId || "";
    render();
  }

  function handleReportAction(event) {
    const button = event.target.closest("[data-report-action]");
    const card = event.target.closest("[data-report-id]");
    if (!button || !card) return;
    const report = state.reports.find(item => item.id === card.dataset.reportId);
    if (!report || normalizeCity(report.city) !== state.city) return;
    const action = button.dataset.reportAction;
    if (action === "open") openPdf(report, false);
    if (action === "download") openPdf(report, true);
    if (action === "images") openImagesModal(report);
    if (action === "test-portal") testPatientPortal(report);
    if (action === "share") copyPatientPortalLink(report);
    if (action === "release") setPatientPortalRelease(report, true);
    if (action === "unrelease") setPatientPortalRelease(report, false);
    if (action === "edit") openReportModal(report);
    if (action === "delete") deleteReport(report);
  }

  function setPatientPortalRelease(report, released) {
    if (!canUpload() || !canUploadToCity(report.city)) return toast("Seu perfil não pode alterar a liberação deste laudo.", "error");

    if (released) {
      const cpfDigits = String(report.cpf || "").replace(/\D/g, "");
      if (cpfDigits.length !== 11 || !normalizeDate(report.birthDate)) {
        toast("Cadastre um CPF válido e a data de nascimento antes de liberar o portal.", "error");
        openReportModal(report);
        return;
      }
      if (!report.fileName && !(report.images || []).length) {
        toast("Adicione um PDF ou imagens antes de liberar o exame.", "error");
        openReportModal(report);
        return;
      }
    }

    report.status = released ? "finalizado" : "revisao";
    report.patientVisible = released;
    report.updatedAt = new Date().toISOString();
    writeJson(STORAGE_REPORTS, state.reports);
    render();
    toast(released
      ? `Laudo de ${report.patient} finalizado e liberado no portal local.`
      : `Laudo de ${report.patient} retirado do portal do paciente.`);
  }

  function openCategoryModal() {
    if (!isManager()) return toast("Seu cargo não permite criar categorias.", "error");
    el.categoryForm.reset();
    el.categoryCity.value = state.city;
    showModal(el.categoryModal);
    setTimeout(() => el.categoryName.focus(), 50);
  }

  function saveCategory(event) {
    event.preventDefault();
    if (!isManager()) return toast("Seu cargo não permite criar categorias.", "error");
    const city = normalizeCity(el.categoryCity.value || state.city);
    if (!canManageCity(city)) return toast("Você não pode criar categorias em outra cidade.", "error");
    const name = el.categoryName.value.trim();
    if (!name) return toast("Informe o nome da categoria.", "error");
    if (state.categories.some(category => normalizeCity(category.city) === city && normalize(category.name) === normalize(name))) return toast("Esta categoria já existe nessa cidade.", "error");

    const category = makeCategory(name, city, el.categoryIcon.value, el.categoryDescription.value);
    state.categories.push(category);
    writeJson(STORAGE_CATEGORIES, state.categories);
    state.city = city;
    state.categoryId = category.id;
    state.folderId = "";
    if (isAdmin() && typeof settings.setActiveCity === "function") settings.setActiveCity(city, false);
    closeCategoryModal();
    render();
    toast(`Categoria “${name}” criada em ${city}.`);
  }

  function deleteCategory(id) {
    if (!isManager()) return;
    const category = state.categories.find(item => item.id === id);
    if (!category || !canManageCity(category.city)) return toast("Você não pode excluir esta categoria.", "error");
    const folderCount = state.folders.filter(folder => folder.categoryId === id).length;
    const reportCount = state.reports.filter(report => report.categoryId === id).length;
    if (folderCount || reportCount) return toast(`A categoria possui ${folderCount} pasta(s) e ${reportCount} laudo(s). Exclua ou mova o conteúdo primeiro.`, "error");
    if (!confirm(`Excluir a categoria “${category.name}” de ${category.city}?`)) return;
    state.categories = state.categories.filter(item => item.id !== id);
    writeJson(STORAGE_CATEGORIES, state.categories);
    if (state.categoryId === id) state.categoryId = "";
    render();
    toast("Categoria excluída.");
  }

  function openFolderModal() {
    if (!isManager()) return toast("Seu cargo não permite criar pastas.", "error");
    if (!currentCategories().length) return toast("Crie uma categoria médica primeiro.", "error");
    el.folderForm.reset();
    el.folderCity.value = state.city;
    populateFolderCategories(state.city, state.categoryId);
    showModal(el.folderModal);
    setTimeout(() => el.folderName.focus(), 50);
  }

  function populateFolderCategories(city, selectedId = "") {
    const categories = currentCategories(city);
    el.folderCategory.innerHTML = categories.map(category => `<option value="${escapeAttr(category.id)}">${escapeHtml(category.name)}</option>`).join("");
    const valid = categories.some(category => category.id === selectedId) ? selectedId : categories[0]?.id || "";
    el.folderCategory.value = valid;
  }

  function saveFolder(event) {
    event.preventDefault();
    if (!isManager()) return toast("Seu cargo não permite criar pastas.", "error");
    const city = normalizeCity(el.folderCity.value || state.city);
    if (!canManageCity(city)) return toast("Você não pode criar pastas em outra cidade.", "error");
    const category = state.categories.find(item => item.id === el.folderCategory.value && normalizeCity(item.city) === city);
    if (!category) return toast("Selecione uma categoria válida para esta cidade.", "error");
    const folder = makeFolder(el.folderName.value.trim(), category.id, city, el.folderDescription.value.trim());
    state.folders.push(folder);
    writeJson(STORAGE_FOLDERS, state.folders);
    state.city = city;
    state.categoryId = category.id;
    state.folderId = folder.id;
    closeFolderModal();
    render();
    toast(`Pasta criada em ${category.name} • ${city}.`);
  }

  function deleteFolder(id) {
    if (!isManager()) return;
    const folder = state.folders.find(item => item.id === id);
    if (!folder || !canManageCity(folder.city)) return toast("Você não pode excluir esta pasta.", "error");
    const count = state.reports.filter(report => report.folderId === id).length;
    if (count) return toast(`Esta pasta possui ${count} laudo(s). Mova ou exclua os arquivos primeiro.`, "error");
    if (!confirm(`Excluir a pasta “${folder.name}”?`)) return;
    state.folders = state.folders.filter(item => item.id !== id);
    writeJson(STORAGE_FOLDERS, state.folders);
    if (state.folderId === id) state.folderId = "";
    render();
    toast("Pasta excluída.");
  }

  function openReportModal(report = null) {
    if (!canUpload()) return toast("Seu cargo não permite adicionar laudos.", "error");
    if (!currentCategories().length) return toast("Crie uma categoria médica antes de adicionar o laudo.", "error");
    if (!currentFolders().length && !report) return toast("Crie uma pasta na categoria selecionada antes de adicionar o laudo.", "error");

    state.editingId = report?.id || "";
    state.removedImageIds = new Set();
    el.reportForm.reset();
    el.reportId.value = report?.id || "";
    el.patientName.value = report?.patient || "";
    el.patientCpf.value = report?.cpf || "";
    el.patientBirthDate.value = report?.birthDate || "";
    el.examDate.value = report?.examDate || new Date().toISOString().slice(0, 10);
    el.examType.value = report?.examType || "";
    el.doctorName.value = report?.doctor || (currentRole() === "medico" ? settings.getCurrentUser()?.name || "" : "");
    el.reportStatus.value = report?.status || "rascunho";
    el.reportNotes.value = report?.notes || "";
    el.patientVisible.checked = report?.patientVisible !== false;
    el.reportImages.value = "";

    const preferredUploadCity = currentRole() === "medico" ? storageGet("lag-last-report-city") : "";
    const city = normalizeCity(report?.city || preferredUploadCity || state.city);
    el.reportCity.value = city;
    populateReportCategories(city, report?.categoryId || state.categoryId, report?.folderId || state.folderId);
    el.selectedFileName.textContent = report?.fileName ? `Arquivo atual: ${report.fileName}` : "Máximo recomendado: 15 MB";
    renderExistingImages(report);
    updateSelectedImages();
    updateImagingFields();
    showModal(el.reportModal);
  }

  function populateReportCategories(city, selectedCategoryId = "", selectedFolderId = "") {
    const categories = currentCategories(city);
    el.reportCategory.innerHTML = categories.length
      ? categories.map(category => `<option value="${escapeAttr(category.id)}">${escapeHtml(category.name)}</option>`).join("")
      : '<option value="">Nenhuma categoria nesta cidade</option>';
    const valid = categories.some(category => category.id === selectedCategoryId) ? selectedCategoryId : categories[0]?.id || "";
    el.reportCategory.value = valid;
    populateReportFolders(city, valid, selectedFolderId);
  }

  function populateReportFolders(city, categoryId, selectedFolderId = "") {
    const folders = currentFolders(city, categoryId);
    el.reportFolder.innerHTML = folders.length
      ? folders.map(folder => `<option value="${escapeAttr(folder.id)}">${escapeHtml(folder.name)}</option>`).join("")
      : '<option value="">Crie uma pasta primeiro</option>';
    const valid = folders.some(folder => folder.id === selectedFolderId) ? selectedFolderId : folders[0]?.id || "";
    el.reportFolder.value = valid;
    updateImagingFields();
  }

  async function saveReport(event) {
    event.preventDefault();
    const file = el.reportFile.files?.[0];
    const imageFiles = Array.from(el.reportImages.files || []);
    const existing = state.reports.find(item => item.id === el.reportId.value);
    const cpf = formatCpf(el.patientCpf.value);
    if (cpf.replace(/\D/g, "").length !== 11) return toast("Informe um CPF com 11 números.", "error");
    if (!el.patientBirthDate.value) return toast("Informe a data de nascimento do paciente.", "error");

    const city = normalizeCity(el.reportCity.value || state.city);
    if (!canUploadToCity(city)) return toast("Seu perfil não pode salvar laudos nesta cidade.", "error");
    const category = state.categories.find(item => item.id === el.reportCategory.value && normalizeCity(item.city) === city);
    if (!category) return toast("Selecione uma categoria válida.", "error");
    const folder = state.folders.find(item => item.id === el.reportFolder.value && item.categoryId === category.id && normalizeCity(item.city) === city);
    if (!folder) return toast("Selecione uma pasta válida para a categoria.", "error");
    const imaging = isImagingContext(category, folder);

    if (file && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return toast("O arquivo precisa ser PDF.", "error");
    if (file && file.size > 15 * 1024 * 1024) return toast("O PDF ultrapassa 15 MB.", "error");
    if (imageFiles.length > 12) return toast("Selecione no máximo 12 imagens por exame.", "error");
    for (const image of imageFiles) {
      if (!/^image\/(jpeg|png|webp)$/i.test(image.type)) return toast(`Formato não permitido: ${image.name}`, "error");
      if (image.size > 12 * 1024 * 1024) return toast(`A imagem ${image.name} ultrapassa 12 MB.`, "error");
    }

    const keptImages = (existing?.images || []).filter(image => !state.removedImageIds.has(image.id));
    if (!existing && !file && !(imaging && imageFiles.length)) return toast(imaging ? "Selecione um PDF ou ao menos uma imagem do exame." : "Selecione o PDF do laudo.", "error");
    if (existing && !file && !existing.fileName && !(keptImages.length || imageFiles.length)) return toast("O exame precisa manter um PDF ou imagem.", "error");

    const id = existing?.id || makeId("report");
    if (file) await putPdf(id, file);
    for (const imageId of state.removedImageIds) await deleteImage(id, imageId);
    const newImageMeta = [];
    for (const image of imageFiles) {
      const imageId = makeId("image");
      await putImage(id, imageId, image);
      newImageMeta.push({ id: imageId, name: image.name, type: image.type, size: image.size });
    }

    const payload = {
      id,
      patient: el.patientName.value.trim(),
      cpf,
      birthDate: el.patientBirthDate.value,
      examDate: el.examDate.value,
      categoryId: category.id,
      examType: el.examType.value.trim(),
      doctor: el.doctorName.value.trim(),
      city,
      folderId: folder.id,
      status: el.reportStatus.value,
      patientVisible: Boolean(el.patientVisible.checked),
      notes: el.reportNotes.value.trim(),
      fileName: file?.name || existing?.fileName || "",
      fileSize: file?.size || existing?.fileSize || 0,
      images: [...keptImages, ...newImageMeta],
      uploadedBy: settings.getCurrentUser()?.name || "Usuário",
      updatedAt: new Date().toISOString()
    };

    const index = state.reports.findIndex(item => item.id === id);
    if (index >= 0) state.reports[index] = payload;
    else state.reports.unshift(payload);
    writeJson(STORAGE_REPORTS, state.reports);
    storageSet("lag-last-report-city", city);
    if (isAdmin() || currentRole() === "gestor") {
      state.city = city;
      state.categoryId = category.id;
      state.folderId = folder.id;
    }
    closeReportModal();
    render();
    toast(existing ? `Exame atualizado em ${city}.` : `Exame cadastrado em ${city}.`);
  }

  async function deleteReport(report) {
    if (!isManager() || !canManageCity(report.city)) return toast("Seu cargo não permite excluir este laudo.", "error");
    if (!confirm(`Excluir o laudo de ${report.patient}?`)) return;
    state.reports = state.reports.filter(item => item.id !== report.id);
    writeJson(STORAGE_REPORTS, state.reports);
    await deletePdf(report.id);
    for (const image of report.images || []) await deleteImage(report.id, image.id);
    render();
    toast("Laudo excluído.");
  }

  async function openPdf(report, download) {
    const record = await getPdf(report.id);
    if (!record?.blob) return toast("O arquivo PDF não está disponível neste navegador.", "error");
    const url = URL.createObjectURL(record.blob);
    if (download) {
      const link = document.createElement("a");
      link.href = url;
      link.download = report.fileName || "laudo.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } else {
      window.open(url, "_blank", "noopener");
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function updateSelectedFile() {
    const file = el.reportFile.files?.[0];
    el.selectedFileName.textContent = file ? `${file.name} • ${formatBytes(file.size)}` : "Máximo recomendado: 15 MB";
  }

  function updateSelectedImages() {
    const files = Array.from(el.reportImages?.files || []);
    el.selectedImagesName.textContent = files.length
      ? `${files.length} imagem(ns) selecionada(s) • ${formatBytes(files.reduce((sum, file) => sum + file.size, 0))}`
      : "Nenhuma imagem selecionada";
    updateImageCountBadge();
  }

  function updateImageCountBadge() {
    const existing = state.reports.find(item => item.id === el.reportId.value);
    const kept = (existing?.images || []).filter(image => !state.removedImageIds.has(image.id)).length;
    const incoming = Array.from(el.reportImages?.files || []).length;
    el.imageCountBadge.textContent = String(kept + incoming);
  }

  function renderExistingImages(report) {
    const images = report?.images || [];
    if (!images.length) {
      el.existingImagesList.innerHTML = "";
      updateImageCountBadge();
      return;
    }
    el.existingImagesList.innerHTML = images.map(image => `<article data-existing-image="${escapeAttr(image.id)}"><i class="fa-solid fa-image"></i><div><strong>${escapeHtml(image.name)}</strong><small>${formatBytes(image.size)}</small></div><button type="button" data-remove-existing-image="${escapeAttr(image.id)}" title="Remover imagem"><i class="fa-solid fa-trash"></i></button></article>`).join("");
    updateImageCountBadge();
  }

  function handleExistingImageRemove(event) {
    const button = event.target.closest("[data-remove-existing-image]");
    if (!button) return;
    const imageId = button.dataset.removeExistingImage;
    state.removedImageIds.add(imageId);
    button.closest("[data-existing-image]")?.remove();
    updateImageCountBadge();
  }

  function isImagingContext(category, folder) {
    const text = normalize(`${category?.name || ""} ${folder?.name || ""} ${category?.description || ""}`);
    return ["ultrassom", "ultrassonografia", "usg", "ecografia", "imagem"].some(term => text.includes(term));
  }

  function updateImagingFields() {
    if (!el.imageUploadSection) return;
    const category = state.categories.find(item => item.id === el.reportCategory.value);
    const folder = state.folders.find(item => item.id === el.reportFolder.value);
    const imaging = isImagingContext(category, folder);
    el.imageUploadSection.hidden = !imaging;
    el.pdfRequirementMark.textContent = imaging ? "" : "*";
    if (!imaging) {
      el.reportImages.value = "";
      updateSelectedImages();
    }
  }

  function patientPortalUrl() {
    if (location.protocol === "file:") return "http://127.0.0.1:5500/laudos-medicos/portal-paciente/index.html";
    return new URL("portal-paciente/index.html", window.location.href).href;
  }

  function testPatientPortal(report) {
    const cpf = formatCpf(report?.cpf || "");
    const birthDate = normalizeDate(report?.birthDate);
    if (cpf.replace(/\D/g, "").length !== 11 || !birthDate) {
      toast("Este laudo ainda não possui CPF e data de nascimento válidos.", "error");
      openReportModal(report);
      return;
    }
    localStorage.setItem("lag-patient-portal-test-v1", JSON.stringify({
      cpf,
      birthDate,
      patient: report.patient || "Paciente",
      createdAt: Date.now()
    }));
    window.open(patientPortalUrl(), "_blank", "noopener");
    toast(`Portal aberto com os dados de teste de ${report.patient}.`);
  }

  async function copyPatientPortalLink(report = null) {
    const url = patientPortalUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("textarea");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    toast(report ? `Link do portal copiado para ${report.patient}.` : "Link seguro do portal do paciente copiado.");
  }

  async function openImagesModal(report) {
    clearViewerUrls();
    el.imagesViewerMeta.innerHTML = `<strong>${escapeHtml(report.patient)}</strong><span>${escapeHtml(report.examType)} • ${formatDate(report.examDate)} • ${escapeHtml(report.city)}</span>`;
    el.imagesViewerGrid.innerHTML = '<div class="images-loading"><i class="fa-solid fa-spinner fa-spin"></i> Carregando imagens...</div>';
    showModal(el.imagesModal);
    const cards = [];
    for (const image of report.images || []) {
      const record = await getImage(report.id, image.id);
      if (!record?.blob) continue;
      const url = URL.createObjectURL(record.blob);
      state.viewerUrls.push(url);
      cards.push(`<article><a href="${escapeAttr(url)}" target="_blank" rel="noopener"><img src="${escapeAttr(url)}" alt="${escapeAttr(image.name)}"></a><div><strong>${escapeHtml(image.name)}</strong><small>${formatBytes(image.size)}</small><a href="${escapeAttr(url)}" download="${escapeAttr(image.name)}"><i class="fa-solid fa-download"></i> Baixar</a></div></article>`);
    }
    el.imagesViewerGrid.innerHTML = cards.join("") || '<div class="images-loading">As imagens não estão disponíveis neste navegador.</div>';
  }

  function closeImagesModal() {
    el.imagesModal.hidden = true;
    clearViewerUrls();
    finishModalClose();
  }

  function clearViewerUrls() {
    state.viewerUrls.forEach(url => URL.revokeObjectURL(url));
    state.viewerUrls = [];
  }

  function clearFilters() {
    el.reportSearch.value = "";
    el.statusFilter.value = "";
    el.doctorFilter.value = "";
    el.sortFilter.value = "date-desc";
    state.folderId = "";
    render();
  }

  function showModal(modal) {
    el.modalBackdrop.hidden = false;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeReportModal() {
    el.reportModal.hidden = true;
    finishModalClose();
  }

  function closeFolderModal() {
    el.folderModal.hidden = true;
    finishModalClose();
  }

  function closeCategoryModal() {
    el.categoryModal.hidden = true;
    finishModalClose();
  }

  function closeAllModals() {
    el.reportModal.hidden = true;
    el.folderModal.hidden = true;
    el.categoryModal.hidden = true;
    el.imagesModal.hidden = true;
    clearViewerUrls();
    finishModalClose();
  }

  function finishModalClose() {
    if (el.reportModal.hidden && el.folderModal.hidden && el.categoryModal.hidden && el.imagesModal.hidden) {
      el.modalBackdrop.hidden = true;
      document.body.style.overflow = "";
    }
  }

  function currentRole() {
    return settings.normalizeRole(settings.getCurrentUser()?.role);
  }

  function isAdmin() {
    return ["admin", "administrador"].includes(currentRole());
  }

  function isManager() {
    return isAdmin() || currentRole() === "gestor";
  }

  function canUpload() {
    return isManager() || currentRole() === "medico";
  }

  function canUploadToCity(city) {
    const role = currentRole();
    if (isAdmin() || role === "medico") return CITIES.includes(normalizeCity(city));
    return normalizeCity(settings.getCurrentUser()?.unit) === normalizeCity(city);
  }

  function canManageCity(city) {
    return isAdmin() || normalizeCity(settings.getCurrentUser()?.unit) === normalizeCity(city);
  }

  function openSidebarByDefault() {
    storageSet("lag-sidebar-hidden", "false");
    document.body.classList.remove("sidebar-hidden");
    el.menuButton.setAttribute("aria-expanded", "true");
  }

  function isMobile() {
    return matchMedia("(max-width:980px)").matches;
  }

  function toggleSidebar() {
    if (isMobile()) {
      const open = !el.sidebar.classList.contains("open");
      el.sidebar.classList.toggle("open", open);
      el.mobileOverlay.classList.toggle("show", open);
    } else {
      const hidden = document.body.classList.toggle("sidebar-hidden");
      storageSet("lag-sidebar-hidden", String(hidden));
      el.menuButton.setAttribute("aria-expanded", String(!hidden));
    }
  }

  function closeMobileSidebar() {
    el.sidebar.classList.remove("open");
    el.mobileOverlay.classList.remove("show");
  }

  function cycleTheme() {
    const current = document.documentElement.dataset.theme || "dark-cyan";
    settings.applyTheme(settings.THEMES[(settings.THEMES.indexOf(current) + 1) % settings.THEMES.length]);
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(DB_STORE)) request.result.createObjectStore(DB_STORE, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function dbAction(mode, action) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DB_STORE, mode);
      const request = action(transaction.objectStore(DB_STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  }

  async function putPdf(id, file) {
    return dbAction("readwrite", store => store.put({ id, kind: "pdf", blob: file, name: file.name, type: file.type, size: file.size, savedAt: new Date().toISOString() }));
  }

  async function putImage(reportId, imageId, file) {
    return dbAction("readwrite", store => store.put({ id: `image:${reportId}:${imageId}`, reportId, imageId, kind: "image", blob: file, name: file.name, type: file.type, size: file.size, savedAt: new Date().toISOString() }));
  }

  async function getImage(reportId, imageId) {
    try { return await dbAction("readonly", store => store.get(`image:${reportId}:${imageId}`)); }
    catch { return null; }
  }

  async function deleteImage(reportId, imageId) {
    try { return await dbAction("readwrite", store => store.delete(`image:${reportId}:${imageId}`)); }
    catch { return null; }
  }

  async function getPdf(id) {
    try { return await dbAction("readonly", store => store.get(id)); }
    catch { return null; }
  }

  async function deletePdf(id) {
    try { return await dbAction("readwrite", store => store.delete(id)); }
    catch { return null; }
  }

  function toast(message, type = "success") {
    const node = document.createElement("div");
    node.className = "report-toast";
    node.innerHTML = `<i class="fa-solid ${type === "error" ? "fa-circle-exclamation" : "fa-circle-check"}"></i><span>${escapeHtml(message)}</span>`;
    if (type === "error") node.querySelector("i").style.color = "var(--negative)";
    el.toastStack.appendChild(node);
    setTimeout(() => node.remove(), 3600);
  }

  function iconForName(name) {
    const value = normalize(name);
    if (value.includes("cardio")) return "fa-heart-pulse";
    if (value.includes("neuro")) return "fa-brain";
    if (value.includes("ultra") || value.includes("usg") || value.includes("imagem")) return "fa-images";
    if (value.includes("oftal")) return "fa-eye";
    if (value.includes("pneumo")) return "fa-lungs";
    if (value.includes("orto")) return "fa-bone";
    if (value.includes("odonto")) return "fa-tooth";
    return "fa-stethoscope";
  }

  function safeIcon(icon) {
    const value = String(icon || "fa-stethoscope").replace(/[^a-z0-9-]/gi, "");
    return value.startsWith("fa-") ? value : "fa-stethoscope";
  }

  function statusLabel(status) {
    return ({ rascunho: "Rascunho", revisao: "Em revisão", finalizado: "Finalizado" })[status] || status;
  }

  function normalizeCity(city) {
    if (typeof settings.normalizeCity === "function") return settings.normalizeCity(city);
    const value = String(city || CITIES[0]).trim();
    return CITIES.find(item => normalize(item) === normalize(value)) || value;
  }

  function normalizeDate(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function formatCpf(value) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function formatDate(value) {
    if (!value) return "Sem data";
    try { return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`)); }
    catch { return value; }
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 KB";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function slug(value) {
    return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
  }

  function normalize(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function readJson(key, fallback) {
    try { return JSON.parse(storageGet(key)) ?? fallback; }
    catch { return fallback; }
  }

  function writeJson(key, value) {
    storageSet(key, JSON.stringify(value));
  }

  function storageGet(key) {
    try { return localStorage.getItem(key); }
    catch { return null; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, value); }
    catch { /* armazenamento indisponível */ }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
})();
