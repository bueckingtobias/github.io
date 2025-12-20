/* finance-cashflow-modul.js
   Reads from:
   - data.financeRows (if passed)
   - OR window.IMMO_DATA.finance.cashflow
*/

(function(){
  "use strict";

  window.FinanceCashflowModul = { render };

  function render(host, data){
    const root = host.querySelector(".finance-cashflow-root") || host;
    const barsEl = root.querySelector("#fcBars");
    const rangeEl = root.querySelector("#fcRange");
    const trendEl = root.querySelector("#fcTrend");
    const avgEl = root.querySelector("#fcAvg");
    const nowEl = root.querySelector("#fcNow");
    const yMaxEl = root.querySelector("#fcYMax");
    const yMinEl = root.querySelector("#fcYMin");
    const footEl = root.querySelector("#fcFootnote");
    const legForecast = root.querySelector("#fcLegForecast");
    const trendlineEl = root.querySelector("#fcTrendline");

    const rows = pickRows(data);

    // Build series: 6 past incl current + 3 forecast = 9 points
    const series = buildSeries(rows);
    if (!series.length){
      safeText(rangeEl, "—");
      safeText(trendEl, "—");
      safeText(avgEl, "—");
      safeText(nowEl, "—");
      safeText(yMaxEl, "—");
      safeText(yMinEl, "—");
      if (barsEl) barsEl.innerHTML = `<div style="color:rgba(226,232,240,.75);font-size:12px;">Keine Cashflow-Daten.</div>`;
      return;
    }

    // Stats
    const past6 = series.filter(p => !p.isForecast);
    const nowPoint = past6[past6.length - 1];
    const avg6 = avg(past6.map(p => p.value));

    const slope = trendSlope(past6.map(p => p.value));
    const trend = slope >= 0 ? "steigend" : "sinkend";
    const fcDir = slope >= 0 ? "up" : "down";

    safeText(rangeEl, `${labelMonth(series[0].month)} – ${labelMonth(series[series.length-1].month)}`);
    safeText(trendEl, trend);
    safeText(avgEl, eur(avg6));
    safeText(nowEl, eur(nowPoint.value));
    if (legForecast) legForecast.textContent = `Forecast (3M)`;

    // Scale for chart including negatives
    const maxV = Math.max(...series.map(p => p.value), 0);
    const minV = Math.min(...series.map(p => p.value), 0);
    // Ensure some range
    const pad = Math.max(1, Math.round((maxV - minV) * 0.08));
    const top = maxV + pad;
    const bot = minV - pad;

    safeText(yMaxEl, eur(top));
    safeText(yMinEl, eur(bot));

    // Render bars (fixed 9 columns)
    if (barsEl){
      barsEl.innerHTML = "";
      series.forEach(p => {
        const bar = document.createElement("div");
        bar.className = "fc-bar" + (p.isNow ? " is-now" : "") + (p.isForecast ? ` is-forecast ${fcDir}` : "");
        bar.dataset.month = p.month;

        const stack = document.createElement("div");
        stack.className = "fc-bar-stack";

        const pos = document.createElement("span");
        pos.className = "fc-bar-pos";

        const neg = document.createElement("span");
        neg.className = "fc-bar-neg";

        // Map value to % above/below zero within [bot, top]
        // Zero line is at ratio of (top / (top - bot)) from top; but our CSS puts zero at 50%.
        // So we render relative to max(|top|,|bot|) to be symmetric.
        const A = Math.max(Math.abs(top), Math.abs(bot), 1);
        const v = p.value;
        const pct = Math.min(100, Math.max(0, Math.abs(v) / A * 50)); // 0..50 (half chart)
        if (v >= 0){
          pos.style.height = pct + "%";
          neg.style.height = "0%";
        } else {
          neg.style.height = pct + "%";
          pos.style.height = "0%";
        }

        const val = document.createElement("div");
        val.className = "fc-val";
        val.textContent = eur(p.value);

        const mon = document.createElement("div");
        mon.className = "fc-mon";
        mon.textContent = shortMon(p.month);

        stack.appendChild(pos);
        stack.appendChild(neg);
        bar.appendChild(val);
        bar.appendChild(stack);
        bar.appendChild(mon);

        barsEl.appendChild(bar);
      });
    }

    // Trendline: draw only over past6 + first forecast point (not “infinite future”)
    if (trendlineEl){
      drawTrendline(trendlineEl, series, bot, top);
    }

    // Footnote
    const nextFc = series.find(p => p.isForecast);
    if (footEl && nextFc){
      footEl.textContent =
        `Forecast wird als Trend aus den letzten 6 Monaten berechnet. Nächster Monat (Forecast): ${eur(nextFc.value)}.`;
    }
  }

  // ---------- helpers ----------

  function pickRows(data){
    // Prefer passed rows
    if (data && Array.isArray(data.financeRows) && data.financeRows.length) {
      return data.financeRows;
    }
    // Or from global normalized structure
    const g = window.IMMO_DATA && window.IMMO_DATA.finance && Array.isArray(window.IMMO_DATA.finance.cashflow)
      ? window.IMMO_DATA.finance.cashflow
      : [];
    return g;
  }

  function buildSeries(rows){
    // Expect {Monat:"YYYY-MM", Cashflow:number}
    const clean = rows
      .map(r => ({
        month: String(r.Monat || r.month || "").trim(),
        value: num(r.Cashflow)
      }))
      .filter(r => r.month && isYM(r.month))
      .sort((a,b)=> a.month.localeCompare(b.month));

    if (!clean.length) return [];

    // Determine "current" = match actual current month if present, else last row
    const nowYM = toYM(new Date());
    let idxNow = clean.findIndex(x => x.month === nowYM);
    if (idxNow < 0) idxNow = clean.length - 1;

    const start = Math.max(0, idxNow - 5);
    const past = clean.slice(start, idxNow + 1); // 6 incl current (or fewer if not enough)
    const past6 = past.slice(-6);

    // Forecast 3 from past6 trend (linear over index)
    const vals = past6.map(p => p.value);
    const slope = trendSlope(vals);
    const last = vals[vals.length - 1];

    const fc = [];
    for (let i=1;i<=3;i++){
      fc.push({
        month: addMonths(past6[past6.length-1].month, i),
        value: Math.round(last + slope * i),
        isForecast: true
      });
    }

    // merge + flags
    const series = past6.map((p,i)=>({
      month: p.month,
      value: p.value,
      isForecast: false,
      isNow: i === past6.length - 1
    })).concat(fc.map(p=>({ ...p, isNow:false })));

    // Keep 9 points exactly if possible
    return series.slice(0, 9);
  }

  function drawTrendline(container, series, bot, top){
    container.innerHTML = "";

    // points only for: past points + first forecast point (so it doesn't run too far)
    const pts = series.filter(p => !p.isForecast).concat(series.filter(p => p.isForecast).slice(0,1));
    if (pts.length < 2) return;

    // We'll place small dots at bar centers. Use container width via percentages based on index.
    const A = Math.max(Math.abs(top), Math.abs(bot), 1);

    pts.forEach((p, i) => {
      const idx = series.findIndex(s => s.month === p.month && s.isForecast === p.isForecast);
      const xPct = (idx + 0.5) / series.length * 100;

      // Map v to y within container: 50% is zero.
      const v = p.value;
      const yPct = 50 - (v / A * 50); // positive -> up
      const dot = document.createElement("div");
      dot.style.position = "absolute";
      dot.style.left = `calc(${xPct}% - 3px)`;
      dot.style.top = `calc(${yPct}% - 3px)`;
      dot.style.width = "6px";
      dot.style.height = "6px";
      dot.style.borderRadius = "999px";
      dot.style.background = "rgba(226,232,240,.85)";
      dot.style.boxShadow = "0 2px 8px rgba(0,0,0,.35)";
      container.appendChild(dot);

      if (i > 0){
        const prev = pts[i-1];
        const prevIdx = series.findIndex(s => s.month === prev.month && s.isForecast === prev.isForecast);
        const x1 = (prevIdx + 0.5) / series.length * 100;
        const y1 = 50 - (prev.value / A * 50);

        const seg = document.createElement("div");
        seg.style.position = "absolute";
        seg.style.left = `calc(${Math.min(x1, xPct)}% )`;
        seg.style.top = `calc(${Math.min(y1, yPct)}% )`;
        seg.style.width = `${Math.abs(xPct - x1)}%`;
        seg.style.height = `${Math.abs(yPct - y1)}%`;
        seg.style.borderTop = "2px solid rgba(226,232,240,.65)";
        // Diagonal with transform trick:
        const dx = (xPct - x1);
        const dy = (yPct - y1);
        const len = Math.sqrt(dx*dx + dy*dy);
        seg.style.width = `${len}%`;
        seg.style.height = "0px";
        seg.style.transformOrigin = "0 0";
        seg.style.transform = `translate(${x1}%, ${y1}%) rotate(${Math.atan2(dy, dx)}rad)`;
        seg.style.borderTop = "2px solid rgba(226,232,240,.55)";
        seg.style.left = "0";
        seg.style.top = "0";
        container.appendChild(seg);
      }
    });
  }

  function eur(v){
    const n = Math.round(num(v));
    return new Intl.NumberFormat("de-DE",{ style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(n);
  }
  function num(v){
    if (typeof v === "number") return isFinite(v) ? v : 0;
    if (v == null) return 0;
    const s = String(v).trim();
    if (!s) return 0;
    return Number(s.replace(/\./g,"").replace(",", ".")) || 0;
  }
  function avg(arr){ return arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length) : 0; }
  function trendSlope(vals){
    // simple linear regression slope over index
    const n = vals.length;
    if (n < 2) return 0;
    let sx=0, sy=0, sxy=0, sx2=0;
    for (let i=0;i<n;i++){
      const x=i, y=vals[i];
      sx+=x; sy+=y; sxy+=x*y; sx2+=x*x;
    }
    const denom = (n*sx2 - sx*sx);
    if (!denom) return 0;
    return (n*sxy - sx*sy)/denom;
  }
  function isYM(s){ return /^\d{4}-\d{2}$/.test(s); }
  function toYM(d){
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }
  function addMonths(ym, add){
    const [y,m]=ym.split("-").map(Number);
    const d = new Date(y, m-1 + add, 1);
    return toYM(d);
  }
  function shortMon(ym){
    const [y,m]=ym.split("-").map(Number);
    const d = new Date(y, m-1, 1);
    return d.toLocaleDateString("de-DE",{ month:"short" }).replace(".","");
  }
  function labelMonth(ym){
    const [y,m]=ym.split("-").map(Number);
    const d = new Date(y, m-1, 1);
    return d.toLocaleDateString("de-DE",{ month:"long", year:"numeric" });
  }
  function safeText(el, txt){ if (el) el.textContent = txt; }
})();
