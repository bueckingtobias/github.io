/* ============================================================================
   finance-engine.js — reine Rechenlogik (testbar, ohne DOM)
   window.FinanceEngine
   ========================================================================== */
(function () {
  "use strict";

  function monthsBetween(aIso, bIso) {
    const a = new Date(aIso), b = new Date(bIso);
    return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  }
  function addMonths(iso, n) {
    const d = new Date(iso); d.setMonth(d.getMonth() + n);
    return d.toISOString().slice(0, 10);
  }
  function fmtMonth(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("de-DE", { month: "short", year: "numeric" });
  }

  /* Effektive Monatsrate (Annuität) je nach Modus. */
  function monthlyRate(kredit) {
    const i = (Number(kredit.zinsSatz) || 0) / 100 / 12;
    const P = Number(kredit.betrag) || 0;
    if (kredit.art === "endfaellig") return P * i;

    const modus = kredit.rateModus || "tilgungssatz";
    if (modus === "rate") {
      return Number(kredit.rateBetrag) || 0;
    }
    if (modus === "laufzeit") {
      const n = (Number(kredit.laufzeitJahre) || 0) * 12;
      if (n <= 0) return 0;
      if (i === 0) return P / n;
      return P * i / (1 - Math.pow(1 + i, -n));
    }
    const annual = ((Number(kredit.zinsSatz) || 0) + (Number(kredit.tilgungSatz) || 0)) / 100;
    return P * annual / 12;
  }

  function amortize(kredit) {
    const rows = [];
    const iMonth = (Number(kredit.zinsSatz) || 0) / 100 / 12;
    let rest = Number(kredit.betrag) || 0;
    const endfaellig = kredit.art === "endfaellig";
    const CAP = 960;
    const endMonths = endfaellig ? Math.max(1, (Number(kredit.laufzeitJahre) || 0) * 12) : CAP;
    const annuitaet = endfaellig ? 0 : monthlyRate(kredit);

    const sonderMap = {};
    (kredit.sondertilgungen || []).forEach(s => {
      const key = String(s.datum).slice(0, 7);
      sonderMap[key] = (sonderMap[key] || 0) + (Number(s.betrag) || 0);
    });

    for (let m = 0; m < endMonths && rest > 0.01; m++) {
      const dateIso = addMonths(kredit.start, m);
      const key = dateIso.slice(0, 7);
      const zins = rest * iMonth;
      let tilgung = 0;
      if (endfaellig) {
        tilgung = (m === endMonths - 1) ? rest : 0;
      } else {
        tilgung = Math.min(annuitaet - zins, rest);
        if (tilgung < 0) tilgung = 0;
      }
      const sonder = Math.min(sonderMap[key] || 0, Math.max(0, rest - tilgung));
      rest = rest - tilgung - sonder;
      rows.push({
        monat: key, dateIso,
        zins: round2(zins), tilgung: round2(tilgung), sonder: round2(sonder),
        rate: round2(zins + tilgung + sonder), restschuld: round2(Math.max(0, rest))
      });
      if (rest <= 0.01) break;
    }
    return rows;
  }

  function creditSummary(kredit) {
    const plan = amortize(kredit);
    const last = plan[plan.length - 1] || { dateIso: kredit.start, restschuld: kredit.betrag };
    const nowKey = new Date().toISOString().slice(0, 7);
    const current = plan.filter(r => r.monat <= nowKey).slice(-1)[0] || null;
    const rest = current ? current.restschuld : (Number(kredit.betrag) || 0);
    const gezahltZins = plan.filter(r => r.monat <= nowKey).reduce((s, r) => s + r.zins, 0);
    const sonderSum = (kredit.sondertilgungen || []).reduce((s, x) => s + (Number(x.betrag) || 0), 0);
    const months = plan.length;
    const paidOff = last.restschuld <= 0.01;
    const tilgtNie = kredit.art !== "endfaellig" && !paidOff && months >= 960;
    return {
      kredit, plan,
      restschuld: round2(rest),
      monatsrate: round2(monthlyRate(kredit)),
      abzahlungDatum: paidOff ? last.dateIso : null,
      laufzeitMonate: months,
      laufzeitJahre: Math.round(months / 12 * 10) / 10,
      tilgtNie,
      gezahlteZinsen: round2(gezahltZins),
      sonderSumme: round2(sonderSum),
      gesamtZinsen: round2(plan.reduce((s, r) => s + r.zins, 0))
    };
  }

  function projectInvestment(project) {
    const gewerkeAngebot = (project.gewerke || []).reduce((s, g) => s + (Number(g.angebot) || 0), 0);
    const gewerkeGezahlt = (project.gewerke || []).reduce((s, g) => s + (Number(g.gezahlt) || 0), 0);
    const weitere = (project.weitereInvestition || []).reduce((s, x) => s + (Number(x.betrag) || 0), 0);
    return {
      geplant: gewerkeAngebot + weitere,
      investiert: gewerkeGezahlt + weitere,
      gewerkeAngebot, gewerkeGezahlt, weitere
    };
  }

  function projectMonthlyDebt(project) {
    return (project.kredite || []).reduce((s, k) => s + monthlyRate(k), 0);
  }

  /* ===== AirBnB =====
     Modellierte Monatsrechnung aus den Stellschrauben in project.airbnb:
       nachtpreis            € pro Nacht
       belegungsrate         % der verfügbaren Nächte gebucht
       reinigungProBuchung   € Reinigungsgebühr an den Gast je Buchung (Einnahme)
       naechteProBuchung     ø Nächte je Buchung (für Buchungszahl)
       plattformProvision    % Abzug Airbnb/Booking auf Übernachtungsumsatz
       reinigungskostenIntern € interne Reinigungskosten je Buchung (Ausgabe)
       fixkostenMonat        € laufende Fixkosten/Monat (Strom, WLAN, Wäsche etc.)
       betreuungMonat        € Gästebetreuung/Verwaltung pro Monat
     Liefert eine konsistente Monats-Hochrechnung. */
  function airbnbModel(project, daysInMonth) {
    const a = project.airbnb || {};
    const tage = daysInMonth || 30.4;
    const nachtpreis = Number(a.nachtpreis) || 0;
    const beleg = Math.min(100, Math.max(0, Number(a.belegungsrate) || 0)) / 100;
    const reinG = Number(a.reinigungProBuchung) || 0;
    const naechtePb = Math.max(1, Number(a.naechteProBuchung) || 1);
    const prov = Math.min(100, Math.max(0, Number(a.plattformProvision) || 0)) / 100;
    const reinK = Number(a.reinigungskostenIntern) || 0;
    const fix = Number(a.fixkostenMonat) || 0;
    const betr = Number(a.betreuungMonat) || 0;

    const belegteNaechte = tage * beleg;
    const buchungen = belegteNaechte / naechtePb;
    const uebernachtungsumsatz = belegteNaechte * nachtpreis;
    const reinigungseinnahmen = buchungen * reinG;
    const bruttoUmsatz = uebernachtungsumsatz + reinigungseinnahmen;
    const provisionKosten = uebernachtungsumsatz * prov;
    const reinigungskosten = buchungen * reinK;
    const ausgaben = provisionKosten + reinigungskosten + fix + betr;
    const netto = bruttoUmsatz - ausgaben;

    return {
      belegteNaechte: round2(belegteNaechte),
      buchungen: round2(buchungen),
      uebernachtungsumsatz: round2(uebernachtungsumsatz),
      reinigungseinnahmen: round2(reinigungseinnahmen),
      bruttoUmsatz: round2(bruttoUmsatz),
      provisionKosten: round2(provisionKosten),
      reinigungskosten: round2(reinigungskosten),
      fixkosten: round2(fix),
      betreuung: round2(betr),
      ausgaben: round2(ausgaben + projectMonthlyDebt(project)),
      ausgabenOhneKredit: round2(ausgaben),
      kreditrate: round2(projectMonthlyDebt(project)),
      netto: round2(netto - projectMonthlyDebt(project)),
      auslastungProzent: round2(beleg * 100),
      nachtpreis
    };
  }

  /* Projekt-Cashflow je Monat inkl. Kreditrate.
     Bei AirBnB ohne erfasste cashflow-Historie: 12 Monate aus dem Modell. */
  function projectCashflow(project) {
    if (project.type === "airbnb" && (!project.cashflow || !project.cashflow.length)) {
      const start = project.investitionStart || new Date().toISOString().slice(0, 10);
      const rows = [];
      for (let m = 0; m < 12; m++) {
        const iso = addMonths(start.slice(0, 7) + "-01", m);
        const d = new Date(iso);
        const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const mod = airbnbModel(project, dim);
        rows.push({
          monat: iso.slice(0, 7),
          miete: mod.bruttoUmsatz,
          nebenkosten: 0,
          einnahmen: mod.bruttoUmsatz,
          betrieb: mod.ausgabenOhneKredit,
          kreditrate: mod.kreditrate,
          ausgaben: mod.ausgaben,
          netto: mod.netto
        });
      }
      return rows;
    }
    const debt = projectMonthlyDebt(project);
    return (project.cashflow || []).map(r => {
      const einnahmen = (Number(r.miete) || 0) + (Number(r.nebenkosten) || 0);
      const betrieb = (Number(r.betriebskosten) || 0) + (Number(r.sonstigeKosten) || 0);
      const ausgaben = betrieb + debt;
      return {
        monat: r.monat,
        miete: Number(r.miete) || 0,
        nebenkosten: Number(r.nebenkosten) || 0,
        einnahmen,
        betrieb, kreditrate: round2(debt),
        ausgaben: round2(ausgaben),
        netto: round2(einnahmen - ausgaben)
      };
    });
  }

  function yearlyCashflow(project) {
    const cf = projectCashflow(project);
    const byYear = {};
    cf.forEach(r => {
      const y = r.monat.slice(0, 4);
      byYear[y] = byYear[y] || { jahr: y, einnahmen: 0, ausgaben: 0, netto: 0 };
      byYear[y].einnahmen += r.einnahmen;
      byYear[y].ausgaben += r.ausgaben;
      byYear[y].netto += r.netto;
    });
    return Object.values(byYear).map(o => ({
      jahr: o.jahr, einnahmen: round2(o.einnahmen), ausgaben: round2(o.ausgaben), netto: round2(o.netto)
    }));
  }

  function breakEven(project) {
    const inv = projectInvestment(project);
    const cf = projectCashflow(project);
    const recent = cf.slice(-6);
    const avgNetto = recent.length ? recent.reduce((s, r) => s + r.netto, 0) / recent.length : 0;
    const cfPositive = avgNetto >= 0;
    const startIso = cf.length ? cf[cf.length - 1].monat + "-01" : new Date().toISOString().slice(0, 10);
    let kum = cf.reduce((s, r) => s + r.netto, 0);
    let result = { investBreakEven: null, monateBisBE: null, monatlicheRate: round2(avgNetto), cfPositive, ziel: inv.investiert, bisher: round2(kum) };

    if (avgNetto > 0 && kum < inv.investiert) {
      const fehlt = inv.investiert - kum;
      const monate = Math.ceil(fehlt / avgNetto);
      result.investBreakEven = addMonths(startIso, monate);
      result.monateBisBE = monate;
    } else if (kum >= inv.investiert) {
      result.investBreakEven = startIso;
      result.monateBisBE = 0;
    }
    return result;
  }

  function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

  window.FinanceEngine = {
    amortize, creditSummary, monthlyRate,
    projectInvestment, projectMonthlyDebt, projectCashflow, yearlyCashflow, breakEven,
    airbnbModel,
    monthsBetween, addMonths, fmtMonth
  };
})();
