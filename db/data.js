/* ============================================================================
   data.js — Einzige Datenquelle für das Bücking Dashboard
   ----------------------------------------------------------------------------
   So pflegst du die Daten:
   - Entweder direkt hier im Code (Werte ändern, speichern, committen)
   - ODER bequem im Dashboard unter „Daten" → Bearbeiten → „data.js exportieren".
     Die exportierte Datei einfach hier ersetzen (GitHub) bzw. in Drive hochladen.

   Wichtig: Diese Datei NICHT umbenennen. Sie wird per <script> geladen und
   setzt window.DASHBOARD_DATA. Keine Server nötig — läuft auf GitHub Pages,
   Google Drive (geteilter Link) oder lokal.
   ========================================================================== */

window.DASHBOARD_DATA = {
  meta: {
    version: "2026-06-01",
    org: "Bücking Immobilien",
    updatedAt: "2026-06-01"
  },

  /* --------------------------------------------------------------------------
     LOGIN
     passwordHash = SHA-256 des Passworts (Hex).
     Standard-Passwort unten: "baumstrasse"
     Neues Passwort setzen: im Dashboard unter „Daten" → „Passwort ändern".
     -------------------------------------------------------------------------- */
  auth: {
    // SHA-256("baumstrasse")
    passwordHash: "774abd2c0374e9d3d262d1b7269ce9913f5333021ad6e7356261a2305638c1e8",
    sessionHours: 12
  },

  /* --------------------------------------------------------------------------
     PROJEKTE (Bau)
     Zwei Projekte mit identischer Struktur. Gewerke je Projekt.
     Beträge in EUR, Fortschritt 0–100.
     -------------------------------------------------------------------------- */
  projects: [
    {
      id: "baumstrasse",
      name: "Baumstraße",
      address: "Baumstraße 35, 27777 Ganderkesee",
      scope: "Umbau Stall zu 5 Wohnungen",
      note: "Hauptprojekt – Gesamtübersicht über alle Gewerke.",
      gewerke: [
        { aktiv: true, sort: 1,  name: "Rohbau",             firma: "Bauunternehmen Mahlstedt GmbH & Co. KG", angebot: 532509, gezahlt: 193970, fortschritt: 70  },
        { aktiv: true, sort: 2,  name: "Zimmerei",           firma: "Meyer's Zimmerei GmbH",                  angebot: 258265, gezahlt: 119000, fortschritt: 80  },
        { aktiv: true, sort: 3,  name: "Dach",               firma: "Warrelmann GmbH Bedachungen",            angebot: 70226,  gezahlt: 23324,  fortschritt: 80  },
        { aktiv: true, sort: 4,  name: "Fenster / Türen",    firma: "Tischlerei Warrelmann GmbH",             angebot: 55542,  gezahlt: 0,      fortschritt: 95  },
        { aktiv: true, sort: 5,  name: "Sanitär / Heizung",  firma: "Fortmann Haustechnik GmbH & Co. KG",     angebot: 177206, gezahlt: 0,      fortschritt: 0   },
        { aktiv: true, sort: 6,  name: "Elektro",            firma: "Elektro-Technik Hoffmann GmbH",          angebot: 70386,  gezahlt: 0,      fortschritt: 0   },
        { aktiv: true, sort: 7,  name: "Gerüstbau",          firma: "Torsten Schreiber Gerüstbau",            angebot: 9104,   gezahlt: 10288,  fortschritt: 100 },
        { aktiv: true, sort: 8,  name: "Erdwärme",           firma: "Hartmann Brunnenbau GmbH",               angebot: 19417,  gezahlt: 19417,  fortschritt: 100 },
        { aktiv: true, sort: 9,  name: "Anschlüsse / Kanal", firma: "OOWV",                                   angebot: 25186,  gezahlt: 3122,   fortschritt: 30  },
        { aktiv: true, sort: 10, name: "Sonstiges",          firma: "diverse",                                angebot: 20000,  gezahlt: 20000,  fortschritt: 50  }
      ]
    },
    {
      id: "huenenberg",
      name: "Am Hünenberg",
      address: "Am Hünenberg 12, 27777 Ganderkesee",
      scope: "Neubau Mehrfamilienhaus, 4 Wohnungen",
      note: "Zweites Projekt – identische Struktur wie Baumstraße.",
      gewerke: [
        { aktiv: true, sort: 1,  name: "Rohbau",             firma: "Bauunternehmen Mahlstedt GmbH & Co. KG", angebot: 410000, gezahlt: 120000, fortschritt: 35  },
        { aktiv: true, sort: 2,  name: "Zimmerei",           firma: "Meyer's Zimmerei GmbH",                  angebot: 180000, gezahlt: 40000,  fortschritt: 20  },
        { aktiv: true, sort: 3,  name: "Dach",               firma: "Warrelmann GmbH Bedachungen",            angebot: 62000,  gezahlt: 0,      fortschritt: 0   },
        { aktiv: true, sort: 4,  name: "Fenster / Türen",    firma: "Tischlerei Warrelmann GmbH",             angebot: 48000,  gezahlt: 0,      fortschritt: 0   },
        { aktiv: true, sort: 5,  name: "Sanitär / Heizung",  firma: "Fortmann Haustechnik GmbH & Co. KG",     angebot: 140000, gezahlt: 0,      fortschritt: 0   },
        { aktiv: true, sort: 6,  name: "Elektro",            firma: "Elektro-Technik Hoffmann GmbH",          angebot: 60000,  gezahlt: 0,      fortschritt: 0   },
        { aktiv: true, sort: 7,  name: "Erdarbeiten",        firma: "Hartmann Brunnenbau GmbH",               angebot: 35000,  gezahlt: 35000,  fortschritt: 100 },
        { aktiv: true, sort: 8,  name: "Anschlüsse / Kanal", firma: "OOWV",                                   angebot: 28000,  gezahlt: 5000,   fortschritt: 20  }
      ]
    }
  ],

  /* --------------------------------------------------------------------------
     VERMIETUNG
     Zwei Objekte mit einzelnen Mietern. Beträge in EUR / Monat.
     kaltmiete = Nettokaltmiete, nebenkosten = NK-Vorauszahlung.
     status: "vermietet" | "frei" | "kuendigung"
     -------------------------------------------------------------------------- */
  rentals: [
    {
      id: "obj-baumstrasse",
      objekt: "Baumstraße 35",
      ort: "27777 Ganderkesee",
      einheiten: [
        { wohnung: "WE 1 · EG links",   flaeche: 68,  mieter: "Familie Janßen",   einzug: "2024-09-01", kaltmiete: 720, nebenkosten: 180, status: "vermietet" },
        { wohnung: "WE 2 · EG rechts",  flaeche: 54,  mieter: "Herr Dittmer",     einzug: "2024-10-01", kaltmiete: 580, nebenkosten: 150, status: "vermietet" },
        { wohnung: "WE 3 · OG links",   flaeche: 72,  mieter: "Frau Brünjes",     einzug: "2025-01-15", kaltmiete: 760, nebenkosten: 190, status: "vermietet" },
        { wohnung: "WE 4 · OG rechts",  flaeche: 61,  mieter: "",                 einzug: "",           kaltmiete: 650, nebenkosten: 160, status: "frei" },
        { wohnung: "WE 5 · DG",         flaeche: 88,  mieter: "Familie Köster",   einzug: "2025-03-01", kaltmiete: 910, nebenkosten: 220, status: "vermietet" }
      ]
    },
    {
      id: "obj-huenenberg",
      objekt: "Am Hünenberg 12",
      ort: "27777 Ganderkesee",
      einheiten: [
        { wohnung: "WE 1 · EG",  flaeche: 75, mieter: "",              einzug: "",           kaltmiete: 780, nebenkosten: 195, status: "frei" },
        { wohnung: "WE 2 · EG",  flaeche: 75, mieter: "",              einzug: "",           kaltmiete: 780, nebenkosten: 195, status: "frei" },
        { wohnung: "WE 3 · OG",  flaeche: 82, mieter: "Herr Albers",   einzug: "2026-05-01", kaltmiete: 850, nebenkosten: 210, status: "vermietet" },
        { wohnung: "WE 4 · OG",  flaeche: 82, mieter: "",              einzug: "",           kaltmiete: 850, nebenkosten: 210, status: "frei" }
      ]
    }
  ],

  /* --------------------------------------------------------------------------
     FINANZEN
     account = aktueller Stand. cashflow = 12 Monate (Monat YYYY-MM).
     budget = Bereiche mit Budget/Ist. op = offene Posten.
     -------------------------------------------------------------------------- */
  finance: {
    account: {
      kontostand: 185000,
      liquide: 132000,
      ruecklagen: 65000,
      verbindlichkeitenKurz: 28000
    },
    cashflow: [
      { monat: "2025-07", einnahmen: 15300, ausgaben: 12100 },
      { monat: "2025-08", einnahmen: 15300, ausgaben: 11800 },
      { monat: "2025-09", einnahmen: 15880, ausgaben: 13400 },
      { monat: "2025-10", einnahmen: 15880, ausgaben: 12200 },
      { monat: "2025-11", einnahmen: 16460, ausgaben: 14900 },
      { monat: "2025-12", einnahmen: 16460, ausgaben: 18200 },
      { monat: "2026-01", einnahmen: 17040, ausgaben: 12600 },
      { monat: "2026-02", einnahmen: 17040, ausgaben: 11900 },
      { monat: "2026-03", einnahmen: 17620, ausgaben: 13100 },
      { monat: "2026-04", einnahmen: 17620, ausgaben: 12400 },
      { monat: "2026-05", einnahmen: 18200, ausgaben: 13700 },
      { monat: "2026-06", einnahmen: 18200, ausgaben: 12900 }
    ],
    budget: [
      { bereich: "Betriebskosten",    budget: 52000, ist: 38100 },
      { bereich: "Instandhaltung",    budget: 30000, ist: 14200 },
      { bereich: "Finanzierung/Zins", budget: 68000, ist: 34500 },
      { bereich: "Verwaltung",        budget: 12000, ist: 6400  }
    ],
    op: [
      { titel: "Handwerkerrechnung Rohbau", betrag: 8400, faellig: "2026-06-10", status: "offen" },
      { titel: "Mietrückstand WE 2",        betrag: 1200, faellig: "2026-06-05", status: "in Klärung" }
    ]
  }
};
