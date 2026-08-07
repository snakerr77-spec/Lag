const STORAGE_MEDICOS = "amorSaude_medicos_planilha_agosto_2026_v2";
const MEDICAL_SHEET = window.LAG_MEDICAL_SHEET || {};
const STORAGE_EXAMES = "amorSaude_exames_organizado_v1";

const medicosBase = Array.isArray(MEDICAL_SHEET.fallback) && MEDICAL_SHEET.fallback.length ? MEDICAL_SHEET.fallback : [
  {
    id: "med-1",
    nome: "Dra. Lisa",
    especialidade: "Oftalmologia",
    crm: "CRM a confirmar",
    unidade: "Sala 1",
    idade: "Livre",
    valor: "Consultar unidade",
    status: "Atendendo",
    observacao: "Saúde ocular. Confirmar agenda oficial antes de passar horário ao paciente.",
    horarios: [
      { dia: "Segunda", inicio: "08:00", fim: "12:00", sala: "Sala 1", tipo: "Consulta", vagas: "6 vagas" },
      { dia: "Quarta", inicio: "13:00", fim: "17:00", sala: "Sala 1", tipo: "Consulta", vagas: "5 vagas" }
    ]
  },
  {
    id: "med-2",
    nome: "Dra. Flávia",
    especialidade: "Clínico Geral",
    crm: "CRM a confirmar",
    unidade: "Sala 2",
    idade: "Adulto",
    valor: "Consultar unidade",
    status: "Horário limitado",
    observacao: "Atendimento clínico sujeito à disponibilidade da unidade.",
    horarios: [
      { dia: "Terça", inicio: "09:00", fim: "12:00", sala: "Sala 2", tipo: "Consulta", vagas: "4 vagas" },
      { dia: "Quinta", inicio: "14:00", fim: "18:00", sala: "Sala 2", tipo: "Consulta", vagas: "5 vagas" }
    ]
  },
  {
    id: "med-3",
    nome: "Dr. Pedro Lucas",
    especialidade: "Clínico Geral",
    crm: "CRM a confirmar",
    unidade: "Sala 3",
    idade: "Livre",
    valor: "Consultar unidade",
    status: "Atendendo",
    observacao: "Consulta clínica geral. Validar retornos e encaixes com a recepção.",
    horarios: [
      { dia: "Segunda", inicio: "13:30", fim: "18:00", sala: "Sala 3", tipo: "Consulta", vagas: "8 vagas" },
      { dia: "Sexta", inicio: "08:00", fim: "12:00", sala: "Sala 3", tipo: "Consulta", vagas: "6 vagas" }
    ]
  },
  {
    id: "med-4",
    nome: "Dra. Larissa Junqueira Akl",
    especialidade: "Dermatologia",
    crm: "CRM a confirmar",
    unidade: "Sala 4",
    idade: "Adulto",
    valor: "Consultar unidade",
    status: "Atendendo",
    observacao: "Atendimento dermatológico. Confirmar procedimentos disponíveis na unidade.",
    horarios: [
      { dia: "Quarta", inicio: "08:00", fim: "12:00", sala: "Sala 4", tipo: "Consulta", vagas: "5 vagas" }
    ]
  }
];

const examesBase = [
  {
    id: "exa-1",
    nome: "Hemograma completo",
    categoria: "Laboratorial",
    valor: "R$ 40,00",
    precisaJejum: false,
    jejumHoras: "Não precisa",
    preparo: "Sem preparo especial. Levar documento e pedido médico, quando houver.",
    prazo: "24 horas",
    observacao: "Confirmar valores atualizados na recepção."
  },
  {
    id: "exa-2",
    nome: "Glicemia de jejum",
    categoria: "Laboratorial",
    valor: "R$ 25,00",
    precisaJejum: true,
    jejumHoras: "8 horas",
    preparo: "Manter jejum mínimo de 8 horas. Água liberada em pequena quantidade.",
    prazo: "24 horas",
    observacao: "Orientar o paciente a avisar uso de medicamentos."
  },
  {
    id: "exa-3",
    nome: "Ultrassom abdominal total",
    categoria: "Imagem",
    valor: "Consultar unidade",
    precisaJejum: true,
    jejumHoras: "6 a 8 horas",
    preparo: "Jejum conforme orientação da unidade. Pode exigir bexiga cheia dependendo do protocolo.",
    prazo: "Até 2 dias úteis",
    observacao: "Confirmar preparo específico antes do agendamento."
  },
  {
    id: "exa-4",
    nome: "Eletrocardiograma",
    categoria: "Cardiologia",
    valor: "Consultar unidade",
    precisaJejum: false,
    jejumHoras: "Não precisa",
    preparo: "Sem jejum. Evitar creme ou óleo no tórax no dia do exame.",
    prazo: "No mesmo dia ou conforme unidade",
    observacao: "Confirmar se precisa de laudo médico."
  }
];

let medicos = carregar(STORAGE_MEDICOS, medicosBase);
let exames = carregar(STORAGE_EXAMES, examesBase);
let medicoSelecionadoId = medicos[0]?.id || null;

const $ = (id) => document.getElementById(id);

function carregar(chave, padrao) {
  try {
    const dados = JSON.parse(localStorage.getItem(chave));
    return Array.isArray(dados) ? dados : padrao;
  } catch {
    return padrao;
  }
}

