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
  function last(arr){ return (arr && arr.length) ? arr[arr.length-1] : null; }

  function pickHome(homeRows, key){
    const r = (homeRows||[]).find(x => String(x.KPI||"").trim() === key);
    return r ? n(r.Wert) : null;
  }

  function render(container, data){
    const root = container.querySelector("[data-fg-root]") || container;

    const financeRows  = Array.isArray(data?.financeRows) ? data.financeRows : [];
    const opRows       = Array.isArray(data?.opRows) ? data.opRows : [];
    const reservesRows = Array.isArray(data?.reservesRows) ? data.reservesRows : [];
    const budgetRows   = Array.isArray(data?.budgetRows) ? data.budgetRows : [];
    const homeRows     = Array.isArray(data?.homeRows) ? data.homeRows : [];

    const elSub   = root.querySelector("[data-fg-sub]");
    const elKpis  = root.querySelector("[data-fg-kpis]");
    const elFazit = root.querySelector("[data-fg-fazit]");
    const elNext  = root.querySelector("[data-fg-next]");

    const now = new Date();
    elSub.textContent = "Stand: " + now.toLocaleString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});

    const cur = last(financeRows);
    const cashM  = cur ? n(cur.Cashflow) : null;
    const mieteM = cur ? n(cur.Mieteinnahmen) : null;
    const pachtM = cur ? n(cur.Pachteinnahmen) : null;

    const opTotal = opRows.reduce((a,r)=> a + n(r.Betrag ?? r.Amount ?? r.Summe), 0);
    const reservesTotal = reservesRows.reduce((a,r)=> a + n(r.Betrag ?? r.Amount ?? r.Summe), 0);

    const budgetTotal = budgetRows.reduce((a,r)=> a + n(r.Budget), 0);
    const istTotal    = budgetRows.reduce((a,r)=> a + n(r.Ist), 0);
    const restBudget  = budgetTotal - istTotal;

    const auslast = pickHome(homeRows, "Auslastung der Wohnungen");
    const roi     = pickHome(homeRows, "Portfolio ROI");

    const tiles = [
      { k:"Cashflow (Monat)", v: cashM==null ? "—" : eur(cashM), m:"letzte Finance-Zeile" },
      { k:"Miete (Monat)", v: mieteM==null ? "—" : eur(mieteM), m:"Eingang/Plan" },
      { k:"Pacht (Monat)", v: pachtM==null ? "—" : eur(pachtM), m:"Eingang/Plan" },
      { k:"OP gesamt", v: eur(opTotal), m:"offene Posten" },
      { k:"Reserven", v: eur(reservesTotal), m:"Puffer" },
      { k:"Restbudget", v: (budgetTotal>0 ? eur(restBudget) : "—"), m:"Budget - Ist" },
    ];

    elKpis.innerHTML = "";
    tiles.forEach(t=>{
      const d = document.createElement("div");
      d.className = "fg-tile";
      d.innerHTML = `<div class="fg-k">${t.k}</div><div class="fg-v">${t.v}</div><div class="fg-m">${t.m}</div>`;
      elKpis.appendChild(d);
    });

    const cashTxt = (cashM==null) ? "Cashflow-Daten prüfen" : (cashM >= 0 ? "Cashflow positiv" : "Cashflow negativ");
    const opTxt   = opTotal > 0 ? ("OP offen: " + eur(opTotal)) : "OP sauber";
    const extraA  = (auslast!=null) ? (" · Auslastung: " + pct(auslast)) : "";
    const extraR  = (roi!=null) ? (" · ROI: " + pct(roi)) : "";
    elFazit.textContent = cashTxt + " · " + opTxt + extraA + extraR;

    const next = (opTotal > 0) ? "OP priorisieren & Fälligkeiten sichern"
              : (restBudget < 0) ? "Budget-Überzug prüfen & korrigieren"
              : "Forecast / Planwerte fortschreiben";
    elNext.textContent = next;
  }

  window.FinanceGesamtModul = { render };
})();
