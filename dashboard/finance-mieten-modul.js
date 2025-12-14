(function(){
  function n(x){
    if(x == null || x === "") return 0;
    if(typeof x === "number" && isFinite(x)) return x;
    const s = String(x).replace(/\s/g,"").replace(/€/g,"").replace(/\./g,"").replace(",",".").replace(/[^\d.-]/g,"");
    const v = Number(s);
    return isFinite(v) ? v : 0;
  }
  function eur(v){
    return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n(v));
  }
  function pct(v){
    const x = Number(v);
    if(!isFinite(x)) return "—";
    return (Math.round(x*10)/10).toFixed(1).replace(".",",") + " %";
  }
  function clamp(v){ return Math.max(0, Math.min(100, v)); }

  function pickHome(homeRows, key){
    const r = (homeRows||[]).find(x => String(x.KPI||"").trim() === key);
    return r ? n(r.Wert) : null;
  }

  function series(rows, key){
    const src = Array.isArray(rows) ? rows : [];
    const vals = src.slice(-6).map(r => n(r[key]));
    while(vals.length < 6) vals.unshift(0);

    const last = vals[5] ?? 0;
    const prev = vals[4] ?? last;
    const trend = last - prev;

    const f1 = last + trend;
    const f2 = f1 + trend;
    const f3 = f2 + trend;
    return vals.concat([f1,f2,f3]);
  }

  function render(container, data){
    const root = container.querySelector("[data-fm-root]") || container;

    const financeRows = Array.isArray(data?.financeRows) ? data.financeRows : [];
    const homeRows = Array.isArray(data?.homeRows) ? data.homeRows : [];

    const elSub = root.querySelector("[data-fm-sub]");
    const elMiete = root.querySelector("[data-fm-miete]");
    const elPacht = root.querySelector("[data-fm-pacht]");
    const elAuslast = root.querySelector("[data-fm-auslast]");
    const elCount = root.querySelector("[data-fm-count]");
    const elAvg = root.querySelector("[data-fm-avg]");
    const elChart = root.querySelector("[data-fm-chart]");

    const now = new Date();
    elSub.textContent = "Aktueller Monat: " + now.toLocaleDateString("de-DE",{month:"long",year:"numeric"});

    const cur = financeRows.length ? financeRows[financeRows.length-1] : null;
    const miete = cur ? n(cur.Mieteinnahmen) : 0;
    const pacht = cur ? n(cur.Pachteinnahmen) : 0;

    elMiete.textContent = eur(miete) + " Miete";
    elPacht.textContent = eur(pacht) + " Pacht";

    const auslast = pickHome(homeRows, "Auslastung der Wohnungen");
    elAuslast.textContent = (auslast == null) ? "—" : pct(auslast);

    // Countdown bis 01.
    const rentDay = 1;
    const next = new Date(now.getFullYear(), now.getMonth(), rentDay);
    if(now > next) next.setMonth(next.getMonth()+1);
    const diffMs = next.setHours(0,0,0,0) - new Date().setHours(0,0,0,0);
    const days = Math.max(0, Math.round(diffMs / (1000*60*60*24)));
    elCount.textContent = days + " Tage";

    const units = pickHome(homeRows, "Wohnungen gesamt");
    elAvg.textContent = (units && units > 0) ? eur((miete+pacht)/units) : "—";

    // Chart: Miete+Pacht
    const sM = series(financeRows, "Mieteinnahmen");
    const sP = series(financeRows, "Pachteinnahmen");
    const s = sM.map((v,i)=> v + (sP[i]||0));

    const max = Math.max(1, ...s.map(v=>Math.abs(v)));
    const trendDir = (s[8] > s[5]) ? "up" : (s[8] < s[5]) ? "down" : "up";

    elChart.innerHTML = "";
    s.forEach((v, i)=>{
      const bar = document.createElement("div");
      bar.className = "fm-bar";
      const fill = document.createElement("div");
      fill.className = "fm-fill";

      if(i < 5) fill.classList.add("fm-past");
      else if(i === 5) fill.classList.add("fm-current");
      else fill.classList.add(trendDir === "down" ? "fm-down" : "fm-up");

      const h = clamp((Math.abs(v) / max) * 100);
      requestAnimationFrame(()=> fill.style.height = h + "%");

      bar.appendChild(fill);
      elChart.appendChild(bar);
    });
  }

  window.FinanceMietenModul = { render };
})();
