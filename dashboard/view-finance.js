(function(){

  // ===== Health Chips =====
  const chipBase    = document.getElementById("chipBase");
  const chipCSS     = document.getElementById("chipCSS");
  const chipModules = document.getElementById("chipModules");
  const appRoot     = document.getElementById("appRoot");

  const BASE = (window.__BASE_DASH__ || "./");
  if(chipBase) chipBase.textContent = "Base: " + BASE;

  function markActive(href){
    const p = (location.pathname || "").toLowerCase();
    const file = p.split("/").pop() || "";
    // normalize: if you're serving from /dashboard/ or root
    const target = (href || "").toLowerCase().replace("./","").replace("dashboard/","");
    return file === target;
  }

  // ===== Inject external CSS with correct base path =====
  function loadViewCss(){
    return new Promise((resolve)=>{
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = BASE + "view-finance.css?v=" + Date.now();
      link.onload = ()=> resolve(true);
      link.onerror = ()=> resolve(false);
      document.head.appendChild(link);
    });
  }

  // ===== Minimal App Shell HTML (rendered by JS to avoid path mistakes) =====
  function renderShell(){
    appRoot.innerHTML = `
      <div class="app">
        <aside class="sidebar" aria-label="Navigation">
          <div class="brand">
            <div class="brand-dot"></div>
            <div class="brand-txt">
              <div class="brand-title">Bücking Dashboard</div>
              <div class="brand-sub">Immobilien · Projekte · KPIs</div>
            </div>
          </div>

          <nav class="nav" id="nav">
            <a href="${BASE}index.html" class="${markActive("index.html") ? "active" : ""}">
              <div class="nav-ic">⌂</div>
              <div class="nav-txt">
                <div class="nav-title">Übersicht</div>
                <div class="nav-sub">Startseite / Quick KPIs</div>
              </div>
            </a>

            <div class="nav-label">Views</div>

            <a href="${BASE}view-projects.html" class="${markActive("view-projects.html") ? "active" : ""}">
              <div class="nav-ic">🏗</div>
              <div class="nav-txt">
                <div class="nav-title">Projekte / Bau</div>
                <div class="nav-sub">Gewerke & Handwerker</div>
              </div>
            </a>

            <a href="${BASE}view-finance.html" class="${markActive("view-finance.html") ? "active" : ""}">
              <div class="nav-ic">€</div>
              <div class="nav-txt">
                <div class="nav-title">Finanzen</div>
                <div class="nav-sub">Cashflow, Budget, OPs</div>
              </div>
            </a>

            <a href="${BASE}view-vermietung.html" class="${markActive("view-vermietung.html") ? "active" : ""}">
              <div class="nav-ic">🏠</div>
              <div class="nav-txt">
                <div class="nav-title">Vermietung</div>
                <div class="nav-sub">Mieten, Leerstand, Leads</div>
              </div>
            </a>

            <div class="nav-label">Tools</div>

            <a href="${BASE}admin.html" class="${markActive("admin.html") ? "active" : ""}">
              <div class="nav-ic">⚙</div>
              <div class="nav-txt">
                <div class="nav-title">Admin</div>
                <div class="nav-sub">Uploads, Debug, Settings</div>
              </div>
            </a>
          </nav>

          <div class="sidebar-footer">
            <span class="chip" id="clockSide">—</span>
            <span class="chip">online</span>
          </div>
        </aside>

        <section class="main">
          <header class="topbar">
            <div class="page-title">
              <h1>Finanzen</h1>
              <div>Modular · Datenquelle später: Dashboard.xlsx</div>
            </div>
            <button class="btn" id="btnRefresh">↻ Reload</button>
          </header>

          <main class="content">
            <div class="fx-root">
              <pre class="fx-error" id="fxErrBox" style="display:none;"></pre>

              <section class="fx-row">
                <div id="slotGesamt"></div>
              </section>

              <section class="fx-grid-2">
                <div class="fx-cell" id="slotCashflow"></div>
                <div class="fx-cell" id="slotBudget"></div>
                <div class="fx-cell" id="slotOP"></div>
                <div class="fx-cell" id="slotReserven"></div>
              </section>

              <section class="fx-row">
                <div id="slotMieten"></div>
              </section>
            </div>
          </main>
        </section>
      </div>
    `;
  }

  // ===== Helpers =====
  function errBox(){ return document.getElementById("fxErrBox"); }
  function showErr(msg){
    const b = errBox();
    if(!b) return;
    b.style.display = "block";
    b.textContent = msg;
  }
  function clearErr(){
    const b = errBox();
    if(!b) return;
    b.style.display = "none";
    b.textContent = "";
  }

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
    l.href = href + (href.includes("?") ? "&" : "?") + "v=" + Date.now();
  }

  async function loadScriptFresh(id, src){
    const old = document.getElementById(id);
    if(old) old.remove();

    await new Promise((res, rej)=>{
      const s = document.createElement("script");
      s.id = id;
      s.src = src + (src.includes("?") ? "&" : "?") + "v=" + Date.now();
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
      throw new Error(`${globalName}.render fehlt`);
    }

    const root =
      slotEl.querySelector(`.${api.rootClass || ""}`) ||
      slotEl.querySelector("[data-module-root]") ||
      slotEl.firstElementChild;

    if(!root) throw new Error(`Kein Root im HTML: ${htmlFile}`);

    api.render(root, ...renderArgs);
  }

  // ===== Demo Finance Data =====
  function getFinanceData(){
    return {
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
  function sliceHorizon(arr, h){
    return (arr||[]).slice(Math.max(0, (arr||[]).length - h));
  }

  async function renderAll(){
    clearErr();

    const data = getFinanceData();
    const horizon = 12;
    const cash = sliceHorizon(data.cashflow, horizon);

    const slotGesamt   = document.getElementById("slotGesamt");
    const slotCashflow = document.getElementById("slotCashflow");
    const slotBudget   = document.getElementById("slotBudget");
    const slotOP       = document.getElementById("slotOP");
    const slotRes      = document.getElementById("slotReserven");
    const slotMieten   = document.getElementById("slotMieten");

    let okCount = 0;
    let failCount = 0;
    const fails = [];

    async function tryMount(slot, html, cssId, css, jsId, js, globalName, args){
      try{
        await mountModule(slot, BASE+html, cssId, BASE+css, jsId, BASE+js, globalName, args);
        okCount++;
      }catch(e){
        failCount++;
        fails.push(globalName + ": " + (e?.message || e));
      }
    }

    await tryMount(slotGesamt,   "finance-gesamt-modul.html",   "css-fin-gesamt", "finance-gesamt-modul.css",   "js-fin-gesamt", "finance-gesamt-modul.js",   "FinanceGesamtModul",   [data, cash, { horizon }]);
    await tryMount(slotCashflow, "finance-cashflow-modul.html", "css-fin-cash",   "finance-cashflow-modul.css", "js-fin-cash",   "finance-cashflow-modul.js", "FinanceCashflowModul", [data, cash, { horizon }]);

    await tryMount(slotBudget,   "finance-budget-modul.html",   "css-fin-budget", "finance-budget-modul.css",   "js-fin-budget", "finance-budget-modul.js",   "FinanceBudgetModul",   [data, { horizon }]);
    await tryMount(slotOP,       "finance-op-modul.html",       "css-fin-op",     "finance-op-modul.css",       "js-fin-op",     "finance-op-modul.js",       "FinanceOPModul",       [data, { horizon }]);
    await tryMount(slotRes,      "finance-reserven-modul.html", "css-fin-res",    "finance-reserven-modul.css", "js-fin-res",    "finance-reserven-modul.js", "FinanceReservenModul", [data, { horizon }]);
    await tryMount(slotMieten,   "finance-mieten-modul.html",   "css-fin-mieten", "finance-mieten-modul.css",   "js-fin-mieten", "finance-mieten-modul.js",   "FinanceMietenModul",   [data, { horizon }]);

    if(chipModules){
      chipModules.textContent = `Module: ${okCount} ok / ${failCount} fail`;
      chipModules.className = "chip " + (failCount ? "warn" : "ok");
    }

    if(fails.length){
      showErr(
        "Module konnten nicht geladen werden:\n\n" +
        fails.join("\n") +
        "\n\nCheck:\n- Dateien liegen in: " + BASE +
        "\n- Ordner heißt exakt: dashboard (klein)\n- Dateinamen exakt (case-sensitiv)\n"
      );
    }
  }

  // ===== Start =====
  window.addEventListener("DOMContentLoaded", async ()=>{
    // 1) shell rendern
    renderShell();

    // 2) externe CSS laden
    const cssOk = await loadViewCss();
    if(chipCSS){
      chipCSS.textContent = "CSS: " + (cssOk ? "ok" : "FAIL");
      chipCSS.className = "chip " + (cssOk ? "ok" : "warn");
    }

    // 3) modules laden
    await renderAll();

    // refresh
    const btn = document.getElementById("btnRefresh");
    if(btn) btn.addEventListener("click", renderAll);

    // clocks
    const clockSide = document.getElementById("clockSide");
    function tick(){
      const d = new Date();
      const t = d.toLocaleString("de-DE",{ weekday:"short", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
      if(clockSide) clockSide.textContent = t;
    }
    tick(); setInterval(tick, 15000);
  });

})();