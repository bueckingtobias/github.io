/* dashboard/data-loader.js
   Robust loader:
   - Ensures window.IMMO_MASTER_DATA is loaded via <script> injection (NO fetch+eval).
   - Builds window.IMMO_DATA in the structure your modules expect.
   - Supports localStorage override (optional) but never breaks master load.
*/

(function () {
  "use strict";

  window.DataLoader = { load };

  const MASTER_PATH = "./master-data.js";

  // Override keys (we read ANY of them, first match wins)
  const OVERRIDE_KEYS = [
    "IMMO_OVERRIDE_JSON",
    "IMMO_OVERRIDE",
    "IMMO_DATA_OVERRIDE",
    "IMMO_MASTER_OVERRIDE"
  ];

  async function load() {
    const meta = {
      ok: false,
      version: "—",
      expectedUrl: "",
      reason: "",
      source: "master",
      hasMaster: false,
      hasData: false
    };

    try {
      // 1) Try override first (if user uses admin-data)
      const override = readOverride();
      if (override && typeof override === "object") {
        // If override already is IMMO_DATA shape -> use it
        if (override.home && override.projects && override.finance) {
          window.IMMO_DATA = normalizeIMMOData(override);
          meta.source = "override(IMMO_DATA)";
          meta.ok = true;
          meta.version = override.version || "override";
          meta.hasData = true;
          window.IMMO_DATA_META = meta;
          return;
        }

        // If override is IMMO_MASTER_DATA shape -> build IMMO_DATA from it
        if (override.home && override.projects && override.finance) {
          // (same as above) but keep for clarity
          window.IMMO_DATA = normalizeIMMOData(override);
          meta.source = "override(master-shape)";
          meta.ok = true;
          meta.version = override.version || "override";
          meta.hasData = true;
          window.IMMO_DATA_META = meta;
          return;
        }

        // If override looks like IMMO_MASTER_DATA (common)
        if (override.home && override.projects && override.finance) {
          window.IMMO_DATA = normalizeFromMaster(override);
          meta.source = "override(IMMO_MASTER_DATA)";
          meta.ok = true;
          meta.version = override.version || "override";
          meta.hasData = true;
          window.IMMO_DATA_META = meta;
          return;
        }

        // If override is stored as {IMMO_MASTER_DATA:{...}} or {data:{...}}
        if (override.IMMO_MASTER_DATA) {
          window.IMMO_DATA = normalizeFromMaster(override.IMMO_MASTER_DATA);
          meta.source = "override(IMMO_MASTER_DATA wrapper)";
          meta.ok = true;
          meta.version = override.IMMO_MASTER_DATA.version || "override";
          meta.hasData = true;
          window.IMMO_DATA_META = meta;
          return;
        }
        if (override.data && override.data.home) {
          window.IMMO_DATA = normalizeIMMOData(override.data);
          meta.source = "override(data wrapper)";
          meta.ok = true;
          meta.version = override.data.version || "override";
          meta.hasData = true;
          window.IMMO_DATA_META = meta;
          return;
        }
      }

      // 2) Ensure master present
      if (!window.IMMO_MASTER_DATA) {
        const bust = String(Date.now());
        meta.expectedUrl = absUrl(MASTER_PATH) + "?v=" + bust;

        await loadScript(MASTER_PATH + "?v=" + bust);

        if (!window.IMMO_MASTER_DATA) {
          meta.reason = "master-data.js geladen, aber window.IMMO_MASTER_DATA fehlt (falscher Inhalt/Cache?)";
          window.IMMO_DATA = window.IMMO_DATA || { home: [], projects: { gesamt: {}, gewerke: [] }, finance: {} };
          meta.hasMaster = false;
          meta.hasData = !!window.IMMO_DATA;
          window.IMMO_DATA_META = meta;
          return;
        }
      }

      meta.hasMaster = true;
      meta.version = window.IMMO_MASTER_DATA.version || "—";

      // 3) Build IMMO_DATA from master
      window.IMMO_DATA = normalizeFromMaster(window.IMMO_MASTER_DATA);
      meta.ok = true;
      meta.reason = "";
      meta.hasData = true;
      meta.source = "master";

      window.IMMO_DATA_META = meta;
    } catch (e) {
      meta.ok = false;
      meta.reason = (e && e.message) ? e.message : String(e);
      window.IMMO_DATA = window.IMMO_DATA || { home: [], projects: { gesamt: {}, gewerke: [] }, finance: {} };
      meta.hasMaster = !!window.IMMO_MASTER_DATA;
      meta.hasData = !!window.IMMO_DATA;
      window.IMMO_DATA_META = meta;
    }
  }

  function readOverride() {
    try {
      for (const k of OVERRIDE_KEYS) {
        const s = localStorage.getItem(k);
        if (!s) continue;
        try { return JSON.parse(s); } catch {}
      }
    } catch {}
    return null;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // prevent duplicate
      const already = Array.from(document.scripts).some(s => (s.src || "").includes(stripQuery(src)));
      if (already) return resolve();

      const s = document.createElement("script");
      s.src = src;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Script nicht geladen: " + src));
      document.head.appendChild(s);
    });
  }

  function stripQuery(u) {
    try { return String(u).split("?")[0]; } catch { return String(u); }
  }

  function absUrl(rel) {
    try { return new URL(rel, location.href).toString(); } catch { return rel; }
  }

  // -------- Normalization --------

  function normalizeFromMaster(master) {
    // master shape:
    // { home:[], projects:{gesamt,gewerke}, finance:{gesamt,cashflow,mieten,op,reserven,budget} }

    const home = Array.isArray(master.home) ? master.home.map(normalizeHomeRow) : [];

    const projects = master.projects || {};
    const gesamt = projects.gesamt || {};
    const gewerke = Array.isArray(projects.gewerke) ? projects.gewerke.map(normalizeGewerkRow) : [];

    const finance = master.finance || {};
    // keep same structure (modules read finance.* directly in some cases)
    const outFinance = {
      gesamt: Array.isArray(finance.gesamt) ? finance.gesamt : [],
      cashflow: Array.isArray(finance.cashflow) ? finance.cashflow : [],
      mieten: Array.isArray(finance.mieten) ? finance.mieten : [],
      op: Array.isArray(finance.op) ? finance.op : [],
      reserven: Array.isArray(finance.reserven) ? finance.reserven : [],
      budget: Array.isArray(finance.budget) ? finance.budget : []
    };

    return {
      home,
      projects: { gesamt, gewerke },
      finance: outFinance,

      // convenience mirrors (older finance view code used these)
      op: outFinance.op,
      reserven: outFinance.reserven,
      budget: outFinance.budget
    };
  }

  function normalizeIMMOData(data) {
    // already in IMMO_DATA shape, but ensure arrays exist
    const out = {
      home: Array.isArray(data.home) ? data.home.map(normalizeHomeRow) : [],
      projects: {
        gesamt: (data.projects && data.projects.gesamt) ? data.projects.gesamt : {},
        gewerke: (data.projects && Array.isArray(data.projects.gewerke)) ? data.projects.gewerke.map(normalizeGewerkRow) : []
      },
      finance: data.finance || { gesamt: [], cashflow: [], mieten: [], op: [], reserven: [], budget: [] },
      op: Array.isArray(data.op) ? data.op : (data.finance && Array.isArray(data.finance.op) ? data.finance.op : []),
      reserven: Array.isArray(data.reserven) ? data.reserven : (data.finance && Array.isArray(data.finance.reserven) ? data.finance.reserven : []),
      budget: Array.isArray(data.budget) ? data.budget : (data.finance && Array.isArray(data.finance.budget) ? data.finance.budget : [])
    };
    return out;
  }

  function normalizeHomeRow(r) {
    // Make sure KPI modules can find occupancy regardless of key name
    const occ =
      pickNum(r, ["Auslastung_pct", "Auslastung_%", "Auslastung", "AuslastungProzent", "Auslastung_pct "]);

    return {
      ...r,
      Monat: String(r.Monat || r.month || "").trim(),
      Cashflow: pickNum(r, ["Cashflow"]),
      Mieteinnahmen: pickNum(r, ["Mieteinnahmen"]),
      Pachteinnahmen: pickNum(r, ["Pachteinnahmen"]),
      Auslastung_pct: occ,
      "Auslastung_%": occ,
      Portfolio_Wert: pickNum(r, ["Portfolio_Wert", "Portfolio Wert"]),
      Investiertes_Kapital: pickNum(r, ["Investiertes_Kapital", "Investiertes Kapital"])
    };
  }

  function normalizeGewerkRow(r) {
    const angebot = pickNum(r, ["Angebot", "Angebotssumme", "Angebot (€)"]);
    const gezahlt = pickNum(r, ["Gezahlt", "Zahlungen", "Zahlungen_bisher", "Zahlungen (€)", "Zahlungen bisher"]);
    const fort = pickNum(r, ["Baufortschritt", "Baufortschritt_prozent", "Baufortschritt %", "Fortschritt_%", "Fortschritt %"]);

    return {
      ...r,
      Angebot: angebot,
      Angebotssumme: angebot,
      "Angebot (€)": angebot,

      Gezahlt: gezahlt,
      Zahlungen: gezahlt,
      Zahlungen_bisher: gezahlt,
      "Zahlungen (€)": gezahlt,
      "Zahlungen bisher": gezahlt,

      Baufortschritt: fort,
      Baufortschritt_prozent: fort,
      "Baufortschritt %": fort,

      Aktiv: (r.Aktiv != null && String(r.Aktiv).trim()) ? String(r.Aktiv) : "Ja"
    };
  }

  function pickNum(obj, keys) {
    for (const k of keys) {
      if (obj && obj[k] != null && String(obj[k]).trim() !== "") return toNum(obj[k]);
    }
    return 0;
  }

  function toNum(v) {
    if (typeof v === "number") return isFinite(v) ? v : 0;
    if (v == null) return 0;
    const s = String(v).trim();
    if (!s) return 0;
    return Number(s.replace(/\./g, "").replace(",", ".")) || 0;
  }
})();