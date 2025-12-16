(function(){
  "use strict";

  window.GewerkGesamtModul = { render };

  function render(mountEl){
    const root =
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

    const gesamt = window.IMMO_DATA?.projects?.gesamt || {};
    const all = window.IMMO_DATA?.projects?.gewerke;
    const rows = Array.isArray(all) ? all : [];

    const projectName = gesamt.Projekt || gesamt.Adresse || gesamt.Objekt || "Projekt";
    if (ggTitle) ggTitle.textContent = projectName;

    if (badgeProject) badgeProject.textContent = `Projekt: ${projectName}`;
    if (badgeUpdate) badgeUpdate.textContent = `Update: ${gesamt.Letztes_Update || gesamt.updatedAt || "—"}`;

    // aktive Gewerke
    const active = rows.filter(r => String(r.Aktiv || "Ja").toLowerCase().startsWith("j"));
    if (!active.length){
      setEmpty("Keine Gewerke gefunden. Prüfe IMMO_MASTER_DATA.projects.gewerke.");
      return;
    }

    // Aggregation
    let totalOffer = 0;
    let totalPaid = 0;
    let weightedProg = 0;

    active.forEach(r => {
      const offer = num(r.Angebot ?? r.Angebotssumme ?? r["Angebot (€)"]);
      const paid  = num(r.Gezahlt ?? r.Zahlungen ?? r.Zahlungen_bisher ?? r["Zahlungen (€)"]);
      const prog  = num(r.Baufortschritt ?? r.Baufortschritt_prozent ?? r["Baufortschritt %"]);
      totalOffer += offer;
      totalPaid += paid;
      weightedProg += (offer > 0 ? prog * offer : 0);
    });

    const progOverall = totalOffer > 0 ? (weightedProg / totalOffer) : 0;
    const payPct = totalOffer > 0 ? (totalPaid / totalOffer * 100) : 0;

    // Risiko-Index: (Zahlungsquote - Fortschritt) => positiv = kritisch
    const risk = payPct - progOverall;

    if (elBudget) elBudget.textContent = formatEuro(totalOffer);
    if (elPaid) elPaid.textContent = formatEuro(totalPaid);
    if (elProg) elProg.textContent = formatPercent(progOverall);
    if (elRisk) elRisk.textContent = (risk >= 0 ? "+" : "") + formatPercent(risk);

    if (ggSub) ggSub.textContent = `Aktive Gewerke: ${active.length} · Aggregation: Angebot/ Zahlungen/ gewichteter Fortschritt`;

    const payClamped = clamp(payPct, 0, 100);
    const progClamped = clamp(progOverall, 0, 100);

    if (payLabel) payLabel.textContent = `${formatPercent(payPct)} · ${formatEuro(totalPaid)} / ${formatEuro(totalOffer)}`;
    if (progLabel) progLabel.textContent = `${formatPercent(progOverall)} · gewichteter Fortschritt`;

    // animate
    if (payBar) payBar.style.width = "0%";
    if (progBar) progBar.style.width = "0%";
    if (payBarTxt) payBarTxt.textContent = formatPercent(payPct);
    if (progBarTxt) progBarTxt.textContent = formatPercent(progOverall);

    requestAnimationFrame(() => {
      if (payBar) payBar.style.width = payClamped + "%";
      if (progBar) progBar.style.width = progClamped + "%";
    });

    // Note
    const msg = [];
    if (risk > 10) msg.push("Auffällig: Zahlungsquote deutlich über Fortschritt (bitte OP/Abschläge prüfen).");
    if (progOverall < 30) msg.push("Frühe Phase: Abhängigkeiten/Terminplan eng beobachten.");
    if (totalOffer > 0 && totalPaid > totalOffer) msg.push("Über Budget gezahlt – bitte Budget/NA prüfen.");

    if (note){
      if (msg.length){
        note.style.display = "block";
        note.textContent = msg.join(" ");
      } else {
        note.style.display = "none";
        note.textContent = "";
      }
    }

    function setEmpty(text){
      if (note){
        note.style.display = "block";
        note.textContent = text;
      }
      if (elBudget) elBudget.textContent = "—";
      if (elPaid) elPaid.textContent = "—";
      if (elProg) elProg.textContent = "—";
      if (elRisk) elRisk.textContent = "—";
      if (payBar) payBar.style.width = "0%";
      if (progBar) progBar.style.width = "0%";
      if (payLabel) payLabel.textContent = "—";
      if (progLabel) progLabel.textContent = "—";
    }
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

  window.addEventListener("immo:data-ready", () => {
    const host = document.getElementById("gesamtHost") || document.querySelector(".gewerk-gesamt-modul");
    if (host) render(host);
  });
})();