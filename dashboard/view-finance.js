(function(){

  const slotGesamt   = document.getElementById("slotGesamt");
  const slotCashflow = document.getElementById("slotCashflow");
  const slotBudget   = document.getElementById("slotBudget");
  const slotOP       = document.getElementById("slotOP");
  const slotRes      = document.getElementById("slotReserven");
  const slotMieten   = document.getElementById("slotMieten");

  const btnRefresh = document.getElementById("btnRefresh");
  const fxErr = document.getElementById("fxError");

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

  async function mountModule(slotEl, htmlFile, cssId, cssFile, jsId, jsFile, globalName, renderArgs){
    const html = await fetchText(htmlFile);
    slotEl.innerHTML = html;

    loadCssOnce(cssId, cssFile);
    await loadScriptFresh(jsId, jsFile);

    const api = window[globalName];
    if(!api || typeof api.render !== "function"){
      throw new Error(`${globalName}.render fehlt (globalName falsch oder JS nicht geladen)`);
    }

    // Root finden
    const root =
      slotEl.querySelector(`.${api.rootClass || ""}`) ||
      slotEl.querySelector("[data-module-root]") ||
      slotEl.firstElementChild;

    if(!root){
      throw new Error(`Kein Root-Element im Modul HTML gefunden: ${htmlFile}`);
    }

    api.render(root, ...renderArgs);
  }

  // Demo Daten (Excel später)
  function getFinanceData(){
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
      ]
    };
  }

  function sliceHorizon(cashflow, horizon){
    const arr = cashflow || [];
    return arr.slice(Math.max(0, arr.length - horizon));
  }

  async function renderAll(){
    clearError();

    const data = getFinanceData();
    const horizon = 12;
    const cash = sliceHorizon(data.cashflow, horizon);

    try{
      // OPTIONAL: wenn du (noch) kein Gesamtmodul hast, kommentier diesen Block aus.
      await mountModule(
        slotGesamt,
        "./finance-gesamt-modul.html",
        "css-fin-gesamt", "./finance-gesamt-modul.css",
        "js-fin-gesamt",  "./finance-gesamt-modul.js",
        "FinanceGesamtModul",
        [data, cash, { horizon }]
      );
    }catch(e){
      // Gesamtmodul soll nicht alles blockieren -> nur Hinweis, rest läuft weiter
      showError("Hinweis (Gesamtmodul): " + (e?.message || e));
      // trotzdem weiter
    }

    try{
      await mountModule(
        slotCashflow,
        "./finance-cashflow-modul.html",
        "css-fin-cash", "./finance-cashflow-modul.css",
        "js-fin-cash",  "./finance-cashflow-modul.js",
        "FinanceCashflowModul",
        [data, cash, { horizon }]
      );
    }catch(e){
      showError((fxErr.textContent ? fxErr.textContent + "\n\n" : "") + "Cashflow Fehler:\n" + (e?.message || e));
    }

    // Die folgenden Module kannst du erstmal als Platzhalter lassen,
    // oder du spielst deine echten Modul-Dateien ein.
    async function tryMount(slot, html, cssId, css, jsId, js, globalName){
      try{
        await mountModule(slot, html, cssId, css, jsId, js, globalName, [data, { horizon }]);
      }catch(e){
        // Slot bleibt leer, aber Seite bleibt stabil
        showError((fxErr.textContent ? fxErr.textContent + "\n\n" : "") + `${globalName}:\n${e?.message || e}`);
      }
    }

    await tryMount(slotBudget, "./finance-budget-modul.html", "css-fin-budget","./finance-budget-modul.css","js-fin-budget","./finance-budget-modul.js","FinanceBudgetModul");
    await tryMount(slotOP, "./finance-op-modul.html", "css-fin-op","./finance-op-modul.css","js-fin-op","./finance-op-modul.js","FinanceOPModul");
    await tryMount(slotRes, "./finance-reserven-modul.html", "css-fin-res","./finance-reserven-modul.css","js-fin-res","./finance-reserven-modul.js","FinanceReservenModul");
    await tryMount(slotMieten, "./finance-mieten-modul.html", "css-fin-mieten","./finance-mieten-modul.css","js-fin-mieten","./finance-mieten-modul.js","FinanceMietenModul");
  }

  window.addEventListener("DOMContentLoaded", ()=>{
    if(btnRefresh) btnRefresh.addEventListener("click", renderAll);
    renderAll();
  });

})();