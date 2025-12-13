(function(){
  window.FinanceBudgetModul = window.FinanceBudgetModul || {};
  window.FinanceBudgetModul.rootClass = "fin-budget-root";
  window.FinanceBudgetModul.render = render;

  function euro(n){
    return (Number(n)||0).toLocaleString("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0});
  }
  function pct1(n){
    return (Number(n)||0).toFixed(1).replace(".",",") + " %";
  }
  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
  function sum(arr, fn){
    return (arr||[]).reduce((a,x)=>a + (fn?fn(x):Number(x||0)), 0);
  }

  function compute(budget){
    const planned = sum(budget, x=>Number(x.plan||0));
    const actual  = sum(budget, x=>Number(x.actual||0));
    const fixed   = sum((budget||[]).filter(x=>(x.type||"")==="fixed"), x=>Number(x.actual||0));
    const fixedShare = actual>0 ? fixed/actual*100 : 0;
    const usage = planned>0 ? actual/planned*100 : 0;
    return { planned, actual, fixed, fixedShare, usage };
  }

  function render(rootEl, data){
    const budget = data.budget || [];
    const info = compute(budget);

    const over = info.usage;
    const warn = over > 108;
    const badgeClass = warn ? "warn" : "ok";
    const badgeText  = warn ? "Budget unter Druck" : "Budget OK";

    const avgMonth = budget.length ? (info.actual / Math.max(1, budget.length)) : info.actual;

    const maxVal = Math.max(...budget.map(x=>Number(x.actual||0)), 1);

    rootEl.innerHTML = `
      <div class="fb-head">
        <div>
          <div class="fb-title">Budget & Verteilung</div>
          <div class="fb-sub">Top-Kostenblöcke, Verbrauch und Fixkostenquote.</div>
        </div>
        <div class="fb-badge ${badgeClass}">${badgeText}</div>
      </div>

      <div class="fb-body">
        <div class="fb-tiles">
          <div class="fb-tile">
            <div class="k">Ø Monatskosten</div>
            <div class="v">${euro(avgMonth)}</div>
            <div class="h">aus Budget-Kategorien</div>
          </div>
          <div class="fb-tile">
            <div class="k">Fixkostenquote</div>
            <div class="v">${pct1(info.fixedShare)}</div>
            <div class="h">Fix: ${euro(info.fixed)} · Gesamt: ${euro(info.actual)}</div>
          </div>
        </div>

        <div class="fb-bars">
          ${budget
            .slice()
            .sort((a,b)=>Number(b.actual||0)-Number(a.actual||0))
            .map(x=>{
              const a = Number(x.actual||0);
              const p = Number(x.plan||0);
              const ratio = p>0 ? (a/p*100) : 0;
              const w = clamp((a/maxVal*100), 0, 100);
              const cls = ratio > 110 ? "orange" : (ratio > 95 ? "blue" : "green");
              return `
                <div>
                  <div class="fb-rowtitle"><span>${x.category}</span><span>${euro(a)} / ${euro(p)}</span></div>
                  <div class="fb-barrow">
                    <span>0</span>
                    <div class="fb-track">
                      <div class="fb-fill ${cls}" data-w="${w}%">${pct1(ratio)}</div>
                    </div>
                    <span>${euro(maxVal)}</span>
                  </div>
                </div>
              `;
            }).join("")
          }
        </div>

        <div class="fb-hint">
          Plan: <strong>${euro(info.planned)}</strong> · Ist: <strong>${euro(info.actual)}</strong> · Δ: <strong>${euro(info.actual - info.planned)}</strong>
        </div>
      </div>
    `;

    requestAnimationFrame(()=>{
      rootEl.querySelectorAll(".fb-fill[data-w]").forEach(el=>{
        const w = el.getAttribute("data-w") || "0%";
        el.style.width = "0%";
        requestAnimationFrame(()=>{ el.style.width = w; });
      });
    });
  }
})();