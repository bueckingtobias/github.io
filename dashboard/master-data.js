(function () {
  const VERSION = "2025-12-14-A2";

  function ym(y, m) {
    return `${y}-${String(m).padStart(2, "0")}`;
  }

  const now = new Date();
  const Y = now.getFullYear();
  const M = now.getMonth() + 1;

  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Y, M - 1 - i, 1);
    months.push(ym(d.getFullYear(), d.getMonth() + 1));
  }

  const homeKPIs = months.map((month, idx) => {
    const baseRent = 14200 + idx * 80;
    const baseLease = 1200 + (idx % 3) * 50;
    const costs = 5200 + (idx % 4) * 180;
    const cashflow = (baseRent + baseLease) - costs;

    const occupancy = Math.max(88, Math.min(100, 92 + Math.sin(idx / 2) * 4));
    const portfolioValue = 2450000 + idx * 15000;
    const invested = 1750000;

    return {
      Monat: month,
      Cashflow: Math.round(cashflow),
      Mieteinnahmen: Math.round(baseRent),
      Pachteinnahmen: Math.round(baseLease),
      Auslastung_%: Math.round(occupancy * 10) / 10,
      Portfolio_Wert: Math.round(portfolioValue),
      Investiertes_Kapital: Math.round(invested),
    };
  });

  window.IMMO_MASTER_DATA = {
    version: VERSION,
    updatedAt: new Date().toISOString(),
    home: homeKPIs,
    projects: { gesamt: {}, gewerke: [] },
    finance: {}
  };
})();
