(function () {
  const ready = (fn) => {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  };

  ready(() => {
    document.documentElement.classList.add("lag-svg-enabled");

    const candidates = [
      ".card",
      ".medical-body-card",
      ".medical-record-form",
      ".medical-panel",
      ".dashboard-card",
      ".home-card",
      ".module-card",
      ".control-card",
      ".lag-card"
    ].join(",");

    document.querySelectorAll(candidates).forEach((card, index) => {
      if (card.dataset.lagPolished === "true") return;

      card.dataset.lagPolished = "true";
      card.classList.add("lag-card-polish", "lag-soft-hover");

      if (index % 2 === 0) {
        const mark = document.createElement("span");
        mark.className = "lag-svg-watermark";
        mark.setAttribute("aria-hidden", "true");
        mark.innerHTML = `
          <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M60 10l42 24v52l-42 24-42-24V34l42-24z" fill="#075fca"/>
            <path d="M38 62l14 14 31-37" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
        card.appendChild(mark);
      }
    });

    document.querySelectorAll(".section-heading h2, .medical-heading h2, .page-title, h1").forEach((title) => {
      if (title.dataset.lagRibbon === "true") return;
      title.dataset.lagRibbon = "true";
      title.classList.add("lag-section-ribbon");
    });
  });
})();
