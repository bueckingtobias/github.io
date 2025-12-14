/* dashboard/data-loader.js
   Loads IMMO data from:
   1) LocalStorage override (set by admin-data page)
   2) Otherwise master-data.js (window.IMMO_MASTER_DATA)

   Exposes:
     window.DataLoader.load() -> Promise<IMMO_DATA>
   And sets:
     window.IMMO_DATA
   Fires:
     window "immo:data-ready"
*/

(function () {
  const LS_KEY = "IMMO_DATA_OVERRIDE_V1";

  window.DataLoader = { load, clearOverride, hasOverride };

  async function load() {
    const data = getOverride() || getMaster();

    if (!data || typeof data !== "object") {
      window.IMMO_DATA = { home: [], projects: { gesamt: {}, gewerke: [] }, finance: {} };
      window.dispatchEvent(new Event("immo:data-ready"));
      return window.IMMO_DATA;
    }

    // Normalize minimal shape
    const normalized = normalize(data);

    window.IMMO_DATA = normalized;
    window.dispatchEvent(new Event("immo:data-ready"));
    return normalized;
  }

  function hasOverride() {
    return !!getOverrideRaw();
  }

  function clearOverride() {
    localStorage.removeItem(LS_KEY);
  }

  function getMaster() {
    return window.IMMO_MASTER_DATA || null;
  }

  function getOverrideRaw() {
    try {
      return localStorage.getItem(LS_KEY);
    } catch {
      return null;
    }
  }

  function getOverride() {
    const raw = getOverrideRaw();
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function normalize(d) {
    const out = {
      version: d.version || d._meta?.version || "local",
      updatedAt: d.updatedAt || d._meta?.updatedAt || new Date().toISOString(),
      home: Array.isArray(d.home) ? d.home : [],
      projects: {
        gesamt: (d.projects && typeof d.projects.gesamt === "object") ? d.projects.gesamt : {},
        gewerke: (d.projects && Array.isArray(d.projects.gewerke)) ? d.projects.gewerke : []
      },
      finance: (d.finance && typeof d.finance === "object") ? d.finance : {}
    };

    // Ensure some expected sections exist
    out.finance.gesamt = Array.isArray(out.finance.gesamt) ? out.finance.gesamt : [];
    out.finance.cashflow = Array.isArray(out.finance.cashflow) ? out.finance.cashflow : [];
    out.finance.mieten = Array.isArray(out.finance.mieten) ? out.finance.mieten : [];
    out.finance.op = Array.isArray(out.finance.op) ? out.finance.op : [];
    out.finance.reserven = Array.isArray(out.finance.reserven) ? out.finance.reserven : [];
    out.finance.budget = Array.isArray(out.finance.budget) ? out.finance.budget : [];

    return out;
  }
})();
