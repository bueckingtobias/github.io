(function(){
  window.FinanceGesamtModul = window.FinanceGesamtModul || {};
  window.FinanceGesamtModul.rootClass = "fin-gesamt-root";
  window.FinanceGesamtModul.render = render;

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

  function computeCashSeries(startCash, cashflow){
    let cash = Number(startCash||0);
    return (cashflow||[]).map(r=>{
      const inflow = Number(r.inflow||0);
      const outflow = Number(r.outflow||0);
      const net = inflow - outflow;
      cash += net;
      return { ...r, inflow, outflow, net, cash };
    });
  }

  function overdueCount(items){
    return (items||[]).filter(x => (""+(x.status||"")).toLowerCase().includes("ueber")).length;
  }

  function budgetInfo(budget){
    const planned = sum(budget, x=>Number(x.plan||0));
    const actual  = sum(budget, x=>Number(x.actual||0));
    const fixed   = sum((budget||[]).filter(x=>(x.type||"")==="fixed"), x=>Number(x.actual||0));
    const fixedShare = actual>0 ? fixed/actual*100 : 0;
    return { planned, actual, fixed, fixedShare };
  }

  function render(rootEl, data, cashflowSliced, opts){
    opts = opts || {};
    const horizon = opts.horizon || 12;

    const cashSeries = computeCashSeries(data.startCash, cashflowSliced);
    const last = cashSeries[cashSeries.length-1] || { cash: Number(data.startCash||0) };

    const netSum = sum(cashSeries, x=>x.net);
    const avgNet = cashSeries.length ? (netSum/cashSeries.length) : 0;

    const trend = cashSeries.length>=2 ? (cashSeries[cashSeries.length-1].cash - cashSeries[0].cash) : 0;

    const b = budgetInfo(data.budget || []);
    const bUsage = b.planned>0 ? (b.actual/b.planned*100) : 0;

    const arSum = sum(data.ar, x=>Number(x.amount||0));
    const apSum = sum(data.ap, x=>Number(x.amount||0));
    const arOver = overdueCount(data.ar);
    const apOver = overdueCount(data.ap);

    const tax = (data.reserves||[]).find(r => (r.name||"").toLowerCase().includes("steuer")) || (data.reserves||[])[0] || { current:0, target:0 };
    const buf = (data.reserves||[]).find(r => (r.name||"").toLowerCase().includes("liquid")) || (data.reserves||[])[2] || { current:0, target:0 };

    const runway = avgNet < 0 ? (last.cash / Math.abs(avgNet)) : null;

    const risk = (apOver>0) || (bUsage>108) || (runway!==null && runway < 6);
    const statusClass = risk ? "warn" : "ok";
    const statusText  = risk ? "Achtung: Risiken" : "Status: OK";

    const cashW = clamp((last.cash / Math.max(1, Number(data.startCash||1))) * 100, 0, 200);
    const budgetW = clamp(bUsage, 0, 200);

    rootEl.innerHTML = `
      <div class="fg-head">
        <div>
          <h2 class="fg-title">Finanzen – Gesamtübersicht</h2>
          <div class="fg-sub">
            <span class="fg-pill">Zeitraum: ${horizon}M</span>
            <span class="fg-pill">Netto: ${euro(netSum)}</span>
            <span class="fg-pill">Trend: ${(trend>=0?"↗ ":"↘ ")+euro(trend)}</span>
            <span class="fg-pill">OP Netto (AR−AP): ${euro(arSum - apSum)}</span>
          </div>
        </div>
        <div class="fg-status ${statusClass}">${statusText}</div>
      </div>

      <div class="fg-body">
        <div class="fg-kpis">
          <div class="fg-kpi">
            <div class="l">Kontostand (EOM)</div>
            <div class="v">${euro(last.cash)}</div>
            <div class="h">Start: ${euro(data.startCash)} · Netto: ${euro(netSum)}</div>
          </div>

          <div class="fg-kpi">
            <div class="l">Ø Net Cashflow</div>
            <div class="v">${euro(avgNet)}</div>
            <div class="h">${avgNet>=0 ? "positiver Trend" : "negativer Trend"} (Ø/Monat)</div>
          </div>

          <div class="fg-kpi">
            <div class="l">Budgetverbrauch</div>
            <div class="v">${pct1(bUsage)}</div>
            <div class="h">Ist: ${euro(b.actual)} · Plan: ${euro(b.planned)}</div>
          </div>

          <div class="fg-kpi">
            <div class="l">Fixkostenquote</div>
            <div class="v">${pct1(b.fixedShare)}</div>
            <div class="h">Fix: ${euro(b.fixed)} · Gesamt: ${euro(b.actual)}</div>
          </div>

          <div class="fg-kpi">
            <div class="l">Überfällige OP</div>
            <div class="v">${arOver + apOver}</div>
            <div class="h">AR: ${arOver} · AP: ${apOver}</div>
          </div>

          <div class="fg-kpi">
            <div class="l">Runway</div>
            <div class="v">${runway===null ? "∞" : (runway.toFixed(1).replace(".",",")+"M")}</div>
            <div class="h">nur relevant bei negativem Ø Cashflow</div>
          </div>
        </div>

        <div class="fg-bars">
          <div>
            <div class="fg-rowtitle"><span>Cash-Entwicklung</span><span>${euro(last.cash)}</span></div>
            <div class="fg-barrow">
              <span>0</span>
              <div class="fg-track">
                <div class="fg-fill blue" data-w="${clamp(cashW,0,100)}%">${pct1(cashW)} vs Start</div>
              </div>
              <span>${euro(data.startCash)}</span>
            </div>
          </div>

          <div>
            <div class="fg-rowtitle"><span>Budget-Status</span><span>${euro(b.actual)} / ${euro(b.planned)}</span></div>
            <div class="fg-barrow">
              <span>0%</span>
              <div class="fg-track">
                <div class="fg-fill ${bUsage>110 ? "orange" : (bUsage>95 ? "blue" : "green")}" data-w="${clamp(bUsage,0,100)}%">${pct1(bUsage)}</div>
              </div>
              <span>100%</span>
            </div>
          </div>
        </div>

        <div class="fg-meta">
          Rücklagen: Steuern <strong>${euro(Number(tax.current||0))}</strong> / ${euro(Number(tax.target||0))} ·
          Liquiditätspuffer <strong>${euro(Number(buf.current||0))}</strong> / ${euro(Number(buf.target||0))}
        </div>
      </div>
    `;

    requestAnimationFrame(()=>{
      rootEl.querySelectorAll(".fg-fill[data-w]").forEach(el=>{
        const w = el.getAttribute("data-w") || "0%";
        el.style.width = "0%";
        requestAnimationFrame(()=>{ el.style.width = w; });
      });
    });
  }
})();