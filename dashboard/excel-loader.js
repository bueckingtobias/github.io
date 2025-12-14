(function () {
  window.ExcelLoader = { load };

  async function load(path) {
    await loadXLSX();

    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Excel fetch failed: ${res.status} ${res.statusText}`);

    const buf = await res.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });

    const sheets = {};
    wb.SheetNames.forEach(name => {
      sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], {
        defval: "",
        raw: false
      });
    });

    // ✅ Debug: du siehst sofort ob das Sheet existiert + ob es Zeilen hat
    console.group("✅ Dashboard.xlsx – Sheet Check");
    wb.SheetNames.forEach(n => console.log(`${n}: ${(sheets[n] || []).length} rows`));
    console.groupEnd();

    /* =========================
       HOME KPIs (robust detect)
       ========================= */
    const home = pickSheet(sheets,
      // exakt (alt + neu)
      "Home_KPIs",
      "HOME_KPI",
      "HOME_KPIs",
      "Home_KPI",
      "HOME_KPIS",
      "VIEW_HOME",
      "Home",
      "KPIs",
      "KPI"
    );

    // Fallback: auto-detect, falls Name komplett anders ist
    const homeAuto = home.length ? home : autoDetectHomeKPIs(sheets);

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
        const angebot = num(r.Angebot || r.Angebotssumme || r["Angebot (€)"] || r["Angebotssumme (€)"]);
        const gezahlt = num(r.Gezahlt || r.Zahlungen || r["Zahlungen (€)"] || r["Zahlungen bisher"] || r.Zahlungen_bisher);
        const fortschritt = num(r["Baufortschritt %"] || r["Fortschritt_%"] || r["Fortschritt %"] || r.Baufortschritt || r.Baufortschritt_prozent);

        const aktivRaw = r["Aktiv (Ja/Nein)"] || r.Aktiv || r["Aktiv"] || "Ja";

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

          Baufortschritt: fortschritt,
          Baufortschritt_prozent: fortschritt,
          "Baufortschritt %": fortschritt,

          Aktiv: aktivRaw,
          "Aktiv (Ja/Nein)": aktivRaw,

          Sortierung: i + 1,
          Projekt: r.Projekt || gesamt.Projekt || gesamt["Projekt"] || "",
          Objekt: r.Objekt || gesamt.Adresse || gesamt["Adresse"] || gesamt["Objekt"] || ""
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
       EXPORT
       ========================= */
    window.IMMO_DATA = {
      home: homeAuto || [],
      projects: { gesamt, gewerke },
      finance: financeSheets,
      _meta: {
        xlsxPath: path,
        loadedAt: new Date().toISOString(),
        sheetNames: wb.SheetNames
      }
    };

    console.log("✅ Excel loaded & normalized", window.IMMO_DATA);

    // optional: event für Views/Module
    window.dispatchEvent(new Event("immo:data-ready"));
  }

  /* =========================
     Auto-detect HOME KPIs
     ========================= */
  function autoDetectHomeKPIs(sheets) {
    // Heuristik: Name enthält "home" & "kpi" oder Sheet enthält Spalten wie "Monat"/"Cashflow"/"Mieteinnahmen"
    const names = Object.keys(sheets || {});
    for (const n of names) {
      const low = n.toLowerCase();
      const rows = Array.isArray(sheets[n]) ? sheets[n] : [];
      if (!rows.length) continue;

      if ((low.includes("home") && low.includes("kpi")) || low.includes("kpis")) return rows;

      const cols = new Set(Object.keys(rows[0] || {}).map(k => String(k).toLowerCase()));
      const looksLikeKpi =
        (cols.has("monat") || cols.has("month")) &&
        (cols.has("cashflow") || cols.has("monats-cashflow") || cols.has("monats cashflow") || cols.has("mieteinnahmen") || cols.has("pachteinnahmen"));

      if (looksLikeKpi) return rows;
    }
    return [];
  }

  /* =========================
     Helpers
     ========================= */
  function num(v) {
    if (typeof v === "number") return v;
    if (v === null || v === undefined) return 0;

    const s0 = String(v).trim();
    if (!s0) return 0;

    let s = s0.replace(/\s/g, "").replace(/€/g, "").replace(/[A-Za-z]/g, "");
    const hasComma = s.includes(",");
    const hasDot = s.includes(".");
    if (hasComma && hasDot) {
      const lc = s.lastIndexOf(",");
      const ld = s.lastIndexOf(".");
      if (lc > ld) s = s.replace(/\./g, "").replace(",", ".");
      else s = s.replace(/,/g, "");
    } else if (hasComma && !hasDot) {
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
    if (!r || typeof r !== "object") return true;
    return Object.values(r).every(v => v === "" || v === null || v === undefined);
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