function salvarMedicos() {
  localStorage.setItem(STORAGE_MEDICOS, JSON.stringify(medicos));
}

function salvarExames() {
  localStorage.setItem(STORAGE_EXAMES, JSON.stringify(exames));
}

function escapeHTML(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizar(valor) {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function faixaEtariaPorEspecialidade(especialidade) {
  const texto = normalizar(especialidade);

  if (texto.includes("pediatr")) return "0 a 17 anos";
  if (texto.includes("geriatr")) return "60 anos ou mais";
  if (texto.includes("medico da familia") || texto.includes("familia e comunidade")) return "Todas as idades";

  if (
    texto.includes("psicolog")
    || texto.includes("nutricao")
    || texto.includes("fisioter")
    || texto.includes("oftalm")
  ) {
    return "Crianças e adultos — confirmar restrições";
  }

  if (
    texto.includes("clinica medica")
    || texto.includes("cardio")
    || texto.includes("gineco")
    || texto.includes("urolo")
    || texto.includes("cirurgia vascular")
    || texto.includes("dermato")
    || texto.includes("gastro")
    || texto.includes("neuro")
    || texto.includes("ortoped")
    || texto.includes("endocr")
    || texto.includes("nutrolog")
    || texto.includes("reumato")
  ) {
    return "Adultos — menores sob confirmação";
  }

  return "Confirmar faixa etária com a unidade";
}

function gerarId(prefixo) {
  if (window.crypto?.randomUUID) return `${prefixo}-${crypto.randomUUID()}`;
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getInitials(nome = "") {
  const clean = String(nome).replace(/\b(Dr|Dra)\.?\b/gi, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (!parts.length) return "MD";
  return `${parts[0]?.[0] || "M"}${parts[1]?.[0] || parts[0]?.[1] || "D"}`.toUpperCase();
}

function statusBadge(status) {
  const texto = normalizar(status);
  if (texto.includes("publicada") || texto.includes("limitado")) return "orange";
  if (texto.includes("completa") || texto.includes("encerrada") || texto.includes("sem")) return "red";
  return "green";
}

function mostrarToast(mensagem) {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = mensagem;
  toast.classList.add("show");
  clearTimeout(mostrarToast.timer);
  mostrarToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function horariosParaTexto(horarios = []) {
  return horarios.map(h => `${h.dia || ""} | ${h.inicio || ""} | ${h.fim || ""} | ${h.sala || ""} | ${h.tipo || ""} | ${h.vagas || ""}`).join("\n");
}

function textoParaHorarios(texto) {
  return String(texto || "")
    .split("\n")
    .map(linha => linha.trim())
    .filter(Boolean)
    .map((linha) => {
      const partes = linha.split("|").map(parte => parte.trim());
      return {
        dia: partes[0] || "A confirmar",
        inicio: partes[1] || "",
        fim: partes[2] || "",
        sala: partes[3] || "",
        tipo: partes[4] || "Consulta",
        vagas: partes[5] || ""
      };
    });
}


function iniciarPlanilhaMedica() {
  const status = $("sheetSyncStatus");
  const lastSync = localStorage.getItem("lag-medical-sheet-last-sync");
  if (status) {
    status.textContent = lastSync
      ? `Planilha atualizada em ${new Date(lastSync).toLocaleString("pt-BR")}`
      : `${MEDICAL_SHEET.periodo || "Agenda médica"} importada da planilha`;
  }
  sincronizarPlanilhaMedica(true);
}

async function sincronizarPlanilhaMedica(silencioso = false) {
  const button = $("btnSincronizarPlanilha");
  const status = $("sheetSyncStatus");
  const spreadsheetId = MEDICAL_SHEET.spreadsheetId;
  const sheetName = MEDICAL_SHEET.sheetName || "Agosto";
  if (!spreadsheetId) return;

  if (button) {
    button.disabled = true;
    button.classList.add("loading");
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Atualizando...';
  }
  if (status) status.textContent = `Lendo a aba ${sheetName} da planilha...`;

  try {
    const endpoint = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&_=${Date.now()}`;
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) throw new Error(`Falha ao carregar a planilha (${response.status})`);
    const csv = await response.text();
    const matrix = parseCSV(csv);
    const imported = construirMedicosDaPlanilha(matrix, sheetName);
    if (!imported.length) throw new Error("Nenhum profissional foi encontrado na planilha.");

    const manual = medicos.filter(item => !String(item.id || "").startsWith("planilha-"));
    medicos = [...imported, ...manual];
    medicoSelecionadoId = imported[0]?.id || manual[0]?.id || null;
    salvarMedicos();
    atualizarTudo();

    const syncedAt = new Date().toISOString();
    localStorage.setItem("lag-medical-sheet-last-sync", syncedAt);
    if (status) status.textContent = `${imported.length} profissionais • nomes, especialidades e dias lidos da planilha`;
    if (!silencioso) mostrarToast("Médicos e dias de atendimento atualizados pela planilha.");
  } catch (error) {
    console.warn("Não foi possível sincronizar a planilha médica:", error);
    if (status) status.textContent = `Dados médicos salvos • ${MEDICAL_SHEET.periodo || "Agenda médica"}`;
    if (!silencioso) mostrarToast("Não foi possível atualizar online. Mantive os dados importados.");
  } finally {
    if (button) {
      button.disabled = false;
      button.classList.remove("loading");
      button.innerHTML = '<i class="fa-solid fa-rotate"></i> Atualizar planilha';
    }
  }
}

function parseCSV(csv) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < String(csv || "").length; i += 1) {
    const char = csv[i];
    const next = csv[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function construirMedicosDaPlanilha(matrix, sheetName) {
  const dayColumns = [
    { index: 1, label: "Domingo" },
    { index: 5, label: "Segunda" },
    { index: 9, label: "Terça" },
    { index: 13, label: "Quarta" },
    { index: 17, label: "Quinta" },
    { index: 21, label: "Sexta" },
    { index: 25, label: "Sábado" }
  ];
  const year = Number(MEDICAL_SHEET.ano || new Date().getFullYear());
  const monthNumber = {
    janeiro: 1, fevereiro: 2, marco: 3, março: 3, abril: 4, maio: 5, junho: 6,
    julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12
  }[normalizar(sheetName)] || (new Date().getMonth() + 1);
  const lastDay = new Date(year, monthNumber, 0).getDate();

  const dateRows = [];
  matrix.forEach((row, rowIndex) => {
    const dates = [];
    dayColumns.forEach(day => {
      const raw = String(row?.[day.index] || "").trim();
      if (/^\d{1,2}$/.test(raw)) {
        const dayNumber = Number(raw);
        if (dayNumber >= 1 && dayNumber <= lastDay) dates.push({ ...day, dayNumber });
      }
    });
    if (dates.length) dateRows.push({ rowIndex, dates });
  });

  const entries = [];
  dateRows.forEach((block, blockIndex) => {
    const endRow = dateRows[blockIndex + 1]?.rowIndex ?? matrix.length;
    block.dates.forEach(dateInfo => {
      for (let rowIndex = block.rowIndex + 1; rowIndex < endRow; rowIndex += 1) {
        const row = matrix[rowIndex] || [];
        const rawName = String(row[dateInfo.index] || "").trim();
        if (!rawName.includes(" - ") || normalizar(rawName).startsWith("exames de")) continue;

        const [name, ...specialtyParts] = rawName.split(" - ");
        const specialty = specialtyParts.join(" - ").trim();
        if (!name.trim() || !specialty) continue;
        const iso = `${year}-${String(monthNumber).padStart(2, "0")}-${String(dateInfo.dayNumber).padStart(2, "0")}`;

        entries.push({
          name: name.trim(),
          specialty,
          date: iso,
          day: dateInfo.label
        });
      }
    });
  });

  const grouped = new Map();
  entries.forEach(entry => {
    const key = `${normalizar(entry.name)}|${normalizar(entry.specialty)}`;
    if (!grouped.has(key)) grouped.set(key, { name: entry.name, specialty: entry.specialty, schedules: [] });
    const group = grouped.get(key);
    if (!group.schedules.some(item => item.date === entry.date)) group.schedules.push(entry);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [...grouped.values()]
    .map(group => {
      group.schedules.sort((a, b) => a.date.localeCompare(b.date));
      const hasFuture = group.schedules.some(item => new Date(`${item.date}T12:00:00`) >= today);
      const slug = normalizar(`${group.name}-${group.specialty}`)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      return {
        id: `planilha-${slug}`,
        nome: group.name,
        especialidade: group.specialty,
        crm: "CRM a confirmar",
        cidade: MEDICAL_SHEET.cidade || "Cerquilho",
        telefone: "",
        email: "",
        unidade: "Calendário Medicina",
        idade: faixaEtariaPorEspecialidade(group.specialty),
        valor: "",
        duracao: "",
        status: hasFuture ? "Agenda publicada" : "Agenda encerrada",
        observacao: `Nome, especialidade e dias de atendimento lidos da planilha Calendário Medicina — ${sheetName} de ${year}.`,
        fonte: "Google Sheets",
        periodo: `${sheetName} ${year}`,
        horarios: group.schedules.map(item => {
          const [yyyy, mm, dd] = item.date.split("-");
          return {
            data: item.date,
            dataLabel: `${dd}/${mm}/${yyyy}`,
            dia: item.day,
            inicio: "",
            fim: "",
            sala: MEDICAL_SHEET.cidade || "Cerquilho",
            tipo: "Consulta",
            vagas: "Atendimento registrado no calendário médico"
          };
        })
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function fecharMenu() {
  const menu = $("topbarMenu");
  const button = $("menuToggle");
  menu?.classList.remove("open");
  button?.classList.remove("open");
  button?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
}

function abrirAba(nome) {
  if (!nome) return;

  document.querySelectorAll(".tab").forEach(tab => {
    const ativa = tab.dataset.tab === nome;
    tab.classList.toggle("active", ativa);
    tab.setAttribute("aria-selected", String(ativa));
  });

  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === nome);
  });

  fecharMenu();

  if (window.innerWidth <= 720) {
    $(nome)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  iniciarAbas();
  iniciarMedicos();
  iniciarPlanilhaMedica();
  iniciarExames();
  iniciarModais();
  iniciarVoltarTopo();
  iniciarReveals();
  atualizarTudo();
});

function iniciarAbas() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => abrirAba(tab.dataset.tab));
  });

  document.querySelectorAll("[data-open-tab]").forEach(btn => {
    btn.addEventListener("click", () => abrirAba(btn.dataset.openTab));
  });
}

function iniciarMedicos() {
  $("btnNovoMedico")?.addEventListener("click", abrirModalMedico);
  $("btnNovoMedicoHero")?.addEventListener("click", abrirModalMedico);
  $("btnNovoHorario")?.addEventListener("click", abrirModalHorario);
  $("btnLimparFiltroMedicos")?.addEventListener("click", limparFiltrosMedicos);
  $("buscaMedico")?.addEventListener("input", renderizarMedicos);
  $("filtroEspecialidade")?.addEventListener("change", renderizarMedicos);
  $("filtroDia")?.addEventListener("change", renderizarMedicos);
  $("formMedico")?.addEventListener("submit", salvarFormularioMedico);
  $("btnSincronizarPlanilha")?.addEventListener("click", () => sincronizarPlanilhaMedica(false));
}

function iniciarExames() {
  $("btnNovoExame")?.addEventListener("click", abrirModalExame);
  $("btnNovoExameHero")?.addEventListener("click", abrirModalExame);
  $("btnLimparFiltroExames")?.addEventListener("click", limparFiltrosExames);
  $("buscaExame")?.addEventListener("input", renderizarExames);
  $("filtroJejum")?.addEventListener("change", renderizarExames);
  $("filtroCategoria")?.addEventListener("change", renderizarExames);
  $("formExame")?.addEventListener("submit", salvarFormularioExame);

  $("exameJejum")?.addEventListener("change", () => {
    const horas = $("exameJejumHoras");
    if (!horas) return;
    horas.value = $("exameJejum").value === "sim"
      ? (horas.value === "Não precisa" || !horas.value ? "8 horas" : horas.value)
      : "Não precisa";
  });
}

function iniciarModais() {
  $("fecharModalMedicoBtn")?.addEventListener("click", fecharModalMedico);
  $("cancelarModalMedico")?.addEventListener("click", fecharModalMedico);
  $("fecharModalExameBtn")?.addEventListener("click", fecharModalExame);
  $("cancelarModalExame")?.addEventListener("click", fecharModalExame);
  $("fecharModalHorarioBtn")?.addEventListener("click", fecharModalHorario);
  $("cancelarModalHorario")?.addEventListener("click", fecharModalHorario);
  $("formHorario")?.addEventListener("submit", salvarHorario);

  $("modalMedicoOverlay")?.addEventListener("click", event => {
    if (event.target.id === "modalMedicoOverlay") fecharModalMedico();
  });

  $("modalExameOverlay")?.addEventListener("click", event => {
    if (event.target.id === "modalExameOverlay") fecharModalExame();
  });

  $("modalHorarioOverlay")?.addEventListener("click", event => {
    if (event.target.id === "modalHorarioOverlay") fecharModalHorario();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      fecharModalMedico();
      fecharModalExame();
      fecharModalHorario();
      fecharMenu();
    }
  });
}

function iniciarVoltarTopo() {
  const button = $("pageBackTop");
  if (!button) return;
  const update = () => button.classList.toggle("show", window.scrollY > 420);
  window.addEventListener("scroll", update, { passive: true });
  update();
  button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

function iniciarReveals() {
  const itens = document.querySelectorAll(".reveal-on-scroll");
  if (!itens.length) return;

  if (!window.IntersectionObserver) {
    itens.forEach(item => item.classList.add("revealed"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .12 });

  itens.forEach(item => observer.observe(item));
}

function atualizarTudo() {
  popularFiltros();
  atualizarResumo();
  renderizarMedicos();
  renderizarDetalheMedico();
  renderizarExames();
}

function setCounter(id, valor) {
  const el = $(id);
  if (!el) return;

  const atual = Number(el.dataset.valor || el.textContent || 0);
  const proximo = Number(valor || 0);
  el.dataset.valor = String(proximo);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.textContent = proximo;
    return;
  }

  const inicio = performance.now();
  const duracao = 520;

  function frame(tempo) {
    const progresso = Math.min((tempo - inicio) / duracao, 1);
    const ease = 1 - Math.pow(1 - progresso, 3);
    el.textContent = Math.round(atual + (proximo - atual) * ease);
    if (progresso < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function atualizarResumo() {
  const totalHorarios = medicos.reduce((total, medico) => total + (medico.horarios?.length || 0), 0);
  setCounter("resumoMedicos", medicos.length);
  setCounter("resumoHorarios", totalHorarios);
  setCounter("resumoExames", exames.length);
  setCounter("resumoJejum", exames.filter(exame => exame.precisaJejum).length);
}

function popularFiltros() {
  const filtroEspecialidade = $("filtroEspecialidade");
  const filtroCategoria = $("filtroCategoria");

  if (filtroEspecialidade) {
    const valorAtual = filtroEspecialidade.value;
    const especialidades = [...new Set(medicos.map(m => m.especialidade).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
    filtroEspecialidade.innerHTML = `<option value="">Todas</option>`;
    especialidades.forEach(item => filtroEspecialidade.add(new Option(item, item)));
    filtroEspecialidade.value = especialidades.includes(valorAtual) ? valorAtual : "";
  }

  if (filtroCategoria) {
    const valorAtual = filtroCategoria.value;
    const categorias = [...new Set(exames.map(e => e.categoria).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
    filtroCategoria.innerHTML = `<option value="">Todas</option>`;
    categorias.forEach(item => filtroCategoria.add(new Option(item, item)));
    filtroCategoria.value = categorias.includes(valorAtual) ? valorAtual : "";
  }
}

function getMedicosFiltrados() {
  const busca = normalizar($("buscaMedico")?.value);
  const especialidade = $("filtroEspecialidade")?.value || "";
  const dia = $("filtroDia")?.value || "";

  return medicos.filter(medico => {
    const horariosTexto = (medico.horarios || [])
      .map(h => `${h.dia} ${h.inicio} ${h.fim} ${h.sala} ${h.tipo} ${h.vagas}`)
      .join(" ");
    const texto = normalizar(`${medico.nome} ${medico.especialidade} ${medico.crm} ${medico.cidade || ""} ${medico.telefone || ""} ${medico.email || ""} ${medico.unidade} ${medico.idade} ${medico.valor} ${medico.duracao || ""} ${medico.status} ${medico.observacao} ${horariosTexto}`);
    const atendeBusca = !busca || texto.includes(busca);
    const atendeEspecialidade = !especialidade || medico.especialidade === especialidade;
    const atendeDia = !dia || (medico.horarios || []).some(h => h.dia === dia);
    return atendeBusca && atendeEspecialidade && atendeDia;
  });
}

function renderizarMedicos() {
  const lista = $("listaMedicos");
  const vazio = $("semResultadoMedicos");
  if (!lista || !vazio) return;

  const filtrados = getMedicosFiltrados();
  lista.innerHTML = "";
  vazio.style.display = filtrados.length ? "none" : "grid";

  if (!filtrados.some(m => m.id === medicoSelecionadoId)) {
    medicoSelecionadoId = filtrados[0]?.id || medicos[0]?.id || null;
  }

  filtrados.forEach(medico => {
    const horarios = medico.horarios || [];
    const dias = [...new Set(horarios.map(h => h.dia).filter(Boolean))].join(", ") || "Sem horários";
    const card = document.createElement("article");
    card.className = `doctor-item ${medico.id === medicoSelecionadoId ? "active" : ""}`;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Ver agenda de ${medico.nome}`);
    card.innerHTML = `
      <div class="doctor-avatar" aria-hidden="true">${escapeHTML(getInitials(medico.nome))}</div>
      <div class="doctor-main">
        <h3>${escapeHTML(medico.nome)}</h3>
        <p class="doctor-meta">${escapeHTML(medico.especialidade)} • ${escapeHTML(medico.crm || "CRM a confirmar")}</p>
        <div class="doctor-badges">
          <span class="badge ${statusBadge(medico.status)}">${escapeHTML(medico.status || "Atendendo")}</span>
          ${medico.fonte ? `<span class="badge"><i class="fa-solid fa-table-cells"></i> ${escapeHTML(medico.fonte)}</span>` : ""}
          ${medico.idade ? `<span class="badge age"><i class="fa-solid fa-people-group"></i> ${escapeHTML(medico.idade)}</span>` : ""}
          <span class="badge dark">${escapeHTML(horarios.length)} data(s) no mês</span>
          <span class="badge dark"><i class="fa-solid fa-location-dot"></i> ${escapeHTML(medico.cidade || "Cidade não informada")}</span>
        </div>
        <p class="doctor-meta"><strong>Dias de atendimento:</strong> ${escapeHTML(dias)}</p>
      </div>
      <div class="doctor-actions">
        <button type="button" class="icon-btn" data-action="ver" data-id="${escapeHTML(medico.id)}">Ver</button>
        <button type="button" class="icon-btn" data-action="editar" data-id="${escapeHTML(medico.id)}">Editar</button>
        <button type="button" class="icon-btn delete" data-action="excluir" data-id="${escapeHTML(medico.id)}">Excluir</button>
      </div>
    `;

    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      selecionarMedico(medico.id);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selecionarMedico(medico.id);
      }
    });

    lista.appendChild(card);
  });

  lista.querySelectorAll("[data-action]").forEach(button => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      const action = button.dataset.action;
      if (action === "ver") selecionarMedico(id);
      if (action === "editar") editarMedico(id);
      if (action === "excluir") excluirMedico(id);
    });
  });

  renderizarDetalheMedico();
}

