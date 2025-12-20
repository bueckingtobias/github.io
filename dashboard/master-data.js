/* dashboard/master-data.js
   Single source of truth for the whole dashboard.

   ✅ Pflege (Deutsch – wo trägst du was ein?)
   ===========================================================
   1) HOME KPIs (home)
      - Du pflegst die Werte NICHT direkt pro Monat, die Monate werden automatisch gebaut.
      - Werte entstehen aktuell aus den Formeln im home.map(...) Block:
        baseRent / baseLease / costs / occupancy / portfolioValue / invested
      - Wenn du echte Werte pflegen willst: sag Bescheid, dann bauen wir eine MANUAL-Liste,
        aber OHNE dass Module/Loader brechen.

   2) Projekte Gesamt (projectsGesamt)
      - Projekt/Adresse/Objekt/Notizen kannst du hier pflegen.

   3) Projekte Gewerke (projectsGewerke Input)
      - Hier pflegst du die 10 Gewerke:
        Aktiv, Sortierung, Gewerk, Handwerker, Angebot, Gezahlt, Baufortschritt
      - WICHTIG: Angebot/Gezahlt als Zahl (EUR), Baufortschritt 0–100.

   4) Finance
      - bleibt wie gehabt (wird aus home abgeleitet + manuelle Tabellen op/reserven/budget)
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

      // ✅ gültiger Key (neu)
      Auslastung_pct: Math.round(occupancy * 10) / 10,

      // ✅ Legacy-Key für Module, die noch "Auslastung_%" erwarten
      "Auslastung_%": Math.round(occupancy * 10) / 10,

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
    { Aktiv: "Ja", Sortierung: 1,  Gewerk: "Rohbau",         Handwerker: "Bauunternehmen Mahlstedt GmbH & Co. KG", Angebot: 532509,42, Gezahlt: 193970, Baufortschritt: 70 },
    { Aktiv: "Ja", Sortierung: 2,  Gewerk: "Zimmerei",        Handwerker: "Meyer's Zimmerei GmbH",  Angebot:  258265,33, Gezahlt:  119000,00, Baufortschritt: 80 },
    { Aktiv: "Ja", Sortierung: 3,  Gewerk: "Dach",        Handwerker: "Warrelmann GmbH Bedachungen",   Angebot: 70226,00, Gezahlt:  23324,00, Baufortschritt: 80 },
    { Aktiv: "Ja", Sortierung: 4,  Gewerk: "Fenster / Türen",  Handwerker: "Tischlerei Warrelmann GmbH",    Angebot:  55542,00, Gezahlt:  0, Baufortschritt: 95 },
    { Aktiv: "Ja", Sortierung: 5,  Gewerk: "Sanitär / Heizung",           Handwerker: "Fortmann Haustechnik GmbH & Co. KG",   Angebot: 177206,35, Gezahlt:  0, Baufortschritt: 0 },
    { Aktiv: "Ja", Sortierung: 6,  Gewerk: "Elektro",      Handwerker: "Elektro-Technik Hoffmann GmbH",   Angebot:  70385,79, Gezahlt:  0, Baufortschritt: 0 },
    { Aktiv: "Ja", Sortierung: 7,  Gewerk: "Gerüstbau",    Handwerker: "Torsten Schreiber Gerüstbau",     Angebot:  9103,50, Gezahlt:  10287,56, Baufortschritt: 100 },
    { Aktiv: "Ja", Sortierung: 8,  Gewerk: "Erdwärme",         Handwerker: "Hartmann Brunnenbau GmbH",  Angebot:  19417,23, Gezahlt:  19417,23, Baufortschritt: 100 },
    { Aktiv: "Ja", Sortierung: 9,  Gewerk: "Anschlüsse / Kanal",   Handwerker: "OOWV",   Angebot:  25186,31, Gezahlt:  3121,84, Baufortschritt: 30 },
    { Aktiv: "Ja", Sortierung: 10, Gewerk: "Sonstiges",   Handwerker: "Sonstiges",  Angebot:  20000, Gezahlt:  20000, Baufortschritt: 50 },
  ].map(r => ({
    Projekt: projectsGesamt.Projekt,
    Objekt: projectsGesamt.Adresse,

    // Aktiv (neu + Legacy)
    Aktiv: r.Aktiv,
    "Aktiv (Ja/Nein)": r.Aktiv,

    Sortierung: r.Sortierung,
    Gewerk: r.Gewerk,
    Handwerker: r.Handwerker,

    // Angebot (alle Varianten)
    Angebot: r.Angebot,
    Angebotssumme: r.Angebot,
    "Angebot (€)": r.Angebot,

    // Gezahlt / Zahlungen (alle Varianten)
    Gezahlt: r.Gezahlt,
    Zahlungen: r.Gezahlt,
    Zahlungen_bisher: r.Gezahlt,
    "Zahlungen (€)": r.Gezahlt,
    "Zahlungen bisher": r.Gezahlt,

    // ✅ sichere Legacy-Aliase (wichtig für alte Module/Filter)
    "Gezahl t": r.Gezahlt,      // <-- ALLES GEQUOTET, KEIN SYNTAX-RISIKO
    "Gezahl_t": r.Gezahlt,

    // Baufortschritt (alle Varianten)
    Baufortschritt: r.Baufortschritt,
    Baufortschritt_prozent: r.Baufortschritt,
    "Baufortschritt %": r.Baufortschritt,

    // weitere mögliche Legacy-Keys aus eurer Historie
    "Fortschritt_%": r.Baufortschritt,
    "Fortschritt %": r.Baufortschritt,
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

      // ✅ Standard + Legacy
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
    projects: {
      gesamt: projectsGesamt,
      gewerke: projectsGewerke
    },
    finance
  };
})();