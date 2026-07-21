/* ============================================================================
   data.js — Bücking Einnahmen-Dashboard
   Reine Visualisierung der Einnahmen / Zuflüsse. Beträge in EUR / Monat.
   Pflege: Werte hier anpassen oder später über eine Maske. Kein Server nötig.
   ============================================================================ */
window.DASHBOARD_DATA = {
  meta: { org: "Bücking", title: "Einnahmen", version: "2026-07-18" },
  auth: {
    passwordHash: "774abd2c0374e9d3d262d1b7269ce9913f5333021ad6e7356261a2305638c1e8",
    sessionHours: 12,
    // Beide Zugänge nutzen dasselbe Passwort, unterscheiden sich nur in der Ansprache
    benutzer: [
      { id: "tobias",    name: "Tobias",    anrede: "Tobias" },
      { id: "bernfried", name: "Bernfried", anrede: "Bernfried" }
    ]
  },

  /* Begrüßungen nach Tageszeit. {name} wird ersetzt. */
  begruessungen: {
    morgen: [
      "Guten Morgen, {name}!",
      "Moin {name} – auf einen guten Tag!",
      "Frühstück erledigt, {name}? Dann los.",
      "Guten Morgen, {name}. Frisch ans Werk."
    ],
    tag: [
      "Hallo {name}!",
      "Schön, dass du da bist, {name}.",
      "Moin {name}!",
      "Hallo {name} – alles im Blick."
    ],
    abend: [
      "Guten Abend, {name}!",
      "Feierabend, {name}? Ein Blick lohnt sich.",
      "Schönen Abend, {name}!",
      "Guten Abend, {name}. Zeit für die Bilanz."
    ],
    nacht: [
      "Noch wach, {name}?",
      "Späte Runde, {name}?",
      "Gute Nacht, {name} – oder noch kurz reinschauen?"
    ]
  },

  /* Einnahmequellen. Jede Quelle hat einen Typ, Kennzahlen und Positionen. */
  streams: [
    {
      id: "baumstrasse-we",
      name: "Baumstraße · 5 WE",
      kind: "miete",
      ort: "Elmeloh, Ganderkesee",
      icon: "home",
      note: "Fünf Wohneinheiten. Kalt 12 €/m², NK 1,50 €/m², Küche 70 €, Strom 40 €. Nebenkosten werden vollständig als Puffer zurückgelegt.",
      nkAlsPuffer: true,
      invest: 1200000,
      // Wofür die Nebenkosten-Rücklage verwendet wird (Anteile in % der NK-Summe)
      nkPositionen: [
        { titel: "Heizung & Warmwasser", anteil: 38 },
        { titel: "Grundsteuer",          anteil: 14 },
        { titel: "Gebäudeversicherung",  anteil: 12 },
        { titel: "Müll & Entwässerung",  anteil: 11 },
        { titel: "Allgemeinstrom",       anteil: 8 },
        { titel: "Hausmeister & Pflege", anteil: 10 },
        { titel: "Sonstiges / Puffer",   anteil: 7 }
      ],
      kredite: [
        { name: "KfW-Darlehen", summe: 500000, zinsPa: 2.98, abtragMonat: 2432.39, start: "2026-07-30", restStand: { datum: "2026-07-18", betrag: 500000.00 } },
        { name: "VR-Darlehen",  summe: 422000, zinsPa: 3.48, abtragMonat: 1927.38, start: "2026-04-30", restStand: { datum: "2026-07-18", betrag: 419883.13 }, sondertilgung: { betrag: 10000, monate: [12] } }
      ],
      einheiten: [
        { wohnung: "WE 1", flaeche: 106, kaltProM2: 12, nkProM2: 1.5, kueche: 70, strom: 40, mieter: "Joy Terborg & Tjark Möller", einzug: "2026-08-15", status: "vermietet",
          vertrag: { kaution: null, laufzeit: "unbefristet", kuendigungsfrist: "3 Monate", vertragsdatum: null, telefon: "", email: "", notiz: "" } },
        { wohnung: "WE 2", flaeche: 93,  kaltProM2: 12, nkProM2: 1.5, kueche: 70, strom: 40, mieter: "Alexander Banse", einzug: "2026-07-01", status: "vermietet",
          vertrag: { kaution: null, laufzeit: "unbefristet", kuendigungsfrist: "3 Monate", vertragsdatum: null, telefon: "", email: "", notiz: "" } },
        { wohnung: "WE 3", flaeche: 92,  kaltProM2: 12, nkProM2: 1.5, kueche: 70, strom: 40, mieter: "Karin Schröder", einzug: "2026-07-01", status: "vermietet",
          vertrag: { kaution: null, laufzeit: "unbefristet", kuendigungsfrist: "3 Monate", vertragsdatum: null, telefon: "", email: "", notiz: "" } },
        { wohnung: "WE 4", flaeche: 94,  kaltProM2: 12, nkProM2: 1.5, kueche: 70, strom: 40, mieter: "Marleen Gieler", einzug: "2026-08-01", status: "vermietet",
          vertrag: { kaution: null, laufzeit: "unbefristet", kuendigungsfrist: "3 Monate", vertragsdatum: null, telefon: "", email: "", notiz: "" } },
        { wohnung: "WE 5", flaeche: 124, kaltProM2: 12, nkProM2: 1.5, kueche: 70, strom: 40, status: "frei",
          vertrag: { kaution: null, laufzeit: null, kuendigungsfrist: null, vertragsdatum: null, telefon: "", email: "", notiz: "" } }
      ]
    },
    {
      id: "baumstrasse-airbnb",
      name: "Baumstraße · AirBNB",
      kind: "airbnb",
      ort: "Elmeloh, Ganderkesee",
      icon: "bed",
      note: "1 WE als Kurzzeitvermietung. 75 €/Nacht, Auslastung realistisch, abzgl. AirBNB-Servicegebühr.",
      airbnb: {
        nachtpreis: 75,
        auslastung: 65,
        servicegebuehrProzent: 3,      // Host-Service-Fee (Modell "host"); bei "vereinfacht" ~15
        gebuehrenmodell: "host",       // "host" = Gast zahlt Servicegebühr | "vereinfacht" = Host zahlt alles
        aufenthaltsdauer: 3,           // Ø Nächte pro Buchung
        reinigungsgebuehr: 50,         // wird dem Gast berechnet (zählt zum Umsatz)
        reinigungskosten: 40,          // tatsächliche Kosten je Buchung
        verbrauchProBuchung: 8         // Wäsche, Verbrauchsmaterial
      }
    },
    {
      id: "syke",
      name: "Doppelhaus Syke",
      kind: "miete",
      ort: "Syke",
      icon: "home",
      note: "1 Wohneinheit, 98 m². Nebenkosten werden vollständig als Puffer zurückgelegt.",
      nkAlsPuffer: true,
      invest: 60000,
      nkPositionen: [
        { titel: "Heizung & Warmwasser", anteil: 40 },
        { titel: "Grundsteuer",          anteil: 16 },
        { titel: "Gebäudeversicherung",  anteil: 13 },
        { titel: "Müll & Entwässerung",  anteil: 13 },
        { titel: "Schornsteinfeger",     anteil: 6 },
        { titel: "Sonstiges / Puffer",   anteil: 12 }
      ],
      kredit: { name: "Sparkassen-Darlehen", summe: 20000, abtragMonat: 400, zinsPa: 4.0, start: "2026-08-01", sondertilgung: { betrag: 1500, monate: [6, 12] } },
      einheiten: [
        { wohnung: "DHH", flaeche: 98, kaltFix: 1029, nkFix: 196, stellplatz: 50, mieter: "Stefanie Thode", status: "vermietet",
          vertrag: { kaution: null, laufzeit: "unbefristet", kuendigungsfrist: "3 Monate", vertragsdatum: null, telefon: "", email: "", notiz: "" } }
      ]
    },
    {
      id: "pacht",
      name: "Landpacht",
      kind: "pacht",
      ort: "Ganderkesee · Blatt 10060",
      icon: "sprout",
      note: "Verpachtung landwirtschaftlicher Flächen. Pacht wird jährlich zum 01.12. gezahlt; hier auf den Monat umgerechnet.",
      vertraege: [
        { paechter: "Dieter von Seggern", jahr: 6251.50, flaeche: 8.66, art: "Grünland + Ackerland", start: "2016-11-01", ende: "2026-10-31" },
        { paechter: "Heiko Petershagen", jahr: 1416.00, flaeche: 2.02, art: "Ackerland", start: "2004-11-01", ende: "2014-10-31" },
        { paechter: "Hüneke GbR", jahr: 1090.00, flaeche: 2.19, art: "Grünland", start: "2016-11-01", ende: "2026-10-31" },
        { paechter: "Heide & Christian Meyer", jahr: 200.00, flaeche: 1.00, art: "Grünland + Gehölz", start: "2021-11-01", ende: "jährlich" }
      ]
    }
  ],

  /* Wetter — Standort für das Wettermodul (Open-Meteo, kein API-Key nötig) */
  wetter: { ort: "Ganderkesee", lat: 53.0333, lon: 8.5333 },

  /* Kalender-Ereignisse.
     typ: "miete" | "einzug" | "termin" | "zahlung"
     wiederholung: "monatlich" (jeden Monat am Tag von datum) oder weglassen für einmalig */
  termine: [
    { titel: "Mieteingang", datum: "2026-07-01", typ: "miete", wiederholung: "monatlich", info: "Alle Mieten Baumstraße & Syke" },
    { titel: "Einzug Karin Schröder", datum: "2026-07-01", typ: "einzug", info: "WE 3 · OG · 92 m²" },
    { titel: "Einzug Alexander Banse", datum: "2026-07-01", typ: "einzug", info: "WE 2 · EG · 93 m²" },
    { titel: "Einzug Marleen Gieler", datum: "2026-08-01", typ: "einzug", info: "WE 4 · 94 m²" },
    { titel: "Einzug Joy Terborg & Tjark Möller", datum: "2026-08-15", typ: "einzug", info: "WE 1 · 106 m²" },
    { titel: "Sondertilgung VR-Darlehen", datum: "2026-12-01", typ: "zahlung", wiederholung: "jaehrlich", info: "10.000 €" },
    { titel: "Sondertilgung Syke", datum: "2026-06-01", typ: "zahlung", wiederholung: "halbjaehrlich", info: "1.500 € (01.06. & 01.12.)" },
    { titel: "Pachtzahlung", datum: "2026-12-01", typ: "zahlung", wiederholung: "jaehrlich", info: "8.957,50 € gesamt" }
  ]
};
