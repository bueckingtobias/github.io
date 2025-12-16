(function(){
  "use strict";

  window.GewerkGesamtModul = { render, renderAll };

  // Render a single module (mount can be the card-body host OR the module root)
  function render(mountEl){
    try{
      const root =
        (mountEl && mountEl.classList && mountEl.classList.contains("gewerk-gesamt-modul") && mountEl) ||
        (mountEl && mountEl.querySelector && mountEl.querySelector(".gewerk-gesamt-modul")) ||
        document.querySelector(".gewerk-gesamt-modul");

      if (!root) return;

      const ggTitle = root.querySelector("#ggTitle");
      const ggSub = root.querySelector("#ggSub");
      const badgeProject = root.querySelector("#ggBadgeProject");
      const badgeUpdate = root.querySelector("#ggBadgeUpdate");

      const elBudget = root.querySelector("#ggBudget");
      const elPaid = root.querySelector("#ggPaid");
      const elProg = root.querySelector("#ggProg");
      const elRisk = root.querySelector("#ggRisk");

      const payLabel = root.querySelector("#ggPayLabel");
      const progLabel = root.querySelector("#ggProgLabel");
      const payBar = root.querySelector("#ggPayBar");
      const progBar = root.querySelector("#ggProgBar");
      const payBarTxt = root.querySelector("#ggPayBarTxt");
      const progBarTxt = root.querySelector("#ggProgBarTxt");

      const note = root.querySelector("#ggNote");

      // --- Data sources (prefer IMMO_DATA, fallback to IMMO_MASTER_DATA) ---
      const dataGesamt = window.IMMO_DATA?.projects?.gesamt || {};
      const dataGewerke = window.IMMO_DATA?.projects?.gewerke;

      const masterGesamt = window.IMMO_MASTER_DATA?.projects?.gesamt || {};
      const masterGewerke = window.IMMO_MASTER_DATA?.projects?.gewerke;

      const hasDataArray = Array.isArray(dataGewerke);
      const hasMasterArray = Array.isArray(masterGewerke);

      let rows = hasDataArray ? dataGewerke : [];
      if ((!rows || !rows.length) && hasMasterArray) rows = masterGewerke;

      const gesamt = Object.keys(dataGesamt || {}).length ? dataGesamt : masterGesamt;

      // Project meta
      const projectName = gesamt.Projekt || gesamt.Adresse || gesamt.Objekt || "Projekt";
      if (ggTitle) ggTitle.textContent = projectName;

      if (badgeProject) badgeProject.textContent = `Projekt: ${projectName}`;
      if (badgeUpdate) badgeUpdate.textContent = `Update: ${gesamt.Letztes_Update || gesamt.updatedAt || (window.IMMO_MASTER_DATA?.updatedAt ? String(window.IMMO_MASTER_DATA.updatedAt).slice(0,10) : "—")}`;

      // Normalize
      const normalized = (Array.isArray(rows) ? rows : []).map((r, i) => normalizeRow(r, i, projectName, gesamt.Adresse || gesamt.Objekt || ""));

      const active = normalized.filter(r => String(r.Aktiv || "Ja").toLowerCase().startsWith("j"));

      if (!active.length){
        setEmpty(
          `Keine Gewerke gefunden.\n` +
          `IMMO_DATA.projects.gewerke: ${hasDataArray ? dataGewerke.length : "kein Array"}\n` +
          `IMMO_MASTER_DATA.projects.gewerke: ${hasMasterArray ? masterGewerke.length : "kein Array"}`
        );
        return;
      }

      // Aggregate
      let totalOffer = 0;
      let totalPaid  = 0;
      let weightedProg = 0;

      active.forEach(r=>{
        const offer = num(r.Angebot);
        const paid  = num(r.Gezahlt);
        const prog  = num(r.Baufortschritt);
        totalOffer += offer;
        totalPaid  += paid;
        weightedProg += (offer > 0 ? prog * offer : 0);
      });

      const overallProg = totalOffer > 0 ? (weightedProg / totalOffer) : 0;
      const payPct = totalOffer > 0 ? (totalPaid / totalOffer * 100) : 0;
      const risk = payPct - overallProg;

      // Write KPIs
      if (elBudget) elBudget.textContent = formatEuro(totalOffer);
      if (elPaid) elPaid.textContent = formatEuro(totalPaid);
      if (elProg) elProg.textContent = formatPercent(overallProg);
      if (elRisk) elRisk.textContent = (risk >= 0 ? "+" : "") + formatPercent(risk);

      if (ggSub) ggSub.textContent = `Aktive Gewerke: ${active.length} · Angebot/ Zahlungen/ gewichteter Fortschritt`;

      // Bars
      const payClamped = clamp(payPct, 0, 100);
      const progClamped = clamp(overallProg, 0, 100);

      if (payLabel) payLabel.textContent = `${formatPercent(payPct)} · ${formatEuro(totalPaid)} / ${formatEuro(totalOffer)}`;
      if (progLabel) progLabel.textContent = `${formatPercent(overallProg)} · gewichteter Fortschritt`;

      if (payBarTxt) payBarTxt.textContent = formatPercent(payPct);
      if (progBarTxt) progBarTxt.textContent = formatPercent(overallProg);

      if (payBar) payBar.style.width = "0%";
      if (progBar) progBar.style.width = "0%";

      requestAnimationFrame(() => {
        if (payBar) payBar.style.width = payClamped + "%";
        if (progBar) progBar.style.width = progClamped + "%";
      });

      // Notes + Debug (only if needed)
      const msgs = [];
      if (risk > 10) msgs.push("Auffällig: Zahlungsquote deutlich über Fortschritt (OP/Abschläge prüfen).");
      if (overallProg < 30) msgs.push("Frühe Phase: Terminplan/Abhängigkeiten eng monitoren.");
      if (totalOffer > 0 && totalPaid > totalOffer) msgs.push("Über Budget gezahlt – Budget/NA prüfen.");

      if (note){
        if (msgs.length){
          note.style.display = "block";
          note.textContent = msgs.join(" ");
        } else {
          note.style.display = "none";
          note.textContent = "";
        }
      }

      function setEmpty(text){
        if (elBudget) elBudget.textContent = "—";
        if (elPaid) elPaid.textContent = "—";
        if (elProg) elProg.textContent = "—";
        if (elRisk) elRisk.textContent = "—";
        if (payLabel) payLabel.textContent = "—";
        if (progLabel) progLabel.textContent = "—";
        if (payBar) payBar.style.width = "0%";
        if (progBar) progBar.style.width = "0%";
        if (note){
          note.style.display = "block";
          note.textContent = text;
        }
      }

    } catch (e){
      // Hard fail visibility
      const root =
        (mountEl && mountEl.querySelector && mountEl.querySelector(".gewerk-gesamt-modul")) ||
        document.querySelector(".gewerk-gesamt-modul");
      const note = root ? root.querySelector("#ggNote") : null;
      if (note){
        note.style.display = "block";
        note.textContent = "Gesamtmodul Render-Fehler: " + String(e && e.message ? e.message : e);
      }
      console.error("GewerkGesamtModul.render error:", e);
    }
  }

  // Render all instances on page
  function renderAll(){
    document.querySelectorAll(".gewerk-gesamt-modul").forEach(root => render(root));
  }

  // Normalize row keys so module never misses fields
  function normalizeRow(r, i, projektName, objekt){
    const offer = num(r.Angebot ?? r.Angebotssumme ?? r["Angebot (€)"] ?? r.Angebot_EUR);
    const paid  = num(r.Gezahlt ?? r.Zahlungen ?? r.Zahlungen_bisher ?? r["Zahlungen (€)"] ?? r["Zahlungen bisher"] ?? r.Gezahlt_EUR);
    const prog  = clamp(num(r.Baufortschritt ?? r.Baufortschritt_prozent ?? r["Baufortschritt %"] ?? r.Fortschritt), 0, 100);

    return {
      Projekt: r.Projekt || projektName || "",
      Objekt: r.Objekt || objekt || "",
      Aktiv: r.Aktiv || "Ja",
      Sortierung: num(r.Sortierung) || (i + 1),
      Gewerk: r.Gewerk || "",
      Handwerker: r.Handwerker || "",
      Angebot: offer,
      Gezahlt: paid,
      Baufortschritt: prog,
      ...r
    };
  }

  function num(v){
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (v === null || v === undefined) return 0;
    const s0 = String(v).trim();
    if (!s0) return 0;

    let s = s0.replace(/\s/g,"").replace(/€/g,"");
    const hasComma = s.includes(",");
    const hasDot = s.includes(".");
    if (hasComma && hasDot) {
      const lc = s.lastIndexOf(",");
      const ld = s.lastIndexOf(".");
      if (lc > ld) s = s.replace(/\./g,"").replace(",",".");
      else s = s.replace(/,/g,"");
    } else if (hasComma && !hasDot) {
      s = s.replace(",",".");
    }
    s = s.replace(/[^0-9.\-]/g,"");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  function formatEuro(value){
    return new Intl.NumberFormat("de-DE",{ style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(Number(value)||0);
  }

  function formatPercent(value){
    const v = Number(value)||0;
    return (Math.round(v*10)/10).toFixed(1).replace(".",",") + " %";
  }

  function clamp(x, a, b){
    return Math.max(a, Math.min(b, x));
  }

  // ✅ Auto hooks (important for fetch-injected modules)
  window.addEventListener("immo:data-ready", () => {
    renderAll();
    setTimeout(renderAll, 120);
    setTimeout(renderAll, 420);
  });

  document.addEventListener("DOMContentLoaded", () => {
    renderAll();
    setTimeout(renderAll, 120);
  });

})();