/* ============================================================================
   data.js — Bücking Einnahmen-Dashboard
   Reine Visualisierung der Einnahmen / Zuflüsse. Beträge in EUR / Monat.
   Pflege: Werte hier anpassen oder später über eine Maske. Kein Server nötig.
   ============================================================================ */
window.DASHBOARD_DATA = {
  meta: { org: "Bücking", title: "Einnahmen", version: "2026-06-01" },
  auth: { passwordHash: "774abd2c0374e9d3d262d1b7269ce9913f5333021ad6e7356261a2305638c1e8", sessionHours: 12 },

  /* Einnahmequellen. Jede Quelle hat einen Typ, Kennzahlen und Positionen. */
  streams: [
    {
      id: "aktien",
      name: "Aktien-Sparplan",
      kind: "invest",
      ort: "ETF-Depot",
      icon: "chart",
      note: "Monatlicher Vermögensaufbau per Sparplan. Prognose auf Basis der ø 5-Jahres-Rendite (Vergangenheit, keine Garantie).",
      // Prognose-Stichtage
      prognosen: ["2032-03-18", "2069-05-01"],
      positionen: [
        { titel: "Core S&P 500 (Acc)", isin: "IE00B5BMR087", betrag: 500, aktuell: 905, cagr: 14.8, sub: "iShares Core S&P 500" },
        { titel: "Core MSCI EM (Acc)", isin: "IE00B4L5YC18", betrag: 250, aktuell: 250, cagr: 6.5, sub: "iShares Core MSCI EM IMI" },
        { titel: "Core DAX (Acc)", isin: "DE0005933931", betrag: 150, aktuell: 155, cagr: 11.0, sub: "iShares Core DAX" }
      ]
    },
    {
      id: "baumstrasse-we",
      name: "Baumstraße · 5 WE",
      kind: "miete",
      ort: "Elmeloh, Ganderkesee",
      icon: "home",
      note: "Fünf Wohneinheiten. Kalt 12 €/m², NK 1,50 €/m², Küche 70 €, Strom 40 €.",
      einheiten: [
        { wohnung: "WE 1", flaeche: 106, kaltProM2: 12, nkProM2: 1.5, kueche: 70, strom: 40, status: "frei" },
        { wohnung: "WE 2", flaeche: 93,  kaltProM2: 12, nkProM2: 1.5, kueche: 70, strom: 40, status: "vermietet" },
        { wohnung: "WE 3", flaeche: 92,  kaltProM2: 12, nkProM2: 1.5, kueche: 70, strom: 40, status: "vermietet" },
        { wohnung: "WE 4", flaeche: 94,  kaltProM2: 12, nkProM2: 1.5, kueche: 70, strom: 40, status: "frei" },
        { wohnung: "WE 5", flaeche: 124, kaltProM2: 12, nkProM2: 1.5, kueche: 70, strom: 40, status: "frei" }
      ]
    },
    {
      id: "baumstrasse-airbnb",
      name: "Baumstraße · AirBNB",
      kind: "airbnb",
      ort: "Elmeloh, Ganderkesee",
      icon: "bed",
      note: "1 WE als Kurzzeitvermietung. 75 €/Nacht, Auslastung realistisch, abzgl. AirBNB-Servicegebühr.",
      airbnb: { nachtpreis: 75, auslastung: 65, servicegebuehrProzent: 3 }
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
      kredit: { summe: 20000, abtragMonat: 400 },
      einheiten: [
        { wohnung: "DHH", flaeche: 98, kaltFix: 1029, nkFix: 196, stellplatz: 50, mieter: "Stefanie Thode", status: "vermietet" }
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

  /* Historie: monatliche Ist-Einnahmen gesamt (für den großen Cashflow-Chart).
     Werte = tatsächlich zugeflossen. Prognose ergibt sich aus streams. */
  historie: [
    { monat: "2025-07", betrag: 8900 },
    { monat: "2025-08", betrag: 9100 },
    { monat: "2025-09", betrag: 9400 },
    { monat: "2025-10", betrag: 9800 },
    { monat: "2025-11", betrag: 10100 },
    { monat: "2025-12", betrag: 10250 },
    { monat: "2026-01", betrag: 10400 },
    { monat: "2026-02", betrag: 10600 },
    { monat: "2026-03", betrag: 10750 },
    { monat: "2026-04", betrag: 10850 },
    { monat: "2026-05", betrag: 10950 },
    { monat: "2026-06", betrag: 11037 }
  ]
};
