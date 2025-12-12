(function () {
  // Export sofort, damit es NIE undefined ist
  window.GewerkGesamtModul = window.GewerkGesamtModul || {};
  window.GewerkGesamtModul.render = render;

  function euro(n){ return (Number(n)||0).toLocaleString("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}); }
  function p1(n){ return (Number(n)||0).toFixed(1).replace(".",",") + " %"; }

  function compute(rowsRaw){
    const rows = (rowsRaw||[]).filter(r => (""+(r["Aktiv (Ja/Nein)"]||"")).toLowerCase().startsWith("j"));
    let offer=0, paid=0, open=0, weightedProg=0;

    rows.forEach(r=>{
      const o = Number(r["Angebotssumme (€)"]||0);
      const p = Number(r["Zahlungen bisher (€)"]||0);
      const pr = Number(r["Baufortschritt (%)"]||0);
      offer += o; paid += p; open += Number(r["Offene Rechnungen (€)"]||0);
      weightedProg += pr * o;
    });

    const wProg = offer>0 ? (weightedProg/offer) : 0;
    const payQuote = offer>0 ? (paid/offer*100) : 0;
    const rest = offer - paid;

    const eac = wProg>0 ? (paid/(wProg/100)) : 0;
    const eacDelta = eac - offer;
    const warn = offer>0 && payQuote > (wProg + 8);

    return { rows, offer, paid, open, wProg, payQuote, rest, eac, eacDelta, warn };
  }

  function render(rootEl, rowsRaw, title){
    if(!rootEl) return;
    const s = compute(rowsRaw);

    rootEl.classList.toggle("warn", s.warn);

    rootEl.innerHTML = `
      <div class="gg-head">
        <div>
          <h2 class="gg-title">${title || rootEl.dataset.title || "Gesamtübersicht"}</h2>
          <div class="gg-sub">
            <span class="gg-pill">Aktive Gewerke: ${s.rows.length}</span>
            <span class="gg-pill">Offen: ${euro(s.open)}</span>
          </div>
        </div>
        <div class="gg-status ${s.warn?"warn":"ok"}">${s.warn?"Risiko: Kosten > Fortschritt":"Status: OK"}</div>
      </div>

      <div class="gg-body">
        <div class="gg-panel">
          <div class="gg-kpis">
            <div class="gg-kpi"><div class="l">Gesamtbudget</div><div class="v">${euro(s.offer)}</div></div>
            <div class="gg-kpi"><div class="l">Zahlungen</div><div class="v">${euro(s.paid)}</div><div class="h">${p1(s.payQuote)}</div></div>
            <div class="gg-kpi"><div class="l">Restbudget</div><div class="v">${euro(s.rest)}</div><div class="h">${s.rest<0?"Über Budget":"Verfügbar"}</div></div>
            <div class="gg-kpi"><div class="l">Fortschritt</div><div class="v">${p1(s.wProg)}</div><div class="h">gewichteter Ø</div></div>
          </div>

          <div class="gg-rowtitle"><span>Kostenquote</span><span>${euro(s.paid)} / ${euro(s.offer)}</span></div>
          <div class="gg-barrow">
            <span>0%</span>
            <div class="gg-track"><div class="gg-fill orange" data-w="${Math.min(s.payQuote,100)}%">${p1(s.payQuote)}</div></div>
            <span>100%</span>
          </div>

          <div style="height:10px"></div>

          <div class="gg-rowtitle"><span>Fortschritt</span><span>Soll 100%</span></div>
          <div class="gg-barrow">
            <span>0%</span>
            <div class="gg-track"><div class="gg-fill green" data-w="${Math.min(s.wProg,100)}%">${p1(s.wProg)}</div></div>
            <span>100%</span>
          </div>

          <div class="gg-meta">
            Forecast (EAC): <strong>${euro(s.eac)}</strong> · Δ: <strong>${euro(s.eacDelta)}</strong>
          </div>
        </div>
      </div>
    `;

    requestAnimationFrame(()=>{
      rootEl.querySelectorAll(".gg-fill").forEach(el=>{
        const w = el.getAttribute("data-w") || "0%";
        el.style.width = "0%";
        requestAnimationFrame(()=>{ el.style.width = w; });
      });
    });
  }
})();