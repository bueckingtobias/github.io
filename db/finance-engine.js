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
    const kreditListe = creditsOf(s);
    const kreditAbtrag = kreditListe.reduce((a, kr) => a + (Number(kr.abtragMonat) || 0), 0);
    const nettoCashflow = gesamtIst - kreditAbtrag; // nach allen Kreditraten
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

  // Liefert alle Kredite eines Streams als Array (unterstützt s.kredit ODER s.kredite[]).
  function creditsOf(s) {
    if (!s) return [];
    if (Array.isArray(s.kredite)) return s.kredite;
    if (s.kredit) return [s.kredit];
    return [];
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

  // Kredit-Tilgungsplan mit Zins + optionalen halbjährlichen Sondertilgungen.
  // kredit: { summe, abtragMonat, zinsPa, start, sondertilgung:{betrag, monate:[6,12]} }
  function creditPlan(kredit, startIso) {
    if (!kredit) return null;
    const start = new Date(startIso || kredit.start || new Date());
    let rest = Number(kredit.summe) || 0;
    const rate = Number(kredit.abtragMonat) || 0;
    const i = (Number(kredit.zinsPa) || 0) / 100 / 12;
    const st = kredit.sondertilgung || null;
    const stBetrag = st ? Number(st.betrag) || 0 : 0;
    const stMonate = st && Array.isArray(st.monate) ? st.monate : [];
    const rows = [];
    let zinsGesamt = 0, sonderGesamt = 0, monat = 0;
    let d = new Date(start.getFullYear(), start.getMonth(), 1);
    // aktueller Monat (für "Restschuld heute")
    const nowKey = new Date().toISOString().slice(0, 7);
    let restAktuell = Number(kredit.summe) || 0;   // Stand heute
    let getilgtBisher = 0;                          // bereits getilgt (bis heute)
    while (rest > 0.005 && monat < 600) {
      const zins = rest * i;
      let tilgung = Math.min(rate - zins, rest);
      if (tilgung < 0) tilgung = 0; // Rate deckt Zins nicht
      rest -= tilgung;
      zinsGesamt += zins;
      let sonder = 0;
      if (stBetrag && stMonate.includes(d.getMonth() + 1) && rest > 0) {
        sonder = Math.min(stBetrag, rest);
        rest -= sonder; sonderGesamt += sonder;
      }
      const key = d.toISOString().slice(0, 7);
      rows.push({ monat: key, zins: r2(zins), tilgung: r2(tilgung), sonder: r2(sonder), rest: r2(Math.max(0, rest)) });
      // Restschuld/Tilgung bis heute (einschließlich laufendem Monat)
      if (key < nowKey) { restAktuell = Math.max(0, rest); getilgtBisher = (Number(kredit.summe) || 0) - restAktuell; }
      monat++;
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      if (tilgung === 0 && stBetrag === 0) break; // tilgt nie
    }
    const startInFuture = start.toISOString().slice(0, 7) > nowKey;
    // Echter Kontostand hat Vorrang vor der Modellrechnung.
    // restStand: { datum:"YYYY-MM-DD", betrag: 419883.13 }
    let restHeute = startInFuture ? (Number(kredit.summe) || 0) : restAktuell;
    let getilgtHeute = startInFuture ? 0 : getilgtBisher;
    if (kredit.restStand && kredit.restStand.betrag != null) {
      const anker = Number(kredit.restStand.betrag);
      const ankerKey = String(kredit.restStand.datum || "").slice(0, 7);
      // Raten, die seit dem Stichtag fällig wurden, zusätzlich abziehen
      let r = anker, extra = 0;
      const heute = new Date();
      const zahltag = Number(String(kredit.start || "").slice(8, 10)) || 1;
      rows.forEach(row => {
        if (!ankerKey || row.monat <= ankerKey) return;
        // tatsächliches Fälligkeitsdatum dieser Rate
        const y = Number(row.monat.slice(0, 4)), mo = Number(row.monat.slice(5, 7));
        const letzterTag = new Date(y, mo, 0).getDate();
        const faellig = new Date(y, mo - 1, Math.min(zahltag, letzterTag));
        if (faellig > heute) return; // noch nicht gebucht
        const z = r * i;
        const t = Math.min(rate - z, r);
        r -= (t > 0 ? t : 0);
        if (stBetrag && stMonate.includes(mo) && r > 0) r -= Math.min(stBetrag, r);
        extra++;
      });
      restHeute = Math.max(0, r);
      getilgtHeute = (Number(kredit.summe) || 0) - restHeute;
    }
    return {
      rows, monate: monat, jahre: r2(monat / 12),
      zinsGesamt: r2(zinsGesamt), sonderGesamt: r2(sonderGesamt),
      getilgt: rest <= 0.005, restEnde: r2(Math.max(0, rest)),
      restAktuell: r2(restHeute),
      getilgtBisher: r2(getilgtHeute),
      startKey: start.toISOString().slice(0, 7),
      abzahlDatum: rows.length ? rows[rows.length - 1].monat : null
    };
  }

  // Immobilien-Kennzahlen
  function immoKPIs(s) {
    const m = streamMonthly(s);
    const invest = Number(s.invest) || 0;
    const kaltJahr = m.kalt * 12;
    const ertragJahr = m.gesamt * 12;
    const nettoJahr = m.netto * 12;
    const kredite = creditsOf(s);
    const plans = kredite.map(kr => ({ kredit: kr, plan: creditPlan(kr) }));
    const kreditSummeGesamt = kredite.reduce((a, kr) => a + (Number(kr.summe) || 0), 0);
    const restschuldGesamt = plans.reduce((a, p) => a + (p.plan ? p.plan.restAktuell : 0), 0);
    const zinsGesamt = plans.reduce((a, p) => a + (p.plan ? p.plan.zinsGesamt : 0), 0);
    const maxMonate = plans.reduce((a, p) => Math.max(a, p.plan ? p.plan.monate : 0), 0);
    // Für Einzelkredit-Streams (Syke) Rückwärtskompatibilität:
    const firstPlan = plans.length ? plans[0].plan : null;
    return {
      invest,
      bruttoRendite: invest ? r2(kaltJahr / invest * 100) : 0,
      nettoRendite: invest ? r2(ertragJahr / invest * 100) : 0,
      cashflowRoi: invest ? r2(nettoJahr / invest * 100) : 0,
      nettoCashflowMonat: m.netto, nettoCashflowJahr: r2(nettoJahr),
      kreditAbtrag: m.kreditAbtrag,
      kreditSumme: kreditSummeGesamt,
      restschuldGesamt: r2(restschuldGesamt),
      zinsGesamt: r2(zinsGesamt),
      tilgungMonate: maxMonate || null, tilgungJahre: maxMonate ? r2(maxMonate / 12) : null,
      kreditPlan: firstPlan, kreditPlans: plans,
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
    projectPosition, investProjection, depotWert, immoKPIs, creditPlan, creditsOf, monthsBetween };
})();
