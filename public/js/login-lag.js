(function () {
  const ready = (fn) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  };

  ready(() => {
    document.body.classList.add("lag-ui-ready");

    const citySelect = document.querySelector("#loginCidadeSelect, #cidadeSelecionada, #loginCity, select[name='cidade']");
    const emailInput = document.querySelector("#email, #loginEmail, input[type='email']");
    const passwordInput = document.querySelector("#password, #senha, #loginPassword, input[type='password']");
    const rememberInput = document.querySelector("#lembrarAcesso, #rememberAccess, input[name='remember']");
    const form = document.querySelector("#loginForm, form");
    const submitButton = document.querySelector("#loginButton, button[type='submit']");
    const message = document.querySelector("#authMessage, #loginMessage, #loginStatus, .login-message, .lag-login-message");

    if (message) {
      const syncMessageVisibility = () => {
        const hasText = Boolean(message.textContent.trim());
        message.classList.toggle("active", hasText);
        message.classList.toggle("error", message.classList.contains("erro"));
        message.classList.toggle("success", message.classList.contains("sucesso"));
      };

      syncMessageVisibility();

      new MutationObserver(syncMessageVisibility).observe(message, {
        childList: true,
        characterData: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"]
      });
    }

    const savedCity = localStorage.getItem("amorSaudeCidadeSelecionada") || localStorage.getItem("lagCidadeSelecionada");

    if (citySelect && savedCity) {
      [...citySelect.options].forEach((opt) => {
        if (normalizeText(opt.value) === normalizeText(savedCity) || normalizeText(opt.textContent) === normalizeText(savedCity)) {
          citySelect.value = opt.value;
        }
      });
    }

    citySelect?.addEventListener("change", () => {
      localStorage.setItem("amorSaudeCidadeSelecionada", citySelect.value);
      localStorage.setItem("lagCidadeSelecionada", citySelect.value);
      toast(`Unidade selecionada: ${citySelect.value}`, "success");
    });

    const savedEmail = localStorage.getItem("lagLoginEmail");

    if (emailInput && savedEmail && rememberInput) {
      emailInput.value = savedEmail;
      rememberInput.checked = true;
    }

    rememberInput?.addEventListener("change", () => {
      if (!rememberInput.checked) localStorage.removeItem("lagLoginEmail");
      if (rememberInput.checked && emailInput?.value) {
        localStorage.setItem("lagLoginEmail", emailInput.value.trim());
      }
    });

    emailInput?.addEventListener("input", () => {
      if (rememberInput?.checked) {
        localStorage.setItem("lagLoginEmail", emailInput.value.trim());
      }
    });

    form?.addEventListener("submit", () => {
      if (rememberInput?.checked && emailInput?.value) {
        localStorage.setItem("lagLoginEmail", emailInput.value.trim());
      }

      if (submitButton) {
        submitButton.classList.add("loading");
      }

      window.setTimeout(() => {
        submitButton?.classList.remove("loading");
      }, 5000);
    }, { capture: true });

    document.querySelectorAll(".lag-feature-grid article, .lag-login-card, .lag-hero-visual").forEach((el, index) => {
      el.style.setProperty("--lag-delay", `${index * 80}ms`);
      el.classList.add("lag-animate-in");
    });

    function toast(text, type = "success") {
      if (!message) return;

      message.textContent = text;
      message.className = `lag-login-message login-message active ${type}`;

      window.clearTimeout(message.__lagToastTimer);
      message.__lagToastTimer = window.setTimeout(() => {
        message.classList.remove("active");
        message.textContent = "";
      }, 2400);
    }

    function normalizeText(value = "") {
      return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
    }
  });
})();
