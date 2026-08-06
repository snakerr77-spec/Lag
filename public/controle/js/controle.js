const EMPTY_DASHBOARD_DATA = {
  resumo: {
    fonte: "Nenhuma planilha selecionada",
    atualizadoEm: "—",
    exames: { faturamento: 0, pagamento: 0, lucro: 0, quantidade: 0 },
    consultas: { faturamento: 0, pagamento: 0, lucro: 0, quantidade: 0, quantidadeLinhas: 0 },
    geral: { faturamento: 0, pagamento: 0, lucro: 0, quantidade: 0 }
  },
  exames: [],
  consultas: []
};

let SOURCE_DATA = EMPTY_DASHBOARD_DATA.resumo;
let EXAM_ROWS = [];
let CONSULT_ROWS = [];

function normalizeDashboardData(data) {
  const source = data && typeof data === "object" ? data : EMPTY_DASHBOARD_DATA;
  const resumo = source.resumo && typeof source.resumo === "object" ? source.resumo : EMPTY_DASHBOARD_DATA.resumo;
  const ensureSummary = value => ({
    faturamento: Number(value?.faturamento) || 0,
    pagamento: Number(value?.pagamento) || 0,
    lucro: Number(value?.lucro) || 0,
    quantidade: Number(value?.quantidade) || 0,
    ...(value?.quantidadeLinhas !== undefined ? { quantidadeLinhas: Number(value.quantidadeLinhas) || 0 } : {})
  });
  const normalizeRows = rows => (Array.isArray(rows) ? rows : []).map(row => ({
    tipo: String(row?.tipo || "Exames"),
    profissional: String(row?.profissional || "Não informado"),
    especialidade: String(row?.especialidade || "Não informada"),
    faturamento: Number(row?.faturamento) || 0,
    pagamento: Number(row?.pagamento) || 0,
    lucro: Number(row?.lucro) || 0,
    quantidade: Number(row?.quantidade) || 0,
    agendas: Number(row?.agendas) || 0
  }));

  return {
    resumo: {
      fonte: String(resumo.fonte || "Nenhuma planilha selecionada"),
      atualizadoEm: String(resumo.atualizadoEm || "—"),
      exames: ensureSummary(resumo.exames),
      consultas: ensureSummary(resumo.consultas),
      geral: ensureSummary(resumo.geral)
    },
    exames: normalizeRows(source.exames),
    consultas: normalizeRows(source.consultas)
  };
}

function applyDashboardData(data, options = {}) {
  const normalized = normalizeDashboardData(data);
  SOURCE_DATA = normalized.resumo;
  EXAM_ROWS = normalized.exames;
  CONSULT_ROWS = normalized.consultas;

  if (options.resetView !== false) {
    state.professional = "todos";
    state.specialty = "todas";
    state.search = "";
    if (el.globalSearch) el.globalSearch.value = "";
  }

  if (el.dashboardTitle) {
    buildFilters();
    render();
  }
}

const state = {
  view: "geral",
  professional: "todos",
  specialty: "todas",
  search: "",
  barMetric: "faturamento",
  theme: safeStorageGet("lag-dashboard-theme") || "dark-cyan"
};

function safeStorageGet(key) {
  try { return localStorage.getItem(key); } catch (_) { return null; }
}

function safeStorageSet(key, value) {
  try { localStorage.setItem(key, value); } catch (_) {}
}

const el = {};

applyDashboardData(window.LAG_DASHBOARD_DATA || EMPTY_DASHBOARD_DATA, { resetView: false });
window.LAGDashboard = {
  setData(data, options) {
    window.LAG_DASHBOARD_DATA = data;
    applyDashboardData(data, options);
  },
  getData() {
    return { resumo: SOURCE_DATA, exames: EXAM_ROWS, consultas: CONSULT_ROWS };
  }
};
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR");

const PALETTE = ["#15c7ff", "#00d6b8", "#7b61ff", "#f7a425", "#3d8dff", "#ec6da7", "#20b486", "#8ba2bc"];

// Controla as animações dos indicadores sem criar intervalos acumulados.
const metricAnimations = new WeakMap();
const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

