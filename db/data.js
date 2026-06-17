/* data.js — Stand 17.06.2026 */
window.DASHBOARD_DATA = {
  "meta": {
    "version": "2026-06-17",
    "org": "Bücking Immobilien GmbH & Co. KG",
    "updatedAt": "2026-06-17"
  },
  "auth": {
    "passwordHash": "774abd2c0374e9d3d262d1b7269ce9913f5333021ad6e7356261a2305638c1e8",
    "sessionHours": 12
  },
  "projects": [
    {
      "id": "elmeloh",
      "name": "Mehrfamilienhaus Elmeloh",
      "type": "miete",
      "address": "Elmeloh, 27777 Ganderkesee",
      "scope": "Umbau eines Hofgebäudes zu 5 Wohneinheiten",
      "note": "Umbau im Bestand. Hauseigene Solaranlage und Erdwärme. Bezug ab 01.07.2026.",
      "investitionStart": "2024-01-01",
      "account": {
        "name": "Konto Elmeloh",
        "kontostand": 84000,
        "ruecklagen": 35000
      },
      "gewerke": [
        { "aktiv": true, "sort": 1, "name": "Rohbau", "firma": "Bauunternehmen Mahlstedt GmbH & Co. KG", "angebot": 532509, "gezahlt": 380000, "fortschritt": 90 },
        { "aktiv": true, "sort": 2, "name": "Zimmerei", "firma": "Meyer's Zimmerei GmbH", "angebot": 258265, "gezahlt": 230000, "fortschritt": 95 },
        { "aktiv": true, "sort": 3, "name": "Dach", "firma": "Warrelmann GmbH Bedachungen", "angebot": 70226, "gezahlt": 60000, "fortschritt": 95 },
        { "aktiv": true, "sort": 4, "name": "Fenster / Türen", "firma": "Tischlerei Warrelmann GmbH", "angebot": 55542, "gezahlt": 40000, "fortschritt": 95 },
        { "aktiv": true, "sort": 5, "name": "Sanitär / Heizung", "firma": "Fortmann Haustechnik GmbH & Co. KG", "angebot": 177206, "gezahlt": 120000, "fortschritt": 70 },
        { "aktiv": true, "sort": 6, "name": "Elektro", "firma": "Elektro-Technik Hoffmann GmbH", "angebot": 70386, "gezahlt": 45000, "fortschritt": 65 },
        { "aktiv": true, "sort": 7, "name": "Gerüstbau", "firma": "Torsten Schreiber Gerüstbau", "angebot": 10288, "gezahlt": 10288, "fortschritt": 100 },
        { "aktiv": true, "sort": 8, "name": "Erdwärme", "firma": "Hartmann Brunnenbau GmbH", "angebot": 19417, "gezahlt": 19417, "fortschritt": 100 },
        { "aktiv": true, "sort": 9, "name": "Solaranlage", "firma": "diverse", "angebot": 32000, "gezahlt": 32000, "fortschritt": 100 },
        { "aktiv": true, "sort": 10, "name": "Anschlüsse / Kanal", "firma": "OOWV", "angebot": 25186, "gezahlt": 18000, "fortschritt": 80 }
      ],
      "weitereInvestition": [
        { "titel": "Grundstück / Bestand", "betrag": 180000 },
        { "titel": "Planung / Architekt", "betrag": 48000 },
        { "titel": "Baunebenkosten", "betrag": 35000 }
      ],
      "kredite": [
        {
          "id": "elmeloh-kfw", "bezeichnung": "KfW-Darlehen", "glaeubiger": "KfW / Hausbank",
          "art": "annuitaet", "rateModus": "tilgungssatz", "betrag": 450000, "zinsSatz": 2.4,
          "tilgungSatz": 2, "rateBetrag": 0, "laufzeitJahre": 25, "start": "2024-04-01", "sondertilgungen": []
        },
        {
          "id": "elmeloh-bank", "bezeichnung": "Bankdarlehen", "glaeubiger": "Sparkasse",
          "art": "annuitaet", "rateModus": "tilgungssatz", "betrag": 380000, "zinsSatz": 3.6,
          "tilgungSatz": 2.5, "rateBetrag": 0, "laufzeitJahre": 20, "start": "2024-04-01",
          "sondertilgungen": [ { "datum": "2025-12-01", "betrag": 15000 } ]
        }
      ],
      "cashflow": [
        { "monat": "2026-01", "miete": 2312, "nebenkosten": 462, "betriebskosten": 1250, "sonstigeKosten": 320 },
        { "monat": "2026-02", "miete": 2312, "nebenkosten": 462, "betriebskosten": 1200, "sonstigeKosten": 260 },
        { "monat": "2026-03", "miete": 2312, "nebenkosten": 462, "betriebskosten": 1280, "sonstigeKosten": 350 },
        { "monat": "2026-04", "miete": 2312, "nebenkosten": 462, "betriebskosten": 1180, "sonstigeKosten": 300 },
        { "monat": "2026-05", "miete": 2312, "nebenkosten": 462, "betriebskosten": 1320, "sonstigeKosten": 420 },
        { "monat": "2026-06", "miete": 2312, "nebenkosten": 462, "betriebskosten": 1240, "sonstigeKosten": 280 }
      ]
    },
    {
      "id": "syke",
      "name": "Doppelhaushälfte Syke",
      "type": "miete",
      "address": "Syke",
      "scope": "Komplettsanierung Doppelhaushälfte",
      "note": "Komplett saniert, voll unterkellert, Garten mit Gartenhaus, Garage. Bezug ab 01.07.2026.",
      "investitionStart": "2025-04-01",
      "account": {
        "name": "Konto Syke",
        "kontostand": 22000,
        "ruecklagen": 12000
      },
      "gewerke": [
        { "aktiv": true, "sort": 1, "name": "Sanierung", "firma": "Christoph Wetjen", "angebot": 38000, "gezahlt": 34000, "fortschritt": 95 },
        { "aktiv": true, "sort": 2, "name": "Fenster / Türen", "firma": "Frank Kanther", "angebot": 11000, "gezahlt": 11000, "fortschritt": 100 },
        { "aktiv": true, "sort": 3, "name": "Fliesen", "firma": "Fliesenzentrum", "angebot": 5000, "gezahlt": 5000, "fortschritt": 100 },
        { "aktiv": true, "sort": 4, "name": "Sanitär", "firma": "Hoffmann", "angebot": 16000, "gezahlt": 16000, "fortschritt": 100 }
      ],
      "weitereInvestition": [
        { "titel": "Baunebenkosten", "betrag": 4000 }
      ],
      "kredite": [
        {
          "id": "syke-darlehen", "bezeichnung": "Bankdarlehen", "glaeubiger": "Sparkasse",
          "art": "annuitaet", "rateModus": "tilgungssatz", "betrag": 120000, "zinsSatz": 3.5,
          "tilgungSatz": 2.5, "rateBetrag": 0, "laufzeitJahre": 20, "start": "2025-06-01", "sondertilgungen": []
        }
      ],
      "cashflow": [
        { "monat": "2026-07", "miete": 1029, "nebenkosten": 196, "betriebskosten": 300, "sonstigeKosten": 0 }
      ]
    },
    {
      "id": "airbnb-baumstrasse",
      "name": "AirBnB Baumstraße",
      "type": "airbnb",
      "address": "Baumstraße, 27777 Ganderkesee",
      "scope": "Möblierte Kurzzeitvermietung (Ferienwohnung)",
      "note": "Kurzzeitvermietung über Airbnb/Booking. Steuerung über Übernachtungspreis, Belegung und Plattformkosten.",
      "investitionStart": "2026-01-01",
      "account": {
        "name": "Konto AirBnB",
        "kontostand": 0,
        "ruecklagen": 0
      },
      "gewerke": [
        { "aktiv": true, "sort": 1, "name": "Renovierung", "firma": "", "angebot": 0, "gezahlt": 0, "fortschritt": 0 },
        { "aktiv": true, "sort": 2, "name": "Möblierung & Ausstattung", "firma": "", "angebot": 0, "gezahlt": 0, "fortschritt": 0 }
      ],
      "weitereInvestition": [],
      "kredite": [],
      "airbnb": {
        "nachtpreis": 95,
        "belegungsrate": 60,
        "reinigungProBuchung": 45,
        "naechteProBuchung": 3,
        "plattformProvision": 15,
        "reinigungskostenIntern": 30,
        "fixkostenMonat": 250,
        "betreuungMonat": 0
      },
      "cashflow": []
    }
  ],
  "rentals": [
    {
      "id": "obj-elmeloh",
      "projektId": "elmeloh",
      "objekt": "Mehrfamilienhaus Elmeloh",
      "ort": "27777 Ganderkesee",
      "einheiten": [
        { "wohnung": "WE 1 · 3 Zi.", "flaeche": 106, "mieter": "", "einzug": "", "kaltmiete": 1272, "nebenkosten": 159, "status": "frei" },
        { "wohnung": "WE 2 · 4 Zi.", "flaeche": 93, "mieter": "vergeben", "einzug": "2026-07-01", "kaltmiete": 1162.50, "nebenkosten": 232.50, "status": "vermietet" },
        { "wohnung": "WE 3 · 3 Zi.", "flaeche": 92, "mieter": "vergeben", "einzug": "2026-07-01", "kaltmiete": 1150, "nebenkosten": 230, "status": "vermietet" },
        { "wohnung": "WE 4 · 3 Zi.", "flaeche": 94, "mieter": "", "einzug": "", "kaltmiete": 1128, "nebenkosten": 141, "status": "frei" },
        { "wohnung": "WE 5 · 4 Zi.", "flaeche": 124, "mieter": "", "einzug": "", "kaltmiete": 1488, "nebenkosten": 186, "status": "frei" }
      ]
    },
    {
      "id": "obj-syke",
      "projektId": "syke",
      "objekt": "Doppelhaushälfte Syke",
      "ort": "Syke",
      "einheiten": [
        { "wohnung": "Doppelhaushälfte", "flaeche": 98, "mieter": "", "einzug": "2026-07-01", "kaltmiete": 1029, "nebenkosten": 196, "status": "frei" }
      ]
    }
  ]
};
