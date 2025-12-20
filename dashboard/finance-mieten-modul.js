/* finance-mieten-modul.js
   Reads from:
   - data.financeRows / data.homeRows (if passed)
   - OR window.IMMO_DATA.home + window.IMMO_DATA.finance.mieten
   Requirements:
   - 6M past incl current + 3M forecast
   - Stacked bars: Miete + Pacht
*/

(function(){
  "use strict";

  window.FinanceMietenModul = { render };

  function render(host, data){
    const root = host.querySelector(".finance-mieten-root") || host;
    const barsEl = root.querySelector("#fmBars");
    const rangeEl = root.querySelector("#fmRange");
    const dueEl = root.querySelector("#fmDue");
    const nowEl = root.querySelector("#fmNow");
    const avgEl = root.querySelector("#fmAvg");
    const occEl = root.querySelector("#fmOcc");
    const yMaxEl = root.querySelector("#fmYMax");
    const yMinEl = root.querySelector("#fmYMin");
    const footEl = root.querySelector("#fmFootnote");
    const legForecast = root.querySelector("#fmLegForecast");

    const homeRows = pickHome(data);
    const series = buildSeries(homeRows);

    if (!series.length){
      if (barsEl) barsEl.innerHTML = `<div style="color:rgba(226,232,240,.75);font-size:12px;">Keine Mietdaten.</div>`;
      safeText(rangeEl, "—");
      safeText(dueEl, "—");
      safeText(nowEl, "—");
      safeText(avgEl, "—");
      safeText(occEl, "—");
      safeText(yMaxEl, "—");
      safeText(yMinEl, "0");
      return;
    }

    // Due date: next 1st
    const due = nextFirst();
    safeText(dueEl, `${fmtDate(due)} · ${daysUntil(due)} Tage`);

    // Stats
    const past6 = series.filter(p => !p.isForecast);
    const nowPoint = past6[past6.length - 1];
    const sumsPast = past6.map(p => p.total);
    const avg6 = avg(sumsPast);

    safeText(rangeEl, `${labelMonth(series[0].month)} – ${labelMonth(series[series.length-1].month)}`);
    safeText(nowEl, eur(nowPoint.total));
    safeText(avgEl, eur(avg6));
    safeText(occEl, (nowPoint.occ != null ? (String(nowPoint.occ).replace(".", ",") + " %") : "—"));
    if (legForecast) legForecast.textContent = "Forecast (3M)";

    // Forecast direction based on past6 total slope
    const slope = trendSlope(sumsPast);
    const fcDir = slope >= 0 ? "up" : "down";

    // Scale (always positive)
    const maxV = Math.max(...series.map(p => p.total));
    const pad = Math.max(1, Math.round(maxV * 0.08));
    const top = maxV + pad;
    safeText(yMaxEl, eur(top));
    safeText(yMinEl, "0");

    // Render stacked bars
    if (barsEl){
      barsEl.innerHTML = "";
      series.forEach(p => {
        const bar = document.createElement("div");
        bar.className = "fm-bar" + (p.isNow ? " is-now" : "") + (p.isForecast ? ` is-forecast ${fcDir}` : "");
        bar.dataset.month = p.month;

        const stack = document.createElement("div");
        stack.className = "fm-bar-stack";

        // heights relative to top
        const rentPct = top > 0 ? (p.rent / top * 100) : 0;
        const leasePct = top > 0 ? (p.lease / top * 100) : 0;

        // lease sits on top of rent: we implement by:
        // - rent segment from bottom with height rentPct
        // - lease segment from bottom with height (rent+lease) and different color, but we want visible split:
        // easiest: two segments with different bottom offsets.
        const rentSeg = document.createElement("div");
        rentSeg.className = "fm-seg rent";
        rentSeg.style.height = clamp(rentPct) + "%";
        rentSeg.style.bottom = "0%";

        const leaseSeg = document.createElement("div");
        leaseSeg.className = "fm-seg lease";
        leaseSeg.style.height = clamp(leasePct) + "%";
        leaseSeg.style.bottom = clamp(rentPct) + "%";

        const val = document.createElement("div");
        val.className = "fm-val";
        val.textContent = eur(p.total);

        const mon = document.createElement("div");
        mon.className = "fm-mon";
        mon.textContent = shortMon(p.month);

        stack.appendChild(rentSeg);
        stack.appendChild(leaseSeg);

        bar.appendChild(val);
        bar.appendChild(stack);
        bar.appendChild(mon);

        barsEl.appendChild(bar);
      });
    }

    // Footnote
    const nextFc = series.find(p => p.isForecast);
    if (footEl && nextFc){
      footEl.textContent =
        `Forecast (3M) wird als Trend aus den letzten 6 Monaten berechnet. Nächster Monat (Forecast): ${eur(nextFc.total)}.`;
    }
  }

  // ---------- helpers ----------

  function pickHome(data){
    if (data && Array.isArray(data.homeRows) && data.homeRows.length) return data.homeRows;
    if (Array.isArray(window.IMMO_DATA?.home) && window.IMMO_DATA.home.length) return window.IMMO_DATA.home;
    return [];
  }

  function buildSeries(homeRows){
    // Expect {Monat, Mieteinnahmen, Pachteinnahmen, Auslastung_pct}
    const clean = homeRows
      .map(r => ({
        month: String(r.Monat || r.month || "").trim(),
        rent: num(r.Mieteinnahmen),
        lease: num(r.Pachteinnahmen),
        occ: (r.Auslastung_pct != null ? num(r.Auslastung_pct) : (r["Auslastung_%"] != null ? num(r["Auslastung_%"]) : null))
      }))
      .filter(r => r.month && isYM(r.month))
      .sort((a,b)=> a.month.localeCompare(b.month));

    if (!clean.length) return [];

    const nowYM = toYM(new Date());
    let idxNow = clean.findIndex(x => x.month === nowYM);
    if (idxNow < 0) idxNow = clean.length - 1;

    const start = Math.max(0, idxNow - 5);
    const past = clean.slice(start, idxNow + 1).slice(-6);

    const totals = past.map(p => p.rent + p.lease);
    const slope = trendSlope(totals);
    const last = totals[totals.length - 1];

    const fc = [];
    for (let i=1;i<=3;i++){
      const total = Math.round(last + slope * i);
      // Keep split ratio from last month
      const lastRent = past[past.length-1].rent;
      const lastLease = past[past.length-1].lease;
      const sumLast = Math.max(1, lastRent + lastLease);
      const rentPart = Math.round(total * (lastRent / sumLast));
      const leasePart = Math.max(0, total - rentPart);

      fc.push({
        month: addMonths(past[past.length-1].month, i),
        rent: rentPart,
        lease: leasePart,
        occ: past[past.length-1].occ,
        isForecast: true
      });
    }

    const series = past.map((p,i)=>({
      month: p.month,
      rent: p.rent,
      lease: p.lease,
      total: p.rent + p.lease,
      occ: p.occ,
      isForecast:false,
      isNow: i === past.length - 1
    })).concat(fc.map(p=>({
      month:p.month,
      rent:p.rent,
      lease:p.lease,
      total:p.rent+p.lease,
      occ:p.occ,
      isForecast:true,
      isNow:false
    })));

    return series.slice(0,9);
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
  function clamp(v){ return Math.max(0, Math.min(100, v)); }
  function isYM(s){ return /^\d{4}-\d{2}$/.test(s); }
  function toYM(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
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

  function nextFirst(){
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth();
    const next = new Date(y, m + 1, 1);
    return next;
  }
  function fmtDate(d){
    return d.toLocaleDateString("de-DE",{ day:"2-digit", month:"2-digit", year:"numeric" });
  }
  function daysUntil(d){
    const now = new Date();
    const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return Math.max(0, Math.round((b - a) / 86400000));
  }
})();
