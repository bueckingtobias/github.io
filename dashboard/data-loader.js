(function () {
  window.DataLoader = { load };

  const LS_KEY = "IMMO_ADMIN_OVERRIDE_V1";

  async function load() {
    if (!window.IMMO_MASTER_DATA) {
      window.IMMO_DATA = { home: [], projects: { gesamt: {}, gewerke: [] }, finance: {} };
      window.IMMO_DATA_META = { ok: false, reason: "IMMO_MASTER_DATA fehlt" };
      fire(false, "IMMO_MASTER_DATA fehlt (master-data.js lädt nicht oder hat Syntax-Error).");
      return;
    }

    // optional override
    let override = null;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) override = JSON.parse(raw);
    } catch (_) {}

    const merged = deepMerge(clone(window.IMMO_MASTER_DATA), override || {});

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
      version: merged.version || "",
      updatedAt: merged.updatedAt || "",
      source: override ? "master+override" : "master",
      homeCount: window.IMMO_DATA.home.length
    };

    fire(true, `OK (${window.IMMO_DATA_META.source})`);
  }

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