function selecionarMedico(id) {
  medicoSelecionadoId = id;
  renderizarMedicos();
}

function renderizarDetalheMedico() {
  const detail = $("detalheMedico");
  if (!detail) return;

  const medico = medicos.find(m => m.id === medicoSelecionadoId);
  if (!medico) {
    detail.innerHTML = `<div class="empty-detail"><strong>Selecione um médico</strong><span>Os dias de atendimento aparecem aqui.</span></div>`;
    return;
  }

  const horarios = medico.horarios || [];
  const dias = [...new Set(horarios.map(h => h.dia).filter(Boolean))].join(", ") || "Não informado";
  const datas = horarios.map(h => h.dataLabel).filter(Boolean).join(", ") || "Não informadas";
  const agenda = horarios.length
    ? horarios.map(h => {
      const title = h.dataLabel
        ? `${h.dataLabel} • ${h.dia || "Dia a confirmar"}`
        : `${h.dia || "Dia a confirmar"} • ${h.inicio || "--:--"} às ${h.fim || "--:--"}`;
      const details = h.dataLabel
        ? `${h.tipo || "Consulta"} • ${h.vagas || "Atendimento conforme calendário"}`
        : `${h.tipo || "Consulta"} • ${h.sala || medico.unidade || "Sala a confirmar"}`;
      return `
        <div class="schedule-item">
          <strong>${escapeHTML(title)}</strong>
          <span>${escapeHTML(details)}</span>
        </div>
      `;
    }).join("")
    : `<div class="schedule-item"><strong>Sem dias cadastrados</strong><span>Adicione uma agenda no botão editar.</span></div>`;

  const optionalLines = [
    medico.telefone || medico.email ? `<div class="detail-line"><small>Contato</small><span>${escapeHTML([medico.telefone, medico.email].filter(Boolean).join(" · "))}</span></div>` : "",
    medico.idade ? `<div class="detail-line"><small>Faixa etária atendida</small><strong>${escapeHTML(medico.idade)}</strong></div>` : "",
    medico.valor ? `<div class="detail-line"><small>Valor</small><strong>${escapeHTML(medico.valor)}</strong></div>` : "",
    medico.duracao ? `<div class="detail-line"><small>Duração média</small><strong>${escapeHTML(medico.duracao)}</strong></div>` : ""
  ].join("");

  detail.innerHTML = `
    <div class="detail-head">
      <div class="doctor-avatar" aria-hidden="true">${escapeHTML(getInitials(medico.nome))}</div>
      <h3>${escapeHTML(medico.nome)}</h3>
      <p>${escapeHTML(medico.especialidade)} • ${escapeHTML(medico.crm || "CRM a confirmar")}</p>
    </div>
    <div class="detail-body">
      <div class="detail-line"><small>Status</small><strong>${escapeHTML(medico.status || "Atendendo")}</strong></div>
      <div class="detail-line"><small>Cidade</small><strong>${escapeHTML(medico.cidade || "A confirmar")}</strong></div>
      <div class="detail-line"><small>Fonte dos dados</small><strong>${escapeHTML(medico.fonte || "Cadastro interno")}</strong></div>
      <div class="detail-line"><small>Período</small><strong>${escapeHTML(medico.periodo || "Agenda atual")}</strong></div>
      <div class="detail-line"><small>Dias de atendimento</small><strong>${escapeHTML(dias)}</strong></div>
      <div class="detail-line"><small>Datas no mês</small><span>${escapeHTML(datas)}</span></div>
      ${optionalLines}
      <div class="detail-line"><small>Observação</small><span>${escapeHTML(medico.observacao || "Sem observação")}</span></div>
      <div class="schedule-list">${agenda}</div>
    </div>
  `;
}