function animateMetric(element, target, formatter, options = {}) {
  if (!element) return;

  const safeTarget = Number.isFinite(Number(target)) ? Number(target) : 0;
  const duration = options.duration ?? 1050;
  const decimals = options.decimals ?? 0;
  const previousTarget = Number(element.dataset.metricTarget);
  const runningAnimation = metricAnimations.get(element);

  // Impede que chamadas repetidas de renderização reiniciem a mesma animação.
  if (runningAnimation && previousTarget === safeTarget) return;

  if (runningAnimation) cancelAnimationFrame(runningAnimation);

  const startValue = Number.isFinite(Number(element.dataset.metricValue))
    ? Number(element.dataset.metricValue)
    : 0;

  element.dataset.metricTarget = String(safeTarget);
  element.classList.remove("metric-finished");
  element.classList.add("metric-counting");

  if (prefersReducedMotion || duration <= 0) {
    element.textContent = formatter(safeTarget);
    element.dataset.metricValue = String(safeTarget);
    element.classList.remove("metric-counting");
    element.classList.add("metric-finished");
    return;
  }

  const startedAt = performance.now();
  const difference = safeTarget - startValue;

  const tick = now => {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    const value = startValue + difference * eased;
    const normalized = decimals > 0
      ? Number(value.toFixed(decimals))
      : Math.round(value);

    element.textContent = formatter(normalized);
    element.dataset.metricValue = String(value);

    if (progress < 1) {
      metricAnimations.set(element, requestAnimationFrame(tick));
      return;
    }

    element.textContent = formatter(safeTarget);
    element.dataset.metricValue = String(safeTarget);
    element.classList.remove("metric-counting");
    element.classList.add("metric-finished");
    metricAnimations.delete(element);

    window.setTimeout(() => element.classList.remove("metric-finished"), 420);
  };

  metricAnimations.set(element, requestAnimationFrame(tick));
}

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  const requestedView = new URLSearchParams(window.location.search).get("view");
  if (["geral", "exames", "consultas"].includes(requestedView)) state.view = requestedView;
  bindEvents();
  setTheme(state.theme);
  buildFilters();
  render();
  initSidebarState();
  updateActiveView();
});

function cacheElements() {
  [
    "dashboardTitle","dashboardSubtitle","sourceName","updatedAt","sidebarUpdate",
    "professionalFilter","specialtyFilter","globalSearch","resetFilters","barMetric",
    "kpiRevenue","kpiRevenueHint","kpiPayment","kpiProfit","kpiMargin","profitTag",
    "kpiQuantity","kpiQuantityLabel","kpiQuantityHint","donutTotal","specialtyLegend",
    "rankingList","insightList","dataTableBody","rowCount","tableTitle","barTitle",
    "barEyebrow","exportButton","themePicker","themeButton","menuButton","sidebar",
    "mobileOverlay","showAllButton"
  ].forEach(id => el[id] = document.getElementById(id));
}

function bindEvents() {
  document.querySelectorAll("[data-view], [data-section]").forEach(button => {
    button.addEventListener("click", () => switchView(button.dataset.view || button.dataset.section));
  });

  document.querySelectorAll("[data-theme-choice]").forEach(button => {
    button.addEventListener("click", () => setTheme(button.dataset.themeChoice));
  });

  el.professionalFilter.addEventListener("change", e => { state.professional = e.target.value; render(); });
  el.specialtyFilter.addEventListener("change", e => { state.specialty = e.target.value; render(); });
  el.globalSearch.addEventListener("input", e => { state.search = e.target.value.trim().toLowerCase(); render(); });
  el.barMetric.addEventListener("change", e => { state.barMetric = e.target.value; renderCharts(getFilteredRows()); });
  el.resetFilters.addEventListener("click", resetFilters);
  el.exportButton.addEventListener("click", exportCurrentCsv);
  el.themeButton.addEventListener("click", cycleTheme);
  el.showAllButton.addEventListener("click", () => document.querySelector(".data-panel").scrollIntoView({ behavior: "smooth" }));
  el.menuButton.addEventListener("click", toggleSidebar);
  el.mobileOverlay.addEventListener("click", closeMobileMenu);
  window.addEventListener("resize", handleSidebarResize);

  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      el.globalSearch.focus();
    }
  });
}

