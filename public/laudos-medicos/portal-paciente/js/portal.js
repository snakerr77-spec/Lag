(() => {
  "use strict";

  const REPORT_KEYS = ["lag-medical-reports-v2", "lag-medical-reports-v1"];
  const CATEGORY_KEYS = ["lag-medical-report-categories-v2", "lag-medical-report-categories-v1"];
  const DB_NAME = "lag-medical-reports-files";
  const DB_STORE = "pdfs";
  const SESSION_KEY = "lag-patient-portal-session-v2";
  const ATTEMPTS_KEY = "lag-patient-login-attempts-v2";
  const TEST_PREFILL_KEY = "lag-patient-portal-test-v1";
  const SESSION_MS = 30 * 60 * 1000;

  const state = { exams: [], filtered: [], patient: null, viewerUrls: [] };
  const $ = id => document.getElementById(id);

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    if (location.protocol === "file:") {
      showServerRequired();
      return;
    }

    bindEvents();
    applyTestPrefill();
    restoreSession();
  }

  function bindEvents() {
    $("patientCpf")?.addEventListener("input", event => {
      event.target.value = formatCpf(event.target.value);
    });
    $("patientLoginForm")?.addEventListener("submit", login);
    $("logoutButton")?.addEventListener("click", logout);
    $("examSearch")?.addEventListener("input", applyFilters);
    $("cityFilter")?.addEventListener("change", applyFilters);
    $("categoryFilter")?.addEventListener("change", applyFilters);
    $("examGrid")?.addEventListener("click", handleExamAction);
    $("viewerClose")?.addEventListener("click", closeViewer);
    $("viewer")?.addEventListener("click", event => {
      if (event.target === $("viewer")) closeViewer();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeViewer();
    });
  }

  function showServerRequired() {
    const target = document.body;
    const serverUrl = "http://127.0.0.1:5500/laudos-medicos/portal-paciente/index.html";
    target.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#061426;color:#f4f8ff;font-family:Inter,Arial,sans-serif">
        <section style="width:min(620px,100%);padding:34px;border:1px solid #24415f;border-radius:24px;background:#0c2745;box-shadow:0 28px 80px rgba(0,0,0,.35)">
          <div style="width:60px;height:60px;display:grid;place-items:center;border-radius:18px;background:#169af1;font-size:25px">⚠</div>
          <h1 style="margin:22px 0 10px;font-size:30px">Abra o sistema pelo servidor local</h1>
          <p style="margin:0;color:#a9bfd8;line-height:1.7">O portal e a área de Laudos precisam estar no mesmo endereço para compartilhar os PDFs salvos no navegador. Não abra o arquivo HTML com duplo clique.</p>
          <ol style="margin:22px 0;color:#d9e8f7;line-height:1.8">
            <li>Volte à pasta principal do projeto.</li>
            <li>Execute <strong>INICIAR-SISTEMA.bat</strong>.</li>
            <li>Cadastre e libere o laudo usando a página aberta pelo sistema.</li>
          </ol>
          <a href="${serverUrl}" style="display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 20px;border-radius:12px;background:linear-gradient(135deg,#248cff,#1ecad3);color:#fff;text-decoration:none;font-weight:800">Tentar abrir o portal local</a>
        </section>
      </main>`;
  }

  function applyTestPrefill() {
    const prefill = readJson(TEST_PREFILL_KEY, null);
    if (!prefill || !prefill.cpf || !prefill.birthDate) return;
    localStorage.removeItem(TEST_PREFILL_KEY);
    $("patientCpf").value = formatCpf(prefill.cpf);
    $("patientBirth").value = normalizeDate(prefill.birthDate);
    showMessage(`Dados de teste preenchidos para ${prefill.patient || "o paciente"}. Clique em “Acessar meus exames”.`, "info");
  }

  function restoreSession() {
    const session = readSession();
    if (!session || session.expiresAt < Date.now()) {
      clearSession();
      return;
    }

    const reports = readReports();
    const exams = reports.filter(report => session.reportIds.includes(report.id) && isReleased(report));
    if (!exams.length) {
      clearSession();
      return;
    }

    state.patient = { name: exams[0].patient || "Paciente" };
    state.exams = enrichLocalExams(exams);
    showPortal();
  }

  async function login(event) {
    event.preventDefault();
    hideMessage();

    const cpf = formatCpf($("patientCpf").value);
    const cpfDigits = onlyDigits(cpf);
    const birthDate = normalizeDate($("patientBirth").value);

    if (cpfDigits.length !== 11 || !birthDate) {
      showMessage("Informe um CPF válido e a data de nascimento.");
      return;
    }

    setLoading(true);
    try {
      await localLogin(cpfDigits, birthDate);
    } catch (error) {
      showMessage(error?.message || "Não foi possível validar os dados informados.");
    } finally {
      setLoading(false);
    }
  }

  async function localLogin(cpfDigits, birthDate) {
    const attempts = readJson(ATTEMPTS_KEY, { count: 0, lockedUntil: 0 });
    if (Number(attempts.lockedUntil || 0) > Date.now()) {
      const seconds = Math.ceil((attempts.lockedUntil - Date.now()) / 1000);
      throw new Error(`Muitas tentativas. Aguarde ${seconds} segundos.`);
    }

    await sleep(250);
    const allReports = readReports();
    if (!allReports.length) {
      throw new Error("Nenhum laudo foi cadastrado neste navegador. Abra Laudos Médicos pelo INICIAR-SISTEMA.bat, cadastre um exame e libere-o para o portal.");
    }

    const byCpf = allReports.filter(report => reportCpf(report) === cpfDigits);
    if (!byCpf.length) return failedAttempt(attempts, "Não há laudos cadastrados para este CPF.");

    const byBirth = byCpf.filter(report => normalizeDate(reportBirthDate(report)) === birthDate);
    if (!byBirth.length) {
      const missingBirth = byCpf.some(report => !normalizeDate(reportBirthDate(report)));
      return failedAttempt(
        attempts,
        missingBirth
          ? "O laudo deste CPF ainda não possui data de nascimento. Edite o cadastro em Laudos Médicos antes de liberar."
          : "A data de nascimento não corresponde ao cadastro do laudo."
      );
    }

    const released = byBirth.filter(isReleased);
    if (!released.length) {
      return failedAttempt(attempts, "O exame existe, mas ainda não foi finalizado e liberado no portal.");
    }

    writeJson(ATTEMPTS_KEY, { count: 0, lockedUntil: 0 });
    const session = { reportIds: released.map(report => report.id), expiresAt: Date.now() + SESSION_MS };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    state.patient = { name: released[0].patient || "Paciente" };
    state.exams = enrichLocalExams(released);
    showPortal();
  }

  function failedAttempt(attempts, message) {
    const count = Number(attempts.count || 0) + 1;
    writeJson(
      ATTEMPTS_KEY,
      count >= 5
        ? { count: 0, lockedUntil: Date.now() + 60_000 }
        : { count, lockedUntil: 0 }
    );
    throw new Error(message);
  }

  function readReports() {
    const merged = [];
    const seen = new Set();
    for (const key of REPORT_KEYS) {
      const list = readJson(key, []);
      if (!Array.isArray(list)) continue;
      for (const raw of list) {
        const report = normalizeReport(raw);
        if (!report.id || seen.has(report.id)) continue;
        seen.add(report.id);
        merged.push(report);
      }
    }
    return merged;
  }

  function normalizeReport(raw) {
    return {
      ...raw,
      id: String(raw?.id || raw?.reportId || ""),
      patient: String(raw?.patient || raw?.patientName || raw?.nomePaciente || "Paciente"),
      cpf: formatCpf(raw?.cpf || raw?.patientCpf || raw?.cpfPaciente || ""),
      birthDate: normalizeDate(raw?.birthDate || raw?.patientBirthDate || raw?.dataNascimento || ""),
      examDate: normalizeDate(raw?.examDate || raw?.date || raw?.dataExame || ""),
      examType: String(raw?.examType || raw?.type || raw?.tipoExame || "Exame médico"),
      doctor: String(raw?.doctor || raw?.doctorName || raw?.medico || "Equipe médica"),
      city: String(raw?.city || raw?.cidade || "Unidade"),
      status: normalizeStatus(raw?.status),
      patientVisible: raw?.patientVisible ?? raw?.portalVisible ?? raw?.released ?? false,
      fileName: String(raw?.fileName || raw?.pdfName || raw?.arquivo || ""),
      images: Array.isArray(raw?.images) ? raw.images : []
    };
  }

  function reportCpf(report) {
    return onlyDigits(report?.cpf || report?.patientCpf || report?.cpfPaciente || "");
  }

  function reportBirthDate(report) {
    return report?.birthDate || report?.patientBirthDate || report?.dataNascimento || "";
  }

  function isReleased(report) {
    const status = normalizeStatus(report?.status);
    const visible = report?.patientVisible ?? report?.portalVisible ?? report?.released ?? false;
    return status === "finalizado" && visible === true;
  }

  function enrichLocalExams(reports) {
    const categories = readCategories();
    const byId = new Map(categories.map(category => [String(category.id), category.name]));
    return reports
      .map(report => ({
        ...report,
        categoryName: byId.get(String(report.categoryId || "")) || report.category || "Exame médico",
        imageCount: Array.isArray(report.images) ? report.images.length : 0,
        hasPdf: Boolean(report.fileName)
      }))
      .sort((a, b) => String(b.examDate || "").localeCompare(String(a.examDate || "")));
  }

  function readCategories() {
    const merged = [];
    const seen = new Set();
    for (const key of CATEGORY_KEYS) {
      const list = readJson(key, []);
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        const id = String(item?.id || "");
        if (!id || seen.has(id)) continue;
        seen.add(id);
        merged.push(item);
      }
    }
    return merged;
  }

  function showPortal() {
    $("loginView").hidden = true;
    $("portalView").hidden = false;
    $("patientName").textContent = firstName(state.patient?.name || "Paciente");
    $("patientSummary").textContent = "Seus exames finalizados e liberados pela clínica estão disponíveis neste computador.";
    populateFilters();
    applyFilters();
  }

  function populateFilters() {
    const cities = [...new Set(state.exams.map(exam => exam.city).filter(Boolean))].sort();
    const categories = [...new Set(state.exams.map(exam => exam.categoryName || exam.category).filter(Boolean))].sort();
    $("cityFilter").innerHTML = '<option value="">Todas as cidades</option>' + cities.map(city => `<option value="${escapeAttr(city)}">${escapeHtml(city)}</option>`).join("");
    $("categoryFilter").innerHTML = '<option value="">Todas as categorias</option>' + categories.map(category => `<option value="${escapeAttr(category)}">${escapeHtml(category)}</option>`).join("");
  }

  function applyFilters() {
    const term = normalizeText($("examSearch").value);
    const city = $("cityFilter").value;
    const category = $("categoryFilter").value;
    state.filtered = state.exams.filter(exam => {
      if (city && exam.city !== city) return false;
      const categoryName = exam.categoryName || exam.category || "";
      if (category && categoryName !== category) return false;
      return !term || normalizeText(`${exam.examType} ${exam.doctor} ${exam.city} ${categoryName} ${exam.fileName}`).includes(term);
    });
    render();
  }

  function render() {
    const exams = state.filtered;
    $("reportCount").textContent = String(state.exams.filter(exam => exam.hasPdf).length);
    $("imageCount").textContent = String(state.exams.reduce((sum, exam) => sum + Number(exam.imageCount || 0), 0));
    $("cityCount").textContent = String(new Set(state.exams.map(exam => exam.city)).size);

    if (!exams.length) {
      $("examGrid").innerHTML = '<div class="empty-exams"><div><i class="fa-solid fa-folder-open"></i><h2>Nenhum exame nesta busca</h2><p>Altere os filtros ou procure pelo nome do exame.</p></div></div>';
      return;
    }

    $("examGrid").innerHTML = exams.map(exam => {
      const category = exam.categoryName || exam.category || "Exame médico";
      const imageCount = Number(exam.imageCount || 0);
      const hasPdf = Boolean(exam.hasPdf);
      const filesLabel = [hasPdf ? "PDF" : "", imageCount ? `${imageCount} imagem(ns)` : ""].filter(Boolean).join(" + ") || "Sem arquivo";
      return `<article class="exam-card" data-exam-id="${escapeAttr(exam.id)}">
        <header class="exam-card-head"><div><span>Laudo pronto</span><h2>${escapeHtml(exam.examType || category)}</h2><p>${escapeHtml(category)} • ${escapeHtml(exam.city || "Unidade")}</p></div><i class="fa-solid ${imageCount ? "fa-images" : "fa-file-waveform"}"></i></header>
        <div class="exam-details"><div><small>Data</small><strong>${formatDate(exam.examDate)}</strong></div><div><small>Médico</small><strong>${escapeHtml(exam.doctor || "Equipe médica")}</strong></div><div><small>Arquivos</small><strong>${escapeHtml(filesLabel)}</strong></div></div>
        <div class="exam-actions">
          ${hasPdf ? '<button class="primary" type="button" data-action="open-pdf"><i class="fa-solid fa-file-pdf"></i> Visualizar laudo</button><button type="button" data-action="download-pdf"><i class="fa-solid fa-download"></i> Baixar PDF</button>' : ""}
          ${imageCount ? '<button type="button" data-action="open-images"><i class="fa-solid fa-images"></i> Ver imagens</button>' : ""}
        </div>
      </article>`;
    }).join("");
  }

  async function handleExamAction(event) {
    const button = event.target.closest("[data-action]");
    const card = event.target.closest("[data-exam-id]");
    if (!button || !card) return;
    const exam = state.exams.find(item => item.id === card.dataset.examId);
    if (!exam) return;
    if (button.dataset.action === "open-pdf") return openPdf(exam, false);
    if (button.dataset.action === "download-pdf") return openPdf(exam, true);
    if (button.dataset.action === "open-images") return openImages(exam);
  }

  async function openPdf(exam, download) {
    const record = await dbGet(exam.id);
    if (!record?.blob) {
      showPortalNotice("O cadastro foi encontrado, mas o PDF não está salvo neste navegador. Reenvie o arquivo no módulo Laudos Médicos.");
      return;
    }
    const url = URL.createObjectURL(record.blob);
    if (download) {
      const link = document.createElement("a");
      link.href = url;
      link.download = exam.fileName || "laudo.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return;
    }
    state.viewerUrls.push(url);
    $("viewerContent").innerHTML = `<iframe src="${escapeAttr(url)}" title="Laudo PDF"></iframe>`;
    $("viewer").hidden = false;
  }

  async function openImages(exam) {
    clearViewerUrls();
    const cards = [];
    for (const image of exam.images || []) {
      const record = await dbGet(`image:${exam.id}:${image.id}`);
      if (!record?.blob) continue;
      const url = URL.createObjectURL(record.blob);
      state.viewerUrls.push(url);
      cards.push(`<article><img src="${escapeAttr(url)}" alt="${escapeAttr(image.name || "Imagem do exame")}"><div><strong>${escapeHtml(image.name || "Imagem")}</strong><a href="${escapeAttr(url)}" download="${escapeAttr(image.name || "imagem.jpg")}"><i class="fa-solid fa-download"></i> Baixar</a></div></article>`);
    }
    if (!cards.length) {
      showPortalNotice("As imagens deste exame não estão salvas neste navegador.");
      return;
    }
    $("viewerContent").innerHTML = `<div class="viewer-gallery">${cards.join("")}</div>`;
    $("viewer").hidden = false;
  }

  function showPortalNotice(message) {
    window.alert(message);
  }

  function logout() {
    clearSession();
    state.exams = [];
    state.filtered = [];
    state.patient = null;
    $("portalView").hidden = true;
    $("loginView").hidden = false;
    $("patientLoginForm").reset();
    hideMessage();
  }

  function closeViewer() {
    $("viewer").hidden = true;
    $("viewerContent").innerHTML = "";
    clearViewerUrls();
  }

  function clearViewerUrls() {
    state.viewerUrls.forEach(url => URL.revokeObjectURL(url));
    state.viewerUrls = [];
  }

  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* sem ação */ }
  }

  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
  }

  function setLoading(active) {
    const button = $("loginButton");
    button.disabled = active;
    button.innerHTML = active
      ? '<i class="fa-solid fa-spinner fa-spin"></i> Validando acesso...'
      : '<i class="fa-solid fa-arrow-right-to-bracket"></i> Acessar meus exames';
  }

  function showMessage(message, type = "error") {
    const node = $("loginMessage");
    node.textContent = message;
    node.dataset.type = type;
    node.hidden = false;
  }

  function hideMessage() {
    const node = $("loginMessage");
    if (node) node.hidden = true;
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(DB_STORE)) {
          request.result.createObjectStore(DB_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function dbGet(id) {
    try {
      const db = await openDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, "readonly");
        const request = tx.objectStore(DB_STORE).get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
      });
    } catch {
      return null;
    }
  }

  function normalizeStatus(value) {
    const normalized = normalizeText(value);
    if (["finalizado", "finalizada", "pronto", "concluido", "concluida", "liberado", "liberada"].includes(normalized)) return "finalizado";
    if (["revisao", "em revisao", "analise", "em analise"].includes(normalized)) return "revisao";
    return "rascunho";
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
    const digits = onlyDigits(value).slice(0, 11);
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function formatDate(value) {
    const normalized = normalizeDate(value);
    if (!normalized) return "—";
    const [year, month, day] = normalized.split("-");
    return `${day}/${month}/${year}`;
  }

  function firstName(value) {
    return String(value || "Paciente").trim().split(/\s+/)[0] || "Paciente";
  }

  function normalizeText(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sem ação */ }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
