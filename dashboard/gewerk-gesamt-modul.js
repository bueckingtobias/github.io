(function(){
  "use strict";

  window.GewerkGesamtModul = { render, renderAll };

  function render(mountEl){
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

    const distEl = root.querySelector("#ggDist");
    const distMeta = root.querySelector("#ggBudgetShareMeta");

    const risksEl = root.querySelector("#ggRisks");
    const riskMeta = root.querySelector("#ggRiskMeta");

    const topSumsEl = root.querySelector("#ggTopSums");
    const topSumMeta = root.querySelector("#ggTopSumMeta");

    const note = root.querySelector("#ggNote");

    // Data sources
    const dataGesamt = window.IMMO_DATA?.projects?.gesamt || {};
    const dataGewerke = window.IMMO_DATA?.projects?.gewerke;

    const masterGesamt = window.IMMO_MASTER_DATA?.projects?.gesamt || {};
    const masterGewerke = window.IMMO_MASTER_DATA?.projects?.gewerke;

    let rows = Array.isArray(dataGewerke) ? dataGewerke : [];
    if ((!rows || !rows.length) && Array.isArray(masterGewerke)) rows = masterGewerke;

    const gesamt = Object.keys(dataGesamt || {}).length ? dataGesamt : masterGesamt;

    const projectName = gesamt.Projekt || gesamt.Adresse || gesamt.Objekt || "Projekt";
    if (ggTitle) ggTitle.textContent = projectName;

    if (badgeProject) badgeProject.textContent = `Projekt: ${projectName}`;
    if (badgeUpdate) badgeUpdate.textContent = `Update: ${gesamt.Letztes_Update || gesamt.updatedAt || (window.IMMO_MASTER_DATA?.updatedAt ? String(window.IMMO_MASTER_DATA.updatedAt).slice(0,10) : "—")}`;

    // Normalize + active
    const normalized = (Array.isArray(rows) ? rows : []).map((r, i) => normalizeRow(r, i, projectName, gesamt.Adresse || gesamt.Objekt || ""));
    const active = normalized
      .filter(r => String(r.Aktiv || "Ja").toLowerCase().startsWith("j"))
      .sort((a,b)=> num(a.Sortierung) - num(b.Sortierung));

    if (!active.length){
      setEmpty("Keine Gewerke gefunden. Prüfe projects.gewerke im Master.");
      return;
    }

    // Aggregate
    let totalOffer = 0, totalPaid = 0, weightedProg = 0;
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
    const riskIndex = payPct - overallProg;

    // KPIs
    if (elBudget) elBudget.textContent = formatEuro(totalOffer);
    if (elPaid) elPaid.textContent = formatEuro(totalPaid);
    if (elProg) elProg.textContent = formatPercent(overallProg);
    if (elRisk) elRisk.textContent = (riskIndex >= 0 ? "+" : "") + formatPercent(riskIndex);

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

    // ---------- Budgetverteilung (Top 5 + Rest) ----------
    if (distEl){
      const byOffer = [...active].sort((a,b)=> num(b.Angebot) - num(a.Angebot));
      const top = byOffer.slice(0,5);
      const topSum = top.reduce((s,r)=> s + num(r.Angebot), 0);
      const rest = Math.max(0, totalOffer - topSum);

      distEl.innerHTML = "";

      const distRows = top.map(r => ({
        name: r.Gewerk ? `${r.Gewerk}` : (r.Handwerker || "Gewerk"),
        val: num(r.Angebot)
      }));

      if (rest > 0){
        distRows.push({ name: "Rest", val: rest });
      }

      distRows.forEach(item=>{
        const pct = totalOffer > 0 ? (item.val / totalOffer * 100) : 0;
        const row = document.createElement("div");
        row.className = "gg-dist-row";
        row.innerHTML = `
          <div class="gg-dist-name">${escapeHtml(item.name)}</div>
          <div class="gg-dist-val">${formatEuro(item.val)} · ${formatPercent(pct)}</div>
          <div class="gg-dist-track"><div class="gg-dist-fill" style="width:0%"></div></div>
        `;
        distEl.appendChild(row);

        const fill = row.querySelector(".gg-dist-fill");
        requestAnimationFrame(()=>{ if(fill) fill.style.width = clamp(pct,0,100) + "%"; });
      });

      if (distMeta){
        distMeta.textContent = `Top 5: ${formatPercent(totalOffer>0 ? (topSum/totalOffer*100) : 0)}`;
      }
    }

    // ---------- Top Risiken (Top 3) ----------
    if (risksEl){
      const riskRows = active.map(r=>{
        const offer = num(r.Angebot);
        const paid  = num(r.Gezahlt);
        const prog  = clamp(num(r.Baufortschritt),0,100);
        const payP  = offer > 0 ? (paid/offer*100) : 0;
        const delta = payP - prog;                 // >0 kritisch
        const score = delta * (offer > 0 ? offer : 1); // gewichtet
        return { r, offer, paid, prog, payP, delta, score };
      }).sort((a,b)=> b.score - a.score);

      const top3 = riskRows.slice(0,3);

      risksEl.innerHTML = "";
      top3.forEach(x=>{
        const badge = (x.delta >= 0 ? "+" : "") + formatPercent(x.delta);
        const title = `${x.r.Gewerk || "Gewerk"} · ${x.r.Handwerker || "Handwerker"}`;
        const sub = `Angebot ${formatEuro(x.offer)} · Gezahlt ${formatEuro(x.paid)} · Fortschritt ${formatPercent(x.prog)} · Quote ${formatPercent(x.payP)}`;

        const item = document.createElement("div");
        item.className = "gg-item";
        item.innerHTML = `
          <div class="gg-item-top">
            <div class="gg-item-title">${escapeHtml(title)}</div>
            <div class="gg-item-badge">${escapeHtml(badge)}</div>
          </div>
          <div class="gg-item-sub">${escapeHtml(sub)}</div>
        `;
        risksEl.appendChild(item);
      });

      if (riskMeta){
        const critCount = riskRows.filter(x=> x.delta > 0).length;
        riskMeta.textContent = `kritisch: ${critCount}/${active.length}`;
      }
    }

    // ---------- Top Summen (Top 3 Angebote) ----------
    if (topSumsEl){
      const topOfferRows = [...active]
        .map(r => ({ r, offer: num(r.Angebot), paid: num(r.Gezahlt), prog: clamp(num(r.Baufortschritt),0,100) }))
        .sort((a,b)=> b.offer - a.offer)
        .slice(0,3);

      topSumsEl.innerHTML = "";
      topOfferRows.forEach(x=>{
        const title = `${x.r.Gewerk || "Gewerk"} · ${x.r.Handwerker || "Handwerker"}`;
        const badge = formatEuro(x.offer);
        const sub = `Gezahlt ${formatEuro(x.paid)} · Fortschritt ${formatPercent(x.prog)}`;

        const item = document.createElement("div");
        item.className = "gg-item";
        item.innerHTML = `
          <div class="gg-item-top">
            <div class="gg-item-title">${escapeHtml(title)}</div>
            <div class="gg-item-badge">${escapeHtml(badge)}</div>
          </div>
          <div class="gg-item-sub">${escapeHtml(sub)}</div>
        `;
        topSumsEl.appendChild(item);
      });

      if (topSumMeta){
        const top3Sum = topOfferRows.reduce((s,x)=> s + x.offer, 0);
        topSumMeta.textContent = `Top 3: ${formatPercent(totalOffer>0 ? (top3Sum/totalOffer*100) : 0)}`;
      }
    }

    // Note
    const msgs = [];
    if (riskIndex > 10) msgs.push("Auffällig: Zahlungsquote deutlich über Fortschritt (OP/Abschläge prüfen).");
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
      if (distEl) distEl.innerHTML = "";
      if (risksEl) risksEl.innerHTML = "";
      if (topSumsEl) topSumsEl.innerHTML = "";
      if (note){
        note.style.display = "block";
        note.textContent = text || "Keine Daten.";
      }
    }
  }

  function renderAll(){
    document.querySelectorAll(".gewerk-gesamt-modul").forEach(root => render(root));
  }

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

  function escapeHtml(s){
    return String(s ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  // Stable for injected modules
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