function isMobileSidebar() {
  return window.matchMedia("(max-width: 980px)").matches;
}

function initSidebarState() {
  if (isMobileSidebar()) {
    document.body.classList.remove("sidebar-hidden");
    el.menuButton.setAttribute("aria-expanded", "false");
    return;
  }

  const hidden = safeStorageGet("lag-sidebar-hidden") !== "false";
  document.body.classList.toggle("sidebar-hidden", hidden);
  el.menuButton.setAttribute("aria-expanded", String(!hidden));
  el.menuButton.setAttribute("aria-label", hidden ? "Mostrar menu lateral" : "Ocultar menu lateral");
}

function toggleSidebar() {
  if (isMobileSidebar()) {
    const willOpen = !el.sidebar.classList.contains("open");
    el.sidebar.classList.toggle("open", willOpen);
    el.mobileOverlay.classList.toggle("show", willOpen);
    el.menuButton.setAttribute("aria-expanded", String(willOpen));
    el.menuButton.setAttribute("aria-label", willOpen ? "Fechar menu lateral" : "Abrir menu lateral");
    return;
  }

  const hidden = document.body.classList.toggle("sidebar-hidden");
  safeStorageSet("lag-sidebar-hidden", String(hidden));
  el.menuButton.setAttribute("aria-expanded", String(!hidden));
  el.menuButton.setAttribute("aria-label", hidden ? "Mostrar menu lateral" : "Ocultar menu lateral");
}

function handleSidebarResize() {
  if (isMobileSidebar()) {
    document.body.classList.remove("sidebar-hidden");
    closeMobileMenu();
    el.menuButton.setAttribute("aria-expanded", "false");
  } else {
    closeMobileMenu();
    initSidebarState();
  }
}

function closeMobileMenu() {
  el.sidebar.classList.remove("open");
  el.mobileOverlay.classList.remove("show");
  if (isMobileSidebar()) {
    el.menuButton.setAttribute("aria-expanded", "false");
    el.menuButton.setAttribute("aria-label", "Abrir menu lateral");
  }
}

function updateActiveView() {
  document.querySelectorAll("[data-view]").forEach(button => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });
  document.querySelectorAll("[data-section]").forEach(button => {
    button.classList.toggle("active", button.dataset.section === state.view);
  });
}

function switchView(view) {
  if (!["geral", "exames", "consultas"].includes(view)) return;

  state.view = view;
  state.professional = "todos";
  state.specialty = "todas";
  state.search = "";
  el.globalSearch.value = "";

  updateActiveView();
  buildFilters();
  render();
  closeMobileMenu();

  const url = new URL(window.location.href);
  url.searchParams.set("view", view);
  window.history.replaceState({}, "", url);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  safeStorageSet("lag-dashboard-theme", theme);
  document.querySelectorAll("[data-theme-choice]").forEach(button => {
    button.classList.toggle("active", button.dataset.themeChoice === theme);
  });
  setTimeout(() => renderCharts(getFilteredRows()), 20);
}

function cycleTheme() {
  const themes = ["light-blue","light-teal","dark-cyan","dark-purple"];
  const next = themes[(themes.indexOf(state.theme) + 1) % themes.length];
  setTheme(next);
}

function sourceRows() {
  if (state.view === "exames") return EXAM_ROWS;
  if (state.view === "consultas") return CONSULT_ROWS;
  return [...EXAM_ROWS, ...CONSULT_ROWS];
}

function getFilteredRows() {
  return sourceRows().filter(row => {
    const professionalMatch = state.professional === "todos" || row.profissional === state.professional;
    const specialtyMatch = state.specialty === "todas" || row.especialidade === state.specialty;
    const searchMatch = !state.search ||
      row.profissional.toLowerCase().includes(state.search) ||
      row.especialidade.toLowerCase().includes(state.search);
    return professionalMatch && specialtyMatch && searchMatch;
  });
}

function buildFilters() {
  const rows = sourceRows();
  const professionals = [...new Set(rows.map(r => r.profissional))].sort((a,b) => a.localeCompare(b, "pt-BR"));
  const specialties = [...new Set(rows.map(r => r.especialidade))].sort((a,b) => a.localeCompare(b, "pt-BR"));

  el.professionalFilter.innerHTML = `<option value="todos">Todos os profissionais</option>` +
    professionals.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");

  el.specialtyFilter.innerHTML = `<option value="todas">Todas as especialidades</option>` +
    specialties.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");

  el.professionalFilter.value = state.professional;
  el.specialtyFilter.value = state.specialty;
}

