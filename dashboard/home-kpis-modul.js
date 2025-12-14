(function(){
  "use strict";

  window.HomeKpisModul = { render };

  function render(mountEl){
    const root = mountEl || document.getElementById("homeKpisModul") || document.querySelector(".home-kpis-modul");
    if (!root) return;

    // Elemente aus home-kpis-modul.html (müssen existieren!)
    const badgeEl  = root.querySelector("#hkpiBadge");
    const statusEl = root.querySelector("#hkpiStatus");
    const emptyEl  = root.querySelector("#hkpiEmpty");
    const gridEl   = root.querySelector("#hkpiGrid");

    const rows = (window.IMMO_DATA && Array.isArray(window.IMMO_DATA.home)) ? window.IMMO_DATA.home : [];

    if (badgeEl) badgeEl.textContent = "HOME: " + rows.length;

    if (!rows.length){
      if (gridEl) gridEl.innerHTML = "";
      if (emptyEl) emptyEl.style.display = "block";
      if (statusEl) statusEl.textContent = "Keine Home KPI Daten gefunden (DataLoader → window.IMMO_DATA.home).";
      return;
    }

    // Parse + sort by month
    const parsed = rows.map(r => ({
      Monat: parseMonthKey(r.Monat),
      Cashflow: num(r.Cashflow),
      Mieteinnahmen: num(r.Mieteinnahmen),
      Pachteinnahmen: num(r.Pachteinnahmen),
      Auslastung: clampPercent(r["Auslastung_%"]),
      PortfolioWert: num(r["Portfolio_Wert"]),
      InvestiertesKapital: num(r["Investiertes_Kapital"])
    })).filter(r => r.Monat).sort((a,b)=>a.Monat.localeCompare(b.Monat));

    if (!parsed.length){
      if (gridEl) gridEl.innerHTML = "";
      if (emptyEl) emptyEl.style.display = "block";
      if (statusEl) statusEl.textContent = "Home KPI Daten vorhanden, aber Monat konnte nicht gelesen werden (erwartet YYYY-MM).";
      return;
    }

    if (emptyEl) emptyEl.style.display = "none";
    if (statusEl) statusEl.textContent = "KPIs geladen (master-data).";

    const nowKey = monthKeyFromDate(new Date());
    let curIdx = parsed.findIndex(x => x.Monat === nowKey);
    if (curIdx < 0) curIdx = parsed.length - 1;

    const start = Math.max(0, curIdx - 5);
    const hist = parsed.slice(start, curIdx + 1);
    const baseMonth = parsed[curIdx].Monat;

    // Build 6+3 series for each KPI
    const series = {
      cash: buildSeries(hist, baseMonth, "Cashflow"),
      rent: buildSeries(hist, baseMonth, "Mieteinnahmen"),
      lease: buildSeries(hist, baseMonth, "Pachteinnahmen"),
      occ: buildSeries(hist, baseMonth, "Auslastung"),
    };

    const year = new Date().getFullYear();
    const yearCash = sumYear(parsed, year, "Cashflow");
    const cur = parsed[curIdx];

    const roi = (cur.InvestiertesKapital > 0) ? (yearCash / cur.InvestiertesKapital * 100) : 0;

    const cards = [
      card("Monats-Cashflow", baseMonth + " · 6M + 3M", formatEuro(cur.Cashflow), `YTD ${year}: ${formatEuro(yearCash)}`, series.cash),
      card("Jahres-Cashflow", `Summe ${year} (YTD)`, formatEuro(yearCash), `Ø/Monat: ${formatEuro(yearCash / Math.max(1,(new Date().getMonth()+1)))}`, series.cash),
      card("Mieteinnahmen / Monat", baseMonth, formatEuro(cur.Mieteinnahmen), `Ø 6M: ${formatEuro(avg(hist, "Mieteinnahmen"))}`, series.rent),
      card("Pachteinnahmen / Monat", baseMonth, formatEuro(cur.Pachteinnahmen), `Ø 6M: ${formatEuro(avg(hist, "Pachteinnahmen"))}`, series.lease),
      card("Auslastung", baseMonth, formatPercent(cur.Auslastung), `Ø 6M: ${formatPercent(avg(hist, "Auslastung"))}`, series.occ),
      card("Portfolio ROI", `${year} (approx)`, formatPercent(roi), "Jahres-CF / invest. Kapital", series.cash),
    ];

    if (!gridEl) return;

    const firstLabel = series.cash.points[0]?.month || "";
    const lastLabel  = series.cash.points[series.cash.points.length-1]?.month || "";

    gridEl.innerHTML = cards.map(c => `
      <div class="hkpi-tile">
        <div class="hkpi-top">
          <div style="min-width:0">
            <div class="hkpi-name">${escapeHtml(c.title)}</div>
            <div class="hkpi-desc">${escapeHtml(c.sub)}</div>
          </div>
          <div class="hkpi-val">
            <div class="v">${escapeHtml(c.value)}</div>
            <div class="d">${escapeHtml(c.delta)}</div>
          </div>
        </div>

        <div class="hkpi-spark">
          <div class="hkpi-bars">${barsHTML(c.series)}</div>
          <div class="hkpi-labels">
            <span>${escapeHtml(firstLabel)}</span>
            <span>${escapeHtml(lastLabel)}</span>
          </div>
        </div>
      </div>
    `).join("");
  }

  /* ================= helpers ================= */

  function escapeHtml(s){
    return String(s ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
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

  function monthKeyFromDate(d){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    return `${y}-${m}`;
  }

  function parseMonthKey(v){
    const s = String(v||"").trim();
    if (/^\d{4}-\d{2}$/.test(s)) return s;
    const iso = s.match(/^(\d{4})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}`;
    const de = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (de){
      const mm = String(de[2]).padStart(2,"0");
      return `${de[3]}-${mm}`;
    }
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

    const points = hist.map(x=>({ month:x.month, value:x.value, kind:"hist" }));
    for (let i=1;i<=3;i++){
      points.push({ month:addMonths(baseMonth,i), value:f[i-1]||0, kind:"future" });
    }

    const currentVal = points.find(p=>p.month===baseMonth)?.value ?? 0;
    const lastVal = points[points.length-1]?.value ?? currentVal;
    const trendUp = lastVal >= currentVal;

    return { points, currentMonth: baseMonth, trendUp };
  }

  function barsHTML(series){
    const abs = series.points.map(p=>Math.abs(p.value||0));
    const max = Math.max(1, ...abs);

    return series.points.map(p=>{
      const h = Math.max(8, Math.round((Math.abs(p.value||0)/max)*100));
      let state = "past";
      if (p.month === series.currentMonth) state = "current";
      else if (p.month > series.currentMonth) state = series.trendUp ? "future_up" : "future_down";

      return `<div class="hkpi-col" data-state="${state}" title="${p.month}">
        <i style="height:${h}%;"></i>
      </div>`;
    }).join("");
  }

  function sumYear(rows, year, field){
    const y = String(year);
    return rows.reduce((acc,r)=>{
      if (r.Monat && r.Monat.startsWith(y+"-")) return acc + (Number(r[field])||0);
      return acc;
    }, 0);
  }

  function avg(histRows, field){
    if (!histRows.length) return 0;
    return histRows.reduce((a,r)=>a+(Number(r[field])||0),0) / histRows.length;
  }

  function card(title, sub, value, delta, series){
    return { title, sub, value, delta, series };
  }

  // Auto-render if modules choose to rely on event
  window.addEventListener("immo:data-ready", function(){
    const host = document.getElementById("kpisHost") || document.getElementById("homeKpisModul") || document.querySelector(".home-kpis-modul");
    if (host) render(host);
  });
})();
