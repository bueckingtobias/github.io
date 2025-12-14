(function(){
  "use strict";

  /* ============================================================
     Robust Home KPI Modul
     - liest ausschließlich window.IMMO_DATA.home (Array)
     - unterstützt viele Spaltennamen (Monat/Cashflow/Mieten/Pacht/Auslastung/Portfolio/Invest)
     - 6 Monate Rückblick + 3 Monate Forecast
     - aktueller Monat blau, Vergangenheit grau, Forecast grün/rot je nach Trend
     ============================================================ */

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

    // remove currency and spaces, keep digits, separators, sign
    let s = s0.replace(/\s/g,"").replace(/€/g,"");
    // sometimes "1.234,56 €" or "1,234.56"
    const hasComma = s.includes(",");
    const hasDot = s.includes(".");
    if (hasComma && hasDot) {
      const lc = s.lastIndexOf(",");
      const ld = s.lastIndexOf(".");
      if (lc > ld) s = s.replace(/\./g,"").replace(",","."); // de style
      else s = s.replace(/,/g,"");                           // en style
    } else if (hasComma && !hasDot) {
      s = s.replace(",",".");
    }
    // strip remaining non numeric except dot and minus
    s = s.replace(/[^0-9.\-]/g,"");
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

  function parseMonthKeyAny(v){
    if (v == null) return "";
    if (v instanceof Date && !isNaN(v)) return monthKeyFromDate(v);

    const s = String(v).trim();
    if (!s) return "";

    // Already YYYY-MM
    if (/^\d{4}-\d{2}$/.test(s)) return s;

    // "MM.YYYY"
    const a = s.match(/^(\d{1,2})\.(\d{4})$/);
    if (a){
      const mm = String(a[1]).padStart(2,"0");
      return `${a[2]}-${mm}`;
    }

    // "YYYY.MM"
    const b = s.match(/^(\d{4})\.(\d{1,2})$/);
    if (b){
      const mm = String(b[2]).padStart(2,"0");
      return `${b[1]}-${mm}`;
    }

    // Excel-exported date string e.g. "2025-12-01", "01.12.2025"
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
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
    const d = new Date(y, (m-1) + add, 1);
    return monthKeyFromDate(d);
  }

  function safeArray(x){ return Array.isArray(x) ? x : []; }

  // ---------- data ----------
  function getHomeRows(){
    const d = window.IMMO_DATA;
    if (d && Array.isArray(d.home)) return d.home;
    return [];
  }

  function getValueByKeys(row, keys){
    // keys: array of possible header variants (already normalized)
    if (!row || typeof row !== "object") return null;

    // Build normalized map once
    const map = {};
    for (const k of Object.keys(row)){
      map[normalizeKey(k)] = row[k];
    }

    for (const k of keys){
      if (k in row) return row[k]; // exact
      const nk = normalizeKey(k);
      if (nk in map) return map[nk];
    }
    return null;
  }

  function normalizeRow(row){
    // accept many header variants
    const monatRaw = getValueByKeys(row, [
      "Monat","mon","month","Datum","Date","Zeitraum","Periode","Period"
    ]);

    const cashRaw = getValueByKeys(row, [
      "Cashflow","Monats-Cashflow","Monats Cashflow","Monatscashflow","Monthly Cashflow","CF",
      "Cash Flow","Netto Cashflow","Net Cashflow"
    ]);

    const mieteRaw = getValueByKeys(row, [
      "Mieteinnahmen","Mieteinnahmen pro Monat","Mieteinnahmen/Monat","Mieteinnahmen (€)","Miete","Rent"
    ]);

    const pachtRaw = getValueByKeys(row, [
      "Pachteinnahmen","Pachteinnahmen pro Monat","Pachteinnahmen/Monat","Pacht","Lease","Pacht (€)"
    ]);

    const auslRaw = getValueByKeys(row, [
      "Auslastung","Auslastung %","Auslastung_%","Belegung","Occupancy","Occupancy %"
    ]);

    const portValRaw = getValueByKeys(row, [
      "Portfolio Wert","Portfolio_Wert","Portfoliowert","Portfolio Value","Market Value","Wert"
    ]);

    const investRaw = getValueByKeys(row, [
      "Investiertes Kapital","investiertes_kapital","Invest","Capital Invested","Equity"
    ]);

    const monat = parseMonthKeyAny(monatRaw);

    // parse percent: if "0.95" interpret as 95? we decide:
    let ausl = parseNumberSmart(auslRaw);
    if (ausl != null && ausl > 0 && ausl <= 1) ausl = ausl * 100;

    return {
      monat,
      cashflow: parseNumberSmart(cashRaw) ?? 0,
      mieteinnahmen: parseNumberSmart(mieteRaw) ?? 0,
      pachteinnahmen: parseNumberSmart(pachtRaw) ?? 0,
      auslastung_pct: ausl ?? 0,
      portfolio_wert: parseNumberSmart(portValRaw) ?? 0,
      investiertes_kapital: parseNumberSmart(investRaw) ?? 0
    };
  }

  // ---------- forecasting ----------
  function linearForecast(lastVals, steps){
    const vals = lastVals.filter(v => Number.isFinite(v));
    if (!vals.length) return Array.from({length:steps}, ()=>0);
    if (vals.length === 1) return Array.from({length:steps}, ()=>vals[0]);

    const use = vals.slice(-3);
    const n = use.length;
    const slope = (use[n-1] - use[0]) / Math.max(1, (n-1));
    const base = use[n-1];
    return Array.from({length:steps}, (_,i)=>base + slope*(i+1));
  }

  function buildSeries(rows, field){
    const cleaned = rows
      .map(normalizeRow)
      .filter(x => x && x.monat)
      .sort((a,b)=>a.monat.localeCompare(b.monat));

    if (!cleaned.length) return null;

    const nowKey = monthKeyFromDate(new Date());
    let curIdx = cleaned.findIndex(x=>x.monat===nowKey);
    if (curIdx < 0) curIdx = cleaned.length - 1;

    const start = Math.max(0, curIdx - 5);
    const hist = cleaned.slice(start, curIdx + 1);

    const baseMonth = cleaned[curIdx].monat;

    const histVals = hist.map(x => Number.isFinite(x[field]) ? x[field] : 0);
    const futureVals = linearForecast(histVals.slice(-3), 3);

    const points = [];
    hist.forEach(x=>{
      points.push({ month: x.monat, value: x[field] ?? 0, kind: "past_or_current" });
    });

    for (let i=1;i<=3;i++){
      points.push({ month: addMonths(baseMonth,i), value: futureVals[i-1] ?? 0, kind: "future" });
    }

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

  function sumYear(rows, field, year){
    const y = String(year);
    return rows
      .map(normalizeRow)
      .filter(x => x && x.monat && x.monat.startsWith(y + "-"))
      .reduce((acc,x)=>acc + (Number.isFinite(x[field]) ? x[field] : 0), 0);
  }

  function avgLastN(rows, field, n){
    const cleaned = rows
      .map(normalizeRow)
      .filter(x => x && x.monat)
      .sort((a,b)=>a.monat.localeCompare(b.monat));

    const take = cleaned.slice(Math.max(0, cleaned.length - n));
    if (!take.length) return 0;
    return take.reduce((acc,x)=>acc + (Number.isFinite(x[field]) ? x[field] : 0), 0) / take.length;
  }

  function latest(rows, field){
    const cleaned = rows
      .map(normalizeRow)
      .filter(x => x && x.monat)
      .sort((a,b)=>a.monat.localeCompare(b.monat));
    const last = cleaned[cleaned.length-1];
    return last ? (Number.isFinite(last[field]) ? last[field] : 0) : 0;
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
    const root = mountEl || document.getElementById("homeKpisModul") || document.querySelector(".home-kpis-modul");
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

    const rawRows = getHomeRows();

    if (!rawRows.length){
      if (gridEl) gridEl.innerHTML = "";
      if (emptyEl) emptyEl.style.display = "block";
      if (badgeEl) badgeEl.textContent = "HOME: 0";
      setStatus("Keine Home KPI Daten gefunden.", false);
      return;
    }

    // Normalize and filter valid months
    const rows = rawRows.map(normalizeRow).filter(r => r && r.monat);
    if (!rows.length){
      if (gridEl) gridEl.innerHTML = "";
      if (emptyEl) emptyEl.style.display = "block";
      if (badgeEl) badgeEl.textContent = `HOME: ${rawRows.length}`;
      setStatus("Home KPI Daten vorhanden, aber Monatsformat nicht erkannt (empfohlen: YYYY-MM).", false);
      return;
    }

    if (emptyEl) emptyEl.style.display = "none";
    if (badgeEl) badgeEl.textContent = `HOME: ${rows.length}`;

    // Series
    const sCash  = buildSeries(rows, "cashflow");
    const sMiete = buildSeries(rows, "mieteinnahmen");
    const sPacht = buildSeries(rows, "pachteinnahmen");
    const sAusl  = buildSeries(rows, "auslastung_pct");

    if (!sCash || !sMiete || !sPacht || !sAusl){
      if (gridEl) gridEl.innerHTML = "";
      if (emptyEl) emptyEl.style.display = "block";
      setStatus("KPI-Reihen konnten nicht aufgebaut werden (fehlende Spalten?).", false);
      return;
    }

    const year = new Date().getFullYear();
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
        valueFmt: "euro"
      },
      {
        title: "Jahres-Cashflow",
        sub: `Summe ${year} (YTD)`,
        value: formatEuro(yearCash),
        delta: `Ø/Monat: ${formatEuro(yearCash / Math.max(1, (new Date().getMonth()+1)))}`,
        series: sCash,
        valueFmt: "euro"
      },
      {
        title: "Mieteinnahmen / Monat",
        sub: `${currentMonth} · Ist/Forecast`,
        value: formatEuro(currentMiete),
        delta: `Ø 6M: ${formatEuro(avgMiete6)}`,
        series: sMiete,
        valueFmt: "euro"
      },
      {
        title: "Pachteinnahmen / Monat",
        sub: `${currentMonth} · Ist/Forecast`,
        value: formatEuro(currentPacht),
        delta: `Ø 6M: ${formatEuro(avgPacht6)}`,
        series: sPacht,
        valueFmt: "euro"
      },
      {
        title: "Auslastung",
        sub: `${currentMonth} · Ziel hoch`,
        value: formatPercent(currentAusl),
        delta: `Ø 6M: ${formatPercent(avgAusl6)}`,
        series: sAusl,
        valueFmt: "pct"
      },
      {
        title: "Portfolio ROI",
        sub: `${year} (approx)`,
        value: formatPercent(roi),
        delta: `Jahres-CF / invest. Kapital`,
        series: sCash,
        valueFmt: "pct"
      }
    ];

    const first = sCash.points[0]?.month || "";
    const last  = sCash.points[sCash.points.length-1]?.month || "";

    gridEl.innerHTML = cards.map(c=>{
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
        const root = mountEl || document.getElementById("homeKpisModul") || document.querySelector(".home-kpis-modul");
        if (root) {
          const grid = root.querySelector("#hkpiGrid");
          const status = root.querySelector("#hkpiStatus");
          const badge = root.querySelector("#hkpiBadge");
          if (grid) grid.innerHTML = "";
          if (badge) badge.textContent = "HOME: ?";
          if (status) status.textContent = "KPI Fehler: " + String(e && e.message ? e.message : e);
        }
      }
    }
  };

  // Optional: wenn Loader Event feuert
  window.addEventListener("immo:data-ready", function(){
    const host = document.getElementById("kpisHost") || document.querySelector(".home-kpis-modul");
    if (host && window.HomeKpisModul && typeof window.HomeKpisModul.render === "function") {
      window.HomeKpisModul.render(host);
    }
  });
})();
