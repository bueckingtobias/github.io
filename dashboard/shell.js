(function(){
  window.Shell = window.Shell || {};
  window.Shell.mount = mount;

  function esc(s){ return String(s||"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m])); }

  function normalizePath(p){
    return String(p || "").toLowerCase().replace(/\/+$/, "");
  }

  function mount(options){
    const opt = options || {};
    const pageTitle = opt.title || "Dashboard";
    const pageSub = opt.sub || "";
    const activeHref = opt.active || "";

    const target = document.getElementById(opt.targetId || "app");
    if(!target) throw new Error("Shell.mount: #app not found");

    // pull content from template (preferred) or #pageContent
    let contentNode = null;
    const tpl = document.getElementById(opt.templateId || "pageTpl");
    if(tpl && tpl.content){
      contentNode = tpl.content.cloneNode(true);
    }else{
      const fallback = document.getElementById("pageContent");
      if(fallback){
        contentNode = document.createDocumentFragment();
        contentNode.appendChild(fallback);
      }else{
        contentNode = document.createDocumentFragment();
      }
    }

    target.innerHTML = `
      <div class="app">
        <aside class="sidebar" aria-label="Navigation">
          <div class="brand">
            <div class="brand-dot"></div>
            <div style="min-width:0">
              <div class="brand-title">Bücking Dashboard</div>
              <div class="brand-sub">Immobilien · Projekte · KPIs</div>
            </div>
          </div>

          <nav class="nav" id="nav">
            <a href="./view-home.html" data-title="Home" data-sub="Wetter · Kalender · KPIs">
              <div class="nav-ic">⌂</div>
              <div class="nav-txt">
                <div class="nav-title">Home</div>
                <div class="nav-sub">Wetter · Kalender · KPIs</div>
              </div>
            </a>

            <div class="nav-label">Business</div>

            <a href="./view-projects.html" data-title="Projekte / Bau" data-sub="Module: Gesamt + Gewerke">
              <div class="nav-ic">🏗</div>
              <div class="nav-txt">
                <div class="nav-title">Projekte / Bau</div>
                <div class="nav-sub">Module: Gesamt + Gewerke</div>
              </div>
            </a>

            <a href="./view-finance.html" data-title="Finanzen" data-sub="Cashflow · KPIs · Forecast">
              <div class="nav-ic">€</div>
              <div class="nav-txt">
                <div class="nav-title">Finanzen</div>
                <div class="nav-sub">Cashflow · KPIs · Forecast</div>
              </div>
            </a>

            <a href="./view-vermietung.html" data-title="Vermietung" data-sub="Auslastung · Mieten · Anfragen">
              <div class="nav-ic">🏠</div>
              <div class="nav-txt">
                <div class="nav-title">Vermietung</div>
                <div class="nav-sub">Auslastung · Mieten · Anfragen</div>
              </div>
            </a>

            <div class="nav-label">Tools</div>

            <a href="./admin.html" data-title="Admin" data-sub="Uploads · Settings · Debug">
              <div class="nav-ic">⚙</div>
              <div class="nav-txt">
                <div class="nav-title">Admin</div>
                <div class="nav-sub">Uploads · Settings · Debug</div>
              </div>
            </a>
          </nav>

          <div class="sidebar-footer">
            <span class="chip" id="clockSide">—</span>
            <span class="chip" id="authState">online</span>
          </div>
        </aside>

        <section class="main">
          <header class="topbar">
            <div class="page-title">
              <h1 id="pageTitle">${esc(pageTitle)}</h1>
              <div id="pageSub">${esc(pageSub)}</div>
            </div>

            <div class="top-right">
              <span class="chip" id="clockTop">—</span>
              <button class="btn btn-danger" id="btnLogout" type="button">Logout</button>
            </div>
          </header>

          <main class="content" id="mainScroll">
            <div class="container" id="shellSlot"></div>
          </main>
        </section>
      </div>
    `;

    // inject content
    const slot = document.getElementById("shellSlot");
    slot.appendChild(contentNode);

    // auth label
    const authState = document.getElementById("authState");
    try{
      authState.textContent = (window.Auth && Auth.isAuthed()) ? "session" : "locked";
    }catch(_){
      authState.textContent = "session";
    }

    // clock
    const clockTop = document.getElementById("clockTop");
    const clockSide = document.getElementById("clockSide");
    function tick(){
      const d = new Date();
      const t = d.toLocaleString("de-DE", {
        weekday:"short", year:"numeric", month:"2-digit", day:"2-digit",
        hour:"2-digit", minute:"2-digit"
      });
      if(clockTop) clockTop.textContent = t;
      if(clockSide) clockSide.textContent = t;
    }
    tick(); setInterval(tick, 15000);

    // active nav highlight (robust)
    const nav = document.getElementById("nav");
    const links = Array.from(nav.querySelectorAll("a[href]"));
    links.forEach(a => a.classList.remove("active"));

    const cur = normalizePath(location.pathname.split("/").pop() || "");
    const explicit = normalizePath(activeHref);

    let match =
      (explicit ? links.find(a => normalizePath(a.getAttribute("href")) === explicit) : null) ||
      links.find(a => normalizePath(a.getAttribute("href")).endsWith(cur)) ||
      links[0];

    if(match){
      match.classList.add("active");
      // if caller didn't force title/sub, use nav metadata
      if(!opt.title) document.getElementById("pageTitle").textContent = match.getAttribute("data-title") || "Dashboard";
      if(!opt.sub) document.getElementById("pageSub").textContent = match.getAttribute("data-sub") || "";
    }

    // logout
    const btnLogout = document.getElementById("btnLogout");
    btnLogout.addEventListener("click", ()=>{
      try{ if(window.Auth) Auth.logout(); }catch(_){}
      location.href = "./login.html";
    });

    // prevent sideways scroll due to accidental wide elements
    // (hard stop)
    document.documentElement.style.overflowX = "hidden";
    document.body.style.overflowX = "hidden";
  }
})();