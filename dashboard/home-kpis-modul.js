/* home-kpis-modul.js
   Reads: window.IMMO_DATA.home
   Exposes: window.HomeKpisModul.render(host)
*/
(function(){
  window.HomeKpisModul = { render };

  function render(host){
    if(!host) return;

    const rows = Array.isArray(window.IMMO_DATA?.home) ? window.IMMO_DATA.home : [];
    const grid = host.querySelector("#hkpiGrid");
    const note = host.querySelector("#hkpiNote");

    if(!grid){
      host.innerHTML = `<div style="padding:12px;font-size:12px;color:rgba(226,232,240,.78)">home-kpis-modul: #hkpiGrid fehlt in HTML.</div>`;
      return;
    }

    // Expect at least a few months; we display exactly 10 bars:
    // 6 back + current + 3 forecast = 10
    const series = normalizeHomeRows(rows);
    if(series.length === 0){
      grid.innerHTML = "";
      if(note) note.textContent = "Keine KPI-Daten gefunden (window.IMMO_DATA.home ist leer).";
      return;
    }

    const view = buildWindow(series, 10); // last 10 months (should be 6 back + current + 3 ahead from master)
    const nowYM = getCurrentYM();

    const kpis = [
      {
        key: "Cashflow",
        label: "Monats-Cashflow",
        unit: "€",
        valueFn: r => num(r.Cashflow),
        fmt: v => fmtEUR(v),
        isPercent: false
      },
      {
        key: "JahresCashflow",
        label: "Jahres-Cashflow",
        unit: "€",
        valueFn: (_, idx, arr) => {
          // rolling 12 (use whatever exists up to 12)
          const start = Math.max(0, idx - 11);
          let sum = 0;
          for(let i=start;i<=idx;i++) sum += num(arr[i].Cashflow);
          return sum;
        },
        fmt: v => fmtEUR(v),
        isPercent: false
      },
      {
        key: "Mieteinnahmen",
        label: "Mieteinnahmen pro Monat",
        unit: "€",
        valueFn: r => num(r.Mieteinnahmen),
        fmt: v => fmtEUR(v),
        isPercent: false
      },
      {
        key: "Pachteinnahmen",
        label: "Pachteinnahmen pro Monat",
        unit: "€",
        valueFn: r => num(r.Pachteinnahmen),
        fmt: v => fmtEUR(v),
        isPercent: false
      },
      {
        key: "Auslastung",
        label: "Auslastung Wohnungen",
        unit: "%",
        valueFn: r => num(r["Auslastung_%"]),
        fmt: v => fmtPct(v),
        isPercent: true
      },
      {
        key: "ROI",
        label: "Portfolio ROI",
        unit: "%",
        valueFn: r => {
          const wert = num(r.Portfolio_Wert);
          const inv  = num(r.Investiertes_Kapital);
          if(inv <= 0) return 0;
          return (wert - inv) / inv * 100;
        },
        fmt: v => fmtPct(v),
        isPercent: true
      }
    ];

    grid.innerHTML = "";
    kpis.forEach(k => {
      const card = document.createElement("div");
      card.className = "hkpi-card";
      card.innerHTML = `
        <div class="hkpi-cardhead">
          <div style="min-width:0">
            <div class="hkpi-name">${escapeHtml(k.label)}</div>
            <div class="hkpi-delta" data-delta></div>
          </div>
          <div class="hkpi-meta">${escapeHtml(view[view.length-1].Monat)}</div>
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

      // Values across window
      const values = view.map((r, idx) => k.valueFn(r, idx, view));

      // Current value is last non-empty (usually last month in window)
      const lastIdx = values.length - 1;
      const lastVal = values[lastIdx];

      // Delta vs previous bar (month-to-month)
      const prevVal = values.length >= 2 ? values[lastIdx - 1] : 0;
      const delta = lastVal - prevVal;

      valEl.textContent = k.fmt(lastVal);
      deltaEl.textContent = `Δ zum Vormonat: ${k.isPercent ? fmtPct(delta) : fmtEUR(delta)}`;

      // Determine forecast trend direction using last 4 points (current+3 forecast)
      // If forecast is rising -> up else down
      const tail = values.slice(-4);
      const trendDir = (tail[tail.length-1] >= tail[0]) ? "up" : "down";

      // Build bars
      const minMax = getMinMax(values, k.isPercent);
      const scale = makeScaler(minMax.min, minMax.max);

      barsEl.innerHTML = "";
      xEl.innerHTML = "";

      const barNodes = [];
      for(let i=0;i<view.length;i++){
        const ym = view[i].Monat;
        const v = values[i];

        const cls = barClassForMonth(ym, nowYM, i, view.length, trendDir);
        const bar = document.createElement("div");
        bar.className = `hkpi-bar ${cls}`;
        bar.innerHTML = `<i></i><div class="hkpi-barlabel">${k.isPercent ? fmtPct(v) : shortEUR(v)}</div>`;
        barsEl.appendChild(bar);
        barNodes.push(bar);

        const lbl = document.createElement("span");
        lbl.textContent = formatYMShort(ym);
        xEl.appendChild(lbl);
      }

      // Animate fill heights after DOM paint
      requestAnimationFrame(() => {
        for(let i=0;i<barNodes.length;i++){
          const v = values[i];
          const h = clamp(scale(v) * 100, 0, 100);
          const fill = barNodes[i].querySelector("i");
          fill.style.height = h.toFixed(2) + "%";
        }
      });

      // ✅ Trendline confined + ends exactly at last bar center (no overhang)
      renderTrendline(trendEl, values, k.isPercent);

      grid.appendChild(card);
    });

    if(note){
      const shownFrom = view[0].Monat;
      const shownTo = view[view.length-1].Monat;
      note.textContent = `Zeitraum: ${shownFrom} → ${shownTo} (10 Balken).`;
    }
  }

  /* ---------- helpers ---------- */

  function normalizeHomeRows(rows){
    // Ensure shape: [{Monat:"YYYY-MM", ...}]
    const out = rows
      .map(r => ({
        ...r,
        Monat: String(r.Monat || r["Monat"] || "").slice(0,7)
      }))
      .filter(r => /^\d{4}-\d{2}$/.test(r.Monat))
      .sort((a,b)=> a.Monat.localeCompare(b.Monat));

    return out;
  }

  function buildWindow(series, n){
    if(series.length <= n) return series.slice();
    return series.slice(series.length - n);
  }

  function getCurrentYM(){
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    return `${y}-${m}`;
  }

  function barClassForMonth(ym, nowYM, idx, len, trendDir){
    // Determine "past/current/future" vs nowYM
    if(ym === nowYM) return "current";
    if(ym < nowYM) return "past";
    // Future
    return `future ${trendDir}`;
  }

  function getMinMax(values, isPercent){
    let min = Infinity, max = -Infinity;
    values.forEach(v => {
      const x = num(v);
      if(x < min) min = x;
      if(x > max) max = x;
    });

    // Percent charts: keep 0..100 for readability (but still respect min/max inside)
    if(isPercent){
      min = Math.min(min, 0);
      max = Math.max(max, 100);
    }

    // If flat line, widen a bit so bars visible
    if(!isFinite(min) || !isFinite(max)){
      min = 0; max = 1;
    }
    if(min === max){
      const pad = (Math.abs(min) || 1) * 0.15;
      min -= pad; max += pad;
    }

    // For cashflow, allow negatives; baseline handled by scaler
    return { min, max };
  }

  function makeScaler(min, max){
    // Map value -> 0..1 (relative height)
    // If min<0<max, we still map heights on full range for simplicity
    return (v) => {
      const x = num(v);
      const t = (x - min) / (max - min);
      return clamp(t, 0, 1);
    };
  }

  function renderTrendline(trendEl, values, isPercent){
    // values length is exactly number of bars; we draw points at bar centers
    const n = values.length;
    trendEl.innerHTML = "";

    // Normalize Y to 0..1 (same min/max logic as bars so the curve matches)
    const mm = getMinMax(values, isPercent);
    const scale = makeScaler(mm.min, mm.max);

    // Build SVG with clipPath so nothing can ever overflow
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

    // Compute polyline points: x from 0..1000 across n bars at centers
    const pts = [];
    for(let i=0;i<n;i++){
      const cx = (i + 0.5) / n * 1000;              // center of bar
      const ny = 1 - scale(values[i]);              // invert
      const cy = 20 + ny * 260;                     // padding top/bottom
      pts.push([cx, cy]);
    }

    // Smooth-ish path using simple quadratic segments (still clipped)
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "rgba(226,232,240,.85)");
    path.setAttribute("stroke-width", "3");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("clip-path", "url(#hkpiClip)");

    path.setAttribute("d", buildSmoothPath(pts));

    // Dots on points
    const gDots = document.createElementNS(svgNS, "g");
    gDots.setAttribute("clip-path", "url(#hkpiClip)");
    pts.forEach(p => {
      const c = document.createElementNS(svgNS, "circle");
      c.setAttribute("cx", String(p[0]));
      c.setAttribute("cy", String(p[1]));
      c.setAttribute("r", "4");
      c.setAttribute("fill", "rgba(226,232,240,.95)");
      c.setAttribute("opacity", "0.9");
      gDots.appendChild(c);
    });

    svg.appendChild(path);
    svg.appendChild(gDots);
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
      // Quadratic curve: control at p0, end at mid; then line to p1 via another quad
      d += ` Q ${p0[0]} ${p0[1]} ${mx} ${my}`;
      if(i === pts.length - 1){
        d += ` Q ${p1[0]} ${p1[1]} ${p1[0]} ${p1[1]}`;
      }
    }
    return d;
  }

  function formatYMShort(ym){
    // "2025-12" -> "Dez"
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
    // show compact value inside bar label
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

  function escapeHtml(str){
    return String(str ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

})();