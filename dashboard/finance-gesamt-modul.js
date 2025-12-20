(function(){
  "use strict";

  window.FinanceGesamtModul = { render };

  function render(host, data){
    const root = host && host.querySelector ? host.querySelector("#financeGesamtRoot") : null;
    if(!root) return;

    // ---- Resolve finance data robustly (View + IMMO_DATA + IMMO_MASTER_DATA) ----
    const resolved = resolveFinance(data);

    const finance = resolved.finance;
    const gesamtRows = resolved.gesamt;
    const cashflowRows = resolved.cashflow;
    const budgetRows = resolved.budget;
    const homeRows = resolved.home;

    // ---- Elements ----
    const elZeitraum = root.querySelector("#fgZeitraum");
    const elRunway = root.querySelector("#fgRunway");
    const elNextRent = root.querySelector("#fgNextRent");

    const elKontostand = root.querySelector("#fgKontostand");
    const elLiquide = root.querySelector("#fgLiquide");
    const elRuecklagen = root.querySelector("#fgRuecklagen");
    const elShortDebt = root.querySelector("#fgShortDebt");

    const elBudgetPct = root.querySelector("#fgBudgetPct");
    const elBudgetFill = root.querySelector("#fgBudgetFill");
    const elBudgetHint = root.querySelector("#fgBudgetHint");
    const elBudgetRows = root.querySelector("#fgBudgetRows");

    const elCfTrend = root.querySelector("#fgCfTrend");
    const elCfChart = root.querySelector("#fgCfChart");
    const elCfHint = root.querySelector("#fgCfHint");

    const elRiskCount = root.querySelector("#fgRiskCount");
    const elRisks = root.querySelector("#fgRisks");
    const elRiskHint = root.querySelector("#fgRiskHint");

    const elTopCount = root.querySelector("#fgTopCount");
    const elTopBudgets = root.querySelector("#fgTopBudgets");
    const elTopHint = root.querySelector("#fgTopHint");

    // ---- KPI values from finance.gesamt[0] (fallbacks) ----
    const g0 = (Array.isArray(gesamtRows) && gesamtRows[0]) ? gesamtRows[0] : {};

    const kontostand = numPick(g0, ["Kontostand", "Kontostand_€", "Kontostand_EUR"]);
    const liquide = numPick(g0, ["Liquide_Mittel", "Liquide Mittel", "LiquideMittel"]);
    const ruecklagen = numPick(g0, ["Ruecklagen", "Rücklagen", "Reserven"]);
    const shortDebt = numPick(g0, ["Verbindlichkeiten_kurzfristig", "Kurzfristige_Verbindlichkeiten", "Kurzfr_Verbindlichkeiten"]);

    elKontostand.textContent = eur(kontostand);
    elLiquide.textContent = eur(liquide);
    elRuecklagen.textContent = eur(ruecklagen);
    elShortDebt.textContent = eur(shortDebt);

    // ---- Zeitraum: last month of cashflow/mieten or home ----
    const months = extractMonths(cashflowRows, homeRows, budgetRows);
    elZeitraum.textContent = months.length ? `Zeitraum: ${months[0]} – ${months[months.length-1]}` : "Zeitraum: —";

    // ---- Next rent: fixed 01. of next month (as requested earlier) ----
    const nextRent = nextFirstOfMonth();
    const days = daysUntil(nextRent);
    elNextRent.textContent = `Nächste Miete: ${fmtDate(nextRent)} · ${days} Tage`;

    // ---- Runway: if avg cashflow negative -> liquide / abs(avg) months ----
    const last6 = lastN(cashflowRows, 6);
    const avgCF = last6.length ? last6.reduce((s,r)=>s+numPick(r,["Cashflow"]),0)/last6.length : 0;
    if(avgCF < -1){
      const runway = liquide > 0 ? (liquide / Math.abs(avgCF)) : 0;
      elRunway.textContent = `Runway: ${runway.toFixed(1)} Monate`;
    } else {
      elRunway.textContent = "Runway: ∞ (positiv)";
    }

    // ---- Budget status ----
    const b = Array.isArray(budgetRows) ? budgetRows : [];
    const budgetSum = b.reduce((s,r)=>s+numPick(r,["Budget"]),0);
    const forecastSum = b.reduce((s,r)=>s+numPick(r,["Forecast"]),0);
    const pct = budgetSum > 0 ? (forecastSum / budgetSum) * 100 : 0;

    // color logic: <=100 blue, >100 red-ish
    elBudgetPct.textContent = budgetSum > 0 ? `${pct.toFixed(1)} %` : "0,0 %";
    elBudgetFill.style.width = clamp(pct,0,140).toFixed(1) + "%";
    elBudgetFill.textContent = budgetSum > 0 ? `${pct.toFixed(1)}%` : "0%";
    elBudgetFill.style.background = (budgetSum > 0 && pct > 100)
      ? "linear-gradient(90deg, rgba(239,68,68,1), rgba(248,113,113,1))"
      : "linear-gradient(90deg, rgba(59,130,246,1), rgba(37,99,235,1))";

    if(budgetSum <= 0){
      elBudgetHint.textContent = "Kein Budget hinterlegt. Bitte finance.budget im Master pflegen.";
    } else {
      elBudgetHint.textContent = `Budget gesamt ${eur(budgetSum)} · Forecast ${eur(forecastSum)} · Puffer ${eur(budgetSum - forecastSum)}`;
    }

    // budget rows detail (top 4 by forecast)
    elBudgetRows.innerHTML = "";
    const sortedB = b.slice().sort((a,b)=>numPick(b,["Forecast"]) - numPick(a,["Forecast"]));
    const topB = sortedB.slice(0,4);

    if(topB.length){
      topB.forEach(r=>{
        const name = String(r.Bereich || r.Kategorie || "Budget").trim() || "Budget";
        const bud = numPick(r,["Budget"]);
        const fc = numPick(r,["Forecast"]);
        const diff = fc - bud;

        const row = document.createElement("div");
        row.className = "fg-row" + (bud>0 && diff>0 ? " over" : "");
        row.innerHTML = `
          <div class="l">
            <div class="t">${esc(name)}</div>
            <div class="s">Budget ${eur(bud)} · Forecast ${eur(fc)}</div>
          </div>
          <div class="r">
            <div class="n">${bud>0 ? ( (fc/bud*100).toFixed(1) + " %" ) : "—"}</div>
            <div class="d">${diff>0 ? ("+"+eur(diff)) : eur(diff)}</div>
          </div>
        `;
        elBudgetRows.appendChild(row);
      });
    }

    // ---- Risks: forecast > budget ----
    const risks = sortedB
      .filter(r => numPick(r,["Budget"]) > 0 && numPick(r,["Forecast"]) > numPick(r,["Budget"]))
      .map(r => {
        const bud = numPick(r,["Budget"]);
        const fc = numPick(r,["Forecast"]);
        return {
          name: String(r.Bereich || r.Kategorie || "Budget").trim() || "Budget",
          bud, fc,
          diff: fc - bud,
          pct: (fc/bud)*100
        };
      })
      .sort((a,b)=>b.diff - a.diff)
      .slice(0,3);

    elRisks.innerHTML = "";
    if(risks.length){
      elRiskCount.textContent = `kritisch: ${risks.length}/${b.length || 0}`;
      elRiskHint.textContent = "Forecast > Budget in diesen Kategorien.";
      risks.forEach(x=>{
        const item = document.createElement("div");
        item.className = "fg-item";
        item.innerHTML = `
          <div class="a">
            <div class="k">${esc(x.name)}</div>
            <div class="m">Budget ${eur(x.bud)} · Forecast ${eur(x.fc)}</div>
          </div>
          <div class="b">+${eur(x.diff)} · ${x.pct.toFixed(1)}%</div>
        `;
        elRisks.appendChild(item);
      });
    } else {
      elRiskCount.textContent = "kritisch: 0";
      elRiskHint.textContent = "Forecast ≤ Budget in allen Kategorien.";
      elRisks.innerHTML = `<div class="fg-muted">Keine Budget-Überläufe erkannt</div>`;
    }

    // ---- Top budgets (plan) ----
    const topBud = b
      .map(r => ({ name: String(r.Bereich || r.Kategorie || "Budget").trim() || "Budget", bud: numPick(r,["Budget"]) }))
      .filter(x => x.bud > 0)
      .sort((a,b)=>b.bud - a.bud)
      .slice(0,3);

    elTopBudgets.innerHTML = "";
    if(topBud.length){
      const sumTop = topBud.reduce((s,x)=>s+x.bud,0);
      elTopCount.textContent = `Top 3: ${budgetSum>0 ? ((sumTop/budgetSum)*100).toFixed(1) : "—"} %`;
      elTopHint.textContent = `Fokusbereiche mit den größten Planbudgets (gesamt ${eur(sumTop)}).`;
      topBud.forEach(x=>{
        const item = document.createElement("div");
        item.className = "fg-item";
        item.innerHTML = `
          <div class="a">
            <div class="k">${esc(x.name)}</div>
            <div class="m">Planbudget</div>
          </div>
          <div class="b">${eur(x.bud)}</div>
        `;
        elTopBudgets.appendChild(item);
      });
    } else {
      elTopCount.textContent = "—";
      elTopHint.textContent = "Keine Budgetdaten. Bitte finance.budget im Master pflegen.";
      elTopBudgets.innerHTML = `<div class="fg-muted">Keine Budgetdaten</div>`;
    }

    // ---- Cashflow chart: last 6 months bars + trendline (bounded to 6) ----
    renderCashflowChart(elCfChart, elCfHint, elCfTrend, cashflowRows);
  }

  // ---------------- Chart ----------------

  function renderCashflowChart(host, hintEl, trendEl, rows){
    host.innerHTML = "";

    const series = lastN(Array.isArray(rows)?rows:[], 6)
      .map(r => ({
        m: String(r.Monat || "").trim(),
        v: numPick(r,["Cashflow"])
      }))
      .filter(x => x.m && isFinite(x.v));

    if(!series.length){
      hintEl.textContent = "Keine Cashflow-Historie vorhanden.";
      trendEl.textContent = "Trend: —";
      host.innerHTML = `<div class="fg-muted">Keine Cashflow-Historie vorhanden.</div>`;
      return;
    }

    // bars
    const maxAbs = Math.max(1, ...series.map(x => Math.abs(x.v)));
    const barsWrap = document.createElement("div");
    barsWrap.className = "fg-bars";

    series.forEach((x, idx)=>{
      const bar = document.createElement("div");
      bar.className = "fg-bar";

      const col = document.createElement("div");
      col.className = "col";

      const fill = document.createElement("div");
      fill.className = "fill";

      // positive blue, negative red
      fill.style.background = x.v >= 0
        ? "linear-gradient(180deg, rgba(59,130,246,1), rgba(37,99,235,1))"
        : "linear-gradient(180deg, rgba(239,68,68,1), rgba(248,113,113,1))";

      const h = clamp((Math.abs(x.v)/maxAbs)*100, 6, 100);
      // animate after attach
      fill.dataset.h = h.toFixed(2);

      col.appendChild(fill);

      const lbl = document.createElement("div");
      lbl.className = "lbl";
      lbl.textContent = shortYM(x.m);

      const val = document.createElement("div");
      val.className = "val";
      val.textContent = eurShort(x.v);

      bar.appendChild(col);
      bar.appendChild(val);
      bar.appendChild(lbl);

      barsWrap.appendChild(bar);
    });

    host.appendChild(barsWrap);

    // trendline (only over the 6 months, not beyond)
    const spark = document.createElement("div");
    spark.className = "fg-spark";
    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("viewBox","0 0 100 42");
    svg.setAttribute("preserveAspectRatio","none");

    const values = series.map(x=>x.v);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const range = Math.max(1, maxV - minV);

    const pts = values.map((v,i)=>{
      const x = (i/(values.length-1))*100;
      const y = 38 - ((v - minV)/range)*34; // keep margins
      return [x,y];
    });

    const d = "M " + pts.map(p=>`${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" L ");
    const path = document.createElementNS("http://www.w3.org/2000/svg","path");
    path.setAttribute("d", d);
    path.setAttribute("fill","none");
    path.setAttribute("stroke","rgba(226,232,240,.90)");
    path.setAttribute("stroke-width","2");

    const glow = document.createElementNS("http://www.w3.org/2000/svg","path");
    glow.setAttribute("d", d);
    glow.setAttribute("fill","none");
    glow.setAttribute("stroke","rgba(59,130,246,.35)");
    glow.setAttribute("stroke-width","6");
    glow.setAttribute("stroke-linecap","round");
    glow.setAttribute("stroke-linejoin","round");

    svg.appendChild(glow);
    svg.appendChild(path);
    spark.appendChild(svg);
    host.appendChild(spark);

    // animate bars
    requestAnimationFrame(()=>{
      host.querySelectorAll(".fill").forEach((f)=>{
        const h = f.dataset.h || "0";
        f.style.height = h + "%";
      });
    });

    // Trend text based on last 2 points
    const last = series[series.length-1].v;
    const prev = series[series.length-2] ? series[series.length-2].v : last;
    const delta = last - prev;

    if(Math.abs(delta) < 1){
      trendEl.textContent = "Trend: stabil";
      hintEl.textContent = `Letzter Cashflow: ${eur(last)}.`;
    } else if(delta > 0){
      trendEl.textContent = "Trend: steigend";
      hintEl.textContent = `Letzter Cashflow: ${eur(last)} (↑ ${eur(delta)} ggü. Vormonat).`;
    } else {
      trendEl.textContent = "Trend: fallend";
      hintEl.textContent = `Letzter Cashflow: ${eur(last)} (↓ ${eur(Math.abs(delta))} ggü. Vormonat).`;
    }
  }

  // ---------------- Resolve + Utils ----------------

  function resolveFinance(data){
    // Priority:
    // 1) explicit data passed in
    // 2) window.IMMO_DATA (normalized)
    // 3) window.IMMO_MASTER_DATA (raw)
    const d = (data && typeof data === "object") ? data : {};

    const IMD = (window.IMMO_DATA && typeof window.IMMO_DATA === "object") ? window.IMMO_DATA : {};
    const IMS = (window.IMMO_MASTER_DATA && typeof window.IMMO_MASTER_DATA === "object") ? window.IMMO_MASTER_DATA : {};

    const finFromData = d.finance || d.financeData || null;
    const finFromIMD = IMD.finance || null;
    const finFromIMS = IMS.finance || null;

    const finance = finFromData || finFromIMD || finFromIMS || {};

    // Rows: accept both “finance.* arrays” and “flat rows passed”
    const gesamt = pickArr(d, ["financeRows", "gesamtRows"]) || pickArr(finance, ["gesamt"]) || [];
    const cashflow = pickArr(finance, ["cashflow"]) || pickArr(d, ["cashflowRows"]) || [];
    const mieten = pickArr(finance, ["mieten"]) || pickArr(d, ["mietenRows"]) || [];
    const budget = pickArr(finance, ["budget"]) || pickArr(d, ["budgetRows"]) || [];
    const home = pickArr(d, ["homeRows"]) || pickArr(IMD, ["home"]) || pickArr(IMS, ["home"]) || [];

    return { finance, gesamt, cashflow, mieten, budget, home };
  }

  function pickArr(obj, keys){
    if(!obj || typeof obj !== "object") return null;
    for(const k of keys){
      const v = obj[k];
      if(Array.isArray(v)) return v;
    }
    return null;
  }

  function extractMonths(cfRows, homeRows, budgetRows){
    const m = [];
    if(Array.isArray(cfRows)) cfRows.forEach(r=>{ const x=String(r.Monat||"").trim(); if(x) m.push(x); });
    if(!m.length && Array.isArray(homeRows)) homeRows.forEach(r=>{ const x=String(r.Monat||"").trim(); if(x) m.push(x); });
    if(!m.length && Array.isArray(budgetRows)) budgetRows.forEach(r=>{ const x=String(r.Monat||"").trim(); if(x) m.push(x); });
    const uniq = Array.from(new Set(m)).sort();
    // show up to last 6
    return uniq.length > 6 ? uniq.slice(uniq.length-6) : uniq;
  }

  function lastN(arr, n){
    if(!Array.isArray(arr)) return [];
    return arr.slice(Math.max(0, arr.length - n));
  }

  function numPick(obj, keys){
    for(const k of keys){
      if(obj && obj[k] != null && String(obj[k]).trim() !== "") return toNum(obj[k]);
    }
    return 0;
  }

  function toNum(v){
    if(typeof v === "number") return isFinite(v) ? v : 0;
    const s = String(v == null ? "" : v).trim();
    if(!s) return 0;
    return Number(s.replace(/\./g,"").replace(",", ".")) || 0;
  }

  function eur(n){
    const v = toNum(n);
    return v.toLocaleString("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0});
  }

  function eurShort(n){
    const v = toNum(n);
    const abs = Math.abs(v);
    if(abs >= 1000000) return (v/1000000).toFixed(1).replace(".",",") + " Mio";
    if(abs >= 1000) return (v/1000).toFixed(0) + "k";
    return eur(v).replace("€","").trim() + "€";
  }

  function shortYM(ym){
    // "2025-12" -> "12/25"
    const s = String(ym || "").trim();
    const m = s.match(/^(\d{4})-(\d{2})/);
    if(!m) return s;
    return `${m[2]}/${m[1].slice(2)}`;
  }

  function clamp(x,a,b){ return Math.max(a, Math.min(b, x)); }

  function esc(s){
    return String(s).replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  function nextFirstOfMonth(){
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth();
    // next month first day
    return new Date(y, m+1, 1);
  }

  function fmtDate(d){
    return d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});
  }

  function daysUntil(target){
    const now = new Date();
    const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const b = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const diff = Math.round((b - a) / (24*3600*1000));
    return Math.max(0, diff);
  }
})();