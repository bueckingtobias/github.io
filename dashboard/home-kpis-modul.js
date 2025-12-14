/* home-kpi-modul.js
   Renders 6 KPI cards (2x3) from existing loader data.
   Works with multiple loader globals:
   - window.IMMO_DATA
   - window.DASHBOARD (data)
   - window.DASHBOARD_DATA
   - window.dashboardData
*/

(function(){
  "use strict";

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
      else s = s.replace(/,/g,""); // en
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

  // ---- Adapter to fetch HOME KPI rows regardless of loader format ----
  function getAllData(){
    // 1) Newer loaders
    if (window.DASHBOARD && window.DASHBOARD.data) return window.DASHBOARD.data;
    if (window.DASHBOARD_DATA) return window.DASHBOARD_DATA;
    if (window.dashboardData) return window.dashboardData;

    // 2) Older / your setup
    if (window.IMMO_DATA) return window.IMMO_DATA;

    return null;
  }

  // Try to find rows either as:
  // - data.home_kpi (already normalized)
  // - data.homeKpi / data.homeKPI
  // - data.sheets["HOME_KPI"] / data.sheets.HOME_KPI
  // - data.HOME_KPI
  function getHomeRows(data){
    if (!data) return [];

    // normalized
    if (Array.isArray(data.home_kpi)) return data.home_kpi;
    if (Array.isArray(data.homeKpi)) return data.homeKpi;
    if (Array.isArray(data.homeKPI)) return data.homeKPI;

    if (data.sheets) {
      if (Array.isArray(data.sheets.HOME_KPI)) return data.sheets.HOME_KPI;
      if (Array.isArray(data.sheets["HOME_KPI"])) return data.sheets["HOME_KPI"];
      if (Array.isArray(data.sheets.home_kpi)) return data.sheets.home_kpi;
    }

    if (Array.isArray(data.HOME_KPI)) return data.HOME_KPI;
    if (Array.isArray(data["HOME_KPI"])) return data["HOME_KPI"];

    // Some loaders store as objects like { HOME_KPI: {rows:[...] } }
    if (data.HOME_KPI && Array.isArray(data.HOME_KPI.rows)) return data.HOME_KPI.rows;

    return [];
  }

  function normalizeHomeRow(r){
    // accept already-normalized keys OR raw excel headers
    const obj = {};
    if (!r || typeof r !== "object") return null;

    // If keys are already normalized:
    if ("monat" in r && ("cashflow" in r || "mieteinnahmen" in r)) {
      return {
        monat: String(r.monat||"").trim(),
        cashflow: parseNumberSmart(r.cashflow),
        mieteinnahmen: parseNumberSmart(r.mieteinnahmen),
        pachteinnahmen: parseNumberSmart(r.pachteinnahmen),
        auslastung_pct: parseNumberSmart(r.auslastung_pct ?? r["auslastung_%"] ?? r.auslastung_),
        portfolio_wert: parseNumberSmart(r.portfolio_wert),
        investiertes_kapital: parseNumberSmart(r.investiertes_kapital),
      };
    }

    // Otherwise map from any header names
    const keys = Object.keys(r);
    keys.forEach(k => obj[normalizeKey(k)] = r[k]);

    return {
      monat: String(obj.monat || obj.month || obj.monatswert || "").trim(),
      cashflow: parseNumberSmart(obj.cashflow),
      mieteinnahmen: parseNumberSmart(obj.mieteinnahmen),
      pachteinnahmen: parseNumberSmart(obj.pachteinnahmen),
      auslastung_pct: parseNumberSmart(obj.auslastung_ || obj.auslastung_pct || obj.auslastung),
      portfolio_wert: parseNumberSmart(obj.portfolio_wert),
      investiertes_kapital: parseNumberSmart(obj.investiertes_kapital),
    };
  }

  function buildSeries(rows, field){
    // rows expected chronological; filter valid months
    const cleaned = rows
      .map(normalizeHomeRow)
      .filter(x => x && x.monat && /^\d{4}-\d{2}$/.test(x.monat))
      .sort((a,b)=>a.monat.localeCompare(b.monat));

    // pick last 6 months + current + next 3 if available (total 9 points)
    // We assume the sheet already contains the next 3 months forecast rows.
    // If not, we still show what exists.
    const nowKey = monthKeyFromDate(new Date());
    // Find current in list; if not present, use last available as "current"
    let curIdx = cleaned.findIndex(x=>x.monat===nowKey);
    if (curIdx < 0) curIdx = cleaned.length - 1;

    const start = Math.max(0, curIdx - 5);
    const end = Math.min(cleaned.length - 1, curIdx + 3);
    const slice = cleaned.slice(start, end + 1);

    const values = slice.map(x => ({
      month: x.monat,
      value: parseNumberSmart(x[field]),
    }));

    // determine future trend vs current (for future color)
    const currentPoint = values.find(v => v.month === (cleaned[curIdx]?.monat || nowKey)) || values[values.length-1];
    const currentValue = currentPoint ? (currentPoint.value ?? 0) : 0;
    const lastValue = values[values.length-1] ? (values[values.length-1].value ?? 0) : currentValue;
    const trendUp = lastValue >= currentValue;

    return { values, nowKey: cleaned[curIdx]?.monat || nowKey, trendUp };
  }

  function makeBarsHTML(series){
    const vals = series.values.map(v => (Number.isFinite(v.value) ? v.value : 0));
    const max = Math.max(1, ...vals.map(v => Math.abs(v)));

    return series.values.map((p) => {
      const h = Math.max(8, Math.round((Math.abs((p.value ?? 0)) / max) * 100));
      let state = "past";
      if (p.month === series.nowKey) state = "current";
      else if (p.month > series.nowKey) state = series.trendUp ? "future_up" : "future_down";

      return `<div class="spark-col" data-state="${state}" title="${p.month}">
        <i style="height:${h}%;"></i>
      </div>`;
    }).join("");
  }

  function sumForYear(rows, field, year){
    const y = String(year);
    return rows
      .map(normalizeHomeRow)
      .filter(x => x && x.monat && x.monat.startsWith(y+"-"))
      .reduce((acc,x)=>acc + (parseNumberSmart(x[field]) || 0), 0);
  }

  function avgLastN(rows, field, n){
    const cleaned = rows
      .map(normalizeHomeRow)
      .filter(x => x && x.monat && /^\d{4}-\d{2}$/.test(x.monat))
      .sort((a,b)=>a.monat.localeCompare(b.monat));

    const take = cleaned.slice(Math.max(0, cleaned.length - n));
    if (!take.length) return 0;
    const s = take.reduce((acc,x)=>acc + (parseNumberSmart(x[field]) || 0), 0);
    return s / take.length;
  }

  function latestValue(rows, field){
    const cleaned = rows
      .map(normalizeHomeRow)
      .filter(x => x && x.monat && /^\d{4}-\d{2}$/.test(x.monat))
      .sort((a,b)=>a.monat.localeCompare(b.monat));
    const last = cleaned[cleaned.length-1];
    return last ? (parseNumberSmart(last[field]) || 0) : 0;
  }

  function computePortfolioROI(rows){
    // ROI p.a. approx = (Jahres-Cashflow / investiertes_kapital) * 100
    const year = new Date().getFullYear();
    const yearCash = sumForYear(rows, "cashflow", year);
    const invested = latestValue(rows, "investiertes_kapital");
    if (!invested) return 0;
    return (yearCash / invested) * 100;
  }

  function renderInto(el){
    const data = getAllData();
    const rows = getHomeRows(data);

    if (!rows || !rows.length){
      el.innerHTML = `
        <div class="kpi-empty">
          Keine KPI-Daten gefunden (HOME_KPI).<br/>
          Check: Excel Loader liefert HOME_KPI? (Sheetname exakt) und enthält Zeilen (Monat = YYYY-MM).
        </div>`;
      el.dataset.rendered = "1";
      return;
    }

    // Build KPI definitions (6 tiles, 2 columns x 3 rows)
    const seriesCash = buildSeries(rows, "cashflow");
    const seriesMonatMiete = buildSeries(rows, "mieteinnahmen");
    const seriesMonatPacht = buildSeries(rows, "pachteinnahmen");
    const seriesAuslast = buildSeries(rows, "auslastung_pct");
    const roi = computePortfolioROI(rows);
    const seriesROI = buildSeries(rows, "cashflow"); // spark based on cashflow trend for ROI card

    const year = new Date().getFullYear();
    const yearCash = sumForYear(rows, "cashflow", year);

    const currentCash = seriesCash.values.find(v=>v.month===seriesCash.nowKey)?.value ?? 0;
    const currentMiete = seriesMonatMiete.values.find(v=>v.month===seriesMonatMiete.nowKey)?.value ?? 0;
    const currentPacht = seriesMonatPacht.values.find(v=>v.month===seriesMonatPacht.nowKey)?.value ?? 0;
    const currentAuslast = seriesAuslast.values.find(v=>v.month===seriesAuslast.nowKey)?.value ?? 0;

    const avgAuslast6 = avgLastN(rows, "auslastung_pct", 6);

    const cards = [
      {
        title: "Monats-Cashflow",
        sub: `${seriesCash.nowKey} · 6M Rückblick + 3M Forecast`,
        value: formatEuro(currentCash),
        delta: `Jahr ${year}: ${formatEuro(yearCash)}`,
        bars: makeBarsHTML(seriesCash),
        labels: `${seriesCash.values[0].month} … ${seriesCash.values[seriesCash.values.length-1].month}`
      },
      {
        title: "Jahres-Cashflow",
        sub: `Summe ${year} (YTD)`,
        value: formatEuro(yearCash),
        delta: `Ø Monat: ${formatEuro(yearCash / Math.max(1, new Date().getMonth()+1))}`,
        bars: makeBarsHTML(buildSeries(rows, "cashflow")),
        labels: `${seriesCash.values[0].month} … ${seriesCash.values[seriesCash.values.length-1].month}`
      },
      {
        title: "Mieteinnahmen / Monat",
        sub: `${seriesMonatMiete.nowKey} · Ist/Forecast`,
        value: formatEuro(currentMiete),
        delta: `Ø 6M: ${formatEuro(avgLastN(rows,"mieteinnahmen",6))}`,
        bars: makeBarsHTML(seriesMonatMiete),
        labels: `${seriesMonatMiete.values[0].month} … ${seriesMonatMiete.values[seriesMonatMiete.values.length-1].month}`
      },
      {
        title: "Pachteinnahmen / Monat",
        sub: `${seriesMonatPacht.nowKey} · Ist/Forecast`,
        value: formatEuro(currentPacht),
        delta: `Ø 6M: ${formatEuro(avgLastN(rows,"pachteinnahmen",6))}`,
        bars: makeBarsHTML(seriesMonatPacht),
        labels: `${seriesMonatPacht.values[0].month} … ${seriesMonatPacht.values[seriesMonatPacht.values.length-1].month}`
      },
      {
        title: "Auslastung",
        sub: `${seriesAuslast.nowKey} · Ziel leerstandsfrei`,
        value: formatPercent(currentAuslast),
        delta: `Ø 6M: ${formatPercent(avgAuslast6)}`,
        bars: makeBarsHTML(seriesAuslast),
        labels: `${seriesAuslast.values[0].month} … ${seriesAuslast.values[seriesAuslast.values.length-1].month}`
      },
      {
        title: "Portfolio ROI",
        sub: `${year} (approx)`,
        value: formatPercent(roi),
        delta: `Basis: Jahres-Cashflow / investiertes Kapital`,
        bars: makeBarsHTML(seriesROI),
        labels: `${seriesROI.values[0].month} … ${seriesROI.values[seriesROI.values.length-1].month}`
      }
    ];

    el.innerHTML = `
      <div class="home-kpi-wrap">
        ${cards.map(c => `
          <div class="kpi-card">
            <div class="kpi-head">
              <div style="min-width:0">
                <div class="kpi-title">${c.title}</div>
                <div class="kpi-sub">${c.sub}</div>
              </div>
              <div class="kpi-value">
                <div class="v">${c.value}</div>
                <div class="d">${c.delta}</div>
              </div>
            </div>

            <div class="kpi-spark">
              <div class="spark-bars">${c.bars}</div>
              <div class="spark-labels">
                <span>${c.labels.split(" … ")[0]}</span>
                <span>${c.labels.split(" … ")[1]}</span>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `;

    el.dataset.rendered = "1";
  }

  window.HomeKpiModul = {
    render: function(mountEl){
      try{
        renderInto(mountEl);
      }catch(e){
        mountEl.innerHTML = `<div class="kpi-empty">KPI Modul Fehler: ${String(e && e.message ? e.message : e)}</div>`;
        mountEl.dataset.rendered = "1";
      }
    }
  };
})();
