(function(){
  "use strict";

  // ---------- helpers ----------
  function normalizeKey(s){
    return String(s||"")
      .trim()
      .toLowerCase()
      .replace(/\u00a0/g," ")
      .replace(/[^\p{L}\p{N}]+/gu,"_")
      .replace(/^_+|_+$/g,"");
  }

  function parseNumberSmart(v){
    if (v === null || v === undefined) return null;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const s0 = String(v).trim();
    if (!s0) return null;

    let s = s0.replace(/\s/g,"").replace(/€/g,"").replace(/[A-Za-z]/g,"");
    const hasComma = s.includes(",");
    const hasDot = s.includes(".");
    if (hasComma && hasDot) {
      const lc = s.lastIndexOf(",");
      const ld = s.lastIndexOf(".");
      if (lc > ld) s = s.replace(/\./g,"").replace(",","."); // de
      else s = s.replace(/,/g,"");                           // en
    } else if (hasComma && !hasDot) {
      s = s.replace(",",".");
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function formatEuro(n){
    const v = (n==null || !Number.isFinite(n)) ? 0 : n;
    return new Intl.NumberFormat("de-DE", { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(v);
  }
  function formatPercent(n){
    const v = (n==null || !Number.isFinite(n)) ? 0 : n;
    return (Math.round(v*10)/10).toFixed(1).replace(".",",") + " %";
  }

  function monthKeyFromDate(d){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    return `${y}-${m}`;
  }

  function parseMonthKey(s){
    const m = String(s||"").trim();
    if (/^\d{4}-\d{2}$/.test(m)) return m;
    // allow "MM.YYYY" or "YYYY.MM"
    const a = m.match(/^(\d{2})\.(\d{4})$/);
    if (a) return `${a[2]}-${a[1]}`;
    const b = m.match(/^(\d{4})\.(\d{2})$/);
    if (b) return `${b[1]}-${b[2]}`;
    return "";
  }

  function addMonths(ym, add){
    const y = Number(ym.slice(0,4));
    const m = Number(ym.slice(5,7));
    const d = new Date(y, m-1 + add, 1);
    return monthKeyFromDate(d);
  }

  // ---------- data adapter (works with existing loader) ----------
  function getGlobalData(){
    if (window.IMMO_DATA) return window.IMMO_DATA;
    if (window.DASHBOARD && window.DASHBOARD.data) return window.DASHBOARD.data;
    if (window.DASHBOARD_DATA) return window.DASHBOARD_DATA;
    if (window.dashboardData) return window.dashboardData;
    return null;
  }

  function extractHomeRows(data){
    if (!data) return [];

    // normalized variants
    if (Array.isArray(data.home_kpi)) return data.home_kpi;
    if (Array.isArray(data.homeKpi)) return data.homeKpi;
    if (Array.isArray(data.homeKPI)) return data.homeKPI;

    // sheets map variants
    if (data.sheets){
      if (Array.isArray(data.sheets.HOME_KPI)) return data.sheets.HOME_KPI;
      if (Array.isArray(data.sheets["HOME_KPI"])) return data.sheets["HOME_KPI"];
      if (Array.isArray(data.sheets.home_kpi)) return data.sheets.home_kpi;
    }

    // direct sheet prop
    if (Array.isArray(data.HOME_KPI)) return data.HOME_KPI;
    if (Array.isArray(data["HOME_KPI"])) return data["HOME_KPI"];
    if (data.HOME_KPI && Array.isArray(data.HOME_KPI.rows)) return data.HOME_KPI.rows;

    return [];
  }

  function normalizeHomeRow(r){
    if (!r || typeof r !== "object") return null;

    // if already normalized
    if ("monat" in r && ("cashflow" in r || "mieteinnahmen" in r || "pachteinnahmen" in r)) {
      return {
        monat: parseMonthKey(r.monat),
        cashflow: parseNumberSmart(r.cashflow),
        mieteinnahmen: parseNumberSmart(r.mieteinnahmen),
        pachteinnahmen: parseNumberSmart(r.pachteinnahmen),
        auslastung_pct: parseNumberSmart(r.auslastung_pct ?? r["auslastung_%"] ?? r.auslastung_),
        portfolio_wert: parseNumberSmart(r.portfolio_wert),
        investiertes_kapital: parseNumberSmart(r.investiertes_kapital),
      };
    }

    // map from arbitrary headers
    const obj = {};
    Object.keys(r).forEach(k => obj[normalizeKey(k)] = r[k]);

    return {
      monat: parseMonthKey(obj.monat || obj.month),
      cashflow: parseNumberSmart(obj.cashflow),
      mieteinnahmen: parseNumberSmart(obj.mieteinnahmen),
      pachteinnahmen: parseNumberSmart(obj.pachteinnahmen),
      auslastung_pct: parseNumberSmart(obj.auslastung_ || obj.auslastung_pct || obj.auslastung),
      portfolio_wert: parseNumberSmart(obj.portfolio_wert),
      investiertes_kapital: parseNumberSmart(obj.investiertes_kapital),
    };
  }

  // ---------- forecasting ----------
  function linearForecast(lastVals, steps){
    // lastVals: array of numbers (at least 2 ideally)
    const vals = lastVals.filter(v => Number.isFinite(v));
    if (!vals.length) return Array.from({length:steps}, ()=>0);

    if (vals.length === 1) return Array.from({length:steps}, ()=>vals[0]);

    // slope using last 3 points if available
    const use = vals.slice(-3);
    const n = use.length;
    const slope = (use[n-1] - use[0]) / Math.max(1, (n-1));
    const base = use[n-1];

    return Array.from({length:steps}, (_,i)=>base + slope*(i+1));
  }

  function buildSeries(rows, field){
    const cleaned = rows
      .map(normalizeHomeRow)
      .filter(x => x && x.monat)
      .sort((a,b)=>a.monat.localeCompare(b.monat));

    if (!cleaned.length) return null;

    const nowKey = monthKeyFromDate(new Date());
    let curIdx = cleaned.findIndex(x=>x.monat===nowKey);
    if (curIdx < 0) curIdx = cleaned.length - 1;

    // slice 6 months back incl current
    const start = Math.max(0, curIdx - 5);
    const hist = cleaned.slice(start, curIdx + 1);

    // try to read future 3 months from sheet if exists
    const wantedF1 = addMonths(cleaned[curIdx].monat, 1);
    const wantedF2 = addMonths(cleaned[curIdx].monat, 2);
    const wantedF3 = addMonths(cleaned[curIdx].monat, 3);

    const lookup = new Map(cleaned.map(x=>[x.monat,x]));
    const futureRows = [lookup.get(wantedF1), lookup.get(wantedF2), lookup.get(wantedF3)];

    const hasFuture = futureRows.every(r=>r && r[field] != null);

    const histVals = hist.map(x=>parseNumberSmart(x[field]) ?? 0);

    let futureVals;
    if (hasFuture) {
      futureVals = futureRows.map(x=>parseNumberSmart(x[field]) ?? 0);
    } else {
      futureVals = linearForecast(histVals.slice(-3), 3);
    }

    const points = [];
    hist.forEach(x=>{
      points.push({ month: x.monat, value: parseNumberSmart(x[field]) ?? 0, kind: "past_or_current" });
    });

    // append 3 forecast points
    const baseMonth = cleaned[curIdx].monat;
    for (let i=1;i<=3;i++){
      points.push({ month: addMonths(baseMonth,i), value: futureVals[i-1] ?? 0, kind: "future" });
    }

    // trend for future coloring: compare last forecast vs current
    const currentVal = points.find(p=>p.month===baseMonth)?.value ?? 0;
    const lastVal = points[points.length-1]?.value ?? currentVal;
    const trendUp = lastVal >= currentVal;

    return { points, currentMonth: baseMonth, trendUp };
  }

  function barsHTML(series){
    const vals = series.points.map(p => Math.abs(p.value ?? 0));
    const max = Math.max(1, ...vals);

    return series.points.map((p) => {
      const h = Math.max(8, Math.round((Math.abs(p.value ?? 0) / max) * 100));
      let state = "past";
      if (p.month === series.currentMonth) state = "current";
      else if (p.month > series.currentMonth) state = series.trendUp ? "future_up" : "future_down";

      return `<div class="hkpi-col" data-state="${state}" title="${p.month}">
        <i style="height:${h}%;"></i>
      </div>`;
    }).join("");
  }

  function avgLastN(rows, field, n){
    const cleaned = rows
      .map(normalizeHomeRow)
      .filter(x => x && x.monat)
      .sort((a,b)=>a.monat.localeCompare(b.monat));

    const take = cleaned.slice(Math.max(0, cleaned.length - n));
    if (!take.length) return 0;
    return take.reduce((acc,x)=>acc + (parseNumberSmart(x[field]) || 0), 0) / take.length;
  }

  function sumYear(rows, field, year){
    const y = String(year);
    return rows
      .map(normalizeHomeRow)
      .filter(x => x && x.monat && x.monat.startsWith(y + "-"))
      .reduce((acc,x)=>acc + (parseNumberSmart(x[field]) || 0), 0);
  }

  function latest(rows, field){
    const cleaned = rows
      .map(normalizeHomeRow)
      .filter(x => x && x.monat)
      .sort((a,b)=>a.monat.localeCompare(b.monat));
    const last = cleaned[cleaned.length-1];
    return last ? (parseNumberSmart(last[field]) || 0) : 0;
  }

  function computeROI(rows){
    const year = new Date().getFullYear();
    const yearCash = sumYear(rows, "cashflow", year);
    const invested = latest(rows, "investiertes_kapital");
    if (!invested) return 0;
    return (yearCash / invested) * 100;
  }

  // ---------- render ----------
  function render(mountEl){
    const root = mountEl || document.getElementById("homeKpisModul");
    if (!root) return;

    const badgeEl = root.querySelector("#hkpiBadge");
    const statusEl = root.querySelector("#hkpiStatus");
    const emptyEl = root.querySelector("#hkpiEmpty");
    const gridEl = root.querySelector("#hkpiGrid");

    function setStatus(txt, ok){
      if (statusEl) statusEl.textContent = txt;
      const dot = root.querySelector(".hkpi-dot");
      if (dot) {
        dot.style.background = ok ? "rgba(34,197,94,.95)" : "rgba(239,68,68,.95)";
        dot.style.boxShadow = ok ? "0 0 0 4px rgba(34,197,94,.12)" : "0 0 0 4px rgba(239,68,68,.12)";
      }
    }

    const data = getGlobalData();
    const rawRows = extractHomeRows(data);

    if (!rawRows || !rawRows.length){
      if (gridEl) gridEl.innerHTML = "";
      if (emptyEl) emptyEl.style.display = "block";
      if (badgeEl) badgeEl.textContent = "HOME_KPI: 0";
      setStatus("Keine HOME_KPI Daten gefunden.", false);
      return;
    }

    const rows = rawRows.map(normalizeHomeRow).filter(r=>r && r.monat);
    if (!rows.length){
      if (gridEl) gridEl.innerHTML = "";
      if (emptyEl) emptyEl.style.display = "block";
      if (badgeEl) badgeEl.textContent = "HOME_KPI: 0";
      setStatus("HOME_KPI vorhanden, aber Monatsformat nicht erkannt (YYYY-MM).", false);
      return;
    }

    if (emptyEl) emptyEl.style.display = "none";
    if (badgeEl) badgeEl.textContent = `HOME_KPI: ${rows.length}`;

    const year = new Date().getFullYear();

    const sCash   = buildSeries(rows, "cashflow");
    const sMiete  = buildSeries(rows, "mieteinnahmen");
    const sPacht  = buildSeries(rows, "pachteinnahmen");
    const sAusl   = buildSeries(rows, "auslastung_pct");

    // fallback if something missing
    if (!sCash || !sMiete || !sPacht || !sAusl){
      if (gridEl) gridEl.innerHTML = "";
      if (emptyEl) emptyEl.style.display = "block";
      setStatus("KPI-Reihen konnten nicht aufgebaut werden (fehlende Spalten?).", false);
      return;
    }

    const currentMonth = sCash.currentMonth;

    const currentCash  = sCash.points.find(p=>p.month===currentMonth)?.value ?? 0;
    const currentMiete = sMiete.points.find(p=>p.month===currentMonth)?.value ?? 0;
    const currentPacht = sPacht.points.find(p=>p.month===currentMonth)?.value ?? 0;
    const currentAusl  = sAusl.points.find(p=>p.month===currentMonth)?.value ?? 0;

    const yearCash = sumYear(rows, "cashflow", year);
    const roi = computeROI(rows);

    const avgMiete6 = avgLastN(rows, "mieteinnahmen", 6);
    const avgPacht6 = avgLastN(rows, "pachteinnahmen", 6);
    const avgAusl6  = avgLastN(rows, "auslastung_pct", 6);

    const cards = [
      {
        title: "Monats-Cashflow",
        sub: `${currentMonth} · 6M + 3M`,
        value: formatEuro(currentCash),
        delta: `YTD ${year}: ${formatEuro(yearCash)}`,
        series: sCash,
        isPercent: false
      },
      {
        title: "Jahres-Cashflow",
        sub: `Summe ${year} (YTD)`,
        value: formatEuro(yearCash),
        delta: `Ø/Monat: ${formatEuro(yearCash / Math.max(1, (new Date().getMonth()+1)))}`,
        series: sCash,
        isPercent: false
      },
      {
        title: "Mieteinnahmen / Monat",
        sub: `${currentMonth} · Ist/Forecast`,
        value: formatEuro(currentMiete),
        delta: `Ø 6M: ${formatEuro(avgMiete6)}`,
        series: sMiete,
        isPercent: false
      },
      {
        title: "Pachteinnahmen / Monat",
        sub: `${currentMonth} · Ist/Forecast`,
        value: formatEuro(currentPacht),
        delta: `Ø 6M: ${formatEuro(avgPacht6)}`,
        series: sPacht,
        isPercent: false
      },
      {
        title: "Auslastung",
        sub: `${currentMonth} · Ziel hoch`,
        value: formatPercent(currentAusl),
        delta: `Ø 6M: ${formatPercent(avgAusl6)}`,
        series: sAusl,
        isPercent: true
      },
      {
        title: "Portfolio ROI",
        sub: `${year} (approx)`,
        value: formatPercent(roi),
        delta: `Jahres-CF / invest. Kapital`,
        series: sCash,
        isPercent: true
      }
    ];

    gridEl.innerHTML = cards.map(c=>{
      const first = c.series.points[0]?.month || "";
      const last  = c.series.points[c.series.points.length-1]?.month || "";
      return `
        <div class="hkpi-tile">
          <div class="hkpi-top">
            <div style="min-width:0">
              <div class="hkpi-name">${c.title}</div>
              <div class="hkpi-desc">${c.sub}</div>
            </div>
            <div class="hkpi-val">
              <div class="v">${c.value}</div>
              <div class="d">${c.delta}</div>
            </div>
          </div>

          <div class="hkpi-spark">
            <div class="hkpi-bars">${barsHTML(c.series)}</div>
            <div class="hkpi-labels">
              <span>${first}</span>
              <span>${last}</span>
            </div>
          </div>
        </div>
      `;
    }).join("");

    setStatus("KPIs geladen.", true);
  }

  // Public API
  window.HomeKpisModul = {
    render: function(mountEl){
      try { render(mountEl); }
      catch(e){
        const root = mountEl || document.getElementById("homeKpisModul");
        if (root) {
          const grid = root.querySelector("#hkpiGrid");
          const status = root.querySelector("#hkpiStatus");
          if (grid) grid.innerHTML = "";
          if (status) status.textContent = "KPI Fehler: " + String(e && e.message ? e.message : e);
        }
      }
    }
  };
})();
