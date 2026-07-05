/* ============================================================================
   finance-engine.js — Einnahmen-Berechnung je Quelle (reine Logik, ohne DOM)
   window.FinanceEngine
   ============================================================================ */
(function () {
  "use strict";
  const r2 = n => Math.round((Number(n) || 0) * 100) / 100;

  // Einnahmen einer Wohneinheit (Miete-Typ)
  function unitIncome(u) {
    const kalt = u.kaltFix != null ? Number(u.kaltFix) : (Number(u.flaeche) || 0) * (Number(u.kaltProM2) || 0);
    const nk   = u.nkFix   != null ? Number(u.nkFix)   : (Number(u.flaeche) || 0) * (Number(u.nkProM2) || 0);
    const kueche = Number(u.kueche) || 0;
    const strom  = Number(u.strom) || 0;
    const stell  = Number(u.stellplatz) || 0;
    const gesamt = kalt + nk + kueche + strom + stell;
    return { kalt: r2(kalt), nk: r2(nk), kueche, strom, stell, gesamt: r2(gesamt) };
  }

  // AirBNB-Einnahmen
  function airbnbIncome(a) {
    const nights = 30.4 * ((Number(a.auslastung) || 0) / 100);
    const brutto = nights * (Number(a.nachtpreis) || 0);
    const fee = brutto * ((Number(a.servicegebuehrProzent) || 0) / 100);
    return { naechte: r2(nights), brutto: r2(brutto), fee: r2(fee), netto: r2(brutto - fee) };
  }

  // Aggregierte Einnahme einer Quelle (monatlich)
  function streamMonthly(s) {
    if (s.kind === "invest") {
      const g = (s.positionen || []).reduce((a, p) => a + (Number(p.betrag) || 0), 0);
      return { gesamt: r2(g), typ: "invest" };
    }
    if (s.kind === "airbnb") {
      const a = airbnbIncome(s.airbnb || {});
      return { gesamt: a.netto, detail: a, typ: "airbnb" };
    }
    // miete
    const units = (s.einheiten || []).map(unitIncome);
    const vermietet = (s.einheiten || []).filter(u => u.status === "vermietet");
    const gesamtAlle = units.reduce((a, u) => a + u.gesamt, 0);
    // Ist = nur vermietete Einheiten
    const gesamtIst = (s.einheiten || []).reduce((a, u) => a + (u.status === "vermietet" ? unitIncome(u).gesamt : 0), 0);
    const kaltAlle = units.reduce((a, u) => a + u.kalt, 0);
    const nkAlle = units.reduce((a, u) => a + u.nk, 0);
    return {
      gesamt: r2(gesamtIst),          // Ist-Einnahme (vermietet)
      gesamtPotenzial: r2(gesamtAlle),// bei Vollvermietung
      kalt: r2(kaltAlle), nk: r2(nkAlle),
      einheiten: units.length, vermietet: vermietet.length,
      typ: "miete"
    };
  }

  // Portfolio-Summe (Ist) und Potenzial
  function totals(data) {
    let ist = 0, potenzial = 0, invest = 0, miete = 0, airbnb = 0;
    (data.streams || []).forEach(s => {
      const m = streamMonthly(s);
      if (s.kind === "invest") { invest += m.gesamt; }
      else if (s.kind === "airbnb") { airbnb += m.gesamt; ist += m.gesamt; potenzial += m.gesamt; }
      else { miete += m.gesamt; ist += m.gesamt; potenzial += (m.gesamtPotenzial || m.gesamt); }
    });
    return {
      ist: r2(ist),                 // reale Miet-/AirBNB-Einnahmen
      potenzial: r2(potenzial),     // bei Vollvermietung
      invest: r2(invest),           // Sparrate (Zufluss Depot)
      miete: r2(miete), airbnb: r2(airbnb),
      gesamtInklInvest: r2(ist + invest),
      jahrIst: r2(ist * 12), jahrInvest: r2(invest * 12)
    };
  }

  window.FinanceEngine = { unitIncome, airbnbIncome, streamMonthly, totals, r2 };
})();
