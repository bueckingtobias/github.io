(function(){
  window.FinanceMietenModul = window.FinanceMietenModul || {};
  window.FinanceMietenModul.rootClass = "fin-mieten-root";
  window.FinanceMietenModul.render = render;

  function euro(n){
    return (Number(n)||0).toLocaleString("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0});
  }
  function pct1(n){
    return (Number(n)||0).toFixed(1).replace(".",",") + " %";
  }
  function sum(arr, fn){
    return (arr||[]).reduce((a,x)=>a + (fn?fn(x):Number(x||0)), 0);
  }

  function render(rootEl, data){
    const rents = data.rents || [];

    const totalSoll = sum(rents, r=>Number(r.soll||0));
    const totalIst  = sum(rents, r=>Number(r.ist||0));
    const totalArrears = sum(rents, r=>Number(r.arrears||0));
    const totalVac = sum(rents, r=>Number(r.vacancy||0));
    const quote = totalSoll>0 ? (totalIst/totalSoll*100) : 0;

    rootEl.innerHTML = `
      <div class="fm-head">
        <div>
          <div class="fm-title">Mietübersicht</div>
          <div class="fm-sub">Soll/Ist, Leerstand und Rückstände pro Objekt.</div>
        </div>
        <div class="fm-badge">Ist-Quote: ${pct1(quote)}</div>
      </div>

      <div class="fm-body">
        <div class="fm-grid">
          ${rents.length ? rents.map(r=>{
            const q = r.soll>0 ? (r.ist/r.soll*100) : 0;
            const warn = (Number(r.vacancy||0)>0) || (Number(r.arrears||0)>0) || q<92;
            return `
              <div class="fm-item">
                <div class="fm-t">${r.object}</div>
                <div class="fm-s">Einheiten: ${r.units} · Leerstand: ${r.vacancy} · Rückstand: ${euro(r.arrears)} · ${warn ? "Beobachten" : "OK"}</div>
                <div class="fm-nums">
                  <div class="fm-n">
                    <div class="k">Soll</div>
                    <div class="v">${euro(r.soll)}</div>
                    <div class="h">Monat</div>
                  </div>
                  <div class="fm-n">
                    <div class="k">Ist</div>
                    <div class="v">${euro(r.ist)}</div>
                    <div class="h">Quote: ${pct1(q)}</div>
                  </div>
                  <div class="fm-n">
                    <div class="k">Rückstand</div>
                    <div class="v">${euro(r.arrears)}</div>
                    <div class="h">${Number(r.arrears||0)>0 ? "Mahnen / klären" : "OK"}</div>
                  </div>
                  <div class="fm-n">
                    <div class="k">Leerstand</div>
                    <div class="v">${r.vacancy}</div>
                    <div class="h">${Number(r.vacancy||0)>0 ? "Vermarktung" : "OK"}</div>
                  </div>
                </div>
              </div>
            `;
          }).join("") : `<div style="font-size:12px;color:rgba(226,232,240,.72);">Keine Daten.</div>`}
        </div>

        <div class="fm-hint">
          Gesamt Soll: <strong>${euro(totalSoll)}</strong> · Ist: <strong>${euro(totalIst)}</strong> ·
          Leerstand: <strong>${totalVac}</strong> · Rückstand: <strong>${euro(totalArrears)}</strong>
        </div>
      </div>
    `;
  }
})();