function abrirModalMedico() {
  $("tituloModalMedico").textContent = "Novo médico";
  $("formMedico").reset();
  $("medicoId").value = "";
  $("medicoHorarios").value = "";
  if ($("medicoCidade")) $("medicoCidade").value = window.LAGSettings?.getActiveCity?.() || "Cerquilho";
  abrirModal("modalMedicoOverlay");
  setTimeout(() => $("medicoNome")?.focus(), 80);
}

function editarMedico(id) {
  const medico = medicos.find(m => m.id === id);
  if (!medico) return;
  $("tituloModalMedico").textContent = "Editar médico";
  $("medicoId").value = medico.id;
  $("medicoNome").value = medico.nome || "";
  $("medicoEspecialidade").value = medico.especialidade || "";
  $("medicoCrm").value = medico.crm || "";
  $("medicoCidade").value = medico.cidade || "Cerquilho";
  $("medicoTelefone").value = medico.telefone || "";
  $("medicoEmail").value = medico.email || "";
  $("medicoUnidade").value = medico.unidade || "";
  $("medicoIdade").value = medico.idade || "";
  $("medicoValor").value = medico.valor || "";
  $("medicoDuracao").value = medico.duracao || "";
  $("medicoStatus").value = medico.status || "Atendendo";
  $("medicoObservacao").value = medico.observacao || "";
  $("medicoHorarios").value = horariosParaTexto(medico.horarios);
  abrirModal("modalMedicoOverlay");
}

