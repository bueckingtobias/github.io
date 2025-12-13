/* dashboard/excel-loader.js
   Production loader for /dashboard/Dashboard.xlsx
   Normalizes Excel headers to match existing module expectations
*/

(function () {
  let DATA = {};
  let LOADED = false;
  let LAST_ERROR = "";

  window.ExcelLoader = {
    load,
    getSheet,
    isLoaded: () => LOADED,
    lastError: () => LAST_ERROR
  };

  async function ensureXlsx() {
    if (window.XLSX) return;

    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      s.onload = resolve;
      s.onerror = () => reject(new Error("XLSX konnte nicht geladen werden (CDN)."));
      document.head.appendChild(s);
    });

    if (!window.XLSX) throw new Error("XLSX ist nach dem Laden nicht verfügbar.");
  }

  async function load(path) {
    LOADED = false;
    LAST_ERROR = "";
    DATA = {};

    try {
      await ensureXlsx();

      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) throw new Error("Excel nicht gefunden: " + path + " (HTTP " + res.status + ")");

      const buf = await res.arrayBuffer();
      const wb = window.XLSX.read(buf, { type: "array" });

      const out = {};
      wb.SheetNames.forEach((name) => {
        out[name] = window.XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: null });
      });

      DATA = out;

      // ---- Normalize sheets to module-friendly keys ----
      const projectsGesamt = (out.Projects_Gesamt || [])[0] || {};
      const projectsGewerkeRaw = Array.isArray(out.Projects_Gewerke) ? out.Projects_Gewerke : [];
      const projectsGewerke = normalizeProjectsGewerke(projectsGewerkeRaw, projectsGesamt);

      const financeRaw = Array.isArray(out.Finance) ? out.Finance : [];
      const finance = normalizeFinance(financeRaw);

      const homeRaw = Array.isArray(out.Home_KPIs) ? out.Home_KPIs : [];
      const home = normalizeHomeKPIs(homeRaw);

      // ---- Mapping: what your existing modules read from window.IMMO_DATA ----
      window.IMMO_DATA = {
        home,
        finance,
        projects: {
          gesamt: projectsGesamt,
          gewerke: projectsGewerke
        }
      };

      LOADED = true;
      return out;

    } catch (e) {
      LAST_ERROR = String(e && e.message ? e.message : e);
      window.IMMO_DATA = { home: [], finance: [], projects: { gesamt: {}, gewerke: [] } };
      throw e;
    }
  }

  function getSheet(name) {
    return DATA[name] || [];
  }

  // ============== Normalizers ==============

  function normalizeProjectsGewerke(rows, projectsGesamt) {
    return rows.map((r, idx) => {
      const obj = Object.assign({}, r || {});

      // source headers (your Excel) -> target keys (modules)
      const angebot = pickNumber(obj, ["Angebot", "Angebotssumme", "Angebot_Summe", "Budget", "Summe"]);
      const gezahlt = pickNumber(obj, ["Gezahlt", "Zahlungen", "Zahlungen_bisher", "Bisher gezahlt", "Ist"]);
      const fortschritt = pickNumber(obj, ["Fortschritt_%", "Fortschritt", "Baufortschritt_prozent", "Baufortschritt_%"]);

      const aktivRaw = pickText(obj, ["Aktiv (Ja/Nein)", "Aktiv", "Aktiv?"]) || "Ja";

      const projekt = pickText(obj, ["Projekt"]) || projectsGesamt.Projekt || "";
      const objekt = pickText(obj, ["Objekt", "Adresse"]) || projectsGesamt.Adresse || "";
      const gewerk = pickText(obj, ["Gewerk"]) || "";
      const handwerker = pickText(obj, ["Handwerker", "Firma"]) || "";

      // provide ALL variants that old code might read
      const normalized = {
        // common fields
        Projekt: projekt,
        Objekt: objekt,
        Gewerk: gewerk,
        Handwerker: handwerker,

        // keys your existing modules typically use:
        Angebotssumme: angebot,
        Zahlungen_bisher: gezahlt,
        Baufortschritt_prozent: fortschritt,

        // activity flags (both styles)
        Aktiv: aktivRaw,
        "Aktiv (Ja/Nein)": aktivRaw,

        // ordering
        Sortierung: idx + 1
      };

      // Keep original columns too (doesn't hurt, but helps debugging)
      return Object.assign({}, obj, normalized);
    });
  }

  function normalizeFinance(rows) {
    return rows.map((r) => {
      const obj = Object.assign({}, r || {});

      // Keep what you already have, but also add alternates some modules might expect
      const monat = pickText(obj, ["Monat", "Datum"]) || "";
      const cashflow = pickNumber(obj, ["Cashflow", "Monats-Cashflow", "Monatscashflow"]);
      const mieten = pickNumber(obj, ["Mieteinnahmen", "Mieten", "Einnahmen"]);
      const op = pickNumber(obj, ["OP_Kosten", "OP Kosten", "Operative_Kosten", "Kosten"]);
      const reserven = pickNumber(obj, ["Reserven", "Rücklagen"]);
      const budget = pickNumber(obj, ["Budget", "Soll"]);

      return Object.assign({}, obj, {
        Monat: monat,
        Cashflow: cashflow,
        Mieteinnahmen: mieten,
        OP_Kosten: op,
        Reserven: reserven,
        Budget: budget
      });
    });
  }

  function normalizeHomeKPIs(rows) {
    return rows.map((r) => {
      const obj = Object.assign({}, r || {});
      return Object.assign({}, obj, {
        KPI: pickText(obj, ["KPI"]) || "",
        Wert: pickNumber(obj, ["Wert"]) || 0,
        Einheit: pickText(obj, ["Einheit"]) || "",
        Kommentar: pickText(obj, ["Kommentar"]) || ""
      });
    });
  }

  // ============== Helpers ==============

  function pickText(obj, keys) {
    for (const k of keys) {
      if (obj[k] != null && String(obj[k]).trim() !== "") return String(obj[k]).trim();
    }
    return "";
  }

  function pickNumber(obj, keys) {
    for (const k of keys) {
      const v = obj[k];
      if (v == null || v === "") continue;
      if (typeof v === "number" && !Number.isNaN(v)) return v;
      const s = String(v).replace(/\./g, "").replace(",", ".").trim(); // de format support
      const n = Number(s);
      if (!Number.isNaN(n)) return n;
    }
    return 0;
  }
})();