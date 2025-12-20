/* dashboard/gewerk-modul.js
   Renders ONE contractor/trade card.
   ✅ Reads safely from master-data.js via DataLoader → window.IMMO_DATA
   ✅ Fallback: reads directly from window.IMMO_MASTER_DATA
   ✅ No visual changes intended (keeps existing HTML if present, otherwise injects compatible markup)
*/
(function () {
  "use strict";

  window.GewerkModul = { render };

  function render(host, opts) {
    opts = opts || {};
    if (!host) return;

    // 1) Get rows (prefer IMMO_DATA because your views use DataLoader)
    const rows =
      (Array.isArray(window.IMMO_DATA?.projects?.gewerke) && window.IMMO_DATA.projects.gewerke) ||
      (Array.isArray(window.IMMO_MASTER_DATA?.projects?.gewerke) && window.IMMO_MASTER_DATA.projects.gewerke) ||
      [];

    const idx = Number.isFinite(+opts.index) ? +opts.index : 0;

    // 2) Choose row:
    // - If index exists → use it
    // - Else → try sort by Sortierung
    let row = rows[idx] || null;
    if (!row && rows.length) {
      const sorted = rows
        .slice()
        .sort((a, b) => (num(any(a, ["Sortierung"])) || 9999) - (num(any(b, ["Sortierung"])) || 9999));
      row = sorted[idx] || sorted[0] || null;
    }

    // If no data → show soft message (no style change, uses minimal markup)
    if (!row) {
      ensureMarkup(host);
      setText(host, '[data-gm="title"]', "Keine Daten");
      setText(host, '[data-gm="sub"]', "Prüfe IMMO_DATA.projects.gewerke / IMMO_MASTER_DATA.projects.gewerke");
      setText(host, '[data-gm="tag"]', "—");
      setBar(host, '[data-gm="payFill"]', 0, "—");
      setBar(host, '[data-gm="progFill"]', 0, "—");
      setText(host, '[data-gm="payMeta"]', "—");
      setText(host, '[data-gm="progMeta"]', "—");
      host.classList.remove("warn");
      host.classList.add("ok");
      return;
    }

    // 3) Normalize + alias-safe reading
    const handwerker = str(any(row, ["Handwerker", "Handwerkername", "Firma"])) || "Unbekannter Handwerker";
    const gewerk = str(any(row, ["Gewerk", "Leistung", "Kategorie"])) || "";
    const projekt = str(any(row, ["Projekt"])) || str(window.IMMO_DATA?.projects?.gesamt?.Projekt) || str(window.IMMO_MASTER_DATA?.projects?.gesamt?.Projekt) || "";
    const objekt = str(any(row, ["Objekt"])) || str(window.IMMO_DATA?.projects?.gesamt?.Adresse) || str(window.IMMO_MASTER_DATA?.projects?.gesamt?.Adresse) || "";

    const angebot = num(any(row, ["Angebot", "Angebotssumme", "Angebot (€)", "Budget", "Kostenrahmen"]));
    const gezahlt = num(any(row, ["Gezahlt", "Zahlungen", "Zahlungen_bisher", "Zahlungen (€)", "Zahlungen bisher", "Gezahl t", "Gezahl_t"]));
    const fortschritt = num(any(row, ["Baufortschritt", "Baufortschritt_prozent", "Baufortschritt %", "Fortschritt_%", "Fortschritt %", "Fortschritt_pct"]));

    const payPct = angebot > 0 ? (gezahlt / angebot) * 100 : 0;
    const progPct = clamp(fortschritt, 0, 100);

    // Warn condition: Kostenquote deutlich über Fortschritt
    // (du wolltest rote Markierung bei Kosten > Fortschritt – das bleibt)
    const isWarn = payPct > progPct + 0.5;

    // 4) Ensure markup exists (keine Optikänderung – nutzt bestehende Struktur, wenn vorhanden)
    ensureMarkup(host);

    // 5) Fill texts
    setText(host, '[data-gm="title"]', handwerker);

    const subBits = [];
    if (gewerk) subBits.push(gewerk);
    if (projekt) subBits.push(projekt);
    if (objekt) subBits.push("– " + objekt);
    setText(host, '[data-gm="sub"]', subBits.join(" · ").replace("· –", "–").trim());

    setText(host, '[data-gm="tag"]', isWarn ? "Kosten > Fortschritt" : "OK");

    // 6) Bars (min width so label stays visible)
    const payClamp = clamp(payPct, 0, 100);
    const payWidth = Math.max(payClamp, 12);
    const progWidth = Math.max(progPct, 12);

    setBar(
      host,
      '[data-gm="payFill"]',
      payWidth,
      `${fmtPercent(payPct)} · ${fmtEuro(gezahlt)}`
    );
    setBar(
      host,
      '[data-gm="progFill"]',
      progWidth,
      `${fmtPercent(progPct)}`
    );

    setText(host, '[data-gm="payMeta"]', `${fmtEuro(gezahlt)} / ${fmtEuro(angebot)}`);
    setText(host, '[data-gm="progMeta"]', `${fmtPercent(progPct)} Baufortschritt`);

    // 7) Classes for red marking (CSS should already style .warn)
    host.classList.toggle("warn", !!isWarn);
    host.classList.toggle("ok", !isWarn);

    // 8) Trigger animation if your CSS uses transition from 0 → target
    requestAnimationFrame(() => {
      const payEl = host.querySelector('[data-gm="payFill"]');
      const progEl = host.querySelector('[data-gm="progFill"]');
      if (payEl) payEl.style.width = `${payWidth}%`;
      if (progEl) progEl.style.width = `${progWidth}%`;
    });
  }

  /* =========================
     Markup helpers (safe)
     ========================= */

  function ensureMarkup(host) {
    // If the injected gewerk-modul.html already contains placeholders → do nothing
    if (host.querySelector('[data-gm="title"]')) return;

    // Otherwise, inject a minimal structure with the same data hooks.
    // (Optik bleibt über deine bestehende gewerk-modul.css steuerbar.)
    host.innerHTML = `
      <div class="gewerk-modul" style="min-width:0;">
        <div class="gm-head" style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
          <div style="min-width:0;">
            <div class="gm-title" data-gm="title" style="font-weight:950;font-size:13px;">—</div>
            <div class="gm-sub" data-gm="sub" style="margin-top:4px;font-size:11px;opacity:.75;line-height:1.25;">—</div>
          </div>
          <div class="gm-tag" data-gm="tag" style="white-space:nowrap;font-size:10px;padding:6px 10px;border-radius:999px;border:1px solid rgba(148,163,184,.18);background:rgba(15,23,42,.35);opacity:.9;">—</div>
        </div>

        <div class="gm-bars" style="display:flex;flex-direction:column;gap:10px;margin-top:10px;min-width:0;">
          <div class="gm-block" style="min-width:0;">
            <div class="gm-label" style="display:flex;justify-content:space-between;gap:10px;font-size:11px;opacity:.78;margin-bottom:6px;">
              <span>Zahlungen vs. Angebot</span>
              <span data-gm="payMeta">—</span>
            </div>
            <div class="gm-track" style="position:relative;height:16px;border-radius:999px;background:rgba(15,23,42,.65);overflow:hidden;min-width:0;">
              <div class="gm-fill" data-gm="payFill" style="position:absolute;left:0;top:0;bottom:0;width:0%;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;white-space:nowrap;padding:0 8px;transition:width .9s cubic-bezier(0.16,1,0.3,1);">
                <span data-gm="payLabel">—</span>
              </div>
            </div>
          </div>

          <div class="gm-block" style="min-width:0;">
            <div class="gm-label" style="display:flex;justify-content:space-between;gap:10px;font-size:11px;opacity:.78;margin-bottom:6px;">
              <span>Baufortschritt</span>
              <span data-gm="progMeta">—</span>
            </div>
            <div class="gm-track" style="position:relative;height:16px;border-radius:999px;background:rgba(15,23,42,.65);overflow:hidden;min-width:0;">
              <div class="gm-fill" data-gm="progFill" style="position:absolute;left:0;top:0;bottom:0;width:0%;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;white-space:nowrap;padding:0 8px;transition:width .9s cubic-bezier(0.16,1,0.3,1);">
                <span data-gm="progLabel">—</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // If your existing CSS expects specific classes for colors, we keep them generic
    // and let CSS override. If CSS doesn't, we set safe defaults:
    const payFill = host.querySelector('[data-gm="payFill"]');
    const progFill = host.querySelector('[data-gm="progFill"]');
    if (payFill) payFill.style.background = "linear-gradient(90deg,#2563eb,#3b82f6)";
    if (progFill) progFill.style.background = "linear-gradient(90deg,#22c55e,#4ade80)";
  }

  function setText(root, sel, txt) {
    const el = root.querySelector(sel);
    if (el) el.textContent = txt;
  }

  function setBar(root, sel, widthPct, labelText) {
    const el = root.querySelector(sel);
    if (!el) return;
    el.dataset.width = `${clamp(widthPct, 0, 100)}%`;
    // label (optional)
    const labelEl =
      el.querySelector('[data-gm="payLabel"]') ||
      el.querySelector('[data-gm="progLabel"]') ||
      el.querySelector("span");
    if (labelEl) labelEl.textContent = labelText || "—";
    // start at 0 for animation, real width set in RAF
    el.style.width = "0%";
  }

  /* =========================
     Value helpers
     ========================= */

  function any(obj, keys) {
    if (!obj) return undefined;
    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
    }
    return undefined;
  }

  function str(v) {
    if (v == null) return "";
    return String(v);
  }

  function num(v) {
    if (typeof v === "number") return isFinite(v) ? v : 0;
    if (v == null) return 0;
    const s = String(v).trim();
    if (!s) return 0;
    return Number(s.replace(/\./g, "").replace(",", ".")) || 0;
  }

  function clamp(v, a, b) {
    const x = num(v);
    return Math.max(a, Math.min(b, x));
  }

  function fmtEuro(v) {
    const x = num(v);
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(x);
  }

  function fmtPercent(v) {
    const x = num(v);
    return `${x.toFixed(1).replace(".", ",")} %`;
  }
})();