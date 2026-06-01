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

  /* Effektive Monatsrate (Annuität) je nach Modus:
     - rateModus "rate":         feste Rate in € (kredit.rateBetrag) → Laufzeit ergibt sich
     - rateModus "laufzeit":     Rate aus Wunsch-Laufzeit (kredit.laufzeitJahre) berechnet
     - rateModus "tilgungssatz"/Default: Rate aus Zins + anf. Tilgung %
     Endfällig: nur Zins auf Nominal (laufende Rate). */
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
      return P * i / (1 - Math.pow(1 + i, -n)); // Annuitätenformel
    }
    // tilgungssatz
    const annual = ((Number(kredit.zinsSatz) || 0) + (Number(kredit.tilgungSatz) || 0)) / 100;
    return P * annual / 12;
  }

  /* Tilgungsplan. Läuft bis Restschuld = 0 (Laufzeit wird berechnet),
     außer endfällig (Tilgung am Laufzeitende). Sicherheits-Cap 80 Jahre.
     Liefert je Monat: { monat, dateIso, zins, tilgung, sonder, rate, restschuld } */
  function amortize(kredit) {
    const rows = [];
    const iMonth = (Number(kredit.zinsSatz) || 0) / 100 / 12;
    let rest = Number(kredit.betrag) || 0;
    const endfaellig = kredit.art === "endfaellig";
    const CAP = 960; // 80 Jahre Sicherheitsgrenze
    const endMonths = endfaellig ? Math.max(1, (Number(kredit.laufzeitJahre) || 0) * 12) : CAP;
    const annuitaet = endfaellig ? 0 : monthlyRate(kredit); // effektive Rate je Modus

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
        if (tilgung < 0) tilgung = 0; // Rate deckt nicht mal den Zins → keine Tilgung
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
    // tilgt nie: Annuität, nicht endfällig, Plan am Cap und noch Restschuld
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

  /* Projekt-Investition gesamt: gezahlte Gewerke + weitere Investition.
     (Angebot = geplant; gezahlt = bereits investiert) */
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

  /* Monatliche Kreditbelastung aller Projekt-Kredite (zum aktuellen Monat). */
  function projectMonthlyDebt(project) {
    return (project.kredite || []).reduce((s, k) => s + monthlyRate(k), 0);
  }

  /* Projekt-Cashflow je Monat inkl. Kreditrate.
     row: { monat, einnahmen, ausgaben(betrieb+kredit), netto, miete, nebenkosten } */
  function projectCashflow(project) {
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

  /* Jahres-Aggregation aus Monats-Cashflow. */
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

  /* Break-Even-Forecast.
     1) Invest-Break-Even: ab wann kumulierte Netto-Einnahmen die Gesamt-Investition decken.
     2) Cashflow-Break-Even: ab wann der monatliche Netto-Cashflow dauerhaft >= 0 ist.
     Nutzt den Durchschnitt der letzten 6 Monate als Lauf-Rate für die Projektion. */
  function breakEven(project) {
    const inv = projectInvestment(project);
    const cf = projectCashflow(project);
    const recent = cf.slice(-6);
    const avgNetto = recent.length ? recent.reduce((s, r) => s + r.netto, 0) / recent.length : 0;

    // Cashflow-Break-Even: ist der Schnitt schon positiv?
    const cfPositive = avgNetto >= 0;

    // Invest-Break-Even: kumulierte Netto bis Investition gedeckt
    const startIso = cf.length ? cf[cf.length - 1].monat + "-01" : new Date().toISOString().slice(0, 10);
    let kum = cf.reduce((s, r) => s + r.netto, 0); // bisher kumuliert
    let result = { investBreakEven: null, monateBisBE: null, monatlicheRate: round2(avgNetto), cfPositive, ziel: inv.investiert, bisher: round2(kum) };

    if (avgNetto > 0 && kum < inv.investiert) {
      const fehlt = inv.investiert - kum;
      const monate = Math.ceil(fehlt / avgNetto);
      result.investBreakEven = addMonths(startIso, monate);
      result.monateBisBE = monate;
    } else if (kum >= inv.investiert) {
      result.investBreakEven = startIso; // bereits erreicht
      result.monateBisBE = 0;
    }
    return result;
  }

  function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

  window.FinanceEngine = {
    amortize, creditSummary, monthlyRate,
    projectInvestment, projectMonthlyDebt, projectCashflow, yearlyCashflow, breakEven,
    monthsBetween, addMonths, fmtMonth
  };
})();
