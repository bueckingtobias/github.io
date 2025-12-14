/* dashboard/data-loader.js
   Master → IMMO_DATA (used by all modules)
   Self-healing: tries to load master-data.js if missing
*/

(function () {
  window.DataLoader = { load };

  const LS_KEY = "IMMO_ADMIN_OVERRIDE_V1";

  async function load() {
    // 0) Try ensure master is present
    const masterOk = await ensureMaster();

    if (!masterOk) {
      window.IMMO_DATA = { home: [], projects: { gesamt: {}, gewerke: [] }, finance: {} };
      window.IMMO_DATA_META = {
        ok: false,
        source: "none",
        version: "",
        updatedAt: "",
        homeCount: 0,
        reason:
          window.IMMO_DATA_META?.reason ||
          "IMMO_MASTER_DATA fehlt. master-data.js konnte nicht geladen werden.",
        expectedUrl: expectedMasterUrl(),
      };
      fire(false, window.IMMO_DATA_META.reason);
      return;
    }

    // 1) Optional override from admin
    let override = null;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) override = JSON.parse(raw);
    } catch (_) {}

    // 2) Merge (override wins)
    const merged = deepMerge(clone(window.IMMO_MASTER_DATA), override || {});

    // 3) Normalize for modules
    window.IMMO_DATA = {
      home: Array.isArray(merged.home) ? merged.home : [],
      projects: {
        gesamt: merged.projects?.gesamt || {},
        gewerke: Array.isArray(merged.projects?.gewerke) ? merged.projects.gewerke : [],
      },
      finance: merged.finance || {},
    };

    window.IMMO_DATA_META = {
      ok: true,
      source: override ? "master+override" : "master",
      version: merged.version || "",
      updatedAt: merged.updatedAt || "",
      homeCount: Array.isArray(window.IMMO_DATA.home) ? window.IMMO_DATA.home.length : 0,
      expectedUrl: expectedMasterUrl(),
    };

    fire(true, `OK (${window.IMMO_DATA_META.source})`);
  }

  /* -------------------- master self-heal -------------------- */

  async function ensureMaster() {
    if (window.IMMO_MASTER_DATA) return true;

    // Try dynamic load (in case script tag order/cache failed)
    const url = expectedMasterUrl() + (expectedMasterUrl().includes("?") ? "&" : "?") + "v=" + Date.now();

    try {
      await loadScript(url);
    } catch (e) {
      window.IMMO_DATA_META = window.IMMO_DATA_META || {};
      window.IMMO_DATA_META.reason =
        "master-data.js konnte nicht geladen werden. Prüfe Dateiname/Pfad/Casing. URL: " +
        url +
        " · Fehler: " +
        String(e && e.message ? e.message : e);
      return false;
    }

    // If script loaded but still no global, it likely has a syntax error inside
    if (!window.IMMO_MASTER_DATA) {
      window.IMMO_DATA_META = window.IMMO_DATA_META || {};
      window.IMMO_DATA_META.reason =
        "master-data.js wurde geladen, aber IMMO_MASTER_DATA fehlt. Wahrscheinlich Syntax-Error in master-data.js. Öffne die Datei direkt im Browser: " +
        expectedMasterUrl();
      return false;
    }

    return true;
  }

  function expectedMasterUrl() {
    // view-home.html sits in /dashboard/ → "./master-data.js" resolves correctly.
    // Keep it explicit for debug.
    try {
      const base = location.href.replace(/#.*$/, "").replace(/\?.*$/, "");
      const dir = base.substring(0, base.lastIndexOf("/") + 1);
      return dir + "master-data.js";
    } catch (_) {
      return "./master-data.js";
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // prevent duplicates
      const already = Array.from(document.scripts || []).find(s => (s.src || "").includes("master-data.js"));
      if (already && window.IMMO_MASTER_DATA) return resolve();

      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Script load error"));
      document.head.appendChild(s);
    });
  }

  /* -------------------- helpers -------------------- */

  function fire(ok, msg) {
    try {
      window.dispatchEvent(new CustomEvent("immo:data-ready", { detail: { ok, msg } }));
    } catch (_) {}
    console.log("✅ DataLoader:", ok, msg, window.IMMO_DATA_META);
  }

  function clone(obj) {
    try { if (typeof structuredClone === "function") return structuredClone(obj); } catch (_) {}
    return JSON.parse(JSON.stringify(obj || {}));
  }

  function isObj(x) {
    return x && typeof x === "object" && !Array.isArray(x);
  }

  function deepMerge(base, patch) {
    if (!isObj(base) || !isObj(patch)) return patch ?? base;
    const out = { ...base };
    Object.keys(patch).forEach((k) => {
      const pv = patch[k];
      const bv = base[k];
      if (isObj(bv) && isObj(pv)) out[k] = deepMerge(bv, pv);
      else out[k] = pv;
    });
    return out;
  }
})();
