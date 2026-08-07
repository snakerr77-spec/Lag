(() => {
  "use strict";

  const STORAGE_KEY = "lag-medical-candidates-v2";
  const FILE_DB = "lag-candidate-files-v1";
  const FILE_STORE = "files";
  const API = window.LAG_API_CONFIG || { mode: "local", baseUrl: "" };
  const $ = id => document.getElementById(id);

  const initialCandidates = [
    { id: "c1", source: "demo", name: "Dra. Camila Rocha", specialty: "Cardiologia", crm: "CRM 215874", city: "Cerquilho", phone: "(15) 99700-1122", email: "camila@exemplo.com", availability: "Quartas e sextas", payment: "Por agenda", documents: "", experience: "Experiência em ecocardiografia.", notes: "Experiência em ecocardiografia.", status: "analise", createdAt: "2026-08-01T10:00:00" },
    { id: "c2", source: "demo", name: "Dr. Rafael Mendes", specialty: "Neurologia", crm: "CRM 198455", city: "Tatuí", phone: "(15) 99811-4477", email: "rafael@exemplo.com", availability: "Segundas à tarde", payment: "Por período", documents: "", experience: "Atuação em neurologia clínica.", notes: "Atuação em neurologia clínica.", status: "entrevista", createdAt: "2026-08-02T13:30:00" },
    { id: "c3", source: "demo", name: "Dra. Helena Costa", specialty: "Ultrassonografia", crm: "CRM 176904", city: "Itapeva", phone: "(15) 99622-8855", email: "helena@exemplo.com", availability: "Disponibilidade integral", payment: "A combinar", documents: "", experience: "", notes: "", status: "aprovado", createdAt: "2026-07-28T09:00:00" }
  ];

  let candidates = [];
  let currentViewerId = "";
  let currentResumeUrl = "";

  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const initials = name => String(name || "M").split(/\s+/).filter(part => !/^dr\.?a?$/i.test(part)).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const label = status => ({ novo: "Novo", analise: "Em análise", entrevista: "Entrevista", aprovado: "Aprovado", recusado: "Recusado" })[status] || status || "Novo";
  const formatDate = value => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";
  const formatBytes = bytes => {
    const value = Number(bytes || 0);
    if (!value) return "Tamanho não informado";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
  };

  function normalizeCandidate(candidate) {
    const createdAt = candidate.createdAt || candidate.createdAtISO || new Date().toISOString();
    return {
      id: String(candidate.id || `candidate-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`),
      source: candidate.source || "public-form",
      name: candidate.name || "Candidato sem nome",
      specialty: candidate.specialty || "Não informada",
      crm: candidate.crm || "Não informado",
      city: candidate.city === "Tatui" ? "Tatuí" : (candidate.city || "Não informada"),
      phone: candidate.phone || "",
      email: candidate.email || "",
      availability: candidate.availability || "",
      payment: candidate.payment || "",
      documents: candidate.documents || "",
      experience: candidate.experience || candidate.notes || "",
      notes: candidate.notes || candidate.experience || "",
      consent: candidate.consent !== false,
      status: candidate.status || "novo",
      createdAt,
      updatedAt: candidate.updatedAt || createdAt,
      resumeId: candidate.resumeId || candidate.resume?.id || "",
      resumeName: candidate.resumeName || candidate.resume?.name || "",
      resumeType: candidate.resumeType || candidate.resume?.type || "",
      resumeSize: Number(candidate.resumeSize || candidate.resume?.size || 0)
    };
  }

  function loadLocalCandidates() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (Array.isArray(stored)) return stored.map(normalizeCandidate);
    } catch (_) { /* usa demonstração */ }
    const seeded = initialCandidates.map(normalizeCandidate);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  function saveLocalCandidates() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
  }

  function apiUrl(path = "") {
    return `${String(API.baseUrl || "").replace(/\/$/, "")}/api/candidatosMedicos${path}`;
  }

  async function fetchCandidates() {
    if (API.mode !== "cloudflare") return loadLocalCandidates();
    const response = await fetch(apiUrl(), { credentials: "include" });
    if (!response.ok) throw new Error("Não foi possível carregar os candidatos do servidor.");
    const data = await response.json();
    return (data.candidatos || data.results || []).map(normalizeCandidate);
  }

  async function updateCandidateStatus(candidate, status) {
    candidate.status = status;
    candidate.updatedAt = new Date().toISOString();
    if (API.mode === "cloudflare") {
      const response = await fetch(apiUrl(`/${encodeURIComponent(candidate.id)}`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error("Não foi possível atualizar o status.");
    } else {
      saveLocalCandidates();
    }
  }

  async function deleteCandidate(candidate) {
    if (API.mode === "cloudflare") {
      const response = await fetch(apiUrl(`/${encodeURIComponent(candidate.id)}`), { method: "DELETE", credentials: "include" });
      if (!response.ok) throw new Error("Não foi possível excluir o candidato.");
    } else {
      candidates = candidates.filter(item => item.id !== candidate.id);
      saveLocalCandidates();
      if (candidate.resumeId) await deleteResume(candidate.resumeId);
    }
  }

  function openFileDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(FILE_DB, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(FILE_STORE)) request.result.createObjectStore(FILE_STORE, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function fileAction(mode, callback) {
    const db = await openFileDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(FILE_STORE, mode);
      const request = callback(transaction.objectStore(FILE_STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  }

  async function saveResume(id, file) {
    return fileAction("readwrite", store => store.put({ id, blob: file, name: file.name, type: file.type, size: file.size, savedAt: new Date().toISOString() }));
  }
  async function getResume(id) { try { return await fileAction("readonly", store => store.get(id)); } catch { return null; } }
  async function deleteResume(id) { try { return await fileAction("readwrite", store => store.delete(id)); } catch { return null; } }

  function filteredCandidates() {
    const term = $("candidateSearch").value.trim().toLowerCase();
    const status = $("candidateStatus").value;
    const city = $("candidateCity").value;
    return candidates.filter(candidate => {
      const haystack = `${candidate.name} ${candidate.crm} ${candidate.specialty} ${candidate.city} ${candidate.email}`.toLowerCase();
      return (!term || haystack.includes(term)) && (!status || candidate.status === status) && (!city || candidate.city === city);
    });
  }

  function render() {
    const rows = filteredCandidates();
    $("candidateTotal").textContent = candidates.length;
    $("candidateReview").textContent = candidates.filter(candidate => ["analise", "novo"].includes(candidate.status)).length;
    $("candidateInterview").textContent = candidates.filter(candidate => candidate.status === "entrevista").length;
    $("candidateApproved").textContent = candidates.filter(candidate => candidate.status === "aprovado").length;

    $("candidateList").innerHTML = rows.length ? rows.map(candidate => `
      <article class="candidate-row" data-id="${escapeHtml(candidate.id)}">
        <span class="candidate-avatar">${escapeHtml(initials(candidate.name))}</span>
        <div class="candidate-copy"><strong>${escapeHtml(candidate.name)}</strong><small>${escapeHtml(candidate.specialty)} • ${escapeHtml(candidate.crm)}</small></div>
        <div class="candidate-meta"><small><i class="fa-solid fa-location-dot"></i> ${escapeHtml(candidate.city)}</small><small><i class="fa-solid fa-phone"></i> ${escapeHtml(candidate.phone || "Sem telefone")}</small></div>
        <select class="candidate-status-select" data-status aria-label="Status de ${escapeHtml(candidate.name)}">
          ${["novo","analise","entrevista","aprovado","recusado"].map(status => `<option value="${status}" ${candidate.status === status ? "selected" : ""}>${label(status)}</option>`).join("")}
        </select>
        <div class="candidate-row-actions"><button title="Visualizar ficha completa" data-details><i class="fa-solid fa-eye"></i></button><button class="delete" title="Excluir candidato" data-delete><i class="fa-solid fa-trash"></i></button></div>
      </article>`).join("") : '<div class="candidate-empty"><i class="fa-solid fa-user-doctor"></i><p>Nenhum candidato encontrado.</p></div>';
  }

  async function openViewer(candidateId) {
    const candidate = candidates.find(item => item.id === candidateId);
    if (!candidate) return;
    currentViewerId = candidate.id;
    if (currentResumeUrl) URL.revokeObjectURL(currentResumeUrl);
    currentResumeUrl = "";

    $("viewerAvatar").textContent = initials(candidate.name);
    $("viewerSource").textContent = candidate.source === "public-form" ? "Ficha enviada pelo HTML público" : candidate.source === "internal" ? "Cadastro interno" : "Candidato de demonstração";
    $("candidateViewerTitle").textContent = candidate.name;
    $("viewerSubtitle").textContent = `${candidate.specialty} • ${candidate.crm}`;
    $("viewerStatus").value = candidate.status;
    $("viewerDate").textContent = formatDate(candidate.createdAt);
    $("viewerCity").textContent = candidate.city;

    const fields = [
      ["Nome completo", candidate.name], ["Telefone / WhatsApp", candidate.phone || "Não informado"],
      ["E-mail profissional", candidate.email || "Não informado"], ["CRM / UF", candidate.crm],
      ["Especialidade principal", candidate.specialty], ["Cidade de interesse", candidate.city],
      ["Disponibilidade", candidate.availability || "Não informada"], ["Valor / formato pretendido", candidate.payment || "Não informado"],
      ["Consentimento", candidate.consent ? "Confirmado" : "Não registrado"], ["Status", label(candidate.status)]
    ];
    $("viewerDataGrid").innerHTML = fields.map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
    $("viewerExperience").textContent = candidate.experience || candidate.notes || "Nenhuma experiência ou observação foi informada.";
    $("viewerRawData").textContent = JSON.stringify(candidate, null, 2);

    const link = $("viewerDocumentsLink");
    link.hidden = !candidate.documents;
    if (candidate.documents) link.href = candidate.documents;

    const resumeCard = $("viewerResumeCard");
    const resumePreview = $("viewerResumePreview");
    const noDocument = $("viewerNoDocument");
    resumeCard.hidden = true;
    resumePreview.hidden = true;
    resumePreview.removeAttribute("src");

    if (API.mode === "cloudflare" && candidate.resumeId) {
      const url = apiUrl(`/${encodeURIComponent(candidate.id)}/curriculo`);
      resumeCard.hidden = false;
      $("viewerResumeName").textContent = candidate.resumeName || "Currículo enviado";
      $("viewerResumeMeta").textContent = `${candidate.resumeType || "Documento"} • ${formatBytes(candidate.resumeSize)}`;
      $("viewerResumeDownload").onclick = () => window.open(url, "_blank", "noopener");
      if ((candidate.resumeType || "").includes("pdf")) {
        resumePreview.hidden = false;
        resumePreview.src = url;
      }
    } else if (candidate.resumeId) {
      const stored = await getResume(candidate.resumeId);
      if (stored?.blob) {
        currentResumeUrl = URL.createObjectURL(stored.blob);
        resumeCard.hidden = false;
        $("viewerResumeName").textContent = stored.name || candidate.resumeName || "Currículo enviado";
        $("viewerResumeMeta").textContent = `${stored.type || "Documento"} • ${formatBytes(stored.size)}`;
        $("viewerResumeDownload").onclick = () => {
          const anchor = document.createElement("a");
          anchor.href = currentResumeUrl;
          anchor.download = stored.name || "curriculo";
          anchor.click();
        };
        if ((stored.type || "").includes("pdf")) {
          resumePreview.hidden = false;
          resumePreview.src = currentResumeUrl;
        }
      }
    }
    noDocument.hidden = Boolean(candidate.documents || !resumeCard.hidden);
    $("candidateViewer").hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeViewer() {
    $("candidateViewer").hidden = true;
    document.body.style.overflow = "";
    currentViewerId = "";
    if (currentResumeUrl) URL.revokeObjectURL(currentResumeUrl);
    currentResumeUrl = "";
    $("viewerResumePreview").removeAttribute("src");
  }

  async function saveViewerStatus() {
    const candidate = candidates.find(item => item.id === currentViewerId);
    if (!candidate) return;
    const button = $("viewerSaveStatus");
    button.disabled = true;
    try {
      await updateCandidateStatus(candidate, $("viewerStatus").value);
      window.LAGUI?.toast?.("Status do candidato atualizado.");
      render();
      await openViewer(candidate.id);
    } catch (error) {
      window.LAGUI?.toast?.(error.message || "Não foi possível salvar.", "error");
    } finally {
      button.disabled = false;
    }
  }

  async function createInternalCandidate(event) {
    event.preventDefault();
    const file = $("candidateResume").files?.[0];
    if (file && file.size > 10 * 1024 * 1024) {
      window.LAGUI?.toast?.("O currículo deve ter no máximo 10 MB.", "error");
      return;
    }
    const id = `candidate-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const resumeId = file ? `resume-${id}` : "";
    const candidate = normalizeCandidate({
      id, source: "internal", name: $("candidateName").value.trim(), specialty: $("candidateSpecialty").value.trim(), crm: $("candidateCrm").value.trim(), city: $("candidateFormCity").value,
      phone: $("candidatePhone").value.trim(), email: $("candidateEmail").value.trim(), availability: $("candidateAvailability").value.trim(), payment: $("candidatePayment").value.trim(), documents: $("candidateDocuments").value.trim(), experience: $("candidateNotes").value.trim(), notes: $("candidateNotes").value.trim(), status: "novo", createdAt: new Date().toISOString(), resumeId, resumeName: file?.name || "", resumeType: file?.type || "", resumeSize: file?.size || 0
    });

    if (API.mode === "cloudflare") {
      const formData = new FormData();
      Object.entries(candidate).forEach(([key, value]) => formData.append(key, String(value ?? "")));
      if (file) formData.append("resume", file);
      const response = await fetch(apiUrl(), { method: "POST", credentials: "include", body: formData });
      if (!response.ok) throw new Error("Não foi possível cadastrar o candidato.");
      candidates = await fetchCandidates();
    } else {
      if (file) await saveResume(resumeId, file);
      candidates.unshift(candidate);
      saveLocalCandidates();
    }

    $("candidateModal").hidden = true;
    event.target.reset();
    render();
    window.LAGUI?.toast?.("Candidato adicionado com sucesso.");
  }

  async function handleListClick(event) {
    const row = event.target.closest(".candidate-row");
    if (!row) return;
    const candidate = candidates.find(item => item.id === row.dataset.id);
    if (!candidate) return;

    if (event.target.closest("[data-details]")) {
      await openViewer(candidate.id);
      return;
    }
    if (event.target.closest("[data-delete]")) {
      if (!window.confirm(`Excluir o cadastro de ${candidate.name}?`)) return;
      try {
        await deleteCandidate(candidate);
        render();
        window.LAGUI?.toast?.("Candidato excluído.");
      } catch (error) {
        window.LAGUI?.toast?.(error.message || "Não foi possível excluir.", "error");
      }
    }
  }

  async function init() {
    try {
      candidates = await fetchCandidates();
    } catch (error) {
      candidates = loadLocalCandidates();
      window.LAGUI?.toast?.("Servidor indisponível. Exibindo dados locais.", "error");
    }

    $("candidateSearch").addEventListener("input", render);
    $("candidateTopSearch").addEventListener("input", event => { $("candidateSearch").value = event.target.value; render(); });
    $("candidateStatus").addEventListener("change", render);
    $("candidateCity").addEventListener("change", render);
    $("candidateList").addEventListener("click", handleListClick);
    $("candidateList").addEventListener("change", async event => {
      const select = event.target.closest("[data-status]");
      if (!select) return;
      const candidate = candidates.find(item => item.id === select.closest(".candidate-row")?.dataset.id);
      if (!candidate) return;
      try { await updateCandidateStatus(candidate, select.value); render(); }
      catch (error) { window.LAGUI?.toast?.(error.message || "Não foi possível atualizar.", "error"); render(); }
    });

    $("newCandidate").addEventListener("click", () => { $("candidateModal").hidden = false; });
    document.querySelectorAll("[data-close-candidate]").forEach(button => button.addEventListener("click", () => { $("candidateModal").hidden = true; }));
    document.querySelectorAll("[data-close-viewer]").forEach(button => button.addEventListener("click", closeViewer));
    $("candidateForm").addEventListener("submit", event => createInternalCandidate(event).catch(error => window.LAGUI?.toast?.(error.message || "Erro ao salvar.", "error")));
    $("viewerSaveStatus").addEventListener("click", saveViewerStatus);
    document.addEventListener("keydown", event => { if (event.key === "Escape") { closeViewer(); $("candidateModal").hidden = true; } });
    window.addEventListener("storage", event => { if (event.key === STORAGE_KEY && API.mode !== "cloudflare") { candidates = loadLocalCandidates(); render(); } });
    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