function resetFilters() {
  state.professional = "todos";
  state.specialty = "todas";
  state.search = "";
  el.professionalFilter.value = "todos";
  el.specialtyFilter.value = "todas";
  el.globalSearch.value = "";
  render();
}

function render() {
  const rows = getFilteredRows();
  renderHeader();
  renderSource();
  renderKpis(rows);
  renderCharts(rows);
  renderRanking(rows);
  renderInsights(rows);
  renderTable(rows);
}

function renderHeader() {
  const copy = {
    geral: ["Visão geral da clínica", "Consolidação financeira e operacional de exames e consultas."],
    exames: ["Painel de exames", "Indicadores exclusivos de exames e procedimentos realizados."],
    consultas: ["Painel de consultas", "Indicadores exclusivos das consultas médicas atendidas."]
  };
  [el.dashboardTitle.textContent, el.dashboardSubtitle.textContent] = copy[state.view];
  el.barEyebrow.textContent = state.view === "geral" ? "Faturamento" : state.view === "exames" ? "Exames" : "Consultas";
  el.barTitle.textContent = state.barMetric === "quantidade"
    ? "Maiores volumes por profissional"
    : state.barMetric === "lucro"
      ? "Melhores resultados por profissional"
      : "Maiores receitas por profissional";
  el.tableTitle.textContent = state.view === "geral"
    ? "Exames e consultas por profissional"
    : state.view === "exames"
      ? "Detalhamento dos exames"
      : "Detalhamento das consultas";
}

function renderSource() {
  el.sourceName.textContent = SOURCE_DATA.fonte;
  el.updatedAt.textContent = SOURCE_DATA.atualizadoEm;
  el.sidebarUpdate.textContent = SOURCE_DATA.atualizadoEm;
}

function calculateSummary(rows) {
  return rows.reduce((acc, row) => {
    acc.faturamento += row.faturamento;
    acc.pagamento += row.pagamento;
    acc.lucro += row.lucro;
    acc.quantidade += row.quantidade;
    return acc;
  }, { faturamento: 0, pagamento: 0, lucro: 0, quantidade: 0 });
}

function renderKpis(rows) {
  const filtered = state.professional !== "todos" || state.specialty !== "todas" || state.search;
  let summary = calculateSummary(rows);

  if (!filtered) {
    summary = SOURCE_DATA[state.view];
  }

  const margin = summary.faturamento ? (summary.lucro / summary.faturamento) * 100 : 0;

  animateMetric(el.kpiRevenue, summary.faturamento, value => currency.format(value), { duration: 1250, decimals: 2 });
  animateMetric(el.kpiPayment, summary.pagamento, value => currency.format(value), { duration: 1350, decimals: 2 });
  animateMetric(el.kpiProfit, summary.lucro, value => currency.format(value), { duration: 1450, decimals: 2 });
  animateMetric(el.kpiMargin, margin, value => `Margem de ${formatPercent(value)}`, { duration: 1120, decimals: 1 });
  animateMetric(el.kpiQuantity, summary.quantidade, value => number.format(value), { duration: 1050 });

  el.kpiRevenueHint.textContent = state.view === "geral" ? "Exames + consultas" : state.view === "exames" ? "Receita de exames" : "Receita de consultas";
  el.kpiQuantityLabel.textContent = state.view === "geral" ? "Produções registradas" : state.view === "exames" ? "Exames realizados" : "Consultas atendidas";
  el.kpiQuantityHint.textContent = state.view === "geral" ? "Exames e consultas" : state.view === "exames" ? "Exames e procedimentos" : "Atendimentos médicos";

  el.profitTag.classList.toggle("negative", summary.lucro < 0);
  el.profitTag.classList.toggle("positive", summary.lucro >= 0);
}

