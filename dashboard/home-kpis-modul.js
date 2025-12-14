(function(){

  function toNumber(x){
    if(x == null || x === "") return 0;
    if(typeof x === "number") return x;
    const s = String(x).replace(/\s/g,"").replace(/€/g,"").replace(/\./g,"").replace(",",".").replace(/[^\d.-]/g,"");
    const n = Number(s);
    return isFinite(n) ? n : 0;
  }

  function formatEuro(v){
    return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0})
      .format(toNumber(v));
  }
  function formatPct(v){
    const n = toNumber(v);
    return n.toFixed(1).replace(".",",") + " %";
  }

  function clamp(n){ return Math.max(0, Math.min(100, n)); }

  function buildSeriesFromFinance(finance, key){
    const rows = Array.isArray(finance) ? finance : [];
    const vals = rows.slice(-6).map(r => toNumber(r[key]));
    while(vals.length < 6) vals.unshift(0);

    const last = vals[vals.length - 1];
    const prev = vals[vals.length - 2] ?? last;
    const trend = last - prev;

    const f1 = Math.max(0, last + trend);
    const f2 = Math.max(0, f1 + trend);
    const f3 = Math.max(0, f2 + trend);

    return vals.concat([f1,f2,f3]);
  }

  function buildFlatSeries(v){
    const base = Math.max(1, toNumber(v));
    return Array(9).fill(base);
  }

  function renderChart(el, series){
    const max = Math.max(1, ...series);
    const currentIndex = 5; // 0–4 Vergangenheit, 5 = aktueller Monat

    el.innerHTML = "";

    const forecastTrend =
      series[8] > series[5] ? "up" :
      series[8] < series[5] ? "down" : "flat";

    series.forEach((v, i)=>{
      const bar = document.createElement("div");
      bar.className = "kpi6-bar";

      const fill = document.createElement("div");
      fill.className = "kpi6-fill";

      // ===== Farb-Logik =====
      if(i < currentIndex){
        fill.classList.add("kpi-past");
      }else if(i === currentIndex){
        fill.classList.add("kpi-current");
      }else{
        fill.classList.add(forecastTrend === "down" ? "kpi-future-down" : "kpi-future-up");
      }

      const h = clamp((v / max) * 100);
      requestAnimationFrame(()=> fill.style.height = h + "%");

      bar.appendChild(fill);
      el.appendChild(bar);
    });
  }

  function pick(home, name){
    const r = home.find(x => String(x.KPI||"").trim() === name);
    return r ? { value: toNumber(r.Wert), comment: String(r.Kommentar||"") } : { value:0, comment:"" };
  }

  function render(container, data){
    const root = container.querySelector("[data-kpi6-root]") || container;
    const grid = root.querySelector("[data-kpi6-grid]") || root;

    const home = Array.isArray(data?.homeKpis) ? data.homeKpis : [];
    const finance = Array.isArray(data?.finance) ? data.finance : [];

    const defs = [
      { name:"Monats-Cashflow", fmt:formatEuro, key:"Cashflow" },
      { name:"Jahres-Cashflow", fmt:formatEuro, key:"Cashflow" },
      { name:"Mieteinnahmen pro Monat", fmt:formatEuro, key:"Mieteinnahmen" },
      { name:"Pachteinnahmen pro Monat", fmt:formatEuro, key:"Pachteinnahmen" },
      { name:"Auslastung der Wohnungen", fmt:formatPct, key:null },
      { name:"Portfolio ROI", fmt:formatPct, key:null },
    ];

    grid.innerHTML = "";

    defs.forEach(def=>{
      const info = pick(home, def.name);

      const card = document.createElement("div");
      card.className = "kpi6-card";

      card.innerHTML = `
        <div class="kpi6-head">
          <div>
            <div class="kpi6-title">${def.name}</div>
            <div class="kpi6-sub">${info.comment || "6 Monate Rückblick · 3 Monate Forecast"}</div>
          </div>
          <div class="kpi6-badge">6M + 3M</div>
        </div>
        <div class="kpi6-body">
          <div class="kpi6-value">${def.fmt(info.value)}</div>
          <div class="kpi6-chart"></div>
          <div class="kpi6-foot"><span>Vergangenheit</span><span>Zukunft</span></div>
        </div>
      `;

      const chart = card.querySelector(".kpi6-chart");
      const series = def.key
        ? buildSeriesFromFinance(finance, def.key)
        : buildFlatSeries(info.value);

      renderChart(chart, series);
      grid.appendChild(card);
    });
  }

  window.HomeKpisModul = { render };
})();
