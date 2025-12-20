/* finance-mieten-modul.js */
(function(){
  "use strict";

  window.FinanceMietenModul = { render };

  function render(host, data){
    if(!host) return;

    // Resolve rows: prefer IMMO_DATA.finance.mieten; fallback to data.homeRows or IMMO_DATA.home
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

    // Build normalized series from mietenRows
    const series = mietenRows
      .map(r => ({
        Monat: String(r.Monat || "").trim(),
        Mieteinnahmen: toNum(r.Mieteinnahmen),
        Pachteinnahmen: toNum(r.Pachteinnahmen),
        Summe: toNum(r.Summe) || (toNum(r.Mieteinnahmen) + toNum(r.Pachteinnahmen)),
        Auslastung_pct: pickOcc(r, homeRows)
      }))
      .filter(r => isYM(r.Monat))
      .sort((a,b)=> a.Monat.localeCompare(b.Monat));

    if(series.length === 0){
      renderEmpty(root, "Keine Mieten/Pacht-Daten gefunden. Prüfe window.IMMO_DATA.finance.mieten (oder Master finance.mieten).");
      return;
    }

    // Current = last element
    const current = series[series.length - 1];
    const past6 = series.slice(Math.max(0, series.length - 6)); // incl current

    // Forecast 3 months using trend from past6 Summe
    const forecast = buildForecast(past6, 3);

    const combined = past6.concat(forecast);

    const slope = trendSlope(past6.map(x => x.Summe));
    const trendUp = slope >= 0;

    // Next rent date: next 01.
    const nextRent = nextRentDate();

    // UI meta
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
    const yMinEl  = root.querySelector("#fmYMin");
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

    // Scale
    const vals = combined.map(x => x.Summe);
    const maxAbs = Math.max(1, ...vals.map(v => Math.abs(v)));
    const scaleMax = maxAbs * 1.12;

    if(yMaxEl) yMaxEl.textContent = fmtEuro(Math.round(scaleMax));
    if(yMinEl) yMinEl.textContent = fmtEuro(-Math.round(scaleMax));

    // Render bars (Summe), with split indicators for rent vs lease on past months only
    barsEl.innerHTML = "";

    const points = []; // for trend line

    combined.forEach((r, idx) => {
      const isForecast = idx >= past6.length;
      const isNow = !isForecast && r.Monat === current.Monat;

      const col = document.createElement("div");
      col.className = "fm-col";

      const wrap = document.createElement("div");
      wrap.className = "fm-barwrap";

      const zero = document.createElement("div");
      zero.className = "fm-zero";
      wrap.appendChild(zero);

      const bar = document.createElement("div");
      bar.className = "fm-bar";

      if(isNow) bar.classList.add("now");
      else if(isForecast) bar.classList.add(trendUp ? "fore-up" : "fore-down");
      else bar.classList.add("past");

      const v = r.Summe;
      const pct = Math.min(1, Math.abs(v) / scaleMax);
      const half = 50;
      const hPct = pct * half;

      if(v >= 0){
        bar.style.bottom = "50%";
        bar.style.top = (50 - hPct) + "%";
      } else {
        bar.style.top = "50%";
        bar.style.bottom = (50 - hPct) + "%";
      }

      // Value label (sum)
      const val = document.createElement("div");
      val.className = "fm-val";
      val.textContent = fmtEuro(v);
      bar.appendChild(val);

      // Split indicator (rent vs lease) only if we have actual components (not forecast)
      if(!isForecast){
        const rent = toNum(r.Mieteinnahmen);
        const lease= toNum(r.Pachteinnahmen);
        const sum = Math.max(1, rent + lease);
        const rentShare = clamp(rent / sum, 0, 1);
        const leaseShare= clamp(lease / sum, 0, 1);

        const split = document.createElement("div");
        split.className = "fm-split";

        const sRent = document.createElement("div");
        sRent.className = "fm-s rent";
        sRent.style.flex = String(Math.max(0.05, rentShare));

        const sLease = document.createElement("div");
        sLease.className = "fm-s lease";
        sLease.style.flex = String(Math.max(0.05, leaseShare));

        split.appendChild(sRent);
        split.appendChild(sLease);
        bar.appendChild(split);
      }

      wrap.appendChild(bar);

      const m = document.createElement("div");
      m.className = "fm-month";
      m.textContent = shortYM(r.Monat);

      col.appendChild(wrap);
      col.appendChild(m);
      barsEl.appendChild(col);

      points.push({ value: v, idx });
    });

    // Trend line (only across 9 bars)
    if(linePath && lineDots){
      const W = 1000;
      const H = 360;

      const y = (v) => {
        const t = v / scaleMax;
        return (H/2) - (t * (H/2));
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
        `Forecast wird als Trend aus den letzten 6 Monaten berechnet. Nächster Monat (Forecast): ${fmtEuro(next)}.`;
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

  function buildForecast(past, n){
    if(!past || past.length === 0) return [];
    const last = past[past.length - 1];
    const slope = trendSlope(past.map(x=>x.Summe));
    const out = [];
    for(let i=1;i<=n;i++){
      const month = addMonths(last.Monat, i);
      const val = Math.round(last.Summe + slope*i);
      out.push({ Monat: month, Summe: val, Mieteinnahmen: 0, Pachteinnahmen: 0, Auslastung_pct: 0, __forecast:true });
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
    // prefer row occ keys
    const direct =
      pickNum(r, ["Auslastung_pct", "Auslastung_%", "Auslastung", "AuslastungProzent"]);
    if(direct > 0) return direct;

    // fallback: match in home rows by month
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
    if(d < firstThis){
      return firstThis;
    }
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