function salvarFormularioMedico(event) {
  event.preventDefault();
  const id = $("medicoId").value || gerarId("med");
  const medico = {
    id,
    nome: $("medicoNome").value.trim(),
    especialidade: $("medicoEspecialidade").value.trim(),
    crm: $("medicoCrm").value.trim() || "CRM a confirmar",
    cidade: $("medicoCidade").value,
    telefone: $("medicoTelefone").value.trim(),
    email: $("medicoEmail").value.trim(),
    unidade: $("medicoUnidade").value.trim() || "Sala a confirmar",
    idade: $("medicoIdade").value.trim(),
    valor: $("medicoValor").value.trim() || "Consultar unidade",
    duracao: $("medicoDuracao").value.trim() || "A confirmar",
    status: $("medicoStatus").value,
    observacao: $("medicoObservacao").value.trim(),
    horarios: textoParaHorarios($("medicoHorarios").value)
  };

  const index = medicos.findIndex(m => m.id === id);
  if (index >= 0) {
    medicos[index] = medico;
    mostrarToast("Médico atualizado com sucesso.");
  } else {
    medicos.push(medico);
    mostrarToast("Médico cadastrado com sucesso.");
  }

  medicoSelecionadoId = id;
  salvarMedicos();
  fecharModalMedico();
  atualizarTudo();
}

