(function(){
  function toNumber(x){
    if(x == null || x === "") return 0;
    if(typeof x === "number" && isFinite(x)) return x;
    const s = String(x).replace(/\s/g,"").replace(/€/g,"").replace(/\./g,"").replace(",",".").replace(/[^\d.-]/g,"");
    const n = Number(s);
    return isFinite(n) ? n : 0;
  }

  function formatEuro(v){
    const n = Number(v);
    return new Intl.NumberFormat("de-DE",{ style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(isFinite(n)?n:0);
  }
  function formatPct(v){
    const n = Number(v);
    if(!isFinite(n)) return "0,0 %";
    return (Math.round(n*10)/10).toFixed(1).replace(".", ",") + " %";
  }

  function clamp(n,a,b){ n=Number(n); if(!isFinite(n)) n=0; return Math.max(a,Math.min(b,n)); }

  function pickRowValue(rows, kpiName){
    const r = rows.find(x => String(x.KPI||"").trim() === kpiName);
    if(!r) return { value:0, unit:"", comment:"" };
    return {
      value: toNumber(r.Wert),
      unit: String(r.Einheit||""),
      comment: String(r.Kommentar||"")
    };
  }

  function buildSeriesFromFinance(finance, key){
    const rows = Array.isArray(finance) ? finance : [];
    const vals = rows.slice(-6).map(r => toNumber(r[key]));
    while(vals.length < 6) vals.unshift(0);

    const last3 = vals.slice(-3);
    const slope = (last3[2] - last3[0]) / 2;
    const f1 = Math.max(0, last3[2] + slope);
    const f2 = Math.max(0, f1 + slope);
    const f3 = Math.max(0, f2 + slope);

    return vals.concat([f1,f2,f3]);
  }

  function buildStableSeries(value){
    const base = Math.max(1, Number(value)||0);
    return [0.92,0.97,0.94,1.00,0.98,1.02,1.03,1.04,1.05].map(m => base*m);
  }

  function renderChart(el, series){
    const max = Math.max(1, ...series);
    el.innerHTML = "";
    series.forEach((v, i)=>{
      const bar = document.createElement("div");
      bar.className = "kpi6-bar";
      const fill = document.createElement("div");
      fill.className = "kpi6-fill" + (i >= 6 ? " forecast" : "");
      const pct = clamp((v/max)*100, 0, 100);
      requestAnimationFrame(()=> fill.style.height = pct + "%");
      bar.appendChild(fill);
      el.appendChild(bar);
    });
  }

  function render(container, data){
    const root = container.querySelector("[data-kpi6-root]") || container;
    const grid = root.querySelector("[data-kpi6-grid]") || root;

    const homeKpis = (data && Array.isArray(data.homeKpis)) ? data.homeKpis : [];
    const finance  = (data && Array.isArray(data.finance)) ? data.finance : [];

    // ✅ 6 KPIs (2×3)
    // Hinweis: Für "Pachteinnahmen pro Monat" liest das Modul:
    // - Home_KPIs KPI Zeile "Pachteinnahmen pro Monat"
    // - Finance Spalte "Pachteinnahmen" (falls vorhanden), sonst stable series.
    const defs = [
      { name:"Monats-Cashflow", fmt:formatEuro, unit:"EUR", seriesKey:"Cashflow" },
      { name:"Jahres-Cashflow", fmt:formatEuro, unit:"EUR", seriesKey:"Cashflow" },
      { name:"Mieteinnahmen pro Monat", fmt:formatEuro, unit:"EUR", seriesKey:"Mieteinnahmen" },
      { name:"Pachteinnahmen pro Monat", fmt:formatEuro, unit:"EUR", seriesKey:"Pachteinnahmen" },
      { name:"Auslastung der Wohnungen", fmt:formatPct, unit:"%", seriesKey:null },
      { name:"Portfolio ROI", fmt:formatPct, unit:"%", seriesKey:null },
    ];

    grid.innerHTML = "";

    defs.forEach(def=>{
      const info = pickRowValue(homeKpis, def.name);
      const val = info.value;

      const card = document.createElement("div");
      card.className = "kpi6-card";

      const head = document.createElement("div");
      head.className = "kpi6-head";

      const left = document.createElement("div");
      left.style.minWidth = "0";

      const title = document.createElement("div");
      title.className = "kpi6-title";
      title.textContent = def.name;

      const sub = document.createElement("div");
      sub.className = "kpi6-sub";
      sub.textContent = info.comment || "6 Monate Rückblick · 3 Monate Forecast";

      left.appendChild(title);
      left.appendChild(sub);

      const badge = document.createElement("div");
      badge.className = "kpi6-badge";
      badge.textContent = "6M + 3M";

      head.appendChild(left);
      head.appendChild(badge);

      const body = document.createElement("div");
      body.className = "kpi6-body";

      const value = document.createElement("div");
      value.className = "kpi6-value";
      value.textContent = def.fmt(val);

      const meta = document.createElement("div");
      meta.className = "kpi6-meta";
      meta.innerHTML = `<span>Rückblick</span><span>Forecast</span>`;

      const chart = document.createElement("div");
      chart.className = "kpi6-chart";

      let series;
      if(def.seriesKey){
        const hasKey = finance.some(r => Object.prototype.hasOwnProperty.call(r, def.seriesKey));
        series = hasKey ? buildSeriesFromFinance(finance, def.seriesKey) : buildStableSeries(val);
      }else{
        series = buildStableSeries(val);
      }

      renderChart(chart, series);

      const foot = document.createElement("div");
      foot.className = "kpi6-foot";
      foot.innerHTML = `<span>letzte 6</span><span>nächste 3</span>`;

      body.appendChild(value);
      body.appendChild(meta);
      body.appendChild(chart);
      body.appendChild(foot);

      card.appendChild(head);
      card.appendChild(body);

      grid.appendChild(card);
    });
  }

  window.HomeKpisModul = { render };
})();
