(function(){
  window.FinanceCashflowModul = window.FinanceCashflowModul || {};
  window.FinanceCashflowModul.rootClass = "fin-cash-root";
  window.FinanceCashflowModul.render = render;

  function euro(n){
    return (Number(n)||0).toLocaleString("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0});
  }
  function pct1(n){
    return (Number(n)||0).toFixed(1).replace(".",",") + " %";
  }
  function sum(arr, fn){
    return (arr||[]).reduce((a,x)=>a + (fn?fn(x):Number(x||0)), 0);
  }

  function computeSeries(startCash, cashflow){
    let cash = Number(startCash||0);
    return (cashflow||[]).map(r=>{
      const inflow = Number(r.inflow||0);
      const outflow = Number(r.outflow||0);
      const net = inflow - outflow;
      cash += net;
      return { ...r, inflow, outflow, net, cash };
    });
  }

  function monthLabel(yyyyMM){
    const s = String(yyyyMM||"");
    const p = s.split("-");
    return p.length===2 ? p[1] : s.slice(-2);
  }

  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }

  function draw(canvas, series){
    const ctx = canvas.getContext("2d");
    if(!ctx) return;

    const cssW = canvas.clientWidth || 800;
    const cssH = canvas.clientHeight || 260;
    const dpr  = window.devicePixelRatio || 1;

    canvas.width  = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);

    const W = cssW, H = cssH;
    ctx.clearRect(0,0,W,H);

    const padL=46, padR=12, padT=12, padB=26;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const n = Math.max(1, series.length);
    const inflows = series.map(x=>x.inflow);
    const outflows = series.map(x=>x.outflow);
    const cash = series.map(x=>x.cash);

    const maxBar = Math.max(...inflows, ...outflows, 1);
    const minCash = Math.min(...cash, 0);
    const maxCash = Math.max(...cash, 1);

    // grid
    ctx.strokeStyle = "rgba(148,163,184,.14)";
    ctx.lineWidth = 1;
    for(let i=0;i<=4;i++){
      const y = padT + plotH*(i/4);
      ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(W-padR,y); ctx.stroke();
    }

    // y labels
    ctx.fillStyle = "rgba(226,232,240,.62)";
    ctx.font = "11px system-ui,-apple-system";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(euro(maxCash), padL-8, padT);
    ctx.fillText(euro(minCash), padL-8, padT+plotH);

    const slot = plotW / n;
    const barW = clamp(slot*0.16, 10, 22);
    const barMaxH = plotH * 0.55;

    // bars
    for(let i=0;i<n;i++){
      const m = series[i] || { inflow:0, outflow:0, cash:0, month:"" };
      const x = padL + slot*i + slot/2;
      const inH  = (m.inflow/maxBar) * barMaxH;
      const outH = (m.outflow/maxBar) * barMaxH;

      ctx.fillStyle = "rgba(34,197,94,.55)";
      ctx.fillRect(x - barW - 2, padT + plotH - inH, barW, inH);

      ctx.fillStyle = "rgba(249,115,22,.55)";
      ctx.fillRect(x + 2, padT + plotH - outH, barW, outH);
    }

    function yCash(v){
      const t = (v - minCash) / Math.max(1, (maxCash - minCash));
      return padT + plotH - (t * plotH);
    }

    // area under cash
    ctx.beginPath();
    for(let i=0;i<n;i++){
      const m = series[i] || { cash:0 };
      const x = padL + slot*i + slot/2;
      const y = yCash(m.cash);
      if(i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    }
    ctx.lineTo(padL + slot*(n-1) + slot/2, padT + plotH);
    ctx.lineTo(padL + slot*0 + slot/2, padT + plotH);
    ctx.closePath();
    ctx.fillStyle = "rgba(59,130,246,.10)";
    ctx.fill();

    // cash line
    ctx.strokeStyle = "rgba(59,130,246,.92)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let i=0;i<n;i++){
      const m = series[i] || { cash:0 };
      const x = padL + slot*i + slot/2;
      const y = yCash(m.cash);
      if(i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    }
    ctx.stroke();

    // dots
    ctx.fillStyle = "rgba(59,130,246,.92)";
    for(let i=0;i<n;i++){
      const m = series[i] || { cash:0 };
      const x = padL + slot*i + slot/2;
      const y = yCash(m.cash);
      ctx.beginPath(); ctx.arc(x,y,2.6,0,Math.PI*2); ctx.fill();
    }

    // x labels
    ctx.fillStyle = "rgba(226,232,240,.62)";
    ctx.font = "11px system-ui,-apple-system";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for(let i=0;i<n;i++){
      const m = series[i] || { month:"" };
      const x = padL + slot*i + slot/2;
      ctx.fillText(monthLabel(m.month), x, padT + plotH + 8);
    }
  }

  function render(rootEl, data, cashflowSliced, opts){
    opts = opts || {};
    const horizon = opts.horizon || (cashflowSliced ? cashflowSliced.length : 0);

    // Build module HTML INSIDE root (same architecture as Gesamtmodul)
    rootEl.innerHTML = `
      <div class="fc-head">
        <div class="fc-left">
          <div class="fc-title">Cashflow</div>
          <div class="fc-sub">Ein-/Ausgänge & Kontostand · Zeitraum ${horizon} Monate</div>
        </div>
        <div class="fc-right" id="fcPills"></div>
      </div>

      <div class="fc-body">
        <div class="fc-kpis" id="fcKpis"></div>

        <div class="fc-chartWrap">
          <canvas class="fc-canvas" id="fcCanvas"></canvas>
        </div>

        <div class="fc-legend">
          <div class="fc-li"><span class="fc-dot in"></span>Inflow</div>
          <div class="fc-li"><span class="fc-dot out"></span>Outflow</div>
          <div class="fc-li"><span class="fc-dot cash"></span>Cash (EOM)</div>
        </div>

        <div class="fc-note" id="fcNote">
          Keine horizontale Scrollbar · Canvas füllt die Kachel vollständig.
        </div>
      </div>
    `;

    const series = computeSeries(data.startCash, cashflowSliced || []);
    const inflowSum = sum(series, x=>x.inflow);
    const outflowSum = sum(series, x=>x.outflow);
    const netSum = sum(series, x=>x.net);

    const start = Number(data.startCash||0);
    const end   = series.length ? Number(series[series.length-1].cash||0) : start;
    const trend = end - start;
    const avgNet = series.length ? (netSum/series.length) : 0;

    const stability = (inflowSum + outflowSum) > 0
      ? (Math.abs(netSum) / Math.max(1, (inflowSum + outflowSum)) * 100)
      : 0;

    const pills = rootEl.querySelector("#fcPills");
    const kpis  = rootEl.querySelector("#fcKpis");
    const canvas = rootEl.querySelector("#fcCanvas");
    const wrap   = rootEl.querySelector(".fc-chartWrap");

    pills.innerHTML = `
      <span class="fc-pill">Ø Net: <strong>${euro(avgNet)}</strong></span>
      <span class="fc-pill">Trend: <strong>${(trend>=0?"↗ ":"↘ ")+euro(trend)}</strong></span>
      <span class="fc-pill">Ende: <strong>${euro(end)}</strong></span>
    `;

    kpis.innerHTML = `
      <div class="fc-kpi">
        <div class="fc-k">Inflow</div>
        <div class="fc-v">${euro(inflowSum)}</div>
        <div class="fc-h">Summe im Zeitraum</div>
      </div>
      <div class="fc-kpi">
        <div class="fc-k">Outflow</div>
        <div class="fc-v">${euro(outflowSum)}</div>
        <div class="fc-h">Summe im Zeitraum</div>
      </div>
      <div class="fc-kpi">
        <div class="fc-k">Netto</div>
        <div class="fc-v">${euro(netSum)}</div>
        <div class="fc-h">${netSum>=0 ? "positiv" : "negativ"}</div>
      </div>
      <div class="fc-kpi">
        <div class="fc-k">Volatilität</div>
        <div class="fc-v">${pct1(stability)}</div>
        <div class="fc-h">|Netto| relativ zum Volumen</div>
      </div>
    `;

    // Draw AFTER DOM is definitely there (iPad/Safari safe)
    const doDraw = ()=>{ try{ draw(canvas, series); }catch(_){ } };

    // first draw
    requestAnimationFrame(doDraw);

    // redraw on resize of wrapper (best)
    if(wrap && "ResizeObserver" in window){
      const ro = new ResizeObserver(()=>{ requestAnimationFrame(doDraw); });
      ro.observe(wrap);
      canvas._ro = ro;
    } else {
      window.addEventListener("resize", ()=>{ requestAnimationFrame(doDraw); }, { passive:true });
    }
  }
})();