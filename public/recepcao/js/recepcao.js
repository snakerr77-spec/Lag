(() => {
  "use strict";

  const STORE_KEY = "lag-reception-queue-v1";
  const STATUS = {
    WAITING: "waiting",
    IN_SERVICE: "in-service",
    ATTENDED: "attended"
  };

  const state = {
    records: [],
    view: "queue",
    doctor: "",
    search: "",
    timer: 0
  };

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const els = {
    queueList: $("#queueList"),
    queueEmpty: $("#queueEmpty"),
    queueCaption: $("#queueCaption"),
    search: $("#queueSearch"),
    doctorFilter: $("#doctorFilter"),
    waitingCount: $("#waitingCount"),
    servingCount: $("#servingCount"),
    doneCount: $("#doneCount"),
    averageTime: $("#averageTime"),
    registrationModal: $("#registrationModal"),
    registrationForm: $("#registrationForm"),
    consultationModal: $("#consultationModal"),
    consultationForm: $("#consultationForm"),
    examDetailsBlock: $("#examDetailsBlock"),
    toastRegion: $("#toastRegion")
  };

  function safeJSON(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function readRecords() {
    const data = safeJSON(localStorage.getItem(STORE_KEY), []);
    return Array.isArray(data) ? data : [];
  }

  function writeRecords() {
    localStorage.setItem(STORE_KEY, JSON.stringify(state.records));
  }

  function uid(prefix = "patient") {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function currentCity() {
    const settings = window.LAGSettings;
    const user = settings?.getCurrentUser?.() || {};
    return settings?.getActiveCity?.() || user.unit || localStorage.getItem("lag-active-city") || "Cerquilho";
  }

  function currentUser() {
    return window.LAGSettings?.getCurrentUser?.() || { name: "Usuário", role: "colaborador" };
  }

  function todayKey(dateValue = Date.now()) {
    const date = new Date(dateValue);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function isToday(value) {
    return value && todayKey(value) === todayKey();
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
  }

  function formatBirth(value) {
    if (!value) return "—";
    const [year, month, day] = value.split("-");
    return year && month && day ? `${day}/${month}/${year}` : value;
  }

  function ageFromBirth(value) {
    if (!value) return "";
    const birth = new Date(`${value}T12:00:00`);
    if (Number.isNaN(birth.getTime())) return "";
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const month = now.getMonth() - birth.getMonth();
    if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age -= 1;
    return age >= 0 ? `${age} anos` : "";
  }

  function durationMs(record, now = Date.now()) {
    if (!record.calledAt) return 0;
    const end = record.finishedAt || now;
    return Math.max(0, new Date(end).getTime() - new Date(record.calledAt).getTime());
  }

  function formatDuration(ms, includeHours = true) {
    const totalSeconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (includeHours) return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function maskCpf(value) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function maskPhone(value) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  }

  function maskCep(value) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
    return digits.replace(/(\d{5})(\d)/, "$1-$2");
  }

  function receptionAddressPayload() {
    return {
      cep: maskCep($("#patientCep")?.value || ""),
      street: $("#patientStreet")?.value.trim() || "",
      number: $("#patientHouseNumber")?.value.trim() || "",
      neighborhood: $("#patientNeighborhood")?.value.trim() || "",
      complement: $("#patientComplement")?.value.trim() || "",
      city: $("#patientAddressCity")?.value.trim() || "",
      state: $("#patientAddressState")?.value.trim().toUpperCase() || ""
    };
  }

  async function lookupReceptionCep() {
    const input = $("#patientCep");
    const status = $("#receptionCepStatus");
    if (!input || !status) return;
    const cep = String(input.value || "").replace(/\D/g, "");
    status.className = "reception-cep-status";
    if (!cep) {
      status.textContent = "Digite o CEP para preencher o endereço.";
      return;
    }
    if (cep.length !== 8) {
      status.classList.add("error");
      status.textContent = "Informe um CEP válido com 8 números.";
      return;
    }
    status.classList.add("loading");
    status.textContent = "Consultando CEP...";
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) throw new Error("Falha na consulta");
      const data = await response.json();
      if (data.erro) throw new Error("CEP não encontrado");
      $("#patientStreet").value = data.logradouro || "";
      $("#patientNeighborhood").value = data.bairro || "";
      $("#patientAddressCity").value = data.localidade || "";
      $("#patientAddressState").value = data.uf || "";
      if (data.complemento && !$("#patientComplement").value) $("#patientComplement").value = data.complemento;
      status.className = "reception-cep-status success";
      status.textContent = "Endereço preenchido. Informe o número da residência.";
      $("#patientHouseNumber")?.focus();
    } catch (error) {
      status.className = "reception-cep-status error";
      status.textContent = error.message === "CEP não encontrado" ? "CEP não encontrado." : "Não foi possível consultar o CEP agora.";
    }
  }

  function showToast(title, message = "") {
    if (!els.toastRegion) return;
    const toast = document.createElement("div");
    toast.className = "reception-toast";
    toast.innerHTML = `<i class="fa-solid fa-circle-check"></i><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(message)}</small></div>`;
    els.toastRegion.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3600);
  }

  function openModal(modal) {
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    if (els.registrationModal.hidden && els.consultationModal.hidden) document.body.style.overflow = "";
  }

  function recordsForCurrentCity() {
    const city = currentCity();
    return state.records.filter(record => city === "Todas as cidades" || record.city === city);
  }

  function filteredRecords() {
    const query = normalize(state.search);
    return recordsForCurrentCity()
      .filter(record => state.view === "queue" || record.status === state.view)
      .filter(record => !state.doctor || record.doctor === state.doctor)
      .filter(record => {
        if (!query) return true;
        return [record.name, record.cpf, record.phone, record.doctor, record.payment].some(value => normalize(value).includes(query));
      })
      .sort((a, b) => {
        const rank = { [STATUS.IN_SERVICE]: 0, [STATUS.WAITING]: 1, [STATUS.ATTENDED]: 2 };
        if ((rank[a.status] ?? 9) !== (rank[b.status] ?? 9)) return (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
        if (a.status === STATUS.ATTENDED) return new Date(b.finishedAt || b.createdAt) - new Date(a.finishedAt || a.createdAt);
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
  }

  function updateDoctorOptions() {
    const currentValue = els.doctorFilter.value;
    const doctors = [...new Set(recordsForCurrentCity().map(record => record.doctor).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    els.doctorFilter.innerHTML = `<option value="">Todos os médicos</option>${doctors.map(doctor => `<option value="${escapeHtml(doctor)}">${escapeHtml(doctor)}</option>`).join("")}`;
    els.doctorFilter.value = doctors.includes(currentValue) ? currentValue : "";
    state.doctor = els.doctorFilter.value;
  }

  function statusLabel(status) {
    if (status === STATUS.IN_SERVICE) return "Em atendimento";
    if (status === STATUS.ATTENDED) return "Atendido";
    return "Aguardando";
  }

  function statusIcon(status) {
    if (status === STATUS.IN_SERVICE) return "fa-stethoscope";
    if (status === STATUS.ATTENDED) return "fa-circle-check";
    return "fa-clock";
  }

  function cardActions(record) {
    if (record.status === STATUS.WAITING) {
      return `<button class="call" type="button" data-action="call" data-id="${record.id}"><i class="fa-solid fa-bullhorn"></i> Chamar paciente</button>`;
    }
    if (record.status === STATUS.IN_SERVICE) {
      return `<button type="button" data-action="return" data-id="${record.id}"><i class="fa-solid fa-arrow-rotate-left"></i> Voltar à fila</button><button class="finish" type="button" data-action="consult" data-id="${record.id}"><i class="fa-solid fa-notes-medical"></i> Abrir atendimento</button>`;
    }
    const print = record.consultation?.examRequested === "yes" && record.consultation?.exams
      ? `<button class="print" type="button" data-action="print" data-id="${record.id}"><i class="fa-solid fa-print"></i> Pedido de exame</button>`
      : "";
    return `${print}<button type="button" data-action="view" data-id="${record.id}"><i class="fa-solid fa-eye"></i> Ver atendimento</button>`;
  }

  function renderQueue() {
    const records = filteredRecords();
    const waitingOrder = recordsForCurrentCity().filter(record => record.status === STATUS.WAITING).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    els.queueList.innerHTML = records.map(record => {
      const position = record.status === STATUS.WAITING ? waitingOrder.findIndex(item => item.id === record.id) + 1 : record.status === STATUS.IN_SERVICE ? "•" : "✓";
      const timeTitle = record.status === STATUS.WAITING ? "Entrada na fila" : record.status === STATUS.IN_SERVICE ? "Tempo em atendimento" : "Duração final";
      const timeValue = record.status === STATUS.WAITING ? formatDate(record.createdAt) : formatDuration(durationMs(record));
      return `
        <article class="queue-card" data-status="${record.status}" data-id="${record.id}">
          <span class="queue-position">${position}</span>
          <div class="patient-identity">
            <strong>${escapeHtml(record.name)}</strong>
            <small>${escapeHtml(record.cpf)} • ${escapeHtml(record.phone)}</small>
            <div class="patient-tags"><span>${escapeHtml(record.payment)}</span><span>${escapeHtml(formatBirth(record.birth))}${ageFromBirth(record.birth) ? ` • ${escapeHtml(ageFromBirth(record.birth))}` : ""}</span></div>
          </div>
          <div class="queue-doctor"><small>Médico responsável</small><strong>${escapeHtml(record.doctor)}</strong><span class="status-badge ${record.status}"><i class="fa-solid ${statusIcon(record.status)}"></i> ${statusLabel(record.status)}</span></div>
          <div class="queue-time"><small>${timeTitle}</small><strong data-live-time="${record.id}">${timeValue}</strong></div>
          <div class="queue-actions">${cardActions(record)}</div>
          ${record.status !== STATUS.WAITING ? `<div class="attendance-duration"><span><i class="fa-solid fa-stopwatch"></i> Tempo total do atendimento</span><strong data-live-time="${record.id}">${timeValue}</strong></div>` : ""}
        </article>`;
    }).join("");

    els.queueEmpty.hidden = records.length > 0;
    els.queueList.hidden = records.length === 0;
    const city = currentCity();
    els.queueCaption.textContent = `${records.length} atendimento(s) exibido(s) em ${city}.`;
    updateStats();
  }

  function updateStats() {
    const records = recordsForCurrentCity();
    const waiting = records.filter(record => record.status === STATUS.WAITING);
    const serving = records.filter(record => record.status === STATUS.IN_SERVICE);
    const doneToday = records.filter(record => record.status === STATUS.ATTENDED && isToday(record.finishedAt));
    const durations = doneToday.map(record => durationMs(record)).filter(value => value > 0);
    const average = durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : 0;

    els.waitingCount.textContent = waiting.length;
    els.servingCount.textContent = serving.length;
    els.doneCount.textContent = doneToday.length;
    els.averageTime.textContent = formatDuration(average, false);
  }

  function updateLiveTimes() {
    const now = Date.now();
    state.records.filter(record => record.status === STATUS.IN_SERVICE).forEach(record => {
      document.querySelectorAll(`[data-live-time="${CSS.escape(record.id)}"]`).forEach(node => {
        node.textContent = formatDuration(durationMs(record, now));
      });
    });
    const id = $("#consultationPatientId")?.value;
    if (id && !els.consultationModal.hidden) {
      const record = state.records.find(item => item.id === id);
      if (record) $("#consultationTimer").textContent = formatDuration(durationMs(record, now));
    }
  }

  function saveAndRender(message) {
    writeRecords();
    updateDoctorOptions();
    renderQueue();
    if (message) showToast(message.title, message.detail);
  }

  function registerPatient(event) {
    event.preventDefault();
    const record = {
      id: uid(),
      city: currentCity() === "Todas as cidades" ? (currentUser().unit || "Cerquilho") : currentCity(),
      name: $("#patientName").value.trim(),
      cpf: maskCpf($("#patientCpf").value),
      birth: $("#patientBirth").value,
      phone: maskPhone($("#patientPhone").value),
      address: receptionAddressPayload(),
      payment: $("#patientPayment").value,
      doctor: $("#patientDoctor").value.trim(),
      receptionNote: $("#receptionNote").value.trim(),
      status: STATUS.WAITING,
      createdAt: new Date().toISOString(),
      calledAt: null,
      finishedAt: null,
      createdBy: currentUser().name || "Usuário",
      consultation: {
        symptoms: "",
        anamnesis: "",
        prescription: "",
        examRequested: "no",
        exams: "",
        guidance: "",
        updatedAt: null,
        professional: ""
      }
    };

    if (state.records.some(item => item.status !== STATUS.ATTENDED && item.cpf.replace(/\D/g, "") === record.cpf.replace(/\D/g, "") && item.city === record.city)) {
      showToast("Paciente já está na fila", "Existe um atendimento aberto para este CPF nesta unidade.");
      return;
    }

    state.records.push(record);
    els.registrationForm.reset();
    closeModal(els.registrationModal);
    saveAndRender({ title: "Paciente enviado para a fila", detail: `${record.name} foi encaminhado para ${record.doctor}.` });
  }

  function callPatient(record) {
    record.status = STATUS.IN_SERVICE;
    record.calledAt = new Date().toISOString();
    record.finishedAt = null;
    record.consultation = record.consultation || {};
    saveAndRender({ title: "Paciente chamado", detail: `${record.name} agora está em atendimento com ${record.doctor}.` });
  }

  function returnToQueue(record) {
    record.status = STATUS.WAITING;
    record.calledAt = null;
    record.finishedAt = null;
    saveAndRender({ title: "Paciente devolvido à fila", detail: `${record.name} voltou para o status aguardando.` });
  }

  function fillConsultation(record, readOnly = false) {
    $("#consultationPatientId").value = record.id;
    $("#consultationPatientName").textContent = record.name;
    $("#consultationPatientMeta").textContent = `${record.cpf} • ${formatBirth(record.birth)} • ${record.doctor}`;
    $("#consultationSymptoms").value = record.consultation?.symptoms || "";
    $("#consultationAnamnesis").value = record.consultation?.anamnesis || "";
    $("#consultationPrescription").value = record.consultation?.prescription || "";
    $("#consultationExams").value = record.consultation?.exams || "";
    $("#consultationGuidance").value = record.consultation?.guidance || "";
    $("#printExamAfterFinish").checked = false;

    const examValue = record.consultation?.examRequested === "yes" ? "yes" : "no";
    const radio = document.querySelector(`input[name="examRequested"][value="${examValue}"]`);
    if (radio) radio.checked = true;
    els.examDetailsBlock.hidden = examValue !== "yes";
    $("#consultationTimer").textContent = formatDuration(durationMs(record));

    $$("#consultationForm textarea, #consultationForm input[name='examRequested'], #printExamAfterFinish").forEach(field => {
      field.disabled = readOnly;
    });
    $("#saveConsultationDraft").hidden = readOnly;
    const submit = els.consultationForm.querySelector("button[type='submit']");
    submit.hidden = readOnly;
    openModal(els.consultationModal);
  }

  function consultationPayload() {
    return {
      symptoms: $("#consultationSymptoms").value.trim(),
      anamnesis: $("#consultationAnamnesis").value.trim(),
      prescription: $("#consultationPrescription").value.trim(),
      examRequested: document.querySelector("input[name='examRequested']:checked")?.value || "no",
      exams: $("#consultationExams").value.trim(),
      guidance: $("#consultationGuidance").value.trim(),
      updatedAt: new Date().toISOString(),
      professional: currentUser().name || "Usuário"
    };
  }

  function saveDraft() {
    const id = $("#consultationPatientId").value;
    const record = state.records.find(item => item.id === id);
    if (!record) return;
    record.consultation = consultationPayload();
    writeRecords();
    renderQueue();
    showToast("Rascunho salvo", `As informações clínicas de ${record.name} foram salvas.`);
  }

  function finalizeConsultation(event) {
    event.preventDefault();
    const id = $("#consultationPatientId").value;
    const record = state.records.find(item => item.id === id);
    if (!record) return;

    const payload = consultationPayload();
    if (payload.examRequested === "yes" && !payload.exams) {
      $("#consultationExams").focus();
      showToast("Informe os exames", "Descreva os exames solicitados antes de finalizar.");
      return;
    }

    record.consultation = payload;
    record.status = STATUS.ATTENDED;
    record.finishedAt = new Date().toISOString();
    const shouldPrint = payload.examRequested === "yes" && $("#printExamAfterFinish").checked;
    closeModal(els.consultationModal);
    saveAndRender({ title: "Atendimento finalizado", detail: `${record.name} foi marcado como atendido.` });
    if (shouldPrint) printExamRequest(record);
  }

  function printExamRequest(record) {
    if (!record?.consultation?.exams) {
      showToast("Sem pedido de exame", "Este atendimento não possui exames registrados.");
      return;
    }
    const popup = window.open("", "_blank", "width=900,height=760");
    if (!popup) {
      showToast("Impressão bloqueada", "Permita a abertura de pop-ups para imprimir o pedido.");
      return;
    }
    const issuedAt = record.finishedAt || record.consultation.updatedAt || new Date().toISOString();
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Pedido de exames - ${escapeHtml(record.name)}</title><style>
      *{box-sizing:border-box}body{margin:0;padding:42px;font-family:Arial,sans-serif;color:#14263d;background:#fff}.page{max-width:780px;margin:0 auto}.head{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #1677ff;padding-bottom:18px}.head h1{margin:0;font-size:23px;color:#0c2c55}.head p{margin:5px 0 0;color:#62748a;font-size:12px}.badge{padding:8px 12px;border-radius:999px;color:#0f64d4;background:#eaf3ff;font-size:11px;font-weight:700}.info{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:24px 0;padding:18px;border:1px solid #dbe5ef;border-radius:12px}.info div{display:grid;gap:4px}.info small{color:#708197;font-size:10px;text-transform:uppercase}.info strong{font-size:13px}.request{min-height:250px;padding:22px;border:1px solid #dbe5ef;border-radius:12px}.request h2{margin:0 0 16px;font-size:15px;color:#0c2c55}.request pre{margin:0;white-space:pre-wrap;font-family:Arial,sans-serif;font-size:14px;line-height:1.7}.signature{margin-top:80px;text-align:center}.signature span{display:block;width:320px;margin:0 auto 10px;border-top:1px solid #26394f}.signature strong{font-size:12px}.footer{margin-top:42px;color:#78889b;font-size:10px;text-align:center}@media print{body{padding:20px}.page{max-width:none}}
    </style></head><body><main class="page"><header class="head"><div><h1>Pedido de exames</h1><p>LAG Controller • ${escapeHtml(record.city)}</p></div><span class="badge">Solicitação médica</span></header><section class="info"><div><small>Paciente</small><strong>${escapeHtml(record.name)}</strong></div><div><small>CPF</small><strong>${escapeHtml(record.cpf)}</strong></div><div><small>Data de nascimento</small><strong>${escapeHtml(formatBirth(record.birth))}</strong></div><div><small>Data da solicitação</small><strong>${escapeHtml(formatDate(issuedAt))}</strong></div></section><section class="request"><h2>Exames solicitados</h2><pre>${escapeHtml(record.consultation.exams)}</pre></section><div class="signature"><span></span><strong>${escapeHtml(record.doctor)}</strong><br><small>Assinatura e identificação profissional</small></div><p class="footer">Documento gerado pelo módulo Recepção e fila médica do LAG Controller.</p></main><script>window.onload=()=>{window.print();};<\/script></body></html>`);
    popup.document.close();
  }

  function handleQueueAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const record = state.records.find(item => item.id === button.dataset.id);
    if (!record) return;
    const action = button.dataset.action;
    if (action === "call") callPatient(record);
    if (action === "return") returnToQueue(record);
    if (action === "consult") fillConsultation(record, false);
    if (action === "view") fillConsultation(record, true);
    if (action === "print") printExamRequest(record);
  }

  function bindEvents() {
    $("#newPatientButton").addEventListener("click", () => openModal(els.registrationModal));
    $$('[data-close-registration]').forEach(button => button.addEventListener("click", () => closeModal(els.registrationModal)));
    $$('[data-close-consultation]').forEach(button => button.addEventListener("click", () => closeModal(els.consultationModal)));
    els.registrationForm.addEventListener("submit", registerPatient);
    els.consultationForm.addEventListener("submit", finalizeConsultation);
    $("#saveConsultationDraft").addEventListener("click", saveDraft);
    els.queueList.addEventListener("click", handleQueueAction);
    $("#refreshQueue").addEventListener("click", () => {
      state.records = readRecords();
      updateDoctorOptions();
      renderQueue();
      showToast("Fila atualizada", "Os dados locais foram recarregados.");
    });

    els.search.addEventListener("input", () => {
      state.search = els.search.value;
      renderQueue();
    });
    els.doctorFilter.addEventListener("change", () => {
      state.doctor = els.doctorFilter.value;
      renderQueue();
    });
    $$(".view-tabs button").forEach(button => {
      button.addEventListener("click", () => {
        $$(".view-tabs button").forEach(item => item.classList.toggle("active", item === button));
        state.view = button.dataset.view;
        renderQueue();
      });
    });

    $("#patientCpf").addEventListener("input", event => { event.target.value = maskCpf(event.target.value); });
    $("#patientPhone").addEventListener("input", event => { event.target.value = maskPhone(event.target.value); });
    $("#patientCep")?.addEventListener("input", event => { event.target.value = maskCep(event.target.value); });
    $("#patientCep")?.addEventListener("blur", lookupReceptionCep);
    $$('input[name="examRequested"]').forEach(radio => {
      radio.addEventListener("change", () => {
        const requested = document.querySelector('input[name="examRequested"]:checked')?.value === "yes";
        els.examDetailsBlock.hidden = !requested;
        $("#consultationExams").required = requested;
      });
    });

    [els.registrationModal, els.consultationModal].forEach(modal => {
      modal.addEventListener("click", event => {
        if (event.target === modal) closeModal(modal);
      });
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeModal(els.registrationModal);
        closeModal(els.consultationModal);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        els.search.focus();
      }
    });
    window.addEventListener("storage", event => {
      if (event.key !== STORE_KEY) return;
      state.records = readRecords();
      updateDoctorOptions();
      renderQueue();
    });
    window.addEventListener("lag:global-city-changed", () => {
      state.doctor = "";
      updateDoctorOptions();
      renderQueue();
    });
  }

  function init() {
    state.records = readRecords();
    bindEvents();
    updateDoctorOptions();
    renderQueue();
    state.timer = window.setInterval(updateLiveTimes, 1000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
