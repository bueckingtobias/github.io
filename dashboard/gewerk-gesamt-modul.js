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

    // ✅ Quelle 1: IMMO_DATA (normalerweise das Ziel)
    const dataGesamt = window.IMMO_DATA?.projects?.gesamt || {};
    const dataGewerke = window.IMMO_DATA?.projects?.gewerke;

    // ✅ Fallback Quelle 2: IMMO_MASTER_DATA (falls IMMO_DATA nicht korrekt befüllt wurde)
    const masterGesamt = window.IMMO_MASTER_DATA?.projects?.gesamt || {};
    const masterGewerke = window.IMMO_MASTER_DATA?.projects?.gewerke;

    // ✅ Entscheide Quelle (mit harter Absicherung auf Array)
    let rows = Array.isArray(dataGewerke) ? dataGewerke : [];
    if (!rows.length && Array.isArray(masterGewerke)) rows = masterGewerke;

    // ✅ Gesamdaten: IMMO_DATA bevorzugen, sonst Master
    const gesamt = Object.keys(dataGesamt || {}).length ? dataGesamt : masterGesamt;

    // Projektname setzen
    const projectName = gesamt.Projekt || gesamt.Adresse || gesamt.Objekt || "Projekt";
    if (ggTitle) ggTitle.textContent = projectName;

    if (badgeProject) badgeProject.textContent = `Projekt: ${projectName}`;
    if (badgeUpdate) badgeUpdate.textContent = `Update: ${gesamt.Letztes_Update || gesamt.updatedAt || window.IMMO_MASTER_DATA?.updatedAt?.slice(0,10) || "—"}`;

    // ✅ Normalisieren, damit alle Key-Varianten sauber funktionieren
    rows = rows.map((r, i) => normalizeRow(r, i, projectName, gesamt.Adresse || gesamt.Objekt || ""));

    // aktive Gewerke
    const active = rows.filter(r => String(r.Aktiv || "Ja").toLowerCase().startsWith("j"));

    if (!active.length){
      setEmpty(
        "Keine Gewerke gefunden. " +
        `IMMO_DATA.projects.gewerke: ${Array.isArray(dataGewerke) ? dataGewerke.length : "kein Array"} · ` +
        `IMMO_MASTER_DATA.projects.gewerke: ${Array.isArray(masterGewerke) ? masterGewerke.length : "kein Array"}`
      );
      return;
    }

    // Aggregation
    let totalOffer = 0;
    let totalPaid = 0;
    let weightedProg = 0;

    active.forEach(r => {
      const offer = num(r.Angebot);
      const paid  = num(r.Gezahlt);
      const prog  = num(r.Baufortschritt);
      totalOffer += offer;
      totalPaid  += paid;
      weightedProg += (offer > 0 ? prog * offer : 0);
    });

    const progOverall = totalOffer > 0 ? (weightedProg / totalOffer) : 0;
    const payPct = totalOffer > 0 ? (totalPaid / totalOffer * 100) : 0;

    // Risiko-Index: (Zahlungsquote - Fortschritt)
    const risk = payPct - progOverall;

    if (elBudget) elBudget.textContent = formatEuro(totalOffer);
    if (elPaid) elPaid.textContent = formatEuro(totalPaid);
    if (elProg) elProg.textContent = formatPercent(progOverall);
    if (elRisk) elRisk.textContent = (risk >= 0 ? "+" : "") + formatPercent(risk);

    if (ggSub) ggSub.textContent =
      `Aktive Gewerke: ${active.length} · Aggregation: Angebot/ Zahlungen/ gewichteter Fortschritt`;

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
    if (risk > 10) msg.push("Auffällig: Zahlungsquote deutlich über Fortschritt (OP/Abschläge prüfen).");
    if (progOverall < 30) msg.push("Frühe Phase: Terminplan/Abhängigkeiten eng monitoren.");
    if (totalOffer > 0 && totalPaid > totalOffer) msg.push("Über Budget gezahlt – Budget/NA prüfen.");

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

  function normalizeRow(r, i, projektName, objekt){
    const offer = num(r.Angebot ?? r.Angebotssumme ?? r["Angebot (€)"] ?? r.Angebot_EUR);
    const paid  = num(r.Gezahlt ?? r.Zahlungen ?? r.Zahlungen_bisher ?? r["Zahlungen (€)"] ?? r.Gezahlt_EUR);
    const prog  = num(r.Baufortschritt ?? r.Baufortschritt_prozent ?? r["Baufortschritt %"] ?? r.Fortschritt);

    return {
      Projekt: r.Projekt || projektName || "",
      Objekt: r.Objekt || objekt || "",
      Aktiv: r.Aktiv || "Ja",
      Sortierung: num(r.Sortierung) || (i + 1),
      Gewerk: r.Gewerk || "",
      Handwerker: r.Handwerker || "",
      Angebot: offer,
      Gezahl t: undefined, // ignoriere Tippfehler-Keys
      Gezahlt: paid,
      Gezahl_t: undefined,
      Gezahl: undefined,
      Gezahltt: undefined,
      GeZahlt: undefined,
      GezaHlt: undefined,
      Gezahl_: undefined,
      Gezahlte: undefined,
      Gezahlter: undefined,
      Gezahlten: undefined,
      Gezahlt_EUR: undefined,
      Zahlungen: paid,
      Zahlungen_bisher: paid,
      "Zahlungen (€)": paid,
      Baufortschritt: clamp(num(prog), 0, 100),
      Baufortschritt_prozent: clamp(num(prog), 0, 100),
      "Baufortschritt %": clamp(num(prog), 0, 100),
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

  window.addEventListener("immo:data-ready", () => {
    const host = document.getElementById("gesamtHost") || document.querySelector(".gewerk-gesamt-modul");
    if (host) render(host);
  });
})();