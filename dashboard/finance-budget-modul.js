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
    const root = container.querySelector("[data-fbx-root]") || container;

    const rows = Array.isArray(data?.budgetRows) ? data.budgetRows : [];
    const now = new Date();

    const elSub  = root.querySelector("[data-fbx-sub]");
    const elKpis = root.querySelector("[data-fbx-kpis]");
    const elCats = root.querySelector("[data-fbx-cats]");
    const elTop  = root.querySelector("[data-fbx-top]");
    const elNote = root.querySelector("[data-fbx-note]");

    elSub.textContent = "Stand: " + now.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"});

    // Normalize budget rows
    const norm = rows.map(r=>{
      const cat = String(r.Kategorie ?? r.Category ?? r.Name ?? "Kategorie").trim();
      const bud = n(r.Budget ?? r.Plan ?? r.PLAN);
      const ist = n(r.Ist ?? r.Actual ?? r.IST);
      const rest = bud - ist;
      // optional month
      const monat = String(r.Monat ?? r.Month ?? "").trim();
      return {cat, bud, ist, rest, monat, raw:r};
    }).filter(x=> x.cat);

    const totalBud = norm.reduce((a,x)=>a + x.bud, 0);
    const totalIst = norm.reduce((a,x)=>a + x.ist, 0);
    const totalRest = totalBud - totalIst;

    // Burn rate: if rows have month, use last 3 months IST avg; else use overall avg per category count
    let burn = 0;
    const withMonth = norm.filter(x=>x.monat);
    if(withMonth.length){
      // group by Monat -> sum IST
      const byM = new Map();
      withMonth.forEach(x=>{
        const k = x.monat;
        byM.set(k, (byM.get(k)||0) + x.ist);
      });
      const months = Array.from(byM.keys()).sort();
      const last3 = months.slice(-3);
      if(last3.length){
        const sum = last3.reduce((a,m)=>a + (byM.get(m)||0), 0);
        burn = sum / last3.length;
      }
    } else {
      burn = (norm.length ? (totalIst / Math.max(1, norm.length)) : 0);
    }

    const usagePct = totalBud > 0 ? (totalIst / totalBud * 100) : 0;

    // KPIs
    elKpis.innerHTML = "";
    const kpis = [
      {k:"Budget gesamt", v: (totalBud>0 ? eur(totalBud) : "—"), m:"Plan"},
      {k:"Ist gesamt", v: eur(totalIst), m:"verbraucht"},
      {k:"Rest", v: (totalBud>0 ? eur(totalRest) : "—"), m:"Budget - Ist"},
      {k:"Verbrauch", v: (totalBud>0 ? (usagePct.toFixed(1).replace(".",",") + " %") : "—"), m:"Auslastung Budget"},
    ];
    kpis.forEach(t=>{
      const d = document.createElement("div");
      d.className = "fbx-tile";
      d.innerHTML = `<div class="fbx-k">${t.k}</div><div class="fbx-v">${t.v}</div><div class="fbx-m">${t.m}</div>`;
      elKpis.appendChild(d);
    });

    // Categories view
    elCats.innerHTML = "";
    const cats = [...norm].sort((a,b)=> (b.ist - a.ist)).slice(0,12); // keep tidy
    const maxBud = Math.max(1, ...cats.map(x=>x.bud || 0));
    cats.forEach(x=>{
      const pctIst = x.bud > 0 ? clamp((x.ist / x.bud) * 100) : 0;
      const pctRest = x.bud > 0 ? clamp((Math.max(0,x.rest) / x.bud) * 100) : 0;

      const card = document.createElement("div");
      card.className = "fbx-cat";
      card.innerHTML = `
        <div class="fbx-cat-top">
          <div class="fbx-cat-name">${x.cat}</div>
          <div class="fbx-cat-num">${eur(x.ist)} / ${eur(x.bud)}</div>
        </div>
        <div class="fbx-track">
          <div class="fbx-fill" style="width:0%"></div>
          <div class="fbx-rest" style="width:0%; left:${pctIst}%"></div>
        </div>
        <div class="fbx-cat-meta">
          <span>Ist: ${pctIst.toFixed(0)}%</span>
          <span>${x.rest < 0 ? "Überzug: " + eur(x.rest) : "Rest: " + eur(x.rest)}</span>
        </div>
      `;
      elCats.appendChild(card);

      const fill = card.querySelector(".fbx-fill");
      const rest = card.querySelector(".fbx-rest");

      requestAnimationFrame(()=>{
        fill.style.width = pctIst + "%";
        rest.style.width = pctRest + "%";
      });

      // If overspent, swap rest bar to red by reducing green relevance
      if(x.rest < 0){
        rest.style.width = "0%";
        fill.style.background = "linear-gradient(90deg,#ef4444,#dc2626)";
      }
    });

    // Top deviations: overspends first
    const devi = [...norm]
      .filter(x=> x.bud > 0)
      .map(x=> ({cat:x.cat, diff:(x.bud - x.ist)})) // positive = under, negative = over
      .sort((a,b)=> a.diff - b.diff) // most negative first
      .slice(0,8);

    elTop.innerHTML = "";
    devi.forEach(d=>{
      const neg = d.diff < 0;
      const row = document.createElement("div");
      row.className = "fbx-row";
      row.innerHTML = `
        <div>
          <div class="fbx-row-title">${d.cat}</div>
          <div class="fbx-row-sub">${neg ? "Über Budget" : "Unter Budget"}</div>
        </div>
        <div class="fbx-row-val ${neg ? "neg" : "pos"}">${eur(d.diff)}</div>
      `;
      elTop.appendChild(row);
    });

    // Note: guidance
    const note =
      totalBud <= 0 ? "Hinweis: Budget ist leer/0 – bitte Budgetwerte in Dashboard.xlsx pflegen."
      : usagePct > 95 ? ("Achtung: Budget fast aufgebraucht (" + usagePct.toFixed(1).replace(".",",") + "%).")
      : usagePct > 80 ? ("Hinweis: Budget-Verbrauch hoch (" + usagePct.toFixed(1).replace(".",",") + "%).")
      : "Budget-Verbrauch im grünen Bereich.";

    elNote.textContent = note + (burn > 0 ? (" · Ø Burn: " + eur(burn) + "/Monat") : "");
  }

  window.FinanceBudgetModul = { render };
})();
