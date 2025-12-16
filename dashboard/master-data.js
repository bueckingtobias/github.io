/* dashboard/master-data.js
   Single source of truth for the whole dashboard.
*/
(function () {
  "use strict";

  const VERSION = "2025-12-16-MASTER-PROJECTS-FIX-1";

  function ym(y, m) {
    return `${y}-${String(m).padStart(2, "0")}`;
  }

  const now = new Date();
  const Y = now.getFullYear();
  const M = now.getMonth() + 1;

  // 12 months ending at current month (inclusive)
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Y, M - 1 - i, 1);
    months.push(ym(d.getFullYear(), d.getMonth() + 1));
  }

  // HOME KPIs (12 Monate)
  const home = months.map((month, idx) => {
    const baseRent = 14200 + idx * 80;
    const baseLease = 1200 + (idx % 3) * 50;
    const costs = 5200 + (idx % 4) * 180;
    const cashflow = (baseRent + baseLease) - costs;

    const occupancy = Math.max(88, Math.min(100, 92 + Math.sin(idx / 2) * 4));
    const portfolioValue = 2450000 + idx * 15000;
    const invested = 1750000;

    return {
      Monat: month,
      Cashflow: Math.round(cashflow),
      Mieteinnahmen: Math.round(baseRent),
      Pachteinnahmen: Math.round(baseLease),
      Auslastung_pct: Math.round(occupancy * 10) / 10, // ✅ gültiger Key
      Portfolio_Wert: Math.round(portfolioValue),
      Investiertes_Kapital: Math.round(invested),
    };
  });

  // PROJECTS
  const projectsGesamt = {
    Projekt: "Baumstraße 35",
    Adresse: "Baumstraße 35",
    Objekt: "Baumstraße 35",
    Letztes_Update: new Date().toISOString().slice(0, 10),
    Notizen: "Gesamtübersicht über alle Gewerke.",
  };

  // ✅ 10 Gewerke/Handwerker (WICHTIG: gültige Keys!)
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

  // FINANCE (deine Struktur beibehalten)
  const finance = {
    gesamt: [
      {
        Monat: months[months.length - 1],
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
      Auslastung_pct: r.Auslastung_pct
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
    projects: {
      gesamt: projectsGesamt,
      gewerke: projectsGewerke
    },
    finance
  };
})();