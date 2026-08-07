(() => {
  "use strict";

  const DB_NAME = "lag-controller-almoxarifado";
  const DB_VERSION = 1;
  const ALLOWED_ROLES = new Set(["admin", "administrador", "financeiro", "laboratorio", "laboratório", "gestor", "gerente"]);
  const THEME_KEY = "lag-dashboard-theme";
  const SIDEBAR_KEY = "lag-sidebar-hidden";
  const ROLE_KEY = "lag-user-role";

  const state = {
    db: null,
    products: [],
    requests: [],
    movements: [],
    tab: "overview",
    search: "",
    scannedProduct: null,
    unknownBarcode: "",
    scannerStream: null,
    scannerFrame: null,
    detector: null,
    role: "admin",
    financeRequestSearch: "",
    selectedRequestId: null
  };

  const el = {};

  const seedProducts = [
    { barcode: "7891000001011", internalCode: "LAB-EDTA-04", name: "Tubo de coleta EDTA 4ml", category: "Laboratório", unit: "un.", stock: 12, minStock: 50, supplier: "Labmed Produtos Ltda.", price: 0.86, location: "Prateleira A-01", expiry: "2027-06-30", description: "Tampa roxa, coleta de sangue", createdAt: "2026-07-20T09:10:00" },
    { barcode: "7891000001028", internalCode: "LU-P-100", name: "Luva nitrílica descartável M", category: "Consumíveis", unit: "cx.", stock: 8, minStock: 20, supplier: "Bio Solutions Brasil", price: 38.9, location: "Prateleira B-02", expiry: "2029-01-31", description: "Caixa com 100 unidades", createdAt: "2026-07-21T10:20:00" },
    { barcode: "7891000001035", internalCode: "ALC-70-1L", name: "Álcool etílico 70% 1L", category: "Limpeza", unit: "frasco", stock: 15, minStock: 20, supplier: "Distribuidora Saúde+", price: 11.4, location: "Armário C-01", expiry: "2028-04-30", description: "Uso hospitalar", createdAt: "2026-07-21T14:40:00" },
    { barcode: "7891000001042", internalCode: "PONT-10UL", name: "Ponteira com filtro 10µL", category: "Laboratório", unit: "pct.", stock: 38, minStock: 15, supplier: "Bio Solutions Brasil", price: 92.5, location: "Prateleira A-04", expiry: "2029-10-31", description: "Pacote com 1000 unidades", createdAt: "2026-07-22T08:30:00" },
    { barcode: "7891000001059", internalCode: "DPD-CLORO", name: "Reagente DPD Cloro Livre", category: "Reagentes", unit: "frasco", stock: 21, minStock: 8, supplier: "Química & Cia", price: 74.2, location: "Geladeira R-02", expiry: "2027-02-28", description: "Frasco com 50 ml", createdAt: "2026-07-22T11:12:00" },
    { barcode: "7891000001066", internalCode: "SRG-5ML", name: "Seringa descartável 5ml", category: "Consumíveis", unit: "un.", stock: 180, minStock: 50, supplier: "Cirúrgica Prime", price: 0.72, location: "Prateleira B-04", expiry: "2030-03-31", description: "Com agulha 25x7", createdAt: "2026-07-23T09:50:00" },
    { barcode: "7891000001073", internalCode: "PAP-A4", name: "Papel sulfite A4", category: "Escritório", unit: "resma", stock: 25, minStock: 10, supplier: "Office Center", price: 27.8, location: "Armário ADM-01", expiry: "", description: "500 folhas, 75g", createdAt: "2026-07-24T13:15:00" },
    { barcode: "7891000001080", internalCode: "COLET-13L", name: "Coletor perfurocortante 13L", category: "Consumíveis", unit: "un.", stock: 7, minStock: 20, supplier: "Distribuidora Saúde+", price: 12.9, location: "Prateleira B-06", expiry: "2030-12-31", description: "Descarte de materiais perfurocortantes", createdAt: "2026-07-25T15:10:00" },
    { barcode: "7891000001097", internalCode: "SWAB-EST", name: "Swab estéril", category: "Laboratório", unit: "un.", stock: 94, minStock: 40, supplier: "Labmed Produtos Ltda.", price: 1.1, location: "Prateleira A-06", expiry: "2028-09-30", description: "Haste estéril para coleta", createdAt: "2026-07-26T08:44:00" },
    { barcode: "7891000001103", internalCode: "DET-ENZ-5L", name: "Detergente enzimático 5L", category: "Limpeza", unit: "galão", stock: 6, minStock: 5, supplier: "HigiPro Hospitalar", price: 89.5, location: "Armário C-03", expiry: "2028-05-31", description: "Limpeza de instrumental", createdAt: "2026-07-27T10:05:00" }
  ];

  const seedRequests = [
    { productId: null, productName: "Luva nitrílica descartável M", quantity: 20, requester: "Bianca Souza", department: "Laboratório", priority: "Alta", status: "Aguardando aprovação", reason: "Reposição de estoque crítico", createdAt: "2026-07-30T10:20:00" },
    { productId: null, productName: "Tubo de coleta EDTA 4ml", quantity: 10, requester: "Carlos Lima", department: "Laboratório", priority: "Média", status: "Em análise", reason: "Consumo semanal acima da média", createdAt: "2026-07-30T09:12:00" },
    { productId: null, productName: "Álcool etílico 70% 1L", quantity: 15, requester: "Juliana Martins", department: "Higienização", priority: "Alta", status: "Aguardando aprovação", reason: "Reposição para salas de atendimento", createdAt: "2026-07-29T16:40:00" },
    { productId: null, productName: "Ponteira com filtro 10µL", quantity: 8, requester: "Bianca Souza", department: "Laboratório", priority: "Média", status: "Aprovada", reason: "Programação de exames", createdAt: "2026-07-29T14:15:00" },
    { productId: null, productName: "Reagente DPD Cloro Livre", quantity: 12, requester: "Carlos Lima", department: "Laboratório", priority: "Baixa", status: "Concluída", reason: "Reserva técnica", createdAt: "2026-07-28T11:00:00" }
  ];

  const seedMovements = [
    { productId: 1, productName: "Tubo de coleta EDTA 4ml", type: "saida", quantity: 30, destination: "Coleta", responsible: "Mariana S.", document: "OS-4587", note: "Uso no setor de coleta", createdAt: "2026-07-30T10:24:00" },
    { productId: 2, productName: "Luva nitrílica descartável M", type: "entrada", quantity: 20, destination: "Almoxarifado", responsible: "João P.", document: "NF-8912", note: "Compra recebida", createdAt: "2026-07-30T09:15:00" },
    { productId: 3, productName: "Álcool etílico 70% 1L", type: "saida", quantity: 2, destination: "Higienização", responsible: "Mariana S.", document: "OS-4586", note: "Limpeza de salas", createdAt: "2026-07-30T08:42:00" },
    { productId: 6, productName: "Seringa descartável 5ml", type: "entrada", quantity: 50, destination: "Almoxarifado", responsible: "João P.", document: "NF-8904", note: "Reposição mensal", createdAt: "2026-07-29T16:30:00" },
    { productId: 8, productName: "Coletor perfurocortante 13L", type: "saida", quantity: 1, destination: "Consultório", responsible: "Mariana S.", document: "OS-4570", note: "Troca programada", createdAt: "2026-07-29T14:11:00" }
  ];

  class InventoryDB {
    constructor() {
      this.stores = { products: [], requests: [], movements: [] };
      this.counters = { products: 1, requests: 1, movements: 1 };
    }

    async open() { return this; }

    clone(value) {
      if (typeof structuredClone === "function") return structuredClone(value);
      return JSON.parse(JSON.stringify(value));
    }

    async getAll(storeName) {
      return this.clone(this.stores[storeName] || []);
    }

    async get(storeName, id) {
      const item = (this.stores[storeName] || []).find(row => Number(row.id) === Number(id));
      return item ? this.clone(item) : null;
    }

    async getByIndex(storeName, indexName, value) {
      const item = (this.stores[storeName] || []).find(row => String(row[indexName] ?? "") === String(value ?? ""));
      return item ? this.clone(item) : null;
    }

    async add(storeName, value) {
      const store = this.stores[storeName];
      if (!store) throw new Error(`Área temporária inválida: ${storeName}`);
      const id = this.counters[storeName]++;
      store.push({ ...this.clone(value), id });
      return id;
    }

    async put(storeName, value) {
      const store = this.stores[storeName];
      if (!store) throw new Error(`Área temporária inválida: ${storeName}`);
      const row = this.clone(value);
      let id = Number(row.id) || 0;
      if (!id) id = this.counters[storeName]++;
      const index = store.findIndex(item => Number(item.id) === id);
      const saved = { ...row, id };
      if (index >= 0) store[index] = saved;
      else store.push(saved);
      this.counters[storeName] = Math.max(this.counters[storeName], id + 1);
      return id;
    }

    async delete(storeName, id) {
      const store = this.stores[storeName];
      if (!store) return;
      const index = store.findIndex(item => Number(item.id) === Number(id));
      if (index >= 0) store.splice(index, 1);
    }

    async count(storeName) {
      return (this.stores[storeName] || []).length;
    }
  }

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheElements();
    setupRoleAccess();
    bindUI();
    initTheme();
    initSidebar();
    detectScannerSupport();

    if (!hasAccess()) return;

    try {
      state.db = await new InventoryDB().open();
      await seedDatabase();
      await refreshData();
      renderAll();
    } catch (error) {
      console.error(error);
      toast("Sessão indisponível", error.message || "Não foi possível iniciar os dados temporários.", "error");
    }
  }

  function cacheElements() {
    [
      "sidebar", "mobileOverlay", "menuButton", "themeButton", "globalSearch", "profileRole", "inventoryPage", "accessDenied",
      "statProducts", "statUnits", "statLow", "statRequests", "overviewRequestsBody", "supplierList", "criticalList",
      "stockStatusFilter", "stockCategoryFilter", "stockTableBody", "stockEmpty", "requestForm", "requestProduct", "requestProductOptions", "requestProductHint",
      "requestQuantity", "requestPriority", "requester", "requestDepartment", "requestReason", "requestStatusFilter", "requestCards",
      "financeRequestsTab", "financeRequestsCounter", "financeRequestSearch", "financePendingCount", "financeApprovedCount", "financePurchasingCount", "financeConfirmedCount", "financeCompletedCount",
      "requestDetailDialog", "closeRequestDetail", "detailRequestTitle", "detailRequestStatus", "detailProduct", "detailRequestKind", "detailQuantity", "detailRequester", "detailDepartment", "detailPriority", "detailDate", "detailReason", "detailFinanceNote", "detailAudit", "requestDetailActions",
      "outgoingForm", "outgoingProduct", "outgoingQuantity", "outgoingDestination", "outgoingResponsible", "outgoingDocument", "outgoingNote",
      "outgoingStockPreview", "outgoingHistory", "productForm", "productId", "productName", "productBarcode", "productInternalCode",
      "productCategory", "productUnit", "productStock", "productMinStock", "productSupplier", "productPrice", "productLocation", "productExpiry",
      "productDescription", "clearProductForm", "supplierOptions", "lastProducts", "exportInventory", "scannerSupport", "scannerVideo",
      "cameraPlaceholder", "startScanner", "stopScanner", "manualBarcode", "manualScanButton", "scanEmpty", "scanResult", "scanNew",
      "scanBarcodeLabel", "scanProductName", "scanProductMeta", "scanProductStock", "scanQuantity", "scanResponsible", "scanEntryButton",
      "scanExitButton", "scanUnknownCode", "registerScannedProduct", "toastStack", "confirmDialog", "confirmTitle", "confirmText", "confirmAccept",
      "notificationBadge", "sidebarUpdate"
    ].forEach(id => { el[id] = document.getElementById(id); });
  }

  function normalizeRole(role) {
    return String(role || "admin").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function setupRoleAccess() {
    const queryRole = new URLSearchParams(location.search).get("role");
    const storedRole = safeStorageGet(ROLE_KEY);
    const settingsRole = window.LAGSettings?.getCurrentUser?.()?.role;
    state.role = normalizeRole(queryRole || settingsRole || storedRole || "admin");
    const labels = { admin: "Administrador", administrador: "Administrador", financeiro: "Financeiro", laboratorio: "Laboratório", gestor: "Gestor", gerente: "Gerente" };
    el.profileRole.textContent = labels[state.role] || capitalize(state.role);

    const canManageRequests = isRequestManagerRole();
    document.querySelectorAll(".finance-only").forEach(node => node.classList.toggle("hidden", !canManageRequests));

    if (!hasAccess()) {
      el.inventoryPage.classList.add("hidden");
      el.accessDenied.classList.remove("hidden");
    }

    window.LAGAlmoxarifado = {
      setRole(role) {
        safeStorageSet(ROLE_KEY, normalizeRole(role));
        location.reload();
      },
      getRole() { return state.role; },
      allowedRoles: ["laboratorio", "admin", "financeiro", "gestor", "gerente"],
      getSnapshot() { return { products: state.products.length, requests: state.requests.length, movements: state.movements.length, tab: state.tab }; },
      resetSession() { state.db = new InventoryDB(); return seedDatabase().then(refreshData).then(renderAll); }
    };
  }

  function hasAccess() {
    if (window.LAGSettings?.canAccess) return window.LAGSettings.canAccess("almoxarifado");
    return ALLOWED_ROLES.has(state.role);
  }
  function isFinanceRole() { return state.role === "financeiro"; }
  function isAdminRole() { return state.role === "admin" || state.role === "administrador"; }
  function isRequestManagerRole() { return isFinanceRole() || isAdminRole() || state.role === "gestor" || state.role === "gerente"; }

  function bindUI() {
    document.querySelectorAll(".module-tab").forEach(button => button.addEventListener("click", () => openTab(button.dataset.tab)));
    document.querySelectorAll("[data-open-tab]").forEach(button => button.addEventListener("click", () => openTab(button.dataset.openTab)));
    el.menuButton.addEventListener("click", toggleSidebar);
    el.mobileOverlay.addEventListener("click", closeMobileSidebar);
    el.themeButton?.addEventListener("click", toggleTheme);
    window.addEventListener("resize", handleResize);
    document.addEventListener("keydown", shortcutHandler);

    el.globalSearch.addEventListener("input", event => {
      state.search = event.target.value.trim().toLowerCase();
      renderStock();
      if (state.search && state.tab !== "stock") openTab("stock", false);
    });
    el.stockStatusFilter.addEventListener("change", renderStock);
    el.stockCategoryFilter.addEventListener("change", renderStock);
    el.requestStatusFilter?.addEventListener("change", renderRequests);
    el.financeRequestSearch?.addEventListener("input", event => {
      state.financeRequestSearch = event.target.value.trim().toLowerCase();
      renderRequests();
    });
    el.requestProduct?.addEventListener("input", updateRequestProductHint);
    el.requestProduct?.addEventListener("change", updateRequestProductHint);
    el.closeRequestDetail?.addEventListener("click", closeRequestDetail);
    el.requestDetailDialog?.addEventListener("click", event => {
      if (event.target === el.requestDetailDialog) closeRequestDetail();
    });
    el.requestDetailActions?.querySelectorAll("[data-finance-action]").forEach(button => button.addEventListener("click", () => handleFinanceAction(button.dataset.financeAction)));
    el.outgoingProduct.addEventListener("change", renderOutgoingPreview);

    el.requestForm.addEventListener("submit", submitRequest);
    el.outgoingForm.addEventListener("submit", submitOutgoing);
    el.productForm.addEventListener("submit", submitProduct);
    el.clearProductForm.addEventListener("click", clearProductForm);
    el.exportInventory.addEventListener("click", exportInventoryCsv);

    el.startScanner.addEventListener("click", startScanner);
    el.stopScanner.addEventListener("click", stopScanner);
    el.manualScanButton.addEventListener("click", () => processBarcode(el.manualBarcode.value));
    el.manualBarcode.addEventListener("keydown", event => {
      if (event.key === "Enter") { event.preventDefault(); processBarcode(el.manualBarcode.value); }
    });
    el.scanEntryButton.addEventListener("click", () => registerScannedMovement("entrada"));
    el.scanExitButton.addEventListener("click", () => registerScannedMovement("saida"));
    el.registerScannedProduct.addEventListener("click", prepareUnknownProductRegistration);
  }

  function shortcutHandler(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      el.globalSearch.focus();
    }
    if (event.key === "Escape") stopScanner();
  }

  function safeStorageGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function safeStorageSet(key, value) {
    try { localStorage.setItem(key, value); } catch { /* sem armazenamento */ }
  }

  function initTheme() {
    const saved = safeStorageGet(THEME_KEY);
    const allowedThemes = ["light-blue", "light-teal", "dark-cyan", "dark-purple"];
    document.documentElement.dataset.theme = allowedThemes.includes(saved) ? saved : "light-blue";
  }
  function toggleTheme() {
    const themes = ["light-blue", "light-teal", "dark-cyan", "dark-purple"];
    const current = document.documentElement.dataset.theme || "light-blue";
    const next = themes[(themes.indexOf(current) + 1) % themes.length];
    document.documentElement.dataset.theme = next;
    safeStorageSet(THEME_KEY, next);
    window.dispatchEvent(new CustomEvent("lag:theme-changed", { detail: { theme: next } }));
  }

  function isMobile() { return matchMedia("(max-width: 980px)").matches; }
  function initSidebar() {
    if (isMobile()) {
      document.body.classList.remove("sidebar-hidden");
      el.menuButton.setAttribute("aria-expanded", "false");
      return;
    }
    const hidden = safeStorageGet(SIDEBAR_KEY) === "true";
    document.body.classList.toggle("sidebar-hidden", hidden);
    el.menuButton.setAttribute("aria-expanded", String(!hidden));
  }
  function toggleSidebar() {
    if (isMobile()) {
      const open = !el.sidebar.classList.contains("open");
      el.sidebar.classList.toggle("open", open);
      el.mobileOverlay.classList.toggle("show", open);
      el.menuButton.setAttribute("aria-expanded", String(open));
      return;
    }
    const hidden = document.body.classList.toggle("sidebar-hidden");
    safeStorageSet(SIDEBAR_KEY, String(hidden));
    el.menuButton.setAttribute("aria-expanded", String(!hidden));
  }
  function closeMobileSidebar() {
    el.sidebar.classList.remove("open");
    el.mobileOverlay.classList.remove("show");
    if (isMobile()) el.menuButton.setAttribute("aria-expanded", "false");
  }
  function handleResize() {
    if (isMobile()) {
      document.body.classList.remove("sidebar-hidden");
      closeMobileSidebar();
    } else {
      closeMobileSidebar();
      initSidebar();
    }
  }

  async function seedDatabase() {
    if (await state.db.count("products") === 0) {
      for (const product of seedProducts) await state.db.add("products", product);
    }
    if (await state.db.count("requests") === 0) {
      for (const request of seedRequests) await state.db.add("requests", request);
    }
    if (await state.db.count("movements") === 0) {
      for (const movement of seedMovements) await state.db.add("movements", movement);
    }
  }

  async function refreshData() {
    const [products, requests, movements] = await Promise.all([
      state.db.getAll("products"),
      state.db.getAll("requests"),
      state.db.getAll("movements")
    ]);
    state.products = products.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    state.requests = requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    state.movements = movements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function renderAll() {
    renderStats();
    renderOverview();
    renderProductOptions();
    renderCategoryFilter();
    renderStock();
    renderRequests();
    renderOutgoingPreview();
    renderOutgoingHistory();
    renderLastProducts();
    updateDate();
  }

  function renderStats() {
    const units = state.products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
    const low = state.products.filter(product => getStockStatus(product) !== "normal").length;
    const openRequests = state.requests.filter(request => request.status !== "Concluída").length;
    animateNumber(el.statProducts, state.products.length);
    animateNumber(el.statUnits, units);
    animateNumber(el.statLow, low);
    animateNumber(el.statRequests, openRequests);
    if (el.notificationBadge) {
      const count = Math.min(99, low + openRequests);
      el.notificationBadge.textContent = String(count);
      el.notificationBadge.hidden = count === 0;
    }
  }

  function renderOverview() {
    const requests = isRequestManagerRole() ? state.requests.slice(0, 5) : [];
    el.overviewRequestsBody.innerHTML = isRequestManagerRole()
      ? (requests.map(request => `
      <tr>
        <td><div class="product-cell"><span class="product-icon"><i class="fa-solid fa-box"></i></span><div><strong>${escapeHtml(request.productName)}</strong><small>${escapeHtml(request.department)}</small></div></div></td>
        <td>${formatNumber(request.quantity)}</td>
        <td>${escapeHtml(request.requester)}</td>
        <td>${priorityBadge(request.priority)}</td>
        <td>${requestStatusBadge(request.status)}</td>
      </tr>`).join("") || emptyRow(5, "Nenhuma solicitação cadastrada."))
      : "";

    const supplierMap = new Map();
    state.products.forEach(product => {
      const supplier = product.supplier || "Sem fornecedor";
      const current = supplierMap.get(supplier) || { count: 0, value: 0 };
      current.count += 1;
      current.value += Number(product.stock || 0) * Number(product.price || 0);
      supplierMap.set(supplier, current);
    });
    const suppliers = [...supplierMap.entries()].sort((a, b) => b[1].value - a[1].value).slice(0, 5);
    el.supplierList.innerHTML = suppliers.map(([name, data], index) => `
      <div class="supplier-row"><span class="supplier-rank">${index + 1}</span><strong>${escapeHtml(name)}</strong><small>${formatCurrency(data.value)}</small></div>`).join("") || `<div class="empty-inline">Nenhum fornecedor cadastrado.</div>`;

    const critical = state.products.filter(product => getStockStatus(product) !== "normal").sort((a, b) => (a.stock / Math.max(a.minStock, 1)) - (b.stock / Math.max(b.minStock, 1))).slice(0, 5);
    el.criticalList.innerHTML = critical.map(product => `
      <div class="critical-row"><div><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.internalCode || product.barcode)} • mínimo ${formatNumber(product.minStock)} ${escapeHtml(product.unit)}</small></div><span class="critical-quantity">${formatNumber(product.stock)} ${escapeHtml(product.unit)}</span>${stockStatusBadge(product)}</div>`).join("") || `<div class="empty-inline">Todos os produtos estão com estoque normal.</div>`;
  }

  function renderProductOptions() {
    const selectOptions = state.products.map(product => `<option value="${product.id}">${escapeHtml(product.name)} — ${formatNumber(product.stock)} ${escapeHtml(product.unit)}</option>`).join("");
    const currentOutgoing = el.outgoingProduct.value;
    el.outgoingProduct.innerHTML = `<option value="">Selecione um produto</option>${selectOptions}`;
    if (state.products.some(product => String(product.id) === currentOutgoing)) el.outgoingProduct.value = currentOutgoing;

    if (el.requestProductOptions) {
      el.requestProductOptions.innerHTML = state.products.map(product =>
        `<option value="${escapeHtml(product.name)}">${formatNumber(product.stock)} ${escapeHtml(product.unit)} em estoque</option>`
      ).join("");
    }
    updateRequestProductHint();

    const suppliers = [...new Set(state.products.map(product => product.supplier).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    el.supplierOptions.innerHTML = suppliers.map(supplier => `<option value="${escapeHtml(supplier)}"></option>`).join("");
  }

  function findRequestedStockProduct(name) {
    const normalized = String(name || "").trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return null;
    return state.products.find(product => product.name.trim().toLocaleLowerCase("pt-BR") === normalized) || null;
  }

  function updateRequestProductHint() {
    if (!el.requestProductHint || !el.requestProduct) return;
    const typedName = el.requestProduct.value.trim();
    const product = findRequestedStockProduct(typedName);
    if (!typedName) {
      el.requestProductHint.className = "field-help";
      el.requestProductHint.textContent = "Digite um produto novo ou escolha um item já cadastrado para solicitar reposição.";
      return;
    }
    if (product) {
      el.requestProductHint.className = "field-help found";
      el.requestProductHint.innerHTML = `<i class="fa-solid fa-boxes-stacked"></i> Produto do estoque: ${formatNumber(product.stock)} ${escapeHtml(product.unit)} disponíveis. A solicitação será registrada como reposição.`;
    } else {
      el.requestProductHint.className = "field-help new-item";
      el.requestProductHint.innerHTML = `<i class="fa-solid fa-circle-plus"></i> Produto novo: será enviado para compra mesmo sem cadastro no estoque.`;
    }
  }

  function getRequestKind(request) {
    if (request.requestKind) return request.requestKind;
    return findRequestedStockProduct(request.productName) ? "Reposição do estoque" : "Produto novo";
  }

  function renderCategoryFilter() {
    const current = el.stockCategoryFilter.value || "all";
    const categories = [...new Set(state.products.map(product => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    el.stockCategoryFilter.innerHTML = `<option value="all">Todas as categorias</option>${categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}`;
    el.stockCategoryFilter.value = categories.includes(current) ? current : "all";
  }

  function getFilteredProducts() {
    const status = el.stockStatusFilter.value;
    const category = el.stockCategoryFilter.value;
    return state.products.filter(product => {
      const haystack = `${product.name} ${product.barcode} ${product.internalCode || ""} ${product.supplier || ""} ${product.category || ""}`.toLowerCase();
      return (!state.search || haystack.includes(state.search)) &&
        (status === "all" || getStockStatus(product) === status) &&
        (category === "all" || product.category === category);
    });
  }

  function renderStock() {
    if (!el.stockTableBody) return;
    const products = getFilteredProducts();
    el.stockTableBody.innerHTML = products.map(product => `
      <tr>
        <td><div class="product-cell"><span class="product-icon"><i class="fa-solid fa-box"></i></span><div><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.supplier || "Sem fornecedor")}</small></div></div></td>
        <td><strong>${escapeHtml(product.internalCode || "—")}</strong><br><small>${escapeHtml(product.barcode)}</small></td>
        <td>${escapeHtml(product.category)}</td>
        <td><strong>${formatNumber(product.stock)} ${escapeHtml(product.unit)}</strong></td>
        <td>${formatNumber(product.minStock)} ${escapeHtml(product.unit)}</td>
        <td>${escapeHtml(product.location || "—")}</td>
        <td>${stockStatusBadge(product)}</td>
        <td><div class="row-actions"><button class="icon-action" data-product-action="edit" data-id="${product.id}" title="Editar"><i class="fa-solid fa-pen"></i></button><button class="icon-action" data-product-action="scan" data-id="${product.id}" title="Movimentar"><i class="fa-solid fa-barcode"></i></button><button class="icon-action delete" data-product-action="delete" data-id="${product.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button></div></td>
      </tr>`).join("");
    el.stockEmpty.classList.toggle("show", products.length === 0);

    el.stockTableBody.querySelectorAll("[data-product-action]").forEach(button => button.addEventListener("click", () => {
      const product = state.products.find(item => item.id === Number(button.dataset.id));
      if (!product) return;
      if (button.dataset.productAction === "edit") editProduct(product);
      if (button.dataset.productAction === "scan") showScannedProduct(product);
      if (button.dataset.productAction === "delete") deleteProduct(product);
    }));
  }

  function renderRequests() {
    if (!el.requestCards) return;

    const pending = state.requests.filter(request => ["Aguardando aprovação", "Em análise"].includes(request.status)).length;
    const approved = state.requests.filter(request => request.status === "Aprovada").length;
    const purchasing = state.requests.filter(request => request.status === "Em compra").length;
    const confirmed = state.requests.filter(request => request.status === "Compra confirmada").length;
    const completed = state.requests.filter(request => request.status === "Concluída").length;

    if (el.financeRequestsCounter) el.financeRequestsCounter.textContent = String(pending);
    if (el.financePendingCount) el.financePendingCount.textContent = formatNumber(pending);
    if (el.financeApprovedCount) el.financeApprovedCount.textContent = formatNumber(approved);
    if (el.financePurchasingCount) el.financePurchasingCount.textContent = formatNumber(purchasing);
    if (el.financeConfirmedCount) el.financeConfirmedCount.textContent = formatNumber(confirmed);
    if (el.financeCompletedCount) el.financeCompletedCount.textContent = formatNumber(completed);

    if (!isRequestManagerRole()) {
      el.requestCards.innerHTML = "";
      return;
    }

    const filter = el.requestStatusFilter?.value || "all";
    const query = state.financeRequestSearch;
    const requests = state.requests.filter(request => {
      const statusMatch = filter === "all" || request.status === filter;
      const searchMatch = !query || [request.productName, request.requester, request.department, request.reason, String(request.id)]
        .some(value => String(value || "").toLowerCase().includes(query));
      return statusMatch && searchMatch;
    });

    el.requestCards.innerHTML = requests.map(request => `
      <article class="request-card finance-request-card">
        <div class="request-card-main">
          <div class="request-card-head"><h3>#${String(request.id).padStart(5, "0")} — ${escapeHtml(request.productName)}</h3><span class="request-kind-pill">${escapeHtml(getRequestKind(request))}</span>${priorityBadge(request.priority)}${requestStatusBadge(request.status)}</div>
          <div class="request-meta"><span><i class="fa-solid fa-cubes"></i> ${formatNumber(request.quantity)} unidades</span><span><i class="fa-solid fa-user"></i> ${escapeHtml(request.requester)}</span><span><i class="fa-solid fa-building"></i> ${escapeHtml(request.department)}</span><span><i class="fa-regular fa-clock"></i> ${formatDateTime(request.createdAt)}</span></div>
          ${request.reason ? `<small>${escapeHtml(request.reason)}</small>` : ""}
          ${request.financeNote ? `<div class="finance-note-preview"><i class="fa-solid fa-comment-dollar"></i><span>${escapeHtml(request.financeNote)}</span></div>` : ""}
        </div>
        <div class="request-actions finance-card-actions">
          <button class="button compact primary" data-view-request="${request.id}" type="button"><i class="fa-regular fa-eye"></i> Ver solicitação</button>
        </div>
      </article>`).join("") || `<div class="empty-state show"><i class="fa-solid fa-clipboard-list"></i><strong>Nenhuma solicitação encontrada</strong><span>Altere os filtros para visualizar outros pedidos.</span></div>`;

    el.requestCards.querySelectorAll("[data-view-request]").forEach(button => button.addEventListener("click", () => openRequestDetail(Number(button.dataset.viewRequest))));
  }

  function openRequestDetail(requestId) {
    if (!isRequestManagerRole()) return toast("Acesso restrito", "Somente o Financeiro ou Administrador pode abrir as solicitações.", "warning");
    const request = state.requests.find(item => item.id === Number(requestId));
    if (!request) return;

    state.selectedRequestId = request.id;
    el.detailRequestTitle.textContent = `Solicitação #${String(request.id).padStart(5, "0")}`;
    el.detailRequestStatus.innerHTML = `${priorityBadge(request.priority)}${requestStatusBadge(request.status)}`;
    el.detailProduct.textContent = request.productName;
    el.detailRequestKind.textContent = getRequestKind(request);
    el.detailQuantity.textContent = `${formatNumber(request.quantity)} unidades`;
    el.detailRequester.textContent = request.requester;
    el.detailDepartment.textContent = request.department;
    el.detailPriority.textContent = request.priority;
    el.detailDate.textContent = formatDateTime(request.createdAt);
    el.detailReason.textContent = request.reason || "Sem justificativa informada.";
    el.detailFinanceNote.value = request.financeNote || "";
    el.detailAudit.innerHTML = buildRequestAudit(request);
    updateFinanceActionButtons(request.status);

    if (!el.requestDetailDialog?.open) {
      if (el.requestDetailDialog?.showModal) el.requestDetailDialog.showModal();
      else el.requestDetailDialog?.setAttribute("open", "");
    }
  }

  function closeRequestDetail() {
    if (!el.requestDetailDialog) return;
    if (el.requestDetailDialog.open && el.requestDetailDialog.close) el.requestDetailDialog.close();
    else el.requestDetailDialog.removeAttribute("open");
    state.selectedRequestId = null;
  }

  function updateFinanceActionButtons(status) {
    const enabled = {
      analysis: ["Aguardando aprovação"],
      reject: ["Aguardando aprovação", "Em análise", "Aprovada"],
      approve: ["Aguardando aprovação", "Em análise", "Recusada"],
      purchase: ["Aprovada"],
      confirm: ["Em compra"],
      complete: ["Compra confirmada"]
    };
    el.requestDetailActions?.querySelectorAll("[data-finance-action]").forEach(button => {
      button.hidden = !(enabled[button.dataset.financeAction] || []).includes(status);
    });
  }

  async function handleFinanceAction(action) {
    if (!isRequestManagerRole()) return toast("Acesso restrito", "Somente o Financeiro ou Administrador pode atualizar solicitações.", "warning");
    const request = state.requests.find(item => item.id === Number(state.selectedRequestId));
    if (!request) return;

    const actions = {
      analysis: { status: "Em análise", title: "Iniciar análise", text: "Deseja marcar esta solicitação como Em análise?" },
      reject: { status: "Recusada", title: "Recusar solicitação", text: "Deseja recusar esta solicitação? A observação financeira será registrada." },
      approve: { status: "Aprovada", title: "Aprovar solicitação", text: "Deseja aprovar a compra deste produto?" },
      purchase: { status: "Em compra", title: "Marcar como em compra", text: "Confirma que a cotação ou compra deste item foi iniciada?" },
      confirm: { status: "Compra confirmada", title: "Confirmar compra", text: "Confirma que a compra foi realizada com o fornecedor?" },
      complete: { status: "Concluída", title: "Concluir pedido", text: "Confirma que o pedido foi finalizado e entregue?" }
    };
    const config = actions[action];
    if (!config) return;
    if (!await confirmAction(config.title, config.text)) return;

    const now = new Date().toISOString();
    request.status = config.status;
    request.financeNote = el.detailFinanceNote.value.trim();
    request.updatedAt = now;
    request.updatedBy = isFinanceRole() ? "Financeiro" : "Administrador";
    if (action === "analysis") request.analysisAt = now;
    if (action === "approve") request.approvedAt = now;
    if (action === "reject") request.rejectedAt = now;
    if (action === "purchase") request.purchaseStartedAt = now;
    if (action === "confirm") request.purchaseConfirmedAt = now;
    if (action === "complete") request.completedAt = now;

    await state.db.put("requests", request);
    await refreshData();
    renderAll();
    openRequestDetail(request.id);
    toast("Solicitação atualizada", `O pedido #${String(request.id).padStart(5, "0")} agora está como ${config.status}.`);
  }

  function buildRequestAudit(request) {
    const events = [
      { date: request.createdAt, icon: "fa-paper-plane", label: "Solicitação enviada" },
      { date: request.analysisAt, icon: "fa-magnifying-glass", label: "Análise iniciada" },
      { date: request.approvedAt, icon: "fa-check", label: "Solicitação aprovada" },
      { date: request.purchaseStartedAt, icon: "fa-cart-arrow-down", label: "Produto marcado como em compra" },
      { date: request.rejectedAt, icon: "fa-xmark", label: "Solicitação recusada" },
      { date: request.purchaseConfirmedAt, icon: "fa-cart-shopping", label: "Compra confirmada" },
      { date: request.completedAt, icon: "fa-box-open", label: "Pedido concluído" }
    ].filter(event => event.date);
    return `<span class="request-audit-title">Histórico do pedido</span>${events.map(event => `<div><i class="fa-solid ${event.icon}"></i><span><strong>${event.label}</strong><small>${formatDateTime(event.date)}</small></span></div>`).join("")}`;
  }

  function renderOutgoingPreview() {
    const product = state.products.find(item => item.id === Number(el.outgoingProduct.value));
    if (!product) {
      el.outgoingStockPreview.innerHTML = `<i class="fa-solid fa-box"></i><span>Selecione um produto para visualizar o saldo.</span>`;
      return;
    }
    el.outgoingStockPreview.innerHTML = `<i class="fa-solid fa-box"></i><span>Saldo disponível: <strong>${formatNumber(product.stock)} ${escapeHtml(product.unit)}</strong> • Estoque mínimo: ${formatNumber(product.minStock)} ${escapeHtml(product.unit)}</span>`;
    el.outgoingQuantity.max = String(product.stock);
  }

  function renderOutgoingHistory() {
    const outgoing = state.movements.filter(item => item.type === "saida").slice(0, 12);
    el.outgoingHistory.innerHTML = outgoing.map(item => `
      <article class="movement-card"><div class="movement-card-main"><div class="movement-card-head"><h3>${escapeHtml(item.productName)}</h3><span class="status-pill critical">Saída</span></div><div class="movement-meta"><span><i class="fa-solid fa-building"></i> ${escapeHtml(item.destination || "—")}</span><span><i class="fa-solid fa-user"></i> ${escapeHtml(item.responsible || "—")}</span><span><i class="fa-regular fa-clock"></i> ${formatDateTime(item.createdAt)}</span></div><small>${escapeHtml(item.note || item.document || "Sem observação")}</small></div><strong class="movement-quantity">-${formatNumber(item.quantity)}</strong></article>`).join("") || `<div class="empty-state show"><i class="fa-solid fa-arrow-up-from-bracket"></i><strong>Nenhuma saída registrada</strong><span>As retiradas aparecerão aqui.</span></div>`;
  }

  function renderLastProducts() {
    const last = [...state.products].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    el.lastProducts.innerHTML = last.map(product => `<div class="last-product"><div><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.barcode)}</small></div><span>${formatNumber(product.stock)} ${escapeHtml(product.unit)}</span></div>`).join("") || `<small>Nenhum produto cadastrado.</small>`;
  }

  async function submitRequest(event) {
    event.preventDefault();
    const typedName = el.requestProduct.value.trim();
    if (!typedName) return toast("Produto obrigatório", "Digite o nome do produto solicitado.", "warning");

    const stockProduct = findRequestedStockProduct(typedName);
    const request = {
      productId: stockProduct?.id || null,
      productName: stockProduct?.name || typedName,
      requestKind: stockProduct ? "Reposição do estoque" : "Produto novo",
      quantity: positiveInteger(el.requestQuantity.value),
      requester: el.requester.value.trim(),
      department: el.requestDepartment.value,
      priority: el.requestPriority.value,
      status: "Aguardando aprovação",
      reason: el.requestReason.value.trim(),
      createdAt: new Date().toISOString()
    };
    if (!request.quantity) return toast("Quantidade inválida", "Informe uma quantidade maior que zero.", "warning");
    if (!request.requester) return toast("Solicitante obrigatório", "Informe quem está fazendo o pedido.", "warning");

    await state.db.add("requests", request);
    el.requestForm.reset();
    el.requestPriority.value = "Média";
    el.requester.value = "Dr. Gestor";
    updateRequestProductHint();
    await refreshAndRender("Solicitação enviada", `${request.quantity} unidade(s) de ${request.productName} foram solicitadas como ${request.requestKind.toLowerCase()}.`);
  }

  async function submitOutgoing(event) {
    event.preventDefault();
    const product = state.products.find(item => item.id === Number(el.outgoingProduct.value));
    const quantity = positiveInteger(el.outgoingQuantity.value);
    if (!product) return toast("Produto obrigatório", "Selecione o produto retirado.", "warning");
    if (!quantity) return toast("Quantidade inválida", "Informe uma quantidade maior que zero.", "warning");
    if (quantity > Number(product.stock)) return toast("Saldo insuficiente", `Existem somente ${formatNumber(product.stock)} ${product.unit} em estoque.`, "error");

    const movement = {
      productId: product.id,
      productName: product.name,
      type: "saida",
      quantity,
      destination: el.outgoingDestination.value,
      responsible: el.outgoingResponsible.value.trim(),
      document: el.outgoingDocument.value.trim(),
      note: el.outgoingNote.value.trim(),
      createdAt: new Date().toISOString()
    };
    product.stock = Number(product.stock) - quantity;
    product.updatedAt = new Date().toISOString();
    await state.db.put("products", product);
    await state.db.add("movements", movement);
    el.outgoingForm.reset();
    el.outgoingResponsible.value = "Dr. Gestor";
    await refreshAndRender("Saída registrada", `${quantity} ${product.unit} de ${product.name} foram baixadas do estoque.`);
  }

  async function submitProduct(event) {
    event.preventDefault();
    const id = Number(el.productId.value) || null;
    const barcode = sanitizeBarcode(el.productBarcode.value);
    if (!barcode) return toast("Código obrigatório", "Digite ou escaneie um código de barras.", "warning");

    const duplicate = await state.db.getByIndex("products", "barcode", barcode);
    if (duplicate && duplicate.id !== id) return toast("Código já cadastrado", `Este código pertence ao produto “${duplicate.name}”.`, "error");

    const existing = id ? await state.db.get("products", id) : null;
    const product = {
      ...(existing || {}),
      barcode,
      internalCode: el.productInternalCode.value.trim(),
      name: el.productName.value.trim(),
      category: el.productCategory.value,
      unit: el.productUnit.value,
      stock: nonNegativeNumber(el.productStock.value),
      minStock: nonNegativeNumber(el.productMinStock.value),
      supplier: el.productSupplier.value.trim(),
      price: nonNegativeNumber(el.productPrice.value),
      location: el.productLocation.value.trim(),
      expiry: el.productExpiry.value,
      description: el.productDescription.value.trim(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!product.name) return toast("Nome obrigatório", "Informe o nome do produto.", "warning");
    if (id) product.id = id;
    const savedId = id ? await state.db.put("products", product) : await state.db.add("products", product);

    if (!id && product.stock > 0) {
      await state.db.add("movements", {
        productId: savedId,
        productName: product.name,
        type: "entrada",
        quantity: product.stock,
        destination: "Almoxarifado",
        responsible: "Dr. Gestor",
        document: "CADASTRO-INICIAL",
        note: "Saldo inicial informado no cadastro",
        createdAt: new Date().toISOString()
      });
    }

    clearProductForm();
    await refreshAndRender(id ? "Produto atualizado" : "Produto cadastrado", `${product.name} foi adicionado nesta sessão temporária.`);
    openTab("stock");
  }

  function editProduct(product) {
    el.productId.value = product.id;
    el.productName.value = product.name || "";
    el.productBarcode.value = product.barcode || "";
    el.productInternalCode.value = product.internalCode || "";
    el.productCategory.value = product.category || "Laboratório";
    el.productUnit.value = product.unit || "un.";
    el.productStock.value = Number(product.stock || 0);
    el.productMinStock.value = Number(product.minStock || 0);
    el.productSupplier.value = product.supplier || "";
    el.productPrice.value = Number(product.price || 0);
    el.productLocation.value = product.location || "";
    el.productExpiry.value = product.expiry || "";
    el.productDescription.value = product.description || "";
    openTab("register");
    el.productName.focus();
    toast("Edição ativada", `Atualize os dados de ${product.name} e salve novamente.`);
  }

  async function deleteProduct(product) {
    if (!await confirmAction("Excluir produto", `${product.name} será removido do estoque. O histórico de movimentações será mantido.`)) return;
    await state.db.delete("products", product.id);
    await refreshAndRender("Produto excluído", `${product.name} foi removido desta sessão.`, "warning");
  }

  function clearProductForm() {
    el.productForm.reset();
    el.productId.value = "";
    el.productStock.value = "0";
    el.productMinStock.value = "10";
    el.productCategory.value = "Laboratório";
    el.productUnit.value = "un.";
  }

  function openTab(tab, scroll = true) {
    if (tab === "finance-requests" && !isRequestManagerRole()) {
      toast("Acesso restrito", "Somente o Financeiro ou Administrador pode visualizar as solicitações.", "warning");
      return;
    }
    if (!document.querySelector(`[data-panel="${tab}"]`)) return;
    state.tab = tab;
    document.querySelectorAll(".module-tab").forEach(button => {
      const active = button.dataset.tab === tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.toggle("active", panel.dataset.panel === tab));
    if (tab !== "scanner") stopScanner();
    if (tab === "scanner") setTimeout(() => el.manualBarcode.focus(), 120);
    closeMobileSidebar();
    if (scroll) document.querySelector(".module-shell")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function detectScannerSupport() {
    const camera = !!navigator.mediaDevices?.getUserMedia;
    const detector = "BarcodeDetector" in window;
    if (camera && detector) {
      el.scannerSupport.classList.add("supported");
      el.scannerSupport.innerHTML = `<i class="fa-solid fa-circle-check"></i> Câmera compatível`;
    } else if (camera) {
      el.scannerSupport.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Use leitor USB/manual`;
    } else {
      el.scannerSupport.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Câmera indisponível`;
    }
  }

  async function startScanner() {
    if (!navigator.mediaDevices?.getUserMedia) {
      return toast("Câmera indisponível", "Abra o site em localhost ou HTTPS, ou utilize um leitor USB.", "warning");
    }
    if (!("BarcodeDetector" in window)) {
      return toast("Leitura por câmera não suportada", "Use o campo manual ou um leitor USB de código de barras.", "warning");
    }

    try {
      state.detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "itf", "qr_code"] });
      state.scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      el.scannerVideo.srcObject = state.scannerStream;
      await el.scannerVideo.play();
      el.cameraPlaceholder.classList.add("hidden");
      el.startScanner.disabled = true;
      el.stopScanner.disabled = false;
      scanLoop();
    } catch (error) {
      console.error(error);
      toast("Não foi possível abrir a câmera", "Verifique a permissão do navegador e use localhost ou HTTPS.", "error");
    }
  }

  async function scanLoop() {
    if (!state.scannerStream || !state.detector) return;
    try {
      const codes = await state.detector.detect(el.scannerVideo);
      if (codes.length) {
        const code = codes[0].rawValue;
        stopScanner();
        processBarcode(code);
        return;
      }
    } catch (error) {
      console.debug("Scanner aguardando quadro válido", error);
    }
    state.scannerFrame = requestAnimationFrame(scanLoop);
  }

  function stopScanner() {
    if (state.scannerFrame) cancelAnimationFrame(state.scannerFrame);
    state.scannerFrame = null;
    if (state.scannerStream) state.scannerStream.getTracks().forEach(track => track.stop());
    state.scannerStream = null;
    if (el.scannerVideo) el.scannerVideo.srcObject = null;
    if (el.cameraPlaceholder) el.cameraPlaceholder.classList.remove("hidden");
    if (el.startScanner) el.startScanner.disabled = false;
    if (el.stopScanner) el.stopScanner.disabled = true;
  }

  async function processBarcode(rawCode) {
    const barcode = sanitizeBarcode(rawCode);
    if (!barcode) return toast("Código vazio", "Digite ou leia um código de barras válido.", "warning");
    el.manualBarcode.value = barcode;
    const product = await state.db.getByIndex("products", "barcode", barcode);
    if (product) {
      showScannedProduct(product);
      toast("Produto encontrado", `${product.name} foi identificado.`);
    } else {
      showUnknownBarcode(barcode);
      toast("Produto não cadastrado", "Você pode criar o cadastro usando o código lido.", "warning");
    }
  }

  function showScannedProduct(product) {
    state.scannedProduct = product;
    state.unknownBarcode = "";
    openTab("scanner");
    el.scanEmpty.classList.add("hidden");
    el.scanNew.classList.add("hidden");
    el.scanResult.classList.remove("hidden");
    el.scanBarcodeLabel.textContent = `Código ${product.barcode}`;
    el.scanProductName.textContent = product.name;
    el.scanProductMeta.textContent = `${product.category} • ${product.internalCode || "sem código interno"} • ${product.location || "sem localização"}`;
    el.scanProductStock.textContent = `${formatNumber(product.stock)} ${product.unit}`;
    el.scanQuantity.value = "1";
  }

  function showUnknownBarcode(barcode) {
    state.scannedProduct = null;
    state.unknownBarcode = barcode;
    el.scanEmpty.classList.add("hidden");
    el.scanResult.classList.add("hidden");
    el.scanNew.classList.remove("hidden");
    el.scanUnknownCode.textContent = barcode;
  }

  function prepareUnknownProductRegistration() {
    clearProductForm();
    el.productBarcode.value = state.unknownBarcode;
    openTab("register");
    el.productName.focus();
  }

  async function registerScannedMovement(type) {
    const product = state.scannedProduct ? await state.db.get("products", state.scannedProduct.id) : null;
    const quantity = positiveInteger(el.scanQuantity.value);
    if (!product) return toast("Produto não selecionado", "Faça uma nova leitura.", "warning");
    if (!quantity) return toast("Quantidade inválida", "Informe uma quantidade maior que zero.", "warning");
    if (type === "saida" && quantity > Number(product.stock)) return toast("Saldo insuficiente", `Saldo atual: ${formatNumber(product.stock)} ${product.unit}.`, "error");

    product.stock = Number(product.stock) + (type === "entrada" ? quantity : -quantity);
    product.updatedAt = new Date().toISOString();
    await state.db.put("products", product);
    await state.db.add("movements", {
      productId: product.id,
      productName: product.name,
      type,
      quantity,
      destination: type === "entrada" ? "Almoxarifado" : "Saída via scanner",
      responsible: el.scanResponsible.value.trim() || "Dr. Gestor",
      document: "SCANNER",
      note: `Movimentação registrada pelo código ${product.barcode}`,
      createdAt: new Date().toISOString()
    });
    await refreshData();
    renderAll();
    showScannedProduct(state.products.find(item => item.id === product.id));
    toast(type === "entrada" ? "Entrada registrada" : "Saída registrada", `${quantity} ${product.unit} de ${product.name} foram movimentadas.`);
  }

  async function refreshAndRender(title, message, type = "success") {
    await refreshData();
    renderAll();
    toast(title, message, type);
  }

  function getStockStatus(product) {
    const stock = Number(product.stock || 0);
    const min = Number(product.minStock || 0);
    if (stock <= Math.max(1, min * .5)) return "critical";
    if (stock < min) return "low";
    return "normal";
  }

  function stockStatusBadge(product) {
    const status = getStockStatus(product);
    const labels = { normal: "Normal", low: "Baixo", critical: "Crítico" };
    return `<span class="status-pill ${status}">${labels[status]}</span>`;
  }

  function requestStatusBadge(status) {
    const classes = {
      "Aguardando aprovação": "pending",
      "Em análise": "analysis",
      "Aprovada": "approved",
      "Recusada": "rejected",
      "Em compra": "buying",
      "Compra confirmada": "purchase",
      "Concluída": "complete",
      "Rascunho": "draft"
    };
    return `<span class="status-pill ${classes[status] || "draft"}">${escapeHtml(status)}</span>`;
  }

  function priorityBadge(priority) {
    const classes = { "Baixa": "low", "Média": "medium", "Alta": "high", "Urgente": "urgent" };
    return `<span class="priority-pill ${classes[priority] || "medium"}">${escapeHtml(priority)}</span>`;
  }

  function selected(value, expected) { return value === expected ? "selected" : ""; }

  function animateNumber(element, target) {
    if (!element) return;
    const start = Number(element.dataset.value || 0);
    const end = Number(target || 0);
    const startedAt = performance.now();
    const duration = 500;
    const tick = now => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const value = Math.round(start + (end - start) * (1 - Math.pow(1 - progress, 3)));
      element.textContent = formatNumber(value);
      if (progress < 1) requestAnimationFrame(tick);
      else element.dataset.value = String(end);
    };
    requestAnimationFrame(tick);
  }

  function exportInventoryCsv() {
    const headers = ["ID", "Código de barras", "Código interno", "Produto", "Categoria", "Unidade", "Estoque", "Estoque mínimo", "Fornecedor", "Valor unitário", "Localização", "Validade"];
    const rows = state.products.map(product => [product.id, product.barcode, product.internalCode, product.name, product.category, product.unit, product.stock, product.minStock, product.supplier, product.price, product.location, product.expiry]);
    const csv = [headers, ...rows].map(row => row.map(csvCell).join(";")).join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `estoque-lag-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast("Estoque exportado", "O arquivo CSV foi gerado com sucesso.");
  }

  function csvCell(value) { return `"${String(value ?? "").replace(/"/g, '""')}"`; }

  function confirmAction(title, text) {
    if (!el.confirmDialog?.showModal) return Promise.resolve(window.confirm(`${title}\n\n${text}`));
    el.confirmTitle.textContent = title;
    el.confirmText.textContent = text;
    el.confirmDialog.showModal();
    return new Promise(resolve => {
      const handler = () => {
        el.confirmDialog.removeEventListener("close", handler);
        resolve(el.confirmDialog.returnValue === "confirm");
      };
      el.confirmDialog.addEventListener("close", handler);
    });
  }

  function toast(title, message, type = "success") {
    const icon = type === "error" ? "fa-circle-xmark" : type === "warning" ? "fa-triangle-exclamation" : "fa-circle-check";
    const item = document.createElement("div");
    item.className = `toast ${type}`;
    item.innerHTML = `<i class="fa-solid ${icon}"></i><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span></div><button type="button" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>`;
    item.querySelector("button").addEventListener("click", () => item.remove());
    el.toastStack.appendChild(item);
    setTimeout(() => item.remove(), 5200);
  }

  function updateDate() {
    if (el.sidebarUpdate) el.sidebarUpdate.textContent = "Reinicia ao atualizar";
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
  }
  function formatNumber(value) { return new Intl.NumberFormat("pt-BR").format(Number(value || 0)); }
  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
  }
  function positiveInteger(value) { const number = Math.floor(Number(value)); return Number.isFinite(number) && number > 0 ? number : 0; }
  function nonNegativeNumber(value) { const number = Number(value); return Number.isFinite(number) && number >= 0 ? number : 0; }
  function sanitizeBarcode(value) { return String(value || "").trim().replace(/\s+/g, "").slice(0, 64); }
  function capitalize(value) { const text = String(value || ""); return text ? text[0].toUpperCase() + text.slice(1) : ""; }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }
  function emptyRow(columns, text) { return `<tr><td colspan="${columns}" style="text-align:center;color:var(--muted);padding:28px">${escapeHtml(text)}</td></tr>`; }
})();
