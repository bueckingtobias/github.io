(function () {
  "use strict";
  window.FinanceCashflowModul = { render };

  function render(host) {
    const finance = (window.IMMO_DATA && window.IMMO_DATA.finance) || {};
    const rows = Array.isArray(finance.cashflow) ? finance.cashflow : [];

    // 6M Rückblick + 3M Forecast (aus Master vorhanden oder aus Trend ableiten)
    const series = lastN(rows, 9).map(r => ({
      Monat: r.Monat,
      Cashflow: num(r.Cashflow),
      Einnahmen: num(r.Einnahmen),
      Ausgaben: num(r.Ausgaben)
    }));

    host.innerHTML = `
      <div class="fc-root">
        <div class="fc-head">
          <div class="fc-title">Cashflow</div>
          <div class="fc-sub">Letzte Monate + Forecast (aus Master)</div>
        </div>

        <div class="fc-chart" aria-label="Cashflow Verlauf">
          ${renderBars(series)}
        </div>

        <div class="fc-legend">
          <span class="fc-pill">Cashflow</span>
          <span class="fc-pill">Einnahmen</span>
          <span class="fc-pill">Ausgaben</span>
        </div>
      </div>
    `;
  }

  function renderBars(series) {
    if (!series.length) return `<div class="fc-empty">Keine Cashflow-Daten gefunden (IMMO_DATA.finance.cashflow).</div>`;

    const maxAbs = Math.max(1, ...series.map(s => Math.abs(s.Cashflow)));
    return series.map((s, i) => {
      const pct = Math.round(Math.min(100, (Math.abs(s.Cashflow) / maxAbs) * 100));
      const isNeg = s.Cashflow < 0;
      const cls = i >= 6 ? "fc-bar fc-forecast" : "fc-bar"; // letzten 3 = forecast
      const dir = trendDir(series);
      const trendCls = (i >= 6) ? (dir >= 0 ? "fc-up" : "fc-down") : "";
      return `
        <div class="${cls} ${trendCls}">
          <div class="fc-m">${escapeHtml(shortMonth(s.Monat))}</div>
          <div class="fc-track">
            <div class="fc-fill ${isNeg ? "fc-neg" : "fc-pos"}" style="width:${pct}%">
              <span>${escapeHtml(eur(s.Cashflow))}</span>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  function trendDir(series) {
    // simple slope on last 6 months cashflow
    const last6 = series.slice(0, 6);
    if (last6.length < 2) return 0;
    const a = last6[0].Cashflow;
    const b = last6[last6.length - 1].Cashflow;
    return (b - a);
  }

  function lastN(arr, n) {
    if (!Array.isArray(arr)) return [];
    return arr.slice(Math.max(0, arr.length - n));
  }

  function shortMonth(ym) {
    const [y, m] = String(ym || "").split("-");
    if (!y || !m) return "—";
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString("de-DE", { month: "short" });
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