function excluirMedico(id) {
  const medico = medicos.find(m => m.id === id);
  if (!medico) return;
  if (!confirm(`Excluir ${medico.nome}?`)) return;
  medicos = medicos.filter(m => m.id !== id);
  medicoSelecionadoId = medicos[0]?.id || null;
  salvarMedicos();
  atualizarTudo();
  mostrarToast("Médico removido.");
}

function limparFiltrosMedicos() {
  if ($("buscaMedico")) $("buscaMedico").value = "";
  if ($("filtroEspecialidade")) $("filtroEspecialidade").value = "";
  if ($("filtroDia")) $("filtroDia").value = "";
  renderizarMedicos();
  mostrarToast("Filtros de médicos limpos.");
}

function renderizarExames() {
  const tbody = document.querySelector("#tabelaExames tbody");
  const vazio = $("semResultadoExames");
  if (!tbody || !vazio) return;

  const busca = normalizar($("buscaExame")?.value);
  const filtroJejum = $("filtroJejum")?.value || "";
  const categoria = $("filtroCategoria")?.value || "";

  const filtrados = exames.filter(exame => {
    const texto = normalizar(`${exame.nome} ${exame.codigo || ""} ${exame.categoria} ${exame.cidade || ""} ${exame.medico || ""} ${exame.status || ""} ${exame.valor} ${exame.jejumHoras} ${exame.preparo} ${exame.prazo} ${exame.observacao}`);
    const atendeBusca = !busca || texto.includes(busca);
    const atendeJejum = !filtroJejum || (filtroJejum === "sim" ? exame.precisaJejum : !exame.precisaJejum);
    const atendeCategoria = !categoria || exame.categoria === categoria;
    return atendeBusca && atendeJejum && atendeCategoria;
  });

  tbody.innerHTML = "";
  vazio.style.display = filtrados.length ? "none" : "grid";

  filtrados.forEach(exame => {
    const tr = document.createElement("tr");
    const jejumClasse = exame.precisaJejum ? "red" : "green";
    const jejumTexto = exame.precisaJejum ? `Sim • ${exame.jejumHoras || "A confirmar"}` : "Não precisa";

    tr.innerHTML = `
      <td data-label="Exame" class="exam-name">
        <strong>${escapeHTML(exame.nome)}</strong>
        <span class="exam-note">${escapeHTML([exame.codigo, exame.cidade, exame.medico].filter(Boolean).join(" · ") || exame.observacao || "Sem observação interna")}</span>
      </td>
      <td data-label="Categoria"><span class="badge dark">${escapeHTML(exame.categoria)}</span></td>
      <td data-label="Cidade / médico"><strong>${escapeHTML(exame.cidade || "Todas")}</strong><span class="exam-note">${escapeHTML(exame.medico || "Responsável não informado")}</span></td>
      <td data-label="Status"><span class="badge ${normalizar(exame.status).includes("indispon") ? "red" : normalizar(exame.status).includes("limitada") ? "orange" : "green"}">${escapeHTML(exame.status || "Disponível")}</span></td>
      <td data-label="Valor"><span class="badge">${escapeHTML(exame.valor)}</span></td>
      <td data-label="Jejum"><span class="badge ${jejumClasse}">${escapeHTML(jejumTexto)}</span></td>
      <td data-label="Preparo"><p class="exam-preparo">${escapeHTML(exame.preparo)}</p></td>
      <td data-label="Prazo"><strong>${escapeHTML(exame.prazo)}</strong></td>
      <td data-label="Ações"><div class="actions-cell"><button type="button" class="icon-btn" data-exame-action="editar" data-id="${escapeHTML(exame.id)}">Editar</button><button type="button" class="icon-btn delete" data-exame-action="excluir" data-id="${escapeHTML(exame.id)}">Excluir</button></div></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-exame-action]").forEach(button => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      if (button.dataset.exameAction === "editar") editarExame(id);
      if (button.dataset.exameAction === "excluir") excluirExame(id);
    });
  });
}

function abrirModalExame() {
  $("tituloModalExame").textContent = "Novo exame";
  $("formExame").reset();
  $("exameId").value = "";
  $("exameJejum").value = "nao";
  $("exameJejumHoras").value = "Não precisa";
  if ($("exameCidade")) $("exameCidade").value = window.LAGSettings?.getActiveCity?.() || "Cerquilho";
  if ($("exameStatus")) $("exameStatus").value = "Disponível";
  abrirModal("modalExameOverlay");
  setTimeout(() => $("exameNome")?.focus(), 80);
}

function editarExame(id) {
  const exame = exames.find(e => e.id === id);
  if (!exame) return;
  $("tituloModalExame").textContent = "Editar exame";
  $("exameId").value = exame.id;
  $("exameNome").value = exame.nome || "";
  $("exameCodigo").value = exame.codigo || "";
  $("exameCategoria").value = exame.categoria || "";
  $("exameValor").value = exame.valor || "";
  $("exameCidade").value = exame.cidade || "Cerquilho";
  $("exameMedico").value = exame.medico || "";
  $("exameStatus").value = exame.status || "Disponível";
  $("exameJejum").value = exame.precisaJejum ? "sim" : "nao";
  $("exameJejumHoras").value = exame.jejumHoras || "Não precisa";
  $("examePrazo").value = exame.prazo || "";
  $("examePreparo").value = exame.preparo || "";
  $("exameObservacao").value = exame.observacao || "";
  abrirModal("modalExameOverlay");
}

function salvarFormularioExame(event) {
  event.preventDefault();
  const id = $("exameId").value || gerarId("exa");
  const precisaJejum = $("exameJejum").value === "sim";
  const exame = {
    id,
    nome: $("exameNome").value.trim(),
    codigo: $("exameCodigo").value.trim(),
    categoria: $("exameCategoria").value.trim(),
    valor: $("exameValor").value.trim(),
    cidade: $("exameCidade").value,
    medico: $("exameMedico").value.trim(),
    status: $("exameStatus").value,
    precisaJejum,
    jejumHoras: precisaJejum ? ($("exameJejumHoras").value.trim() || "A confirmar") : "Não precisa",
    prazo: $("examePrazo").value.trim(),
    preparo: $("examePreparo").value.trim(),
    observacao: $("exameObservacao").value.trim()
  };

  const index = exames.findIndex(e => e.id === id);
  if (index >= 0) {
    exames[index] = exame;
    mostrarToast("Exame atualizado com sucesso.");
  } else {
    exames.push(exame);
    mostrarToast("Exame cadastrado com sucesso.");
  }

  salvarExames();
  fecharModalExame();
  atualizarTudo();
}

function excluirExame(id) {
  const exame = exames.find(e => e.id === id);
  if (!exame) return;
  if (!confirm(`Excluir ${exame.nome}?`)) return;
  exames = exames.filter(e => e.id !== id);
  salvarExames();
  atualizarTudo();
  mostrarToast("Exame removido.");
}

function limparFiltrosExames() {
  if ($("buscaExame")) $("buscaExame").value = "";
  if ($("filtroJejum")) $("filtroJejum").value = "";
  if ($("filtroCategoria")) $("filtroCategoria").value = "";
  renderizarExames();
  mostrarToast("Filtros de exames limpos.");
}

function abrirModalHorario() {
  if (!medicos.length) { mostrarToast("Cadastre um médico antes de adicionar horários."); return; }
  const select = $("horarioMedico");
  select.innerHTML = medicos.map(m => `<option value="${escapeHTML(m.id)}">${escapeHTML(m.nome)} · ${escapeHTML(m.cidade || "Cidade não informada")}</option>`).join("");
  if (medicoSelecionadoId && medicos.some(m => m.id === medicoSelecionadoId)) select.value = medicoSelecionadoId;
  $("formHorario").reset();
  select.value = medicoSelecionadoId || medicos[0].id;
  $("horarioVagas").value = 1;
  abrirModal("modalHorarioOverlay");
}

function salvarHorario(event) {
  event.preventDefault();
  const medico = medicos.find(m => m.id === $("horarioMedico").value);
  if (!medico) return;
  medico.horarios = Array.isArray(medico.horarios) ? medico.horarios : [];
  medico.horarios.push({
    dia: $("horarioDia").value,
    inicio: $("horarioInicio").value,
    fim: $("horarioFim").value,
    sala: $("horarioSala").value.trim() || medico.unidade || "Sala a confirmar",
    tipo: $("horarioTipo").value,
    vagas: `${Math.max(1, Number($("horarioVagas").value || 1))} vagas`
  });
  medicoSelecionadoId = medico.id;
  salvarMedicos();
  fecharModalHorario();
  atualizarTudo();
  mostrarToast("Horário adicionado com sucesso.");
}

function abrirModal(id) {
  const modal = $(id);
  modal?.classList.add("active");
  modal?.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function fecharModalMedico() {
  const modal = $("modalMedicoOverlay");
  modal?.classList.remove("active");
  modal?.setAttribute("aria-hidden", "true");
  if (!$("modalExameOverlay")?.classList.contains("active") && !$("modalHorarioOverlay")?.classList.contains("active")) document.body.classList.remove("modal-open");
}

function fecharModalExame() {
  const modal = $("modalExameOverlay");
  modal?.classList.remove("active");
  modal?.setAttribute("aria-hidden", "true");
  if (!$("modalMedicoOverlay")?.classList.contains("active") && !$("modalHorarioOverlay")?.classList.contains("active")) document.body.classList.remove("modal-open");
}

function fecharModalHorario() {
  const modal = $("modalHorarioOverlay");
  modal?.classList.remove("active");
  modal?.setAttribute("aria-hidden", "true");
  if (!$("modalMedicoOverlay")?.classList.contains("active") && !$("modalExameOverlay")?.classList.contains("active")) document.body.classList.remove("modal-open");
}
