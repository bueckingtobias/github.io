(function () {
  "use strict";
  window.FinanceMietenModul = { render };

  function render(host) {
    const data = window.IMMO_DATA || {};
    const finance = data.finance || {};
    const rows = Array.isArray(finance.mieten) ? finance.mieten : [];

    const last = rows[rows.length - 1] || {};
    const miete = num(last.Mieteinnahmen);
    const pacht = num(last.Pachteinnahmen);
    const sum = num(last.Summe || (miete + pacht));

    const occ = num(last.Auslastung_pct || last.Auslastung || last.Auslastung_%);

    host.innerHTML = `
      <div class="fm-root">
        <div class="fm-grid">
          ${tile("Mieteinnahmen", eur(miete), "Letzter Monat")}
          ${tile("Pachteinnahmen", eur(pacht), "Letzter Monat")}
          ${tile("Summe", eur(sum), "Miete + Pacht")}
          ${tile("Auslastung", pct(occ), "Portfolio-Status")}
        </div>

        <div class="fm-list">
          ${renderMiniTable(rows.slice(Math.max(0, rows.length - 9)))}
        </div>

        <div class="fm-hint">Quelle: IMMO_DATA.finance.mieten (Master Data).</div>
      </div>
    `;
  }

  function tile(k, v, h) {
    return `
      <div class="fm-tile">
        <div class="fm-k">${escapeHtml(k)}</div>
        <div class="fm-v">${escapeHtml(v)}</div>
        <div class="fm-h">${escapeHtml(h)}</div>
      </div>
    `;
  }

  function renderMiniTable(rows) {
    if (!rows.length) return `<div class="fm-empty">Keine Mieten-Daten gefunden (IMMO_DATA.finance.mieten).</div>`;
    return `
      <div class="fm-table">
        <div class="fm-tr fm-th">
          <div>Monat</div><div>Miete</div><div>Pacht</div><div>Summe</div><div>Auslastung</div>
        </div>
        ${rows.map(r => `
          <div class="fm-tr">
            <div>${escapeHtml(String(r.Monat || "—"))}</div>
            <div>${escapeHtml(eur(r.Mieteinnahmen))}</div>
            <div>${escapeHtml(eur(r.Pachteinnahmen))}</div>
            <div>${escapeHtml(eur(r.Summe || (num(r.Mieteinnahmen)+num(r.Pachteinnahmen))))}</div>
            <div>${escapeHtml(pct(r.Auslastung_pct || r.Auslastung || r.Auslastung_%))}</div>
          </div>
        `).join("")}
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
  function pct(n) {
    const x = num(n);
    return `${x.toFixed(1).replace(".", ",")} %`;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
  }
})();