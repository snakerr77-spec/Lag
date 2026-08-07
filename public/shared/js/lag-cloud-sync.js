(() => {
  "use strict";
  const cloud = window.__LAG_CLOUD__;
  if (!cloud?.enabled || !cloud.user) return;

  const nativeSet = Storage.prototype.setItem.bind(localStorage);
  const nativeRemove = Storage.prototype.removeItem.bind(localStorage);
  const pending = new Map();
  const LOCAL_ONLY = new Set([
    "lag-current-user-id", "lag-user-role", "lag-active-city", "lag-users-v1", "lag-permissions-v1",
    "lag-auth-session-v1", "lag-auth-session-temp-v1", "lag-cloud-migrated-v1"
  ]);

  function rawSet(key, value) {
    try { nativeSet(key, String(value)); } catch {}
  }

  function rawRemove(key) {
    try { nativeRemove(key); } catch {}
  }

  function scopeForKey(key) {
    if (["lag-dashboard-theme", "lag-sidebar-hidden"].includes(key)) return "user";
    if (["lag-custom-topics-v1", "lag-sidebar-layout-v2"].includes(key)) return "global";
    return "city";
  }

  function shouldSync(key) {
    if (!String(key).startsWith("lag-")) return false;
    if (LOCAL_ONLY.has(key)) return false;
    if (/migration|fixed-navigation|cloud-migrated/i.test(key)) return false;
    return true;
  }

  function send(key, value, remove = false) {
    if (!shouldSync(key)) return;
    clearTimeout(pending.get(key));
    pending.set(key, setTimeout(async () => {
      pending.delete(key);
      try {
        const scope = scopeForKey(key);
        const url = `/api/state/${encodeURIComponent(key)}${remove ? `?scope=${scope}` : ""}`;
        const response = await fetch(url, {
          method: remove ? "DELETE" : "PUT",
          headers: remove ? undefined : { "Content-Type": "application/json" },
          body: remove ? undefined : JSON.stringify({ value: String(value), scope }),
          credentials: "same-origin"
        });
        if (!response.ok) console.warn("LAG Cloud: falha ao sincronizar", key, response.status);
      } catch (error) {
        console.warn("LAG Cloud: sincronização indisponível", key, error);
      }
    }, 280));
  }

  // Hidrata o armazenamento antes dos scripts dos módulos serem executados.
  Object.entries(cloud.state || {}).forEach(([key, value]) => rawSet(key, value));
  rawSet("lag-current-user-id", cloud.user.id);
  rawSet("lag-user-role", cloud.user.role);

  const cloudRole = String(cloud.user.role || "").trim().toLowerCase();
  const linkedCity = cloud.user.city || cloud.user.unit || "Cerquilho";
  const savedActiveCity = localStorage.getItem("lag-active-city") || linkedCity;
  rawSet("lag-active-city", cloudRole === "dev" ? savedActiveCity : linkedCity);

  if (cloudRole === "dev") {
    document.cookie = `lag_active_city=${encodeURIComponent(savedActiveCity)}; Path=/; SameSite=Lax; Max-Age=31536000`;
  }
  rawSet("lag-users-v1", JSON.stringify(cloud.users || [cloud.user]));
  rawSet("lag-permissions-v1", JSON.stringify(cloud.permissions || { [cloud.user.id]: cloud.user.permissions || [] }));

  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;
  Storage.prototype.setItem = function patchedSetItem(key, value) {
    originalSetItem.call(this, key, value);
    if (this === localStorage) send(String(key), String(value), false);
  };
  Storage.prototype.removeItem = function patchedRemoveItem(key) {
    originalRemoveItem.call(this, key);
    if (this === localStorage) send(String(key), "", true);
  };

  // Na primeira abertura no Cloudflare, envia dados locais antigos que ainda não existem no D1.
  if (localStorage.getItem("lag-cloud-migrated-v1") !== "done") {
    const remoteKeys = new Set(Object.keys(cloud.state || {}));
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || remoteKeys.has(key) || !shouldSync(key)) continue;
      const value = localStorage.getItem(key);
      if (value != null) send(key, value, false);
    }
    rawSet("lag-cloud-migrated-v1", "done");
  }

  window.LAGCloud = {
    enabled: true,
    user: cloud.user,
    users: cloud.users || [cloud.user],
    async refreshSession() {
      const response = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (response.status === 401) location.href = "/index.html";
      return response.ok ? response.json() : null;
    },
    async logout() {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      localStorage.removeItem("lag-auth-session-v1");
      sessionStorage.removeItem("lag-auth-session-temp-v1");
      location.href = "/index.html";
    }
  };
})();
