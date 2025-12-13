/* dashboard/gewerk-gesamt-modul.js
   Export: window.GewerkGesamtModul.render(container, rows)
   Robust: accepts ARRAY (preferred) or OBJECT (wrap to array)
*/

(function () {
  function qs(root, sel){ return root.querySelector(sel); }

  function formatEuro(v){
    const n = Number(v);
    if(!isFinite(n)) return "0 €";
    return new Intl.NumberFormat("de-DE", {
      style:"currency", currency:"EUR", maximumFractionDigits:0
    }).format(n);
  }

  function formatPct(v){
    const n = Number(v);
    if(!isFinite(n)) return "0,0 %";
    return (Math.round(n*10)/10).toFixed(1).replace(".", ",") + " %";
  }

  function clamp(n, a, b){
    n = Number(n);
    if(!isFinite(n)) n = 0;
    return Math.max(a, Math.min(b, n));
  }

  function toNumber(x){
    if(x == null || x === "") return 0;
    if(typeof x === "number" && isFinite(x)) return x;
    const s = String(x)
      .replace(/\s/g, "")
      .replace(/€/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "");
    const n = Number(s);
    return isFinite(n) ? n : 0;
  }

  function pick(row, keys){
    for(const k of keys){
      if(row && Object.prototype.hasOwnProperty.call(row, k) && row[k] !== "" && row[k] != null) return row[k];
    }
    return undefined;
  }

  function getOffer(row){
    return toNumber(pick(row, ["Angebotssumme","Angebot","Budget","Summe","Angebot (€)","Angebotssumme €"]));
  }

  function getPaid(row){
    return toNumber(pick(row, ["Zahlungen_bisher","Gezahlt","Zahlungen","Ist","Zahlungen bisher","Zahlungen (€)","Bisher gezahlt"]));
  }

  function getProgress(row){
    let p = toNumber(pick(row, ["Baufortschritt_prozent","Baufortschritt_%","Fortschritt_%","Fortschritt %","Baufortschritt %","Progress"]));
    if(p > 0 && p <= 1) p = p * 100;
    return clamp(p, 0, 100);
  }

  function isActive(row){
    const v = String(pick(row, ["Aktiv (Ja/Nein)","Aktiv","Active"]) ?? "Ja").trim().toLowerCase();
    if(v === "nein" || v === "no" || v === "0" || v === "false") return false;
    return v.startsWith("j") || v.startsWith("y") || v === "1" || v === "true";
  }

  function nameOf(row){
    return String(pick(row, ["Gewerk","Handwerker","Name","Titel"]) ?? "").trim();
  }

  function subOf(row){
    const p = String(pick(row, ["Projekt"]) ?? "").trim();
    const o = String(pick(row, ["Objekt","Adresse"]) ?? "").trim();
    const h = String(pick(row, ["Handwerker"]) ?? "").trim();
    return [p, o, h].filter(Boolean).join(" · ");
  }

  function ensureSkeleton(container){
    // If HTML template is injected, use it. Otherwise, build minimal skeleton.
    const existing = container.querySelector("[data-ggm-root]");
    if(existing) return existing;

    container.innerHTML = `
      <div class="ggm-root" data-ggm-root>
        <div class="ggm-top">
          <div class="ggm-title-wrap">
            <div class="ggm-title" data-ggm-title>Gesamtübersicht</div>
            <div class="ggm-sub" data-ggm-sub>—</div>
          </div>
          <div class="ggm-chips">
            <div class="ggm-chip" data-ggm-chip-count>—</div>
            <div class="ggm-chip" data-ggm-chip-active>—</div>
            <div class="ggm-chip ggm-chip-warn" data-ggm-chip-warn style="display:none;">—</div>
          </div>
        </div>

        <div class="ggm-grid">
          <div class="ggm-panel">
            <div class="ggm-panel-head">
              <div class="ggm-panel-title">Budget & Zahlungen</div>
              <div class="ggm-panel-meta" data-ggm-budget-meta>—</div>
            </div>

            <div class="ggm-kpi-row">
              <div class="ggm-kpi"><div class="ggm-k">Gesamtbudget</div><div class="ggm-v" data-ggm-budget>—</div></div>
              <div class="ggm-kpi"><div class="ggm-k">Gezahlt</div><div class="ggm-v" data-ggm-paid>—</div></div>
              <div class="ggm-kpi"><div class="ggm-k">Offen</div><div class="ggm-v" data-ggm-open>—</div></div>
            </div>

            <div class="ggm-bar">
              <div class="ggm-bar-label"><span>Zahlungsquote</span><span data-ggm-payquote>—</span></div>
              <div class="ggm-track"><div class="ggm-fill ggm-fill-blue" data-ggm-paybar style="width:0%"></div></div>
            </div>

            <div class="ggm-mini" data-ggm-paynote>—</div>
          </div>

          <div class="ggm-panel">
            <div class="ggm-panel-head">
              <div class="ggm-panel-title">Baufortschritt</div>
              <div class="ggm-panel-meta" data-ggm-progress-meta>—</div>
            </div>

            <div class="ggm-kpi-row" style="grid-template-columns: repeat(2, minmax(0,1fr));">
              <div class="ggm-kpi"><div class="ggm-k">Ø Fortschritt (gewichtet)</div><div class="ggm-v" data-ggm-progress>—</div></div>
              <div class="ggm-kpi"><div class="ggm-k">Überzahlung vs. Fortschritt</div><div class="ggm-v" data-ggm-risk>—</div></div>
            </div>

            <div class="ggm-bar">
              <div class="ggm-bar-label"><span>Fortschritt gesamt</span><span data-ggm-proglabel>—</span></div>
              <div class="ggm-track"><div class="ggm-fill ggm-fill-green" data-ggm-progbar style="width:0%"></div></div>
            </div>

            <div class="ggm-mini" data-ggm-prognote>—</div>
          </div>
        </div>
      </div>
    `;
    return container.querySelector("[data-ggm-root]");
  }

  function render(container, input){
    const root = ensureSkeleton(container);

    // normalize input to array
    let rows = input;
    if(rows && !Array.isArray(rows) && typeof rows === "object") rows = [rows];
    if(!Array.isArray(rows)) rows = [];

    const activeRows = rows.filter(isActive);
    const base = activeRows.length ? activeRows : rows;

    let totalOffer = 0, totalPaid = 0, weightedProg = 0, warnCount = 0;

    const items = base.map((r, idx) => {
      const offer = getOffer(r);
      const paid  = getPaid(r);
      const prog  = getProgress(r);

      totalOffer += offer;
      totalPaid  += paid;
      weightedProg += prog * offer;

      const payPct = offer > 0 ? (paid / offer * 100) : 0;
      const risk = payPct - prog;
      if(risk > 10) warnCount++;

      return { idx, offer, paid, prog, payPct, risk, title: nameOf(r) || ("Eintrag " + (idx+1)), sub: subOf(r) };
    });

    const progressWeighted = totalOffer > 0 ? (weightedProg / totalOffer) : 0;
    const payQuote = totalOffer > 0 ? (totalPaid / totalOffer * 100) : 0;
    const open = Math.max(0, totalOffer - totalPaid);

    let riskScore = 0;
    if(totalOffer > 0){
      for(const it of items){
        const w = it.offer / totalOffer;
        riskScore += Math.max(0, it.risk) * w;
      }
    }

    // header
    const projectName = String(pick(base[0] || {}, ["Projekt"]) ?? "").trim();
    qs(root, "[data-ggm-title]").textContent = projectName ? ("Gesamtübersicht · " + projectName) : "Gesamtübersicht";
    qs(root, "[data-ggm-sub]").textContent = items.length ? ("Auswertung über " + items.length + " Gewerke") : "Keine Daten gefunden.";

    qs(root, "[data-ggm-chip-count]").textContent = "Gewerke: " + items.length;
    qs(root, "[data-ggm-chip-active]").textContent = "Aktiv: " + (activeRows.length ? activeRows.length : items.length);

    const chipWarn = qs(root, "[data-ggm-chip-warn]");
    if(chipWarn){
      if(warnCount > 0){
        chipWarn.style.display = "";
        chipWarn.textContent = "Warnungen: " + warnCount;
      }else{
        chipWarn.style.display = "none";
      }
    }

    // KPIs
    qs(root, "[data-ggm-budget]").textContent = formatEuro(totalOffer);
    qs(root, "[data-ggm-paid]").textContent   = formatEuro(totalPaid);
    qs(root, "[data-ggm-open]").textContent   = formatEuro(open);

    qs(root, "[data-ggm-progress]").textContent = formatPct(progressWeighted);
    qs(root, "[data-ggm-risk]").textContent     = formatPct(riskScore);

    // Meta / notes
    qs(root, "[data-ggm-budget-meta]").textContent =
      totalOffer > 0 ? ("Zahlungen " + formatEuro(totalPaid) + " von " + formatEuro(totalOffer)) : "Kein Budget vorhanden.";

    qs(root, "[data-ggm-progress-meta]").textContent = "Gewichteter Fortschritt nach Angebotsvolumen.";

    const delta = totalPaid - totalOffer;
    qs(root, "[data-ggm-paynote]").textContent =
      totalOffer > 0
        ? ("Abweichung: " + (delta >= 0 ? "+" : "") + formatEuro(delta) + " · Offen: " + formatEuro(open))
        : "Bitte Angebotswerte je Gewerk pflegen.";

    qs(root, "[data-ggm-prognote]").textContent =
      "Risikowert = Überzahlung gegenüber Fortschritt (gewichteter Mittelwert).";

    // Bars
    const payW = clamp(payQuote, 0, 100);
    const progW = clamp(progressWeighted, 0, 100);

    qs(root, "[data-ggm-payquote]").textContent = formatPct(payW);
    qs(root, "[data-ggm-proglabel]").textContent = formatPct(progW);

    const paybar = qs(root, "[data-ggm-paybar]");
    const progbar = qs(root, "[data-ggm-progbar]");

    requestAnimationFrame(() => {
      if(paybar) paybar.style.width = payW + "%";
      if(progbar) progbar.style.width = progW + "%";
    });
  }

  // ✅ EXACT export your view expects:
  window.GewerkGesamtModul = { render };
})();