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
      id: "baumstrasse-we",
      name: "Baumstraße · 5 WE",
      kind: "miete",
      ort: "Elmeloh, Ganderkesee",
      icon: "home",
      note: "Fünf Wohneinheiten. Kalt 12 €/m², NK 1,50 €/m², Küche 70 €, Strom 40 €. Nebenkosten werden vollständig als Puffer zurückgelegt.",
      nkAlsPuffer: true,
      invest: 922000,
      kredite: [
        { name: "KfW-Darlehen", summe: 500000, zinsPa: 2.98, abtragMonat: 2432.39, start: "2026-07-30" },
        { name: "VR-Darlehen",  summe: 422000, zinsPa: 3.48, abtragMonat: 1927.38, start: "2026-04-30", sondertilgung: { betrag: 10000, monate: [12] } }
      ],
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
      kredit: { summe: 20000, abtragMonat: 400, zinsPa: 4.0, sondertilgung: { betrag: 1500, monate: [6, 12] } },
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
  ]
};
