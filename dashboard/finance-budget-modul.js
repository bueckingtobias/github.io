(function () {
  "use strict";
  window.FinanceBudgetModul = { render };

  function render(host) {
    const finance = (window.IMMO_DATA && window.IMMO_DATA.finance) || {};
    const rows = Array.isArray(finance.budget) ? finance.budget : [];

    const sumB = rows.reduce((a,r)=>a+num(r.Budget),0);
    const sumI = rows.reduce((a,r)=>a+num(r.Ist),0);
    const sumF = rows.reduce((a,r)=>a+num(r.Forecast),0);

    host.innerHTML = `
      <div class="fb-root">
        <div class="fb-top">
          <div class="fb-kpi">
            <div class="fb-k">Plan</div>
            <div class="fb-v">${escapeHtml(eur(sumB))}</div>
          </div>
          <div class="fb-kpi">
            <div class="fb-k">Ist</div>
            <div class="fb-v">${escapeHtml(eur(sumI))}</div>
          </div>
          <div class="fb-kpi">
            <div class="fb-k">Forecast</div>
            <div class="fb-v">${escapeHtml(eur(sumF))}</div>
          </div>
          <div class="fb-kpi">
            <div class="fb-k">Delta Forecast</div>
            <div class="fb-v">${escapeHtml(eur(sumF - sumB))}</div>
          </div>
        </div>

        ${rows.length ? `
          <div class="fb-table">
            <div class="fb-tr fb-th">
              <div>Bereich</div><div>Budget</div><div>Ist</div><div>Forecast</div><div>Delta</div>
            </div>
            ${rows.map(r => {
              const b = num(r.Budget), i = num(r.Ist), f = num(r.Forecast);
              const d = f - b;
              const pct = b > 0 ? Math.max(0, Math.min(100, (i / b * 100))) : 0;
              return `
                <div class="fb-tr">
                  <div class="fb-name">
                    <div class="fb-title">${escapeHtml(String(r.Bereich || "—"))}</div>
                    <div class="fb-sub">${escapeHtml(String(r.Kommentar || ""))}</div>
                  </div>
                  <div>${escapeHtml(eur(b))}</div>
                  <div>
                    <div class="fb-miniTrack">
                      <div class="fb-miniFill" style="width:${pct}%"></div>
                    </div>
                    <div class="fb-miniVal">${escapeHtml(eur(i))}</div>
                  </div>
                  <div>${escapeHtml(eur(f))}</div>
                  <div class="${d>0 ? "fb-delta fb-bad" : "fb-delta"}">${escapeHtml(eur(d))}</div>
                </div>
              `;
            }).join("")}
          </div>
        ` : `<div class="fb-empty">Keine Budget-Daten gefunden (IMMO_DATA.finance.budget).</div>`}
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