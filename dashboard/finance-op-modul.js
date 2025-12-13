(function(){
  window.FinanceOPModul = window.FinanceOPModul || {};
  window.FinanceOPModul.rootClass = "fin-op-root";
  window.FinanceOPModul.render = render;

  function euro(n){
    return (Number(n)||0).toLocaleString("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0});
  }
  function sum(arr, fn){
    return (arr||[]).reduce((a,x)=>a + (fn?fn(x):Number(x||0)), 0);
  }
  function overdueCount(items){
    return (items||[]).filter(x => (""+(x.status||"")).toLowerCase().includes("ueber")).length;
  }

  function rowHTML(x, sign){
    const isOver = (""+(x.status||"")).toLowerCase().includes("ueber");
    const due = x.due ? `fällig ${x.due}` : "";
    const meta = `${x.object || x.vendor || ""}${(x.object||x.vendor) ? " · " : ""}${due}`;
    return `
      <div class="fo-row">
        <div class="left">
          <div class="name">${x.title || "Eintrag"}</div>
          <div class="meta">${meta}</div>
        </div>
        <div class="right">
          <div class="val">${sign} ${euro(x.amount)}</div>
          <div class="tag">${isOver ? "Überfällig" : "Fällig"}</div>
        </div>
      </div>
    `;
  }

  function render(rootEl, data){
    const ar = data.ar || [];
    const ap = data.ap || [];

    const arSum = sum(ar, x=>Number(x.amount||0));
    const apSum = sum(ap, x=>Number(x.amount||0));
    const arOver = overdueCount(ar);
    const apOver = overdueCount(ap);

    rootEl.innerHTML = `
      <div class="fo-head">
        <div>
          <div class="fo-title">Offene Posten</div>
          <div class="fo-sub">Eingänge (AR) & Ausgänge (AP) inklusive Überfällig-Check.</div>
        </div>
        <div class="fo-badges">
          <span class="fo-badge ${arOver>0 ? "warn":"ok"}">AR: ${euro(arSum)} · ÜF: ${arOver}</span>
          <span class="fo-badge ${apOver>0 ? "warn":"ok"}">AP: ${euro(apSum)} · ÜF: ${apOver}</span>
          <span class="fo-badge">Netto (AR−AP): ${euro(arSum-apSum)}</span>
        </div>
      </div>

      <div class="fo-body">
        <div class="fo-box">
          <div class="fo-boxtitle">Eingänge (AR)</div>
          <div class="fo-boxsub">Forderungen / Mieten / Nachzahlungen</div>
          <div class="fo-list">
            ${(ar.length ? ar.map(x=>rowHTML(x, "+")).join("") : `<div style="font-size:12px;color:rgba(226,232,240,.72);">Keine Einträge.</div>`)}
          </div>
        </div>

        <div class="fo-box">
          <div class="fo-boxtitle">Ausgänge (AP)</div>
          <div class="fo-boxsub">Rechnungen / Abschläge / Services</div>
          <div class="fo-list">
            ${(ap.length ? ap.map(x=>rowHTML(x, "−")).join("") : `<div style="font-size:12px;color:rgba(226,232,240,.72);">Keine Einträge.</div>`)}
          </div>
        </div>
      </div>
    `;
  }
})();