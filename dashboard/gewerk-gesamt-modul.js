(function(){
  const root = document.querySelector(".gewerk-gesamt-root");
  if(!root) return;

  const rows = (window.__PROJECT_ROWS__ || []).filter(r => (""+(r["Aktiv (Ja/Nein)"]||"")).toLowerCase().startsWith("j"));

  // Fallback demo, damit beim Einzel-Öffnen nie leer
  const demo = [
    {"Aktiv (Ja/Nein)":"Ja","Gewerk":"Rohbau","Angebotssumme (€)":320000,"Zahlungen bisher (€)":210000,"Offene Rechnungen (€)":18000,"Baufortschritt (%)":70},
    {"Aktiv (Ja/Nein)":"Ja","Gewerk":"Elektro","Angebotssumme (€)":95000,"Zahlungen bisher (€)":65000,"Offene Rechnungen (€)":9000,"Baufortschritt (%)":30}
  ];
  const data = rows.length ? rows : demo;

  let offer=0, paid=0, open=0, weightedProg=0;
  data.forEach(r=>{
    const o = Number(r["Angebotssumme (€)"]||0);
    const p = Number(r["Zahlungen bisher (€)"]||0);
    const pr = Number(r["Baufortschritt (%)"]||0);
    offer += o; paid += p; open += Number(r["Offene Rechnungen (€)"]||0);
    weightedProg += pr * o;
  });

  const wProg = offer>0 ? weightedProg/offer : 0;
  const payQuote = offer>0 ? paid/offer*100 : 0;
  const rest = offer-paid;
  const eac = wProg>0 ? paid/(wProg/100) : 0;
  const eacDelta = eac-offer;

  const warn = offer>0 && payQuote > (wProg+8);
  root.classList.toggle("warn", warn);

  const euro = n => (Number(n)||0).toLocaleString("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0});
  const p1 = n => (Number(n)||0).toFixed(1).replace(".",",") + " %";

  root.innerHTML = `
    <div class="gg-head">
      <div>
        <h2 class="gg-title">${root.dataset.title || "Gesamtübersicht"}</h2>
        <div class="gg-sub">
          <span class="gg-pill">Aktive Gewerke: ${rows.length || demo.length}${rows.length ? "" : " (Demo)"}</span>
          <span class="gg-pill">Offen: ${euro(open)}</span>
        </div>
      </div>
      <div class="gg-status ${warn?"warn":"ok"}">${warn?"Risiko: Kosten > Fortschritt":"Status: OK"}</div>
    </div>

    <div class="gg-body">
      <div class="gg-panel">
        <div class="gg-kpis">
          <div class="gg-kpi"><div class="l">Gesamtbudget</div><div class="v">${euro(offer)}</div></div>
          <div class="gg-kpi"><div class="l">Zahlungen</div><div class="v">${euro(paid)}</div><div class="h">${p1(payQuote)}</div></div>
          <div class="gg-kpi"><div class="l">Restbudget</div><div class="v">${euro(rest)}</div><div class="h">${rest<0?"Über Budget":"Verfügbar"}</div></div>
          <div class="gg-kpi"><div class="l">Fortschritt</div><div class="v">${p1(wProg)}</div><div class="h">gewichteter Ø</div></div>
        </div>

        <div class="gg-rowtitle"><span>Kostenquote</span><span>${euro(paid)} / ${euro(offer)}</span></div>
        <div class="gg-barrow">
          <span>0%</span>
          <div class="gg-track"><div class="gg-fill orange" style="width:${Math.min(payQuote,100)}%">${p1(payQuote)}</div></div>
          <span>100%</span>
        </div>

        <div style="height:10px"></div>

        <div class="gg-rowtitle"><span>Fortschritt</span><span>Soll 100%</span></div>
        <div class="gg-barrow">
          <span>0%</span>
          <div class="gg-track"><div class="gg-fill green" style="width:${Math.min(wProg,100)}%">${p1(wProg)}</div></div>
          <span>100%</span>
        </div>

        <div class="gg-meta">
          Forecast (EAC): <strong>${euro(eac)}</strong> · Δ: <strong>${euro(eacDelta)}</strong>
        </div>
      </div>
    </div>
  `;

  requestAnimationFrame(()=>{
    root.querySelectorAll(".gg-fill").forEach(el=>{
      const w = el.style.width;
      el.style.width = "0%";
      requestAnimationFrame(()=> el.style.width = w);
    });
  });
})();