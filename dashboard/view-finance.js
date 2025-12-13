(function(){

  const slotGesamt   = document.getElementById("slotGesamt");
  const slotCashflow = document.getElementById("slotCashflow");
  const slotBudget   = document.getElementById("slotBudget");
  const slotOP       = document.getElementById("slotOP");
  const slotRes      = document.getElementById("slotReserven");
  const slotMieten   = document.getElementById("slotMieten");

  const seg12 = document.getElementById("seg12");
  const seg6  = document.getElementById("seg6");
  const seg3  = document.getElementById("seg3");
  const btnRefresh = document.getElementById("btnRefresh");

  const fxErr = document.getElementById("fxError");
  const fxSourceState = document.getElementById("fxSourceState");

  let horizon = 12;

  function showError(msg){
    if(!fxErr) return;
    fxErr.style.display = "block";
    fxErr.textContent = msg;
  }

  function clearError(){
    if(!fxErr) return;
    fxErr.style.display = "none";
    fxErr.textContent = "";
  }

  function bust(){ return "v=" + Date.now(); }

  async function fetchText(url){
    const r = await fetch(url, { cache:"no-store" });
    if(!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
    return await r.text();
  }

  function loadCssOnce(id, href){
    let l = document.getElementById(id);
    if(!l){
      l = document.createElement("link");
      l.id = id;
      l.rel = "stylesheet";
      document.head.appendChild(l);
    }
    l.href = href + (href.includes("?") ? "&" : "?") + bust();
  }

  async function loadScriptFresh(id, src){
    const old = document.getElementById(id);
    if(old) old.remove();

    await new Promise((res, rej)=>{
      const s = document.createElement("script");
      s.id = id;
      s.src = src + (src.includes("?") ? "&" : "?") + bust();
      s.onload = res;
      s.onerror = () => rej(new Error("Script konnte nicht geladen werden: " + s.src));
      document.head.appendChild(s);
    });
  }

  // ===== Data (Demo now, Excel later) =====
  function getFinanceData(){
    if(window.DASHBOARD_DATA && window.DASHBOARD_DATA.finance){
      if(fxSourceState) fxSourceState.textContent = "Live: Dashboard.xlsx";
      return window.DASHBOARD_DATA.finance;
    }

    if(fxSourceState) fxSourceState.textContent = "Demo-Daten";
    return {
      currency: "EUR",
      startCash: 185000,
      cashflow: [
        { month:"2025-01", inflow:52000, outflow:61000 },
        { month:"2025-02", inflow:54000, outflow:58500 },
        { month:"2025-03", inflow:61000, outflow:74000 },
        { month:"2025-04", inflow:59000, outflow:62000 },
        { month:"2025-05", inflow:63000, outflow:69000 },
        { month:"2025-06", inflow:66000, outflow:72000 },
        { month:"2025-07", inflow:65000, outflow:70000 },
        { month:"2025-08", inflow:67000, outflow:68000 },
        { month:"2025-09", inflow:64000, outflow:71000 },
        { month:"2025-10", inflow:69000, outflow:76000 },
        { month:"2025-11", inflow:72000, outflow:74000 },
        { month:"2025-12", inflow:76000, outflow:79000 }
      ],
      budget: [
        { category:"Finanzierung / Zinsen", type:"fixed", plan:24000, actual:25800 },
        { category:"Versicherungen", type:"fixed", plan:5200, actual:4800 },
        { category:"Energie / Betrieb", type:"variable", plan:9800, actual:11300 },
        { category:"Instandhaltung", type:"variable", plan:12000, actual:14600 },
        { category:"Dienstleister / Tools", type:"fixed", plan:3600, actual:4200 },
        { category:"Sonstiges", type:"variable", plan:2600, actual:3100 }
      ],
      ar: [
        { title:"Miete – Einheit 2.1", object:"Baumstraße 35", due:"2025-12-05", amount:1450, status:"faellig" },
        { title:"Miete – Einheit 1.2", object:"Baumstraße 35", due:"2025-11-25", amount:1320, status:"ueberfaellig" },
        { title:"Nebenkosten-Nachzahlung", object:"Hof Ganderkesee", due:"2025-12-20", amount:860, status:"faellig" }
      ],
      ap: [
        { title:"Abschlag", vendor:"Elektro Schröder", due:"2025-12-18", amount:9000, status:"faellig" },
        { title:"Schlussrechnung", vendor:"Dachdecker Hofmann", due:"2025-12-07", amount:6200, status:"ueberfaellig" },
        { title:"Hosting", vendor:"Software / Hosting", due:"2025-12-28", amount:180, status:"faellig" }
      ],
      reserves: [
        { name:"Steuerrücklage", current:38000, target:60000, note:"Ziel: 3–4 Monate Steuerpuffer" },
        { name:"Instandhaltungsrücklage", current:24000, target:50000, note:"Ziel: 1–2% vom Bestand/Jahr" },
        { name:"Liquiditätspuffer", current:52000, target:80000, note:"Ziel: Sicherheit für Bau-/Timing-Risiken" }
      ],
      rents: [
        { object:"Baumstraße 35", units:6, soll:8400, ist:7080, vacancy:1, arrears:1320 },
        { object:"Hof Ganderkesee", units:5, soll:7200, ist:7200, vacancy:0, arrears:0 },
        { object:"Syke (Planung)", units:4, soll:5600, ist:0, vacancy:4, arrears:0 }
      ]
    };
  }

  function sliceHorizon(cashflow){
    const arr = cashflow || [];
    return arr.slice(Math.max(0, arr.length - horizon));
  }

  function setSeg(active){
    [seg12,seg6,seg3].forEach(x=>x && x.classList.remove("is-active"));
    if(active===12) seg12.classList.add("is-active");
    if(active===6)  seg6.classList.add("is-active");
    if(active===3)  seg3.classList.add("is-active");
  }

  async function mountModule(slotEl, htmlFile, cssId, cssFile, jsId, jsFile, globalName, renderArgs){
    const html = await fetchText(htmlFile);
    slotEl.innerHTML = html;

    loadCssOnce(cssId, cssFile);
    await loadScriptFresh(jsId, jsFile);

    const api = window[globalName];
    if(!api || typeof api.render !== "function"){
      throw new Error(`${globalName}.render fehlt`);
    }

    const root =
      slotEl.querySelector(`.${api.rootClass || ""}`) ||
      slotEl.querySelector("[data-module-root]") ||
      slotEl.firstElementChild;

    api.render(root, ...renderArgs);
  }

  async function renderAll(){
    clearError();
    const data = getFinanceData();
    const cash = sliceHorizon(data.cashflow);

    try{
      await mountModule(
        slotGesamt,
        "./finance-gesamt-modul.html",
        "css-fin-gesamt", "./finance-gesamt-modul.css",
        "js-fin-gesamt",  "./finance-gesamt-modul.js",
        "FinanceGesamtModul",
        [data, cash, { horizon }]
      );

      await mountModule(
        slotCashflow,
        "./finance-cashflow-modul.html",
        "css-fin-cash", "./finance-cashflow-modul.css",
        "js-fin-cash",  "./finance-cashflow-modul.js",
        "FinanceCashflowModul",
        [data, cash, { horizon }]
      );

      await mountModule(
        slotBudget,
        "./finance-budget-modul.html",
        "css-fin-budget", "./finance-budget-modul.css",
        "js-fin-budget",  "./finance-budget-modul.js",
        "FinanceBudgetModul",
        [data, { horizon }]
      );

      await mountModule(
        slotOP,
        "./finance-op-modul.html",
        "css-fin-op", "./finance-op-modul.css",
        "js-fin-op",  "./finance-op-modul.js",
        "FinanceOPModul",
        [data, { horizon }]
      );

      await mountModule(
        slotRes,
        "./finance-reserven-modul.html",
        "css-fin-res", "./finance-reserven-modul.css",
        "js-fin-res",  "./finance-reserven-modul.js",
        "FinanceReservenModul",
        [data, { horizon }]
      );

      await mountModule(
        slotMieten,
        "./finance-mieten-modul.html",
        "css-fin-mieten", "./finance-mieten-modul.css",
        "js-fin-mieten",  "./finance-mieten-modul.js",
        "FinanceMietenModul",
        [data, { horizon }]
      );

    }catch(e){
      showError(
        "Finanzen Fehler:\n" + (e?.message || e) +
        "\n\nCheck:\n- Alle Dateien liegen in /dashboard/\n- Dateinamen exakt (case-sensitiv)\n- dashboard Ordner kleingeschrieben\n"
      );
    }
  }

  function attach(){
    if(btnRefresh) btnRefresh.addEventListener("click", renderAll);
    if(seg12) seg12.addEventListener("click", ()=>{ horizon=12; setSeg(12); renderAll(); });
    if(seg6)  seg6.addEventListener("click", ()=>{ horizon=6;  setSeg(6);  renderAll(); });
    if(seg3)  seg3.addEventListener("click", ()=>{ horizon=3;  setSeg(3);  renderAll(); });
  }

  window.addEventListener("DOMContentLoaded", ()=>{
    attach();
    setSeg(horizon);
    renderAll();
  });

})();