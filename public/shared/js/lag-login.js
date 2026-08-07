(() => {
  "use strict";
  const selectOne = (...selectors) => document.querySelector(selectors.join(", "));

  function showMessage(text, success = false) {
    const node = selectOne("#loginMessage", "#authMessage", ".lag-login-message");
    if (!node) return;
    node.textContent = text;
    node.classList.toggle("active", Boolean(text));
    node.classList.toggle("success", success);
    node.classList.toggle("error", !success && Boolean(text));
    node.style.color = success ? "#139665" : "#d74655";
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = selectOne("#lagLoginForm", "#loginForm", "form");
    const email = selectOne("#loginEmail", "#email", "input[type='email']");
    const password = selectOne("#loginPassword", "#password", "input[type='password']");
    const remember = selectOne("#rememberLogin", "#lembrarAcesso", "input[name='remember']");
    const togglePassword = selectOne("#toggleLoginPassword", "#togglePassword");
    const button = selectOne("#loginButton", ".lag-login-submit");
    const redirect = new URLSearchParams(location.search).get("redirect");
    if (!form || !email || !password) return;

    email.value = localStorage.getItem("lag-login-email") || "";
    togglePassword?.addEventListener("click", () => {
      password.type = password.type === "password" ? "text" : "password";
      togglePassword.innerHTML = password.type === "password"
        ? '<i class="fa-regular fa-eye"></i>'
        : '<i class="fa-regular fa-eye-slash"></i>';
    });

    form.addEventListener("submit", async event => {
      event.preventDefault();
      showMessage("");
      button?.setAttribute("disabled", "disabled");
      button?.classList.add("loading");
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ email: email.value.trim(), password: password.value })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Não foi possível entrar no sistema.");
        if (remember?.checked) localStorage.setItem("lag-login-email", email.value.trim());
        else localStorage.removeItem("lag-login-email");
        showMessage("Acesso liberado. Abrindo o painel...", true);
        setTimeout(() => {
          location.href = redirect || "/home-page/index.html";
        }, 280);
      } catch (error) {
        const local = location.hostname === "127.0.0.1" || location.hostname === "localhost";
        showMessage(local && String(error.message).includes("fetch")
          ? "Inicie com “npm run dev” para testar o backend Cloudflare localmente."
          : error.message);
      } finally {
        button?.removeAttribute("disabled");
        button?.classList.remove("loading");
      }
    });
  });
})();
