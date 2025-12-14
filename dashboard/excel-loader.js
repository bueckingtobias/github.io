(function () {
  window.ExcelLoader = { load };

  async function load(path) {
    await loadXLSX();

    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Excel fetch failed: ${res.status}`);

    const buf = await res.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });

    const sheets = {};
    wb.SheetNames.forEach(name => {
      sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], {
        defval: "",
        raw: false
      });
    });

    /* =========================
       HOME
       ========================= */
    const home = pickSheet(sheets,
      "Home_KPIs",
      "HOME_KPI",
      "VIEW_HOME"
    );

    /* =========================
       PROJECTS
       ========================= */
    const gesamt = firstRow(pickSheet(sheets,
      "Projects_Gesamt",
      "PROJEKTE_GESAMT",
      "VIEW_PROJEKTE"
    ));

    const gewerkeRaw = pickSheet(sheets,
      "Projects_Gewerke",
      "PROJEKTE_GEWERKE"
    ) || [];

    const gewerke = gewerkeRaw
      .filter(r => !isEmptyRow(r))
      .map((r, i) => {
        const angebot = num(r["Angebot"] || r["Angebot (€)"]);
        const gezahlt = num(r["Gezahlt"] || r["Zahlungen (€)"]);
        const fortschritt = num(r["Baufortschritt %"]);

        return {
          ...r,
          Angebot: angebot,
          Angebotssumme: angebot,
          Gezahlt: gezahlt,
          Zahlungen: gezahlt,
          Baufortschritt: fortschritt,
          Baufortschritt_prozent: fortschritt,
          Aktiv: r["Aktiv (Ja/Nein)"] || "Ja",
          Sortierung: i + 1,
          Projekt: r.Projekt || gesamt.Projekt || "",
          Objekt: r.Objekt || gesamt.Adresse || ""
        };
      });

    /* =========================
       FINANCE
       ========================= */
    const financeSheets = {
      gesamt: pickSheet(sheets, "FINANCE_GESAMT") || [],
      cashflow: pickSheet(sheets, "FINANCE_CASHFLOW") || [],
      mieten: pickSheet(sheets, "FINANCE_MIETEN") || [],
      op: pickSheet(sheets, "FINANCE_OP") || [],
      reserven: pickSheet(sheets, "FINANCE_RESERVEN") || [],
      budget: pickSheet(sheets, "FINANCE_BUDGET") || []
    };

    /* =========================
       GLOBAL EXPORT
       ========================= */
    window.IMMO_DATA = {
      home,
      projects: {
        gesamt,
        gewerke
      },
      finance: financeSheets
    };

    console.log("✅ Dashboard.xlsx geladen", window.IMMO_DATA);
  }

  /* =========================
     Helpers
     ========================= */
  function num(v) {
    if (typeof v === "number") return v;
    if (!v) return 0;
    let s = String(v).replace(/\s/g, "").replace("€", "");
    if (s.includes(",") && s.includes(".")) {
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
        s = s.replace(/\./g, "").replace(",", ".");
      } else {
        s = s.replace(/,/g, "");
      }
    } else {
      s = s.replace(",", ".");
    }
    return Number(s) || 0;
  }

  function pickSheet(sheets, ...names) {
    for (const n of names) {
      if (Array.isArray(sheets[n])) return sheets[n];
    }
    return [];
  }

  function firstRow(arr) {
    return Array.isArray(arr) && arr.length ? arr[0] : {};
  }

  function isEmptyRow(r) {
    return !r || Object.values(r).every(v => v === "" || v === null);
  }

  function loadXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise(res => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      s.onload = res;
      document.head.appendChild(s);
    });
  }
})();
