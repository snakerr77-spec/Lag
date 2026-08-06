(() => {
  "use strict";

  const TICKET_KEY = "lag-support-tickets-v1";
  const STATUS = {
    new: "Novo",
    progress: "Em atendimento",
    waiting: "Aguardando usuário",
    resolved: "Resolvido"
  };

  const MODULES = [
    { id: "login", label: "Login e acesso", icon: "fa-right-to-bracket" },
    { id: "sidebar", label: "Sidebar e navegação", icon: "fa-bars" },
    { id: "dashboard", label: "Dashboard e planilhas", icon: "fa-chart-pie" },
    { id: "laudos", label: "Laudos, PDFs e portal", icon: "fa-file-pdf" },
    { id: "almox", label: "Almoxarifado", icon: "fa-boxes-stacked" },
    { id: "medicos", label: "Médicos e exames", icon: "fa-stethoscope" },
    { id: "prontuario", label: "Prontuário médico", icon: "fa-notes-medical" },
    { id: "parceiros", label: "Parceiros e arquivos", icon: "fa-handshake" },
    { id: "candidatos", label: "Candidatos médicos", icon: "fa-user-doctor" },
    { id: "documentos", label: "Controladoria e arquivos", icon: "fa-folder-tree" },
    { id: "metas", label: "Gestão e metas", icon: "fa-bullseye" },
    { id: "visual", label: "Cores e aparência", icon: "fa-palette" },
    { id: "outro", label: "Outro assunto", icon: "fa-circle-question" }
  ];

  const ISSUES = {
    login: ["Não consigo entrar", "Cidade ou cargo incorreto", "Usuário sem permissão", "Sessão desconectando"],
    sidebar: ["Menu desapareceu", "Tópico não aparece", "Sidebar fecha ou não fecha", "Link abre a página errada"],
    dashboard: ["Planilha não carregou", "Valores incorretos", "Cidade sem dados", "Gráfico não atualiza"],
    laudos: ["PDF não salva", "Portal não libera exame", "Busca por paciente falha", "Imagem ou laudo não abre"],
    almox: ["Botões não respondem", "Produto não aparece", "Entrada ou saída incorreta", "Solicitação ou scanner falhou"],
    medicos: ["Médico não cadastra", "Horários não aparecem", "Exame não salva", "Filtro não funciona"],
    prontuario: ["Paciente não aparece", "Evolução não salva", "Prontuário abre vazio", "Aba ou formulário travou"],
    parceiros: ["Arquivo não envia", "Pasta não aparece", "Sidebar não fecha", "Parceiro ou cidade incorreta"],
    candidatos: ["Ficha não envia", "Currículo não abre", "Candidato não aparece", "Painel de visualização falhou"],
    documentos: ["Arquivo não abre", "Pasta ou cidade incorreta", "Documento não salva", "Busca não encontra"],
    metas: ["Meta não atualiza", "Resultado incorreto", "Notificação errada", "Exportação falhou"],
    visual: ["Tema claro ou escuro incorreto", "Texto sem contraste", "Logo não aparece", "Página desalinhada"],
    outro: ["Dúvida de uso", "Sugestão de melhoria", "Erro não listado", "Solicitação de acesso"]
  };

  const BOT_PHRASES = {
    greeting: [
      "Olá, <strong>{name}</strong>. Eu sou a LAG Assist. Vou entender o que aconteceu com calma antes de registrar seu atendimento.",
      "Oi, <strong>{name}</strong>. Vamos verificar isso juntos. Farei algumas perguntas curtas para deixar o chamado bem explicado.",
      "Bem-vindo(a), <strong>{name}</strong>. Pode ficar tranquilo(a): vou organizar as informações e encaminhar tudo ao administrador."
    ],
    module: [
      "Primeiro, em qual parte do sistema você percebeu o problema?",
      "Para eu direcionar corretamente, escolha o módulo onde isso aconteceu.",
      "Vamos começar pela tela envolvida. Qual área estava aberta?"
    ],
    issue: [
      "Entendi. Qual opção descreve melhor o comportamento que você viu?",
      "Certo. Agora escolha a situação mais parecida com o que aconteceu.",
      "Obrigado. Destas possibilidades, qual se aproxima mais do erro?"
    ],
    urgency: [
      "Esse problema impediu o seu trabalho ou você ainda consegue continuar?",
      "Para definir a prioridade, qual é o impacto disso na sua rotina agora?",
      "Só mais uma etapa: diga o quanto isso está afetando seu atendimento."
    ],
    description: [
      "Agora descreva com suas palavras. Conte qual botão clicou, o que esperava e o que apareceu na tela.",
      "Pode explicar passo a passo, sem pressa. Informe a página, a ação realizada e qualquer mensagem exibida.",
      "Por fim, escreva os detalhes do ocorrido. Quanto mais claro o caminho até o erro, melhor será a análise do administrador."
    ],
    review: [
      "Obrigado. Estou organizando as informações para você revisar.",
      "Perfeito. Vou montar um resumo do chamado antes do envio.",
      "Certo, já tenho o necessário. Confira o resumo abaixo antes de registrar."
    ],
    saved: [
      "Tudo certo. O chamado foi registrado no painel de suporte do administrador.",
      "Pronto. Sua solicitação já está disponível para o administrador analisar.",
      "Chamado concluído. O atendimento ficará salvo na área administrativa do perfil."
    ]
  };


  const safeJSON = (value, fallback) => { try { return JSON.parse(value) ?? fallback; } catch { return fallback; } };
  const escapeHTML = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const settings = () => window.LAGSettings;
  const isPublicSupport = () => document.body?.dataset.supportPublic === "true";
  const currentUser = () => {
    if (isPublicSupport()) {
      const session = safeJSON(localStorage.getItem("lag-auth-session-v1") || sessionStorage.getItem("lag-auth-session-temp-v1"), null);
      if (!session?.userId) return { id: "guest", name: "Visitante", role: "visitante", unit: document.getElementById("loginCity")?.value || "Cerquilho", email: document.getElementById("loginEmail")?.value || "" };
    }
    return settings()?.getCurrentUser?.() || { id: "local", name: "Usuário", role: "colaborador", unit: "Cerquilho", email: "" };
  };
  const currentCity = () => isPublicSupport() ? (document.getElementById("loginCity")?.value || "Cerquilho") : (settings()?.getActiveCity?.() || currentUser().unit || "Cerquilho");
  const currentRole = () => settings()?.normalizeRole?.(currentUser().role) || String(currentUser().role || "colaborador").toLowerCase();
  const isAdmin = () => ["admin", "administrador"].includes(currentRole());

  let chatState = null;
  let selectedTicketId = null;

  function readTickets() {
    const tickets = safeJSON(localStorage.getItem(TICKET_KEY), []);
    return Array.isArray(tickets) ? tickets : [];
  }

  function writeTickets(tickets) {
    localStorage.setItem(TICKET_KEY, JSON.stringify(tickets));
    window.dispatchEvent(new CustomEvent("lag:support-changed", { detail: { tickets } }));
  }

  function makeId() {
    return `SUP-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  }

  function moduleLabel(id) {
    return MODULES.find(item => item.id === id)?.label || id || "Outro assunto";
  }

  function formatDate(value) {
    try { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
    catch { return "—"; }
  }

  function ensureSidebarSupport() {
    const sidebar = document.querySelector("#sidebar, .module-sidebar");
    if (!sidebar || document.body.dataset.publicPage === "true") return;
    let existing = sidebar.querySelector(".lag-support-sidebar-card");
    if (existing) return;

    const old = sidebar.querySelector(":scope > .sidebar-status, :scope > .sidebar-support");
    const card = document.createElement("button");
    card.type = "button";
    card.className = "lag-support-sidebar-card";
    card.setAttribute("aria-label", "Abrir suporte e atendimento");
    card.innerHTML = `
      <span class="lag-support-sidebar-icon"><i class="fa-solid fa-headset"></i></span>
      <div><strong>Suporte e atendimento</strong><small>Abra um chamado com a Central de Ajuda</small></div>
      <i class="fa-solid fa-chevron-right"></i>`;
    card.addEventListener("click", openChat);
    if (old) old.replaceWith(card);
    else sidebar.appendChild(card);
  }

  function ensureTopbarHelp() {
    // A Central de Ajuda permanece disponível apenas na parte inferior da sidebar.
    // Remove qualquer botão antigo do topo para manter a barra de pesquisa centralizada.
    document.querySelectorAll(".lag-help-topbar-button").forEach(button => button.remove());
  }

  function keepSidebarOpenOnNavigation() {
    document.addEventListener("click", event => {
      const link = event.target.closest("#sidebar a, .module-sidebar a");
      if (!link || link.target === "_blank" || matchMedia("(max-width: 980px)").matches) return;
      localStorage.setItem("lag-sidebar-hidden", "false");
      document.body.classList.remove("sidebar-hidden");
    }, true);
  }

  function ensureChat() {
    if (document.getElementById("lagSupportOverlay")) return;
    const overlay = document.createElement("div");
    overlay.className = "lag-support-overlay";
    overlay.id = "lagSupportOverlay";
    overlay.innerHTML = `
      <section class="lag-support-chat" role="dialog" aria-modal="true" aria-labelledby="lagSupportTitle">
        <header class="lag-support-chat-header">
          <span class="lag-support-chat-avatar"><i class="fa-solid fa-headset"></i></span>
          <div><strong id="lagSupportTitle">Central de Ajuda LAG</strong><small>Atendimento guiado antes do envio</small></div>
          <button class="lag-support-chat-close" type="button" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>
        </header>
        <div class="lag-support-chat-body" id="lagSupportBody"></div>
        <div class="lag-support-input-wrap" id="lagSupportInputWrap" hidden>
          <textarea id="lagSupportText" maxlength="1400" placeholder="Descreva o que aconteceu, o que você esperava e em qual tela ocorreu..."></textarea>
          <button class="lag-support-send" id="lagSupportSend" type="button" aria-label="Continuar"><i class="fa-solid fa-paper-plane"></i></button>
          <span class="lag-support-footer-note">Não envie senhas, laudos, dados médicos ou informações sensíveis de pacientes neste chat.</span>
        </div>
      </section>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", event => { if (event.target === overlay) closeChat(); });
    overlay.querySelector(".lag-support-chat-close").addEventListener("click", closeChat);
    overlay.querySelector("#lagSupportSend").addEventListener("click", handleTextSubmit);
    overlay.querySelector("#lagSupportText").addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); handleTextSubmit(); }
    });
  }

  const sleep = ms => new Promise(resolve => window.setTimeout(resolve, ms));
  const choosePhrase = list => list[Math.floor(Math.random() * list.length)];

  function detectedModule() {
    const moduleId = document.body?.dataset.moduleId || "";
    const path = location.pathname.toLowerCase();
    if (path.includes("almoxarifado")) return "almox";
    if (path.includes("medicos-exames")) return "medicos";
    if (path.includes("prontuario")) return "prontuario";
    if (path.includes("parceiros")) return "parceiros";
    if (path.includes("contratacao-medicos")) return "candidatos";
    if (path.includes("controladoria")) return "documentos";
    if (path.includes("gestao")) return "metas";
    if (["geral", "exames", "consultas"].includes(moduleId) || path.includes("/controle/")) return "dashboard";
    if (path.includes("laudos")) return "laudos";
    if (path.includes("perfil")) return "visual";
    return "outro";
  }

  function setChatBusy(busy) {
    document.querySelectorAll(".lag-support-option, .lag-support-send").forEach(node => { node.disabled = busy; });
  }

  function addTyping() {
    const body = document.getElementById("lagSupportBody");
    const node = document.createElement("div");
    node.className = "lag-chat-typing";
    node.innerHTML = '<span></span><span></span><span></span><small>LAG Assist está analisando</small>';
    body?.appendChild(node);
    if (body) body.scrollTop = body.scrollHeight;
    return node;
  }

  async function botSay(html, minDelay = 650, maxDelay = 1250) {
    setChatBusy(true);
    const typing = addTyping();
    await sleep(Math.round(minDelay + Math.random() * (maxDelay - minDelay)));
    typing.remove();
    addBot(html);
    setChatBusy(false);
  }

  function resetChat() {
    chatState = { step: "loading", module: "", issue: "", urgency: "", description: "" };
    const body = document.getElementById("lagSupportBody");
    const input = document.getElementById("lagSupportInputWrap");
    if (!body || !input) return;
    body.innerHTML = "";
    input.hidden = true;
    (async () => {
      const name = escapeHTML(currentUser().name || "Usuário");
      await botSay(choosePhrase(BOT_PHRASES.greeting).replace("{name}", name), 500, 1000);
      await botSay(choosePhrase(BOT_PHRASES.module), 550, 950);
      chatState.step = "module";
      const detected = detectedModule();
      const ordered = [...MODULES].sort((a, b) => (a.id === detected ? -1 : b.id === detected ? 1 : 0));
      renderOptions(ordered.map(item => ({ value: item.id, label: item.label, icon: item.icon })), chooseModule);
    })();
  }

  function addBot(html) {
    const body = document.getElementById("lagSupportBody");
    body?.insertAdjacentHTML("beforeend", `<div class="lag-chat-message">${html}</div>`);
    if (body) body.scrollTop = body.scrollHeight;
  }

  function addUser(text) {
    const body = document.getElementById("lagSupportBody");
    body?.insertAdjacentHTML("beforeend", `<div class="lag-chat-message user">${escapeHTML(text)}</div>`);
    if (body) body.scrollTop = body.scrollHeight;
  }

  function renderOptions(options, handler) {
    const body = document.getElementById("lagSupportBody");
    const box = document.createElement("div");
    box.className = "lag-support-options";
    options.forEach(option => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "lag-support-option";
      button.innerHTML = `<i class="fa-solid ${escapeHTML(option.icon || "fa-circle")}"></i><span>${escapeHTML(option.label)}</span>`;
      button.addEventListener("click", () => {
        if (button.disabled) return;
        box.remove();
        handler(option.value, option.label);
      });
      box.appendChild(button);
    });
    body?.appendChild(box);
    if (body) body.scrollTop = body.scrollHeight;
  }

  async function chooseModule(value, label) {
    chatState.module = value;
    chatState.step = "issue-loading";
    addUser(label);
    await botSay(choosePhrase(BOT_PHRASES.issue));
    chatState.step = "issue";
    renderOptions((ISSUES[value] || ISSUES.outro).map((item, index) => ({ value: item, label: item, icon: index === 0 ? "fa-triangle-exclamation" : "fa-circle-info" })), chooseIssue);
  }

  async function chooseIssue(value, label) {
    chatState.issue = value;
    chatState.step = "urgency-loading";
    addUser(label);
    await botSay(choosePhrase(BOT_PHRASES.urgency));
    chatState.step = "urgency";
    renderOptions([
      { value: "alta", label: "Bloqueou meu trabalho", icon: "fa-circle-xmark" },
      { value: "media", label: "Consigo continuar parcialmente", icon: "fa-triangle-exclamation" },
      { value: "baixa", label: "É uma dúvida ou melhoria", icon: "fa-lightbulb" }
    ], chooseUrgency);
  }

  async function chooseUrgency(value, label) {
    chatState.urgency = value;
    chatState.step = "description-loading";
    addUser(label);
    await botSay(choosePhrase(BOT_PHRASES.description), 750, 1350);
    chatState.step = "description";
    const input = document.getElementById("lagSupportInputWrap");
    const text = document.getElementById("lagSupportText");
    input.hidden = false;
    text.value = "";
    text.focus();
  }

  async function handleTextSubmit() {
    if (chatState?.step !== "description") return;
    const text = document.getElementById("lagSupportText");
    const value = text?.value.trim();
    if (!value || value.length < 12) {
      await botSay("Pode acrescentar um pouco mais de detalhe? Uma frase completa já ajuda bastante.", 450, 800);
      return;
    }
    chatState.description = value;
    chatState.step = "review-loading";
    addUser(value);
    document.getElementById("lagSupportInputWrap").hidden = true;
    await botSay(choosePhrase(BOT_PHRASES.review), 700, 1200);
    chatState.step = "confirm";
    addBot(`<strong>Resumo do atendimento</strong><br>${escapeHTML(moduleLabel(chatState.module))} · ${escapeHTML(chatState.issue)} · prioridade ${escapeHTML(chatState.urgency)}.<small>Página detectada: ${escapeHTML(document.title)}</small>`);
    renderOptions([
      { value: "send", label: "Registrar atendimento", icon: "fa-paper-plane" },
      { value: "restart", label: "Refazer perguntas", icon: "fa-rotate-left" }
    ], confirmTicket);
  }

  async function confirmTicket(value) {
    if (value === "restart") {
      resetChat();
      return;
    }
    chatState.step = "saving";
    await botSay("Um momento. Estou salvando seu atendimento no perfil administrativo.", 700, 1300);
    const ticket = createTicket();
    const tickets = readTickets();
    tickets.unshift(ticket);
    writeTickets(tickets);
    await botSay(choosePhrase(BOT_PHRASES.saved), 500, 900);
    renderSuccess(ticket);
  }

  function createTicket() {
    const user = currentUser();
    return {
      id: makeId(),
      userId: user.id || "local",
      userName: user.name || "Usuário",
      userEmail: user.email || "",
      role: settings()?.roleLabel?.(user.role) || user.role || "Perfil",
      city: currentCity(),
      module: chatState.module,
      moduleLabel: moduleLabel(chatState.module),
      issue: chatState.issue,
      urgency: chatState.urgency,
      description: chatState.description,
      pageTitle: document.title,
      pageUrl: window.location.href,
      browser: navigator.userAgent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "new",
      unread: true,
      adminNotes: "",
      source: "local-admin-profile"
    };
  }

  function renderSuccess(ticket) {
    const body = document.getElementById("lagSupportBody");
    body.innerHTML = `
      <div class="lag-support-success">
        <i class="fa-solid fa-circle-check"></i>
        <strong>Atendimento ${escapeHTML(ticket.id)} registrado</strong>
        <p>O administrador verá esta solicitação na aba Suporte do perfil e poderá acompanhar o atendimento por lá.</p>
      </div>`;
    const options = document.createElement("div");
    options.className = "lag-support-options single";
    options.innerHTML = `<button class="lag-support-option" type="button" data-new-ticket><i class="fa-solid fa-plus"></i><span>Novo atendimento</span></button>`;
    body.appendChild(options);
    options.querySelector("[data-new-ticket]").addEventListener("click", resetChat);
    body.scrollTop = body.scrollHeight;
  }

  function openChat() {
    ensureChat();
    resetChat();
    document.getElementById("lagSupportOverlay")?.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeChat() {
    document.getElementById("lagSupportOverlay")?.classList.remove("open");
    document.body.style.overflow = "";
  }

  function injectAdminSupportPanel() {
    if (!isAdmin() || !document.querySelector(".profile-tabs")) return;
    if (document.querySelector('[data-profile-tab="support"]')) return;
    const tabs = document.querySelector(".profile-tabs");
    const button = document.createElement("button");
    button.className = "profile-tab admin-only lag-profile-support-tab";
    button.dataset.profileTab = "support";
    button.type = "button";
    button.innerHTML = '<i class="fa-solid fa-headset"></i> Suporte <span class="lag-support-unread-dot" hidden>0</span>';
    tabs.appendChild(button);

    const panel = document.createElement("section");
    panel.className = "profile-panel admin-only";
    panel.dataset.profilePanel = "support";
    panel.innerHTML = `
      <div class="panel-title"><div><span class="eyebrow">Central de atendimento</span><h2>Chamados recebidos</h2><p>Visualize tudo o que a equipe enviou pelo mini chat de suporte.</p></div><span class="panel-badge"><i class="fa-solid fa-shield-halved"></i> Somente administrador</span></div>
      <div class="lag-support-admin-panel">
        <div class="lag-support-admin-toolbar">
          <input id="supportAdminSearch" type="search" placeholder="Buscar protocolo, usuário, cidade ou problema...">
          <select id="supportAdminStatus"><option value="">Todos os status</option><option value="new">Novos</option><option value="progress">Em atendimento</option><option value="waiting">Aguardando usuário</option><option value="resolved">Resolvidos</option></select>
          <select id="supportAdminCity"><option value="">Todas as cidades</option></select>
          <button id="supportExport" type="button"><i class="fa-solid fa-download"></i> Exportar</button>
        </div>
        <div class="lag-support-admin-grid">
          <div class="lag-ticket-list" id="supportTicketList"></div>
          <div class="lag-ticket-detail" id="supportTicketDetail"></div>
        </div>
      </div>`;
    tabs.insertAdjacentElement("afterend", panel);

    button.addEventListener("click", () => {
      document.querySelectorAll("[data-profile-tab]").forEach(tab => tab.classList.toggle("active", tab === button));
      document.querySelectorAll("[data-profile-panel]").forEach(item => item.classList.toggle("active", item === panel));
      renderAdminPanel();
    });
    panel.querySelector("#supportAdminSearch").addEventListener("input", renderAdminPanel);
    panel.querySelector("#supportAdminStatus").addEventListener("change", renderAdminPanel);
    panel.querySelector("#supportAdminCity").addEventListener("change", renderAdminPanel);
    panel.querySelector("#supportExport").addEventListener("click", exportTickets);
    panel.querySelector("#supportTicketList").addEventListener("click", event => {
      const row = event.target.closest("[data-ticket-id]");
      if (!row) return;
      selectedTicketId = row.dataset.ticketId;
      markRead(selectedTicketId);
      renderAdminPanel();
    });
    panel.querySelector("#supportTicketDetail").addEventListener("change", handleAdminChange);
    panel.querySelector("#supportTicketDetail").addEventListener("click", handleAdminClick);
    renderAdminPanel();
  }

  function filteredAdminTickets() {
    const tickets = readTickets();
    const search = document.getElementById("supportAdminSearch")?.value.trim().toLowerCase() || "";
    const status = document.getElementById("supportAdminStatus")?.value || "";
    const city = document.getElementById("supportAdminCity")?.value || "";
    return tickets.filter(ticket => {
      const text = `${ticket.id} ${ticket.userName} ${ticket.city} ${ticket.moduleLabel} ${ticket.issue} ${ticket.description}`.toLowerCase();
      return (!search || text.includes(search)) && (!status || ticket.status === status) && (!city || ticket.city === city);
    });
  }

  function renderAdminPanel() {
    const list = document.getElementById("supportTicketList");
    const detail = document.getElementById("supportTicketDetail");
    if (!list || !detail) return;
    const all = readTickets();
    const citySelect = document.getElementById("supportAdminCity");
    if (citySelect && citySelect.options.length <= 1) {
      const cities = [...new Set(all.map(ticket => ticket.city).filter(Boolean))];
      citySelect.insertAdjacentHTML("beforeend", cities.map(city => `<option value="${escapeHTML(city)}">${escapeHTML(city)}</option>`).join(""));
    }
    const tickets = filteredAdminTickets();
    const unread = all.filter(ticket => ticket.unread && ticket.status !== "resolved").length;
    document.querySelectorAll(".lag-profile-support-tab .lag-support-unread-dot").forEach(node => { node.hidden = unread === 0; node.textContent = String(unread); });
    if (!selectedTicketId || !all.some(ticket => ticket.id === selectedTicketId)) selectedTicketId = tickets[0]?.id || "";
    list.innerHTML = tickets.length ? tickets.map(ticket => `
      <button class="lag-ticket-row${ticket.id === selectedTicketId ? " active" : ""}${ticket.unread ? " unread" : ""}" type="button" data-ticket-id="${escapeHTML(ticket.id)}">
        <span class="lag-ticket-row-icon"><i class="fa-solid ${ticket.urgency === "alta" ? "fa-triangle-exclamation" : "fa-headset"}"></i></span>
        <span><strong>${escapeHTML(ticket.issue)}</strong><small>${escapeHTML(ticket.userName)} · ${escapeHTML(ticket.city)} · ${escapeHTML(STATUS[ticket.status] || ticket.status)}</small></span>
        <time>${escapeHTML(formatDate(ticket.createdAt))}</time>
      </button>`).join("") : '<div class="lag-ticket-detail-empty"><div><i class="fa-regular fa-circle-check"></i><p>Nenhum chamado encontrado.</p></div></div>';
    renderTicketDetail(all.find(ticket => ticket.id === selectedTicketId));
  }

  function renderTicketDetail(ticket) {
    const detail = document.getElementById("supportTicketDetail");
    if (!detail) return;
    if (!ticket) {
      detail.innerHTML = '<div class="lag-ticket-detail-empty"><div><i class="fa-solid fa-headset"></i><p>Selecione um chamado para visualizar todos os dados.</p></div></div>';
      return;
    }
    detail.innerHTML = `
      <div class="lag-ticket-detail-header">
        <div><h3>${escapeHTML(ticket.issue)}</h3><p>${escapeHTML(ticket.id)} · recebido em ${escapeHTML(formatDate(ticket.createdAt))}</p></div>
        <select class="lag-ticket-status" data-ticket-status="${escapeHTML(ticket.id)}">${Object.entries(STATUS).map(([value, label]) => `<option value="${value}" ${ticket.status === value ? "selected" : ""}>${label}</option>`).join("")}</select>
      </div>
      <div class="lag-ticket-facts">
        <div class="lag-ticket-fact"><span>Usuário</span><strong>${escapeHTML(ticket.userName)} · ${escapeHTML(ticket.role)}</strong></div>
        <div class="lag-ticket-fact"><span>Cidade</span><strong>${escapeHTML(ticket.city)}</strong></div>
        <div class="lag-ticket-fact"><span>Módulo</span><strong>${escapeHTML(ticket.moduleLabel)}</strong></div>
        <div class="lag-ticket-fact"><span>Impacto</span><strong>${escapeHTML(ticket.urgency)}</strong></div>
        <div class="lag-ticket-fact"><span>Página</span><strong>${escapeHTML(ticket.pageTitle || "—")}</strong></div>
        <div class="lag-ticket-fact"><span>E-mail</span><strong>${escapeHTML(ticket.userEmail || "Não informado")}</strong></div>
      </div>
      <div class="lag-ticket-description">${escapeHTML(ticket.description)}</div>
      <div class="lag-ticket-notes"><label><strong>Anotações internas</strong></label><textarea data-ticket-notes="${escapeHTML(ticket.id)}" placeholder="Registre testes realizados, retorno ao usuário e solução...">${escapeHTML(ticket.adminNotes || "")}</textarea></div>
      <div class="lag-ticket-detail-actions">
        <button class="lag-ticket-action primary" type="button" data-save-ticket="${escapeHTML(ticket.id)}"><i class="fa-solid fa-floppy-disk"></i> Salvar atendimento</button>
        <button class="lag-ticket-action danger" type="button" data-delete-ticket="${escapeHTML(ticket.id)}"><i class="fa-solid fa-trash"></i> Excluir</button>
      </div>`;
  }

  function markRead(id) {
    const tickets = readTickets().map(ticket => ticket.id === id ? { ...ticket, unread: false, updatedAt: new Date().toISOString() } : ticket);
    writeTickets(tickets);
  }

  function handleAdminChange(event) {
    const select = event.target.closest("[data-ticket-status]");
    if (!select) return;
    const tickets = readTickets().map(ticket => ticket.id === select.dataset.ticketStatus ? { ...ticket, status: select.value, unread: false, updatedAt: new Date().toISOString() } : ticket);
    writeTickets(tickets);
    renderAdminPanel();
  }

  function handleAdminClick(event) {
    const save = event.target.closest("[data-save-ticket]");
    if (save) {
      const id = save.dataset.saveTicket;
      const notes = document.querySelector(`[data-ticket-notes="${CSS.escape(id)}"]`)?.value || "";
      const tickets = readTickets().map(ticket => ticket.id === id ? { ...ticket, adminNotes: notes, unread: false, updatedAt: new Date().toISOString() } : ticket);
      writeTickets(tickets);
      window.LAGUI?.toast?.("Atendimento salvo.");
      renderAdminPanel();
      return;
    }
    const remove = event.target.closest("[data-delete-ticket]");
    if (remove && confirm("Excluir este chamado do armazenamento local?")) {
      const id = remove.dataset.deleteTicket;
      writeTickets(readTickets().filter(ticket => ticket.id !== id));
      selectedTicketId = "";
      renderAdminPanel();
    }
  }

  function exportTickets() {
    const content = JSON.stringify(readTickets(), null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `lag-suporte-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function refreshBadges() {
    if (!isAdmin()) return;
    const unread = readTickets().filter(ticket => ticket.unread && ticket.status !== "resolved").length;
    document.querySelectorAll(".lag-help-topbar-button").forEach(button => {
      let badge = button.querySelector(".lag-support-unread-dot");
      if (!badge && unread) {
        badge = document.createElement("span");
        badge.className = "lag-support-unread-dot";
        button.appendChild(badge);
      }
      if (badge) { badge.hidden = unread === 0; badge.textContent = String(unread); }
    });
    document.querySelectorAll(".lag-profile-support-tab .lag-support-unread-dot").forEach(node => { node.hidden = unread === 0; node.textContent = String(unread); });
  }

  function init() {
    if (document.body.dataset.publicPage === "true" && !isPublicSupport()) return;
    document.querySelectorAll("[data-open-support]").forEach(button => button.addEventListener("click", openChat));
    ensureSidebarSupport();
    ensureTopbarHelp();
    ensureChat();
    keepSidebarOpenOnNavigation();
    injectAdminSupportPanel();
    refreshBadges();
  }

  window.LAGSupport = { open: openChat, close: closeChat, tickets: readTickets, refresh: () => { refreshBadges(); renderAdminPanel(); } };
  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("lag:support-changed", () => { refreshBadges(); renderAdminPanel(); });
  window.addEventListener("storage", event => { if (event.key === TICKET_KEY) { refreshBadges(); renderAdminPanel(); } });
})();
