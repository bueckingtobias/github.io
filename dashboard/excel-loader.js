/* dashboard/excel-loader.js
   Production loader for /dashboard/Dashboard.xlsx
   - No dummy/test fallback
   - Sets window.IMMO_DATA on success
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

      // Mapping: was eure Views/Module erwarten
      window.IMMO_DATA = {
        home: out.Home_KPIs || [],
        finance: out.Finance || [],
        projects: {
          gesamt: (out.Projects_Gesamt || [])[0] || {},
          gewerke: out.Projects_Gewerke || []
        }
      };

      LOADED = true;
      return out;
    } catch (e) {
      LAST_ERROR = String(e && e.message ? e.message : e);
      // Wichtig: kein Dummy. Wir lassen IMMO_DATA bewusst leer.
      window.IMMO_DATA = { home: [], finance: [], projects: { gesamt: {}, gewerke: [] } };
      throw e;
    }
  }

  function getSheet(name) {
    return DATA[name] || [];
  }
})();