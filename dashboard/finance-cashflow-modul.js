(function(){
  window.FinanceCashflowModul = window.FinanceCashflowModul || {};
  window.FinanceCashflowModul.rootClass = "fin-cash-root";
  window.FinanceCashflowModul.render = render;

  function euro(n){
    return (Number(n)||0).toLocaleString("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0});
  }
  function sum(arr, fn){
    return (arr||[]).reduce((a,x)=>a + (fn?fn(x):Number(x||0)), 0);
  }

  function computeCashSeries(startCash, cashflow){
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
    const m = s.split("-")[1] || "";
    return m ? m : s;
  }

  function drawChart(canvas, series){
    const ctx = canvas.getContext("2d");
    if(!ctx) return;

    const cssW = canvas.clientWidth || 900;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(cssW * ratio);
    canvas.height = Math.floor((cssW * 0.40) * ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);

    const W = cssW;
    const H = cssW * 0.40;

    ctx.clearRect(0,0,W,H);

    const padL = 46, padR = 16, padT = 14, padB = 28;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const inflows = series.map(x=>x.inflow);
    const outflows = series.map(x=>x.outflow);
    const cash = series.map(x=>x.cash);

    const maxBar = Math.max(...inflows, ...outflows, 1);
    const minCash = Math.min(...cash);
    const maxCash = Math.max(...cash);

    ctx.strokeStyle = "rgba(148,163,184,.14)";
    ctx.lineWidth = 1;
    for(let i=0;i<=4;i++){
      const y = padT + (plotH * (i/4));
      ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(W-padR,y); ctx.stroke();
    }

    ctx.fillStyle = "rgba(226,232,240,.70)";
    ctx.font = "11px system-ui,-apple-system";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(euro(maxCash), padL-8, padT);
    ctx.fillText(euro(minCash), padL-8, padT+plotH);

    const n = series.length;
    const slot = plotW / Math.max(1,n);
    const barW = Math.max(10, slot * 0.28);

    for(let i=0;i<n;i++){
      const x = padL + slot*i + (slot/2);
      const inH = (series[i].inflow/maxBar) * (plotH*0.58);
      const outH = (series[i].outflow/maxBar) * (plotH*0.58);

      ctx.fillStyle = "rgba(34,197,94,.55)";
      ctx.fillRect(x - barW - 3, padT + plotH - inH, barW, inH);

      ctx.fillStyle = "rgba(249,115,22,.55)";
      ctx.fillRect(x + 3, padT + plotH - outH, barW, outH);
    }

    function yCash(v){
      const t = (v - minCash) / Math.max(1, (maxCash - minCash));
      return padT + plotH - (t * plotH);
    }

    ctx.strokeStyle = "rgba(59,130,246,.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let i=0;i<n;i++){
      const x = padL + slot*i + (slot/2);
      const y = yCash(series[i].cash);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();

    ctx.fillStyle = "rgba(59,130,246,.95)";
    for(let i=0;i<n;i++){
      const x = padL + slot*i + (slot/2);
      const y = yCash(series[i].cash);
      ctx.beginPath(); ctx.arc(x,y,2.8,0,Math.PI*2); ctx.fill();
    }

    ctx.fillStyle = "rgba(226,232,240,.62)";
    ctx.font = "11px system-ui,-apple-system";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for(let i=0;i<n;i++){
      const x = padL + slot*i + (slot/2);
      ctx.fillText(monthLabel(series[i].month), x, padT+plotH+8);
    }
  }

  function render(rootEl, data, cashflowSliced, opts){
    opts = opts || {};
    const horizon = opts.horizon || 12;

    rootEl.innerHTML = `
      <div class="fc-head">
        <div>
          <div class="fc-title">Cashflow & Kontostand</div>
          <div class="fc-sub">Ein-/Ausgänge & Kontostand (EOM) · Zeitraum ${horizon} Monate</div>
        </div>
        <div class="fc-mini">
          <div class="fc-mini-row"><span>Ø Net</span><strong id="fcAvg">—</strong></div>
          <div class="fc-mini-row"><span>Trend</span><strong id="fcTrend">—</strong></div>
        </div>
      </div>
      <div class="fc-body">
        <div class="fc-wrap">
          <canvas id="fcCanvas" width="1200" height="460"></canvas>
        </div>
        <div class="fc-legend">
          <div class="fc-li"><span class="fc-dot" style="background:rgba(34,197,94,.55)"></span>Inflow</div>
          <div class="fc-li"><span class="fc-dot" style="background:rgba(249,115,22,.55)"></span>Outflow</div>
          <div class="fc-li"><span class="fc-dot" style="background:rgba(59,130,246,.95)"></span>Cash (EOM)</div>
        </div>
      </div>
    `;

    const series = computeCashSeries(data.startCash, cashflowSliced);
    const avgNet = series.length ? (sum(series,x=>x.net)/series.length) : 0;
    const trend = series.length>=2 ? (series[series.length-1].cash - series[0].cash) : 0;

    rootEl.querySelector("#fcAvg").textContent = euro(avgNet);
    rootEl.querySelector("#fcTrend").textContent = (trend>=0 ? "↗ " : "↘ ") + euro(trend);

    const canvas = rootEl.querySelector("#fcCanvas");
    drawChart(canvas, series);

    window.addEventListener("resize", ()=>{
      try{ drawChart(canvas, series); }catch(_){}
    }, { passive:true });
  }
})();