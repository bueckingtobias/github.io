/* finance-cashflow-modul.js */
(function(){
  "use strict";

  window.FinanceCashflowModul = { render };

  function render(host, data){
    if(!host) return;

    // Resolve rows: prefer IMMO_DATA.finance.cashflow, then passed-in data
    const rows =
      (Array.isArray(window.IMMO_DATA?.finance?.cashflow) && window.IMMO_DATA.finance.cashflow) ||
      (Array.isArray(data?.cashflowRows) && data.cashflowRows) ||
      (Array.isArray(data?.financeRows) && data.financeRows) ||
      [];

    const root = host.querySelector(".fc-root") || host;
    const barsEl = root.querySelector("#fcBars");
    const badgesEl = root.querySelector("#fcBadges");

    if(!barsEl){
      // If HTML not injected properly
      host.textContent = "finance-cashflow-modul.html fehlt oder wurde nicht geladen.";
      return;
    }

    // Normalize + sort by month (YYYY-MM)
    const series = rows
      .map(r => ({
        Monat: String(r.Monat || "").trim(),
        Cashflow: toNum(r.Cashflow),
        Einnahmen: toNum(r.Einnahmen),
        Ausgaben: toNum(r.Ausgaben)
      }))
      .filter(r => isYM(r.Monat))
      .sort((a,b)=> a.Monat.localeCompare(b.Monat));

    if(series.length === 0){
      renderEmpty(root, "Keine Cashflow-Daten gefunden. Prüfe window.IMMO_DATA.finance.cashflow.");
      return;
    }

    // We use last entry as "current month" (your master produces 12 ending current)
    const current = series[series.length - 1];
    const past6 = series.slice(Math.max(0, series.length - 6)); // incl current

    // Forecast 3 months using linear trend from past6 Cashflow
    const forecast = buildForecast(past6, 3);

    // Combine (6 past + 3 forecast = 9)
    const combined = past6.concat(forecast);

    // Determine trend direction from past6
    const slope = trendSlope(past6.map(x => x.Cashflow));
    const trendUp = slope >= 0;

    // UI meta
    const rangeEl = root.querySelector("#fcRange");
    const trendEl = root.querySelector("#fcTrend");
    const avgEl   = root.querySelector("#fcAvg");
    const nowEl   = root.querySelector("#fcNow");
    const yMaxEl  = root.querySelector("#fcYMax");
    const yMinEl  = root.querySelector("#fcYMin");
    const noteEl  = root.querySelector("#fcNote");
    const lineSvg = root.querySelector("#fcLine");
    const linePath= root.querySelector("#fcLinePath");
    const lineDots= root.querySelector("#fcLineDots");

    const firstMonth = combined[0].Monat;
    const lastMonth  = combined[combined.length - 1].Monat;

    if(rangeEl) rangeEl.textContent = `${fmtYM(firstMonth)} – ${fmtYM(lastMonth)}`;
    if(trendEl) trendEl.textContent = trendUp ? "steigend" : "fallend";
    if(avgEl) avgEl.textContent = fmtEuro(Math.round(avg(past6.map(x=>x.Cashflow))));
    if(nowEl) nowEl.textContent = fmtEuro(current.Cashflow);

    // Badges (top right)
    if(badgesEl){
      badgesEl.innerHTML = "";
      badgesEl.appendChild(badge(`Aktuell: ${fmtEuro(current.Cashflow)}`));
      badgesEl.appendChild(badge(`Ø6M: ${fmtEuro(Math.round(avg(past6.map(x=>x.Cashflow))))}`));
      badgesEl.appendChild(badge(`Forecast: ${trendUp ? "grün" : "rot"} (3M)`));
    }

    // Build chart scaling with 0 centerline
    const vals = combined.map(x => x.Cashflow);
    const maxAbs = Math.max(1, ...vals.map(v => Math.abs(v)));
    // add headroom
    const scaleMax = maxAbs * 1.12;

    if(yMaxEl) yMaxEl.textContent = fmtEuro(Math.round(scaleMax));
    if(yMinEl) yMinEl.textContent = fmtEuro(-Math.round(scaleMax));

    // Render bars
    barsEl.innerHTML = "";
    const barRects = []; // for trend line points

    combined.forEach((r, idx) => {
      const isForecast = idx >= past6.length;
      const isNow = !isForecast && r.Monat === current.Monat;

      const col = document.createElement("div");
      col.className = "fc-col";

      const wrap = document.createElement("div");
      wrap.className = "fc-barwrap";

      const zero = document.createElement("div");
      zero.className = "fc-zero";
      wrap.appendChild(zero);

      const bar = document.createElement("div");
      bar.className = "fc-bar";

      // Class & color
      if(isNow) bar.classList.add("now");
      else if(isForecast) bar.classList.add(trendUp ? "fore-up" : "fore-down");
      else bar.classList.add("past");

      // Compute position/height relative to center (0)
      const v = r.Cashflow;
      const pct = Math.min(1, Math.abs(v) / scaleMax);

      // plot area height = wrap height. We use CSS positioning: top/bottom with center at 50%
      // positive: grow upward from center. negative: grow downward from center.
      const half = 50;
      const hPct = pct * half;

      if(v >= 0){
        bar.style.bottom = "50%";
        bar.style.top = (50 - hPct) + "%";
      } else {
        bar.style.top = "50%";
        bar.style.bottom = (50 - hPct) + "%";
      }

      // Value label
      const val = document.createElement("div");
      val.className = "fc-val";
      val.textContent = fmtEuro(v);
      bar.appendChild(val);

      wrap.appendChild(bar);

      const m = document.createElement("div");
      m.className = "fc-month";
      m.textContent = shortYM(r.Monat);

      col.appendChild(wrap);
      col.appendChild(m);
      barsEl.appendChild(col);

      // Store rect info for trend line later (we'll compute using equal spacing in SVG)
      barRects.push({ value: v, idx });
    });

    // Trend line in SVG (only across the 9 bars)
    if(lineSvg && linePath && lineDots){
      const W = 1000;
      const H = 360;

      // Map values to y in [0..H], with 0 at H/2, scaleMax at top, -scaleMax at bottom
      const y = (v) => {
        const t = v / scaleMax; // -1..1
        return (H/2) - (t * (H/2));
      };

      // x positions equally spaced, at center of each bar
      const n = barRects.length;
      const padX = 30;
      const span = W - padX*2;
      const step = n > 1 ? (span / (n - 1)) : 0;

      const pts = barRects.map((p,i)=>{
        const xx = padX + step*i;
        const yy = clamp(y(p.value), 0, H);
        return [xx, yy];
      });

      const pointsStr = pts.map(([xx,yy]) => `${xx.toFixed(1)},${yy.toFixed(1)}`).join(" ");
      linePath.setAttribute("points", pointsStr);

      // Color line according to forecast direction
      const stroke = trendUp ? "rgba(34,197,94,.95)" : "rgba(239,68,68,.95)";
      linePath.setAttribute("stroke", stroke);

      // Dots
      lineDots.innerHTML = "";
      pts.forEach(([xx,yy], i)=>{
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", xx.toFixed(1));
        c.setAttribute("cy", yy.toFixed(1));
        c.setAttribute("r", i === (past6.length - 1) ? "6" : "4"); // current point slightly larger
        c.setAttribute("fill", i === (past6.length - 1) ? "rgba(59,130,246,1)" : stroke);
        c.setAttribute("opacity", i >= past6.length ? "0.9" : "0.75");
        lineDots.appendChild(c);
      });
    }

    // Note
    if(noteEl){
      const next = forecast[0]?.Cashflow;
      noteEl.textContent =
        `Forecast wird als Trend aus den letzten 6 Monaten berechnet. Nächster Monat (Forecast): ${fmtEuro(next)}.`;
    }
  }

  // -------- helpers --------

  function renderEmpty(root, msg){
    const note = root.querySelector("#fcNote");
    if(note) note.textContent = msg;
    const bars = root.querySelector("#fcBars");
    if(bars){
      bars.innerHTML = "";
      const box = document.createElement("div");
      box.style.padding = "12px";
      box.style.fontSize = "12px";
      box.style.color = "rgba(226,232,240,.78)";
      box.textContent = msg;
      bars.appendChild(box);
    }
  }

  function buildForecast(past, n){
    if(!past || past.length === 0) return [];
    const last = past[past.length - 1];
    const slope = trendSlope(past.map(x=>x.Cashflow));
    const out = [];
    for(let i=1;i<=n;i++){
      const month = addMonths(last.Monat, i);
      const val = Math.round(last.Cashflow + slope*i);
      out.push({ Monat: month, Cashflow: val, Einnahmen: 0, Ausgaben: 0, __forecast:true });
    }
    return out;
  }

  function trendSlope(values){
    // simple linear slope between first and last over (len-1)
    if(!values || values.length < 2) return 0;
    const first = values[0];
    const last  = values[values.length - 1];
    return (last - first) / (values.length - 1);
  }

  function addMonths(ymStr, add){
    const [y,m] = ymStr.split("-").map(x=>parseInt(x,10));
    const d = new Date(y, (m - 1) + add, 1);
    const yy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,"0");
    return `${yy}-${mm}`;
  }

  function isYM(s){
    return /^\d{4}-\d{2}$/.test(String(s||""));
  }

  function shortYM(ymStr){
    // "2025-12" -> "Dez"
    const [y,m] = ymStr.split("-");
    const d = new Date(parseInt(y,10), parseInt(m,10)-1, 1);
    return d.toLocaleString("de-DE", { month:"short" }).replace(".", "");
  }

  function fmtYM(ymStr){
    const [y,m] = ymStr.split("-");
    const d = new Date(parseInt(y,10), parseInt(m,10)-1, 1);
    const mon = d.toLocaleString("de-DE", { month:"long" });
    return `${mon} ${y}`;
  }

  function avg(arr){
    if(!arr || arr.length===0) return 0;
    return arr.reduce((a,b)=>a+b,0)/arr.length;
  }

  function fmtEuro(v){
    const n = Number(v || 0);
    return new Intl.NumberFormat("de-DE",{ style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(n);
  }

  function toNum(v){
    if(typeof v === "number") return isFinite(v) ? v : 0;
    if(v == null) return 0;
    const s = String(v).trim();
    if(!s) return 0;
    return Number(s.replace(/\./g,"").replace(",", ".")) || 0;
  }

  function badge(text){
    const b = document.createElement("div");
    b.className = "fc-badge";
    b.textContent = text;
    return b;
  }

  function clamp(x,min,max){ return Math.max(min, Math.min(max, x)); }
})();