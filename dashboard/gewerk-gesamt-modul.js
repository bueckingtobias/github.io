(function () {
  window.GewerkGesamtModul = window.GewerkGesamtModul || {};
  window.GewerkGesamtModul.render = render;

  function euro(n){ return (Number(n)||0).toLocaleString("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}); }
  function p1(n){ return (Number(n)||0).toFixed(1).replace(".",",") + " %"; }

  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }

  function compute(allRows){
    const rows = (allRows||[]).filter(r => (""+(r["Aktiv (Ja/Nein)"]||"")).toLowerCase().startsWith("j"));

    let offer=0, paid=0, open=0, weightedProg=0;
    let warnCount=0;

    const enriched = rows.map(r=>{
      const o = Number(r["Angebotssumme (€)"]||0);
      const p = Number(r["Zahlungen bisher (€)"]||0);
      const op = Number(r["Offene Rechnungen (€)"]||0);
      const pr = Number(r["Baufortschritt (%)"]||0);

      const payQuote = o>0 ? (p/o*100) : 0;
      const delta = payQuote - pr;              // positive = Geld voraus
      const warn = o>0 && delta > 8;

      offer += o; paid += p; open += op; weightedProg += pr * o;
      if(warn) warnCount++;

      return { r, o, p, op, pr, payQuote, delta, warn };
    });

    const wProg = offer>0 ? (weightedProg/offer) : 0;
    const payQuoteTotal = offer>0 ? (paid/offer*100) : 0;
    const rest = offer - paid;

    const eac = wProg>0 ? (paid/(wProg/100)) : 0;
    const eacDelta = eac - offer;

    // Top risks: highest delta
    const topRisks = enriched
      .slice()
      .sort((a,b)=> (b.delta - a.delta))
      .slice(0,3);

    // Top budget: highest offer
    const topBudget = enriched
      .slice()
      .sort((a,b)=> (b.o - a.o))
      .slice(0,3);

    // Budget mix (top 6 by offer + rest as "Andere")
    const mixSorted = enriched.slice().sort((a,b)=>b.o-a.o);
    const topMix = mixSorted.slice(0,6);
    const otherSum = mixSorted.slice(6).reduce((s,x)=>s+x.o,0);

    const mix = [
      ...topMix.map(x=>({ label: (x.r["Gewerk"]||x.r["Handwerker"]||"Gewerk"), value:x.o })),
      ...(otherSum>0 ? [{ label:"Andere", value:otherSum }] : [])
    ];

    return {
      rows,
      enriched,
      offer, paid, open, wProg, payQuoteTotal, rest, eac, eacDelta,
      warnCount,
      topRisks,
      topBudget,
      mix
    };
  }

  // Simple palette for segments (fixed set)
  const SEG_COLORS = [
    "#2563eb","#3b82f6","#22c55e","#f97316","#a855f7","#06b6d4","#64748b"
  ];

  function render(rootEl, rowsRaw, title){
    if(!rootEl) return;
    const s = compute(rowsRaw);
    const isWarn = s.offer>0 && (s.payQuoteTotal > (s.wProg + 8));

    // Mix segments
    const mixTotal = s.mix.reduce((a,b)=>a + (b.value||0), 0) || 1;
    const segHTML = s.mix.map((m,i)=>{
      const w = clamp((m.value/mixTotal*100), 0, 100);
      const c = SEG_COLORS[i % SEG_COLORS.length];
      return `<div class="gg-mixseg" style="width:${w}%;background:${c}" title="${m.label}: ${euro(m.value)}"></div>`;
    }).join("");

    const legendHTML = s.mix.map((m,i)=>{
      const c = SEG_COLORS[i % SEG_COLORS.length];
      return `
        <div class="gg-legenditem">
          <span class="gg-dot" style="background:${c}"></span>
          <span>${m.label}</span>
          <span style="opacity:.75">· ${euro(m.value)}</span>
        </div>
      `;
    }).join("");

    const riskList = (s.topRisks.length ? s.topRisks : []).map(x=>{
      const name = x.r["Gewerk"] || "Gewerk";
      const hw = x.r["Handwerker"] || "";
      const meta = `${hw}${hw?" · ":""}Fortschritt ${p1(x.pr)} · Kostenquote ${p1(x.payQuote)}`;
      return `
        <div class="gg-item">
          <div class="left">
            <div class="name">${name}</div>
            <div class="meta">${meta}</div>
          </div>
          <div class="right">
            <div class="val">Δ ${p1(x.delta)}</div>
            <div class="tag">${x.warn ? "Warnung" : "Beobachten"}</div>
          </div>
        </div>
      `;
    }).join("") || `<div class="gg-meta">Keine aktiven Gewerke.</div>`;

    const budgetList = (s.topBudget.length ? s.topBudget : []).map(x=>{
      const name = x.r["Gewerk"] || "Gewerk";
      const hw = x.r["Handwerker"] || "";
      const meta = `${hw}${hw?" · ":""}Zahlungen ${euro(x.p)} · Fortschritt ${p1(x.pr)}`;
      return `
        <div class="gg-item">
          <div class="left">
            <div class="name">${name}</div>
            <div class="meta">${meta}</div>
          </div>
          <div class="right">
            <div class="val">${euro(x.o)}</div>
            <div class="tag">Budget</div>
          </div>
        </div>
      `;
    }).join("") || `<div class="gg-meta">Keine aktiven Gewerke.</div>`;

    rootEl.innerHTML = `
      <div class="gg-head">
        <div>
          <h2 class="gg-title">${title || rootEl.dataset.title || "Gesamtübersicht"}</h2>
          <div class="gg-sub">
            <span class="gg-pill">Aktive Gewerke: ${s.rows.length}</span>
            <span class="gg-pill">Warnungen: ${s.warnCount}</span>
            <span class="gg-pill">Offen: ${euro(s.open)}</span>
            <span class="gg-pill">EAC Δ: ${euro(s.eacDelta)}</span>
          </div>
        </div>
        <div class="gg-status ${isWarn ? "warn":"ok"}">${isWarn ? "Risiko: Kosten > Fortschritt" : "Status: OK"}</div>
      </div>

      <div class="gg-body">
        <div class="gg-kpis">
          <div class="gg-kpi">
            <div class="l">Gesamtbudget</div>
            <div class="v">${euro(s.offer)}</div>
            <div class="h">Summe Angebote (aktive Gewerke)</div>
          </div>
          <div class="gg-kpi">
            <div class="l">Zahlungen</div>
            <div class="v">${euro(s.paid)}</div>
            <div class="h">${p1(s.payQuoteTotal)} Zahlungsquote</div>
          </div>
          <div class="gg-kpi">
            <div class="l">Restbudget</div>
            <div class="v">${euro(s.rest)}</div>
            <div class="h">${s.rest < 0 ? "Über Budget" : "Verfügbar"}</div>
          </div>
          <div class="gg-kpi">
            <div class="l">Fortschritt</div>
            <div class="v">${p1(s.wProg)}</div>
            <div class="h">gewichteter Ø nach Budget</div>
          </div>
        </div>

        <div>
          <div class="gg-rowtitle"><span>Kostenquote</span><span>${euro(s.paid)} / ${euro(s.offer)}</span></div>
          <div class="gg-barrow">
            <span>0%</span>
            <div class="gg-track">
              <div class="gg-fill orange" data-w="${clamp(s.payQuoteTotal,0,100)}%">${p1(s.payQuoteTotal)}</div>
            </div>
            <span>100%</span>
          </div>
        </div>

        <div>
          <div class="gg-rowtitle"><span>Fortschritt</span><span>Ziel 100%</span></div>
          <div class="gg-barrow">
            <span>0%</span>
            <div class="gg-track">
              <div class="gg-fill green" data-w="${clamp(s.wProg,0,100)}%">${p1(s.wProg)}</div>
            </div>
            <span>100%</span>
          </div>
        </div>

        <div class="gg-mix">
          <div class="gg-rowtitle"><span>Budget-Verteilung</span><span>Top Gewerke</span></div>
          <div class="gg-mixbar">${segHTML}</div>
          <div class="gg-mixlegend">${legendHTML}</div>
        </div>

        <div class="gg-insights">
          <div class="gg-box">
            <div class="gg-boxhead">
              <div class="gg-boxtitle">Top Risiken</div>
              <div class="gg-boxsub">Kostenquote vs Fortschritt</div>
            </div>
            <div class="gg-list">${riskList}</div>
          </div>

          <div class="gg-box">
            <div class="gg-boxhead">
              <div class="gg-boxtitle">Top Budget</div>
              <div class="gg-boxsub">größte Angebotssummen</div>
            </div>
            <div class="gg-list">${budgetList}</div>
          </div>
        </div>

        <div class="gg-meta">
          Forecast (EAC): <strong>${euro(s.eac)}</strong> ·
          EAC Δ: <strong>${euro(s.eacDelta)}</strong> ·
          Offene Rechnungen: <strong>${euro(s.open)}</strong>
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