(function(){
  const CB = (window.__CB__ || Date.now().toString(36));
  const slot = document.getElementById("viewSlot");

  // Clock
  const clockTop = document.getElementById("clockTop");
  const clockSide = document.getElementById("clockSide");

  function tick(){
    const d = new Date();
    const t = d.toLocaleString("de-DE", { weekday:"short", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
    if(clockTop) clockTop.textContent = t;
    if(clockSide) clockSide.textContent = t;
  }
  tick(); setInterval(tick, 15000);

  // Active nav highlight + header title/sub
  (function(){
    const path = (location.pathname || "").toLowerCase();
    const nav = document.getElementById("nav");
    const links = Array.from(nav.querySelectorAll("a[href]"));
    links.forEach(a => a.classList.remove("active"));

    const match = links.find(a=>{
      const href = (a.getAttribute("href")||"").toLowerCase();
      const normalized = href.replace("./","/").replace("//","/");
      return path.endsWith(normalized);
    }) || links[0];

    if(match){
      match.classList.add("active");
      document.getElementById("pageTitle").textContent = match.getAttribute("data-title") || "Dashboard";
      document.getElementById("pageSub").textContent = match.getAttribute("data-sub") || "";
    }
  })();

  // Helper: load css once (view-level)
  function loadCssOnce(id, href){
    let l = document.getElementById(id);
    if(!l){
      l = document.createElement("link");
      l.id = id;
      l.rel = "stylesheet";
      document.head.appendChild(l);
    }
    l.href = href + (href.includes("?") ? "&" : "?") + "cb=" + CB;
  }

  // Helper: load script fresh
  async function loadScriptFresh(id, src){
    const old = document.getElementById(id);
    if(old) old.remove();
    await new Promise((res, rej)=>{
      const s = document.createElement("script");
      s.id = id;
      s.src = src + (src.includes("?") ? "&" : "?") + "cb=" + CB;
      s.onload = res;
      s.onerror = () => rej(new Error("Script konnte nicht geladen werden: " + s.src));
      document.head.appendChild(s);
    });
  }

  async function fetchText(url){
    const r = await fetch(url, { cache:"no-store" });
    if(!r.ok) throw new Error(url + " → HTTP " + r.status);
    return await r.text();
  }

  async function loadHome(){
    // 1) view-home.css laden (nur content styling)
    loadCssOnce("css-view-home", "./view-home.css");

    // 2) view-home.html partial laden
    const html = await fetchText("./view-home.html");
    slot.innerHTML = html;

    // 3) view-home.js starten (mount modules)
    await loadScriptFresh("js-view-home", "./view-home.js");
    if(window.ViewHome && typeof window.ViewHome.mount === "function"){
      window.ViewHome.mount(slot);
    }else{
      throw new Error("ViewHome.mount fehlt");
    }
  }

  // Start
  loadHome().catch(err=>{
    slot.innerHTML = `
      <pre style="
        padding:12px 14px;border-radius:14px;
        border:1px solid rgba(248,113,113,.35);
        background: rgba(127,29,29,.18);
        color: rgba(254,202,202,.95);
        font-size: 11px; overflow:auto;">
Fehler beim Laden der Home-View:
${String(err && err.message ? err.message : err)}
      </pre>
    `;
  });

})();