/* finance-gesamt-modul.js
   Optik/Struktur angelehnt an gewerk-gesamt-modul.
   OP wird NICHT als Position/Kachel geführt (wie gewünscht).
*/
(function(){
  "use strict";

  window.FinanceGesamtModul = { render };

  function render(host, data){
    try{
      const root = host?.querySelector?.("#financeGesamtModule") || host;
      if(!root) return;

      const source = data || {};
      const immo = window.IMMO_DATA || {};
      const fin = (source.financeRows || source.finance || immo.finance || {}) || {};

      const finGesamt = pickArray(fin.gesamt) || [];
      const finCashflow = pickArray(fin.cashflow) || [];
      const finBudget = pickArray(fin.budget) || [];

      const last = finGesamt[0] || finGesamt[finGesamt.length-1] || {};
      const kontostand = num(last.Kontostand);
      const liquide = num(last.Liquide_Mittel);
      const ruecklagen = num(last.Ruecklagen);
      const verbind = num(last.Verbindlichkeiten_kurzfristig);

      // Cashflow: last 6 months
      const cfSorted = finCashflow.slice().filter(r => String(r.Monat||"").trim()).sort((a,b)=> String(a.Monat).localeCompare(String(b.Monat)));
      const cfLast6 = cfSorted.slice(-6);
      const cfVals = cfLast6.map(r => num(r.Cashflow));

      // Period badge
      const periodTxt = cfLast6.length ? `${fmtYM(cfLast6[0].Monat)}–${fmtYM(cfLast6[cfLast6.length-1].Monat)}` : "—";
      setTxt(root, "fgBadgePeriod", `Zeitraum: ${periodTxt}`);

      // Next rent: 01. (countdown)
      const nextRent = nextRentDate();
      const daysToRent = Math.max(0, Math.ceil((nextRent.getTime() - startOfDay(new Date()).getTime())/86400000));
      setTxt(root, "fgBadgeNextRent", `Nächste Miete: ${fmtDate(nextRent)} · ${daysToRent} Tage`);

      // Runway: based on average negative cashflow or (Ausgaben) if given
      const avgCf = cfVals.length ? (cfVals.reduce((a,b)=>a+b,0) / cfVals.length) : 0;
      const burn = avgCf < 0 ? Math.abs(avgCf) : 0;
      const runway = burn > 0 ? (liquide / burn) : null;
      setTxt(root, "fgBadgeRunway", `Runway: ${runway ? runway.toFixed(1).replace(".",",") + " Monate" : "∞ (positiv)"}`);

      // KPI tiles
      setTxt(root,"fgKontostand", eur(kontostand));
      setTxt(root,"fgLiquide", eur(liquide));
      setTxt(root,"fgRuecklagen", eur(ruecklagen));
      setTxt(root,"fgVerbind", eur(verbind));

      // Budget status: sum Budget vs Forecast
      const budgetRows = finBudget.slice();
      const sumBudget = budgetRows.reduce((s,r)=> s + num(r.Budget), 0);
      const sumForecast = budgetRows.reduce((s,r)=> s + num(r.Forecast), 0);
      const sumIst = budgetRows.reduce((s,r)=> s + num(r.Ist), 0);

      const pct = sumBudget > 0 ? (sumForecast / sumBudget * 100) : 0;
      const pctClamped = clamp(pct, 0, 150); // allow overshoot but clamp for bar
      const pctBar = clamp(pct, 0, 100);

      setTxt(root, "fgBudgetLabel", `${pct.toFixed(1).replace(".",",")} %`);
      setTxt(root, "fgBudgetFillTxt", `${pct.toFixed(1).replace(".",",")} %`);
      setTxt(root, "fgBudgetMeta",
        sumBudget > 0
          ? `Budget ${eur(sumBudget)} · Ist ${eur(sumIst)} · Forecast ${eur(sumForecast)} · Abw. ${eur(sumForecast - sumBudget)}`
          : "Kein Budget hinterlegt."
      );

      const fill = root.querySelector("#fgBudgetFill");
      if(fill){
        fill.style.width = "0%";
        fill.dataset.w = `${pctBar}%`;
        requestAnimationFrame(()=>{ fill.style.width = fill.dataset.w; });
      }

      // Spark bars (cashflow 6M)
      const spark = root.querySelector("#fgSpark");
      if(spark){
        spark.innerHTML = "";
        const maxAbs = Math.max(1, ...cfVals.map(v => Math.abs(v)));
        cfLast6.forEach((r, idx)=>{
          const v = num(r.Cashflow);
          const h = clamp(Math.round(Math.abs(v) / maxAbs * 100), 4, 100);
          const bar = document.createElement("div");
          bar.className = "fg-spbar " + (idx === cfLast6.length-1 ? "cur" : (v >= 0 ? "pos" : "neg"));
          bar.innerHTML = `<i style="height:0%"></i>`;
          spark.appendChild(bar);
          requestAnimationFrame(()=>{
            const i = bar.querySelector("i");
            if(i) i.style.height = h + "%";
          });
        });
      }

      const trendTxt = trendLabel(cfVals);
      setTxt(root, "fgTrendLabel", trendTxt);
      setTxt(root, "fgTrendMeta",
        cfVals.length
          ? `Ø Cashflow (6M): ${eur(Math.round(avgCf))} · Letzter Monat: ${eur(Math.round(cfVals[cfVals.length-1]))}`
          : "Keine Cashflow-Historie vorhanden."
      );

      // Risks: top 3 forecast overshoot
      const risks = budgetRows
        .map(r=>{
          const b = num(r.Budget);
          const f = num(r.Forecast);
          const diff = f - b;
          const pct = b>0 ? diff/b*100 : 0;
          return { Bereich: String(r.Bereich||r.Kategorie||"Unbekannt"), Budget:b, Forecast:f, Ist:num(r.Ist), Diff:diff, Pct:pct, Kommentar:String(r.Kommentar||"") };
        })
        .sort((a,b)=> b.Diff - a.Diff);

      const topRisks = risks.filter(x=> x.Diff > 0).slice(0,3);
      const risksList = root.querySelector("#fgRisksList");
      if(risksList){
        risksList.innerHTML = "";
        if(!topRisks.length){
          risksList.innerHTML = `<div class="fg-item"><div class="fg-item-title">Keine Budget-Überläufe erkannt</div><div class="fg-item-sub">Forecast ≤ Budget in allen Kategorien.</div></div>`;
        } else {
          topRisks.forEach(x=>{
            const badge = `+${x.Pct.toFixed(1).replace(".",",")} %`;
            const el = document.createElement("div");
            el.className = "fg-item";
            el.innerHTML = `
              <div class="fg-item-top">
                <div class="fg-item-title" title="${esc(x.Bereich)}">${esc(x.Bereich)}</div>
                <div class="fg-item-badge bad">${badge}</div>
              </div>
              <div class="fg-item-sub">
                Budget ${eur(x.Budget)} · Forecast ${eur(x.Forecast)} · Abw. ${eur(x.Diff)}
                ${x.Kommentar ? " · " + esc(x.Kommentar) : ""}
              </div>
            `;
            risksList.appendChild(el);
          });
        }
      }

      // Top budgets: biggest plan
      const top = risks.slice().sort((a,b)=> b.Budget - a.Budget).slice(0,3);
      const topList = root.querySelector("#fgTopList");
      if(topList){
        topList.innerHTML = "";
        if(!top.length){
          topList.innerHTML = `<div class="fg-item"><div class="fg-item-title">Keine Budgetdaten</div><div class="fg-item-sub">Bitte finance.budget im Master pflegen.</div></div>`;
        } else {
          const sumTop = top.reduce((s,x)=> s+x.Budget,0);
          const share = sumBudget>0 ? (sumTop/sumBudget*100) : 0;

          top.forEach(x=>{
            const badge = eur(x.Budget);
            const good = x.Diff <= 0;
            const el = document.createElement("div");
            el.className = "fg-item";
            el.innerHTML = `
              <div class="fg-item-top">
                <div class="fg-item-title" title="${esc(x.Bereich)}">${esc(x.Bereich)}</div>
                <div class="fg-item-badge ${good ? "good" : ""}">${badge}</div>
              </div>
              <div class="fg-item-sub">
                Ist ${eur(x.Ist)} · Forecast ${eur(x.Forecast)} · Abw. ${eur(x.Diff)}
              </div>
            `;
            topList.appendChild(el);
          });

          // Put the share info into note instead
          setTxt(root, "fgNote",
            sumBudget>0
              ? `Fokus: Top 3 Budgetblöcke = ${share.toFixed(1).replace(".",",")} % des Gesamtbudgets. ` +
                `OP ist bewusst NICHT in dieser Kachel enthalten (kommt separat im OP-Modul).`
              : `Hinweis: Budget fehlt – bitte im Master unter finance.budget pflegen. OP ist bewusst NICHT in dieser Kachel enthalten.`
          );
        }
      }

      // Sub line details
      const note2 = (last.Notiz || last.Notiztext || last.Notiz_ || "");
      const subtitle = [
        (last.Monat ? `Stand: ${fmtYM(last.Monat)}` : ""),
        (note2 ? `· ${String(note2)}` : "")
      ].filter(Boolean).join(" ");
      if(subtitle) setTxt(root, "fgSub", subtitle);

    } catch(err){
      // Fail silently but show something minimal
      try{
        host.textContent = "FinanceGesamtModul Fehler: " + (err && err.message ? err.message : String(err));
      } catch {}
    }
  }

  // ---------- helpers ----------
  function pickArray(v){ return Array.isArray(v) ? v : (Array.isArray(window.IMMO_DATA?.finance?.[v]) ? window.IMMO_DATA.finance[v] : null); }

  function setTxt(root, id, txt){
    const el = root.querySelector("#"+id);
    if(el) el.textContent = txt;
  }

  function num(v){
    if(typeof v === "number") return isFinite(v) ? v : 0;
    if(v == null) return 0;
    const s = String(v).trim();
    if(!s) return 0;
    return Number(s.replace(/\./g,"").replace(",", ".")) || 0;
  }

  function eur(v){
    const n = Math.round(num(v));
    return new Intl.NumberFormat("de-DE",{ style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(n);
  }

  function fmtYM(s){
    const t = String(s||"").trim();
    if(!t) return "—";
    const [y,m] = t.split("-");
    if(!y || !m) return t;
    const months = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
    const mi = Math.max(1, Math.min(12, parseInt(m,10))) - 1;
    return `${months[mi]} ${y}`;
  }

  function fmtDate(d){
    try{
      return d.toLocaleDateString("de-DE",{ day:"2-digit", month:"2-digit", year:"numeric" });
    }catch{ return "—"; }
  }

  function startOfDay(d){
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function nextRentDate(){
    const d = new Date();
    const today = startOfDay(d);
    const y = today.getFullYear();
    const m = today.getMonth(); // 0-based
    const firstThis = new Date(y, m, 1);
    if(today.getTime() <= firstThis.getTime()){
      return firstThis;
    }
    return new Date(y, m+1, 1);
  }

  function clamp(x,a,b){ return Math.max(a, Math.min(b, x)); }

  function trendLabel(vals){
    if(!vals || vals.length < 2) return "Trend: —";
    const a = vals[0], b = vals[vals.length-1];
    const diff = b - a;
    const dir = diff > 0 ? "↗" : diff < 0 ? "↘" : "→";
    return `Trend: ${dir} ${eur(Math.round(diff))}`;
  }

  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g, m => (
      m==="&"?"&amp;":m==="<"?"&lt;":m===">"?"&gt;":m==='"'?"&quot;":"&#39;"
    ));
  }
})();