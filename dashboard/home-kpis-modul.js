(function(){
  "use strict";

  window.HomeKpisModul = { render };

  function render(mountEl){
    const root =
      (mountEl && mountEl.querySelector && mountEl.querySelector(".home-kpis-modul")) ||
      mountEl ||
      document.getElementById("homeKpisModul") ||
      document.querySelector(".home-kpis-modul");

    if (!root) return;

    const badgeEl  = root.querySelector("#hkpiBadge");
    const statusEl = root.querySelector("#hkpiStatus");
    const emptyEl  = root.querySelector("#hkpiEmpty");
    const gridEl   = root.querySelector("#hkpiGrid");

    const rows = Array.isArray(window.IMMO_DATA?.home) ? window.IMMO_DATA.home : [];

    if (badgeEl) badgeEl.textContent = `HOME KPIs: ${rows.length}`;

    if (!rows.length){
      if (gridEl) gridEl.innerHTML = "";
      if (emptyEl) emptyEl.style.display = "block";
      if (statusEl) statusEl.textContent =
        "Keine Home KPI Daten gefunden (DataLoader → window.IMMO_DATA.home).";
      return;
    }

    const parsed = rows.map(r => ({
      Monat: parseMonthKey(r.Monat),
      Cashflow: num(r.Cashflow),
      Mieteinnahmen: num(r.Mieteinnahmen),
      Pachteinnahmen: num(r.Pachteinnahmen),
      Auslastung: clampPercent(r.Auslastung_pct ?? r["Auslastung_%"]),
      PortfolioWert: num(r.Portfolio_Wert),
      InvestiertesKapital: num(r.Investiertes_Kapital)
    })).filter(r => r.Monat).sort((a,b)=>a.Monat.localeCompare(b.Monat));

    if (!parsed.length){
      if (gridEl) gridEl.innerHTML = "";
      if (emptyEl) emptyEl.style.display = "block";
      if (statusEl) statusEl.textContent =
        "Home KPIs vorhanden, aber Feld 'Monat' ist ungültig (erwartet YYYY-MM).";
      return;
    }

    if (emptyEl) emptyEl.style.display = "none";

    const nowKey = monthKeyFromDate(new Date());
    let curIdx = parsed.findIndex(x => x.Monat === nowKey);
    if (curIdx < 0) curIdx = parsed.length - 1;

    const cur = parsed[curIdx];
    const start = Math.max(0, curIdx - 5);
    const hist = parsed.slice(start, curIdx + 1);

    if (statusEl){
      statusEl.textContent =
        `Quelle: master-data · Monate: ${parsed.length} · Aktuell: ${cur.Monat} · ` +
        `CF ${formatEuro(cur.Cashflow)} · Miete ${formatEuro(cur.Mieteinnahmen)} · Pacht ${formatEuro(cur.Pachteinnahmen)}`;
    }

    const seriesCash  = buildSeries(hist, cur.Monat, "Cashflow");
    const seriesRent  = buildSeries(hist, cur.Monat, "Mieteinnahmen");
    const seriesLease = buildSeries(hist, cur.Monat, "Pachteinnahmen");
    const seriesOcc   = buildSeries(hist, cur.Monat, "Auslastung");

    const year = new Date().getFullYear();
    const yearCash = sumYear(parsed, year, "Cashflow");
    const roi = (cur.InvestiertesKapital > 0) ? (yearCash / cur.InvestiertesKapital * 100) : 0;

    const cards = [
      card("Monats-Cashflow", `${cur.Monat} · 6M + 3M`, formatEuro(cur.Cashflow), trendTextEuro(seriesCash), seriesCash, "euro"),
      card("Jahres-Cashflow", `YTD ${year}`, formatEuro(yearCash), `Ø/Monat: ${formatEuro(yearCash / Math.max(1,(new Date().getMonth()+1)))}`, seriesCash, "euro"),

      card("Mieteinnahmen / Monat", cur.Monat, formatEuro(cur.Mieteinnahmen), `Ø 6M: ${formatEuro(avg(hist,"Mieteinnahmen"))}`, seriesRent, "euro"),
      card("Pachteinnahmen / Monat", cur.Monat, formatEuro(cur.Pachteinnahmen), `Ø 6M: ${formatEuro(avg(hist,"Pachteinnahmen"))}`, seriesLease, "euro"),

      card("Auslastung", cur.Monat, formatPercent(cur.Auslastung), `Ø 6M: ${formatPercent(avg(hist,"Auslastung"))}`, seriesOcc, "pct"),
      card("Portfolio ROI", `${year} (approx)`, formatPercent(roi), "Jahres-CF / invest. Kapital", seriesCash, "pct"),
    ];

    gridEl.innerHTML = cards.map(c => `
      <div class="hkpi-tile">
        <div class="hkpi-top">
          <div style="min-width:0;">
            <div class="hkpi-name">${esc(c.title)}</div>
            <div class="hkpi-desc">${esc(c.sub)}</div>
          </div>
          <div class="hkpi-val">
            <div class="v">${esc(c.value)}</div>
            <div class="d">${esc(c.delta)}</div>
          </div>
        </div>

        <div class="hkpi-chart">
          <svg class="hkpi-trend" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="${esc(trendPath(c.series))}" fill="none" stroke="rgba(226,232,240,.55)" stroke-width="2" />
          </svg>

          <div class="hkpi-bars">
            ${barsHTML(c.series, c.unit)}
          </div>

          <div class="hkpi-labels">
            <span>${esc(c.series.points[0]?.month || "")}</span>
            <span>${esc(c.series.points[c.series.points.length-1]?.month || "")}</span>
          </div>
        </div>
      </div>
    `).join("");
  }

  /* ===== helpers ===== */

  function esc(s){
    return String(s ?? "")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }

  function num(v){
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (v === null || v === undefined) return 0;
    const s0 = String(v).trim();
    if (!s0) return 0;

    let s = s0.replace(/\s/g,"").replace(/€/g,"");
    const hasComma = s.includes(",");
    const hasDot = s.includes(".");
    if (hasComma && hasDot) {
      const lc = s.lastIndexOf(",");
      const ld = s.lastIndexOf(".");
      if (lc > ld) s = s.replace(/\./g,"").replace(",",".");
      else s = s.replace(/,/g,"");
    } else if (hasComma && !hasDot) {
      s = s.replace(",",".");
    }
    s = s.replace(/[^0-9.\-]/g,"");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  function clampPercent(v){
    let x = num(v);
    if (x > 0 && x <= 1) x *= 100;
    return Math.max(0, Math.min(100, x));
  }

  function formatEuro(n){
    return new Intl.NumberFormat("de-DE",{ style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(Number(n)||0);
  }
  function formatPercent(n){
    const v = Number(n)||0;
    return (Math.round(v*10)/10).toFixed(1).replace(".",",") + " %";
  }

  function formatShortEuro(n){
    const v = Number(n)||0;
    const abs = Math.abs(v);
    const sign = v < 0 ? "−" : "";
    if (abs >= 1000000) return sign + (abs/1000000).toFixed(1).replace(".",",") + "M";
    if (abs >= 1000) return sign + Math.round(abs/1000) + "k";
    return sign + Math.round(abs).toString();
  }

  function formatShortPct(n){
    const v = Number(n)||0;
    return v.toFixed(0) + "%";
  }

  function monthKeyFromDate(d){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    return `${y}-${m}`;
  }

  function parseMonthKey(v){
    const s = String(v||"").trim();
    if (/^\d{4}-\d{2}$/.test(s)) return s;
    return "";
  }

  function addMonths(ym, add){
    const y = Number(ym.slice(0,4));
    const m = Number(ym.slice(5,7));
    const d = new Date(y, (m-1)+add, 1);
    return monthKeyFromDate(d);
  }

  function linearForecast(vals, steps){
    const v = vals.map(x=>Number(x)||0);
    if (v.length < 2) return Array.from({length:steps}, ()=>v[v.length-1]||0);
    const use = v.slice(-3);
    const slope = (use[use.length-1] - use[0]) / Math.max(1, use.length-1);
    const base = use[use.length-1];
    return Array.from({length:steps}, (_,i)=>base + slope*(i+1));
  }

  function buildSeries(histRows, baseMonth, field){
    const hist = histRows.map(r => ({ month: r.Monat, value: Number(r[field])||0 }));
    const histVals = hist.map(x=>x.value);
    const f = linearForecast(histVals.slice(-3), 3);

    const points = hist.map(x=>({ month:x.month, value:x.value, kind:"past" }));
    for (let i=1;i<=3;i++){
      points.push({ month:addMonths(baseMonth,i), value:f[i-1]||0, kind:"future" });
    }

    const currentVal = points.find(p=>p.month===baseMonth)?.value ?? 0;
    const lastVal = points[points.length-1]?.value ?? currentVal;
    const trendUp = lastVal >= currentVal;

    return { points, currentMonth: baseMonth, trendUp };
  }

  function barsHTML(series, unit){
    const values = series.points.map(p => Number(p.value)||0);
    const abs = values.map(v => Math.abs(v));
    const max = Math.max(1, ...abs);

    return series.points.map(p=>{
      const v = Number(p.value)||0;
      const h = Math.max(8, Math.round((Math.abs(v)/max)*100)); // min height

      let state = "past";
      if (p.month === series.currentMonth) state = "current";
      else if (p.month > series.currentMonth) state = series.trendUp ? "future_up" : "future_down";

      const label = unit === "pct" ? formatShortPct(v) : formatShortEuro(v);

      return `<div class="hkpi-col" data-state="${state}" title="${esc(p.month)}">
        <span class="hkpi-num">${esc(label)}</span>
        <i style="height:${h}%;"></i>
      </div>`;
    }).join("");
  }

  function trendPath(series){
    const pts = series.points.map(p => Number(p.value)||0);
    const abs = pts.map(v => Math.abs(v));
    const max = Math.max(1, ...abs);

    const n = series.points.length;
    const stepX = n <= 1 ? 100 : (100 / (n - 1));

    const coords = series.points.map((p, i) => {
      const v = Number(p.value)||0;
      const y = 100 - Math.round((Math.abs(v)/max)*90) - 5; // 5..95
      const x = Math.round(i * stepX);
      return { x, y };
    });

    if (!coords.length) return "";

    // Smooth-ish path (quadratic)
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const cur = coords[i];
      const cx = Math.round((prev.x + cur.x) / 2);
      d += ` Q ${cx} ${prev.y} ${cur.x} ${cur.y}`;
    }
    return d;
  }

  function trendTextEuro(series){
    const cur = series.points.find(p=>p.month===series.currentMonth)?.value ?? 0;
    const last = series.points[series.points.length-1]?.value ?? cur;
    const diff = last - cur;
    const sign = diff >= 0 ? "+" : "";
    return `Forecast: ${sign}${formatEuro(diff)} ${series.trendUp ? "↑" : "↓"}`;
  }

  function sumYear(rows, year, field){
    const y = String(year);
    return rows.reduce((acc,r)=>{
      if (r.Monat && r.Monat.startsWith(y+"-")) return acc + (Number(r[field])||0);
      return acc;
    }, 0);
  }

  function avg(rows, field){
    if (!rows.length) return 0;
    return rows.reduce((a,r)=>a+(Number(r[field])||0),0) / rows.length;
  }

  function card(title, sub, value, delta, series, unit){
    return { title, sub, value, delta, series, unit };
  }

  window.addEventListener("immo:data-ready", () => {
    const host = document.getElementById("kpisHost") || document.getElementById("homeKpisModul");
    if (host) render(host);
  });
})();