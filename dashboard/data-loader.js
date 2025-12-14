/* dashboard/data-loader.js
   Normalizes master-data into window.IMMO_DATA (used by all modules).
   Supports optional admin override stored in localStorage.
*/

(function () {
  window.DataLoader = { load };

  const LS_KEY = "IMMO_ADMIN_OVERRIDE_V1";

  async function load() {
    // 1) Master must exist
    if (!window.IMMO_MASTER_DATA) {
      window.IMMO_DATA = { home: [], projects: { gesamt: {}, gewerke: [] }, finance: {} };
      fireReady(false, "IMMO_MASTER_DATA fehlt (master-data.js lädt nicht oder hat Syntax-Error).");
      return;
    }

    // 2) Optional override from admin
    let override = null;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) override = JSON.parse(raw);
    } catch (_) {}

    // 3) Merge (override wins)
    const merged = deepMerge(structuredCloneSafe(window.IMMO_MASTER_DATA), override || {});

    // 4) Normalize into legacy shape used by modules
    window.IMMO_DATA = {
      home: Array.isArray(merged.home) ? merged.home : [],
      finance: merged.finance || {},
      projects: {
        gesamt: merged.projects?.gesamt || {},
        gewerke: Array.isArray(merged.projects?.gewerke) ? merged.projects.gewerke : [],
      },
    };

    // 5) Debug footprint (optional)
    window.IMMO_DATA_META = {
      version: merged.version || "",
      updatedAt: merged.updatedAt || "",
      source: override ? "master+override" : "master",
    };

    fireReady(true, `OK (${window.IMMO_DATA_META.source})`);
  }

  function fireReady(ok, msg) {
    try {
      window.dispatchEvent(
        new CustomEvent("immo:data-ready", {
          detail: {
            ok,
            msg,
            homeCount: Array.isArray(window.IMMO_DATA?.home) ? window.IMMO_DATA.home.length : 0,
            projectsCount: Array.isArray(window.IMMO_DATA?.projects?.gewerke) ? window.IMMO_DATA.projects.gewerke.length : 0,
          },
        })
      );
    } catch (_) {}
    // Keep console for dev
    console.log("✅ DataLoader:", ok, msg, window.IMMO_DATA);
  }

  function structuredCloneSafe(obj) {
    try {
      if (typeof structuredClone === "function") return structuredClone(obj);
    } catch (_) {}
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
