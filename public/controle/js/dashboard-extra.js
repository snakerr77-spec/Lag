(() => {
  "use strict";

  const DB_NAME = "lag-dashboard-spreadsheets";
  const STORE = "workbooks";
  const MANIFEST = window.LAG_DRIVE_MANIFEST || { cities: {} };
  const UI = window.LAGUI || {
    number: value => new Intl.NumberFormat("pt-BR").format(Number(value) || 0),
    toast: message => alert(message)
  };
  const $ = id => document.getElementById(id);

  const HEADER_ALIASES = {
    profissional: ["profissional", "medico", "médico", "dentista", "responsavel", "responsável", "nome"],
    faturamento: ["faturamento", "receita", "valor faturado", "valor total", "total faturado"],
    pagamento: ["pagamento", "repasse", "honorario", "honorários", "honorarios", "despesa"],
    ajCusto: ["aj. de custo", "aj de custo", "ajuda de custo"],
    insumos: ["insumos", "materiais", "material"],
    lucro: ["lucro final", "lucro", "resultado liquido", "resultado líquido", "resultado"],
    consultas: ["consultas", "consulta", "atendimentos", "atendimento"],
    procedimentos: ["procedimentos", "procedimento", "exames", "exame", "quantidade", "qtd"],
    agendas: ["agendas", "agenda", "vagas"],
    especialidade: ["especialidade", "categoria", "tipo de exame", "procedimento realizado"],
    tipo: ["tipo", "modulo", "módulo", "grupo"],
    meta: ["meta", "objetivo", "target"]
  };

  let currentRecord = null;
  let localRecordsCache = [];

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    if (!$("dashboardDataHub")) return;

    $("workbookUpload").multiple = true;
    $("workbookUpload").addEventListener("change", handleUpload);
    $("savedWorkbook").addEventListener("change", loadSelected);
    $("dashboardCity").addEventListener("change", handleCityChange);
    $("deleteWorkbook").addEventListener("click", deleteSelected);
    $("hubSheetSelect").addEventListener("change", renderSheetPreview);

    const settings = window.LAGSettings;
    const activeCity = settings?.getActiveCity?.() || settings?.getCurrentUser?.()?.unit || "Cerquilho";
    $("dashboardCity").value = activeCity;

    const role = settings?.normalizeRole?.(settings.getCurrentUser?.()?.role) || "";
    if (settings && !["admin", "administrador"].includes(role)) {
      $("dashboardCity").disabled = true;
    }

    await refreshLocalRecords();
    updateCityLabels();
    await populateSaved(window.LAG_DASHBOARD_ACTIVE_SOURCE?.id || "");
  }

  async function handleCityChange() {
    const settings = window.LAGSettings;
    const role = settings?.normalizeRole?.(settings.getCurrentUser?.()?.role) || "";
    if (["admin", "administrador"].includes(role)) {
      settings?.setActiveCity?.($("dashboardCity").value, false);
    }
    await populateSaved();
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) {
          request.result.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function dbGetAll() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }

  async function dbGet(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }

  async function dbPut(record) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => {
        db.close();
        resolve(record);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async function dbDelete(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async function refreshLocalRecords() {
    try {
      localRecordsCache = await dbGetAll();
    } catch (error) {
      console.error("Falha ao abrir as planilhas salvas:", error);
      localRecordsCache = [];
    }
  }

  function getDriveRecords(city) {
    return (MANIFEST.cities?.[city] || []).map(record => ({
      ...record,
      kind: "drive",
      createdAt: record.modifiedAt,
      city
    }));
  }

  function getLocalRecords(city) {
    return localRecordsCache
      .filter(record => record.city === city)
      .map(record => ({ ...record, kind: "local" }));
  }

  function getCityRecords(city) {
    return [...getDriveRecords(city), ...getLocalRecords(city)]
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }

  function updateCityLabels() {
    const select = $("dashboardCity");
    if (!select) return;
    Array.from(select.options).forEach(option => {
      const city = option.value || option.textContent.replace(/\s+—.*$/, "");
      const count = getCityRecords(city).length;
      option.textContent = count
        ? `${city} — ${count} ${count === 1 ? "planilha" : "planilhas"}`
        : `${city} — sem arquivo`;
      option.value = city;
    });
  }

  async function populateSaved(selectId = "") {
    const city = $("dashboardCity").value;
    const records = getCityRecords(city);

    $("savedWorkbook").innerHTML = '<option value="">Nenhuma planilha disponível</option>' + records.map(record => {
      const origin = record.kind === "drive" ? "Drive" : "Local";
      return `<option value="${escapeAttr(record.id)}">${origin} • ${escapeHtml(record.name)}</option>`;
    }).join("");

    if (selectId && records.some(record => record.id === selectId)) {
      $("savedWorkbook").value = selectId;
    } else if (records[0]) {
      $("savedWorkbook").value = records[0].id;
    }

    if ($("savedWorkbook").value) {
      await loadSelected();
    } else {
      clearAnalysis(city);
    }
  }

  async function handleUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    if (!window.XLSX) {
      UI.toast("A biblioteca de leitura da planilha não carregou.", "error");
      return;
    }

    const city = $("dashboardCity").value;
    let lastId = "";
    let imported = 0;

    try {
      for (const file of files) {
        if (!/\.(xlsx|xls|csv)$/i.test(file.name)) continue;
        const parsed = await parseWorkbook(file, {
          name: file.name,
          city,
          modifiedAt: new Date(file.lastModified || Date.now()).toISOString()
        });
        const record = {
          id: `workbook-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          city,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date(file.lastModified || Date.now()).toISOString(),
          size: file.size,
          blob: file,
          summary: parsed.summary,
          dashboardData: parsed.dashboardData,
          kind: "local"
        };
        await dbPut(record);
        lastId = record.id;
        imported += 1;
      }

      await refreshLocalRecords();
      updateCityLabels();
      if (imported) {
        UI.toast(`${imported} ${imported === 1 ? "planilha importada" : "planilhas importadas"} e analisada${imported === 1 ? "" : "s"}.`);
        await populateSaved(lastId);
      } else {
        UI.toast("Nenhum arquivo Excel ou CSV válido foi selecionado.", "error");
      }
    } catch (error) {
      console.error(error);
      UI.toast("Não foi possível ler uma das planilhas selecionadas.", "error");
    } finally {
      event.target.value = "";
    }
  }

  async function parseWorkbook(fileOrBlob, metadata = {}) {
    const buffer = await fileOrBlob.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true, raw: true });
    const sheets = workbook.SheetNames.map(name => ({
      name,
      matrix: XLSX.utils.sheet_to_json(workbook.Sheets[name], {
        header: 1,
        defval: "",
        raw: true,
        blankrows: false
      })
    }));
    return parseSheets(sheets, metadata);
  }

  function parseSheets(sheets, metadata = {}) {
    const extracted = extractDashboardRows(sheets);
    const summary = buildWorkbookSummary(sheets, extracted);
    const updated = metadata.modifiedAt ? new Date(metadata.modifiedAt) : new Date();
    const dashboardData = {
      resumo: {
        fonte: metadata.name || "Planilha importada",
        atualizadoEm: Number.isNaN(updated.getTime()) ? "—" : new Intl.DateTimeFormat("pt-BR").format(updated),
        exames: extracted.examesSummary,
        consultas: {
          ...extracted.consultasSummary,
          quantidadeLinhas: extracted.consultasLineQuantity
        },
        geral: extracted.geralSummary
      },
      exames: extracted.exames,
      consultas: extracted.consultas
    };

    summary.result = dashboardData.resumo.geral.faturamento;
    summary.goal = extracted.goal;
    return { summary, dashboardData };
  }

  function extractDashboardRows(sheets) {
    const exames = [];
    const consultas = [];
    let consultationTotalOverride = 0;
    let goal = 0;
    let hasGoal = false;

    sheets.forEach(sheet => {
      let section = "";
      let mapping = {};

      (sheet.matrix || []).forEach(row => {
        const values = Array.isArray(row) ? row : [];
        const recognized = values.slice(1).filter(value => headerKey(value)).length;
        const firstHeader = headerKey(values[0]);

        if (firstHeader === "profissional" || recognized >= 4) {
          section = cleanText(values[0]) || sheet.name || "Dados";
          mapping = { 0: "profissional" };
          values.slice(1).forEach((value, index) => {
            const key = headerKey(value);
            if (key) mapping[index + 1] = key;
          });
          return;
        }

        if (!Object.keys(mapping).length) return;

        const professional = cleanText(values[0]);
        if (!professional) {
          if (/consulta|atendimento/.test(normalize(section))) {
            Object.entries(mapping).forEach(([index, key]) => {
              if (key === "consultas") {
                const total = parseNumber(values[Number(index)]);
                if (Number.isFinite(total) && total > 0) consultationTotalOverride += Math.round(total);
              }
            });
          }
          return;
        }

        const normalizedProfessional = normalize(professional);
        if (normalizedProfessional.startsWith("total") || ["profissional", "procedimentos", "consultas atendidas"].includes(normalizedProfessional)) return;
        if (recognized >= 3) return;

        const data = {};
        Object.entries(mapping).forEach(([index, key]) => {
          data[key] = values[Number(index)];
        });

        const faturamento = numberOrZero(data.faturamento);
        const pagamento = numberOrZero(data.pagamento);
        const ajudaCusto = numberOrZero(data.ajCusto);
        const insumos = numberOrZero(data.insumos);
        const lucro = isFilled(data.lucro)
          ? numberOrZero(data.lucro)
          : faturamento - pagamento - ajudaCusto - insumos;
        const qtdConsultas = numberOrZero(data.consultas);
        const qtdProcedimentos = numberOrZero(data.procedimentos);
        const agendas = numberOrZero(data.agendas);
        const meta = numberOrZero(data.meta);
        if (meta) {
          goal += meta;
          hasGoal = true;
        }

        const typeText = `${section} ${cleanText(data.tipo)}`;
        const isConsultation = /consulta|atendimento/.test(normalize(typeText));
        const quantidade = isConsultation ? qtdConsultas : (qtdProcedimentos || qtdConsultas);

        if ([faturamento, pagamento, ajudaCusto, insumos, lucro, quantidade, agendas].every(value => Math.abs(value) < 0.000001)) return;

        const record = {
          tipo: isConsultation ? "Consultas" : "Exames",
          profissional: professional,
          especialidade: cleanText(data.especialidade) || titleCase(section),
          faturamento: roundMoney(faturamento),
          pagamento: roundMoney(pagamento),
          lucro: roundMoney(lucro),
          quantidade: smartNumber(quantidade),
          agendas: smartNumber(agendas)
        };

        (isConsultation ? consultas : exames).push(record);
      });
    });

    const examesSummary = summarizeRows(exames);
    const consultasLineQuantity = Math.round(consultas.reduce((sum, row) => sum + Number(row.quantidade || 0), 0));
    const consultasSummary = summarizeRows(consultas, consultationTotalOverride || null);
    const geralSummary = {
      faturamento: roundMoney(examesSummary.faturamento + consultasSummary.faturamento),
      pagamento: roundMoney(examesSummary.pagamento + consultasSummary.pagamento),
      lucro: roundMoney(examesSummary.lucro + consultasSummary.lucro),
      quantidade: Math.round(examesSummary.quantidade + consultasSummary.quantidade)
    };

    return {
      exames,
      consultas,
      examesSummary,
      consultasSummary,
      consultasLineQuantity,
      geralSummary,
      goal: hasGoal ? goal : null
    };
  }

  function buildWorkbookSummary(sheets, extracted) {
    const summary = {
      sheets: [],
      totalRows: 0,
      totalColumns: 0,
      pending: 0,
      alerts: 0,
      goal: null,
      result: null,
      numericTotals: {}
    };

    sheets.forEach(sheet => {
      const matrix = (sheet.matrix || []).filter(row => Array.isArray(row) && row.some(value => isFilled(value)));
      const headerIndex = findBestHeaderRow(matrix);
      const header = matrix[headerIndex] || [];
      const maxColumns = Math.max(1, ...matrix.map(row => row.length));
      const columns = makeUniqueColumns(Array.from({ length: maxColumns }, (_, index) => cleanText(header[index]) || `Coluna ${index + 1}`));
      const previewRows = matrix.slice(Math.min(headerIndex + 1, matrix.length), Math.min(headerIndex + 21, matrix.length));
      const preview = previewRows.map(row => Object.fromEntries(columns.map((column, index) => [column, row[index] ?? ""])));
      const numeric = [];
      let pending = 0;
      let alerts = 0;

      matrix.forEach((row, rowIndex) => {
        row.forEach((value, columnIndex) => {
          const text = normalize(value);
          if (text.includes("pendente") || text.includes("aguardando") || text.includes("nao realizado")) pending += 1;
          if (String(value || "").trim().startsWith("#")) alerts += 1;
          const number = parseNumber(value);
          if (Number.isFinite(number) && number < 0) alerts += 1;
          if (rowIndex !== headerIndex && Number.isFinite(number) && isFilled(value)) {
            const column = columns[columnIndex] || `Coluna ${columnIndex + 1}`;
            summary.numericTotals[column] = (summary.numericTotals[column] || 0) + number;
          }
        });
      });

      columns.forEach(column => {
        const sum = summary.numericTotals[column];
        if (Number.isFinite(sum)) numeric.push({ column, sum: roundMoney(sum) });
      });

      const rows = Math.max(0, matrix.length - 1);
      summary.sheets.push({
        name: sheet.name,
        rows,
        columns,
        numeric,
        pending,
        alerts,
        preview
      });
      summary.totalRows += rows;
      summary.totalColumns += columns.length;
      summary.pending += pending;
      summary.alerts += alerts;
    });

    if (!extracted.exames.length && !extracted.consultas.length && summary.totalRows) {
      summary.alerts += 1;
    }
    return summary;
  }

  function findBestHeaderRow(matrix) {
    let bestIndex = 0;
    let bestScore = -1;
    matrix.slice(0, 30).forEach((row, index) => {
      const known = row.filter(value => headerKey(value)).length;
      const filled = row.filter(value => isFilled(value)).length;
      const textCells = row.filter(value => isFilled(value) && !Number.isFinite(parseNumber(value))).length;
      const score = known * 20 + Math.min(filled, 12) + textCells * 0.25;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  async function loadSelected() {
    const id = $("savedWorkbook").value;
    if (!id) {
      clearAnalysis($("dashboardCity").value);
      return;
    }

    const driveRecord = Object.values(MANIFEST.cities || {}).flat().find(record => record.id === id);
    if (driveRecord) {
      currentRecord = { ...driveRecord, kind: "drive", createdAt: driveRecord.modifiedAt };
      renderRecord();
      return;
    }

    const localRecord = await dbGet(id);
    if (!localRecord) {
      clearAnalysis($("dashboardCity").value);
      return;
    }

    currentRecord = { ...localRecord, kind: "local" };
    try {
      if (!currentRecord.summary || !currentRecord.dashboardData) {
        const parsed = await parseWorkbook(currentRecord.blob, {
          name: currentRecord.name,
          city: currentRecord.city,
          modifiedAt: currentRecord.modifiedAt || currentRecord.createdAt
        });
        currentRecord.summary = parsed.summary;
        currentRecord.dashboardData = parsed.dashboardData;
        await dbPut(currentRecord);
        await refreshLocalRecords();
      }
      renderRecord();
    } catch (error) {
      console.error(error);
      clearAnalysis($("dashboardCity").value);
      UI.toast("A planilha salva não pôde ser reaberta.", "error");
    }
  }

  function renderRecord() {
    const summary = currentRecord.summary;
    $("hubEmpty").hidden = true;
    $("hubAnalysis").hidden = false;
    $("hubWorkbookName").textContent = currentRecord.name;
    $("hubWorkbookSummary").textContent = `${summary.sheets.length} ${summary.sheets.length === 1 ? "aba" : "abas"}, ${UI.number(summary.totalRows)} linhas e ${UI.number(summary.totalColumns)} colunas identificadas.`;
    $("hubAlerts").textContent = UI.number(summary.alerts);
    $("hubPending").textContent = UI.number(summary.pending);
    $("hubRows").textContent = UI.number(summary.totalRows);
    $("hubSheets").textContent = `${summary.sheets.length} ${summary.sheets.length === 1 ? "aba analisada" : "abas analisadas"}`;

    if (summary.goal) {
      const percentage = Math.round((summary.result || 0) / summary.goal * 100);
      $("hubGoal").textContent = `${percentage}%`;
      $("hubGoalMeta").textContent = `Resultado ${formatMoney(summary.result)} de ${formatMoney(summary.goal)}`;
    } else {
      $("hubGoal").textContent = "—";
      $("hubGoalMeta").textContent = "nenhuma meta encontrada na planilha";
    }

    $("hubSheetSelect").innerHTML = summary.sheets.map(sheet => `<option value="${escapeAttr(sheet.name)}">${escapeHtml(sheet.name)}</option>`).join("");
    const normalizedRows = currentRecord.dashboardData.exames.length + currentRecord.dashboardData.consultas.length;
    const insights = [
      `${summary.sheets.length} ${summary.sheets.length === 1 ? "aba detectada" : "abas detectadas"}`,
      `${summary.totalRows} linhas lidas`,
      `${Object.keys(summary.numericTotals).length} colunas numéricas`,
      `${normalizedRows} registros clínicos reconhecidos`,
      currentRecord.kind === "drive" ? "Origem: pasta Google Drive" : "Origem: upload local"
    ];
    $("hubInsights").innerHTML = insights.map(text => `<span>${escapeHtml(text)}</span>`).join("");

    $("deleteWorkbook").disabled = currentRecord.kind === "drive";
    $("deleteWorkbook").title = currentRecord.kind === "drive"
      ? "Arquivos incorporados do Drive não podem ser excluídos por esta tela"
      : "Excluir planilha selecionada";

    window.LAGDashboard?.setData?.(currentRecord.dashboardData);
    publishGoalSnapshot(summary);
    renderSheetPreview();
  }

  function publishGoalSnapshot(summary) {
    const selectedCity = $("dashboardCity")?.value || currentRecord?.city || "Cerquilho";
    let snapshot = {};
    try { snapshot = JSON.parse(localStorage.getItem("lag-goal-snapshot-v1") || "{}"); } catch { snapshot = {}; }
    snapshot.units = snapshot.units && typeof snapshot.units === "object" ? snapshot.units : {};
    const previous = snapshot.units[selectedCity] || snapshot.units[selectedCity === "Tatui" ? "Tatuí" : selectedCity] || {};
    snapshot.units[selectedCity] = {
      current: Number(summary?.result || currentRecord?.dashboardData?.resumo?.geral?.faturamento || 0),
      goal: Number(summary?.goal || previous.goal || 0),
      pending: Number(summary?.pending || previous.pending || 0),
      source: currentRecord?.name || "Planilha",
      updatedAt: currentRecord?.modifiedAt || currentRecord?.createdAt || new Date().toISOString()
    };
    snapshot.updatedAt = currentRecord?.modifiedAt || currentRecord?.createdAt || new Date().toISOString();
    localStorage.setItem("lag-goal-snapshot-v1", JSON.stringify(snapshot));
    window.dispatchEvent(new CustomEvent("lag:notifications-changed"));
  }

  function renderSheetPreview() {
    if (!currentRecord) return;
    const sheet = currentRecord.summary.sheets.find(item => item.name === $("hubSheetSelect").value) || currentRecord.summary.sheets[0];
    if (!sheet) return;
    $("hubPreviewHead").innerHTML = `<tr>${sheet.columns.map(column => `<th>${escapeHtml(column)}</th>`).join("")}</tr>`;
    $("hubPreviewBody").innerHTML = sheet.preview.map(row => `<tr>${sheet.columns.map(column => `<td>${escapeHtml(formatCell(row[column]))}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${Math.max(sheet.columns.length, 1)}">Esta aba não possui registros.</td></tr>`;
  }

  async function deleteSelected() {
    const id = $("savedWorkbook").value;
    if (!id) {
      UI.toast("Selecione uma planilha para excluir.", "error");
      return;
    }
    if (currentRecord?.kind === "drive") {
      UI.toast("Este arquivo veio da pasta do Google Drive e está incorporado ao projeto.", "error");
      return;
    }
    if (!confirm("Excluir esta planilha salva do navegador?")) return;

    await dbDelete(id);
    currentRecord = null;
    await refreshLocalRecords();
    updateCityLabels();
    await populateSaved();
    UI.toast("Planilha removida.");
  }

  function clearAnalysis(city) {
    currentRecord = null;
    $("hubAnalysis").hidden = true;
    $("hubEmpty").hidden = false;
    $("hubEmpty").innerHTML = `<i class="fa-solid fa-folder-open"></i><strong>Nenhuma planilha encontrada para ${escapeHtml(city)}</strong><span>A pasta desta cidade está vazia. O dashboard não carregará dados fictícios.</span>`;
    $("hubAlerts").textContent = "0";
    $("hubGoal").textContent = "—";
    $("hubGoalMeta").textContent = "sem planilha cadastrada";
    $("hubPending").textContent = "0";
    $("hubRows").textContent = "0";
    $("hubSheets").textContent = "0 abas analisadas";
    $("deleteWorkbook").disabled = true;
    window.LAGDashboard?.setData?.(emptyDashboardData(city));
  }

  function emptyDashboardData(city) {
    const empty = { faturamento: 0, pagamento: 0, lucro: 0, quantidade: 0 };
    return {
      resumo: {
        fonte: `Nenhuma planilha encontrada para ${city}`,
        atualizadoEm: "—",
        exames: { ...empty },
        consultas: { ...empty, quantidadeLinhas: 0 },
        geral: { ...empty }
      },
      exames: [],
      consultas: []
    };
  }

  function summarizeRows(rows, quantityOverride = null) {
    const summary = rows.reduce((acc, row) => {
      acc.faturamento += Number(row.faturamento) || 0;
      acc.pagamento += Number(row.pagamento) || 0;
      acc.lucro += Number(row.lucro) || 0;
      acc.quantidade += Number(row.quantidade) || 0;
      return acc;
    }, { faturamento: 0, pagamento: 0, lucro: 0, quantidade: 0 });

    return {
      faturamento: roundMoney(summary.faturamento),
      pagamento: roundMoney(summary.pagamento),
      lucro: roundMoney(summary.lucro),
      quantidade: Math.round(quantityOverride || summary.quantidade)
    };
  }

  function headerKey(value) {
    const text = normalize(value);
    if (!text) return null;
    for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.some(alias => normalize(alias) === text)) return key;
    }
    return null;
  }

  function makeUniqueColumns(columns) {
    const counts = new Map();
    return columns.map(column => {
      const count = (counts.get(column) || 0) + 1;
      counts.set(column, count);
      return count === 1 ? column : `${column} (${count})`;
    });
  }

  function normalize(value) {
    return String(value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function titleCase(value) {
    return cleanText(value).toLowerCase().replace(/(^|\s)\S/g, letter => letter.toUpperCase());
  }

  function parseNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
    const text = String(value ?? "").trim();
    if (!text || text.startsWith("#")) return NaN;
    let cleaned = text.replace(/R\$|%|\s/g, "");
    if (cleaned.includes(",")) cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    cleaned = cleaned.replace(/[^0-9.-]/g, "");
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : NaN;
  }

  function numberOrZero(value) {
    const number = parseNumber(value);
    return Number.isFinite(number) ? number : 0;
  }

  function isFilled(value) {
    return value !== null && value !== undefined && String(value).trim() !== "";
  }

  function roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function smartNumber(value) {
    const number = Number(value) || 0;
    return Number.isInteger(number) ? number : roundMoney(number);
  }

  function formatCell(value) {
    if (value instanceof Date) return new Intl.DateTimeFormat("pt-BR").format(value);
    if (typeof value === "number") return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
    return String(value ?? "");
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
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
