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

  function buildSeriesFromFinance(finance, key){
    const rows = Array.isArray(finance) ? finance : [];
    const vals = rows.slice(-6).map(r => toNumber(r[key]));
    while(vals.length < 6) vals.unshift(0);

    const last3 = vals.slice(-3);
    const slope = (last3[2] - last3[0]) / 2;
    const f1 = Math.max(0, last3[2] + slope);
    const f2 = Math.max(0, f1 + slope);
    const f3 = Math.max(0, f2 + slope);

    return vals.concat([f1,f2,f3]); // 9 Werte
  }

  function buildStableSeries(value){
    const base = Math.max(1, Number(value)||0);
    return [0.92,0.97,0.94,1.00,0.98,1.02,1.03,1.04,1.05].map(m => base*m);
  }

  function renderChart(el, series){
    const max = Math.max(1, ...series);
    el.innerHTML = "";

    series.forEach((v)=>{
      const bar = document.createElement("div");
      bar.className = "hk-bar";
      const fill = document.createElement("div");
      fill.className = "hk-fill";

      const pct = clamp((v/max)*100, 0, 100);
      requestAnimationFrame(()=> fill.style.height = pct + "%");

      bar.appendChild(fill);
      el.appendChild(bar);
    });
  }

  function render(container, data){
    const root = container.querySelector("[data-hk-root]") || container;
    const grid = root.querySelector("[data-hk-grid]") || root;

    const homeKpis = (data && Array.isArray(data.homeKpis)) ? data.homeKpis : [];
    const finance = (data && Array.isArray(data.finance)) ? data.finance : [];

    const map = new Map();
    homeKpis.forEach(r=>{
      const k = String(r.KPI || "").trim();
      if(!k) return;
      map.set(k, {
        value: toNumber(r.Wert),
        unit: String(r.Einheit || ""),
        comment: String(r.Kommentar || "")
      });
    });

    const defs = [
      { key:"Monats-Cashflow", unit:"EUR", fmt:formatEuro, seriesKey:"Cashflow" },
      { key:"Jahres-Cashflow", unit:"EUR", fmt:formatEuro, seriesKey:"Cashflow" },
      { key:"Mieteinnahmen pro Monat", unit:"EUR", fmt:formatEuro, seriesKey:"Mieteinnahmen" },
      { key:"Auslastung der Wohnungen", unit:"%", fmt:formatPct, seriesKey:null },
      { key:"Portfolio ROI", unit:"%", fmt:formatPct, seriesKey:null },
    ];

    grid.innerHTML = "";

    defs.forEach(def=>{
      const info = map.get(def.key) || { value:0, unit:def.unit, comment:"" };

      const card = document.createElement("div");
      card.className = "hk-card";

      const top = document.createElement("div");
      top.className = "hk-top";

      const k = document.createElement("div");
      k.className = "hk-k";
      k.textContent = def.key;

      const pill = document.createElement("div");
      pill.className = "hk-pill";
      pill.textContent = "6M + 3M";

      top.appendChild(k);
      top.appendChild(pill);

      const v = document.createElement("div");
      v.className = "hk-v";
      v.textContent = def.fmt(info.value);

      const s = document.createElement("div");
      s.className = "hk-s";
      s.textContent = info.comment || "Rückblick (6) · Forecast (3)";

      const divider = document.createElement("div");
      divider.className = "hk-divider";

      const chart = document.createElement("div");
      chart.className = "hk-chart";

      const series = def.seriesKey ? buildSeriesFromFinance(finance, def.seriesKey) : buildStableSeries(info.value);
      renderChart(chart, series);

      const foot = document.createElement("div");
      foot.className = "hk-foot";
      foot.innerHTML = `<span>Rückblick</span><span>Forecast</span>`;

      card.appendChild(top);
      card.appendChild(v);
      card.appendChild(s);
      card.appendChild(divider);
      card.appendChild(chart);
      card.appendChild(foot);

      grid.appendChild(card);
    });
  }

  window.HomeKpisModul = { render };
})();
