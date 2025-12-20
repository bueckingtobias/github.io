/* finance-mieten-modul.js
   - No negatives (axis from 0)
   - Each monthly bar stacked: Miete (top) + Pacht (bottom)
   - 6 months history (incl current) + 3 months forecast
   - Forecast color green/red depending on trend direction
   - Trend line stays inside the 9 bars only
*/
(function(){
  "use strict";

  window.FinanceMietenModul = { render };

  function render(host, data){
    if(!host) return;

    const mietenRows =
      (Array.isArray(window.IMMO_DATA?.finance?.mieten) && window.IMMO_DATA.finance.mieten) ||
      (Array.isArray(data?.mietenRows) && data.mietenRows) ||
      (Array.isArray(data?.financeRows) && data.financeRows) ||
      [];

    const homeRows =
      (Array.isArray(window.IMMO_DATA?.home) && window.IMMO_DATA.home) ||
      (Array.isArray(data?.homeRows) && data.homeRows) ||
      [];

    const root = host.querySelector(".fm-root") || host;
    const barsEl = root.querySelector("#fmBars");
    const badgesEl = root.querySelector("#fmBadges");

    if(!barsEl){
      host.textContent = "finance-mieten-modul.html fehlt oder wurde nicht geladen.";
      return;
    }

    const series = mietenRows
      .map(r => {
        const rent = toNum(r.Mieteinnahmen);
        const lease = toNum(r.Pachteinnahmen);
        const sum = toNum(r.Summe) || (rent + lease);
        return {
          Monat: String(r.Monat || "").trim(),
          Mieteinnahmen: rent,
          Pachteinnahmen: lease,
          Summe: Math.max(0, sum), // ✅ never negative
          Auslastung_pct: pickOcc(r, homeRows)
        };
      })
      .filter(r => isYM(r.Monat))
      .sort((a,b)=> a.Monat.localeCompare(b.Monat));

    if(series.length === 0){
      renderEmpty(root, "Keine Mieten/Pacht-Daten gefunden. Prüfe window.IMMO_DATA.finance.mieten (oder Master finance.mieten).");
      return;
    }

    const current = series[series.length - 1];
    const past6 = series.slice(Math.max(0, series.length - 6)); // incl current

    // Forecast 3 months by trend of Summe, and split rent/lease by last actual shares
    const forecast = buildForecastStacked(past6, 3);
    const combined = past6.concat(forecast);

    const slope = trendSlope(past6.map(x => x.Summe));
    const trendUp = slope >= 0;

    // Next rent date: next 01.
    const nextRent = nextRentDate();

    // UI nodes
    const rangeEl = root.querySelector("#fmRange");
    const nextEl  = root.querySelector("#fmNextRent");
    const nowSum  = root.querySelector("#fmNowSum");
    const nowSplit= root.querySelector("#fmNowSplit");
    const avgSum  = root.querySelector("#fmAvgSum");
    const occEl   = root.querySelector("#fmOcc");
    const trendEl = root.querySelector("#fmTrend");
    const nowRent = root.querySelector("#fmNowRent");
    const nowLease= root.querySelector("#fmNowLease");
    const foreTag = root.querySelector("#fmForeTag");
    const yMaxEl  = root.querySelector("#fmYMax");
    const noteEl  = root.querySelector("#fmNote");
    const linePath= root.querySelector("#fmLinePath");
    const lineDots= root.querySelector("#fmLineDots");

    const firstMonth = combined[0].Monat;
    const lastMonth  = combined[combined.length - 1].Monat;

    if(rangeEl) rangeEl.textContent = `${fmtYM(firstMonth)} – ${fmtYM(lastMonth)}`;

    if(nextEl){
      const days = daysUntil(nextRent);
      nextEl.textContent = `Nächste Fälligkeit: ${fmtDate(nextRent)} · ${days} Tage`;
    }

    if(nowSum) nowSum.textContent = fmtEuro(current.Summe);
    if(nowSplit) nowSplit.textContent = `Miete ${fmtEuro(current.Mieteinnahmen)} · Pacht ${fmtEuro(current.Pachteinnahmen)}`;

    const avg6 = avg(past6.map(x=>x.Summe));
    if(avgSum) avgSum.textContent = fmtEuro(Math.round(avg6));

    const occ = current.Auslastung_pct;
    if(occEl){
      occEl.textContent = (occ > 0)
        ? `Auslastung: ${fmtPct(occ)}`
        : `Auslastung: —`;
    }

    if(trendEl) trendEl.textContent = trendUp ? "Trend steigend" : "Trend fallend";
    if(nowRent) nowRent.textContent = fmtEuro(current.Mieteinnahmen);
    if(nowLease) nowLease.textContent = fmtEuro(current.Pachteinnahmen);
    if(foreTag) foreTag.textContent = trendUp ? "grün" : "rot";

    // Badges
    if(badgesEl){
      badgesEl.innerHTML = "";
      badgesEl.appendChild(badge(`Aktuell: ${fmtEuro(current.Summe)}`));
      badgesEl.appendChild(badge(`Ø6M: ${fmtEuro(Math.round(avg6))}`));
      badgesEl.appendChild(badge(`Forecast: ${trendUp ? "grün" : "rot"} (3M)`));
    }

    // Scale (0..max)
    const vals = combined.map(x => x.Summe);
    const maxVal = Math.max(1, ...vals);
    const scaleMax = maxVal * 1.12;

    if(yMaxEl) yMaxEl.textContent = fmtEuro(Math.round(scaleMax));

    // Render stacked bars
    barsEl.innerHTML = "";

    const points = []; // for trend line

    combined.forEach((r, idx) => {
      const isForecast = idx >= past6.length;
      const isNow = !isForecast && r.Monat === current.Monat;

      const col = document.createElement("div");
      col.className = "fm-col";

      const wrap = document.createElement("div");
      wrap.className = "fm-barwrap";

      const bar = document.createElement("div");
      bar.className = "fm-bar";
      if(isNow) bar.classList.add("now");
      else if(isForecast) bar.classList.add(trendUp ? "fore-up" : "fore-down");
      else bar.classList.add("past");

      const sum = Math.max(0, r.Summe);
      const hPct = clamp((sum / scaleMax) * 100, 0, 100);
      bar.style.height = hPct.toFixed(2) + "%";

      // Split heights inside the bar (rent+lease = sum)
      const rent = Math.max(0, toNum(r.Mieteinnahmen));
      const lease = Math.max(0, toNum(r.Pachteinnahmen));
      const denom = Math.max(1, rent + lease);

      const rentShare = clamp(rent / denom, 0, 1);
      const leaseShare = clamp(lease / denom, 0, 1);

      // Top segment (rent)
      const segRent = document.createElement("div");
      segRent.className = "fm-seg fm-seg-rent";
      segRent.style.flex = String(Math.max(0.05, rentShare));

      // Put value label on the top segment (visually best)
      const val = document.createElement("div");
      val.className = "fm-val";
      val.textContent = fmtEuro(sum);
      segRent.appendChild(val);

      // Bottom segment (lease)
      const segLease = document.createElement("div");
      segLease.className = "fm-seg fm-seg-lease";
      segLease.style.flex = String(Math.max(0.05, leaseShare));

      bar.appendChild(segRent);
      bar.appendChild(segLease);

      wrap.appendChild(bar);

      const m = document.createElement("div");
      m.className = "fm-month";
      m.textContent = shortYM(r.Monat);

      col.appendChild(wrap);
      col.appendChild(m);
      barsEl.appendChild(col);

      points.push({ value: sum, idx });
    });

    // Trend line (only across 9 bars) within the SVG viewBox
    if(linePath && lineDots){
      const W = 1000;
      const H = 360;

      const y = (v) => {
        // map 0..scaleMax to bottom..top inside plot
        const t = clamp(v / scaleMax, 0, 1);
        return (H - (t * H));
      };

      const n = points.length;
      const padX = 30;
      const span = W - padX*2;
      const step = n > 1 ? (span / (n - 1)) : 0;

      const pts = points.map((p,i)=>{
        const xx = padX + step*i;
        const yy = clamp(y(p.value), 0, H);
        return [xx, yy];
      });

      linePath.setAttribute("points", pts.map(([xx,yy]) => `${xx.toFixed(1)},${yy.toFixed(1)}`).join(" "));

      const stroke = trendUp ? "rgba(34,197,94,.95)" : "rgba(239,68,68,.95)";
      linePath.setAttribute("stroke", stroke);

      lineDots.innerHTML = "";
      pts.forEach(([xx,yy], i)=>{
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", xx.toFixed(1));
        c.setAttribute("cy", yy.toFixed(1));
        c.setAttribute("r", i === (past6.length - 1) ? "6" : "4");
        c.setAttribute("fill", i === (past6.length - 1) ? "rgba(59,130,246,1)" : stroke);
        c.setAttribute("opacity", i >= past6.length ? "0.9" : "0.75");
        lineDots.appendChild(c);
      });
    }

    if(noteEl){
      const next = forecast[0]?.Summe;
      noteEl.textContent =
        `Forecast (3M) wird als Trend aus den letzten 6 Monaten berechnet. Nächster Monat (Forecast): ${fmtEuro(next)}.`;
    }
  }

  // ---------- helpers ----------

  function renderEmpty(root, msg){
    const note = root.querySelector("#fmNote");
    if(note) note.textContent = msg;
    const bars = root.querySelector("#fmBars");
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

  function buildForecastStacked(past, n){
    if(!past || past.length === 0) return [];
    const last = past[past.length - 1];

    const slope = trendSlope(past.map(x=>x.Summe));

    const lastRent = Math.max(0, toNum(last.Mieteinnahmen));
    const lastLease= Math.max(0, toNum(last.Pachteinnahmen));
    const lastDen  = Math.max(1, lastRent + lastLease);

    const rentShare = clamp(lastRent / lastDen, 0, 1);
    const leaseShare= clamp(lastLease / lastDen, 0, 1);

    const out = [];
    for(let i=1;i<=n;i++){
      const month = addMonths(last.Monat, i);
      const total = Math.max(0, Math.round(last.Summe + slope*i));

      const rent = Math.round(total * rentShare);
      const lease = Math.max(0, total - rent);

      out.push({
        Monat: month,
        Summe: total,
        Mieteinnahmen: rent,
        Pachteinnahmen: lease,
        Auslastung_pct: 0,
        __forecast:true
      });
    }
    return out;
  }

  function trendSlope(values){
    if(!values || values.length < 2) return 0;
    return (values[values.length - 1] - values[0]) / (values.length - 1);
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

  function fmtEuro(v){
    const n = Number(v || 0);
    return new Intl.NumberFormat("de-DE",{ style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(n);
  }

  function fmtPct(v){
    const n = Number(v || 0);
    return new Intl.NumberFormat("de-DE",{ maximumFractionDigits:1 }).format(n) + " %";
  }

  function toNum(v){
    if(typeof v === "number") return isFinite(v) ? v : 0;
    if(v == null) return 0;
    const s = String(v).trim();
    if(!s) return 0;
    return Number(s.replace(/\./g,"").replace(",", ".")) || 0;
  }

  function avg(arr){
    if(!arr || arr.length===0) return 0;
    return arr.reduce((a,b)=>a+b,0)/arr.length;
  }

  function badge(text){
    const b = document.createElement("div");
    b.className = "fm-badge";
    b.textContent = text;
    return b;
  }

  function clamp(x,min,max){ return Math.max(min, Math.min(max, x)); }

  function pickOcc(r, homeRows){
    const direct = pickNum(r, ["Auslastung_pct", "Auslastung_%", "Auslastung", "AuslastungProzent"]);
    if(direct > 0) return direct;

    if(Array.isArray(homeRows)){
      const m = String(r.Monat || "").trim();
      const hr = homeRows.find(x => String(x.Monat || "").trim() === m);
      if(hr){
        return pickNum(hr, ["Auslastung_pct", "Auslastung_%", "Auslastung"]);
      }
    }
    return 0;
  }

  function pickNum(obj, keys){
    for(const k of keys){
      if(obj && obj[k] != null && String(obj[k]).trim() !== "") return toNum(obj[k]);
    }
    return 0;
  }

  function nextRentDate(){
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth();
    const firstThis = new Date(y, m, 1);
    if(d < firstThis) return firstThis;
    return new Date(y, m + 1, 1);
  }

  function daysUntil(date){
    const now = new Date();
    const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const b = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const ms = b - a;
    return Math.max(0, Math.round(ms / 86400000));
  }

  function fmtDate(d){
    return d.toLocaleDateString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric" });
  }
})();