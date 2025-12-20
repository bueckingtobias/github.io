(function () {
  "use strict";
  window.FinanceGesamtModul = { render };

  function render(host) {
    const data = window.IMMO_DATA || {};
    const finance = data.finance || {};
    const home = Array.isArray(data.home) ? data.home : [];

    const gesamt = (Array.isArray(finance.gesamt) ? finance.gesamt : [])[0] || {};
    const cashflowRows = Array.isArray(finance.cashflow) ? finance.cashflow : [];
    const mietenRows = Array.isArray(finance.mieten) ? finance.mieten : [];
    const opRows = Array.isArray(finance.op) ? finance.op : [];
    const reservesRows = Array.isArray(finance.reserven) ? finance.reserven : [];
    const budgetRows = Array.isArray(finance.budget) ? finance.budget : [];

    const lastCash = cashflowRows[cashflowRows.length - 1] || {};
    const lastM = mietenRows[mietenRows.length - 1] || {};

    const kontostand = num(gesamt.Kontostand);
    const liquide = num(gesamt.Liquide_Mittel);
    const verbindl = num(gesamt.Verbindlichkeiten_kurzfristig);
    const ruecklagen = num(gesamt.Ruecklagen);

    const cf = num(lastCash.Cashflow);
    const einnahmen = num(lastCash.Einnahmen || (lastM.Summe));
    const ausgaben = num(lastCash.Ausgaben || (einnahmen - cf));

    const opOffen = opRows.filter(r => String(r.Status || "").toLowerCase().includes("off"));
    const opSum = opOffen.reduce((a, r) => a + num(r.Betrag), 0);

    const reserveSum = reservesRows.reduce((a, r) => a + num(r.Betrag), 0);
    const reserveZiel = reservesRows.reduce((a, r) => a + num(r.Ziel), 0);

    const budgetIst = budgetRows.reduce((a, r) => a + num(r.Ist), 0);
    const budgetForecast = budgetRows.reduce((a, r) => a + num(r.Forecast), 0);
    const budgetBudget = budgetRows.reduce((a, r) => a + num(r.Budget), 0);

    host.innerHTML = `
      <div class="fg-root">
        <div class="fg-grid">
          ${tile("Kontostand", eur(kontostand), "Aktueller Bank-/Kontostand")}
          ${tile("Liquide Mittel", eur(liquide), "Sofort verfügbar")}
          ${tile("Kurzfr. Verbindl.", eur(verbindl), "Innerhalb 30–60 Tage")}
          ${tile("Rücklagen", eur(ruecklagen), "Ziel: Reserve stabil")}
          ${tile("Monats-Cashflow", eur(cf), "Letzter Monat")}
          ${tile("Einnahmen", eur(einnahmen), "Miete + Pacht")}
          ${tile("Ausgaben", eur(ausgaben), "Einnahmen − Cashflow")}
          ${tile("OP offen", eur(opSum), `${opOffen.length} Position(en)`)}
          ${tile("Reserven", eur(reserveSum), `Ziel: ${eur(reserveZiel)}`)}
          ${tile("Budget Ist", eur(budgetIst), `Plan: ${eur(budgetBudget)}`)}
          ${tile("Budget Forecast", eur(budgetForecast), `Delta: ${eur(budgetForecast - budgetBudget)}`)}
          ${tile("Daten", String((window.IMMO_DATA_META && window.IMMO_DATA_META.version) || (window.IMMO_MASTER_DATA && window.IMMO_MASTER_DATA.version) || "—"), "Master-Version")}
        </div>
        <div class="fg-note">${escapeHtml(String(gesamt.Notiz || "Gesamtübersicht aus Master Data. Module nutzen window.IMMO_DATA.finance.*"))}</div>
      </div>
    `;
  }

  function tile(k, v, h) {
    return `
      <div class="fg-tile">
        <div class="fg-k">${escapeHtml(k)}</div>
        <div class="fg-v">${escapeHtml(v)}</div>
        <div class="fg-h">${escapeHtml(h)}</div>
      </div>
    `;
  }

  function num(v) {
    if (typeof v === "number") return v;
    if (!v) return 0;
    return Number(String(v).replace(/\./g, "").replace(",", ".")) || 0;
  }
  function eur(n) {
    const x = num(n);
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(x);
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
  }
})();