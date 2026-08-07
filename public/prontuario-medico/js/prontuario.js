(() => {
  "use strict";

  const KEY = "lag-medical-record-patients-v3";
  const QUEUE_KEY = "lag-reception-queue-v1";
  const STATUS = {
    WAITING: "waiting",
    IN_SERVICE: "in-service",
    ATTENDED: "attended"
  };

  const $ = id => document.getElementById(id);
  const initial = [];

  let patients = load();
  let selectedId = patients[0]?.id || null;
  let activeTab = "resumo";

  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

  const initials = name => String(name || "P")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();

  function safeJSON(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function load() {
    const value = safeJSON(localStorage.getItem(KEY), initial);
    return Array.isArray(value) ? value : initial;
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(patients));
  }

  function loadReceptionQueue() {
    const value = safeJSON(localStorage.getItem(QUEUE_KEY), []);
    return Array.isArray(value) ? value : [];
  }

  function saveReceptionQueue(queue) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  function currentCity() {
    const settings = window.LAGSettings;
    const user = settings?.getCurrentUser?.() || {};
    return settings?.getActiveCity?.()
      || user.unit
      || user.city
      || localStorage.getItem("lag-active-city")
      || "Cerquilho";
  }

  function queueForCurrentCity(queue = loadReceptionQueue()) {
    const city = currentCity();
    return queue.filter(record =>
      city === "Todas as cidades"
      || !record.city
      || record.city === city
    );
  }

  function queuePatientId(queueId) {
    return `reception-${queueId}`;
  }

  function findQueueRecord(patient) {
    if (!patient?.receptionQueueId) return null;
    return loadReceptionQueue().find(record => String(record.id) === String(patient.receptionQueueId)) || null;
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

  function syncReceptionQueueIntoPatients(queue = loadReceptionQueue()) {
    const rows = queueForCurrentCity(queue);
    let changed = false;

    rows.forEach(record => {
      if (!record?.id || !record?.name) return;

      const queueId = String(record.id);
      const cpfDigits = String(record.cpf || "").replace(/\D/g, "");

      let patient = patients.find(item =>
        String(item.receptionQueueId || "") === queueId
        || item.id === queuePatientId(queueId)
        || (
          cpfDigits
          && String(item.cpf || "").replace(/\D/g, "") === cpfDigits
        )
      );

      if (!patient) {
        patient = {
          id: queuePatientId(queueId),
          receptionQueueId: queueId,
          receptionStatus: record.status || STATUS.WAITING,
          receptionDoctor: record.doctor || "",
          receptionCreatedAt: record.createdAt || "",
          receptionCalledAt: record.calledAt || "",
          city: record.city || currentCity(),
          name: record.name,
          cpf: record.cpf || "",
          birth: record.birth || "",
          phone: record.phone || "",
          address: record.address || null,
          sex: "",
          allergies: "",
          anamnese: "",
          evolutions: [],
          markers: [],
          prescriptions: [],
          documents: []
        };

        patients.unshift(patient);
        changed = true;
        return;
      }

      const before = JSON.stringify(patient);

      Object.assign(patient, {
        receptionQueueId: queueId,
        receptionStatus: record.status || patient.receptionStatus || STATUS.WAITING,
        receptionDoctor: record.doctor || patient.receptionDoctor || "",
        receptionCreatedAt: record.createdAt || patient.receptionCreatedAt || "",
        receptionCalledAt: record.calledAt || patient.receptionCalledAt || "",
        city: record.city || patient.city || currentCity(),
        name: record.name || patient.name,
        cpf: record.cpf || patient.cpf,
        birth: record.birth || patient.birth,
        phone: record.phone || patient.phone,
        address: record.address || patient.address || null
      });

      if (before !== JSON.stringify(patient)) changed = true;
    });

    if (changed) save();
    return changed;
  }

  function callReceptionPatient(patient) {
    if (!patient?.receptionQueueId) return;

    const queue = loadReceptionQueue();
    const record = queue.find(item => String(item.id) === String(patient.receptionQueueId));
    if (!record) return;

    record.status = STATUS.IN_SERVICE;
    record.calledAt = record.calledAt || new Date().toISOString();
    record.finishedAt = null;
    record.consultation = record.consultation || {};

    patient.receptionStatus = STATUS.IN_SERVICE;
    patient.receptionCalledAt = record.calledAt;

    saveReceptionQueue(queue);
    save();
    render();

    window.LAGUI?.toast?.(`${patient.name} chamado para atendimento.`);
  }

  async function refreshReceptionQueueFromCloud() {
    try {
      const response = await fetch("/api/state", {
        credentials: "same-origin",
        cache: "no-store"
      });

      if (!response.ok) return;

      const payload = await response.json();
      const raw = payload?.state?.[QUEUE_KEY];
      if (typeof raw !== "string") return;

      const remoteQueue = safeJSON(raw, []);
      if (!Array.isArray(remoteQueue)) return;

      const currentRaw = localStorage.getItem(QUEUE_KEY) || "[]";
      const nextRaw = JSON.stringify(remoteQueue);

      if (currentRaw !== nextRaw) {
        localStorage.setItem(QUEUE_KEY, nextRaw);
      }

      if (syncReceptionQueueIntoPatients(remoteQueue)) {
        if (!selectedId && patients.length) selectedId = patients[0].id;
        render();
      } else {
        renderList();
        renderWorkspace();
      }
    } catch (error) {
      console.debug("LAG prontuário: fila da recepção temporariamente indisponível.", error);
    }
  }

  function formatCpf(value) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function selected() {
    return patients.find(patient => patient.id === selectedId);
  }

  function queueStatusLabel(status) {
    if (status === STATUS.IN_SERVICE) return "Em atendimento";
    if (status === STATUS.ATTENDED) return "Atendido";
    return "Aguardando chamada";
  }

  function renderList() {
    const search = $("patientSearch");
    const term = String(search?.value || "").trim().toLowerCase();

    const rows = patients.filter(patient =>
      !term
      || `${patient.name} ${patient.cpf} ${patient.phone} ${patient.receptionDoctor || ""}`
        .toLowerCase()
        .includes(term)
    );

    $("patientCount").textContent = `${patients.length} cadastrados`;

    $("patientList").innerHTML = rows.map(patient => {
      const fromReception = Boolean(patient.receptionQueueId);
      const queueMeta = fromReception
        ? `<span class="patient-queue-status is-${escape(patient.receptionStatus || STATUS.WAITING)}">${escape(queueStatusLabel(patient.receptionStatus))}</span>`
        : "";

      const doctor = patient.receptionDoctor
        ? `<small class="patient-doctor"><i class="fa-solid fa-user-doctor"></i> ${escape(patient.receptionDoctor)}</small>`
        : "";

      return `
        <button class="patient-row ${patient.id === selectedId ? "active" : ""}" data-patient-id="${escape(patient.id)}">
          <span class="patient-avatar">${initials(patient.name)}</span>
          <div>
            <strong>${escape(patient.name)}</strong>
            <small>${escape(patient.cpf)} • ${escape(patient.phone || "Sem telefone")}</small>
            ${doctor}
            ${queueMeta}
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      `;
    }).join("") || '<div class="empty-record" style="min-height:180px"><p>Nenhum paciente encontrado.</p></div>';

    document.querySelectorAll("[data-patient-id]").forEach(button => {
      button.onclick = () => {
        selectedId = button.dataset.patientId;
        render();
      };
    });
  }

  function bodySvg(patient) {
    const zones = [
      ["cabeca", "Cabeça", '<circle class="body-zone" data-zone="cabeca" cx="75" cy="28" r="22"/>'],
      ["torax", "Tórax", '<rect class="body-zone" data-zone="torax" x="47" y="56" width="56" height="88" rx="24"/>'],
      ["abdomen", "Abdômen", '<rect class="body-zone" data-zone="abdomen" x="50" y="135" width="50" height="64" rx="20"/>'],
      ["braco-e", "Braço esquerdo", '<rect class="body-zone" data-zone="braco-e" x="23" y="63" width="19" height="120" rx="10" transform="rotate(6 32 123)"/>'],
      ["braco-d", "Braço direito", '<rect class="body-zone" data-zone="braco-d" x="108" y="63" width="19" height="120" rx="10" transform="rotate(-6 117 123)"/>'],
      ["perna-e", "Perna esquerda", '<rect class="body-zone" data-zone="perna-e" x="50" y="195" width="21" height="138" rx="11" transform="rotate(2 60 264)"/>'],
      ["perna-d", "Perna direita", '<rect class="body-zone" data-zone="perna-d" x="79" y="195" width="21" height="138" rx="11" transform="rotate(-2 89 264)"/>']
    ];

    return `<svg viewBox="0 0 150 350" aria-label="Mapa corporal">${
      zones.map(([id, , svg]) =>
        svg.replace(
          'class="body-zone"',
          `class="body-zone ${(patient.markers || []).includes(id) ? "marked" : ""}"`
        )
      ).join("")
    }</svg>`;
  }

  function addressText(patient) {
    const address = patient.address || {};
    return [
      address.street,
      address.number,
      address.neighborhood,
      address.city,
      address.state
    ].filter(Boolean).join(", ");
  }

  function tabContent(patient) {
    if (activeTab === "resumo") {
      const age = ageFromBirth(patient.birth);
      const address = addressText(patient);

      return `
        <div class="record-grid">
          <article class="record-card">
            <header><h3>Dados do paciente</h3><i class="fa-solid fa-address-card"></i></header>
            <div class="record-info">
              <div><small>CPF</small><strong>${escape(patient.cpf)}</strong></div>
              <div><small>Nascimento</small><strong>${escape(patient.birth)}</strong></div>
              ${age ? `<div><small>Idade</small><strong>${escape(age)}</strong></div>` : ""}
              <div><small>Telefone</small><strong>${escape(patient.phone || "—")}</strong></div>
              <div><small>Sexo</small><strong>${escape(patient.sex || "—")}</strong></div>
              ${address ? `<div style="grid-column:1/-1"><small>Endereço</small><strong>${escape(address)}</strong></div>` : ""}
            </div>
          </article>

          <article class="record-card">
            <header><h3>Alergias e alertas</h3><i class="fa-solid fa-triangle-exclamation"></i></header>
            <div class="record-info">
              <div style="grid-column:1/-1">
                <small>Alergias registradas</small>
                <strong>${escape(patient.allergies || "Nenhuma conhecida")}</strong>
              </div>
            </div>
          </article>

          <article class="record-card wide">
            <header><h3>Últimas evoluções</h3><i class="fa-solid fa-clock-rotate-left"></i></header>
            ${timeline(patient)}
          </article>
        </div>
      `;
    }

    if (activeTab === "anamnese") {
      return `
        <article class="record-card">
          <header><h3>Anamnese e queixa principal</h3><i class="fa-solid fa-clipboard-question"></i></header>
          <textarea class="record-textarea" id="anamneseText">${escape(patient.anamnese || "")}</textarea>
          <div class="record-save-row"><button class="record-primary" id="saveAnamnese">Salvar anamnese</button></div>
        </article>
      `;
    }

    if (activeTab === "evolucao") {
      return `
        <div class="record-grid">
          <article class="record-card">
            <header><h3>Nova evolução</h3><i class="fa-solid fa-pen-to-square"></i></header>
            <textarea class="record-textarea" id="newEvolution" placeholder="Descreva a evolução clínica..."></textarea>
            <div class="record-save-row"><button class="record-primary" id="addEvolution">Adicionar evolução</button></div>
          </article>
          <article class="record-card">
            <header><h3>Histórico</h3><i class="fa-solid fa-timeline"></i></header>
            ${timeline(patient)}
          </article>
        </div>
      `;
    }

    if (activeTab === "mapa") {
      return `
        <div class="body-map-grid">
          <div class="body-map">${bodySvg(patient)}</div>
          <article class="body-map-help">
            <div>
              <span class="eyebrow">Mapa corporal</span>
              <h3>Marcação de dor ou queixa</h3>
              <p>Clique em uma região do corpo para marcar ou remover um ponto clínico.</p>
            </div>
            <div class="body-marker-list">
              ${(patient.markers || []).map(id => `
                <div class="body-marker-item">
                  <span>${zoneName(id)}</span>
                  <button data-remove-zone="${id}"><i class="fa-solid fa-xmark"></i></button>
                </div>
              `).join("") || "<p>Nenhuma região marcada.</p>"}
            </div>
          </article>
        </div>
      `;
    }

    if (activeTab === "prescricao") {
      return `
        <article class="record-card">
          <header><h3>Prescrições</h3><i class="fa-solid fa-prescription-bottle-medical"></i></header>
          <div class="timeline">
            ${(patient.prescriptions || []).map(item => `
              <div class="timeline-item">
                <span><i class="fa-solid fa-pills"></i></span>
                <div><strong>Prescrição</strong><p>${escape(item)}</p></div>
              </div>
            `).join("") || "<p>Nenhuma prescrição registrada.</p>"}
          </div>
          <textarea class="record-textarea" id="newPrescription" placeholder="Medicamento, dose e orientação..."></textarea>
          <div class="record-save-row"><button class="record-primary" id="addPrescription">Adicionar prescrição</button></div>
        </article>
      `;
    }

    return `
      <article class="record-card">
        <header><h3>Exames e documentos</h3><i class="fa-solid fa-folder-open"></i></header>
        <div class="timeline">
          ${(patient.documents || []).map(item => `
            <div class="timeline-item">
              <span><i class="fa-solid fa-file-medical"></i></span>
              <div><strong>Documento clínico</strong><p>${escape(item)}</p></div>
            </div>
          `).join("") || "<p>Nenhum documento vinculado.</p>"}
        </div>
        <textarea class="record-textarea" id="newDocument" placeholder="Nome ou observação do documento..."></textarea>
        <div class="record-save-row"><button class="record-primary" id="addDocument">Adicionar documento</button></div>
      </article>
    `;
  }

  function timeline(patient) {
    return `<div class="timeline">${
      (patient.evolutions || []).slice().reverse().map(item => `
        <div class="timeline-item">
          <span><i class="fa-solid fa-user-doctor"></i></span>
          <div>
            <strong>${new Date(item.date).toLocaleString("pt-BR")}</strong>
            <p>${escape(item.text)}</p>
          </div>
        </div>
      `).join("") || "<p>Nenhuma evolução registrada.</p>"
    }</div>`;
  }

  function zoneName(id) {
    return ({
      cabeca: "Cabeça",
      torax: "Tórax",
      abdomen: "Abdômen",
      "braco-e": "Braço esquerdo",
      "braco-d": "Braço direito",
      "perna-e": "Perna esquerda",
      "perna-d": "Perna direita"
    })[id] || id;
  }

  function renderWorkspace() {
    const patient = selected();

    if (!patient) {
      $("patientWorkspace").innerHTML = `
        <div class="empty-record">
          <span><i class="fa-solid fa-user-injured"></i></span>
          <h2>Selecione um paciente</h2>
          <p>Abra um cadastro ao lado.</p>
        </div>
      `;
      return;
    }

    const queueRecord = findQueueRecord(patient);
    const queueStatus = queueRecord?.status || patient.receptionStatus;
    const queueDoctor = queueRecord?.doctor || patient.receptionDoctor;

    const receptionActions = patient.receptionQueueId
      ? `
        <div class="record-reception-actions">
          ${queueDoctor ? `<span class="record-doctor-badge"><i class="fa-solid fa-user-doctor"></i> ${escape(queueDoctor)}</span>` : ""}
          <span class="record-queue-badge is-${escape(queueStatus || STATUS.WAITING)}">${escape(queueStatusLabel(queueStatus))}</span>
          ${queueStatus === STATUS.WAITING
            ? `<button type="button" class="record-call-patient" id="callReceptionPatient"><i class="fa-solid fa-bullhorn"></i> Chamar paciente</button>`
            : ""}
        </div>
      `
      : "";

    $("patientWorkspace").innerHTML = `
      <header class="record-patient-head">
        <div class="record-patient-title">
          <span class="patient-avatar">${initials(patient.name)}</span>
          <div>
            <h2>${escape(patient.name)}</h2>
            <p>${escape(patient.cpf)} • ${escape(patient.phone || "Sem telefone")}</p>
          </div>
        </div>
        <div class="record-badges">
          <span class="record-badge">${escape(patient.sex || "Paciente")}</span>
          <span class="record-badge">${(patient.evolutions || []).length} evoluções</span>
        </div>
      </header>

      ${receptionActions}

      <nav class="record-tabs">
        ${[
          ["resumo", "Resumo"],
          ["anamnese", "Anamnese"],
          ["evolucao", "Evolução"],
          ["mapa", "Mapa corporal"],
          ["prescricao", "Prescrição"],
          ["documentos", "Exames e documentos"]
        ].map(([id, label]) =>
          `<button class="record-tab ${activeTab === id ? "active" : ""}" data-record-tab="${id}">${label}</button>`
        ).join("")}
      </nav>

      <section class="record-panel active">${tabContent(patient)}</section>
    `;

    bindWorkspace();
  }

  function bindWorkspace() {
    document.querySelectorAll("[data-record-tab]").forEach(button => {
      button.onclick = () => {
        activeTab = button.dataset.recordTab;
        renderWorkspace();
      };
    });

    const patient = selected();

    $("callReceptionPatient")?.addEventListener("click", () => {
      callReceptionPatient(patient);
    });

    document.querySelectorAll(".body-zone").forEach(zone => {
      zone.onclick = () => {
        patient.markers = patient.markers || [];
        patient.markers.includes(zone.dataset.zone)
          ? patient.markers = patient.markers.filter(item => item !== zone.dataset.zone)
          : patient.markers.push(zone.dataset.zone);
        save();
        renderWorkspace();
      };
    });

    document.querySelectorAll("[data-remove-zone]").forEach(button => {
      button.onclick = () => {
        patient.markers = (patient.markers || []).filter(item => item !== button.dataset.removeZone);
        save();
        renderWorkspace();
      };
    });

    $("saveAnamnese")?.addEventListener("click", () => {
      patient.anamnese = $("anamneseText").value.trim();
      save();
      window.LAGUI?.toast("Anamnese salva.");
    });

    $("addEvolution")?.addEventListener("click", () => {
      const text = $("newEvolution").value.trim();
      if (!text) return;
      patient.evolutions = patient.evolutions || [];
      patient.evolutions.push({ date: new Date().toISOString(), text });
      save();
      renderWorkspace();
    });

    $("addPrescription")?.addEventListener("click", () => {
      const text = $("newPrescription").value.trim();
      if (!text) return;
      patient.prescriptions = patient.prescriptions || [];
      patient.prescriptions.push(text);
      save();
      renderWorkspace();
    });

    $("addDocument")?.addEventListener("click", () => {
      const text = $("newDocument").value.trim();
      if (!text) return;
      patient.documents = patient.documents || [];
      patient.documents.push(text);
      save();
      renderWorkspace();
    });
  }

  function render() {
    renderList();
    renderWorkspace();
  }

  document.addEventListener("DOMContentLoaded", () => {
    syncReceptionQueueIntoPatients();

    if (!selectedId && patients.length) selectedId = patients[0].id;

    $("patientSearch").oninput = renderList;
    $("topPatientSearch").oninput = event => {
      $("patientSearch").value = event.target.value;
      renderList();
    };

    $("clearPatientSearch").onclick = () => {
      $("patientSearch").value = "";
      $("topPatientSearch").value = "";
      renderList();
    };

    $("newPatient").onclick = () => {
      $("patientModal").hidden = false;
    };

    document.querySelectorAll("[data-close-patient]").forEach(button => {
      button.onclick = () => {
        $("patientModal").hidden = true;
      };
    });

    $("patientCpf").oninput = event => {
      event.target.value = formatCpf(event.target.value);
    };

    $("patientForm").onsubmit = event => {
      event.preventDefault();

      const name = $("patientName").value.trim();
      const patient = {
        id: `p-${Date.now().toString(36)}`,
        name,
        cpf: formatCpf($("patientCpf").value),
        birth: $("patientBirth").value,
        phone: $("patientPhone").value.trim(),
        sex: $("patientSex").value,
        allergies: $("patientAllergies").value.trim(),
        anamnese: "",
        evolutions: [],
        markers: [],
        prescriptions: [],
        documents: []
      };

      patients.unshift(patient);
      selectedId = patient.id;
      save();
      $("patientModal").hidden = true;
      event.target.reset();
      render();
    };

    window.addEventListener("storage", event => {
      if (event.key !== QUEUE_KEY) return;
      syncReceptionQueueIntoPatients();
      render();
    });

    render();
    refreshReceptionQueueFromCloud();
    window.setInterval(refreshReceptionQueueFromCloud, 6000);
  });
})();
