(function(){
  window.FinanceReservenModul = window.FinanceReservenModul || {};
  window.FinanceReservenModul.rootClass = "fin-res-root";
  window.FinanceReservenModul.render = render;

  function euro(n){
    return (Number(n)||0).toLocaleString("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0});
  }
  function pct1(n){
    return (Number(n)||0).toFixed(1).replace(".",",") + " %";
  }
  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }

  function render(rootEl, data){
    const reserves = data.reserves || [];
    const pcts = reserves.map(r => (Number(r.target||0)>0 ? (Number(r.current||0)/Number(r.target||0)*100) : 0));
    const minPct = pcts.length ? Math.min(...pcts) : 100;
    const warn = minPct < 55;

    rootEl.innerHTML = `
      <div class="fr-head">
        <div>
          <div class="fr-title">Rücklagen & Steuern</div>
          <div class="fr-sub">Zielstände & Erfüllung je Rücklage.</div>
        </div>
        <div class="fr-badge ${warn ? "warn":"ok"}">${warn ? "Puffer niedrig" : "Rücklagen OK"}</div>
      </div>

      <div class="fr-body">
        ${reserves.length ? reserves.map(r=>{
          const cur = Number(r.current||0);
          const tar = Number(r.target||0);
          const pc = tar>0 ? clamp(cur/tar*100,0,200) : 0;
          return `
            <div class="fr-item">
              <div class="fr-k">${r.name}</div>
              <div class="fr-v">${euro(cur)}</div>
              <div class="fr-h">Ziel: ${euro(tar)} · ${pct1(pc)}</div>
              <div class="fr-bar"><div data-w="${clamp(pc,0,100)}%"></div></div>
              <div class="fr-h" style="margin-top:8px">${r.note || ""}</div>
            </div>
          `;
        }).join("") : `<div style="font-size:12px;color:rgba(226,232,240,.72);">Keine Daten.</div>`}
      </div>
    `;

    requestAnimationFrame(()=>{
      rootEl.querySelectorAll(".fr-bar > div[data-w]").forEach(el=>{
        const w = el.getAttribute("data-w") || "0%";
        el.style.width = "0%";
        requestAnimationFrame(()=>{ el.style.width = w; });
      });
    });
  }
})();