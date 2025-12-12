(function(){
  window.GewerkModul = window.GewerkModul || {};
  window.GewerkModul.render = render;

  function euro(n){ return (Number(n)||0).toLocaleString("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}); }
  function p1(n){ return (Number(n)||0).toFixed(1).replace(".",",") + " %"; }
  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }

  function render(rootEl, row, opts){
    opts = opts || {};
    if(!rootEl) return;

    const gewerk = row["Gewerk"] || "Gewerk";
    const hw = row["Handwerker"] || "Handwerker";
    const offer = Number(row["Angebotssumme (€)"]||0);
    const paid  = Number(row["Zahlungen bisher (€)"]||0);
    const open  = Number(row["Offene Rechnungen (€)"]||0);
    const prog  = Number(row["Baufortschritt (%)"]||0);

    const payQuote = offer>0 ? (paid/offer*100) : 0;
    const delta = payQuote - prog;
    const isWarn = offer>0 && delta > 8;

    const payW = clamp(payQuote,0,100);
    const progW = clamp(prog,0,100);

    const tagClass = isWarn ? "warn" : "ok";
    const tagText = isWarn ? "Kosten > Fortschritt" : "OK";

    const subtitle = `${hw}${opts.projektName ? " · " + opts.projektName : ""}`;

    rootEl.innerHTML = `
      <div class="gm-card">
        <div class="gm-head">
          <div style="min-width:0">
            <div class="gm-title">${gewerk}</div>
            <div class="gm-sub">${subtitle}</div>
          </div>
          <div class="gm-tag ${tagClass}">${tagText}</div>
        </div>

        <div class="gm-kpis">
          <div class="gm-kpi">
            <div class="l">Angebot</div>
            <div class="v">${euro(offer)}</div>
            <div class="h">Budget für dieses Gewerk</div>
          </div>
          <div class="gm-kpi">
            <div class="l">Zahlungen</div>
            <div class="v">${euro(paid)}</div>
            <div class="h">${p1(payQuote)} Kostenquote</div>
          </div>
        </div>

        <div class="gm-bars">
          <div>
            <div class="gm-rowtitle"><span>Zahlungen vs. Angebot</span><span>${euro(paid)} / ${euro(offer)}</span></div>
            <div class="gm-barrow">
              <span>0%</span>
              <div class="gm-track">
                <div class="gm-fill blue" data-w="${payW}%">${p1(payQuote)} · ${euro(paid)}</div>
              </div>
              <span>100%</span>
            </div>
          </div>

          <div>
            <div class="gm-rowtitle"><span>Baufortschritt</span><span>${p1(prog)}</span></div>
            <div class="gm-barrow">
              <span>0%</span>
              <div class="gm-track">
                <div class="gm-fill green" data-w="${progW}%">${p1(prog)}</div>
              </div>
              <span>100%</span>
            </div>
          </div>
        </div>

        <div class="gm-meta">
          Offene Rechnungen: <strong>${euro(open)}</strong> ·
          Δ (Kostenquote − Fortschritt): <strong>${p1(delta)}</strong>
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

  // Standalone Demo (wenn direkt geöffnet)
  window.addEventListener("DOMContentLoaded", ()=>{
    const root = document.querySelector(".gewerk-modul-root");
    if(!root) return;

    // Wenn view-projects rendert, überschreibt er ohnehin. Demo läuft nur beim Direktaufruf sinnvoll.
    const demoRow = {
      "Aktiv (Ja/Nein)":"Ja",
      "Gewerk":"Elektro",
      "Handwerker":"Elektro Schröder",
      "Angebotssumme (€)":95000,
      "Zahlungen bisher (€)":65000,
      "Offene Rechnungen (€)":9000,
      "Baufortschritt (%)":30
    };

    // Nur rendern, wenn leer (nicht doppelt)
    if(root.innerHTML.trim().length === 0){
      render(root, demoRow, { projektName:"Standalone" });
    }
  });

})();