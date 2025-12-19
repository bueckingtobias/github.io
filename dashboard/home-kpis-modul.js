/* home-kpis-modul.js
   Reads: window.IMMO_DATA.home
   Exposes: window.HomeKpisModul.render(host)
   Window: 6 past + current + 3 forecast = 10
*/
(function(){
  window.HomeKpisModul = { render };

  function render(host){
    if(!host) return;

    const raw = Array.isArray(window.IMMO_DATA?.home) ? window.IMMO_DATA.home : [];
    const grid = host.querySelector("#hkpiGrid");
    const note = host.querySelector("#hkpiNote");

    if(!grid){
      host.innerHTML = `<div style="padding:12px;font-size:12px;color:rgba(226,232,240,.78)">home-kpis-modul: #hkpiGrid fehlt in HTML.</div>`;
      return;
    }

    const series = normalizeHomeRows(raw); // sorted by Monat
    if(series.length === 0){
      grid.innerHTML = "";
      if(note) note.textContent = "Keine KPI-Daten gefunden (window.IMMO_DATA.home ist leer).";
      return;
    }

    // Build exact window: 6 past + current + 3 future
    const window10 = buildWindowWithForecast(series);
    const nowYM = getCurrentYM();

    const kpis = [
      { label:"Monats-Cashflow",      unit:"€",  key:"Cashflow",         isPercent:false,
        valueFn: r => num(r.Cashflow), fmt: v => fmtEUR(v) },

      { label:"Jahres-Cashflow",      unit:"€",  key:"JahresCashflow",   isPercent:false,
        valueFn: (_, idx, arr) => {
          const start = Math.max(0, idx - 11);
          let sum = 0;
          for(let i=start;i<=idx;i++) sum += num(arr[i].Cashflow);
          return sum;
        }, fmt: v => fmtEUR(v) },

      { label:"Mieteinnahmen pro Monat", unit:"€", key:"Mieteinnahmen",  isPercent:false,
        valueFn: r => num(r.Mieteinnahmen), fmt: v => fmtEUR(v) },

      { label:"Pachteinnahmen pro Monat", unit:"€", key:"Pachteinnahmen", isPercent:false,
        valueFn: r => num(r.Pachteinnahmen), fmt: v => fmtEUR(v) },

      { label:"Auslastung Wohnungen", unit:"%", key:"Auslastung",        isPercent:true,
        valueFn: r => num(r["Auslastung_%"]), fmt: v => fmtPct(v) },

      { label:"Portfolio ROI",        unit:"%", key:"ROI",               isPercent:true,
        valueFn: r => {
          const wert = num(r.Portfolio_Wert);
          const inv  = num(r.Investiertes_Kapital);
          if(inv <= 0) return 0;
          return (wert - inv) / inv * 100;
        }, fmt: v => fmtPct(v) },
    ];

    grid.innerHTML = "";

    // For each KPI we forecast its own series for last 3 bars (if future rows are synthetic, values already there;
    // still we compute direction from current -> last forecast)
    kpis.forEach(k => {
      const card = document.createElement("div");
      card.className = "hkpi-card";
      card.innerHTML = `
        <div class="hkpi-cardhead">
          <div style="min-width:0">
            <div class="hkpi-name">${escapeHtml(k.label)}</div>
            <div class="hkpi-delta" data-delta></div>
          </div>
          <div class="hkpi-meta">${escapeHtml(window10[window10.length-1].Monat)}</div>
        </div>

        <div class="hkpi-value" data-value>—</div>

        <div class="hkpi-chart">
          <div class="hkpi-trend" data-trend></div>
          <div class="hkpi-bars" data-bars></div>
          <div class="hkpi-xlabels" data-x></div>
        </div>
      `;

      const valEl   = card.querySelector("[data-value]");
      const deltaEl = card.querySelector("[data-delta]");
      const barsEl  = card.querySelector("[data-bars]");
      const xEl     = card.querySelector("[data-x]");
      const trendEl = card.querySelector("[data-trend]");

      const values = window10.map((r, idx) => k.valueFn(r, idx, window10));

      // current month index in window (should be 6)
      const idxCurrent = window10.findIndex(r => r.Monat === nowYM);
      const currentIdx = (idxCurrent >= 0) ? idxCurrent : 6;

      const lastIdx = values.length - 1;
      const lastVal = values[lastIdx];
      const prevVal = values.length >= 2 ? values[lastIdx - 1] : 0;
      const delta = lastVal - prevVal;

      valEl.textContent = k.fmt(values[currentIdx] ?? values[values.length-4] ?? lastVal);
      deltaEl.textContent = `Δ zum Vormonat: ${k.isPercent ? fmtPct(delta) : fmtEUR(delta)}`;

      // Forecast direction from current -> last forecast (3 months)
      const currentVal = values[currentIdx] ?? 0;
      const lastFcVal  = values[lastIdx] ?? 0;
      const dir = (lastFcVal > currentVal + tinyEps(currentVal)) ? "up"
                : (lastFcVal < currentVal - tinyEps(currentVal)) ? "down"
                : "flat";

      // scaling
      const mm = getMinMax(values, k.isPercent);
      const scale = makeScaler(mm.min, mm.max);

      // bars
      barsEl.innerHTML = "";
      xEl.innerHTML = "";
      const barNodes = [];

      for(let i=0;i<window10.length;i++){
        const ym = window10[i].Monat;
        const v  = values[i];

        const cls = barClass(ym, nowYM, dir);
        const bar = document.createElement("div");
        bar.className = `hkpi-bar ${cls}`;
        bar.innerHTML = `<i></i><div class="hkpi-barlabel">${k.isPercent ? fmtPct(v) : shortEUR(v)}</div>`;
        barsEl.appendChild(bar);
        barNodes.push(bar);

        const lbl = document.createElement("span");
        lbl.textContent = formatYMShort(ym);
        xEl.appendChild(lbl);
      }

      requestAnimationFrame(() => {
        for(let i=0;i<barNodes.length;i++){
          const h = clamp(scale(values[i]) * 100, 0, 100);
          barNodes[i].querySelector("i").style.height = h.toFixed(2) + "%";
        }
      });

      // Trendline only across these 10 bars, clipped (no overhang)
      renderTrendline(trendEl, values, k.isPercent);

      grid.appendChild(card);
    });

    if(note){
      const from = window10[0].Monat;
      const to   = window10[window10.length-1].Monat;
      note.textContent = `Zeitraum: ${from} → ${to} (6 Rückblick + aktuell + 3 Forecast).`;
    }
  }

  /* ---------------- Window builder with 3M forecast ---------------- */

  function buildWindowWithForecast(series){
    // We take last 7 actual months ending at current month (if present).
    // Then create 3 synthetic future months with per-field forecast (simple linear regression on last 6 actual points).
    const nowYM = getCurrentYM();

    // Ensure we have an anchor "current" point:
    // - if series contains nowYM, use it
    // - else use last month in series as "current"
    let anchorIdx = series.findIndex(r => r.Monat === nowYM);
    if(anchorIdx < 0) anchorIdx = series.length - 1;

    const endActual = series.slice(0, anchorIdx + 1);
    // Need 7 points: 6 past + current
    const actual7 = endActual.length >= 7 ? endActual.slice(endActual.length - 7) : padLeftTo7(endActual);

    const lastActualYM = actual7[actual7.length - 1].Monat;
    const ymsFuture = nextMonths(lastActualYM, 3);

    // Forecast each numeric field we need
    const fields = ["Cashflow","Mieteinnahmen","Pachteinnahmen","Auslastung_%","Portfolio_Wert","Investiertes_Kapital"];

    const forecastRows = ymsFuture.map((ym, step) => {
      const base = { Monat: ym };

      fields.forEach(f => {
        const xs = [];
        const ys = [];
        // regression on last up to 6 actual points (exclude padding empties)
        const points = actual7.filter(r => r && r.__pad !== true).slice(-6);
        points.forEach((r,i) => {
          xs.push(i+1);
          ys.push(num(r[f]));
        });

        const predicted = (xs.length >= 2)
          ? linRegPredict(xs, ys, xs.length + (step+1))
          : (ys.length ? ys[ys.length-1] : 0);

        // clamp for percent field
        base[f] = (f === "Auslastung_%") ? clamp(predicted, 0, 100) : predicted;
      });

      return base;
    });

    // Merge to 10 bars
    const window10 = actual7.map(stripPad).concat(forecastRows);
    // Force length 10
    return window10.slice(window10.length - 10);
  }

  function padLeftTo7(arr){
    // if fewer than 7 months, pad at left with synthetic months at same values (so layout stable)
    const out = arr.slice();
    while(out.length < 7){
      const first = out[0] || { Monat: getCurrentYM() };
      const prevYM = prevMonth(first.Monat);
      out.unshift({ ...cloneRow(first), Monat: prevYM, __pad:true });
    }
    return out;
  }

  function stripPad(r){
    if(!r) return r;
    const c = cloneRow(r);
    delete c.__pad;
    return c;
  }

  function cloneRow(r){
    return JSON.parse(JSON.stringify(r || {}));
  }

  function nextMonths(ym, n){
    const out = [];
    let cur = ym;
    for(let i=0;i<n;i++){
      cur = addMonths(cur, 1);
      out.push(cur);
    }
    return out;
  }

  function prevMonth(ym){
    return addMonths(ym, -1);
  }

  function addMonths(ym, delta){
    const [y,m] = ym.split("-").map(Number);
    const d = new Date(y, (m-1) + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }

  function linRegPredict(xs, ys, xPred){
    // simple least squares
    const n = xs.length;
    let sumX=0,sumY=0,sumXY=0,sumXX=0;
    for(let i=0;i<n;i++){
      const x=xs[i], y=ys[i];
      sumX += x; sumY += y; sumXY += x*y; sumXX += x*x;
    }
    const denom = (n*sumXX - sumX*sumX);
    if(Math.abs(denom) < 1e-9) return ys[ys.length-1] || 0;
    const a = (n*sumXY - sumX*sumY) / denom;
    const b = (sumY - a*sumX) / n;
    return a*xPred + b;
  }

  /* ---------------- Rendering helpers ---------------- */

  function normalizeHomeRows(rows){
    const out = rows
      .map(r => ({
        ...r,
        Monat: String(r.Monat || r["Monat"] || "").slice(0,7),
        Cashflow: num(r.Cashflow),
        Mieteinnahmen: num(r.Mieteinnahmen),
        Pachteinnahmen: num(r.Pachteinnahmen),
        "Auslastung_%": num(r["Auslastung_%"]),
        Portfolio_Wert: num(r.Portfolio_Wert),
        Investiertes_Kapital: num(r.Investiertes_Kapital),
      }))
      .filter(r => /^\d{4}-\d{2}$/.test(r.Monat))
      .sort((a,b)=> a.Monat.localeCompare(b.Monat));
    return out;
  }

  function getCurrentYM(){
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }

  function barClass(ym, nowYM, forecastDir){
    if(ym === nowYM) return "current";
    if(ym < nowYM) return "past";
    // future bars
    return `future ${forecastDir}`;
  }

  function getMinMax(values, isPercent){
    let min = Infinity, max = -Infinity;
    values.forEach(v => {
      const x = num(v);
      if(x < min) min = x;
      if(x > max) max = x;
    });

    if(isPercent){
      min = Math.min(min, 0);
      max = Math.max(max, 100);
    }

    if(!isFinite(min) || !isFinite(max)){
      min = 0; max = 1;
    }
    if(min === max){
      const pad = (Math.abs(min) || 1) * 0.15;
      min -= pad; max += pad;
    }
    return { min, max };
  }

  function makeScaler(min, max){
    return (v) => {
      const x = num(v);
      const t = (x - min) / (max - min);
      return clamp(t, 0, 1);
    };
  }

  function renderTrendline(trendEl, values, isPercent){
    const n = values.length;
    trendEl.innerHTML = "";

    const mm = getMinMax(values, isPercent);
    const scale = makeScaler(mm.min, mm.max);

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 1000 300");
    svg.setAttribute("preserveAspectRatio", "none");

    const defs = document.createElementNS(svgNS, "defs");
    const clip = document.createElementNS(svgNS, "clipPath");
    clip.setAttribute("id", "hkpiClip");
    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", "1000");
    rect.setAttribute("height", "300");
    clip.appendChild(rect);
    defs.appendChild(clip);
    svg.appendChild(defs);

    const pts = [];
    for(let i=0;i<n;i++){
      const cx = (i + 0.5) / n * 1000;     // EXACT bar center
      const ny = 1 - scale(values[i]);
      const cy = 18 + ny * 264;
      pts.push([cx, cy]);
    }

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "rgba(226,232,240,.92)");
    path.setAttribute("stroke-width", "3");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("clip-path", "url(#hkpiClip)");
    path.setAttribute("d", buildSmoothPath(pts));

    const dots = document.createElementNS(svgNS, "g");
    dots.setAttribute("clip-path", "url(#hkpiClip)");
    pts.forEach(p => {
      const c = document.createElementNS(svgNS, "circle");
      c.setAttribute("cx", String(p[0]));
      c.setAttribute("cy", String(p[1]));
      c.setAttribute("r", "4");
      c.setAttribute("fill", "rgba(226,232,240,.95)");
      c.setAttribute("opacity", "0.9");
      dots.appendChild(c);
    });

    svg.appendChild(path);
    svg.appendChild(dots);
    trendEl.appendChild(svg);
  }

  function buildSmoothPath(pts){
    if(pts.length === 0) return "";
    if(pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`;
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for(let i=1;i<pts.length;i++){
      const p0 = pts[i-1];
      const p1 = pts[i];
      const mx = (p0[0] + p1[0]) / 2;
      const my = (p0[1] + p1[1]) / 2;
      d += ` Q ${p0[0]} ${p0[1]} ${mx} ${my}`;
      if(i === pts.length - 1){
        d += ` Q ${p1[0]} ${p1[1]} ${p1[0]} ${p1[1]}`;
      }
    }
    return d;
  }

  function formatYMShort(ym){
    const [y,m] = ym.split("-");
    const d = new Date(Number(y), Number(m)-1, 1);
    return d.toLocaleDateString("de-DE", { month:"short" }).replace(".","");
  }

  function fmtEUR(v){
    const n = num(v);
    return new Intl.NumberFormat("de-DE",{ style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(n);
  }

  function shortEUR(v){
    const n = num(v);
    const abs = Math.abs(n);
    if(abs >= 1000000) return (n/1000000).toFixed(1).replace(".",",") + " Mio";
    if(abs >= 1000) return (n/1000).toFixed(0) + "k";
    return String(Math.round(n));
  }

  function fmtPct(v){
    const n = num(v);
    return n.toFixed(1).replace(".",",") + " %";
  }

  function num(v){
    if(typeof v === "number") return v;
    if(v == null || v === "") return 0;
    const s = String(v).trim()
      .replace(/\s/g,"")
      .replace(/\./g,"")
      .replace(",",".");
    const n = Number(s);
    return isFinite(n) ? n : 0;
  }

  function clamp(x,a,b){ return Math.max(a, Math.min(b, x)); }

  function tinyEps(v){
    const a = Math.abs(v);
    return Math.max(0.0001, a * 0.002); // 0.2% threshold
  }

  function escapeHtml(str){
    return String(str ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

})();