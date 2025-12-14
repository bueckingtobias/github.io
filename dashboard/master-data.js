(function () {
  "use strict";

  const VERSION = "2025-12-14-MASTER-FIX-1";

  function ym(y, m) {
    return `${y}-${String(m).padStart(2, "0")}`;
  }

  const now = new Date();
  const Y = now.getFullYear();
  const M = now.getMonth() + 1;

  // 12 Monate bis inkl. aktueller Monat
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Y, (M - 1) - i, 1);
    months.push(ym(d.getFullYear(), d.getMonth() + 1));
  }

  // KPIs (Dummy, aber realistisch)
  const home = months.map((month, idx) => {
    const miete = 14200 + idx * 80;
    const pacht = 1200 + (idx % 3) * 50;
    const kosten = 5200 + (idx % 4) * 180;
    const cashflow = (miete + pacht) - kosten;

    const auslastung = Math.max(88, Math.min(100, 92 + Math.sin(idx / 2) * 4));
    const portfolioWert = 2450000 + idx * 15000;
    const invest = 1750000;

    return {
      Monat: month, // YYYY-MM
      Cashflow: Math.round(cashflow),
      Mieteinnahmen: Math.round(miete),
      Pachteinnahmen: Math.round(pacht),
      Auslastung_%: Math.round(auslastung * 10) / 10,
      Portfolio_Wert: Math.round(portfolioWert),
      Investiertes_Kapital: Math.round(invest),
    };
  });

  // Minimal-Projekt/Finance Strukturen (damit nichts crasht)
  const projects = {
    gesamt: { Projekt: "Baumstraße 35", Adresse: "Baumstraße 35", Letztes_Update: new Date().toISOString().slice(0, 10) },
    gewerke: []
  };

  const finance = {
    gesamt: [],
    cashflow: [],
    mieten: [],
    op: [],
    reserven: [],
    budget: []
  };

  // ✅ SET GLOBAL
  window.IMMO_MASTER_DATA = {
    version: VERSION,
    updatedAt: new Date().toISOString(),
    home,
    projects,
    finance
  };
})();
