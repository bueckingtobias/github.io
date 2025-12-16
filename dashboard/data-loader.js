/* dashboard/data-loader.js
   Loads /dashboard/master-data.js and builds window.IMMO_DATA for modules.
*/
(function(){
  "use strict";

  window.DataLoader = { load };

  async function load(){
    const meta = {
      ok: false,
      version: "—",
      reason: "",
      ts: Date.now()
    };

    try{
      // Ensure master is present
      if (!window.IMMO_MASTER_DATA){
        const url = "./master-data.js?v=" + Date.now();
        await loadScript(url);
      }

      if (!window.IMMO_MASTER_DATA){
        meta.ok = false;
        meta.reason = "IMMO_MASTER_DATA fehlt nach Script-Load";
        finalize(meta);
        return;
      }

      meta.ok = true;
      meta.version = window.IMMO_MASTER_DATA.version || "—";
      meta.reason = "";

      // ✅ Build IMMO_DATA (stable contract for all modules)
      const m = window.IMMO_MASTER_DATA;

      window.IMMO_DATA = {
        home: Array.isArray(m.home) ? m.home : [],
        projects: {
          gesamt: m.projects?.gesamt || {},
          gewerke: Array.isArray(m.projects?.gewerke) ? m.projects.gewerke : []
        },
        finance: m.finance || {}
      };

      // Signal
      window.IMMO_DATA_META = meta;
      window.dispatchEvent(new CustomEvent("immo:data-ready"));

    }catch(e){
      meta.ok = false;
      meta.reason = String(e && e.message ? e.message : e);
      finalize(meta);
    }
  }

  function finalize(meta){
    window.IMMO_DATA_META = meta;
    // still define IMMO_DATA to prevent crashes
    if (!window.IMMO_DATA){
      window.IMMO_DATA = { home: [], projects: { gesamt:{}, gewerke:[] }, finance:{} };
    }
    window.dispatchEvent(new CustomEvent("immo:data-ready"));
  }

  function loadScript(src){
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Script load failed: " + src));
      document.head.appendChild(s);
    });
  }
})();