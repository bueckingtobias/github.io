(function () {
  "use strict";
  window.FinanceOPModul = { render };

  function render(host) {
    const finance = (window.IMMO_DATA && window.IMMO_DATA.finance) || {};
    const rows = Array.isArray(finance.op) ? finance.op : [];

    const today = new Date();
    const norm = rows.map(r => {
      const due = parseDate(r.Faellig_am);
      const days = due ? Math.round((due - startOfDay(today)) / 86400000) : null;
      return { ...r, _due: due, _days: days, _amt: num(r.Betrag) };
    }).sort((a,b) => (a._due ? a._due.getTime() : 9e15) - (b._due ? b._due.getTime() : 9e15));

    host.innerHTML = `
      <div class="fo-root">
        ${norm.length ? `
          <div class="fo-list">
            ${norm.map(r => row(r)).join("")}
          </div>
        ` : `<div class="fo-empty">Keine OP-Daten gefunden (IMMO_DATA.finance.op).</div>`}
      </div>
    `;
  }

  function row(r) {
    const d = r._days;
    const badge = (d == null) ? "—" : (d < 0 ? `überfällig ${Math.abs(d)}T` : `${d}T`);
    const cls = (d != null && d < 0) ? "fo-row fo-bad" : "fo-row";
    return `
      <div class="${cls}">
        <div class="fo-main">
          <div class="fo-title">${escapeHtml(String(r.Titel || "OP"))}</div>
          <div class="fo-sub">${escapeHtml(String(r.Status || ""))}${r.Kommentar ? " · " + escapeHtml(String(r.Kommentar)) : ""}</div>
        </div>
        <div class="fo-right">
          <div class="fo-amt">${escapeHtml(eur(r._amt))}</div>
          <div class="fo-badge">${escapeHtml(badge)}</div>
        </div>
      </div>
    `;
  }

  function parseDate(s) {
    const t = String(s || "").trim();
    if (!t) return null;
    const d = new Date(t);
    return isNaN(d.getTime()) ? null : d;
  }
  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
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