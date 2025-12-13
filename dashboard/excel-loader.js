(function () {
  window.ExcelLoader = { load };

  async function load(path) {
    await loadXLSX();

    const res = await fetch(path, { cache: "no-store" });
    const buf = await res.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });

    const sheets = {};
    wb.SheetNames.forEach(n => {
      sheets[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: "" });
    });

    const gesamt = sheets.Projects_Gesamt?.[0] || {};
    const gewerke = (sheets.Projects_Gewerke || []).map((r, i) => {
      const angebot = num(r.Angebot || r.Angebotssumme || r["Angebot (€)"]);
      const gezahlt = num(r.Gezahlt || r.Zahlungen || r["Zahlungen bisher"] || r["Zahlungen (€)"]);
      const fortschritt = num(r["Fortschritt_%"] || r["Fortschritt %"] || r.Baufortschritt);

      return {
        ...r,

        // 🔥 alle Varianten gleichzeitig
        Angebot: angebot,
        Angebotssumme: angebot,
        "Angebot (€)": angebot,

        Gezahlt: gezahlt,
        Zahlungen: gezahlt,
        Zahlungen_bisher: gezahlt,
        "Zahlungen bisher": gezahlt,
        "Zahlungen (€)": gezahlt,

        Baufortschritt: fortschritt,
        Baufortschritt_prozent: fortschritt,
        "Baufortschritt %": fortschritt,

        Aktiv: r["Aktiv (Ja/Nein)"] || "Ja",
        "Aktiv (Ja/Nein)": r["Aktiv (Ja/Nein)"] || "Ja",

        Sortierung: i + 1,
        Projekt: r.Projekt || gesamt.Projekt || "",
        Objekt: r.Objekt || gesamt.Adresse || ""
      };
    });

    window.IMMO_DATA = {
      home: sheets.Home_KPIs || [],
      finance: sheets.Finance || [],
      projects: {
        gesamt,
        gewerke
      }
    };

    console.log("✅ Excel loaded & normalized", window.IMMO_DATA);
  }

  function num(v) {
    if (typeof v === "number") return v;
    if (!v) return 0;
    return Number(String(v).replace(/\./g, "").replace(",", ".")) || 0;
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