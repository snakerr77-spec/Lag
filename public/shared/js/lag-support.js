(() => {
  "use strict";

  const POLL_MS = 2200;
  const STATUS = {
    new: "Novo",
    progress: "Em atendimento",
    waiting: "Aguardando usuário",
    resolved: "Resolvido"
  };

  const escapeHTML = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const settings = () => window.LAGSettings;
  const currentUser = () => settings()?.getCurrentUser?.() || window.__LAG_CLOUD__?.user || {
    id: "local",
    name: "Usuário",
    role: "colaborador",
    unit: "Cerquilho"
  };
  const currentRole = () => settings()?.normalizeRole?.(currentUser().role)
    || String(currentUser().role || "colaborador").toLowerCase();
  const isManager = () => ["admin", "administrador", "dev"].includes(currentRole());
  const currentCity = () => settings()?.getActiveCity?.() || currentUser().unit || currentUser().city || "Cerquilho";

  let currentTicketId = "";
  let userPoll = 0;
  let adminPoll = 0;
  let selectedAdminTicket = "";

  const formatDate = value => {
    try {
      return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
    } catch {
      return "—";
    }
  };

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível concluir a operação.");
    return data;
  }

  function ensureSidebarSupport() {
    const sidebar = document.querySelector("#sidebar, .module-sidebar");
    if (!sidebar || document.body.dataset.publicPage === "true") return;
    if (sidebar.querySelector(".lag-support-sidebar-card")) return;

    const old = sidebar.querySelector(":scope > .sidebar-status, :scope > .sidebar-support");
    const card = document.createElement("button");
    card.type = "button";
    card.className = "lag-support-sidebar-card";
    card.innerHTML = `
      <span class="lag-support-sidebar-icon"><i class="fa-solid fa-headset"></i></span>
      <div><strong>Suporte e atendimento</strong><small>Converse com a LAG Assist e com o suporte</small></div>
      <i class="fa-solid fa-chevron-right"></i>`;
    card.addEventListener("click", openChat);

    if (old) old.replaceWith(card);
    else sidebar.appendChild(card);
  }

  function ensureChat() {
    if (document.getElementById("lagSupportOverlay")) return;

    const overlay = document.createElement("div");
    overlay.className = "lag-support-overlay";
    overlay.id = "lagSupportOverlay";
    overlay.innerHTML = `
      <section class="lag-support-chat lag-live-support" role="dialog" aria-modal="true" aria-labelledby="lagSupportTitle">
        <header class="lag-support-chat-header">
          <span class="lag-support-chat-avatar"><i class="fa-solid fa-sparkles"></i></span>
          <div>
            <strong id="lagSupportTitle">LAG Assist</strong>
            <small id="lagSupportSubtitle">Assistente inteligente • suporte humano disponível</small>
          </div>
          <button class="lag-support-chat-close" type="button" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>
        </header>

        <div class="lag-support-live-status">
          <span class="lag-live-dot"></span>
          <strong id="lagSupportLiveLabel">Atendimento online</strong>
          <small id="lagSupportProtocol"></small>
        </div>

        <div class="lag-support-chat-body" id="lagSupportBody"></div>

        <div class="lag-support-input-wrap" id="lagSupportInputWrap">
          <textarea id="lagSupportText" maxlength="4000" placeholder="Conte o que aconteceu. A LAG Assist vai entender a mensagem e criar o relatório..."></textarea>
          <button class="lag-support-send" id="lagSupportSend" type="button" aria-label="Enviar"><i class="fa-solid fa-paper-plane"></i></button>
          <span class="lag-support-footer-note">Não envie senhas, laudos ou dados médicos sensíveis de pacientes.</span>
        </div>
      </section>`;

    document.body.appendChild(overlay);
    overlay.querySelector(".lag-support-chat-close").addEventListener("click", closeChat);
    overlay.addEventListener("click", event => {
      if (event.target === overlay) closeChat();
    });
    overlay.querySelector("#lagSupportSend").addEventListener("click", sendUserMessage);
    overlay.querySelector("#lagSupportText").addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendUserMessage();
      }
    });
  }

  function resetNewConversation() {
    currentTicketId = "";
    const body = document.getElementById("lagSupportBody");
    if (!body) return;

    body.innerHTML = `
      <div class="lag-chat-message assistant">
        <strong>Olá, ${escapeHTML(currentUser().name || "tudo bem")}.</strong>
        Pode me contar o problema do seu jeito. Eu vou analisar a mensagem, identificar a área do sistema e gerar um relatório técnico para o suporte humano.
      </div>
      <div class="lag-chat-hint">
        <i class="fa-solid fa-lightbulb"></i>
        <span>Exemplo: “Quando tento cadastrar um médico, clico em salvar e nada acontece.”</span>
      </div>`;

    const protocol = document.getElementById("lagSupportProtocol");
    if (protocol) protocol.textContent = "";
    const subtitle = document.getElementById("lagSupportSubtitle");
    if (subtitle) subtitle.textContent = "Assistente inteligente • suporte humano disponível";
  }

  function openChat() {
    ensureChat();
    document.getElementById("lagSupportOverlay")?.classList.add("open");
    document.body.style.overflow = "hidden";

    if (!currentTicketId) {
      resetNewConversation();
      loadLastOpenConversation();
    } else {
      pollUserConversation();
    }

    setTimeout(() => document.getElementById("lagSupportText")?.focus(), 120);
  }

  function closeChat() {
    document.getElementById("lagSupportOverlay")?.classList.remove("open");
    document.body.style.overflow = "";
  }

  function addTemporaryMessage(text, sender = "user") {
    const body = document.getElementById("lagSupportBody");
    if (!body) return;
    body.insertAdjacentHTML("beforeend", `
      <div class="lag-chat-message ${sender}">
        ${escapeHTML(text)}
      </div>`);
    body.scrollTop = body.scrollHeight;
  }

  function setSending(value) {
    const button = document.getElementById("lagSupportSend");
    const input = document.getElementById("lagSupportText");
    if (button) button.disabled = value;
    if (input) input.disabled = value;
  }

  async function sendUserMessage() {
    const input = document.getElementById("lagSupportText");
    const message = input?.value.trim();
    if (!message) return;

    input.value = "";
    addTemporaryMessage(message, "user");
    setSending(true);

    try {
      if (!currentTicketId) {
        const data = await api("/api/support/conversations", {
          method: "POST",
          body: JSON.stringify({
            message,
            city: currentCity(),
            pageTitle: document.title,
            pageUrl: location.href,
            browser: navigator.userAgent
          })
        });

        currentTicketId = data.ticket.id;
        document.getElementById("lagSupportProtocol").textContent = currentTicketId;
        document.getElementById("lagSupportSubtitle").textContent = "Relatório criado • conversa simultânea ativa";
        renderConversation(data.ticket, data.messages);

        const body = document.getElementById("lagSupportBody");
        body?.insertAdjacentHTML("beforeend", `
          <div class="lag-report-created">
            <i class="fa-solid fa-file-circle-check"></i>
            <div>
              <strong>Relatório técnico criado automaticamente</strong>
              <span>O suporte administrativo já pode visualizar o resumo e entrar nesta conversa.</span>
            </div>
          </div>`);
        if (body) body.scrollTop = body.scrollHeight;
      } else {
        await api(`/api/support/conversations/${encodeURIComponent(currentTicketId)}/messages`, {
          method: "POST",
          body: JSON.stringify({ message })
        });
        await pollUserConversation();
      }
    } catch (error) {
      addTemporaryMessage(error.message || "Não foi possível enviar.", "error");
    } finally {
      setSending(false);
      input?.focus();
    }
  }

  function renderConversation(ticket, messages) {
    const body = document.getElementById("lagSupportBody");
    if (!body) return;

    document.getElementById("lagSupportProtocol").textContent = ticket?.id || "";
    const human = Boolean(ticket?.humanTakeover);
    document.getElementById("lagSupportSubtitle").textContent = human
      ? `Suporte humano: ${ticket.assignedTo || "em atendimento"}`
      : "LAG Assist analisando • suporte humano disponível";

    body.innerHTML = (messages || []).map(message => {
      const type = message.senderType || "assistant";
      const label = type === "admin"
        ? (message.senderName || "Suporte LAG")
        : type === "assistant"
          ? "LAG Assist"
          : (message.senderName || "Você");

      return `
        <div class="lag-chat-message ${escapeHTML(type)}">
          <small>${escapeHTML(label)} • ${escapeHTML(formatDate(message.createdAt))}</small>
          ${escapeHTML(message.message)}
        </div>`;
    }).join("");

    if (!messages?.length) {
      body.innerHTML = '<div class="lag-chat-message assistant">Atendimento iniciado.</div>';
    }

    body.scrollTop = body.scrollHeight;
  }

  async function loadLastOpenConversation() {
    try {
      const data = await api("/api/support/conversations");
      const ticket = (data.tickets || []).find(item => item.status !== "resolved");
      if (!ticket) return;

      currentTicketId = ticket.id;
      await pollUserConversation();
    } catch {
      // Mantém a abertura de novo atendimento se estiver offline.
    }
  }

  async function pollUserConversation() {
    if (!currentTicketId) return;
    try {
      const data = await api(`/api/support/conversations/${encodeURIComponent(currentTicketId)}`);
      renderConversation(data.ticket, data.messages);
    } catch (error) {
      console.debug("support_user_poll", error);
    }
  }

  function startUserPolling() {
    clearInterval(userPoll);
    userPoll = window.setInterval(() => {
      if (document.getElementById("lagSupportOverlay")?.classList.contains("open") && currentTicketId) {
        pollUserConversation();
      }
    }, POLL_MS);
  }

  // ----------------------------
  // Painel administrativo
  // ----------------------------
  function injectAdminSupportPanel() {
    if (!isManager() || !document.querySelector(".profile-tabs")) return;
    if (document.querySelector('[data-profile-tab="support"]')) return;

    const tabs = document.querySelector(".profile-tabs");
    const button = document.createElement("button");
    button.className = "profile-tab admin-only lag-profile-support-tab";
    button.dataset.profileTab = "support";
    button.type = "button";
    button.innerHTML = '<i class="fa-solid fa-comments"></i> Suporte ao vivo <span class="lag-support-unread-dot" hidden>0</span>';
    tabs.appendChild(button);

    const panel = document.createElement("section");
    panel.className = "profile-panel admin-only";
    panel.dataset.profilePanel = "support";
    panel.innerHTML = `
      <div class="panel-title">
        <div>
          <span class="eyebrow">Suporte simultâneo</span>
          <h2>Central de conversas</h2>
          <p>A LAG Assist gera o relatório inicial e você assume a conversa quando quiser.</p>
        </div>
        <span class="panel-badge"><i class="fa-solid fa-circle"></i> Tempo real</span>
      </div>

      <div class="lag-live-admin">
        <aside class="lag-live-ticket-column">
          <div class="lag-live-ticket-tools">
            <input id="lagLiveSearch" type="search" placeholder="Buscar usuário, protocolo ou cidade...">
            <select id="lagLiveStatus">
              <option value="">Todos</option>
              <option value="new">Novos</option>
              <option value="progress">Em atendimento</option>
              <option value="waiting">Aguardando usuário</option>
              <option value="resolved">Resolvidos</option>
            </select>
          </div>
          <div id="lagLiveTicketList" class="lag-live-ticket-list"></div>
        </aside>

        <section class="lag-live-admin-chat">
          <div id="lagLiveAdminEmpty" class="lag-live-admin-empty">
            <i class="fa-solid fa-comments"></i>
            <strong>Selecione um atendimento</strong>
            <span>O relatório e a conversa aparecerão aqui.</span>
          </div>

          <div id="lagLiveAdminConversation" hidden>
            <header class="lag-live-admin-head">
              <div>
                <span id="lagLiveAdminProtocol"></span>
                <strong id="lagLiveAdminUser"></strong>
                <small id="lagLiveAdminMeta"></small>
              </div>
              <select id="lagLiveAdminStatus">
                <option value="new">Novo</option>
                <option value="progress">Em atendimento</option>
                <option value="waiting">Aguardando usuário</option>
                <option value="resolved">Resolvido</option>
              </select>
            </header>

            <div class="lag-live-report">
              <div class="lag-live-report-title">
                <i class="fa-solid fa-file-lines"></i>
                <strong>Relatório da LAG Assist</strong>
              </div>
              <pre id="lagLiveReport"></pre>
            </div>

            <div id="lagLiveAdminMessages" class="lag-live-admin-messages"></div>

            <div class="lag-live-admin-compose">
              <textarea id="lagLiveAdminText" maxlength="4000" placeholder="Responder ao usuário..."></textarea>
              <button id="lagLiveAdminSend" type="button"><i class="fa-solid fa-paper-plane"></i> Enviar</button>
            </div>
          </div>
        </section>
      </div>`;

    tabs.insertAdjacentElement("afterend", panel);

    button.addEventListener("click", () => {
      document.querySelectorAll("[data-profile-tab]").forEach(tab => tab.classList.toggle("active", tab === button));
      document.querySelectorAll("[data-profile-panel]").forEach(item => item.classList.toggle("active", item === panel));
      loadAdminTickets();
      startAdminPolling();
    });

    panel.querySelector("#lagLiveSearch").addEventListener("input", loadAdminTickets);
    panel.querySelector("#lagLiveStatus").addEventListener("change", loadAdminTickets);
    panel.querySelector("#lagLiveTicketList").addEventListener("click", event => {
      const row = event.target.closest("[data-live-ticket]");
      if (!row) return;
      selectedAdminTicket = row.dataset.liveTicket;
      loadAdminConversation();
    });
    panel.querySelector("#lagLiveAdminSend").addEventListener("click", sendAdminMessage);
    panel.querySelector("#lagLiveAdminText").addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendAdminMessage();
      }
    });
    panel.querySelector("#lagLiveAdminStatus").addEventListener("change", updateAdminStatus);

    loadAdminTickets();
  }

  function filterAdminTickets(tickets) {
    const search = document.getElementById("lagLiveSearch")?.value.trim().toLowerCase() || "";
    const status = document.getElementById("lagLiveStatus")?.value || "";

    return (tickets || []).filter(ticket => {
      if (status && ticket.status !== status) return false;
      if (!search) return true;
      const haystack = `${ticket.id} ${ticket.userName} ${ticket.city} ${ticket.moduleLabel} ${ticket.issue}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  async function loadAdminTickets() {
    if (!isManager()) return;
    try {
      const data = await api("/api/support/conversations");
      const tickets = filterAdminTickets(data.tickets);
      const list = document.getElementById("lagLiveTicketList");
      if (!list) return;

      list.innerHTML = tickets.map(ticket => `
        <button class="lag-live-ticket ${ticket.id === selectedAdminTicket ? "active" : ""}" data-live-ticket="${escapeHTML(ticket.id)}" type="button">
          <span class="lag-live-ticket-avatar">${escapeHTML((ticket.userName || "U").slice(0,2).toUpperCase())}</span>
          <div>
            <strong>${escapeHTML(ticket.userName || "Usuário")}</strong>
            <small>${escapeHTML(ticket.moduleLabel || ticket.issue)} • ${escapeHTML(ticket.city || "")}</small>
            <span>${escapeHTML(ticket.id)} • ${escapeHTML(formatDate(ticket.lastMessageAt || ticket.createdAt))}</span>
          </div>
          ${ticket.unread ? '<i class="lag-live-unread"></i>' : ""}
        </button>`).join("") || '<div class="lag-live-no-tickets">Nenhum atendimento encontrado.</div>';

      const dot = document.querySelector(".lag-profile-support-tab .lag-support-unread-dot");
      const unread = (data.tickets || []).filter(ticket => ticket.unread).length;
      if (dot) {
        dot.hidden = unread === 0;
        dot.textContent = unread;
      }

      if (!selectedAdminTicket && tickets[0]) {
        selectedAdminTicket = tickets[0].id;
        loadAdminConversation();
      }
    } catch (error) {
      console.debug("support_admin_tickets", error);
    }
  }

  async function loadAdminConversation() {
    if (!selectedAdminTicket) return;
    try {
      const data = await api(`/api/support/conversations/${encodeURIComponent(selectedAdminTicket)}`);
      const ticket = data.ticket;

      document.getElementById("lagLiveAdminEmpty").hidden = true;
      document.getElementById("lagLiveAdminConversation").hidden = false;
      document.getElementById("lagLiveAdminProtocol").textContent = ticket.id;
      document.getElementById("lagLiveAdminUser").textContent = ticket.userName || "Usuário";
      document.getElementById("lagLiveAdminMeta").textContent =
        `${ticket.role || "Perfil"} • ${ticket.city || "Sem cidade"} • ${ticket.userEmail || "sem e-mail"}`;
      document.getElementById("lagLiveAdminStatus").value = ticket.status || "new";
      document.getElementById("lagLiveReport").textContent = ticket.aiReport || "Relatório indisponível.";

      const box = document.getElementById("lagLiveAdminMessages");
      box.innerHTML = (data.messages || []).map(message => `
        <div class="lag-admin-message ${escapeHTML(message.senderType)}">
          <small>${escapeHTML(message.senderName || message.senderType)} • ${escapeHTML(formatDate(message.createdAt))}</small>
          <p>${escapeHTML(message.message)}</p>
        </div>`).join("");
      box.scrollTop = box.scrollHeight;

      loadAdminTickets();
    } catch (error) {
      console.debug("support_admin_conversation", error);
    }
  }

  async function sendAdminMessage() {
    const input = document.getElementById("lagLiveAdminText");
    const message = input?.value.trim();
    if (!message || !selectedAdminTicket) return;

    input.value = "";
    try {
      await api(`/api/support/conversations/${encodeURIComponent(selectedAdminTicket)}/messages`, {
        method: "POST",
        body: JSON.stringify({ message })
      });
      await loadAdminConversation();
    } catch (error) {
      window.LAGUI?.toast?.(error.message || "Não foi possível responder.");
    }
  }

  async function updateAdminStatus() {
    if (!selectedAdminTicket) return;
    const status = document.getElementById("lagLiveAdminStatus").value;
    try {
      await api(`/api/support/conversations/${encodeURIComponent(selectedAdminTicket)}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          humanTakeover: true,
          assignedTo: currentUser().name || "Suporte LAG"
        })
      });
      await loadAdminConversation();
    } catch (error) {
      window.LAGUI?.toast?.(error.message || "Não foi possível atualizar o atendimento.");
    }
  }

  function startAdminPolling() {
    clearInterval(adminPoll);
    adminPoll = window.setInterval(() => {
      if (!document.querySelector('[data-profile-panel="support"]')?.classList.contains("active")) return;
      loadAdminTickets();
      if (selectedAdminTicket) loadAdminConversation();
    }, POLL_MS);
  }

  function init() {
    if (document.body.dataset.publicPage === "true") return;
    ensureSidebarSupport();
    ensureChat();
    injectAdminSupportPanel();
    startUserPolling();

    document.querySelectorAll("[data-open-support]").forEach(button => {
      button.addEventListener("click", openChat);
    });
  }

  window.LAGSupport = {
    open: openChat,
    close: closeChat,
    refresh: () => {
      loadAdminTickets();
      if (currentTicketId) pollUserConversation();
    }
  };

  document.addEventListener("DOMContentLoaded", init);
})();
