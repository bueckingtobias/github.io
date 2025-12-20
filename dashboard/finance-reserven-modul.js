(function () {
  "use strict";
  window.FinanceReservenModul = { render };

  function render(host) {
    const finance = (window.IMMO_DATA && window.IMMO_DATA.finance) || {};
    const rows = Array.isArray(finance.reserven) ? finance.reserven : [];

    const sum = rows.reduce((a,r)=>a+num(r.Betrag),0);
    const ziel = rows.reduce((a,r)=>a+num(r.Ziel),0);
    const pct = ziel > 0 ? (sum / ziel * 100) : 0;

    host.innerHTML = `
      <div class="fr-root">
        <div class="fr-head">
          <div class="fr-title">Reserven</div>
          <div class="fr-sub">${escapeHtml(eur(sum))} / ${escapeHtml(eur(ziel))} · ${escapeHtml(pct.toFixed(1).replace(".",","))}%</div>
        </div>

        <div class="fr-track">
          <div class="fr-fill" style="width:${Math.max(0, Math.min(100, pct))}%"><span>${escapeHtml(pct.toFixed(0))}%</span></div>
        </div>

        <div class="fr-list">
          ${rows.length ? rows.map(r => `
            <div class="fr-row">
              <div class="fr-left">
                <div class="fr-cat">${escapeHtml(String(r.Kategorie || "—"))}</div>
                <div class="fr-com">${escapeHtml(String(r.Kommentar || ""))}</div>
              </div>
              <div class="fr-right">
                <div class="fr-amt">${escapeHtml(eur(r.Betrag))}</div>
                <div class="fr-ziel">Ziel ${escapeHtml(eur(r.Ziel))}</div>
              </div>
            </div>
          `).join("") : `<div class="fr-empty">Keine Reserven-Daten gefunden (IMMO_DATA.finance.reserven).</div>`}
        </div>
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