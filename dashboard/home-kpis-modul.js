(function(){
  window.HomeKpisModul = window.HomeKpisModul || {};
  window.HomeKpisModul.rootClass = "home-kpis-root";
  window.HomeKpisModul.render = render;

  // ========= Helpers =========
  function esc(s){ return String(s||"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m])); }

  function fmtEuro(n){
    const v = Number(n || 0);
    return new Intl.NumberFormat("de-DE", { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(v);
  }
  function fmtPct(n, digits=1){
    const v = Number(n || 0);
    return v.toFixed(digits).replace(".", ",") + " %";
  }
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  function monthKey(d){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    return `${y}-${m}`;
  }
  function monthLabel(d){
    return d.toLocaleDateString("de-DE",{ month:"short", year:"2-digit" }).replace(".", "");
  }
  function addMonths(date, n){
    const d = new Date(date);
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    return d;
  }

  function buildMonthSeries(){
    // 6 Monate Historie inkl. aktuellem Monat: -5..0
    // plus 3 Monate Forecast: +1..+3
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), 1);
    const hist = [];
    for(let i=-5;i<=0;i++) hist.push(addMonths(base, i));
    const fcast = [];
    for(let i=1;i<=3;i++) fcast.push(addMonths(base, i));
    const all = hist.concat(fcast);
    return { hist, fcast, all };
  }

  // ========= Dummy Data Generator (bis Excel kommt) =========
  function defaultKpiData(){
    const { hist, fcast, all } = buildMonthSeries();

    // Simple deterministic-ish numbers based on month index
    const seedBase = (new Date().getFullYear()*100 + (new Date().getMonth()+1));

    function noise(i, amp){
      // pseudo-random stable per month index
      const x = Math.sin((seedBase + i) * 12.9898) * 43758.5453;
      const frac = x - Math.floor(x);
      return (frac - 0.5) * amp * 2;
    }

    const labels = all.map(monthLabel);

    // 1) Monats-Cashflow (EUR) - bars with +/- values
    const cashflowMonthly = all.map((_,i)=>{
      const base = 18000 + (i-3)*1200; // mild upward trend
      const v = base + noise(i, 9000);
      return Math.round(v);
    });

    // 2) Jahres-Cashflow (YTD) - cumulative of monthly within year (only for visible months)
    // We compute a visible cumulative series that restarts in Jan
    const ytd = [];
    let running = 0;
    let lastYear = null;
    all.forEach((d, i)=>{
      if(lastYear === null || d.getFullYear() !== lastYear){
        running = 0;
        lastYear = d.getFullYear();
      }
      running += cashflowMonthly[i];
      ytd.push(Math.round(running));
    });

    // 3) Mieteinnahmen pro Monat (EUR) - steady with slight growth
    const rentMonthly = all.map((_,i)=>{
      const base = 4200 + (i-3)*80;
      const v = base + noise(i, 280);
      return Math.round(v);
    });

    // 4) Auslastung (0..100) - occupancy
    const occupancy = all.map((_,i)=>{
      const base = 92 + noise(i, 4.5);
      return Math.round(clamp(base, 70, 100)*10)/10;
    });

    // 5) Portfolio ROI (annualized %) - line
    const roi = all.map((_,i)=>{
      const base = 7.8 + (i-3)*0.12 + noise(i, 0.6);
      return Math.round(clamp(base, 0, 30)*10)/10;
    });

    return {
      months: labels,
      splitIndex: hist.length - 1, // last historic index
      series: {
        cashflowMonthly,
        cashflowYtd: ytd,
        rentMonthly,
        occupancy,
        roi
      }
    };
  }

  // ========= Canvas Charts (no libs) =========
  function setupCanvas(canvas){
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(260, rect.width || 320);
    const h = Math.max(86, rect.height || 86);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  function drawGrid(ctx, w, h){
    ctx.save();
    ctx.strokeStyle = "rgba(148,163,184,.16)";
    ctx.lineWidth = 1;
    const rows = 3;
    for(let i=1;i<=rows;i++){
      const y = Math.round((h/ (rows+1)) * i) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function minMax(arr){
    let mn = Infinity, mx = -Infinity;
    for(const v of arr){ mn = Math.min(mn, v); mx = Math.max(mx, v); }
    if(!isFinite(mn)) mn = 0;
    if(!isFinite(mx)) mx = 1;
    if(mn === mx){ mx = mn + 1; }
    return { mn, mx };
  }

  function drawBars(ctx, w, h, values, splitIndex, opts={}){
    const padX = 6, padY = 6;
    const innerW = w - padX*2;
    const innerH = h - padY*2;

    // for cashflow: allow negatives -> center line at 0
    const mn = Math.min(...values, 0);
    const mx = Math.max(...values, 0);
    const range = (mx - mn) || 1;

    const zeroY = padY + innerH * (mx / range); // where value 0 sits
    const n = values.length;
    const gap = 4;
    const barW = Math.max(6, Math.floor((innerW - gap*(n-1)) / n));

    drawGrid(ctx, w, h);

    for(let i=0;i<n;i++){
      const v = values[i];
      const x = padX + i*(barW+gap);
      const yVal = padY + innerH * ((mx - v) / range);
      const y0 = zeroY;
      const top = Math.min(yVal, y0);
      const bot = Math.max(yVal, y0);
      const hh = Math.max(2, bot - top);

      // historic vs forecast
      const isFcast = i > splitIndex;

      // positive vs negative shading
      const pos = v >= 0;

      ctx.save();
      ctx.fillStyle = isFcast
        ? (pos ? "rgba(59,130,246,.20)" : "rgba(148,163,184,.14)")
        : (pos ? "rgba(34,197,94,.35)" : "rgba(248,113,113,.25)");
      ctx.strokeStyle = isFcast ? "rgba(148,163,184,.22)" : "rgba(148,163,184,.18)";
      ctx.lineWidth = 1;

      roundRect(ctx, x, top, barW, hh, 6);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // zero line
    ctx.save();
    ctx.strokeStyle = "rgba(226,232,240,.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, Math.round(zeroY)+0.5);
    ctx.lineTo(w, Math.round(zeroY)+0.5);
    ctx.stroke();
    ctx.restore();
  }

  function drawLine(ctx, w, h, values, splitIndex, opts={}){
    const padX = 6, padY = 6;
    const innerW = w - padX*2;
    const innerH = h - padY*2;

    const { mn, mx } = minMax(values);
    const range = (mx - mn) || 1;

    const n = values.length;
    const step = innerW / Math.max(1, (n-1));

    drawGrid(ctx, w, h);

    // historic line
    ctx.save();
    ctx.strokeStyle = "rgba(59,130,246,.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let i=0;i<=splitIndex;i++){
      const x = padX + i*step;
      const y = padY + innerH * (1 - (values[i]-mn)/range);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
    ctx.restore();

    // forecast line (dashed)
    if(splitIndex < n-1){
      ctx.save();
      ctx.strokeStyle = "rgba(148,163,184,.55)";
      ctx.setLineDash([6,4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for(let i=splitIndex;i<n;i++){
        const x = padX + i*step;
        const y = padY + innerH * (1 - (values[i]-mn)/range);
        if(i===splitIndex) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // dots
    for(let i=0;i<n;i++){
      const x = padX + i*step;
      const y = padY + innerH * (1 - (values[i]-mn)/range);
      const isF = i > splitIndex;
      ctx.save();
      ctx.fillStyle = isF ? "rgba(148,163,184,.75)" : "rgba(59,130,246,.95)";
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawDonutWithHistory(ctx, w, h, occNow, occSeries, splitIndex){
    // donut on left, tiny history line at bottom
    const pad = 6;
    const cx = 46, cy = 40;
    const r = 22;

    // background ring
    ctx.save();
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(148,163,184,.18)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();

    // occupancy arc
    const pct = clamp(occNow, 0, 100) / 100;
    const start = -Math.PI/2;
    const end = start + Math.PI*2*pct;

    ctx.save();
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(34,197,94,.75)";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, end);
    ctx.stroke();
    ctx.restore();

    // center text
    ctx.save();
    ctx.fillStyle = "rgba(226,232,240,.92)";
    ctx.font = "900 12px system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(Math.round(occNow)) + "%", cx, cy);
    ctx.restore();

    // history mini line (right side full width)
    const leftW = 90;
    const x0 = leftW;
    const y0 = 10;
    const ww = w - x0 - pad;
    const hh = h - y0 - pad;

    // draw small grid
    ctx.save();
    ctx.strokeStyle = "rgba(148,163,184,.12)";
    ctx.lineWidth = 1;
    const rows = 2;
    for(let i=1;i<=rows;i++){
      const y = Math.round(y0 + (hh/(rows+1))*i)+0.5;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0+ww, y); ctx.stroke();
    }
    ctx.restore();

    // line
    const { mn, mx } = minMax(occSeries);
    const range = (mx - mn) || 1;
    const n = occSeries.length;
    const step = ww / Math.max(1, n-1);

    // historic
    ctx.save();
    ctx.strokeStyle = "rgba(34,197,94,.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let i=0;i<=splitIndex;i++){
      const x = x0 + i*step;
      const y = y0 + hh * (1 - (occSeries[i]-mn)/range);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
    ctx.restore();

    // forecast dashed
    if(splitIndex < n-1){
      ctx.save();
      ctx.strokeStyle = "rgba(148,163,184,.55)";
      ctx.setLineDash([6,4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for(let i=splitIndex;i<n;i++){
        const x = x0 + i*step;
        const y = y0 + hh * (1 - (occSeries[i]-mn)/range);
        if(i===splitIndex) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  function roundRect(ctx, x, y, w, h, r){
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
  }

  // ========= KPI Cards =========
  function render(root, cfg){
    // cfg is passed from view-home.js; we’ll use dashboard data later
    const data = (cfg && cfg.kpiSeries) ? cfg.kpiSeries : defaultKpiData();

    // Build cards
    root.innerHTML = `
      <div class="hk-head">
        <div>
          <div class="hk-title">KPIs</div>
          <div class="hk-sub">
            6 Monate Rückblick (inkl. aktueller Monat) + 3 Monate Forecast · Grafik je KPI
          </div>
        </div>
        <div class="hk-actions">
          <span class="hk-pill" id="hkRange">Range: ${esc(data.months[0])} → ${esc(data.months[data.months.length-1])}</span>
          <button class="hk-btn" id="hkRefresh">↻ Refresh</button>
        </div>
      </div>

      <div class="hk-body">
        <div class="hk-grid">
          ${cardTemplate("kpi1","Monats-Cashflow", "Summe je Monat", "BAR")}
          ${cardTemplate("kpi2","Jahres-Cashflow", "YTD kumuliert", "LINE")}
          ${cardTemplate("kpi3","Mieteinnahmen / Monat", "Soll/Ist (Demo)", "LINE")}
          ${cardTemplate("kpi4","Auslastung Wohnungen", "Gegenteil von Leerstand", "DONUT")}
          ${cardTemplate("kpi5","Portfolio ROI", "annualisiert (Demo)", "LINE")}
        </div>

        <div class="hk-legend" style="margin-top:10px;">
          <span><i class="hk-dot fc"></i>Ist / Historie</span>
          <span><i class="hk-dot fcast"></i>Forecast</span>
        </div>
      </div>
    `;

    // wire refresh: regenerate demo numbers (optional)
    root.querySelector("#hkRefresh").addEventListener("click", ()=>{
      // simple re-render with new dummy based on time — for now just rerender
      render(root, cfg);
    });

    // Fill metrics + charts
    const split = data.splitIndex;

    // 1 Monthly cashflow
    {
      const s = data.series.cashflowMonthly;
      const last = s[split];
      const prev = s[split-1] ?? s[split];
      const delta = last - prev;

      setCardValues(root, "kpi1",
        fmtEuro(last),
        deltaBadge(delta),
        `Δ ggü. Vormonat: ${delta>=0?"+":""}${fmtEuro(delta)}`
      );

      drawInto(root, "kpi1", (ctx,w,h)=>{
        drawBars(ctx,w,h,s,split);
      });
    }

    // 2 Yearly cashflow YTD
    {
      const s = data.series.cashflowYtd;
      const last = s[split];
      const prev = s[split-1] ?? s[split];
      const delta = last - prev;

      setCardValues(root, "kpi2",
        fmtEuro(last),
        deltaBadge(delta),
        `YTD Veränderung: ${delta>=0?"+":""}${fmtEuro(delta)}`
      );

      drawInto(root, "kpi2", (ctx,w,h)=>{
        drawLine(ctx,w,h,s,split);
      });
    }

    // 3 Rent monthly
    {
      const s = data.series.rentMonthly;
      const last = s[split];
      const prev = s[split-1] ?? s[split];
      const delta = last - prev;

      setCardValues(root, "kpi3",
        fmtEuro(last),
        deltaBadge(delta),
        `Δ ggü. Vormonat: ${delta>=0?"+":""}${fmtEuro(delta)}`
      );

      drawInto(root, "kpi3", (ctx,w,h)=>{
        drawLine(ctx,w,h,s,split);
      });
    }

    // 4 Occupancy
    {
      const s = data.series.occupancy;
      const last = s[split];
      const prev = s[split-1] ?? s[split];
      const delta = last - prev;

      setCardValues(root, "kpi4",
        fmtPct(last,1),
        deltaBadge(delta, true),
        `Δ ggü. Vormonat: ${delta>=0?"+":""}${fmtPct(delta,1)}`
      );

      drawInto(root, "kpi4", (ctx,w,h)=>{
        drawDonutWithHistory(ctx,w,h,last,s,split);
      });
    }

    // 5 ROI
    {
      const s = data.series.roi;
      const last = s[split];
      const prev = s[split-1] ?? s[split];
      const delta = last - prev;

      setCardValues(root, "kpi5",
        fmtPct(last,1),
        deltaBadge(delta, true),
        `Trend: ${delta>=0?"+":""}${fmtPct(delta,1)}`
      );

      drawInto(root, "kpi5", (ctx,w,h)=>{
        drawLine(ctx,w,h,s,split);
      });
    }

    // redraw on resize (important for iPad orientation changes)
    const resizeHandler = debounce(()=> {
      // re-render charts only (quick): easiest is full rerender
      render(root, cfg);
    }, 250);

    window.addEventListener("resize", resizeHandler, { passive:true });
  }

  function cardTemplate(id, title, sub, kind){
    return `
      <div class="hk-card" data-kpi="${esc(id)}">
        <div class="hk-top">
          <div style="min-width:0;">
            <div class="hk-k">${esc(title)}</div>
            <div class="hk-v" data-v>—</div>
            <div class="hk-h" data-h>${esc(sub)}</div>
          </div>
          <div class="hk-badge" data-badge>—</div>
        </div>

        <div class="hk-chartWrap">
          <canvas class="hk-chart" data-chart aria-label="${esc(title)} Chart"></canvas>
        </div>

        <div class="hk-foot">
          <div class="hk-meta" data-meta>—</div>
          <div class="hk-mini">${esc(kind)} · 9M</div>
        </div>
      </div>
    `;
  }

  function setCardValues(root, id, valueText, badgeObj, metaText){
    const card = root.querySelector(`[data-kpi="${id}"]`);
    if(!card) return;
    card.querySelector("[data-v]").textContent = valueText;
    const b = card.querySelector("[data-badge]");
    b.textContent = badgeObj.text;
    b.className = "hk-badge " + (badgeObj.cls || "");
    card.querySelector("[data-meta]").textContent = metaText;
  }

  function deltaBadge(delta, isPercent=false){
    const good = delta >= 0;
    const cls = good ? "good" : "warn";
    const text = (delta===0)
      ? "± 0"
      : (good ? "▲" : "▼") + " " + (isPercent ? fmtPct(Math.abs(delta),1) : fmtEuro(Math.abs(delta)));
    return { text, cls };
  }

  function drawInto(root, id, painter){
    const card = root.querySelector(`[data-kpi="${id}"]`);
    if(!card) return;
    const canvas = card.querySelector("[data-chart]");
    if(!canvas) return;

    // ensure no horizontal scroll: canvas fits container
    const { ctx, w, h } = setupCanvas(canvas);

    // clear
    ctx.clearRect(0,0,w,h);

    // paint
    painter(ctx, w, h);
  }

  function debounce(fn, ms){
    let t = null;
    return function(){
      clearTimeout(t);
      t = setTimeout(()=> fn.apply(this, arguments), ms);
    };
  }

})();