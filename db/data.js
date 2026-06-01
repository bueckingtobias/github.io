/* data.js — exportiert am 1.6.2026, 23:13:38 */
window.DASHBOARD_DATA = {
  "meta": {
    "version": "2026-06-01",
    "org": "Bücking Immobilien",
    "updatedAt": "2026-06-01"
  },
  "auth": {
    "passwordHash": "774abd2c0374e9d3d262d1b7269ce9913f5333021ad6e7356261a2305638c1e8",
    "sessionHours": 12
  },
  "projects": [
    {
      "id": "baumstrasse",
      "name": "Baumstraße",
      "address": "Baumstraße 35, 27777 Ganderkesee",
      "scope": "Umbau Stall zu 5 Wohnungen",
      "note": "Hauptprojekt.",
      "investitionStart": "2024-01-01",
      "account": {
        "name": "Konto Baumstraße",
        "kontostand": 96000,
        "ruecklagen": 40000
      },
      "gewerke": [
        {
          "aktiv": true,
          "sort": 1,
          "name": "Rohbau",
          "firma": "Bauunternehmen Mahlstedt GmbH & Co. KG",
          "angebot": 532509,
          "gezahlt": 193970,
          "fortschritt": 70
        },
        {
          "aktiv": true,
          "sort": 2,
          "name": "Zimmerei",
          "firma": "Meyer's Zimmerei GmbH",
          "angebot": 258265,
          "gezahlt": 119000,
          "fortschritt": 80
        },
        {
          "aktiv": true,
          "sort": 3,
          "name": "Dach",
          "firma": "Warrelmann GmbH Bedachungen",
          "angebot": 70226,
          "gezahlt": 23324,
          "fortschritt": 80
        },
        {
          "aktiv": true,
          "sort": 4,
          "name": "Fenster / Türen",
          "firma": "Tischlerei Warrelmann GmbH",
          "angebot": 55542,
          "gezahlt": 0,
          "fortschritt": 95
        },
        {
          "aktiv": true,
          "sort": 5,
          "name": "Sanitär / Heizung",
          "firma": "Fortmann Haustechnik GmbH & Co. KG",
          "angebot": 177206,
          "gezahlt": 0,
          "fortschritt": 0
        },
        {
          "aktiv": true,
          "sort": 6,
          "name": "Elektro",
          "firma": "Elektro-Technik Hoffmann GmbH",
          "angebot": 70386,
          "gezahlt": 0,
          "fortschritt": 0
        },
        {
          "aktiv": true,
          "sort": 7,
          "name": "Gerüstbau",
          "firma": "Torsten Schreiber Gerüstbau",
          "angebot": 9104,
          "gezahlt": 10288,
          "fortschritt": 100
        },
        {
          "aktiv": true,
          "sort": 8,
          "name": "Erdwärme",
          "firma": "Hartmann Brunnenbau GmbH",
          "angebot": 19417,
          "gezahlt": 19417,
          "fortschritt": 100
        },
        {
          "aktiv": true,
          "sort": 9,
          "name": "Anschlüsse / Kanal",
          "firma": "OOWV",
          "angebot": 25186,
          "gezahlt": 3122,
          "fortschritt": 30
        },
        {
          "aktiv": true,
          "sort": 10,
          "name": "Sonstiges",
          "firma": "diverse",
          "angebot": 20000,
          "gezahlt": 20000,
          "fortschritt": 50
        }
      ],
      "weitereInvestition": [
        {
          "titel": "Grundstück / Bestand",
          "betrag": 180000
        },
        {
          "titel": "Planung / Architekt",
          "betrag": 48000
        },
        {
          "titel": "Baunebenkosten",
          "betrag": 35000
        }
      ],
      "kredite": [
        {
          "id": "baum-kfw",
          "bezeichnung": "KfW-Darlehen",
          "glaeubiger": "KfW / Hausbank",
          "art": "annuitaet",
          "rateModus": "tilgungssatz",
          "betrag": 450000,
          "zinsSatz": 2.4,
          "tilgungSatz": 2,
          "rateBetrag": 0,
          "laufzeitJahre": 25,
          "start": "2024-04-01",
          "sondertilgungen": []
        },
        {
          "id": "baum-bank",
          "bezeichnung": "Bankdarlehen",
          "glaeubiger": "Sparkasse",
          "art": "annuitaet",
          "rateModus": "tilgungssatz",
          "betrag": 380000,
          "zinsSatz": 3.6,
          "tilgungSatz": 2.5,
          "rateBetrag": 0,
          "laufzeitJahre": 20,
          "start": "2024-04-01",
          "sondertilgungen": [
            {
              "datum": "2025-12-01",
              "betrag": 15000
            }
          ]
        }
      ],
      "cashflow": [
        {
          "monat": "2025-07",
          "miete": 3690,
          "nebenkosten": 740,
          "betriebskosten": 1100,
          "sonstigeKosten": 300
        },
        {
          "monat": "2025-08",
          "miete": 3690,
          "nebenkosten": 740,
          "betriebskosten": 1100,
          "sonstigeKosten": 250
        },
        {
          "monat": "2025-09",
          "miete": 3690,
          "nebenkosten": 740,
          "betriebskosten": 1200,
          "sonstigeKosten": 400
        },
        {
          "monat": "2025-10",
          "miete": 3690,
          "nebenkosten": 740,
          "betriebskosten": 1150,
          "sonstigeKosten": 280
        },
        {
          "monat": "2025-11",
          "miete": 3690,
          "nebenkosten": 740,
          "betriebskosten": 1300,
          "sonstigeKosten": 500
        },
        {
          "monat": "2025-12",
          "miete": 3690,
          "nebenkosten": 740,
          "betriebskosten": 1400,
          "sonstigeKosten": 900
        },
        {
          "monat": "2026-01",
          "miete": 3690,
          "nebenkosten": 740,
          "betriebskosten": 1250,
          "sonstigeKosten": 320
        },
        {
          "monat": "2026-02",
          "miete": 3690,
          "nebenkosten": 740,
          "betriebskosten": 1200,
          "sonstigeKosten": 260
        },
        {
          "monat": "2026-03",
          "miete": 3690,
          "nebenkosten": 740,
          "betriebskosten": 1280,
          "sonstigeKosten": 350
        },
        {
          "monat": "2026-04",
          "miete": 3690,
          "nebenkosten": 740,
          "betriebskosten": 1180,
          "sonstigeKosten": 300
        },
        {
          "monat": "2026-05",
          "miete": 3690,
          "nebenkosten": 740,
          "betriebskosten": 1320,
          "sonstigeKosten": 420
        },
        {
          "monat": "2026-06",
          "miete": 3690,
          "nebenkosten": 740,
          "betriebskosten": 1240,
          "sonstigeKosten": 280
        }
      ]
    },
    {
      "id": "huenenberg",
      "name": "Am Hünenberg",
      "address": "Am Hünenberg 12, 27777 Ganderkesee",
      "scope": "Sanierung DPH",
      "note": "Zweites Projekt. Finanzierung über privates Darlehen (Mama).",
      "investitionStart": "2025-04-01",
      "account": {
        "name": "Konto Am Hünenberg",
        "kontostand": 20000,
        "ruecklagen": 15000
      },
      "gewerke": [
        {
          "aktiv": true,
          "sort": 1,
          "name": "Sanierung",
          "firma": "Christoph Wetjen",
          "angebot": 35000,
          "gezahlt": 20000,
          "fortschritt": 90
        },
        {
          "aktiv": true,
          "sort": 2,
          "name": "Fenster / Türen",
          "firma": "Frank Kanther",
          "angebot": 11000,
          "gezahlt": 11000,
          "fortschritt": 100
        },
        {
          "aktiv": true,
          "sort": 4,
          "name": "Fliesen",
          "firma": "Fleisenzentrum",
          "angebot": 5000,
          "gezahlt": 5000,
          "fortschritt": 100
        },
        {
          "aktiv": true,
          "sort": 4,
          "name": "Sanitär",
          "firma": "Hoffmann",
          "angebot": 16000,
          "gezahlt": 16000,
          "fortschritt": 100
        }
      ],
      "weitereInvestition": [
        {
          "titel": "Baunebenkosten",
          "betrag": 1000
        }
      ],
      "kredite": [
        {
          "id": "huenen-buecking",
          "bezeichnung": "Privatdarlehen",
          "glaeubiger": "E. Bücking",
          "art": "annuitaet",
          "rateModus": "rate",
          "betrag": 20000,
          "zinsSatz": 3.5,
          "tilgungSatz": 2,
          "rateBetrag": 400,
          "laufzeitJahre": 20,
          "start": "2026-08-01",
          "sondertilgungen": [
            {
              "datum": "2027-08-01",
              "betrag": 3000
            },
            {
              "datum": "2028-08-01",
              "betrag": 3000
            },
            {
              "datum": "2029-08-01",
              "betrag": 3000
            }
          ]
        }
      ],
      "cashflow": [
        {
          "monat": "2026-07",
          "miete": 1090,
          "nebenkosten": 250,
          "betriebskosten": 400,
          "sonstigeKosten": 0
        },
        {
          "monat": "2026-08",
          "miete": 1090,
          "nebenkosten": 250,
          "betriebskosten": 0,
          "sonstigeKosten": 0
        }
      ]
    }
  ],
  "rentals": [
    {
      "id": "obj-baumstrasse",
      "projektId": "baumstrasse",
      "objekt": "Baumstraße 35",
      "ort": "27777 Ganderkesee",
      "einheiten": [
        {
          "wohnung": "WE 1 · EG links",
          "flaeche": 68,
          "mieter": "Familie Janßen",
          "einzug": "2024-09-01",
          "kaltmiete": 720,
          "nebenkosten": 180,
          "status": "vermietet"
        },
        {
          "wohnung": "WE 2 · EG rechts",
          "flaeche": 54,
          "mieter": "Herr Dittmer",
          "einzug": "2024-10-01",
          "kaltmiete": 580,
          "nebenkosten": 150,
          "status": "vermietet"
        },
        {
          "wohnung": "WE 3 · OG links",
          "flaeche": 72,
          "mieter": "Frau Brünjes",
          "einzug": "2025-01-15",
          "kaltmiete": 760,
          "nebenkosten": 190,
          "status": "vermietet"
        },
        {
          "wohnung": "WE 4 · OG rechts",
          "flaeche": 61,
          "mieter": "",
          "einzug": "",
          "kaltmiete": 650,
          "nebenkosten": 160,
          "status": "frei"
        },
        {
          "wohnung": "WE 5 · DG",
          "flaeche": 88,
          "mieter": "Familie Köster",
          "einzug": "2025-03-01",
          "kaltmiete": 910,
          "nebenkosten": 220,
          "status": "vermietet"
        }
      ]
    },
    {
      "id": "obj-huenenberg",
      "projektId": "huenenberg",
      "objekt": "Am Hünenberg 12",
      "ort": "27777 Ganderkesee",
      "einheiten": [
        {
          "wohnung": "DPH",
          "flaeche": 125,
          "mieter": "XY",
          "einzug": "01.08.2026",
          "kaltmiete": 1090,
          "nebenkosten": 250,
          "status": "vermietet"
        }
      ]
    }
  ]
};
