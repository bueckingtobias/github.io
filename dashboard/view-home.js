(function(){
  window.ViewHome = window.ViewHome || {};
  window.ViewHome.mount = mount;

  const BASE = "./";
  const CB = (window.__CB__ || Date.now().toString(36));

  function errBox(container){ return container.querySelector("#homeErr"); }
  function showErr(container, msg){
    const b = errBox(container); if(!b) return;
    b.style.display = "block";
    b.textContent = msg;
  }
  function clearErr(container){
    const b = errBox(container); if(!b) return;
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
    l.href = href + (href.includes("?") ? "&" : "?") + "cb=" + CB;
  }

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

  function getHomeConfig(){
    return {
      calendarWebcal:
        "webcal://p102-caldav.icloud.com/published/2/MTcyODQ4MzQ5NzE3Mjg0ONqNcfIQNV_yxi54UpPH7ylf670BULRTzdyY4yXUuxPQNqK649_NSnbi8xLcIfs5a28Z0nD_u1CDu2WegcNzUOY",
      kpis: [
        { label:"Kontostand", value:"185.000 €", hint:"Startwert (Demo)" },
        { label:"Offene OP", value:"12", hint:"Dummy" },
        { label:"Auslastung", value:"92 %", hint:"Dummy" },
        { label:"Bau-Fortschritt", value:"61 %", hint:"Dummy" },
        { label:"Nächster Termin", value:"Heute 15:00", hint:"Dummy" }
      ]
    };
  }

  async function mount(container){
    clearErr(container);

    const slotWeather  = container.querySelector("#slotWeather");
    const slotCalendar = container.querySelector("#slotCalendar");
    const slotKpis     = container.querySelector("#slotKpis");

    let ok = 0, fail = 0;
    const fails = [];
    const cfg = getHomeConfig();

    async function tryMount(slot, html, cssId, css, jsId, js, globalName, args){
      try{
        await mountModule(slot, BASE+html, cssId, BASE+css, jsId, BASE+js, globalName, args);
        ok++;
      }catch(e){
        fail++;
        fails.push(globalName + ": " + (e?.message || e));
      }
    }

    await tryMount(slotWeather,  "home-weather-modul.html",  "css-home-weather",  "home-weather-modul.css",  "js-home-weather",  "home-weather-modul.js",  "HomeWeatherModul",  [cfg]);
    await tryMount(slotCalendar, "home-calendar-modul.html", "css-home-calendar", "home-calendar-modul.css", "js-home-calendar", "home-calendar-modul.js", "HomeCalendarModul", [cfg]);
    await tryMount(slotKpis,     "home-kpis-modul.html",     "css-home-kpis",     "home-kpis-modul.css",     "js-home-kpis",     "home-kpis-modul.js",     "HomeKpisModul",     [cfg]);

    if(fails.length){
      showErr(container, "Home-Module konnten nicht geladen werden:\n\n" + fails.join("\n"));
    }
  }

})();