function aggregate(rows, key = "profissional") {
  const map = new Map();
  rows.forEach(row => {
    const name = row[key];
    if (!map.has(name)) map.set(name, { name, faturamento: 0, pagamento: 0, lucro: 0, quantidade: 0, specialties: new Set() });
    const item = map.get(name);
    item.faturamento += row.faturamento;
    item.pagamento += row.pagamento;
    item.lucro += row.lucro;
    item.quantidade += row.quantidade;
    item.specialties.add(row.especialidade);
  });
  return [...map.values()];
}

function renderCharts(rows) {
  const professionals = aggregate(rows)
    .sort((a,b) => b[state.barMetric] - a[state.barMetric])
    .slice(0, 6);

  const maxMetric = Math.max(...professionals.map(p => Math.abs(p[state.barMetric])), 1);
  const metricLabel = state.barMetric === "quantidade"
    ? "Volume"
    : state.barMetric === "lucro"
      ? "Lucro final"
      : "Faturamento";

  const professionalChart = document.getElementById("professionalChart");
  const totalMetric = professionals.reduce((sum, item) => sum + Math.max(0, item[state.barMetric]), 0) || 1;
  professionalChart.innerHTML = professionals.length
    ? `
      <div class="pro-bar-card">
        <div class="pro-bar-topline">
          <div class="pro-bar-caption">Top profissionais do período selecionado.</div>
          <div class="pro-bar-selected">${metricLabel}</div>
        </div>
        <div class="pro-bar-list">
          ${professionals.map((item, index) => {
            const value = item[state.barMetric];
            const width = Math.max(2, Math.abs(value) / maxMetric * 100);
            const display = state.barMetric === "quantidade" ? number.format(value) : currency.format(value);
            const share = totalMetric ? (Math.max(0, value) / totalMetric) * 100 : 0;
            const initials = item.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").slice(0, 2).toUpperCase();
            const trendValue = 1.8 + ((index * 1.6) % 8.4);
            const trend = value < 0
              ? `<span class="pro-bar-delta negative"><i class="fa-solid fa-arrow-down"></i> ${formatPercent(Math.abs(trendValue))}</span>`
              : `<span class="pro-bar-delta positive"><i class="fa-solid fa-arrow-up"></i> ${formatPercent(trendValue)}</span>`;
            return `
              <div class="pro-bar-row ${value < 0 ? 'is-negative' : ''}">
                <div class="pro-bar-meta">
                  <span class="pro-bar-rank">${index + 1}</span>
                  <span class="pro-bar-avatar">${initials}</span>
                  <div class="pro-bar-namebox">
                    <strong title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong>
                    <small>${item.specialties.size ? escapeHtml([...item.specialties][0]) : 'Profissional'}</small>
                  </div>
                </div>
                <div class="pro-bar-main">
                  <div class="pro-bar-track">
                    <i class="pro-bar-fill" style="width:${width}%"></i>
                  </div>
                  <span class="pro-bar-share">${formatPercent(share)}</span>
                </div>
                <div class="pro-bar-side">
                  ${trend}
                  <strong>${display}</strong>
                </div>
              </div>
            `;
          }).join("")}
        </div>
        <div class="pro-bar-footer">
          <div class="pro-bar-summary">
            <span class="pro-bar-summary-icon"><i class="fa-solid fa-wallet"></i></span>
            <div>
              <small>${state.barMetric === 'quantidade' ? 'Volume total' : metricLabel + ' total'}</small>
              <strong>${state.barMetric === 'quantidade' ? number.format(professionals.reduce((sum, item) => sum + item.quantidade, 0)) : currency.format(professionals.reduce((sum, item) => sum + item[state.barMetric], 0))}</strong>
            </div>
          </div>
          <div class="pro-bar-count"><i class="fa-solid fa-users"></i> ${professionals.length} profissionais</div>
        </div>
      </div>
    `
    : `<div class="empty-chart">Nenhum dado encontrado.</div>`;

  const specialtyAll = aggregate(rows, "especialidade")
    .sort((a,b) => b.quantidade - a.quantidade);
  const topSpecialties = specialtyAll.slice(0, 5);
  const remaining = specialtyAll.slice(5);
  const specialties = [...topSpecialties];

  if (remaining.length) {
    specialties.push({
      name: "Outras",
      faturamento: remaining.reduce((sum,item) => sum + item.faturamento, 0),
      pagamento: remaining.reduce((sum,item) => sum + item.pagamento, 0),
      lucro: remaining.reduce((sum,item) => sum + item.lucro, 0),
      quantidade: remaining.reduce((sum,item) => sum + item.quantidade, 0),
      specialties: new Set(["Outras"])
    });
  }

  const total = specialties.reduce((sum,s) => sum + s.quantidade, 0);
  const specialtyColors = specialties.map((_,i) => PALETTE[i % PALETTE.length]);
  let cursor = 0;
  const segments = specialties.map((s,i) => {
    const start = cursor;
    cursor += total ? (s.quantidade / total * 100) : 0;
    return `${specialtyColors[i]} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  }).join(", ");

  const specialtyChart = document.getElementById("specialtyChart");
  specialtyChart.style.background = segments
    ? `conic-gradient(${segments})`
    : "var(--surface-3)";

  animateMetric(el.donutTotal, total, value => number.format(value), { duration: 1180 });
  el.specialtyLegend.innerHTML = specialties.map((s,i) => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${specialtyColors[i]}"></span>
      <span title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</span>
      <strong>${number.format(s.quantidade)}</strong>
    </div>
  `).join("");

  renderProfitChart(rows);
}

function renderProfitChart(rows) {
  const items = aggregate(rows)
    .sort((a,b) => Math.abs(b.lucro) - Math.abs(a.lucro))
    .slice(0, 10);

  const container = document.getElementById("profitChart");
  if (!items.length) {
    container.innerHTML = `<div class="empty-chart">Nenhum dado encontrado.</div>`;
    return;
  }

  const maxPositive = Math.max(...items.map(i => Math.max(0, i.lucro)), 1);
  const maxNegative = Math.max(...items.map(i => Math.max(0, -i.lucro)), 1);
  const totalScale = maxPositive + maxNegative;
  const zeroLine = maxPositive / totalScale * 100;

  container.innerHTML = `
    <div class="profit-bars" style="--count:${items.length};--zero-line:${zeroLine}%">
      ${items.map(item => {
        const positive = item.lucro >= 0;
        const zone = positive ? zeroLine : 100 - zeroLine;
        const size = positive
          ? (item.lucro / maxPositive) * zone
          : ((-item.lucro) / maxNegative) * zone;
        const top = positive ? zeroLine - size : zeroLine;
        const valueTop = positive ? Math.max(0, top - 12) : Math.min(95, zeroLine + size + 2);
        return `
          <div class="profit-column" title="${escapeHtml(item.name)}: ${currency.format(item.lucro)}">
            <div class="profit-plot">
              <span class="profit-value" style="top:${valueTop}%">${compactCurrency(item.lucro)}</span>
              <i class="profit-fill ${positive ? "" : "negative"}"
                 style="top:${top}%;height:${Math.max(size,1.5)}%"></i>
            </div>
            <span class="profit-label">${escapeHtml(shortName(item.name, 12))}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderRanking(rows) {
  const ranking = aggregate(rows).sort((a,b) => b.faturamento - a.faturamento).slice(0, 6);
  el.rankingList.innerHTML = ranking.length ? ranking.map((item,index) => `
    <div class="ranking-item">
      <span class="rank-number">${index + 1}</span>
      <span class="rank-avatar">${initials(item.name)}</span>
      <span class="rank-name">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml([...item.specialties].slice(0,2).join(" · "))}</span>
      </span>
      <span class="rank-value">
        <strong>${currency.format(item.faturamento)}</strong>
        <span>${number.format(item.quantidade)} registros</span>
      </span>
    </div>
  `).join("") : `<div class="empty-state">Nenhum registro encontrado.</div>`;
}

function renderInsights(rows) {
  const summary = calculateSummary(rows);
  const professionals = aggregate(rows);
  const topRevenue = professionals.sort((a,b) => b.faturamento - a.faturamento)[0];
  const topProfit = [...professionals].sort((a,b) => b.lucro - a.lucro)[0];
  const negativeCount = professionals.filter(p => p.lucro < 0).length;
  const margin = summary.faturamento ? summary.lucro / summary.faturamento * 100 : 0;

  const insights = [
    {
      color: "var(--positive)",
      icon: "fa-arrow-trend-up",
      title: topRevenue ? `${topRevenue.name} lidera o faturamento` : "Sem dados",
      text: topRevenue ? `${currency.format(topRevenue.faturamento)} em receita e ${number.format(topRevenue.quantidade)} registros.` : "Não há dados para o filtro atual."
    },
    {
      color: "var(--primary)",
      icon: "fa-chart-pie",
      title: `Margem consolidada de ${formatPercent(margin)}`,
      text: `Lucro de ${currency.format(summary.lucro)} sobre ${currency.format(summary.faturamento)} de faturamento.`
    },
    {
      color: "var(--warning)",
      icon: "fa-triangle-exclamation",
      title: `${negativeCount} profissional(is) com resultado negativo`,
      text: negativeCount ? "Recomenda-se revisar pagamentos, ajudas de custo e agenda desses profissionais." : "Todos os profissionais filtrados apresentam resultado não negativo."
    },
    {
      color: "var(--primary-2)",
      icon: "fa-trophy",
      title: topProfit ? `${topProfit.name} possui o maior lucro` : "Sem dados",
      text: topProfit ? `${currency.format(topProfit.lucro)} de lucro final no período consolidado.` : "Não há dados para o filtro atual."
    }
  ];

  el.insightList.innerHTML = insights.map(item => `
    <div class="insight" style="--insight-color:${item.color}">
      <span class="insight-icon"><i class="fa-solid ${item.icon}"></i></span>
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.text)}</p>
      </div>
    </div>
  `).join("");
}

function renderTable(rows) {
  const sorted = [...rows].sort((a,b) => b.faturamento - a.faturamento);
  animateMetric(el.rowCount, sorted.length, value => `${number.format(value)} registros`, { duration: 720 });
  el.dataTableBody.innerHTML = sorted.map(row => {
    const margin = row.faturamento ? row.lucro / row.faturamento * 100 : 0;
    const width = Math.min(100, Math.abs(margin));
    return `
      <tr>
        <td><span class="table-type ${row.tipo.toLowerCase()}">${row.tipo}</span></td>
        <td><strong>${escapeHtml(row.profissional)}</strong></td>
        <td>${escapeHtml(row.especialidade)}</td>
        <td>${currency.format(row.faturamento)}</td>
        <td>${currency.format(row.pagamento)}</td>
        <td class="${row.lucro >= 0 ? "money-positive" : "money-negative"}">${currency.format(row.lucro)}</td>
        <td>${number.format(row.quantidade)}</td>
        <td>
          <div>${formatPercent(margin)}</div>
          <div class="margin-bar ${margin < 0 ? "negative" : ""}"><i style="width:${width}%"></i></div>
        </td>
      </tr>
    `;
  }).join("");
}

function exportCurrentCsv() {
  const rows = getFilteredRows();
  const header = ["Tipo","Profissional","Especialidade","Faturamento","Pagamento","Lucro","Quantidade","Agendas"];
  const csvRows = [header, ...rows.map(r => [
    r.tipo, r.profissional, r.especialidade, r.faturamento, r.pagamento, r.lucro, r.quantidade, r.agendas
  ])];

  const csv = "\uFEFF" + csvRows.map(row => row.map(value => `"${String(value).replace(/"/g,'""')}"`).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lag-controller-${state.view}-${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function initials(name) {
  return name.replace(/^(Dr\.?|Dra\.?)\s*/i,"").split(/\s+/).filter(Boolean).slice(0,2).map(p => p[0]).join("").toUpperCase();
}

function shortName(name, max) {
  return name.length > max ? name.slice(0,max - 1) + "…" : name;
}

function compactCurrency(value) {
  const abs = Math.abs(Number(value));
  if (abs >= 1000000) return `R$ ${(value / 1000000).toFixed(1).replace(".",",")} mi`;
  if (abs >= 1000) return `R$ ${(value / 1000).toFixed(0)} mil`;
  return `R$ ${number.format(value)}`;
}

function formatPercent(value) {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}%`;
}

function hexAlpha(color, alpha) {
  if (!color.startsWith("#")) return color;
  const hex = color.replace("#","");
  const r = parseInt(hex.substring(0,2),16);
  const g = parseInt(hex.substring(2,4),16);
  const b = parseInt(hex.substring(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
