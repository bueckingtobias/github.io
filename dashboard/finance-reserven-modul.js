(function(){
  function n(x){
    if(x == null || x === "") return 0;
    if(typeof x === "number" && isFinite(x)) return x;
    const s = String(x)
      .replace(/\s/g,"")
      .replace(/€/g,"")
      .replace(/\./g,"")
      .replace(",",".")
      .replace(/[^\d.-]/g,"");
    const v = Number(s);
    return isFinite(v) ? v : 0;
  }

  function eur(v){
    return new Intl.NumberFormat("de-DE",{
      style:"currency",
      currency:"EUR",
      maximumFractionDigits:0
    }).format(n(v));
  }

  function clamp(v){ return Math.max(0, Math.min(100, v)); }

  function render(container, data){
    const root = container.querySelector("[data-frx-root]") || container;

    const reservesRows = Array.isArray(data?.reservesRows) ? data.reservesRows : [];
    const financeRows  = Array.isArray(data?.financeRows) ? data.financeRows : [];

    const elSub  = root.querySelector("[data-frx-sub]");
    const elPill = root.querySelector("[data-frx-pill]");
    const elTot  = root.querySelector("[data-frx-total]");
    const elMeta = root.querySelector("[data-frx-meta]");
    const elKpis = root.querySelector("[data-frx-kpis]");
    const elBars = root.querySelector("[data-frx-bars]");
    const elMini = root.querySelector("[data-frx-mini]");

    const now = new Date();
    elSub.textContent = "Stand: " + now.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"});

    // Totals + allocation
    const items = reservesRows.map(r=>{
      const name = String(r.Topf ?? r.Konto ?? r.Bezeichnung ?? r.Name ?? "Reserve").trim();
      const amt  = n(r.Betrag ?? r.Amount ?? r.Summe ?? r.Wert);
      return { name, amt };
    }).filter(x=> x.name || x.amt !== 0);

    const total = items.reduce((a,x)=>a + x.amt, 0);
    elTot.textContent = eur(total);

    // Compute average burn based on negative cashflows (more conservative)
    const cash = financeRows.map(r=> n(r.Cashflow ?? r["Monats-Cashflow"] ?? r["Cashflow Monat"]));
    const neg = cash.filter(v=>v < 0);
    const avgBurn = neg.length ? Math.abs(neg.reduce((a,v)=>a+v,0) / neg.length) : 0;

    const runway = (avgBurn > 0) ? (total / avgBurn) : null; // months
    const runwayTxt = runway == null ? "Runway: —" : ("Runway: " + runway.toFixed(1).replace(".",",") + " Monate");

    // Simple target corridor: 2–4 months burn
    const targetLow  = avgBurn * 2;
    const targetHigh = avgBurn * 4;

    elMeta.textContent =
      (avgBurn > 0 ? ("Ø Burn (neg.): " + eur(avgBurn) + " · ") : "") +
      runwayTxt;

    // Pill status
    let status = "OK";
    if(avgBurn > 0){
      if(total < targetLow) status = "unter Ziel";
      else if(total > targetHigh) status = "über Ziel";
      else status = "im Ziel";
    } else {
      status = "kein Burn";
    }
    elPill.textContent = "Buffer · " + status;

    // KPIs
    elKpis.innerHTML = "";
    const kpis = [
      {k:"Zielkorridor", v: (avgBurn>0 ? (eur(targetLow) + " – " + eur(targetHigh)) : "—"), m:"2–4 Monate Burn"},
      {k:"Runway", v: (runway==null ? "—" : runway.toFixed(1).replace(".",",") + " Monate"), m:"nur neg. Cashflow"},
      {k:"Größter Topf", v: (items.length ? eur(Math.max(...items.map(x=>x.amt))) : "—"), m: (items.length ? items.sort((a,b)=>b.amt-a.amt)[0].name : "—") },
    ];
    kpis.forEach(t=>{
      const d=document.createElement("div");
      d.className="frx-tile";
      d.innerHTML = `<div class="frx-k">${t.k}</div><div class="frx-v">${t.v}</div><div class="frx-m">${t.m}</div>`;
      elKpis.appendChild(d);
    });

    // Allocation bars
    elBars.innerHTML = "";
    const denom = total !== 0 ? Math.abs(total) : 1;

    // color cycling
    const colors = ["blue","gray","red",""];
    items
      .sort((a,b)=> b.amt - a.amt)
      .slice(0,6)
      .forEach((it, idx)=>{
        const pct = clamp((Math.abs(it.amt) / denom) * 100);
        const row = document.createElement("div");
        row.className = "frx-barrow";
        row.innerHTML = `
          <div class="frx-barlabel">${it.name}</div>
          <div class="frx-barval">${eur(it.amt)}</div>
          <div class="frx-bar"><div class="frx-fill ${colors[idx%colors.length]}" style="width:0%"></div></div>
        `;
        elBars.appendChild(row);
        const fill = row.querySelector(".frx-fill");
        requestAnimationFrame(()=> fill.style.width = pct + "%");
      });

    // Mini guidance
    const msg =
      avgBurn === 0 ? "Hinweis: Kein negativer Cashflow erkannt – Runway/Target sind deaktiviert."
      : total < targetLow ? ("Empfehlung: Reserve aufbauen bis mind. " + eur(targetLow) + ".")
      : total > targetHigh ? ("Reserve ist hoch – ggf. Umschichtung/Invest prüfen (Ziel max. " + eur(targetHigh) + ").")
      : "Reserve im Zielkorridor – stabil.";

    elMini.textContent = msg;
  }

  window.FinanceReservenModul = { render };
})();
