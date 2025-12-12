(function(){
  function euro(n){ return (Number(n)||0).toLocaleString("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}); }
  function p1(n){ return (Number(n)||0).toFixed(1).replace(".",",") + " %"; }

  function compute(row){
    const angebot = Number(row["Angebotssumme (€)"] || 0);
    const zahlungen = Number(row["Zahlungen bisher (€)"] || 0);
    const offen = Number(row["Offene Rechnungen (€)"] || 0);
    const fortschritt = Number(row["Baufortschritt (%)"] || 0);

    const kostenQuote = angebot > 0 ? (zahlungen/angebot*100) : 0;
    const rest = angebot - zahlungen;

    const warn = angebot > 0 && kostenQuote > (fortschritt + 8);

    return { angebot, zahlungen, offen, fortschritt, kostenQuote, rest, warn };
  }

  function render(rootEl, row, opts){
    if(!rootEl) return;

    const o = opts || {};
    const s = compute(row || {});
    rootEl.classList.toggle("warn", s.warn);

    const gewerk = (row?.["Gewerk"] || "Gewerk");
    const handwerker = (row?.["Handwerker"] || "");
    const title = handwerker ? `${gewerk} – ${handwerker}` : gewerk;

    const projekt = o.projektName || "";

    rootEl.innerHTML = `
      <div class="gm-head">
        <div>
          <h3 class="gm-title">${title}</h3>
          <div class="gm-sub">${projekt}${o.isDemo ? " (Demo)" : ""}</div>
        </div>
        <div class="gm-status ${s.warn ? "warn":"ok"}">
          ${s.warn ? "Kosten > Fortschritt" : "OK"}
        </div>
      </div>

      <div class="gm-body">
        <div class="gm-kpis">
          <div class="gm-kpi">
            <div class="l">Angebot</div>
            <div class="v">${euro(s.angebot)}</div>
          </div>
          <div class="gm-kpi">
            <div class="l">Zahlungen</div>
            <div class="v">${euro(s.zahlungen)}</div>
          </div>
          <div class="gm-kpi">
            <div class="l">Rest</div>
            <div class="v">${euro(s.rest)}</div>
          </div>
        </div>

        <div>
          <div class="gm-rowtitle">
            <span>Zahlungen / Budget</span>
            <span>${p1(s.kostenQuote)}</span>
          </div>
          <div class="gm-barrow">
            <span>0%</span>
            <div class="gm-track">
              <div class="gm-fill blue" data-w="${Math.min(s.kostenQuote,100)}%">${p1(s.kostenQuote)}</div>
            </div>
            <span>100%</span>
          </div>
        </div>

        <div>
          <div class="gm-rowtitle">
            <span>Baufortschritt</span>
            <span>${p1(s.fortschritt)}</span>
          </div>
          <div class="gm-barrow">
            <span>0%</span>
            <div class="gm-track">
              <div class="gm-fill green" data-w="${Math.min(s.fortschritt,100)}%">${p1(s.fortschritt)}</div>
            </div>
            <span>100%</span>
          </div>
        </div>

        <div class="gm-meta">
          Offene Rechnungen: <strong>${euro(s.offen)}</strong>
          ${o.owner ? " · Owner: " + o.owner : ""}
        </div>
      </div>
    `;

    requestAnimationFrame(()=>{
      rootEl.querySelectorAll(".gm-fill").forEach(el=>{
        const w = el.getAttribute("data-w") || "0%";
        el.style.width = "0%";
        requestAnimationFrame(()=>{ el.style.width = w; });
      });
    });
  }

  // Export
  window.GewerkModul = { render };

  // Standalone Demo, falls direkt geöffnet
  window.addEventListener("DOMContentLoaded", ()=>{
    const root = document.querySelector(".gewerk-modul-root");
    if(!root) return;

    const demoRow = {
      "Aktiv (Ja/Nein)":"Ja",
      "Gewerk":"Elektro",
      "Handwerker":"Schröder",
      "Angebotssumme (€)":95000,
      "Zahlungen bisher (€)":65000,
      "Offene Rechnungen (€)":9000,
      "Baufortschritt (%)":30
    };
    render(root, demoRow, { projektName:"Standalone", isDemo:true, owner:"Tobi" });
  });
})();