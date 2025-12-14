(function () {
  "use strict";

  window.HomeKpisModul = { render };

  function render(mountEl) {
    // Robust root detection:
    // - if mountEl contains a module wrapper, use that
    // - else use mountEl itself
    // - else fallback to document queries
    const root =
      (mountEl && mountEl.querySelector && mountEl.querySelector(".home-kpis-modul")) ||
      mountEl ||
      document.querySelector(".home-kpis-modul") ||
      document.getElementById("homeKpisModul") ||
      document.getElementById("kpisHost");

    if (!root) return;

    // Ensure required UI nodes exist even if fragment HTML differs
    const ui = ensureUI(root);

    // ✅ Data source: master-data via DataLoader -> window.IMMO_DATA.home
    const rows = Array.isArray(window.IMMO_DATA?.home) ? window.IMMO_DATA.home : [];

    ui.badge.textContent = `HOME KPIs: ${rows.length}`;

    if (!rows.length) {
      ui.empty.style.display = "block";
      ui.grid.innerHTML = "";
      ui.status.textContent =
        "Keine KPI-Daten gefunden. Erwartet: window.IMMO_DATA.home (DataLoader → master-data.js).";
      return;
    }

    // Parse + sort
    const parsed = rows
      .map((r) => ({
        Monat: parseMonthKey(r.Monat),
        Cashflow: num(r.Cashflow),
        Mieteinnahmen: num(r.Mieteinnahmen),
        Pachteinnahmen: num(r.Pachteinnahmen),
        Auslastung: clampPercent(r["Auslastung_%"]),
        PortfolioWert: num(r["Portfolio_Wert"]),
        InvestiertesKapital: num(r["Investiertes_Kapital"]),
      }))
      .filter((r) => r.Monat)
      .sort((a, b) => a.Monat.localeCompare(b.Monat));

    if (!parsed.length) {
      ui.empty.style.display = "block";
      ui.grid.innerHTML = "";
      ui.status.textContent =
        "KPI-Daten vorhanden, aber Monat ist ungültig. Erwartet YYYY-MM in Feld 'Monat'.";
      return;
    }

    ui.empty.style.display = "none";

    // Determine current month index
    const nowKey = monthKeyFromDate(new Date());
    let curIdx = parsed.findIndex((x) => x.Monat === nowKey);
    if (curIdx < 0) curIdx = parsed.length - 1;

    const cur = parsed[curIdx];
    const start = Math.max(0, curIdx - 5);
    const hist = parsed.slice(start, curIdx + 1);

    // Helpful status (debug without devtools)
    ui.status.textContent =
      `Quelle: master-data · Monate: ${parsed.length} · Aktuell: ${cur.Monat} · ` +
      `Cashflow: ${formatEuro(cur.Cashflow)} · Miete: ${formatEuro(cur.Mieteinnahmen)} · Pacht: ${formatEuro(cur.Pachteinnahmen)}`;

    // Build series (6M history + 3M forecast)
    const seriesCash = buildSeries(hist, cur.Monat, "Cashflow");
    const seriesRent = buildSeries(hist, cur.Monat, "Mieteinnahmen");
    const seriesLease = buildSeries(hist, cur.Monat, "Pachteinnahmen");
    const seriesOcc = buildSeries(hist, cur.Monat, "Auslastung");

    // Year cash + ROI
    const year = new Date().getFullYear();
    const yearCash = sumYear(parsed, year, "Cashflow");
    const roi = cur.InvestiertesKapital > 0 ? (yearCash / cur.InvestiertesKapital) * 100 : 0;

    // Render 2x3 KPI tiles (as requested previously)
    const cards = [
      card("Monats-Cashflow", `${cur.Monat} · 6M Rückblick + 3M Forecast`, formatEuro(cur.Cashflow), trendText(seriesCash), seriesCash),
      card("Jahres-Cashflow", `YTD ${year}`, formatEuro(yearCash), `Ø/Monat: ${formatEuro(yearCash / Math.max(1, new Date().getMonth() + 1))}`, seriesCash),

      card("Mieteinnahmen / Monat", cur.Monat, formatEuro(cur.Mieteinnahmen), `Ø 6M: ${formatEuro(avg(hist, "Mieteinnahmen"))}`, seriesRent),
      card("Pachteinnahmen / Monat", cur.Monat, formatEuro(cur.Pachteinnahmen), `Ø 6M: ${formatEuro(avg(hist, "Pachteinnahmen"))}`, seriesLease),

      card("Auslastung", cur.Monat, formatPercent(cur.Auslastung), `Ø 6M: ${formatPercent(avg(hist, "Auslastung"))}`, seriesOcc),
      card("Portfolio ROI", `${year} (approx)`, formatPercent(roi), "Jahres-CF / invest. Kapital", seriesCash),
    ];

    ui.grid.innerHTML = cards.map(renderTile).join("");
  }

  /* -------------------------- UI glue -------------------------- */

  function ensureUI(root) {
    // Prefer searching inside root; if root is host wrapper, we still create inside it
    let badge = root.querySelector("#hkpiBadge");
    let status = root.querySelector("#hkpiStatus");
    let empty = root.querySelector("#hkpiEmpty");
    let grid = root.querySelector("#hkpiGrid");

    // If none exist, create a minimal scaffold without changing your fragment file
    if (!badge || !status || !empty || !grid) {
      // Find a reasonable container within root to append into
      const container =
        root.querySelector(".card-body") ||
        root.querySelector(".home-kpis-body") ||
        root;

      // Create header row (badge + status) if missing
      if (!badge) {
        badge = document.createElement("div");
        badge.id = "hkpiBadge";
        badge.style.cssText =
          "display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;" +
          "border:1px solid rgba(148,163,184,.18);background:rgba(15,23,42,.35);font-size:11px;color:rgba(226,232,240,.85);";
        container.prepend(badge);
      }

      if (!status) {
        status = document.createElement("div");
        status.id = "hkpiStatus";
        status.style.cssText =
          "margin-top:10px;font-size:12px;color:rgba(226,232,240,.72);line-height:1.35;";
        badge.insertAdjacentElement("afterend", status);
      }

      if (!empty) {
        empty = document.createElement("div");
        empty.id = "hkpiEmpty";
        empty.style.cssText =
          "margin-top:10px;padding:10px;border-radius:12px;border:1px solid rgba(148,163,184,.14);" +
          "background:rgba(2,6,23,.25);font-size:12px;color:rgba(226,232,240,.72);display:none;";
        empty.textContent = "Keine KPI-Daten gefunden.";
        status.insertAdjacentElement("afterend", empty);
      }

      if (!grid) {
        grid = document.createElement("div");
        grid.id = "hkpiGrid";
        grid.style.cssText =
          "margin-top:12px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;min-width:0;";
        empty.insertAdjacentElement("afterend", grid);
      }
    }

    return { badge, status, empty, grid };
  }

  function renderTile(c) {
    const first = c.series.points[0]?.month || "";
    const last = c.series.points[c.series.points.length - 1]?.month || "";

    return `
      <div class="hkpi-tile" style="border-radius:14px;border:1px solid rgba(148,163,184,.14);background:rgba(2,6,23,.25);padding:12px;min-width:0;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;min-width:0;">
          <div style="min-width:0;">
            <div style="font-size:12px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(c.title)}</div>
            <div style="margin-top:3px;font-size:11px;color:rgba(226,232,240,.65);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(c.sub)}</div>
          </div>
          <div style="text-align:right;white-space:nowrap;">
            <div style="font-size:16px;font-weight:950;">${esc(c.value)}</div>
            <div style="margin-top:3px;font-size:11px;color:rgba(226,232,240,.65);">${esc(c.delta)}</div>
          </div>
        </div>

        <div style="margin-top:10px;">
          <div style="display:flex;align-items:flex-end;gap:4px;height:54px;">
            ${barsHTML(c.series)}
          </div>
          <div style="margin-top:6px;display:flex;justify-content:space-between;font-size:10px;color:rgba(226,232,240,.55);">
            <span>${esc(first)}</span>
            <span>${esc(last)}</span>
          </div>
        </div>
      </div>
    `;
  }

  /* -------------------------- series + bars -------------------------- */

  function buildSeries(histRows, baseMonth, field) {
    const hist = histRows.map((r) => ({ month: r.Monat, value: Number(r[field]) || 0 }));
    const histVals = hist.map((x) => x.value);

    const forecast = linearForecast(histVals.slice(-3), 3);

    const points = hist.map((x) => ({ month: x.month, value: x.value, kind: "past" }));
    for (let i = 1; i <= 3; i++) {
      points.push({ month: addMonths(baseMonth, i), value: forecast[i - 1] || 0, kind: "future" });
    }

    const currentVal = points.find((p) => p.month === baseMonth)?.value ?? 0;
    const lastVal = points[points.length - 1]?.value ?? currentVal;
    const trendUp = lastVal >= currentVal;

    return { points, currentMonth: baseMonth, trendUp };
  }

  function barsHTML(series) {
    const abs = series.points.map((p) => Math.abs(p.value || 0));
    const max = Math.max(1, ...abs);

    return series.points
      .map((p) => {
        const h = Math.max(10, Math.round((Math.abs(p.value || 0) / max) * 100));

        // States: past=gray, current=blue, future=green/red
        let bg = "rgba(148,163,184,.35)"; // past
        if (p.month === series.currentMonth) bg = "rgba(59,130,246,.95)"; // current blue
        else if (p.month > series.currentMonth) bg = series.trendUp ? "rgba(34,197,94,.90)" : "rgba(239,68,68,.90)"; // forecast

        return `<div title="${esc(p.month)}" style="flex:1;min-width:0;height:100%;display:flex;align-items:flex-end;">
          <i style="display:block;width:100%;border-radius:10px;background:${bg};height:${h}%;"></i>
        </div>`;
      })
      .join("");
  }

  function trendText(series) {
    const cur = series.points.find((p) => p.month === series.currentMonth)?.value ?? 0;
    const last = series.points[series.points.length - 1]?.value ?? cur;
    const diff = last - cur;
    const sign = diff >= 0 ? "+" : "";
    return `Forecast: ${sign}${formatEuro(diff)} (${series.trendUp ? "↑" : "↓"})`;
  }

  function linearForecast(vals, steps) {
    const v = vals.map((x) => Number(x) || 0);
    if (v.length < 2) return Array.from({ length: steps }, () => v[v.length - 1] || 0);

    const use = v.slice(-3);
    const slope = (use[use.length - 1] - use[0]) / Math.max(1, use.length - 1);
    const base = use[use.length - 1];
    return Array.from({ length: steps }, (_, i) => base + slope * (i + 1));
  }

  function addMonths(ym, add) {
    const y = Number(ym.slice(0, 4));
    const m = Number(ym.slice(5, 7));
    const d = new Date(y, m - 1 + add, 1);
    return monthKeyFromDate(d);
  }

  /* -------------------------- math + parsing -------------------------- */

  function parseMonthKey(v) {
    const s = String(v || "").trim();
    if (/^\d{4}-\d{2}$/.test(s)) return s;
    const iso = s.match(/^(\d{4})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}`;
    return "";
  }

  function monthKeyFromDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  function num(v) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (v === null || v === undefined) return 0;
    const s = String(v).trim();
    if (!s) return 0;
    const n = Number(s.replace(/[^\d\.\-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  function clampPercent(v) {
    let x = num(v);
    if (x > 0 && x <= 1) x *= 100;
    return Math.max(0, Math.min(100, x));
  }

  function sumYear(rows, year, field) {
    const y = String(year);
    return rows.reduce((acc, r) => {
      if (r.Monat && r.Monat.startsWith(y + "-")) return acc + (Number(r[field]) || 0);
      return acc;
    }, 0);
  }

  function avg(rows, field) {
    if (!rows.length) return 0;
    return rows.reduce((a, r) => a + (Number(r[field]) || 0), 0) / rows.length;
  }

  function formatEuro(n) {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(n) || 0);
  }

  function formatPercent(n) {
    const v = Number(n) || 0;
    return (Math.round(v * 10) / 10).toFixed(1).replace(".", ",") + " %";
  }

  function card(title, sub, value, delta, series) {
    return { title, sub, value, delta, series };
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Auto-refresh after data is ready (safe)
  window.addEventListener("immo:data-ready", function () {
    const host = document.getElementById("kpisHost") || document.querySelector(".home-kpis-modul");
    if (host) render(host);
  });
})();
