(() => {
  "use strict";

  const STORAGE_KEY = "lag-odontologia-prontuarios-cro-v1";
  const FILE_DB = "lag-odontologia-arquivos-v1";
  const FILE_STORE = "attachments";
  const TOOTH_ORDER = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28,48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
  const REQUIRED_DOCS = ["consent", "financial"];
  const SIGNATURE_REQUEST_KEY = "lag-odontologia-signature-requests-v1";

  const $ = id => document.getElementById(id);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const fields = {
    patientName: $("patientName"),
    patientBirth: $("patientBirth"),
    patientAge: $("patientAge"),
    patientSex: $("patientSex"),
    patientCpf: $("patientCpf"),
    patientRg: $("patientRg"),
    patientCep: $("patientCep"),
    patientStreet: $("patientStreet"),
    patientNumber: $("patientNumber"),
    patientComplement: $("patientComplement"),
    patientNeighborhood: $("patientNeighborhood"),
    patientCity: $("patientCity"),
    patientState: $("patientState"),
    patientPhone: $("patientPhone"),
    patientProfession: $("patientProfession"),
    patientCivilStatus: $("patientCivilStatus"),
    patientGuardian: $("patientGuardian"),
    patientGuardianPhone: $("patientGuardianPhone"),
    patientInsurance: $("patientInsurance"),
    patientInsuranceNumber: $("patientInsuranceNumber"),
    anamnesisComplaint: $("anamnesisComplaint"),
    anamnesisCurrentIllness: $("anamnesisCurrentIllness"),
    anamnesisMedicalHistory: $("anamnesisMedicalHistory"),
    anamnesisDentalHistory: $("anamnesisDentalHistory"),
    anamnesisAllergies: $("anamnesisAllergies"),
    anamnesisMedications: $("anamnesisMedications"),
    vitalBloodPressure: $("vitalBloodPressure"),
    vitalHeartRate: $("vitalHeartRate"),
    vitalOxygen: $("vitalOxygen"),
    vitalTemperature: $("vitalTemperature"),
    vitalWeight: $("vitalWeight"),
    vitalGlucose: $("vitalGlucose"),
    clinicalExtraOral: $("clinicalExtraOral"),
    clinicalIntraOral: $("clinicalIntraOral"),
    clinicalComplementary: $("clinicalComplementary"),
    clinicalDiagnosis: $("clinicalDiagnosis"),
    treatmentProcedures: $("treatmentProcedures"),
    treatmentBudget: $("treatmentBudget"),
    treatmentPayment: $("treatmentPayment"),
    treatmentFinancialNotes: $("treatmentFinancialNotes")
  };

  const ui = {
    search: $("moduleGlobalSearch"),
    statusFilter: $("recordStatusFilter"),
    recordsView: $("recordsView"),
    recordEditor: $("recordEditor"),
    recordList: $("recordList"),
    recordsEmpty: $("recordsEmpty"),
    newRecord: $("newRecord"),
    closeEditor: $("closeEditor"),
    saveRecord: $("saveRecord"),
    printRecord: $("printRecord"),
    recordStatus: $("recordStatus"),
    recordPatientTitle: $("recordPatientTitle"),
    recordPatientSubtitle: $("recordPatientSubtitle"),
    recordAvatar: $("recordAvatar"),
    recordSteps: $("recordSteps"),
    summaryPatients: $("summaryPatients"),
    summaryActive: $("summaryActive"),
    summaryToday: $("summaryToday"),
    summaryPendingDocs: $("summaryPendingDocs"),
    odontogram: $("odontogram"),
    toothEditor: $("toothEditor"),
    selectedToothLabel: $("selectedToothLabel"),
    selectedToothStatus: $("selectedToothStatus"),
    selectedToothNote: $("selectedToothNote"),
    saveTooth: $("saveTooth"),
    addEvolution: $("addEvolution"),
    evolutionModal: $("evolutionModal"),
    evolutionForm: $("evolutionForm"),
    evolutionTable: $("evolutionTable"),
    evolutionEmpty: $("evolutionEmpty"),
    evolutionDate: $("evolutionDate"),
    evolutionRegion: $("evolutionRegion"),
    evolutionProcedure: $("evolutionProcedure"),
    evolutionMedication: $("evolutionMedication"),
    evolutionIncidents: $("evolutionIncidents"),
    evolutionGuidance: $("evolutionGuidance"),
    evolutionProfessional: $("evolutionProfessional"),
    evolutionCro: $("evolutionCro"),
    attachmentType: $("attachmentType"),
    attachmentFile: $("attachmentFile"),
    attachmentFileName: $("attachmentFileName"),
    addAttachment: $("addAttachment"),
    attachmentList: $("attachmentList"),
    attachmentCount: $("attachmentCount"),
    signatureCard: $("patientSignatureCard"),
    signatureFullscreen: $("signatureFullscreen"),
    patientSignatureStatus: $("patientSignatureStatus"),
    patientSignatureHint: $("patientSignatureHint"),
    confirmPatientSignature: $("confirmPatientSignature"),
    clearPatientSignature: $("clearPatientSignature"),
    generateSignatureQr: $("generateSignatureQr"),
    signatureQrModal: $("signatureQrModal"),
    signatureQrCode: $("signatureQrCode"),
    signatureQrLink: $("signatureQrLink"),
    signatureQrStatus: $("signatureQrStatus"),
    copySignatureLink: $("copySignatureLink"),
    openSignatureLink: $("openSignatureLink"),
    professionalSignatureHint: $("professionalSignatureHint"),
    clearProfessionalSignature: $("clearProfessionalSignature"),
    toastRegion: $("odontoToastRegion")
  };

  let records = loadRecords();
  let current = null;
  let selectedTeeth = new Set();
  let activeSignatureToken = "";
  let signaturePollTimer = null;
  let dirty = false;
  let patientPad = null;
  let professionalPad = null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindEvents();
    setupMasks();
    renderOdontogram();
    renderRecords();
    updateSummary();
    setupSignaturePads();
  }

  function defaultRecord() {
    const odontogram = {};
    TOOTH_ORDER.forEach(tooth => { odontogram[tooth] = { status: "healthy", note: "" }; });
    return {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "Em tratamento",
      patient: {
        name: "", birth: "", age: "", sex: "", cpf: "", rg: "", address: "", cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "", phone: "",
        profession: "", civilStatus: "", guardian: "", guardianPhone: "", insurance: "", insuranceNumber: ""
      },
      anamnesis: {
        complaint: "", currentIllness: "", medicalHistory: "", dentalHistory: "", allergies: "", medications: "",
        vitals: { bloodPressure: "", heartRate: "", oxygen: "", temperature: "", weight: "", glucose: "" }
      },
      clinical: { extraOral: "", intraOral: "", complementary: "", diagnosis: "", odontogram },
      treatment: { procedures: "", budget: "", payment: "", financialNotes: "" },
      evolutions: [],
      documents: { consent: false, financial: false, prescriptions: false, reports: false, referrals: false, photos: false },
      attachments: [],
      patientSignature: ""
    };
  }

  function normalizeRecord(record) {
    const base = defaultRecord();
    const out = {
      ...base,
      ...record,
      patient: { ...base.patient, ...(record.patient || {}) },
      anamnesis: {
        ...base.anamnesis,
        ...(record.anamnesis || {}),
        vitals: { ...base.anamnesis.vitals, ...(record.anamnesis?.vitals || {}) }
      },
      clinical: {
        ...base.clinical,
        ...(record.clinical || {}),
        odontogram: { ...base.clinical.odontogram, ...(record.clinical?.odontogram || {}) }
      },
      treatment: { ...base.treatment, ...(record.treatment || {}) },
      evolutions: Array.isArray(record.evolutions) ? record.evolutions : [],
      documents: { ...base.documents, ...(record.documents || {}) },
      attachments: Array.isArray(record.attachments) ? record.attachments : []
    };
    TOOTH_ORDER.forEach(tooth => {
      const value = out.clinical.odontogram[tooth] || {};
      out.clinical.odontogram[tooth] = { status: value.status || "healthy", note: value.note || "" };
    });
    return out;
  }

  function loadRecords() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.map(normalizeRecord) : [];
    } catch (error) {
      console.warn("Não foi possível carregar os prontuários odontológicos.", error);
      return [];
    }
  }

  function persistRecords() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  function bindEvents() {
    ui.newRecord?.addEventListener("click", createRecord);
    $$('[data-create-record]').forEach(button => button.addEventListener("click", createRecord));
    ui.closeEditor?.addEventListener("click", requestCloseEditor);
    ui.saveRecord?.addEventListener("click", saveCurrentRecord);
    ui.printRecord?.addEventListener("click", () => window.print());
    ui.search?.addEventListener("input", renderRecords);
    ui.statusFilter?.addEventListener("change", renderRecords);
    ui.recordStatus?.addEventListener("change", () => { dirty = true; updateEditorHeading(); });

    ui.recordSteps?.addEventListener("click", event => {
      const button = event.target.closest("[data-record-step]");
      if (button) openStep(button.dataset.recordStep);
    });

    Object.values(fields).forEach(field => {
      field?.addEventListener("input", () => { dirty = true; if (field === fields.patientName || field === fields.patientCpf || field === fields.patientBirth) updateEditorHeading(); });
      field?.addEventListener("change", () => { dirty = true; });
    });

    fields.patientBirth?.addEventListener("change", updateAge);
    fields.patientCep?.addEventListener("input", event => { event.target.value = maskCep(event.target.value); });
    fields.patientCep?.addEventListener("blur", lookupPatientCep);
    ui.saveTooth?.addEventListener("click", saveSelectedTooth);
    ui.addEvolution?.addEventListener("click", openEvolutionModal);
    $$('[data-close-evolution]').forEach(button => button.addEventListener("click", closeEvolutionModal));
    ui.evolutionModal?.addEventListener("click", event => { if (event.target === ui.evolutionModal) closeEvolutionModal(); });
    ui.evolutionForm?.addEventListener("submit", addEvolution);
    ui.evolutionTable?.addEventListener("click", event => {
      const button = event.target.closest("[data-delete-evolution]");
      if (button) deleteEvolution(button.dataset.deleteEvolution);
    });

    ui.attachmentFile?.addEventListener("change", () => {
      ui.attachmentFileName.textContent = ui.attachmentFile.files?.[0]?.name || "Nenhum arquivo selecionado";
    });
    ui.addAttachment?.addEventListener("click", addAttachment);
    ui.attachmentList?.addEventListener("click", event => {
      const open = event.target.closest("[data-open-attachment]");
      const remove = event.target.closest("[data-remove-attachment]");
      if (open) openAttachment(open.dataset.openAttachment);
      if (remove) removeAttachment(remove.dataset.removeAttachment);
    });

    $$('[data-doc-check]').forEach(input => input.addEventListener("change", () => { dirty = true; }));

    ui.confirmPatientSignature?.addEventListener("click", confirmPatientSignature);
    ui.clearPatientSignature?.addEventListener("click", clearPatientSignature);
    ui.clearProfessionalSignature?.addEventListener("click", event => { event.preventDefault(); professionalPad?.clear(); });
    ui.signatureFullscreen?.addEventListener("click", toggleSignatureFullscreen);
    ui.generateSignatureQr?.addEventListener("click", generateSignatureQr);
    $$('[data-close-signature-qr]').forEach(button => button.addEventListener("click", closeSignatureQrModal));
    ui.signatureQrModal?.addEventListener("click", event => { if (event.target === ui.signatureQrModal) closeSignatureQrModal(); });
    ui.copySignatureLink?.addEventListener("click", copySignatureLink);
    ui.openSignatureLink?.addEventListener("click", () => { if (ui.signatureQrLink?.value) window.open(ui.signatureQrLink.value, "_blank", "noopener"); });
    window.addEventListener("storage", event => { if (event.key === SIGNATURE_REQUEST_KEY) checkRemoteSignature(); });
    document.addEventListener("fullscreenchange", () => setTimeout(() => patientPad?.resize(true), 50));

    document.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        ui.search?.focus();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s" && !ui.recordEditor.hidden) {
        event.preventDefault();
        saveCurrentRecord();
      }
      if (event.key === "Escape" && !ui.evolutionModal.hidden) closeEvolutionModal();
      if (event.key === "Escape" && !ui.signatureQrModal.hidden) closeSignatureQrModal();
    });

    window.addEventListener("beforeunload", event => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });
  }

  function setupMasks() {
    fields.patientCpf?.addEventListener("input", event => {
      const digits = event.target.value.replace(/\D/g, "").slice(0, 11);
      event.target.value = digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    });
    [fields.patientPhone, fields.patientGuardianPhone].forEach(input => input?.addEventListener("input", event => {
      const digits = event.target.value.replace(/\D/g, "").slice(0, 11);
      event.target.value = digits.length <= 10
        ? digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2")
        : digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
    }));
  }

  function createRecord() {
    selectedTeeth.clear();
    current = defaultRecord();
    fillForm(current);
    ui.recordsView.hidden = true;
    ui.recordEditor.hidden = false;
    ui.printRecord.disabled = false;
    dirty = false;
    openStep("identification");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => fields.patientName?.focus(), 150);
  }

  function openRecord(id) {
    selectedTeeth.clear();
    const found = records.find(record => record.id === id);
    if (!found) return;
    current = normalizeRecord(found);
    fillForm(current);
    ui.recordsView.hidden = true;
    ui.recordEditor.hidden = false;
    ui.printRecord.disabled = false;
    dirty = false;
    openStep("identification");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function requestCloseEditor() {
    if (dirty && !window.confirm("Existem alterações não salvas. Deseja sair mesmo assim?")) return;
    closeEditor();
  }

  function closeEditor() {
    current = null;
    selectedTeeth.clear();
    stopSignaturePolling();
    dirty = false;
    ui.recordEditor.hidden = true;
    ui.recordsView.hidden = false;
    ui.printRecord.disabled = true;
    renderRecords();
    updateSummary();
  }

  function openStep(step) {
    $$('[data-record-step]', ui.recordSteps).forEach(button => button.classList.toggle("active", button.dataset.recordStep === step));
    $$('[data-record-view]').forEach(section => {
      const active = section.dataset.recordView === step;
      section.hidden = !active;
      section.classList.toggle("active", active);
    });
    if (step === "clinical") setTimeout(renderOdontogram, 0);
    if (step === "documents") setTimeout(() => patientPad?.resize(true), 40);
  }

  function fillForm(record) {
    const p = record.patient;
    fields.patientName.value = p.name;
    fields.patientBirth.value = p.birth;
    fields.patientAge.value = p.age || calculateAge(p.birth);
    fields.patientSex.value = p.sex;
    fields.patientCpf.value = p.cpf;
    fields.patientRg.value = p.rg;
    fields.patientCep.value = p.cep || "";
    fields.patientStreet.value = p.street || p.address || "";
    fields.patientNumber.value = p.number || "";
    fields.patientComplement.value = p.complement || "";
    fields.patientNeighborhood.value = p.neighborhood || "";
    fields.patientCity.value = p.city || "";
    fields.patientState.value = p.state || "";
    fields.patientPhone.value = p.phone;
    fields.patientProfession.value = p.profession;
    fields.patientCivilStatus.value = p.civilStatus;
    fields.patientGuardian.value = p.guardian;
    fields.patientGuardianPhone.value = p.guardianPhone;
    fields.patientInsurance.value = p.insurance;
    fields.patientInsuranceNumber.value = p.insuranceNumber;

    const a = record.anamnesis;
    fields.anamnesisComplaint.value = a.complaint;
    fields.anamnesisCurrentIllness.value = a.currentIllness;
    fields.anamnesisMedicalHistory.value = a.medicalHistory;
    fields.anamnesisDentalHistory.value = a.dentalHistory;
    fields.anamnesisAllergies.value = a.allergies;
    fields.anamnesisMedications.value = a.medications;
    fields.vitalBloodPressure.value = a.vitals.bloodPressure;
    fields.vitalHeartRate.value = a.vitals.heartRate;
    fields.vitalOxygen.value = a.vitals.oxygen;
    fields.vitalTemperature.value = a.vitals.temperature;
    fields.vitalWeight.value = a.vitals.weight;
    fields.vitalGlucose.value = a.vitals.glucose;

    const c = record.clinical;
    fields.clinicalExtraOral.value = c.extraOral;
    fields.clinicalIntraOral.value = c.intraOral;
    fields.clinicalComplementary.value = c.complementary;
    fields.clinicalDiagnosis.value = c.diagnosis;

    const t = record.treatment;
    fields.treatmentProcedures.value = t.procedures;
    fields.treatmentBudget.value = t.budget;
    fields.treatmentPayment.value = t.payment;
    fields.treatmentFinancialNotes.value = t.financialNotes;

    ui.recordStatus.value = record.status;
    $$('[data-doc-check]').forEach(input => { input.checked = Boolean(record.documents[input.dataset.docCheck]); });
    patientPad?.load(record.patientSignature || "");
    updateEditorHeading();
    renderOdontogram();
    renderEvolutions();
    renderAttachments();
    updatePatientSignatureStatus();
  }

  function collectForm() {
    if (!current) return null;
    const patient = {
      name: fields.patientName.value.trim(), birth: fields.patientBirth.value, age: fields.patientAge.value,
      sex: fields.patientSex.value, cpf: fields.patientCpf.value.trim(), rg: fields.patientRg.value.trim(),
      cep: fields.patientCep.value.trim(), street: fields.patientStreet.value.trim(), number: fields.patientNumber.value.trim(),
      complement: fields.patientComplement.value.trim(), neighborhood: fields.patientNeighborhood.value.trim(), city: fields.patientCity.value.trim(), state: fields.patientState.value.trim().toUpperCase(),
      address: buildPatientAddress(), phone: fields.patientPhone.value.trim(), profession: fields.patientProfession.value.trim(),
      civilStatus: fields.patientCivilStatus.value, guardian: fields.patientGuardian.value.trim(), guardianPhone: fields.patientGuardianPhone.value.trim(),
      insurance: fields.patientInsurance.value.trim(), insuranceNumber: fields.patientInsuranceNumber.value.trim()
    };
    const documents = {};
    $$('[data-doc-check]').forEach(input => { documents[input.dataset.docCheck] = input.checked; });
    return normalizeRecord({
      ...current,
      status: ui.recordStatus.value,
      updatedAt: new Date().toISOString(),
      patient,
      anamnesis: {
        complaint: fields.anamnesisComplaint.value.trim(),
        currentIllness: fields.anamnesisCurrentIllness.value.trim(),
        medicalHistory: fields.anamnesisMedicalHistory.value.trim(),
        dentalHistory: fields.anamnesisDentalHistory.value.trim(),
        allergies: fields.anamnesisAllergies.value.trim(),
        medications: fields.anamnesisMedications.value.trim(),
        vitals: {
          bloodPressure: fields.vitalBloodPressure.value.trim(), heartRate: fields.vitalHeartRate.value,
          oxygen: fields.vitalOxygen.value, temperature: fields.vitalTemperature.value,
          weight: fields.vitalWeight.value, glucose: fields.vitalGlucose.value
        }
      },
      clinical: {
        ...current.clinical,
        extraOral: fields.clinicalExtraOral.value.trim(),
        intraOral: fields.clinicalIntraOral.value.trim(),
        complementary: fields.clinicalComplementary.value.trim(),
        diagnosis: fields.clinicalDiagnosis.value.trim()
      },
      treatment: {
        procedures: fields.treatmentProcedures.value.trim(), budget: fields.treatmentBudget.value,
        payment: fields.treatmentPayment.value, financialNotes: fields.treatmentFinancialNotes.value.trim()
      },
      documents
    });
  }

  function saveCurrentRecord() {
    if (!current) return;
    if (!fields.patientName.value.trim()) {
      openStep("identification");
      fields.patientName.focus();
      fields.patientName.setCustomValidity("Informe o nome do paciente.");
      fields.patientName.reportValidity();
      fields.patientName.setCustomValidity("");
      toast("Campo obrigatório", "Informe o nome do paciente antes de salvar.", "error");
      return;
    }
    current = collectForm();
    const index = records.findIndex(record => record.id === current.id);
    if (index >= 0) records[index] = current;
    else records.unshift(current);
    persistRecords();
    dirty = false;
    updateEditorHeading();
    updateSummary();
    toast("Prontuário salvo", "As informações odontológicas foram atualizadas.");
  }

  function updateAge() {
    fields.patientAge.value = calculateAge(fields.patientBirth.value);
    dirty = true;
    updateEditorHeading();
  }

  function calculateAge(dateString) {
    if (!dateString) return "";
    const birth = new Date(`${dateString}T12:00:00`);
    if (Number.isNaN(birth.getTime())) return "";
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const beforeBirthday = now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
    if (beforeBirthday) age -= 1;
    return age >= 0 ? `${age} anos` : "";
  }

  function updateEditorHeading() {
    const name = fields.patientName.value.trim() || "Novo paciente";
    const cpf = fields.patientCpf.value.trim() || "CPF não informado";
    const age = fields.patientAge.value || "Idade não informada";
    ui.recordPatientTitle.textContent = name;
    ui.recordPatientSubtitle.textContent = `${cpf} • ${age} • ${ui.recordStatus.value}`;
    ui.recordAvatar.textContent = initials(name);
  }

  function renderRecords() {
    const search = normalize(ui.search?.value || "");
    const status = ui.statusFilter?.value || "";
    const filtered = records.filter(record => {
      const haystack = normalize(`${record.patient.name} ${record.patient.cpf} ${record.patient.phone} ${record.patient.insurance}`);
      return (!search || haystack.includes(search)) && (!status || record.status === status);
    });
    ui.recordList.innerHTML = filtered.map(recordCard).join("");
    ui.recordsEmpty.hidden = filtered.length > 0;
    $$('.odonto-record-card', ui.recordList).forEach(card => card.addEventListener("click", () => openRecord(card.dataset.recordId)));
  }

  function recordCard(record) {
    const completeness = completionPercent(record);
    const lastEvolution = [...record.evolutions].sort((a,b) => new Date(b.date) - new Date(a.date))[0];
    return `
      <article class="odonto-record-card" data-record-id="${escapeHtml(record.id)}" tabindex="0">
        <div class="odonto-record-card-head">
          <span class="odonto-record-avatar">${escapeHtml(initials(record.patient.name))}</span>
          <div><h3>${escapeHtml(record.patient.name || "Paciente sem nome")}</h3><p>${escapeHtml(record.patient.cpf || "CPF não informado")}</p></div>
          <span class="odonto-record-badge">${escapeHtml(record.status)}</span>
        </div>
        <div class="odonto-record-card-meta">
          <span><i class="fa-solid fa-cake-candles"></i>${escapeHtml(record.patient.age || calculateAge(record.patient.birth) || "Idade não informada")}</span>
          <span><i class="fa-solid fa-phone"></i>${escapeHtml(record.patient.phone || "Sem telefone")}</span>
          <span><i class="fa-solid fa-calendar-check"></i>${lastEvolution ? formatDate(lastEvolution.date) : "Sem atendimento"}</span>
          <span><i class="fa-solid fa-paperclip"></i>${record.attachments.length} ${record.attachments.length === 1 ? "anexo" : "anexos"}</span>
        </div>
        <div class="odonto-record-progress"><div><span style="width:${completeness}%"></span></div><small>${completeness}% do prontuário preenchido</small></div>
      </article>`;
  }

  function completionPercent(record) {
    const checks = [
      record.patient.name, record.patient.birth, record.patient.cpf, record.patient.phone,
      record.anamnesis.complaint, record.anamnesis.medicalHistory,
      record.clinical.extraOral, record.clinical.intraOral, record.clinical.diagnosis,
      record.treatment.procedures, record.treatment.payment,
      record.evolutions.length, record.patientSignature,
      REQUIRED_DOCS.every(key => record.documents[key])
    ];
    return Math.round(checks.filter(Boolean).length / checks.length * 100);
  }

  function updateSummary() {
    const today = new Date().toISOString().slice(0,10);
    ui.summaryPatients.textContent = records.length;
    ui.summaryActive.textContent = records.filter(record => ["Em tratamento", "Retorno"].includes(record.status)).length;
    ui.summaryToday.textContent = records.reduce((total, record) => total + record.evolutions.filter(item => String(item.date).slice(0,10) === today).length, 0);
    ui.summaryPendingDocs.textContent = records.filter(record => !REQUIRED_DOCS.every(key => record.documents[key]) || !record.patientSignature).length;
  }

  const TOOTH_SVGS = {
    18: { silhouette: `M 60.80 6.00 L 57.20 7.44 L 53.60 18.96 L 51.44 17.52 L 48.56 10.32 L 44.96 7.44 L 43.52 10.32 L 42.80 20.40 L 34.88 9.60 L 30.56 8.16 L 29.84 10.32 L 32.00 26.88 L 29.84 46.32 L 29.84 62.16 L 32.00 70.80 L 24.80 84.48 L 23.36 102.48 L 26.24 107.52 L 34.88 113.28 L 42.80 113.28 L 48.56 111.12 L 61.52 112.56 L 68.72 111.84 L 73.76 108.24 L 75.20 104.64 L 75.92 90.24 L 68.72 73.68 L 70.16 53.52 L 64.40 28.32 L 62.24 7.44 Z`, lines: `M 70.88 104.64 L 70.16 104.64 L 68.72 106.08 L 68.00 106.08 L 67.28 106.80 L 62.96 106.80 L 62.24 106.08 L 58.64 106.08 L 57.92 105.36 L 52.88 105.36 L 52.16 106.08 L 53.60 106.08 L 54.32 106.80 L 55.76 106.80 L 56.48 107.52 L 59.36 107.52 L 60.08 108.24 L 68.00 108.24 L 68.72 107.52 L 69.44 107.52 L 70.88 106.08 Z M 34.88 74.40 L 40.64 74.40 L 41.36 73.68 L 44.24 73.68 L 44.96 74.40 L 50.00 74.40 L 50.72 75.12 L 65.12 75.12 L 65.12 74.40 L 64.40 74.40 L 63.68 73.68 L 54.32 73.68 L 53.60 72.96 L 48.56 72.96 L 47.84 72.24 L 38.48 72.24 Z M 60.80 6.00 L 57.20 7.44 L 53.60 18.96 L 51.44 17.52 L 48.56 10.32 L 44.96 7.44 L 43.52 10.32 L 42.80 20.40 L 34.88 9.60 L 30.56 8.16 L 29.84 10.32 L 32.00 26.88 L 29.84 46.32 L 29.84 62.16 L 32.00 70.80 L 24.80 84.48 L 23.36 102.48 L 26.24 107.52 L 34.88 113.28 L 42.80 113.28 L 48.56 111.12 L 61.52 112.56 L 68.72 111.84 L 73.76 108.24 L 75.20 104.64 L 75.92 90.24 L 68.72 73.68 L 70.16 53.52 L 64.40 28.32 L 62.24 7.44 Z M 45.68 10.32 L 46.40 10.32 L 47.12 11.04 L 47.12 11.76 L 47.84 12.48 L 47.84 13.20 L 50.00 16.80 L 50.00 18.24 L 52.16 21.84 L 52.16 23.28 L 51.44 24.00 L 51.44 25.44 L 50.72 26.16 L 50.72 28.32 L 50.00 29.04 L 50.00 30.48 L 49.28 31.20 L 49.28 33.36 L 48.56 34.08 L 47.84 34.08 L 47.12 33.36 L 47.12 32.64 L 45.68 30.48 L 45.68 29.04 L 44.96 28.32 L 44.96 11.04 Z M 60.08 7.44 L 61.52 11.04 L 62.24 26.88 L 68.72 56.40 L 67.28 75.12 L 73.76 89.52 L 73.76 103.92 L 70.16 109.68 L 65.84 111.12 L 47.12 109.68 L 41.36 111.84 L 34.88 111.84 L 34.88 108.96 L 42.08 106.80 L 29.84 107.52 L 25.52 103.92 L 24.80 101.04 L 26.24 87.36 L 33.44 71.52 L 31.28 60.00 L 31.28 49.20 L 33.44 36.96 L 33.44 24.72 L 31.28 11.04 L 32.72 10.32 L 37.04 15.36 L 47.84 36.96 L 50.72 34.80 L 52.16 27.60 L 55.76 20.40 L 57.92 9.60 Z` },
    17: { silhouette: `M 58.82 6.00 L 54.41 6.73 L 55.88 17.76 L 55.14 34.65 L 52.94 32.45 L 46.33 10.41 L 44.12 10.41 L 41.18 14.82 L 36.04 34.65 L 33.84 30.98 L 33.10 13.35 L 30.90 9.67 L 27.96 11.88 L 23.55 22.90 L 21.35 42.73 L 27.22 62.57 L 27.22 69.18 L 22.82 84.61 L 21.35 102.24 L 24.29 109.59 L 27.22 111.06 L 49.27 109.59 L 61.76 113.27 L 67.63 113.27 L 74.24 108.12 L 77.18 101.51 L 77.92 90.49 L 70.57 64.04 L 70.57 53.02 L 73.51 38.33 L 72.78 27.31 L 67.63 15.55 Z`, lines: `M 27.22 105.18 L 29.43 106.65 L 36.04 106.65 L 36.78 105.92 L 38.24 105.92 L 40.45 104.45 L 38.24 104.45 L 37.51 105.18 L 33.84 105.18 L 33.10 105.92 L 30.90 105.92 L 30.16 105.18 L 28.69 105.18 L 27.96 104.45 L 27.22 104.45 Z M 51.47 103.71 L 51.47 104.45 L 54.41 104.45 L 55.14 105.18 L 58.08 105.18 L 58.82 105.92 L 63.22 105.92 L 63.96 106.65 L 64.69 105.92 L 69.10 105.92 L 71.31 104.45 L 71.31 103.71 L 70.57 104.45 L 69.10 104.45 L 68.37 105.18 L 63.22 105.18 L 62.49 104.45 L 58.08 104.45 L 57.35 103.71 Z M 58.82 6.00 L 54.41 6.73 L 55.88 17.76 L 55.14 34.65 L 52.94 32.45 L 46.33 10.41 L 44.12 10.41 L 41.18 14.82 L 36.04 34.65 L 33.84 30.98 L 33.10 13.35 L 30.90 9.67 L 27.96 11.88 L 23.55 22.90 L 21.35 42.73 L 27.22 62.57 L 27.22 69.18 L 22.82 84.61 L 21.35 102.24 L 24.29 109.59 L 27.22 111.06 L 49.27 109.59 L 61.76 113.27 L 67.63 113.27 L 74.24 108.12 L 77.18 101.51 L 77.92 90.49 L 70.57 64.04 L 70.57 53.02 L 73.51 38.33 L 72.78 27.31 L 67.63 15.55 Z M 44.12 12.61 L 44.86 12.61 L 46.33 14.82 L 46.33 17.02 L 47.06 17.76 L 47.06 19.22 L 47.80 19.96 L 47.80 22.16 L 49.27 24.37 L 49.27 25.84 L 50.00 26.57 L 50.00 28.04 L 50.73 28.78 L 50.73 29.51 L 51.47 30.24 L 51.47 30.98 L 53.67 34.65 L 53.67 36.12 L 54.41 36.86 L 54.41 38.33 L 53.67 39.06 L 52.94 41.27 L 49.27 44.94 L 44.12 44.94 L 43.39 44.20 L 41.18 43.47 L 37.51 39.80 L 37.51 37.59 L 38.24 36.86 L 38.24 34.65 L 38.98 33.92 L 38.98 30.98 L 39.71 30.24 L 39.71 27.31 L 40.45 26.57 L 40.45 23.63 L 41.18 22.90 L 41.18 19.96 L 41.92 19.22 L 41.92 17.02 L 42.65 16.29 L 42.65 15.55 L 43.39 14.82 L 43.39 13.35 Z M 58.08 7.47 L 64.69 14.08 L 71.31 29.51 L 71.31 41.27 L 69.10 51.55 L 69.84 68.45 L 55.14 72.86 L 33.10 70.65 L 39.71 73.59 L 54.41 74.33 L 69.84 69.18 L 75.71 89.02 L 74.98 101.51 L 72.04 108.12 L 66.90 112.53 L 47.06 107.39 L 27.96 109.59 L 25.02 108.12 L 22.82 100.04 L 23.55 89.76 L 28.69 69.18 L 27.96 58.90 L 22.82 42.73 L 25.02 22.90 L 27.96 14.82 L 30.90 11.88 L 31.63 28.78 L 35.31 39.80 L 41.18 45.67 L 49.27 47.14 L 52.94 44.20 L 57.35 35.39 L 58.08 22.90 L 55.88 8.20 Z` },
    16: { silhouette: `M 29.45 6.00 L 26.66 10.88 L 23.17 27.60 L 23.17 47.11 L 27.35 72.19 L 20.39 97.28 L 20.39 102.85 L 25.26 109.82 L 31.54 112.61 L 50.35 110.52 L 55.23 112.61 L 65.68 113.30 L 75.43 107.03 L 78.92 100.06 L 77.52 85.43 L 69.86 67.32 L 69.86 59.65 L 74.74 40.14 L 74.74 29.69 L 68.46 10.88 L 64.98 7.39 L 62.19 7.39 L 62.19 28.99 L 60.10 31.08 L 55.23 14.36 L 51.05 9.48 L 48.95 10.18 L 48.26 39.45 L 45.47 45.02 L 42.68 46.41 L 37.81 40.84 L 35.02 33.87 L 32.93 18.54 L 33.63 8.79 L 32.23 6.00 Z`, lines: `M 40.59 102.85 L 35.72 102.85 L 35.02 103.55 L 32.93 103.55 L 32.23 104.25 L 28.75 104.25 L 28.05 104.94 L 25.96 104.94 L 25.96 105.64 L 27.35 105.64 L 28.05 106.34 L 28.75 105.64 L 32.23 105.64 L 32.93 104.94 L 35.02 104.94 L 35.72 104.25 L 37.11 104.25 L 37.81 103.55 L 39.20 103.55 L 39.90 102.85 Z M 74.74 100.76 L 74.04 101.46 L 73.34 101.46 L 71.25 102.85 L 69.86 102.85 L 69.16 103.55 L 60.10 103.55 L 59.41 104.25 L 58.71 104.25 L 60.10 104.25 L 60.80 104.94 L 69.86 104.94 L 70.55 104.25 L 71.95 104.25 L 73.34 102.85 L 74.04 102.85 L 74.74 102.15 Z M 67.77 72.89 L 64.98 72.89 L 64.28 73.59 L 60.80 73.59 L 60.10 74.28 L 58.01 74.28 L 57.32 74.98 L 55.92 74.98 L 53.83 76.37 L 52.44 76.37 L 51.74 77.07 L 50.35 77.07 L 49.65 77.77 L 47.56 77.77 L 46.86 78.46 L 40.59 78.46 L 39.90 77.77 L 37.81 77.77 L 37.11 77.07 L 35.72 77.07 L 34.32 75.68 L 33.63 75.68 L 31.54 74.28 L 31.54 74.98 L 35.02 78.46 L 36.41 78.46 L 37.11 79.16 L 39.20 79.16 L 39.90 79.86 L 48.26 79.86 L 48.95 79.16 L 51.05 79.16 L 51.74 78.46 L 52.44 78.46 L 54.53 77.07 L 55.92 77.07 L 58.01 75.68 L 59.41 75.68 L 60.10 74.98 L 61.50 74.98 L 62.19 74.28 L 64.98 74.28 L 65.68 73.59 L 67.77 73.59 Z M 29.45 6.00 L 26.66 10.88 L 23.17 27.60 L 23.17 47.11 L 27.35 72.19 L 20.39 97.28 L 20.39 102.85 L 25.26 109.82 L 31.54 112.61 L 50.35 110.52 L 55.23 112.61 L 65.68 113.30 L 75.43 107.03 L 78.92 100.06 L 77.52 85.43 L 69.86 67.32 L 69.86 59.65 L 74.74 40.14 L 74.74 29.69 L 68.46 10.88 L 64.98 7.39 L 62.19 7.39 L 62.19 28.99 L 60.10 31.08 L 55.23 14.36 L 51.05 9.48 L 48.95 10.18 L 48.26 39.45 L 45.47 45.02 L 42.68 46.41 L 37.81 40.84 L 35.02 33.87 L 32.93 18.54 L 33.63 8.79 L 32.23 6.00 Z M 50.35 11.57 L 51.05 11.57 L 53.83 14.36 L 53.83 15.06 L 55.23 17.15 L 55.23 18.54 L 56.62 20.63 L 56.62 22.03 L 57.32 22.72 L 57.32 25.51 L 58.01 26.21 L 58.01 28.30 L 58.71 28.99 L 58.71 31.08 L 59.41 31.78 L 59.41 38.75 L 58.71 39.45 L 58.71 40.14 L 58.01 40.84 L 58.01 41.54 L 57.32 42.23 L 57.32 42.93 L 56.62 43.63 L 55.92 45.72 L 51.74 49.90 L 47.56 49.90 L 45.47 48.50 L 45.47 47.11 L 47.56 45.02 L 47.56 44.32 L 49.65 40.84 L 49.65 35.96 L 50.35 35.26 L 50.35 29.69 L 49.65 28.99 L 49.65 12.27 Z M 30.14 8.79 L 31.54 9.48 L 32.93 33.17 L 38.50 45.02 L 46.86 51.29 L 44.08 54.77 L 48.95 54.08 L 53.83 51.29 L 60.80 40.84 L 63.59 31.08 L 63.59 8.79 L 66.37 10.88 L 72.65 27.60 L 72.65 40.84 L 68.46 55.47 L 67.77 67.32 L 74.74 83.34 L 77.52 99.37 L 75.43 104.94 L 65.68 111.21 L 58.71 111.21 L 48.95 108.43 L 30.14 110.52 L 22.48 104.94 L 22.48 95.19 L 28.75 74.28 L 28.75 62.44 L 25.26 47.81 L 24.57 34.57 L 25.96 21.33 Z` },
    15: { silhouette: `M 45.79 6.00 L 43.69 6.00 L 42.29 8.10 L 40.18 20.73 L 40.88 81.74 L 34.57 99.27 L 34.57 113.30 L 36.68 97.17 L 40.88 84.55 L 44.39 83.84 L 42.29 82.44 L 41.58 62.81 L 42.29 17.92 L 44.39 8.10 L 46.49 10.21 L 57.01 45.97 L 64.73 82.44 L 60.52 52.29 L 50.70 17.92 Z`, lines: `M 63.32 109.09 L 60.52 109.09 L 59.82 109.79 L 59.12 109.79 L 58.42 110.49 L 56.31 111.19 L 54.21 113.30 L 54.21 114.00 L 54.91 113.30 L 55.61 113.30 L 56.31 112.60 L 57.01 112.60 L 57.71 111.90 L 58.42 111.90 L 59.12 111.19 L 59.82 111.19 Z M 38.78 109.09 L 38.78 109.79 L 40.18 111.19 L 40.88 111.19 L 42.99 112.60 L 45.79 112.60 L 46.49 113.30 L 47.90 113.30 L 47.90 112.60 L 47.19 112.60 L 46.49 111.90 L 45.09 111.90 L 44.39 111.19 L 42.99 111.19 L 42.29 110.49 L 41.58 110.49 L 40.88 109.79 L 39.48 109.79 Z M 65.43 83.84 L 65.43 90.16 L 66.13 90.86 L 66.13 92.96 L 66.83 93.66 L 66.83 96.47 L 67.53 97.17 L 67.53 101.38 L 68.23 102.08 L 68.23 107.69 L 67.53 109.09 L 65.43 111.19 L 55.61 116.10 L 51.40 116.10 L 50.70 115.40 L 40.18 115.40 L 39.48 116.10 L 35.97 116.10 L 35.27 115.40 L 34.57 116.10 L 35.27 117.51 L 50.00 117.51 L 50.70 118.21 L 56.31 118.21 L 64.73 114.00 L 68.94 110.49 L 69.64 109.09 L 69.64 99.27 L 68.94 98.57 L 68.94 95.77 L 68.23 95.06 L 68.23 92.96 L 67.53 92.26 L 67.53 89.45 L 66.83 88.75 L 66.83 86.65 Z M 49.30 83.84 L 51.40 83.84 L 52.10 84.55 L 52.81 83.84 L 53.51 83.84 L 54.21 84.55 L 54.91 83.84 L 61.92 83.84 L 62.62 83.14 L 61.92 82.44 L 52.10 82.44 L 51.40 83.14 L 50.00 83.14 Z M 45.79 66.31 L 45.79 69.12 L 46.49 69.82 L 46.49 82.44 L 47.19 83.14 L 47.19 81.74 L 47.90 81.04 L 47.90 72.62 L 47.19 71.92 L 47.19 69.12 L 46.49 68.42 L 46.49 67.01 Z M 45.79 6.00 L 43.69 6.00 L 42.29 8.10 L 40.18 20.73 L 40.88 81.74 L 34.57 99.27 L 34.57 113.30 L 36.68 97.17 L 40.88 84.55 L 44.39 83.84 L 42.29 82.44 L 41.58 62.81 L 42.29 17.92 L 44.39 8.10 L 46.49 10.21 L 57.01 45.97 L 64.73 82.44 L 60.52 52.29 L 50.70 17.92 Z` },
    14: { silhouette: `M 52.88 6.00 L 50.32 7.28 L 45.85 18.14 L 39.46 42.43 L 36.26 62.24 L 35.62 81.41 L 33.70 87.80 L 31.79 102.50 L 31.79 108.89 L 33.07 112.72 L 34.34 113.36 L 38.18 113.36 L 44.57 110.80 L 52.24 111.44 L 56.07 110.17 L 61.82 110.17 L 65.66 108.25 L 67.57 105.05 L 66.93 90.36 L 64.38 80.77 L 61.82 75.66 L 59.27 50.09 L 54.79 23.89 L 54.79 9.83 Z`, lines: `M 37.54 90.99 L 37.54 92.91 L 36.90 93.55 L 36.90 94.83 L 36.26 95.47 L 36.26 98.66 L 35.62 99.30 L 35.62 101.22 L 36.26 100.58 L 36.26 98.66 L 36.90 98.02 L 36.90 96.11 L 37.54 95.47 Z M 52.88 6.00 L 50.32 7.28 L 45.85 18.14 L 39.46 42.43 L 36.26 62.24 L 35.62 81.41 L 33.70 87.80 L 31.79 102.50 L 31.79 108.89 L 33.07 112.72 L 34.34 113.36 L 38.18 113.36 L 44.57 110.80 L 52.24 111.44 L 56.07 110.17 L 61.82 110.17 L 65.66 108.25 L 67.57 105.05 L 66.93 90.36 L 64.38 80.77 L 61.82 75.66 L 59.27 50.09 L 54.79 23.89 L 54.79 9.83 Z M 52.24 9.20 L 53.51 15.59 L 53.51 27.73 L 56.71 41.79 L 61.18 75.66 L 45.85 76.93 L 41.37 78.21 L 38.82 80.77 L 48.40 78.21 L 61.18 77.57 L 66.30 94.19 L 66.30 105.05 L 61.82 108.89 L 52.88 109.53 L 52.24 107.61 L 38.82 105.05 L 36.90 107.61 L 43.29 106.33 L 51.60 108.25 L 52.24 109.53 L 42.65 109.53 L 34.98 112.08 L 33.70 110.80 L 33.07 104.41 L 37.54 78.85 L 37.54 66.07 L 43.93 29.64 L 50.96 9.83 Z` },
    13: { silhouette: `M 42.07 6.00 L 42.68 22.47 L 32.92 101.80 L 35.36 106.07 L 43.29 111.56 L 50.00 113.39 L 64.03 107.90 L 66.47 98.75 L 56.10 52.98 L 52.44 17.59 L 48.17 6.00 L 46.34 6.00 L 51.83 22.47 L 54.27 52.37 L 59.76 78.61 L 41.46 74.95 L 60.37 80.44 L 64.64 96.92 L 64.64 104.85 L 60.98 107.90 L 47.56 112.17 L 34.14 101.80 L 43.90 27.36 L 43.90 6.00 Z`, lines: `M 36.58 102.41 L 37.19 102.41 L 38.41 103.63 L 39.63 103.63 L 41.46 105.46 L 42.07 105.46 L 44.51 107.90 L 43.90 107.29 L 43.90 106.07 L 40.85 103.02 L 40.24 103.02 L 39.63 102.41 Z M 39.63 82.27 L 39.63 82.88 L 39.02 83.49 L 39.02 85.32 L 38.41 85.93 L 38.41 88.37 L 37.80 88.98 L 37.80 91.42 L 37.19 92.03 L 37.19 94.47 L 36.58 95.08 L 36.58 98.14 L 36.58 96.92 L 37.19 96.31 L 37.19 95.08 L 37.80 94.47 L 37.80 92.64 L 38.41 92.03 L 38.41 89.59 L 39.02 88.98 L 39.02 84.71 L 39.63 84.10 Z M 42.07 6.00 L 42.68 22.47 L 32.92 101.80 L 35.36 106.07 L 43.29 111.56 L 50.00 113.39 L 64.03 107.90 L 66.47 98.75 L 56.10 52.98 L 52.44 17.59 L 48.17 6.00 L 46.34 6.00 L 51.83 22.47 L 54.27 52.37 L 59.76 78.61 L 41.46 74.95 L 60.37 80.44 L 64.64 96.92 L 64.64 104.85 L 60.98 107.90 L 47.56 112.17 L 34.14 101.80 L 43.90 27.36 L 43.90 6.00 Z` },
    12: { silhouette: `M 42.98 6.00 L 40.54 12.71 L 39.32 22.47 L 39.32 42.00 L 40.54 51.76 L 39.93 62.75 L 37.49 71.90 L 34.44 98.75 L 35.66 104.85 L 41.76 112.17 L 44.20 113.39 L 52.14 113.39 L 58.85 110.95 L 63.73 107.90 L 64.95 99.36 L 64.34 90.81 L 62.51 82.88 L 61.90 62.75 L 59.46 47.49 L 52.14 29.19 L 46.03 6.00 Z`, lines: `M 39.32 84.10 L 39.32 89.59 L 38.71 90.20 L 38.71 98.14 L 38.10 98.75 L 38.71 99.36 L 38.71 101.19 L 39.32 101.80 L 39.32 103.02 L 39.93 103.63 L 39.93 84.10 Z M 41.76 80.44 L 43.59 82.27 L 44.20 82.27 L 44.81 82.88 L 52.14 82.88 L 52.75 82.27 L 58.24 82.27 L 58.85 81.66 L 58.24 81.05 L 45.42 81.05 L 44.81 80.44 Z M 42.98 6.00 L 40.54 12.71 L 39.32 22.47 L 39.32 42.00 L 40.54 51.76 L 39.93 62.75 L 37.49 71.90 L 34.44 98.75 L 35.66 104.85 L 41.76 112.17 L 44.20 113.39 L 52.14 113.39 L 58.85 110.95 L 63.73 107.90 L 64.95 99.36 L 64.34 90.81 L 62.51 82.88 L 61.90 62.75 L 59.46 47.49 L 52.14 29.19 L 46.03 6.00 Z M 44.20 7.83 L 46.03 9.66 L 48.47 23.08 L 56.41 43.22 L 58.85 51.76 L 60.68 68.24 L 60.07 69.46 L 60.68 80.44 L 63.12 92.03 L 62.51 107.29 L 60.07 109.12 L 50.31 112.78 L 45.42 112.78 L 42.98 111.56 L 38.71 107.29 L 38.71 106.07 L 36.27 103.02 L 36.27 93.25 L 38.10 78.00 L 41.76 60.31 L 41.15 21.25 L 42.37 11.49 Z` },
    11: { silhouette: `M 61.59 6.00 L 62.20 30.41 L 69.53 85.93 L 68.92 108.51 L 67.08 111.56 L 42.07 112.17 L 32.31 110.34 L 29.86 106.07 L 33.53 77.39 L 45.73 71.29 L 55.49 71.29 L 65.86 76.17 L 59.76 71.29 L 48.17 69.46 L 42.07 70.68 L 32.92 76.78 L 54.88 6.61 L 53.05 6.00 L 29.86 84.71 L 28.64 107.90 L 30.47 110.95 L 37.19 112.78 L 60.98 113.39 L 69.53 110.34 L 70.75 86.54 Z`, lines: `M 32.31 97.53 L 32.31 104.85 L 34.14 107.90 L 34.75 107.29 L 34.75 106.68 L 33.53 104.85 L 33.53 103.02 L 32.92 102.41 L 32.92 99.36 L 32.31 98.75 Z M 65.25 81.66 L 65.25 104.85 L 64.64 105.46 L 64.64 106.68 L 64.03 107.29 L 64.03 107.90 L 64.64 107.90 L 64.64 107.29 L 65.86 106.07 L 65.86 103.02 L 66.47 102.41 L 66.47 90.20 L 65.86 89.59 L 65.86 84.10 L 65.25 83.49 Z M 61.59 6.00 L 62.20 30.41 L 69.53 85.93 L 68.92 108.51 L 67.08 111.56 L 42.07 112.17 L 32.31 110.34 L 29.86 106.07 L 33.53 77.39 L 45.73 71.29 L 55.49 71.29 L 65.86 76.17 L 59.76 71.29 L 48.17 69.46 L 42.07 70.68 L 32.92 76.78 L 54.88 6.61 L 53.05 6.00 L 29.86 84.71 L 28.64 107.90 L 30.47 110.95 L 37.19 112.78 L 60.98 113.39 L 69.53 110.34 L 70.75 86.54 Z` },
    21: { silhouette: `M 61.59 6.00 L 62.20 30.41 L 69.53 85.93 L 68.92 108.51 L 67.08 111.56 L 42.07 112.17 L 32.31 110.34 L 29.86 106.07 L 33.53 77.39 L 45.73 71.29 L 55.49 71.29 L 65.86 76.17 L 59.76 71.29 L 48.17 69.46 L 42.07 70.68 L 32.92 76.78 L 54.88 6.61 L 53.05 6.00 L 29.86 84.71 L 28.64 107.90 L 30.47 110.95 L 37.19 112.78 L 60.98 113.39 L 69.53 110.34 L 70.75 86.54 Z`, lines: `M 32.31 97.53 L 32.31 104.85 L 34.14 107.90 L 34.75 107.29 L 34.75 106.68 L 33.53 104.85 L 33.53 103.02 L 32.92 102.41 L 32.92 99.36 L 32.31 98.75 Z M 65.25 81.66 L 65.25 104.85 L 64.64 105.46 L 64.64 106.68 L 64.03 107.29 L 64.03 107.90 L 64.64 107.90 L 64.64 107.29 L 65.86 106.07 L 65.86 103.02 L 66.47 102.41 L 66.47 90.20 L 65.86 89.59 L 65.86 84.10 L 65.25 83.49 Z M 61.59 6.00 L 62.20 30.41 L 69.53 85.93 L 68.92 108.51 L 67.08 111.56 L 42.07 112.17 L 32.31 110.34 L 29.86 106.07 L 33.53 77.39 L 45.73 71.29 L 55.49 71.29 L 65.86 76.17 L 59.76 71.29 L 48.17 69.46 L 42.07 70.68 L 32.92 76.78 L 54.88 6.61 L 53.05 6.00 L 29.86 84.71 L 28.64 107.90 L 30.47 110.95 L 37.19 112.78 L 60.98 113.39 L 69.53 110.34 L 70.75 86.54 Z` },
    22: { silhouette: `M 55.80 6.00 L 53.36 6.00 L 48.47 24.92 L 39.93 46.88 L 37.49 61.53 L 37.49 76.78 L 35.05 90.20 L 35.05 106.68 L 36.88 109.12 L 46.64 113.39 L 54.58 113.39 L 57.63 112.17 L 60.68 109.12 L 64.34 102.41 L 64.34 92.64 L 62.51 76.78 L 58.85 59.69 L 60.07 24.92 L 58.24 10.27 Z`, lines: `M 60.07 84.10 L 59.46 84.10 L 59.46 103.02 L 58.85 103.63 L 58.85 104.24 L 60.07 103.02 L 60.07 102.41 L 60.68 101.80 L 60.68 92.03 L 60.07 91.42 Z M 57.02 80.44 L 55.80 80.44 L 55.19 81.05 L 41.15 81.05 L 40.54 81.66 L 41.15 82.27 L 46.03 82.27 L 46.64 82.88 L 53.97 82.88 L 54.58 82.27 L 55.80 82.27 L 57.02 81.05 Z M 55.80 6.00 L 53.36 6.00 L 48.47 24.92 L 39.93 46.88 L 37.49 61.53 L 37.49 76.78 L 35.05 90.20 L 35.05 106.68 L 36.88 109.12 L 46.64 113.39 L 54.58 113.39 L 57.63 112.17 L 60.68 109.12 L 64.34 102.41 L 64.34 92.64 L 62.51 76.78 L 58.85 59.69 L 60.07 24.92 L 58.24 10.27 Z M 55.19 7.83 L 57.02 12.10 L 58.24 21.25 L 57.63 61.53 L 60.68 73.73 L 63.12 93.86 L 63.12 102.41 L 60.07 107.90 L 56.41 111.56 L 53.97 112.78 L 49.08 112.78 L 40.54 109.73 L 36.27 106.68 L 36.27 90.20 L 38.71 80.44 L 38.71 65.19 L 40.54 51.15 L 50.31 24.31 L 53.36 9.66 Z` },
    23: { silhouette: `M 57.32 6.00 L 55.49 6.00 L 54.88 23.08 L 65.25 101.19 L 62.20 105.46 L 51.83 112.17 L 38.41 107.90 L 34.75 104.85 L 34.75 96.92 L 39.02 81.05 L 57.93 74.95 L 39.63 78.61 L 45.73 46.88 L 47.56 21.86 L 53.05 6.00 L 51.22 6.00 L 46.34 20.03 L 43.29 52.37 L 32.92 98.14 L 32.92 104.24 L 35.97 108.51 L 49.39 113.39 L 53.05 113.39 L 64.03 106.07 L 66.47 101.19 L 56.71 23.69 Z`, lines: `M 62.20 102.41 L 59.76 102.41 L 59.15 103.02 L 57.32 103.63 L 56.71 104.24 L 56.71 104.85 L 55.49 106.07 L 54.88 107.90 L 57.93 104.85 L 59.76 104.24 L 60.98 103.02 L 61.59 103.02 Z M 59.76 81.66 L 59.76 87.15 L 60.37 87.76 L 60.37 90.20 L 60.98 90.81 L 60.98 92.64 L 61.59 93.25 L 61.59 95.08 L 62.81 96.92 L 62.20 96.31 L 62.20 93.25 L 61.59 92.64 L 61.59 90.20 L 60.98 89.59 L 60.98 87.15 L 60.37 86.54 L 60.37 84.10 L 59.76 83.49 Z M 57.32 6.00 L 55.49 6.00 L 54.88 23.08 L 65.25 101.19 L 62.20 105.46 L 51.83 112.17 L 38.41 107.90 L 34.75 104.85 L 34.75 96.92 L 39.02 81.05 L 57.93 74.95 L 39.63 78.61 L 45.73 46.88 L 47.56 21.86 L 53.05 6.00 L 51.22 6.00 L 46.34 20.03 L 43.29 52.37 L 32.92 98.14 L 32.92 104.24 L 35.97 108.51 L 49.39 113.39 L 53.05 113.39 L 64.03 106.07 L 66.47 101.19 L 56.71 23.69 Z` },
    24: { silhouette: `M 47.44 6.00 L 44.89 8.56 L 44.25 29.01 L 40.41 48.82 L 37.86 74.38 L 33.38 87.16 L 31.47 102.50 L 33.38 107.61 L 37.86 110.17 L 57.03 111.44 L 61.50 113.36 L 65.34 113.36 L 67.25 110.80 L 67.89 103.78 L 65.98 88.44 L 63.42 78.21 L 62.78 58.40 L 56.39 25.81 L 49.36 7.28 Z`, lines: `M 61.50 89.72 L 61.50 92.27 L 62.14 92.91 L 62.14 95.47 L 62.78 96.11 L 62.78 98.66 L 63.42 99.30 L 63.42 100.58 L 63.42 95.47 L 62.78 94.83 L 62.78 92.91 L 62.14 92.27 L 62.14 90.99 L 61.50 90.36 Z M 47.44 6.00 L 44.89 8.56 L 44.25 29.01 L 40.41 48.82 L 37.86 74.38 L 33.38 87.16 L 31.47 102.50 L 33.38 107.61 L 37.86 110.17 L 57.03 111.44 L 61.50 113.36 L 65.34 113.36 L 67.25 110.80 L 67.89 103.78 L 65.98 88.44 L 63.42 78.21 L 62.78 58.40 L 56.39 25.81 L 49.36 7.28 Z M 37.86 78.21 L 39.14 77.57 L 51.28 78.21 L 51.92 78.85 L 57.67 79.49 L 58.31 80.13 L 61.50 80.77 L 62.78 82.05 L 62.78 83.96 L 63.42 84.60 L 63.42 86.52 L 64.70 89.72 L 65.34 99.30 L 65.98 99.94 L 65.98 102.50 L 66.62 103.14 L 65.98 110.80 L 64.70 112.08 L 62.78 112.08 L 56.39 109.53 L 52.56 109.53 L 51.92 110.17 L 48.72 110.17 L 48.08 109.53 L 48.72 108.25 L 55.11 106.97 L 55.75 106.33 L 60.22 106.33 L 62.78 107.61 L 62.78 106.97 L 60.22 105.05 L 55.75 105.05 L 50.64 106.97 L 48.72 106.97 L 47.44 107.61 L 47.44 108.89 L 46.80 109.53 L 44.25 109.53 L 43.61 108.89 L 37.86 108.89 L 34.02 106.33 L 32.75 103.78 L 32.75 98.02 L 33.38 97.38 L 33.38 93.55 L 34.02 92.91 L 34.66 87.80 L 35.30 87.16 L 36.58 80.77 Z M 47.44 9.83 L 48.72 10.47 L 50.64 14.31 L 50.64 16.22 L 51.92 18.14 L 53.20 23.89 L 55.11 28.37 L 55.11 30.28 L 57.03 36.04 L 57.03 38.59 L 57.67 39.23 L 57.67 41.79 L 58.31 42.43 L 58.95 49.46 L 59.59 50.09 L 60.86 60.32 L 61.50 60.96 L 61.50 69.91 L 62.14 70.54 L 62.14 80.13 L 61.50 80.77 L 58.31 78.21 L 54.47 77.57 L 53.83 76.93 L 50.00 76.93 L 49.36 76.30 L 39.14 76.30 L 38.50 75.66 L 38.50 71.82 L 39.14 71.18 L 39.78 63.51 L 40.41 62.88 L 41.05 55.21 L 41.69 54.57 L 41.69 49.46 L 42.33 48.82 L 42.33 45.62 L 42.97 44.98 L 43.61 38.59 L 44.25 37.95 L 44.89 31.56 L 45.53 30.92 L 45.53 26.45 L 46.17 25.81 L 46.17 13.03 Z` },
    25: { silhouette: `M 53.86 6.00 L 51.05 10.91 L 39.83 49.48 L 34.22 81.74 L 35.62 81.74 L 40.53 53.69 L 52.45 12.31 L 55.26 9.51 L 57.36 18.62 L 58.06 60.70 L 56.66 72.62 L 57.36 82.44 L 54.56 83.14 L 58.06 84.55 L 60.87 90.86 L 63.68 102.08 L 63.68 111.90 L 65.08 113.30 L 64.38 96.47 L 58.06 76.83 L 59.47 65.61 L 59.47 22.83 L 57.36 8.81 L 55.96 6.00 Z`, lines: `M 60.87 109.79 L 59.47 109.79 L 58.77 110.49 L 56.66 110.49 L 54.56 111.90 L 53.16 111.90 L 52.45 112.60 L 51.75 112.60 L 56.66 112.60 Z M 36.32 109.09 L 37.03 109.79 L 39.13 110.49 L 40.53 111.90 L 41.94 111.90 L 42.64 112.60 L 43.34 112.60 L 44.04 113.30 L 46.14 114.00 L 43.34 111.19 L 42.64 111.19 L 40.53 109.79 L 39.13 109.79 L 38.43 109.09 Z M 33.52 83.84 L 33.52 85.25 L 32.82 85.95 L 32.82 88.05 L 32.12 88.75 L 32.12 91.56 L 31.42 92.26 L 31.42 94.36 L 30.71 95.06 L 30.71 97.87 L 30.01 98.57 L 30.01 104.18 L 29.31 104.88 L 30.01 106.29 L 30.01 109.79 L 33.52 113.30 L 43.34 118.21 L 48.95 118.21 L 49.65 117.51 L 64.38 117.51 L 64.38 115.40 L 63.68 116.10 L 59.47 116.10 L 58.77 115.40 L 48.95 115.40 L 48.25 116.10 L 44.04 116.10 L 43.34 115.40 L 41.94 115.40 L 40.53 114.00 L 37.73 112.60 L 36.32 112.60 L 31.42 108.39 L 31.42 100.68 L 32.12 99.97 L 32.12 96.47 L 32.82 95.77 L 32.82 93.66 L 33.52 92.96 L 33.52 89.45 L 34.22 88.75 L 34.22 83.84 Z M 37.03 83.14 L 37.73 83.84 L 45.44 83.84 L 46.14 84.55 L 47.55 84.55 L 48.25 83.84 L 50.35 83.84 L 49.65 83.84 L 48.95 83.14 L 47.55 83.14 L 46.84 82.44 L 37.73 82.44 Z M 53.16 66.31 L 53.16 67.71 L 52.45 68.42 L 52.45 71.92 L 51.75 72.62 L 51.75 81.74 L 52.45 82.44 L 52.45 83.14 L 52.45 82.44 L 53.16 81.74 L 53.16 69.12 L 53.86 68.42 L 53.16 67.71 Z M 53.86 6.00 L 51.05 10.91 L 39.83 49.48 L 34.22 81.74 L 35.62 81.74 L 40.53 53.69 L 52.45 12.31 L 55.26 9.51 L 57.36 18.62 L 58.06 60.70 L 56.66 72.62 L 57.36 82.44 L 54.56 83.14 L 58.06 84.55 L 60.87 90.86 L 63.68 102.08 L 63.68 111.90 L 65.08 113.30 L 64.38 96.47 L 58.06 76.83 L 59.47 65.61 L 59.47 22.83 L 57.36 8.81 L 55.96 6.00 Z` },
    26: { silhouette: `M 70.21 6.00 L 67.42 6.00 L 66.03 8.09 L 66.03 26.90 L 63.94 35.96 L 56.97 46.41 L 53.48 44.32 L 51.39 39.45 L 50.70 10.18 L 48.61 9.48 L 45.12 12.97 L 39.55 29.69 L 37.46 28.99 L 37.46 7.39 L 32.58 8.79 L 27.01 20.63 L 24.92 29.69 L 24.92 40.84 L 29.10 56.86 L 29.79 66.62 L 22.13 84.74 L 20.04 96.58 L 22.83 105.64 L 33.97 113.30 L 44.43 112.61 L 50.00 110.52 L 68.12 112.61 L 75.08 109.12 L 79.26 102.85 L 78.57 94.49 L 72.30 72.89 L 72.30 65.23 L 76.48 45.72 L 76.48 27.60 L 73.69 13.66 Z`, lines: `M 59.06 102.85 L 59.75 102.85 L 61.85 104.25 L 63.94 104.25 L 64.63 104.94 L 67.42 104.94 L 68.12 105.64 L 70.21 105.64 L 70.90 106.34 L 71.60 105.64 L 72.99 105.64 L 73.69 104.94 L 72.30 104.94 L 71.60 104.25 L 68.12 104.25 L 67.42 103.55 L 63.94 103.55 L 63.24 102.85 Z M 24.92 100.76 L 24.92 102.15 L 25.61 102.85 L 26.31 102.85 L 29.79 104.94 L 38.85 104.94 L 39.55 104.25 L 40.94 104.25 L 40.25 104.25 L 39.55 103.55 L 30.49 103.55 L 29.79 102.85 L 28.40 102.85 Z M 70.21 6.00 L 67.42 6.00 L 66.03 8.09 L 66.03 26.90 L 63.94 35.96 L 56.97 46.41 L 53.48 44.32 L 51.39 39.45 L 50.70 10.18 L 48.61 9.48 L 45.12 12.97 L 39.55 29.69 L 37.46 28.99 L 37.46 7.39 L 32.58 8.79 L 27.01 20.63 L 24.92 29.69 L 24.92 40.84 L 29.10 56.86 L 29.79 66.62 L 22.13 84.74 L 20.04 96.58 L 22.83 105.64 L 33.97 113.30 L 44.43 112.61 L 50.00 110.52 L 68.12 112.61 L 75.08 109.12 L 79.26 102.85 L 78.57 94.49 L 72.30 72.89 L 72.30 65.23 L 76.48 45.72 L 76.48 27.60 L 73.69 13.66 Z M 47.91 11.57 L 48.61 11.57 L 49.30 12.27 L 49.30 38.05 L 50.00 38.75 L 50.00 40.84 L 50.70 41.54 L 50.70 42.23 L 51.39 42.93 L 52.09 45.02 L 54.18 47.11 L 54.18 48.50 L 52.09 49.90 L 47.91 49.90 L 43.03 45.02 L 43.03 44.32 L 41.64 42.23 L 41.64 40.84 L 40.25 38.75 L 40.25 37.35 L 39.55 36.66 L 39.55 34.57 L 40.25 33.87 L 40.25 31.78 L 40.94 31.08 L 40.94 28.30 L 41.64 27.60 L 41.64 25.51 L 42.34 24.81 L 42.34 22.72 L 43.03 22.03 L 43.03 20.63 L 43.73 19.94 L 43.73 18.54 L 44.43 17.85 L 44.43 16.45 L 45.82 15.06 L 45.82 14.36 L 47.21 12.97 L 47.21 12.27 Z M 69.51 8.79 L 73.69 23.42 L 75.08 37.35 L 70.21 70.80 L 77.17 95.88 L 77.17 104.94 L 69.51 110.52 L 53.48 108.43 L 34.67 111.21 L 26.31 107.03 L 22.13 100.76 L 23.52 87.52 L 29.10 74.28 L 33.97 73.59 L 52.09 79.86 L 60.45 79.86 L 68.12 74.98 L 59.06 78.46 L 52.09 78.46 L 30.49 72.19 L 31.88 59.65 L 27.01 40.84 L 27.01 26.90 L 33.28 10.88 L 36.06 9.48 L 36.06 31.78 L 38.85 40.84 L 45.82 51.29 L 55.57 54.77 L 52.79 51.29 L 61.15 45.02 L 66.72 32.48 L 68.12 9.48 Z` },
    27: { silhouette: `M 40.45 6.00 L 34.57 11.14 L 29.43 19.22 L 25.76 30.98 L 28.69 63.31 L 21.35 89.76 L 22.08 101.51 L 25.02 108.12 L 31.63 113.27 L 37.51 113.27 L 50.00 109.59 L 72.04 111.06 L 74.98 108.86 L 77.92 100.04 L 76.45 85.35 L 72.04 69.18 L 72.78 58.16 L 77.18 47.14 L 77.92 40.53 L 75.71 22.90 L 71.31 11.88 L 69.10 9.67 L 66.90 10.41 L 64.69 33.92 L 62.49 34.65 L 58.82 16.29 L 56.61 11.88 L 52.94 10.41 L 46.33 32.45 L 44.12 34.65 L 43.39 17.02 L 44.86 6.73 Z`, lines: `M 58.08 104.45 L 58.82 104.45 L 61.02 105.92 L 62.49 105.92 L 63.22 106.65 L 69.84 106.65 L 72.04 105.18 L 72.04 104.45 L 71.31 105.18 L 69.10 105.18 L 68.37 105.92 L 65.43 105.92 L 64.69 105.18 L 61.76 105.18 L 61.02 104.45 Z M 27.96 103.71 L 27.96 104.45 L 29.43 105.92 L 32.37 105.92 L 33.10 106.65 L 34.57 106.65 L 35.31 105.92 L 40.45 105.92 L 41.18 105.18 L 44.12 105.18 L 44.86 104.45 L 47.80 104.45 L 47.80 103.71 L 41.92 103.71 L 41.18 104.45 L 37.51 104.45 L 36.78 105.18 L 30.90 105.18 L 30.16 104.45 L 28.69 104.45 Z M 31.63 69.18 L 32.37 69.92 L 33.10 69.92 L 33.84 70.65 L 34.57 70.65 L 38.24 72.86 L 39.71 72.86 L 40.45 73.59 L 43.39 73.59 L 44.12 74.33 L 55.14 74.33 L 55.88 73.59 L 60.29 73.59 L 61.02 72.86 L 62.49 72.86 L 63.22 72.12 L 63.96 72.12 L 65.43 70.65 L 63.22 70.65 L 62.49 71.39 L 60.29 71.39 L 59.55 72.12 L 55.88 72.12 L 55.14 72.86 L 43.39 72.86 L 42.65 72.12 L 40.45 72.12 L 39.71 71.39 L 38.24 71.39 L 37.51 70.65 L 36.04 70.65 L 33.84 69.18 Z M 40.45 6.00 L 34.57 11.14 L 29.43 19.22 L 25.76 30.98 L 28.69 63.31 L 21.35 89.76 L 22.08 101.51 L 25.02 108.12 L 31.63 113.27 L 37.51 113.27 L 50.00 109.59 L 72.04 111.06 L 74.98 108.86 L 77.92 100.04 L 76.45 85.35 L 72.04 69.18 L 72.78 58.16 L 77.18 47.14 L 77.92 40.53 L 75.71 22.90 L 71.31 11.88 L 69.10 9.67 L 66.90 10.41 L 64.69 33.92 L 62.49 34.65 L 58.82 16.29 L 56.61 11.88 L 52.94 10.41 L 46.33 32.45 L 44.12 34.65 L 43.39 17.02 L 44.86 6.73 Z M 55.14 13.35 L 55.88 14.08 L 55.88 15.55 L 56.61 16.29 L 56.61 17.76 L 57.35 18.49 L 57.35 19.96 L 58.08 20.69 L 58.08 23.63 L 58.82 24.37 L 58.82 26.57 L 59.55 27.31 L 59.55 30.98 L 60.29 31.71 L 60.29 34.65 L 61.02 35.39 L 61.02 37.59 L 61.76 38.33 L 61.76 39.06 L 61.02 39.80 L 61.02 40.53 L 58.82 42.73 L 58.08 42.73 L 56.61 44.20 L 55.88 44.20 L 55.14 44.94 L 50.00 44.94 L 46.33 41.27 L 46.33 40.53 L 44.86 38.33 L 44.86 36.86 L 45.59 36.12 L 45.59 34.65 L 47.80 30.98 L 47.80 29.51 L 50.00 25.84 L 50.00 24.37 L 50.73 23.63 L 50.73 22.16 L 51.47 21.43 L 51.47 19.96 L 52.20 19.22 L 52.20 17.02 L 52.94 16.29 L 52.94 14.08 L 53.67 13.35 Z M 41.18 7.47 L 43.39 8.20 L 41.18 22.90 L 41.92 35.39 L 45.59 43.47 L 50.00 47.14 L 55.14 47.14 L 63.22 40.53 L 67.63 28.04 L 68.37 11.88 L 72.78 18.49 L 76.45 36.12 L 75.71 46.41 L 70.57 61.84 L 70.57 69.92 L 73.51 79.47 L 76.45 98.57 L 73.51 108.86 L 68.37 109.59 L 52.94 107.39 L 32.37 112.53 L 26.49 107.39 L 24.29 102.24 L 23.55 89.02 L 30.16 64.78 L 30.16 51.55 L 27.22 34.65 L 27.96 28.78 L 34.57 14.08 Z` },
    28: { silhouette: `M 38.84 6.00 L 37.40 7.44 L 35.24 26.88 L 29.48 52.08 L 30.92 72.96 L 23.72 89.52 L 23.00 96.00 L 24.44 105.36 L 25.88 108.24 L 30.92 111.84 L 37.40 112.56 L 51.08 111.12 L 56.84 113.28 L 64.04 113.28 L 69.08 111.12 L 75.56 104.64 L 76.28 93.84 L 74.12 83.04 L 67.64 70.80 L 69.80 60.00 L 69.80 47.76 L 67.64 34.80 L 67.64 25.44 L 69.80 13.20 L 69.08 8.16 L 65.48 8.88 L 61.88 12.48 L 58.28 19.68 L 56.12 20.40 L 55.40 8.16 L 53.96 7.44 L 51.08 10.32 L 48.20 17.52 L 46.04 18.96 L 42.44 7.44 Z`, lines: `M 28.76 104.64 L 28.76 106.08 L 30.20 107.52 L 30.92 107.52 L 31.64 108.24 L 38.84 108.24 L 39.56 107.52 L 42.44 107.52 L 43.16 106.80 L 45.32 106.80 L 46.04 106.08 L 47.48 106.08 L 46.76 105.36 L 41.00 105.36 L 40.28 106.08 L 36.68 106.08 L 35.96 106.80 L 32.36 106.80 L 31.64 106.08 L 30.92 106.08 L 29.48 104.64 Z M 64.04 74.40 L 62.60 72.96 L 61.16 72.96 L 60.44 72.24 L 51.80 72.24 L 51.08 72.96 L 45.32 72.96 L 44.60 73.68 L 35.24 73.68 L 34.52 74.40 L 34.52 75.12 L 48.20 75.12 L 48.92 74.40 L 54.68 74.40 L 55.40 73.68 L 59.00 73.68 L 59.72 74.40 Z M 38.84 6.00 L 37.40 7.44 L 35.24 26.88 L 29.48 52.08 L 30.92 72.96 L 23.72 89.52 L 23.00 96.00 L 24.44 105.36 L 25.88 108.24 L 30.92 111.84 L 37.40 112.56 L 51.08 111.12 L 56.84 113.28 L 64.04 113.28 L 69.08 111.12 L 75.56 104.64 L 76.28 93.84 L 74.12 83.04 L 67.64 70.80 L 69.80 60.00 L 69.80 47.76 L 67.64 34.80 L 67.64 25.44 L 69.80 13.20 L 69.08 8.16 L 65.48 8.88 L 61.88 12.48 L 58.28 19.68 L 56.12 20.40 L 55.40 8.16 L 53.96 7.44 L 51.08 10.32 L 48.20 17.52 L 46.04 18.96 L 42.44 7.44 Z M 53.96 10.32 L 54.68 11.04 L 54.68 28.32 L 53.24 30.48 L 53.24 31.92 L 51.80 33.36 L 51.08 33.36 L 49.64 31.20 L 49.64 29.04 L 48.92 28.32 L 48.92 26.16 L 48.20 25.44 L 48.20 24.00 L 47.48 23.28 L 47.48 21.84 L 48.20 21.12 L 48.20 19.68 L 48.92 18.96 L 48.92 18.24 L 51.08 14.64 L 51.08 13.20 L 51.80 12.48 L 51.80 11.76 L 53.24 10.32 Z M 39.56 7.44 L 41.00 8.16 L 48.92 34.80 L 51.80 36.96 L 63.32 13.92 L 66.20 10.32 L 67.64 11.04 L 66.20 36.96 L 68.36 59.28 L 66.20 71.52 L 72.68 85.20 L 74.12 103.20 L 69.80 107.52 L 57.56 106.80 L 64.76 108.96 L 65.48 110.40 L 64.04 111.84 L 58.28 111.84 L 52.52 109.68 L 30.92 110.40 L 25.88 104.64 L 25.16 92.40 L 32.36 74.40 L 30.92 54.96 L 37.40 26.16 L 38.12 8.88 Z` },
    48: { silhouette: `M 72.50 6.75 L 65.75 6.00 L 57.50 6.75 L 48.50 9.75 L 32.75 9.75 L 26.00 12.00 L 21.50 16.50 L 21.50 30.00 L 31.25 56.25 L 29.75 96.00 L 32.00 108.00 L 35.75 113.25 L 40.25 112.50 L 47.00 90.00 L 51.50 84.75 L 53.75 85.50 L 56.00 90.75 L 58.25 102.00 L 58.25 110.25 L 59.75 113.25 L 62.75 113.25 L 66.50 111.00 L 72.50 100.50 L 77.00 83.25 L 76.25 36.75 L 78.50 24.00 L 76.25 10.50 Z`, lines: `M 69.50 53.25 L 68.75 52.50 L 59.75 52.50 L 59.00 53.25 L 51.50 53.25 L 50.75 54.00 L 44.75 54.00 L 44.75 54.75 L 59.00 54.75 L 59.75 54.00 L 62.75 54.00 L 63.50 53.25 Z M 67.25 12.00 L 63.50 12.00 L 62.75 12.75 L 61.25 12.75 L 59.00 14.25 L 57.50 14.25 L 55.25 15.75 L 53.75 15.75 L 53.00 16.50 L 50.75 16.50 L 50.00 17.25 L 44.75 17.25 L 44.00 16.50 L 39.50 16.50 L 38.75 15.75 L 38.75 16.50 L 39.50 16.50 L 41.75 18.00 L 44.00 18.00 L 44.75 18.75 L 48.50 18.75 L 49.25 18.00 L 53.00 18.00 L 53.75 17.25 L 55.25 17.25 L 56.00 16.50 L 57.50 16.50 L 58.25 15.75 L 59.00 15.75 L 59.75 15.00 L 60.50 15.00 L 61.25 14.25 L 62.00 14.25 L 65.75 12.00 Z M 72.50 6.75 L 65.75 6.00 L 57.50 6.75 L 48.50 9.75 L 32.75 9.75 L 26.00 12.00 L 21.50 16.50 L 21.50 30.00 L 31.25 56.25 L 29.75 96.00 L 32.00 108.00 L 35.75 113.25 L 40.25 112.50 L 47.00 90.00 L 51.50 84.75 L 53.75 85.50 L 56.00 90.75 L 58.25 102.00 L 58.25 110.25 L 59.75 113.25 L 62.75 113.25 L 66.50 111.00 L 72.50 100.50 L 77.00 83.25 L 76.25 36.75 L 78.50 24.00 L 76.25 10.50 Z M 72.50 8.25 L 76.25 13.50 L 77.00 26.25 L 74.00 44.25 L 75.50 81.75 L 71.75 97.50 L 66.50 108.00 L 61.25 111.75 L 59.75 107.25 L 59.00 95.25 L 56.00 84.75 L 54.50 83.25 L 50.00 83.25 L 44.00 92.25 L 39.50 110.25 L 36.50 111.75 L 32.75 105.00 L 31.25 93.75 L 33.50 69.75 L 32.75 54.75 L 23.75 30.75 L 23.75 17.25 L 31.25 12.00 L 50.00 11.25 L 65.75 7.50 Z` },
    47: { silhouette: `M 25.08 6.00 L 18.43 11.82 L 17.60 15.97 L 18.43 32.58 L 24.25 53.35 L 24.25 63.32 L 20.92 84.92 L 20.92 94.06 L 24.25 107.35 L 26.74 111.51 L 30.06 113.17 L 31.72 112.34 L 33.38 99.05 L 40.03 80.77 L 44.18 78.28 L 48.34 83.26 L 50.83 103.20 L 54.98 103.20 L 58.31 99.88 L 59.14 111.51 L 63.29 112.34 L 70.77 104.03 L 75.75 90.74 L 74.09 55.02 L 79.91 37.57 L 81.57 27.60 L 79.08 10.98 L 76.58 7.66 L 72.43 6.00 L 67.45 6.00 L 62.46 8.49 L 43.35 8.49 L 35.05 6.00 Z`, lines: `M 35.88 54.18 L 36.71 55.02 L 39.20 55.02 L 40.03 55.85 L 41.69 55.85 L 42.52 56.68 L 46.68 56.68 L 47.51 57.51 L 59.97 57.51 L 60.80 56.68 L 64.12 56.68 L 64.95 55.85 L 62.46 55.85 L 61.63 56.68 L 50.83 56.68 L 50.00 55.85 L 45.85 55.85 L 45.02 55.02 L 41.69 55.02 L 40.86 54.18 Z M 25.08 6.00 L 18.43 11.82 L 17.60 15.97 L 18.43 32.58 L 24.25 53.35 L 24.25 63.32 L 20.92 84.92 L 20.92 94.06 L 24.25 107.35 L 26.74 111.51 L 30.06 113.17 L 31.72 112.34 L 33.38 99.05 L 40.03 80.77 L 44.18 78.28 L 48.34 83.26 L 50.83 103.20 L 54.98 103.20 L 58.31 99.88 L 59.14 111.51 L 63.29 112.34 L 70.77 104.03 L 75.75 90.74 L 74.09 55.02 L 79.91 37.57 L 81.57 27.60 L 79.08 10.98 L 76.58 7.66 L 72.43 6.00 L 67.45 6.00 L 62.46 8.49 L 43.35 8.49 L 35.05 6.00 Z M 47.51 76.62 L 50.00 76.62 L 50.83 77.45 L 52.49 77.45 L 56.65 81.60 L 56.65 82.43 L 57.48 83.26 L 57.48 84.92 L 58.31 85.75 L 58.31 89.91 L 59.14 90.74 L 59.14 92.40 L 57.48 94.89 L 57.48 96.55 L 56.65 97.38 L 55.82 99.88 L 53.32 102.37 L 52.49 102.37 L 51.66 101.54 L 51.66 90.74 L 50.83 89.91 L 50.83 85.75 L 50.00 84.92 L 50.00 83.26 L 49.17 82.43 L 49.17 80.77 L 46.68 78.28 L 46.68 77.45 Z M 25.91 7.66 L 34.22 7.66 L 42.52 10.15 L 53.32 10.98 L 52.49 12.65 L 41.69 16.80 L 50.83 15.97 L 68.28 7.66 L 72.43 7.66 L 77.42 11.82 L 79.91 25.11 L 72.43 55.85 L 74.09 87.42 L 70.77 99.88 L 65.78 108.18 L 62.46 110.68 L 59.97 109.85 L 59.97 86.58 L 57.48 80.77 L 50.83 75.78 L 43.35 75.78 L 39.20 78.28 L 31.72 95.72 L 30.89 107.35 L 29.23 110.68 L 26.74 109.02 L 25.08 104.86 L 22.58 84.92 L 25.91 64.98 L 25.91 53.35 L 19.26 27.60 L 19.26 17.63 L 21.75 10.98 Z` },
    46: { silhouette: `M 27.12 6.75 L 23.38 9.75 L 21.12 17.25 L 21.12 23.25 L 25.62 45.75 L 24.12 87.75 L 26.38 98.25 L 31.62 110.25 L 34.62 113.25 L 36.88 112.50 L 39.12 108.75 L 39.12 94.50 L 42.12 82.50 L 45.12 76.50 L 47.38 74.25 L 49.62 74.25 L 53.38 78.00 L 56.38 90.00 L 54.88 109.50 L 55.62 111.00 L 57.88 111.00 L 65.38 101.25 L 68.38 93.00 L 70.62 80.25 L 69.88 59.25 L 78.12 27.75 L 78.12 15.75 L 75.88 11.25 L 69.88 9.00 L 45.12 9.75 L 36.12 6.75 Z`, lines: `M 33.12 51.00 L 33.88 51.75 L 39.12 51.75 L 39.88 51.00 L 44.38 51.00 L 45.12 50.25 L 58.62 50.25 L 60.88 51.75 L 65.38 51.75 L 66.12 51.00 L 66.88 51.00 L 66.88 50.25 L 61.62 50.25 L 60.88 49.50 L 60.12 49.50 L 59.38 48.75 L 57.88 48.75 L 57.12 48.00 L 48.12 48.00 L 47.38 48.75 L 42.12 48.75 L 41.38 49.50 L 38.38 49.50 L 37.62 50.25 L 34.62 50.25 L 33.88 51.00 Z M 63.88 13.50 L 62.38 13.50 L 61.62 14.25 L 57.12 14.25 L 56.38 15.00 L 51.12 15.00 L 50.38 15.75 L 38.38 15.75 L 37.62 15.00 L 34.62 15.00 L 35.38 15.75 L 36.12 15.75 L 36.88 16.50 L 38.38 16.50 L 39.12 17.25 L 41.38 17.25 L 42.12 18.00 L 45.88 18.00 L 46.62 17.25 L 51.12 17.25 L 51.88 16.50 L 54.12 16.50 L 54.88 15.75 L 57.12 15.75 L 57.88 15.00 L 60.12 15.00 L 60.88 14.25 L 63.88 14.25 Z M 27.12 6.75 L 23.38 9.75 L 21.12 17.25 L 21.12 23.25 L 25.62 45.75 L 24.12 87.75 L 26.38 98.25 L 31.62 110.25 L 34.62 113.25 L 36.88 112.50 L 39.12 108.75 L 39.12 94.50 L 42.12 82.50 L 45.12 76.50 L 47.38 74.25 L 49.62 74.25 L 53.38 78.00 L 56.38 90.00 L 54.88 109.50 L 55.62 111.00 L 57.88 111.00 L 65.38 101.25 L 68.38 93.00 L 70.62 80.25 L 69.88 59.25 L 78.12 27.75 L 78.12 15.75 L 75.88 11.25 L 69.88 9.00 L 45.12 9.75 L 36.12 6.75 Z M 29.38 8.25 L 36.88 9.00 L 45.88 12.00 L 62.38 10.50 L 71.38 11.25 L 75.88 15.00 L 75.88 29.25 L 68.38 57.00 L 69.12 78.00 L 67.62 88.50 L 64.62 98.25 L 57.88 108.75 L 56.38 108.00 L 58.62 96.75 L 57.12 83.25 L 54.88 76.50 L 49.62 72.00 L 46.62 72.00 L 40.62 81.00 L 36.88 95.25 L 36.12 111.00 L 33.12 109.50 L 29.38 102.00 L 26.38 90.00 L 25.62 78.75 L 27.88 51.00 L 23.38 24.75 L 24.12 13.50 L 25.62 10.50 Z` },
    45: { silhouette: `M 47.11 6.00 L 40.04 11.79 L 32.96 21.43 L 31.68 25.29 L 32.32 34.29 L 36.82 47.79 L 36.82 52.29 L 38.75 58.71 L 54.82 90.21 L 58.68 110.79 L 60.61 113.36 L 62.54 113.36 L 64.46 107.57 L 67.68 89.57 L 67.68 76.71 L 65.75 64.50 L 65.75 56.14 L 63.18 49.71 L 67.68 22.07 L 66.39 17.57 L 54.18 7.29 L 51.61 6.00 Z`, lines: `M 42.61 49.71 L 43.25 49.71 L 43.89 50.36 L 56.75 50.36 L 57.39 49.71 L 59.32 49.71 L 59.96 49.07 L 43.89 49.07 L 43.25 49.71 Z M 47.11 6.00 L 40.04 11.79 L 32.96 21.43 L 31.68 25.29 L 32.32 34.29 L 36.82 47.79 L 36.82 52.29 L 38.75 58.71 L 54.82 90.21 L 58.68 110.79 L 60.61 113.36 L 62.54 113.36 L 64.46 107.57 L 67.68 89.57 L 67.68 76.71 L 65.75 64.50 L 65.75 56.14 L 63.18 49.71 L 67.68 22.07 L 66.39 17.57 L 54.18 7.29 L 51.61 6.00 Z M 47.75 7.93 L 50.96 7.93 L 54.18 9.86 L 65.75 20.14 L 64.46 36.21 L 61.89 48.43 L 64.46 56.79 L 65.11 71.57 L 66.39 77.36 L 66.39 87.64 L 62.54 109.50 L 61.25 110.79 L 59.96 110.14 L 58.68 105.64 L 56.75 90.86 L 40.04 56.79 L 38.75 52.93 L 38.75 47.79 L 35.54 40.07 L 33.61 29.14 L 33.61 24.64 L 38.75 16.29 Z` },
    44: { silhouette: `M 38.36 6.00 L 35.77 8.59 L 31.89 15.70 L 31.89 31.22 L 35.13 42.22 L 34.48 43.51 L 35.13 49.33 L 39.01 62.91 L 40.95 86.84 L 42.89 95.89 L 48.71 110.77 L 52.59 113.35 L 53.88 111.41 L 53.23 92.66 L 53.88 84.25 L 62.29 58.38 L 62.93 44.16 L 66.17 37.04 L 67.46 22.17 L 65.52 16.99 L 62.29 13.76 L 53.88 11.17 L 42.89 6.00 Z`, lines: `M 38.36 40.92 L 38.36 41.57 L 39.65 42.86 L 40.30 42.86 L 42.24 44.16 L 43.53 44.16 L 44.18 44.80 L 45.47 44.80 L 46.12 45.45 L 48.06 45.45 L 48.71 46.10 L 51.94 46.10 L 52.59 46.74 L 54.53 46.74 L 55.17 46.10 L 57.11 46.10 L 59.05 44.80 L 59.05 43.51 L 58.41 43.51 L 56.47 44.80 L 51.94 44.80 L 51.29 44.16 L 48.71 44.16 L 48.06 43.51 L 45.47 43.51 L 44.83 42.86 L 43.53 42.86 L 42.89 42.22 L 41.59 42.22 L 40.95 41.57 L 39.65 41.57 L 39.01 40.92 Z M 62.93 25.40 L 62.93 26.05 L 62.29 26.69 L 62.29 29.28 L 61.64 29.93 L 61.64 31.87 L 60.99 32.51 L 60.99 33.81 L 60.35 34.46 L 60.35 35.75 L 59.70 36.40 L 59.70 37.04 L 59.05 37.69 L 59.05 38.98 L 58.41 39.63 L 59.05 39.63 L 60.99 37.69 L 60.99 36.40 L 61.64 35.75 L 61.64 34.46 L 62.29 33.81 L 62.29 31.22 L 62.93 30.57 Z M 41.59 11.17 L 39.65 11.82 L 39.65 12.47 L 37.71 14.41 L 37.71 15.05 L 36.42 16.99 L 37.71 16.99 L 39.65 15.05 L 39.65 14.41 L 40.95 13.11 Z M 38.36 6.00 L 35.77 8.59 L 31.89 15.70 L 31.89 31.22 L 35.13 42.22 L 34.48 43.51 L 35.13 49.33 L 39.01 62.91 L 40.95 86.84 L 42.89 95.89 L 48.71 110.77 L 52.59 113.35 L 53.88 111.41 L 53.23 92.66 L 53.88 84.25 L 62.29 58.38 L 62.93 44.16 L 66.17 37.04 L 67.46 22.17 L 65.52 16.99 L 62.29 13.76 L 53.88 11.17 L 42.89 6.00 Z M 40.30 7.29 L 60.99 15.05 L 65.52 20.87 L 64.87 34.46 L 60.99 42.86 L 60.99 51.27 L 59.70 59.03 L 51.94 85.54 L 52.59 110.77 L 51.94 111.41 L 50.00 110.12 L 48.06 106.24 L 42.89 90.07 L 41.59 66.79 L 33.83 33.16 L 33.83 16.35 L 37.71 9.23 Z` },
    43: { silhouette: `M 45.36 6.00 L 36.09 16.36 L 34.45 19.64 L 34.45 29.45 L 37.18 41.45 L 37.18 51.27 L 39.36 69.27 L 45.91 98.18 L 47.55 111.82 L 48.64 113.45 L 49.73 113.45 L 51.36 111.82 L 53.55 104.18 L 59.00 45.82 L 60.64 38.73 L 63.91 31.64 L 65.00 18.00 L 62.82 15.27 L 50.27 7.09 Z`, lines: `M 40.45 40.36 L 41.55 42.00 L 42.09 42.00 L 43.73 43.09 L 51.36 43.09 L 51.91 43.64 L 52.45 43.09 L 53.55 43.09 L 56.27 41.45 L 56.27 40.91 L 55.73 40.91 L 55.18 41.45 L 54.09 41.45 L 53.55 42.00 L 52.45 42.00 L 51.91 42.55 L 47.00 42.55 L 46.45 42.00 L 44.27 42.00 L 42.64 40.91 L 41.00 40.91 Z M 45.36 6.00 L 36.09 16.36 L 34.45 19.64 L 34.45 29.45 L 37.18 41.45 L 37.18 51.27 L 39.36 69.27 L 45.91 98.18 L 47.55 111.82 L 48.64 113.45 L 49.73 113.45 L 51.36 111.82 L 53.55 104.18 L 59.00 45.82 L 60.64 38.73 L 63.91 31.64 L 65.00 18.00 L 62.82 15.27 L 50.27 7.09 Z M 46.45 7.09 L 61.18 16.91 L 59.55 17.45 L 55.73 15.82 L 47.00 9.82 L 51.36 14.73 L 58.45 18.00 L 61.18 18.00 L 62.27 16.91 L 63.91 19.64 L 62.27 32.73 L 58.45 41.45 L 53.00 97.64 L 51.91 106.36 L 49.73 111.82 L 48.09 109.64 L 46.45 94.91 L 39.91 66.55 L 37.73 49.09 L 38.27 42.00 L 36.09 33.82 L 35.55 21.27 L 37.18 17.45 Z` },
    42: { silhouette: `M 60.15 6.00 L 49.67 6.00 L 39.85 7.31 L 37.24 8.62 L 35.93 10.58 L 35.93 24.33 L 38.55 43.96 L 37.89 59.67 L 43.13 83.24 L 45.09 87.82 L 48.36 108.76 L 50.33 113.35 L 52.29 112.69 L 54.25 109.42 L 58.84 88.47 L 60.15 47.89 L 63.42 36.76 L 62.76 18.44 L 61.45 8.62 Z`, lines: `M 41.16 36.76 L 41.16 37.42 L 41.82 38.07 L 42.47 38.07 L 44.44 39.38 L 45.75 39.38 L 46.40 40.04 L 49.02 40.04 L 49.67 40.69 L 53.60 40.69 L 54.25 40.04 L 56.22 40.04 L 58.18 38.73 L 56.87 38.73 L 56.22 39.38 L 48.36 39.38 L 47.71 38.73 L 46.40 38.73 L 45.75 38.07 L 44.44 38.07 L 43.78 37.42 L 42.47 37.42 L 41.82 36.76 Z M 58.18 18.44 L 58.18 24.33 L 58.84 24.98 L 58.84 30.87 L 59.49 31.53 L 59.49 33.49 L 60.15 32.84 L 59.49 32.18 L 59.49 22.36 L 58.84 21.71 L 58.84 19.75 L 58.18 19.09 Z M 60.15 6.00 L 49.67 6.00 L 39.85 7.31 L 37.24 8.62 L 35.93 10.58 L 35.93 24.33 L 38.55 43.96 L 37.89 59.67 L 43.13 83.24 L 45.09 87.82 L 48.36 108.76 L 50.33 113.35 L 52.29 112.69 L 54.25 109.42 L 58.84 88.47 L 60.15 47.89 L 63.42 36.76 L 62.76 18.44 L 61.45 8.62 Z M 58.84 7.31 L 60.15 9.27 L 62.11 36.11 L 58.84 49.20 L 58.18 78.00 L 56.87 92.40 L 53.60 108.11 L 50.98 110.73 L 49.67 109.42 L 47.05 89.78 L 39.85 62.95 L 39.20 57.71 L 39.20 47.24 L 39.85 46.58 L 39.20 42.65 L 39.85 41.35 L 37.89 32.84 L 36.58 11.24 L 41.16 8.62 Z` },
    41: { silhouette: `M 58.95 6.00 L 41.05 7.16 L 37.58 8.31 L 37.01 9.47 L 37.58 37.76 L 38.74 44.70 L 39.89 76.46 L 45.09 107.65 L 47.40 113.42 L 49.13 112.27 L 50.29 108.80 L 54.33 69.53 L 58.37 48.74 L 61.84 37.19 L 62.42 12.35 L 61.26 7.73 Z`, lines: `M 57.80 13.51 L 57.80 32.57 L 57.22 33.14 L 57.22 35.45 L 57.80 35.45 L 57.80 34.30 L 58.37 33.72 L 58.37 30.83 L 58.95 30.26 L 58.95 16.40 L 58.37 15.82 L 58.37 14.09 Z M 58.95 6.00 L 41.05 7.16 L 37.58 8.31 L 37.01 9.47 L 37.58 37.76 L 38.74 44.70 L 39.89 76.46 L 45.09 107.65 L 47.40 113.42 L 49.13 112.27 L 50.29 108.80 L 54.33 69.53 L 58.37 48.74 L 61.84 37.19 L 62.42 12.35 L 61.26 7.73 Z M 57.80 7.16 L 60.68 10.04 L 61.26 14.66 L 60.11 38.34 L 56.06 41.81 L 50.87 42.96 L 42.20 40.65 L 42.78 42.39 L 50.87 44.70 L 54.33 44.12 L 58.37 41.23 L 59.53 41.81 L 54.33 62.60 L 51.44 80.50 L 49.13 108.80 L 47.40 110.53 L 41.05 75.88 L 38.16 11.20 L 39.89 8.89 Z` },
    31: { silhouette: `M 40.76 6.00 L 38.45 7.73 L 37.29 11.20 L 36.72 23.33 L 37.87 38.34 L 44.80 66.64 L 49.42 108.80 L 50.58 112.84 L 52.31 113.42 L 54.04 109.38 L 59.24 81.08 L 60.40 69.53 L 60.97 42.96 L 62.13 37.19 L 62.71 10.04 L 60.97 7.73 Z`, lines: `M 41.91 13.51 L 41.34 14.09 L 41.34 15.24 L 40.76 15.82 L 40.76 31.99 L 41.34 32.57 L 41.34 34.30 L 41.91 34.88 L 41.91 35.45 L 42.49 35.45 L 42.49 33.72 L 41.91 33.14 L 41.91 32.57 L 42.49 31.99 L 42.49 30.83 L 41.91 30.26 Z M 40.76 6.00 L 38.45 7.73 L 37.29 11.20 L 36.72 23.33 L 37.87 38.34 L 44.80 66.64 L 49.42 108.80 L 50.58 112.84 L 52.31 113.42 L 54.04 109.38 L 59.24 81.08 L 60.40 69.53 L 60.97 42.96 L 62.13 37.19 L 62.71 10.04 L 60.97 7.73 Z M 41.91 7.16 L 59.82 8.89 L 60.97 10.04 L 58.66 74.15 L 56.93 88.01 L 52.31 109.96 L 50.58 108.80 L 48.27 82.24 L 45.96 66.64 L 40.18 42.39 L 41.34 41.81 L 45.38 44.12 L 52.89 44.12 L 55.78 42.96 L 57.51 40.65 L 53.47 42.39 L 48.27 42.96 L 43.07 41.23 L 39.03 37.19 L 38.45 12.93 L 39.60 8.89 Z` },
    32: { silhouette: `M 39.20 6.00 L 37.24 11.24 L 35.93 23.02 L 35.93 37.42 L 37.89 42.00 L 39.20 49.20 L 39.20 69.49 L 39.85 70.15 L 39.20 72.76 L 40.51 89.78 L 44.44 108.11 L 45.75 111.38 L 48.36 113.35 L 50.33 111.38 L 53.60 90.44 L 60.80 62.95 L 61.45 58.36 L 60.80 41.35 L 62.76 31.53 L 63.42 10.58 L 59.49 7.31 L 49.02 6.00 Z`, lines: `M 58.18 36.76 L 57.53 36.76 L 56.87 37.42 L 55.56 37.42 L 53.60 38.73 L 51.64 38.73 L 50.98 39.38 L 42.47 39.38 L 41.82 38.73 L 40.51 38.73 L 41.16 38.73 L 43.13 40.04 L 45.09 40.04 L 45.75 40.69 L 50.33 40.69 L 50.98 40.04 L 52.95 40.04 L 53.60 39.38 L 54.91 39.38 L 55.56 38.73 L 56.87 38.73 L 58.18 37.42 Z M 41.16 17.78 L 41.16 18.44 L 40.51 19.09 L 40.51 21.71 L 39.85 22.36 L 39.85 28.91 L 39.20 29.56 L 39.20 32.18 L 39.85 32.84 L 39.85 33.49 L 39.85 31.53 L 40.51 30.87 L 40.51 25.64 L 41.16 24.98 Z M 39.20 6.00 L 37.24 11.24 L 35.93 23.02 L 35.93 37.42 L 37.89 42.00 L 39.20 49.20 L 39.20 69.49 L 39.85 70.15 L 39.20 72.76 L 40.51 89.78 L 44.44 108.11 L 45.75 111.38 L 48.36 113.35 L 50.33 111.38 L 53.60 90.44 L 60.80 62.95 L 61.45 58.36 L 60.80 41.35 L 62.76 31.53 L 63.42 10.58 L 59.49 7.31 L 49.02 6.00 Z M 40.51 7.31 L 58.18 8.62 L 61.45 9.93 L 62.76 11.89 L 61.45 31.53 L 59.49 40.04 L 59.49 49.85 L 60.15 50.51 L 59.49 62.95 L 53.60 83.89 L 49.67 104.84 L 49.67 108.76 L 48.36 111.38 L 47.05 110.73 L 45.75 108.11 L 42.47 93.05 L 41.16 80.62 L 41.16 68.18 L 40.51 67.53 L 40.51 50.51 L 37.24 37.42 L 37.89 19.09 L 39.20 8.62 Z` },
    33: { silhouette: `M 54.09 6.00 L 50.82 6.00 L 43.73 11.45 L 36.64 15.27 L 34.45 18.00 L 35.00 29.45 L 39.36 39.82 L 45.91 104.73 L 46.45 108.00 L 49.73 113.45 L 51.91 111.27 L 54.09 94.91 L 60.09 68.73 L 62.27 51.82 L 62.27 40.36 L 63.91 36.55 L 65.00 27.82 L 64.45 18.55 Z`, lines: `M 43.18 40.91 L 43.18 41.45 L 43.73 42.00 L 44.27 42.00 L 45.36 43.09 L 47.55 43.09 L 48.09 43.64 L 53.00 43.64 L 53.55 43.09 L 55.73 43.09 L 58.45 41.45 L 58.45 40.91 L 57.36 40.91 L 56.82 41.45 L 55.18 41.45 L 54.64 42.00 L 53.00 42.00 L 52.45 42.55 L 48.64 42.55 L 48.09 42.00 L 45.36 42.00 L 44.82 41.45 L 43.73 41.45 Z M 54.09 6.00 L 50.82 6.00 L 43.73 11.45 L 36.64 15.27 L 34.45 18.00 L 35.00 29.45 L 39.36 39.82 L 45.91 104.73 L 46.45 108.00 L 49.73 113.45 L 51.91 111.27 L 54.09 94.91 L 60.09 68.73 L 62.27 51.82 L 62.27 40.36 L 63.91 36.55 L 65.00 27.82 L 64.45 18.55 Z M 53.00 7.09 L 62.27 17.45 L 63.91 21.27 L 63.36 33.27 L 61.18 42.00 L 60.09 62.73 L 52.45 97.09 L 50.82 111.27 L 49.73 111.82 L 48.09 109.09 L 47.00 103.64 L 42.09 49.09 L 40.45 40.36 L 36.64 31.09 L 35.55 19.09 L 37.18 16.91 L 38.27 18.00 L 40.45 18.00 L 48.09 14.73 L 52.45 9.82 L 44.82 15.27 L 39.36 17.45 L 38.27 16.91 L 50.82 7.64 Z` },
    34: { silhouette: `M 60.99 6.00 L 56.47 6.00 L 48.71 9.88 L 37.07 13.76 L 33.83 16.35 L 31.89 21.52 L 32.54 35.10 L 36.42 45.45 L 37.07 59.03 L 45.47 84.90 L 44.83 106.89 L 45.47 112.06 L 47.41 113.35 L 50.65 110.77 L 57.76 90.72 L 59.70 66.14 L 64.23 48.68 L 64.23 42.22 L 67.46 30.57 L 67.46 16.35 Z`, lines: `M 60.99 40.92 L 59.70 40.92 L 56.47 42.86 L 54.53 42.86 L 53.88 43.51 L 51.94 43.51 L 51.29 44.16 L 48.71 44.16 L 48.06 44.80 L 42.24 44.80 L 40.95 43.51 L 40.30 43.51 L 40.30 44.80 L 40.95 44.80 L 42.24 46.10 L 50.65 46.10 L 51.29 45.45 L 52.59 45.45 L 53.23 44.80 L 54.53 44.80 L 55.17 44.16 L 56.47 44.16 L 57.11 43.51 L 58.41 43.51 L 59.05 42.86 L 59.70 42.86 L 60.99 41.57 Z M 36.42 25.40 L 36.42 30.57 L 37.07 31.22 L 37.07 33.81 L 37.71 34.46 L 37.71 36.40 L 38.36 37.04 L 39.01 38.98 L 40.95 39.63 L 39.65 37.69 L 39.65 36.40 L 39.01 35.75 L 39.01 34.46 L 38.36 33.81 L 38.36 32.51 L 37.71 31.87 L 37.71 29.93 L 37.07 29.28 L 37.07 27.34 L 36.42 26.69 Z M 57.11 11.17 L 58.41 12.47 L 58.41 13.11 L 59.05 13.76 L 59.05 14.41 L 60.35 15.70 L 60.35 16.35 L 60.99 16.99 L 62.29 16.99 L 62.29 16.35 L 61.64 15.70 L 61.64 15.05 L 60.35 13.76 L 60.35 13.11 L 58.41 11.17 Z M 60.99 6.00 L 56.47 6.00 L 48.71 9.88 L 37.07 13.76 L 33.83 16.35 L 31.89 21.52 L 32.54 35.10 L 36.42 45.45 L 37.07 59.03 L 45.47 84.90 L 44.83 106.89 L 45.47 112.06 L 47.41 113.35 L 50.65 110.77 L 57.76 90.72 L 59.70 66.14 L 64.23 48.68 L 64.23 42.22 L 67.46 30.57 L 67.46 16.35 Z M 59.05 7.29 L 62.93 11.17 L 65.52 16.99 L 64.87 36.40 L 62.93 41.57 L 57.76 66.14 L 57.11 83.60 L 55.82 92.01 L 51.29 106.24 L 49.35 110.12 L 47.41 111.41 L 46.77 110.77 L 46.77 96.54 L 47.41 95.89 L 46.77 82.31 L 39.65 59.03 L 38.36 51.27 L 38.36 44.16 L 35.13 37.04 L 33.83 30.57 L 33.83 20.87 L 34.48 18.93 L 39.65 14.41 Z` },
    35: { silhouette: `M 52.89 6.00 L 48.39 6.00 L 45.82 7.29 L 35.54 15.64 L 32.32 20.14 L 33.61 34.29 L 36.82 49.71 L 34.25 55.50 L 34.25 63.86 L 31.68 83.14 L 33.61 98.57 L 37.46 113.36 L 39.39 113.36 L 40.68 112.07 L 44.54 91.50 L 61.25 58.71 L 62.54 54.86 L 62.54 50.36 L 67.68 33.00 L 67.04 21.43 L 58.68 10.50 Z`, lines: `M 40.04 49.07 L 40.68 49.71 L 41.96 49.71 L 42.61 50.36 L 47.11 50.36 L 47.75 51.00 L 50.32 51.00 L 50.96 50.36 L 56.11 50.36 L 56.75 49.71 L 57.39 49.71 L 56.75 49.71 L 56.11 49.07 L 41.32 49.07 L 40.68 48.43 Z M 52.89 6.00 L 48.39 6.00 L 45.82 7.29 L 35.54 15.64 L 32.32 20.14 L 33.61 34.29 L 36.82 49.71 L 34.25 55.50 L 34.25 63.86 L 31.68 83.14 L 33.61 98.57 L 37.46 113.36 L 39.39 113.36 L 40.68 112.07 L 44.54 91.50 L 61.25 58.71 L 62.54 54.86 L 62.54 50.36 L 67.68 33.00 L 67.04 21.43 L 58.68 10.50 Z M 52.25 7.93 L 62.54 18.21 L 66.39 24.64 L 66.39 28.50 L 63.82 42.00 L 61.25 47.14 L 61.25 52.29 L 59.96 56.79 L 43.89 88.93 L 41.96 95.36 L 40.04 110.14 L 38.11 110.79 L 36.18 104.36 L 33.61 87.64 L 33.61 76.07 L 35.54 64.50 L 35.54 55.50 L 38.11 48.43 L 35.54 36.86 L 34.25 20.14 L 36.18 17.57 L 41.96 13.71 L 46.46 9.21 L 49.04 7.93 Z` },
    36: { silhouette: `M 72.28 6.00 L 63.22 6.00 L 54.15 9.02 L 29.99 8.27 L 23.94 9.78 L 20.92 14.31 L 20.92 27.90 L 28.48 56.60 L 28.48 81.52 L 29.99 90.59 L 33.76 101.16 L 40.56 110.98 L 43.58 110.98 L 44.34 109.47 L 42.83 89.83 L 45.09 79.26 L 49.62 73.97 L 51.89 73.97 L 54.15 76.24 L 57.17 83.03 L 60.20 94.36 L 60.20 109.47 L 61.71 112.49 L 65.48 112.49 L 67.75 110.22 L 72.28 100.41 L 75.30 86.81 L 73.79 44.52 L 78.32 20.35 L 76.81 11.29 Z`, lines: `M 32.25 49.80 L 32.25 50.56 L 33.01 50.56 L 33.76 51.31 L 38.29 51.31 L 40.56 49.80 L 54.15 49.80 L 54.91 50.56 L 59.44 50.56 L 60.20 51.31 L 65.48 51.31 L 66.24 50.56 L 64.73 50.56 L 63.97 49.80 L 61.71 49.80 L 60.95 49.05 L 57.17 49.05 L 56.42 48.29 L 51.89 48.29 L 51.13 47.54 L 42.07 47.54 L 41.31 48.29 L 39.80 48.29 L 37.54 49.80 Z M 36.03 13.55 L 37.54 13.55 L 38.29 14.31 L 40.56 14.31 L 41.31 15.06 L 43.58 15.06 L 44.34 15.82 L 46.60 15.82 L 47.36 16.57 L 51.89 16.57 L 52.64 17.33 L 57.17 17.33 L 57.93 16.57 L 60.20 16.57 L 60.95 15.82 L 62.46 15.82 L 63.22 15.06 L 63.97 15.06 L 63.97 14.31 L 63.22 15.06 L 48.11 15.06 L 47.36 14.31 L 43.58 14.31 L 42.83 13.55 L 38.29 13.55 L 37.54 12.80 L 36.78 12.80 Z M 72.28 6.00 L 63.22 6.00 L 54.15 9.02 L 29.99 8.27 L 23.94 9.78 L 20.92 14.31 L 20.92 27.90 L 28.48 56.60 L 28.48 81.52 L 29.99 90.59 L 33.76 101.16 L 40.56 110.98 L 43.58 110.98 L 44.34 109.47 L 42.83 89.83 L 45.09 79.26 L 49.62 73.97 L 51.89 73.97 L 54.15 76.24 L 57.17 83.03 L 60.20 94.36 L 60.20 109.47 L 61.71 112.49 L 65.48 112.49 L 67.75 110.22 L 72.28 100.41 L 75.30 86.81 L 73.79 44.52 L 78.32 20.35 L 76.81 11.29 Z M 69.26 7.51 L 73.79 9.78 L 76.06 15.82 L 76.06 23.37 L 71.52 47.54 L 73.79 76.24 L 73.03 89.08 L 70.01 101.16 L 65.48 110.22 L 63.22 110.98 L 62.46 95.87 L 57.93 79.26 L 53.40 72.46 L 48.87 71.71 L 44.34 76.24 L 42.07 82.28 L 40.56 96.63 L 42.83 107.96 L 41.31 108.71 L 36.03 101.16 L 31.50 89.08 L 29.99 80.01 L 30.74 58.11 L 23.19 29.41 L 23.19 14.31 L 27.72 10.53 L 54.15 11.29 L 62.46 8.27 Z` },
    37: { silhouette: `M 24.25 6.83 L 19.26 12.65 L 17.60 28.43 L 25.08 55.85 L 22.58 78.28 L 25.08 97.38 L 30.89 108.18 L 34.22 111.51 L 39.20 112.34 L 40.03 100.71 L 41.69 99.88 L 45.85 104.03 L 48.34 102.37 L 50.83 82.43 L 53.32 79.11 L 56.65 78.28 L 64.95 95.72 L 66.62 110.68 L 68.28 113.17 L 72.43 111.51 L 75.75 104.86 L 78.25 91.57 L 74.92 64.98 L 74.92 53.35 L 81.57 25.94 L 80.74 12.65 L 74.09 6.00 L 63.29 6.00 L 54.98 8.49 L 36.71 8.49 L 31.72 6.00 Z`, lines: `M 63.29 54.18 L 57.48 54.18 L 56.65 55.02 L 53.32 55.02 L 52.49 55.85 L 49.17 55.85 L 48.34 56.68 L 38.37 56.68 L 37.54 55.85 L 34.22 55.85 L 34.22 56.68 L 37.54 56.68 L 38.37 57.51 L 50.83 57.51 L 51.66 56.68 L 55.82 56.68 L 56.65 55.85 L 58.31 55.85 L 59.14 55.02 L 61.63 55.02 L 62.46 54.18 Z M 24.25 6.83 L 19.26 12.65 L 17.60 28.43 L 25.08 55.85 L 22.58 78.28 L 25.08 97.38 L 30.89 108.18 L 34.22 111.51 L 39.20 112.34 L 40.03 100.71 L 41.69 99.88 L 45.85 104.03 L 48.34 102.37 L 50.83 82.43 L 53.32 79.11 L 56.65 78.28 L 64.95 95.72 L 66.62 110.68 L 68.28 113.17 L 72.43 111.51 L 75.75 104.86 L 78.25 91.57 L 74.92 64.98 L 74.92 53.35 L 81.57 25.94 L 80.74 12.65 L 74.09 6.00 L 63.29 6.00 L 54.98 8.49 L 36.71 8.49 L 31.72 6.00 Z M 51.66 76.62 L 52.49 77.45 L 52.49 78.28 L 50.83 79.94 L 50.83 80.77 L 48.34 84.92 L 48.34 89.08 L 47.51 89.91 L 47.51 101.54 L 46.68 102.37 L 45.85 102.37 L 43.35 99.88 L 43.35 99.05 L 40.86 94.89 L 40.86 93.23 L 40.03 92.40 L 40.03 88.25 L 40.86 87.42 L 40.86 84.92 L 42.52 82.43 L 42.52 80.77 L 45.02 78.28 L 45.85 78.28 L 48.34 76.62 Z M 25.08 8.49 L 30.89 7.66 L 48.34 15.97 L 57.48 16.80 L 51.66 15.14 L 45.85 10.98 L 72.43 7.66 L 79.08 14.31 L 79.91 25.94 L 73.26 53.35 L 75.75 96.55 L 70.77 110.68 L 68.28 108.18 L 68.28 100.71 L 64.95 89.08 L 60.80 79.94 L 55.82 75.78 L 47.51 75.78 L 40.03 83.26 L 38.37 89.08 L 39.20 109.02 L 37.54 110.68 L 32.55 107.35 L 27.57 98.22 L 25.08 89.08 L 26.74 56.68 L 19.26 26.77 L 20.09 15.97 Z` },
    38: { silhouette: `M 26.91 6.74 L 23.19 9.72 L 20.95 19.41 L 23.19 38.77 L 22.44 83.46 L 23.93 91.66 L 31.38 108.79 L 35.85 112.51 L 39.57 112.51 L 44.04 87.19 L 46.28 84.21 L 47.77 84.21 L 52.98 91.66 L 58.19 111.02 L 61.92 113.26 L 65.64 110.28 L 68.62 99.85 L 69.37 88.68 L 67.13 62.61 L 68.62 52.18 L 77.56 29.09 L 77.56 17.17 L 73.09 11.96 L 70.11 10.47 L 51.49 9.72 L 41.06 6.74 L 32.87 6.00 Z`, lines: `M 29.89 52.92 L 35.10 52.92 L 35.85 53.67 L 39.57 53.67 L 40.32 54.41 L 49.26 54.41 L 50.00 55.16 L 50.74 54.41 L 53.72 54.41 L 54.47 53.67 L 55.21 53.67 L 50.00 53.67 L 49.26 52.92 L 41.81 52.92 L 41.06 52.18 L 30.63 52.18 Z M 32.12 11.96 L 32.87 11.96 L 33.61 12.70 L 35.10 12.70 L 35.85 13.45 L 36.59 13.45 L 38.08 14.94 L 39.57 14.94 L 41.81 16.43 L 43.30 16.43 L 44.04 17.17 L 45.53 17.17 L 46.28 17.92 L 50.00 17.92 L 50.74 18.66 L 53.72 18.66 L 54.47 17.92 L 57.45 17.92 L 58.19 17.17 L 60.43 16.43 L 55.21 16.43 L 54.47 17.17 L 50.00 17.17 L 49.26 16.43 L 46.28 16.43 L 45.53 15.68 L 44.04 15.68 L 43.30 14.94 L 41.81 14.94 L 41.06 14.19 L 40.32 14.19 L 38.08 12.70 L 36.59 12.70 L 35.85 11.96 Z M 26.91 6.74 L 23.19 9.72 L 20.95 19.41 L 23.19 38.77 L 22.44 83.46 L 23.93 91.66 L 31.38 108.79 L 35.85 112.51 L 39.57 112.51 L 44.04 87.19 L 46.28 84.21 L 47.77 84.21 L 52.98 91.66 L 58.19 111.02 L 61.92 113.26 L 65.64 110.28 L 68.62 99.85 L 69.37 88.68 L 67.13 62.61 L 68.62 52.18 L 77.56 29.09 L 77.56 17.17 L 73.09 11.96 L 70.11 10.47 L 51.49 9.72 L 41.06 6.74 L 32.87 6.00 Z M 26.91 8.23 L 40.32 8.23 L 49.26 11.21 L 67.88 11.96 L 71.60 13.45 L 75.32 17.17 L 75.32 30.58 L 68.62 46.22 L 65.64 58.88 L 67.13 99.10 L 65.64 106.55 L 62.66 111.02 L 59.68 109.53 L 55.21 91.66 L 50.74 84.21 L 48.51 82.72 L 44.79 82.72 L 42.55 85.70 L 38.08 111.02 L 32.12 106.55 L 26.91 95.38 L 23.93 82.72 L 24.68 36.54 L 22.44 26.86 L 23.19 13.45 L 24.68 9.72 Z` }
  };

  function toothMeta(tooth) {
    const code = String(tooth).padStart(2, "0");
    const quadrant = Number(code[0]);
    const position = Number(code[1]);
    const upper = quadrant === 1 || quadrant === 2;
    const mirrored = quadrant === 2 || quadrant === 3;
    const labels = {
      1: "Incisivo central",
      2: "Incisivo lateral",
      3: "Canino",
      4: "Primeiro pré-molar",
      5: "Segundo pré-molar",
      6: "Primeiro molar",
      7: "Segundo molar",
      8: "Terceiro molar"
    };
    return { quadrant, position, upper, mirrored, label: labels[position] || "Dente" };
  }

  function toothSvg(tooth) {
    const data = TOOTH_SVGS[String(tooth)] || TOOTH_SVGS[11];
    return `<svg viewBox="0 0 100 120" class="tooth-anatomy-realistic" aria-hidden="true">
      <path class="tooth-silhouette" d="${data.silhouette}"/>
      <path class="tooth-lines" fill-rule="evenodd" d="${data.lines}"/>
    </svg>`;
  }

  function renderOdontogram() {
    if (!ui.odontogram) return;
    const chart = current?.clinical?.odontogram || defaultRecord().clinical.odontogram;
    ui.odontogram.innerHTML = TOOTH_ORDER.map((tooth, index) => {
      const value = chart[tooth] || { status: "healthy", note: "" };
      const meta = toothMeta(tooth);
      const separator = index === 15 ? " style=\"grid-column-end:span 1;margin-right:18px\"" : "";
      const title = value.note ? `${meta.label} ${tooth}: ${value.note}` : `${meta.label} — dente ${tooth}`;
      return `<button class="tooth exact-tooth realistic-tooth${selectedTeeth.has(String(tooth)) ? " active" : ""}" data-tooth="${tooth}" data-status="${escapeHtml(value.status)}" type="button" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}"${separator}><span class="tooth-illustration">${toothSvg(tooth)}</span><strong class="tooth-code">${tooth}</strong></button>`;
    }).join("");
    $$('.tooth', ui.odontogram).forEach(button => button.addEventListener("click", () => selectTooth(button.dataset.tooth)));
  }

  function selectTooth(tooth) {
    if (!current) return;
    const key = String(tooth);
    if (selectedTeeth.has(key)) selectedTeeth.delete(key); else selectedTeeth.add(key);
    const selected = [...selectedTeeth];
    ui.selectedToothLabel.textContent = selected.length ? selected.join(", ") : "Nenhum";
    ui.toothEditor.hidden = selected.length === 0;
    if (selected.length === 1) {
      const value = current.clinical.odontogram[selected[0]] || { status: "healthy", note: "" };
      ui.selectedToothStatus.value = value.status;
      ui.selectedToothNote.value = value.note;
    } else if (selected.length > 1) {
      const values = selected.map(item => current.clinical.odontogram[item] || { status:"healthy", note:"" });
      const sameStatus = values.every(item => item.status === values[0].status);
      const sameNote = values.every(item => item.note === values[0].note);
      ui.selectedToothStatus.value = sameStatus ? values[0].status : "treatment";
      ui.selectedToothNote.value = sameNote ? values[0].note : "";
    }
    renderOdontogram();
  }

  function saveSelectedTooth() {
    if (!current || !selectedTeeth.size) return;
    const selected = [...selectedTeeth];
    selected.forEach(tooth => { current.clinical.odontogram[tooth] = { status: ui.selectedToothStatus.value, note: ui.selectedToothNote.value.trim() }; });
    dirty = true;
    renderOdontogram();
    toast("Odontograma atualizado", `${selected.length} ${selected.length === 1 ? "dente foi atualizado" : "dentes foram atualizados"}.`);
  }

  function openEvolutionModal() {
    if (!current) return;
    ui.evolutionForm.reset();
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    ui.evolutionDate.value = now.toISOString().slice(0,16);
    const user = window.LAGSettings?.getCurrentUser?.() || {};
    ui.evolutionProfessional.value = user.name || user.nome || "";
    ui.evolutionCro.value = user.cro || "";
    ui.evolutionModal.hidden = false;
    document.body.classList.add("odonto-modal-open");
    professionalPad?.clear();
    setTimeout(() => professionalPad?.resize(true), 60);
  }

  function closeEvolutionModal() {
    ui.evolutionModal.hidden = true;
    document.body.classList.remove("odonto-modal-open");
  }

  function addEvolution(event) {
    event.preventDefault();
    if (!current) return;
    const procedure = ui.evolutionProcedure.value.trim();
    const professional = ui.evolutionProfessional.value.trim();
    const cro = ui.evolutionCro.value.trim();
    if (!procedure || !professional || !cro) {
      ui.evolutionForm.reportValidity();
      return;
    }
    const signature = professionalPad?.isEmpty() ? "" : professionalPad.toDataURL();
    current.evolutions.push({
      id: crypto.randomUUID(),
      date: ui.evolutionDate.value,
      procedure,
      region: ui.evolutionRegion.value.trim(),
      medication: ui.evolutionMedication.value.trim(),
      incidents: ui.evolutionIncidents.value.trim(),
      guidance: ui.evolutionGuidance.value.trim(),
      professional,
      cro,
      signature
    });
    dirty = true;
    renderEvolutions();
    closeEvolutionModal();
    toast("Atendimento registrado", "A evolução clínica foi adicionada ao prontuário.");
  }

  function renderEvolutions() {
    const evolutions = current?.evolutions || [];
    ui.evolutionEmpty.hidden = evolutions.length > 0;
    ui.evolutionTable.innerHTML = [...evolutions].sort((a,b) => new Date(b.date) - new Date(a.date)).map(item => `
      <tr>
        <td><strong>${formatDate(item.date)}</strong></td>
        <td><strong>${escapeHtml(item.procedure)}</strong><small>${escapeHtml(item.guidance || "Sem orientações registradas")}</small></td>
        <td>${escapeHtml(item.region || "Não informado")}</td>
        <td><strong>${escapeHtml(item.professional)}</strong><small>${escapeHtml(item.cro)}</small></td>
        <td>${item.signature ? '<span class="odonto-signature-chip"><i class="fa-solid fa-circle-check"></i> Assinado</span>' : '<small>Não assinada</small>'}</td>
        <td><button class="odonto-table-action" type="button" data-delete-evolution="${escapeHtml(item.id)}" title="Excluir atendimento"><i class="fa-solid fa-trash"></i></button></td>
      </tr>`).join("");
  }

  function deleteEvolution(id) {
    if (!current || !window.confirm("Excluir este registro de atendimento?")) return;
    current.evolutions = current.evolutions.filter(item => item.id !== id);
    dirty = true;
    renderEvolutions();
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

  async function addAttachment() {
    if (!current) return;
    const file = ui.attachmentFile.files?.[0];
    if (!file) {
      toast("Selecione um arquivo", "Escolha um documento antes de adicionar.", "error");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast("Arquivo muito grande", "O limite local é de 20 MB por arquivo.", "error");
      return;
    }
    const metadata = {
      id: crypto.randomUUID(),
      recordId: current.id,
      type: ui.attachmentType.value,
      name: file.name,
      mime: file.type,
      size: file.size,
      createdAt: new Date().toISOString()
    };
    try {
      await fileAction("readwrite", store => store.put({ ...metadata, blob: file }));
      current.attachments.push(metadata);
      ui.attachmentFile.value = "";
      ui.attachmentFileName.textContent = "Nenhum arquivo selecionado";
      dirty = true;
      renderAttachments();
      toast("Documento anexado", `${file.name} foi adicionado ao prontuário.`);
    } catch (error) {
      console.error(error);
      toast("Falha ao anexar", "O navegador não conseguiu armazenar este arquivo.", "error");
    }
  }

  function renderAttachments() {
    const attachments = current?.attachments || [];
    ui.attachmentCount.textContent = `${attachments.length} ${attachments.length === 1 ? "documento anexado" : "documentos anexados"}`;
    if (!attachments.length) {
      ui.attachmentList.innerHTML = '<div class="odonto-attachments-empty"><i class="fa-regular fa-folder-open"></i><p>Nenhum documento anexado.</p></div>';
      return;
    }
    ui.attachmentList.innerHTML = attachments.map(item => `
      <article class="odonto-attachment-item">
        <span><i class="fa-solid ${fileIcon(item.mime, item.name)}"></i></span>
        <div><strong title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong><small>${escapeHtml(item.type)} • ${formatBytes(item.size)}</small></div>
        <div class="odonto-attachment-actions">
          <button type="button" data-open-attachment="${escapeHtml(item.id)}" title="Abrir arquivo"><i class="fa-solid fa-eye"></i></button>
          <button type="button" data-remove-attachment="${escapeHtml(item.id)}" title="Excluir arquivo"><i class="fa-solid fa-trash"></i></button>
        </div>
      </article>`).join("");
  }

  async function openAttachment(id) {
    try {
      const item = await fileAction("readonly", store => store.get(id));
      if (!item?.blob) throw new Error("Arquivo não encontrado");
      const url = URL.createObjectURL(item.blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      toast("Arquivo indisponível", "O documento não foi encontrado neste navegador.", "error");
    }
  }

  async function removeAttachment(id) {
    if (!current || !window.confirm("Remover este documento do prontuário?")) return;
    try {
      await fileAction("readwrite", store => store.delete(id));
      current.attachments = current.attachments.filter(item => item.id !== id);
      dirty = true;
      renderAttachments();
    } catch (error) {
      toast("Não foi possível excluir", "Tente novamente.", "error");
    }
  }

  function maskCep(value) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
    return digits.replace(/(\d{5})(\d{1,3})/, "$1-$2");
  }
  function buildPatientAddress() {
    const street=fields.patientStreet.value.trim(),numberValue=fields.patientNumber.value.trim(),complement=fields.patientComplement.value.trim(),neighborhood=fields.patientNeighborhood.value.trim(),city=fields.patientCity.value.trim(),stateValue=fields.patientState.value.trim().toUpperCase(),cep=fields.patientCep.value.trim();
    return [street&&`${street}${numberValue?`, ${numberValue}`:""}`,complement,neighborhood,[city,stateValue].filter(Boolean).join(" - "),cep].filter(Boolean).join(", ");
  }
  async function lookupPatientCep() {
    const status=$("patientCepStatus"),cep=String(fields.patientCep?.value||"").replace(/\D/g,"");
    if(cep.length!==8){if(status){status.textContent="Informe um CEP com 8 números.";status.className="cep-status error"}return}
    if(status){status.textContent="Buscando endereço...";status.className="cep-status loading"}
    try{const response=await fetch(`https://viacep.com.br/ws/${cep}/json/`);if(!response.ok)throw new Error();const data=await response.json();if(data.erro)throw new Error();fields.patientStreet.value=data.logradouro||"";fields.patientNeighborhood.value=data.bairro||"";fields.patientCity.value=data.localidade||"";fields.patientState.value=data.uf||"";if(data.complemento&&!fields.patientComplement.value)fields.patientComplement.value=data.complemento;dirty=true;if(status){status.textContent="Endereço preenchido. Informe o número da residência.";status.className="cep-status success"}fields.patientNumber?.focus()}catch{if(status){status.textContent="Não foi possível localizar o CEP. Preencha o endereço manualmente.";status.className="cep-status error"}}
  }
  function signatureRequests(){try{return JSON.parse(localStorage.getItem(SIGNATURE_REQUEST_KEY)||"{}")}catch{return {}}}
  function saveSignatureRequests(requests){localStorage.setItem(SIGNATURE_REQUEST_KEY,JSON.stringify(requests))}
  function generateSignatureQr(){if(!current)return;if(!fields.patientName.value.trim()){toast("Informe o paciente","Preencha o nome antes de gerar o QR Code.","error");openStep("identification");return}activeSignatureToken=crypto.randomUUID();const requests=signatureRequests();requests[activeSignatureToken]={token:activeSignatureToken,recordId:current.id,patientName:fields.patientName.value.trim(),createdAt:new Date().toISOString(),status:"pending",signature:""};saveSignatureRequests(requests);const url=new URL("assinatura.html",window.location.href);url.searchParams.set("token",activeSignatureToken);ui.signatureQrLink.value=url.href;ui.signatureQrCode.innerHTML="";if(window.QRCode)new QRCode(ui.signatureQrCode,{text:url.href,width:240,height:240,colorDark:"#08294d",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.H});else ui.signatureQrCode.innerHTML=`<img alt="QR Code" src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url.href)}">`;ui.signatureQrStatus.innerHTML='<i class="fa-solid fa-clock"></i><span>Aguardando assinatura do paciente.</span>';ui.signatureQrStatus.classList.remove("signed");ui.signatureQrModal.hidden=false;document.body.classList.add("odonto-modal-open");startSignaturePolling()}
  function closeSignatureQrModal(){ui.signatureQrModal.hidden=true;document.body.classList.remove("odonto-modal-open")}
  async function copySignatureLink(){const value=ui.signatureQrLink?.value;if(!value)return;try{await navigator.clipboard.writeText(value);toast("Link copiado","Envie o link ao paciente para coletar a assinatura.")}catch{ui.signatureQrLink.select();document.execCommand("copy")}}
  function startSignaturePolling(){stopSignaturePolling();checkRemoteSignature();signaturePollTimer=window.setInterval(checkRemoteSignature,1800)}
  function stopSignaturePolling(){if(signaturePollTimer)window.clearInterval(signaturePollTimer);signaturePollTimer=null}
  function checkRemoteSignature(){if(!activeSignatureToken||!current)return;const item=signatureRequests()[activeSignatureToken];if(!item?.signature)return;current.patientSignature=item.signature;patientPad?.load(item.signature);dirty=true;updatePatientSignatureStatus();if(ui.signatureQrStatus){ui.signatureQrStatus.innerHTML='<i class="fa-solid fa-circle-check"></i><span>Assinatura recebida e vinculada ao prontuário.</span>';ui.signatureQrStatus.classList.add("signed")}stopSignaturePolling();toast("Assinatura recebida","A assinatura do paciente foi adicionada ao prontuário.")}

  function setupSignaturePads() {
    patientPad = new SignaturePad($("patientSignatureCanvas"), ui.patientSignatureHint);
    professionalPad = new SignaturePad($("professionalSignatureCanvas"), ui.professionalSignatureHint);
    window.addEventListener("resize", debounce(() => {
      if (!ui.recordEditor.hidden) patientPad?.resize(true);
      if (!ui.evolutionModal.hidden) professionalPad?.resize(true);
    }, 150));
  }

  function confirmPatientSignature() {
    if (!current || patientPad?.isEmpty()) {
      toast("Assinatura necessária", "Peça ao paciente para assinar dentro da área.", "error");
      return;
    }
    current.patientSignature = patientPad.toDataURL();
    dirty = true;
    updatePatientSignatureStatus();
    toast("Assinatura confirmada", "A assinatura do paciente foi registrada no prontuário.");
  }

  function clearPatientSignature(event) {
    event?.preventDefault();
    patientPad?.clear();
    if (current) current.patientSignature = "";
    dirty = true;
    updatePatientSignatureStatus();
  }

  function updatePatientSignatureStatus() {
    const signed = Boolean(current?.patientSignature);
    ui.patientSignatureStatus.classList.toggle("signed", signed);
    ui.patientSignatureStatus.innerHTML = signed
      ? '<i class="fa-solid fa-circle-check"></i> Assinatura registrada'
      : '<i class="fa-regular fa-circle"></i> Assinatura não registrada';
  }

  async function toggleSignatureFullscreen() {
    try {
      if (document.fullscreenElement === ui.signatureCard) await document.exitFullscreen();
      else await ui.signatureCard.requestFullscreen();
    } catch (error) {
      toast("Modo tablet indisponível", "O navegador não permitiu abrir em tela cheia.", "error");
    }
  }

  class SignaturePad {
    constructor(canvas, hint) {
      this.canvas = canvas;
      this.hint = hint;
      this.ctx = canvas.getContext("2d");
      this.drawing = false;
      this.empty = true;
      this.last = null;
      this.bind();
      this.resize(false);
    }

    bind() {
      this.canvas.addEventListener("pointerdown", event => this.start(event));
      this.canvas.addEventListener("pointermove", event => this.move(event));
      this.canvas.addEventListener("pointerup", () => this.stop());
      this.canvas.addEventListener("pointercancel", () => this.stop());
      this.canvas.addEventListener("pointerleave", () => this.stop());
    }

    point(event) {
      const rect = this.canvas.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * (this.canvas.width / rect.width), y: (event.clientY - rect.top) * (this.canvas.height / rect.height) };
    }

    start(event) {
      event.preventDefault();
      this.canvas.setPointerCapture?.(event.pointerId);
      this.drawing = true;
      this.last = this.point(event);
      this.hint.hidden = true;
    }

    move(event) {
      if (!this.drawing) return;
      event.preventDefault();
      const next = this.point(event);
      this.ctx.beginPath();
      this.ctx.moveTo(this.last.x, this.last.y);
      this.ctx.lineTo(next.x, next.y);
      this.ctx.strokeStyle = "#12304e";
      this.ctx.lineWidth = Math.max(2, this.canvas.width / 500 * 2.2);
      this.ctx.lineCap = "round";
      this.ctx.lineJoin = "round";
      this.ctx.stroke();
      this.last = next;
      this.empty = false;
    }

    stop() { this.drawing = false; this.last = null; }

    resize(preserve = true) {
      if (!this.canvas.offsetWidth || !this.canvas.offsetHeight) return;
      const previous = preserve && !this.empty ? this.toDataURL() : "";
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      this.canvas.width = Math.round(this.canvas.offsetWidth * ratio);
      this.canvas.height = Math.round(this.canvas.offsetHeight * ratio);
      this.ctx.setTransform(1,0,0,1,0,0);
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
      if (previous) this.load(previous);
      else this.clear();
    }

    clear() {
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
      this.empty = true;
      this.hint.hidden = false;
    }

    isEmpty() { return this.empty; }
    toDataURL() { return this.canvas.toDataURL("image/png"); }

    load(dataUrl) {
      if (!dataUrl) { this.clear(); return; }
      const image = new Image();
      image.onload = () => {
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
        this.ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
        this.empty = false;
        this.hint.hidden = true;
      };
      image.src = dataUrl;
    }
  }

  function toast(title, message, type = "success") {
    const element = document.createElement("div");
    element.className = `odonto-toast ${type}`;
    element.innerHTML = `<i class="fa-solid ${type === "error" ? "fa-circle-exclamation" : "fa-circle-check"}"></i><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span></div>`;
    ui.toastRegion.appendChild(element);
    setTimeout(() => element.remove(), 3800);
  }

  function initials(name) {
    const parts = String(name || "NP").trim().split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] || "N") + (parts.length > 1 ? parts.at(-1)[0] : "P");
  }

  function normalize(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }

  function formatDate(value) {
    if (!value) return "Sem data";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Sem data";
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: value.includes("T") ? "short" : undefined }).format(date);
  }

  function formatBytes(bytes) {
    const number = Number(bytes || 0);
    if (!number) return "0 KB";
    const units = ["B","KB","MB","GB"];
    const index = Math.min(Math.floor(Math.log(number) / Math.log(1024)), units.length - 1);
    return `${(number / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
  }

  function fileIcon(mime, name) {
    const value = `${mime || ""} ${name || ""}`.toLowerCase();
    if (value.includes("pdf")) return "fa-file-pdf";
    if (value.includes("image") || /\.(png|jpg|jpeg|webp)$/i.test(name || "")) return "fa-file-image";
    if (value.includes("word") || /\.(doc|docx)$/i.test(name || "")) return "fa-file-word";
    return "fa-file";
  }

  function debounce(fn, wait) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); };
  }
})();
