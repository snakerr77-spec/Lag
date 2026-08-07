(() => {
  "use strict";
  document.addEventListener("DOMContentLoaded", () => {
    const settings = window.LAGSettings;
    const body = document.body;
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("mobileOverlay");
    const menu = document.getElementById("menuButton");
    const theme = document.getElementById("themeButton");
    const storedHidden = localStorage.getItem("lag-sidebar-hidden");
    if (storedHidden === "true") body.classList.add("sidebar-hidden");
    else body.classList.remove("sidebar-hidden");

    function closeSidebar() {
      sidebar?.classList.remove("open");
      overlay?.classList.remove("show");
    }

    menu?.addEventListener("click", () => {
      if (matchMedia("(max-width:980px)").matches) {
        const open = !sidebar?.classList.contains("open");
        sidebar?.classList.toggle("open", open);
        overlay?.classList.toggle("show", open);
      } else {
        const hidden = body.classList.toggle("sidebar-hidden");
        localStorage.setItem("lag-sidebar-hidden", String(hidden));
        menu.setAttribute("aria-expanded", String(!hidden));
      }
    });

    overlay?.addEventListener("click", closeSidebar);
    document.querySelectorAll(".sidebar .nav-item, .sidebar .brand").forEach(link => {
      link.addEventListener("click", () => {
        if (matchMedia("(max-width:980px)").matches) closeSidebar();
      });
    });

    theme?.addEventListener("click", () => {
      if (!settings) return;
      const current = document.documentElement.dataset.theme || "dark-cyan";
      const next = settings.THEMES[(settings.THEMES.indexOf(current) + 1) % settings.THEMES.length];
      settings.applyTheme(next);
    });

    document.querySelectorAll("[data-city-options]").forEach(select => {
      const cities = settings?.cities || ["Cerquilho","Tatuí","Embu das Artes","Itapeva"];
      select.innerHTML = cities.map(city => `<option value="${city}">${city}</option>`).join("");
      const active = settings?.getActiveCity?.() || settings?.getCurrentUser?.()?.unit || cities[0];
      if ([...select.options].some(o => o.value === active)) select.value = active;
    });
  });
  window.LAGUI = {
    money(value){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(value)||0)},
    number(value){return new Intl.NumberFormat("pt-BR").format(Number(value)||0)},
    date(value){if(!value)return"—";return new Intl.DateTimeFormat("pt-BR").format(new Date(value.length===10?`${value}T12:00:00`:value))},
    cpf(value){const d=String(value||"").replace(/\D/g,"").slice(0,11);return d.replace(/^(\d{3})(\d)/,"$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/,"$1.$2.$3").replace(/(\d{3})(\d{1,2})$/,"$1-$2")},
    download(name,content,type="text/csv;charset=utf-8"){const blob=new Blob([content],{type});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)},
    toast(message,type="success"){let stack=document.querySelector(".global-toast-stack");if(!stack){stack=document.createElement("div");stack.className="global-toast-stack";Object.assign(stack.style,{position:"fixed",right:"20px",bottom:"20px",zIndex:10000,display:"grid",gap:"8px"});document.body.appendChild(stack)}const n=document.createElement("div");n.textContent=message;Object.assign(n.style,{padding:"12px 15px",borderRadius:"12px",background:type==="error"?"#c93850":"#0b2442",color:"white",boxShadow:"0 12px 35px rgba(0,0,0,.25)",fontSize:"12px",fontWeight:"700"});stack.appendChild(n);setTimeout(()=>n.remove(),3200)}
  };
})();
