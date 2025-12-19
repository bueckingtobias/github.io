/* dashboard/master-data.js
   Single source of truth for the whole dashboard.
   Pflege:
   - HOME_KPIS_MANUAL: hier trägst du die KPI-Werte ein (12 Zeilen).
   - Monat optional (YYYY-MM). Wenn leer, wird automatisch ein 12-Monats-Fenster bis inkl. aktuellem Monat gesetzt.
*/

(function () {
  "use strict";

  const VERSION = "2025-12-19-MASTER-STABLE-1";

  function ym(y, m) {
    return `${y}-${String(m).padStart(2, "0")}`;
  }

  function n(v) {
    if (typeof v === "number") return isFinite(v) ? v : 0;
    if (v == null) return 0;
    const s = String(v).trim();
    if (!s) return 0;
    return Number(s.replace(/\./g, "").replace(",", ".")) || 0;
  }

  function clamp(v, a, b) {
    const x = n(v);
    return Math.max(a, Math.min(b, x));
  }

  // 12 Monate bis inkl. aktueller Monat als Fallback
  const now = new Date();
  const Y = now.getFullYear();
  const M = now.getMonth() + 1;

  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Y, M - 1 - i, 1);
    months.push(ym(d.getFullYear(), d.getMonth() + 1));
  }

  /* =========================
     HOME KPIs – HIER PFLEGST DU
     ========================= */
  const HOME_KPIS_MANUAL = [
    { Monat: "", Cashflow: 8600,  Mieteinnahmen: 14200, Pachteinnahmen: 1200, Auslastung_pct: 93.5, Portfolio_Wert: 2450000, Investiertes_Kapital: 1750000 },
    { Monat: "", Cashflow: 8900,  Mieteinnahmen: 14280, Pachteinnahmen: 1250, Auslastung_pct: 94.0, Portfolio_Wert: 2465000, Investiertes_Kapital: 1750000 },
    { Monat: "", Cashflow: 9100,  Mieteinnahmen: 14360, Pachteinnahmen: 1200, Auslastung_pct: 94.2, Portfolio_Wert: 2480000, Investiertes_Kapital: 1750000 },
    { Monat: "", Cashflow: 8700,  Mieteinnahmen: 14440, Pachteinnahmen: 1300, Auslastung_pct: 92.8, Portfolio_Wert: 2495000, Investiertes_Kapital: 1750000 },
    { Monat: "", Cashflow: 9400,  Mieteinnahmen: 14520, Pachteinnahmen: 1200, Auslastung_pct: 95.1, Portfolio_Wert: 2510000, Investiertes_Kapital: 1750000 },
    { Monat: "", Cashflow: 9650,  Mieteinnahmen: 14600, Pachteinnahmen: 1250, Auslastung_pct: 95.6, Portfolio_Wert: 2525000, Investiertes_Kapital: 1750000 },
    { Monat: "", Cashflow: 9900,  Mieteinnahmen: 14680, Pachteinnahmen: 1200, Auslastung_pct: 96.2, Portfolio_Wert: 2540000, Investiertes_Kapital: 1750000 },
    { Monat: "", Cashflow: 10100, Mieteinnahmen: 14760, Pachteinnahmen: 1300, Auslastung_pct: 96.0, Portfolio_Wert: 2555000, Investiertes_Kapital: 1750000 },
    { Monat: "", Cashflow: 10350, Mieteinnahmen: 14840, Pachteinnahmen: 1200, Auslastung_pct: 96.8, Portfolio_Wert: 2570000, Investiertes_Kapital: 1750000 },
    { Monat: "", Cashflow: 9850,  Mieteinnahmen: 14920, Pachteinnahmen: 1250, Auslastung_pct: 95.9, Portfolio_Wert: 2585000, Investiertes_Kapital: 1750000 },
    { Monat: "", Cashflow: 10700, Mieteinnahmen: 15000, Pachteinnahmen: 1200, Auslastung_pct: 97.1, Portfolio_Wert: 2600000, Investiertes_Kapital: 1750000 },
    { Monat: "", Cashflow: 10950, Mieteinnahmen: 15080, Pachteinnahmen: 1300, Auslastung_pct: 97.3, Portfolio_Wert: 2615000, Investiertes_Kapital: 1750000 },
  ];

  const home = months.map((month, idx) => {
    const r = HOME_KPIS_MANUAL[idx] || {};
    const m = (r.Monat && String(r.Monat).trim()) ? String(r.Monat).trim() : month;

    const occ = Math.round(clamp(r.Auslastung_pct, 0, 100) * 10) / 10;

    return {
      Monat: m,
      Cashflow: Math.round(n(r.Cashflow)),
      Mieteinnahmen: Math.round(n(r.Mieteinnahmen)),
      Pachteinnahmen: Math.round(n(r.Pachteinnahmen)),
      Auslastung_pct: occ,

      // Legacy keys für Module, die noch "Auslastung_%" erwarten
      "Auslastung_%": occ,

      Portfolio_Wert: Math.round(n(r.Portfolio_Wert)),
      Investiertes_Kapital: Math.round(n(r.Investiertes_Kapital)),
    };
  });

  /* =========================
     PROJECTS
     ========================= */
  const projectsGesamt = {
    Projekt: "Baumstraße 35",
    Adresse: "Baumstraße 35",
    Objekt: "Baumstraße 35",
    Letztes_Update: new Date().toISOString().slice(0, 10),
    Notizen: "Gesamtübersicht über alle Gewerke.",
  };

  const projectsGewerke = [
    { Aktiv: "Ja", Sortierung: 1,  Gewerk: "Rohbau",         Handwerker: "Bauunternehmen Meyer", Angebot: 320000, Gezahlt: 210000, Baufortschritt: 70 },
    { Aktiv: "Ja", Sortierung: 2,  Gewerk: "Elektro",        Handwerker: "Elektro Schröder",     Angebot:  95000, Gezahlt:  25000, Baufortschritt: 30 },
    { Aktiv: "Ja", Sortierung: 3,  Gewerk: "Sanitär",        Handwerker: "Haustechnik Müller",   Angebot: 145000, Gezahlt:  60000, Baufortschritt: 40 },
    { Aktiv: "Ja", Sortierung: 4,  Gewerk: "Fenster/Türen",  Handwerker: "Tischlerei Becker",    Angebot:  78000, Gezahlt:  52000, Baufortschritt: 85 },
    { Aktiv: "Ja", Sortierung: 5,  Gewerk: "Dach",           Handwerker: "Dachdecker Hofmann",   Angebot: 112000, Gezahlt:  90000, Baufortschritt: 90 },
    { Aktiv: "Ja", Sortierung: 6,  Gewerk: "Innenputz",      Handwerker: "Malerbetrieb König",   Angebot:  54000, Gezahlt:  15000, Baufortschritt: 25 },
    { Aktiv: "Ja", Sortierung: 7,  Gewerk: "Bodenbeläge",    Handwerker: "Bodenstudio Nord",     Angebot:  68000, Gezahlt:  10000, Baufortschritt: 15 },
    { Aktiv: "Ja", Sortierung: 8,  Gewerk: "Fliesen",        Handwerker: "Fliesen Schulte",      Angebot:  42000, Gezahlt:  21000, Baufortschritt: 50 },
    { Aktiv: "Ja", Sortierung: 9,  Gewerk: "Außenanlagen",   Handwerker: "Gartenbau Grünwerk",   Angebot:  60000, Gezahlt:  12000, Baufortschritt: 20 },
    { Aktiv: "Ja", Sortierung: 10, Gewerk: "Photovoltaik",   Handwerker: "Solartechnik Bremen",  Angebot:  98000, Gezahlt:  49000, Baufortschritt: 45 },
  ].map(r => ({
    Projekt: projectsGesamt.Projekt,
    Objekt: projectsGesamt.Adresse,

    Aktiv: r.Aktiv,
    Sortierung: r.Sortierung,
    Gewerk: r.Gewerk,
    Handwerker: r.Handwerker,

    Angebot: r.Angebot,
    Angebotssumme: r.Angebot,
    "Angebot (€)": r.Angebot,

    Gezahlt: r.Gezahlt,
    Zahlungen: r.Gezahlt,
    Zahlungen_bisher: r.Gezahlt,
    "Zahlungen (€)": r.Gezahlt,
    "Zahlungen bisher": r.Gezahlt,

    Baufortschritt: r.Baufortschritt,
    Baufortschritt_prozent: r.Baufortschritt,
    "Baufortschritt %": r.Baufortschritt,
  }));

  /* =========================
     FINANCE (Struktur beibehalten)
     ========================= */
  const finance = {
    gesamt: [
      {
        Monat: home[home.length - 1].Monat,
        Kontostand: 185000,
        Liquide_Mittel: 132000,
        Verbindlichkeiten_kurzfristig: 28000,
        Ruecklagen: 65000,
        Notiz: "Gesamtübersicht."
      }
    ],
    cashflow: home.map(r => ({
      Monat: r.Monat,
      Cashflow: r.Cashflow,
      Einnahmen: r.Mieteinnahmen + r.Pachteinnahmen,
      Ausgaben: (r.Mieteinnahmen + r.Pachteinnahmen) - r.Cashflow
    })),
    mieten: home.map(r => ({
      Monat: r.Monat,
      Mieteinnahmen: r.Mieteinnahmen,
      Pachteinnahmen: r.Pachteinnahmen,
      Summe: r.Mieteinnahmen + r.Pachteinnahmen,
      Auslastung_pct: r.Auslastung_pct,
      "Auslastung_%": r.Auslastung_pct
    })),
    op: [
      { Titel: "Offene Posten (OP)", Betrag: 8400, Faellig_am: new Date(Y, M, 10).toISOString().slice(0,10), Status: "offen", Kommentar: "Handwerkerrechnung" },
      { Titel: "Mietrückstand",      Betrag: 1200, Faellig_am: new Date(Y, M, 5).toISOString().slice(0,10),  Status: "in Klärung", Kommentar: "Mieter X" }
    ],
    reserven: [
      { Kategorie: "Instandhaltung", Betrag: 42000, Ziel: 60000, Kommentar: "Rücklage" },
      { Kategorie: "Steuern",        Betrag: 18000, Ziel: 25000, Kommentar: "VA" },
      { Kategorie: "Puffer",         Betrag:  5000, Ziel: 10000, Kommentar: "Unvorhergesehen" }
    ],
    budget: [
      { Bereich: "Betriebskosten",     Budget: 52000, Ist: 38100, Forecast: 50500, Kommentar: "Heizung/Strom/Wasser" },
      { Bereich: "Instandhaltung",     Budget: 30000, Ist: 14200, Forecast: 32000, Kommentar: "Reparaturen" },
      { Bereich: "Finanzierung/Zins",  Budget: 68000, Ist: 34500, Forecast: 69000, Kommentar: "Zins & Tilgung" },
      { Bereich: "Verwaltung",         Budget: 12000, Ist:  6400, Forecast: 11800, Kommentar: "Software" }
    ]
  };

  window.IMMO_MASTER_DATA = {
    version: VERSION,
    updatedAt: new Date().toISOString(),
    home,
    projects: { gesamt: projectsGesamt, gewerke: projectsGewerke },
    finance
  };

})();