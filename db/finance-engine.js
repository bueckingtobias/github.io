/* ============================================================================
   finance-engine.js — Einnahmen-Berechnung je Quelle (reine Logik, ohne DOM)
   window.FinanceEngine
   ============================================================================ */
(function () {
  "use strict";
  const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
  function monthsBetween(aIso, bIso) {
    const a = new Date(aIso), b = new Date(bIso);
    return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()));
  }

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
    if (s.kind === "pacht") {
      const jahr = (s.vertraege || []).reduce((a, v) => a + (Number(v.jahr) || 0), 0);
      const flaeche = (s.vertraege || []).reduce((a, v) => a + (Number(v.flaeche) || 0), 0);
      return { gesamt: r2(jahr / 12), jahr: r2(jahr), flaeche: r2(flaeche), anzahl: (s.vertraege || []).length, typ: "pacht" };
    }
    // miete
    const units = (s.einheiten || []).map(unitIncome);
    const vermietet = (s.einheiten || []).filter(u => u.status === "vermietet");
    const puffer = !!s.nkAlsPuffer;
    // Ertrag = alles außer NK, wenn NK als Puffer zurückgelegt wird
    const ertragUnit = u => { const i = unitIncome(u); return puffer ? (i.gesamt - i.nk) : i.gesamt; };
    const gesamtAlle = (s.einheiten || []).reduce((a, u) => a + ertragUnit(u), 0);
    const gesamtIst = (s.einheiten || []).reduce((a, u) => a + (u.status === "vermietet" ? ertragUnit(u) : 0), 0);
    const nkAlle = units.reduce((a, u) => a + u.nk, 0);
    const nkIst = (s.einheiten || []).reduce((a, u) => a + (u.status === "vermietet" ? unitIncome(u).nk : 0), 0);
    const kaltAlle = units.reduce((a, u) => a + u.kalt, 0);
    const kreditAbtrag = s.kredit ? (Number(s.kredit.abtragMonat) || 0) : 0;
    const nettoCashflow = gesamtIst - kreditAbtrag; // nach Kreditabtrag
    return {
      gesamt: r2(gesamtIst),            // Ertrag (ohne NK-Puffer)
      gesamtPotenzial: r2(gesamtAlle),  // bei Vollvermietung
      netto: r2(nettoCashflow),         // nach Kreditabtrag
      kreditAbtrag: r2(kreditAbtrag),
      puffer, nkPuffer: r2(puffer ? nkIst : 0),
      kalt: r2(kaltAlle), nk: r2(nkAlle),
      einheiten: units.length, vermietet: vermietet.length,
      typ: "miete"
    };
  }

  // Sparplan-Prognose je Position bis zu einem Stichtag.
  // Monatlich: Bestand verzinsen (cagr/12), dann Sparrate addieren.
  function projectPosition(pos, fromIso, toIso) {
    const months = monthsBetween(fromIso, toIso);
    const r = (Number(pos.cagr) || 0) / 100 / 12;
    let v = Number(pos.aktuell) || 0;
    let eingezahlt = v;
    const rate = Number(pos.betrag) || 0;
    for (let m = 0; m < months; m++) { v = v * (1 + r) + rate; eingezahlt += rate; }
    return { wert: r2(v), eingezahlt: r2(eingezahlt), gewinn: r2(v - eingezahlt), months,
      roi: eingezahlt ? r2((v - eingezahlt) / eingezahlt * 100) : 0 };
  }
  function investProjection(s, toIso) {
    const from = new Date().toISOString().slice(0, 10);
    const rows = (s.positionen || []).map(p => ({ pos: p, ...projectPosition(p, from, toIso) }));
    const wert = rows.reduce((a, x) => a + x.wert, 0);
    const eingezahlt = rows.reduce((a, x) => a + x.eingezahlt, 0);
    return { rows, wert: r2(wert), eingezahlt: r2(eingezahlt), gewinn: r2(wert - eingezahlt),
      roi: eingezahlt ? r2((wert - eingezahlt) / eingezahlt * 100) : 0, datum: toIso };
  }
  // aktueller Depotwert
  function depotWert(s) { return r2((s.positionen || []).reduce((a, p) => a + (Number(p.aktuell) || 0), 0)); }

  // Immobilien-Kennzahlen
  function immoKPIs(s) {
    const m = streamMonthly(s);
    const invest = Number(s.invest) || 0;
    const kaltJahr = m.kalt * 12;
    const ertragJahr = m.gesamt * 12;
    const nettoJahr = m.netto * 12;
    const kredit = s.kredit || null;
    const tilgungMonate = kredit && kredit.abtragMonat ? Math.ceil(kredit.summe / kredit.abtragMonat) : null;
    return {
      invest,
      bruttoRendite: invest ? r2(kaltJahr / invest * 100) : 0,
      nettoRendite: invest ? r2(ertragJahr / invest * 100) : 0,
      cashflowRoi: invest ? r2(nettoJahr / invest * 100) : 0,
      nettoCashflowMonat: m.netto, nettoCashflowJahr: r2(nettoJahr),
      kreditAbtrag: m.kreditAbtrag, kreditSumme: kredit ? kredit.summe : 0,
      tilgungMonate, tilgungJahre: tilgungMonate ? r2(tilgungMonate / 12) : null,
      nkPuffer: m.nkPuffer, nkPufferJahr: r2(m.nkPuffer * 12)
    };
  }

  // Portfolio-Summe (Ist) und Potenzial
  function totals(data) {
    let ist = 0, potenzial = 0, invest = 0, miete = 0, airbnb = 0, pacht = 0;
    (data.streams || []).forEach(s => {
      const m = streamMonthly(s);
      if (s.kind === "invest") { invest += m.gesamt; }
      else if (s.kind === "airbnb") { airbnb += m.gesamt; ist += m.gesamt; potenzial += m.gesamt; }
      else if (s.kind === "pacht") { pacht += m.gesamt; ist += m.gesamt; potenzial += m.gesamt; }
      else { miete += m.gesamt; ist += m.gesamt; potenzial += (m.gesamtPotenzial || m.gesamt); }
    });
    return {
      ist: r2(ist), potenzial: r2(potenzial), invest: r2(invest),
      miete: r2(miete), airbnb: r2(airbnb), pacht: r2(pacht),
      gesamtInklInvest: r2(ist + invest),
      jahrIst: r2(ist * 12), jahrInvest: r2(invest * 12)
    };
  }

  window.FinanceEngine = { unitIncome, airbnbIncome, streamMonthly, totals, r2,
    projectPosition, investProjection, depotWert, immoKPIs, monthsBetween };
})();
