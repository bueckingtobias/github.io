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

    const stackTrack = root.querySelector("#ggStackTrack");
    const stackLegend = root.querySelector("#ggStackLegend");
    const distMeta = root.querySelector("#ggBudgetShareMeta");

    const risksEl = root.querySelector("#ggRisks");
    const riskMeta = root.querySelector("#ggRiskMeta");

    const topSumsEl = root.querySelector("#ggTopSums");
    const topSumMeta = root.querySelector("#ggTopSumMeta");

    const note = root.querySelector("#ggNote");

    const master = window.IMMO_MASTER_DATA;
    const data = window.IMMO_DATA;

    const gesamt = (master?.projects?.gesamt && Object.keys(master.projects.gesamt).length)
      ? master.projects.gesamt
      : (data?.projects?.gesamt || {});

    let rows = Array.isArray(master?.projects?.gewerke) ? master.projects.gewerke
      : (Array.isArray(data?.projects?.gewerke) ? data.projects.gewerke : []);

    const projectName = gesamt.Projekt || gesamt.Adresse || gesamt.Objekt || "Projekt";
    if (ggTitle) ggTitle.textContent = projectName;
    if (badgeProject) badgeProject.textContent = `Projekt: ${projectName}`;
    if (badgeUpdate) badgeUpdate.textContent = `Update: ${String(gesamt.Letztes_Update || master?.updatedAt || "—").slice(0,10)}`;

    const normalized = rows.map((r,i)=> normalizeRow(r,i,projectName,gesamt.Adresse||gesamt.Objekt||""));
    const active = normalized
      .filter(r => String(r.Aktiv || "Ja").toLowerCase().startsWith("j"))
      .sort((a,b)=> (num(a.Sortierung)||9999) - (num(b.Sortierung)||9999));

    if (!active.length){
      setEmpty("Keine Gewerke gefunden. Prüfe IMMO_MASTER_DATA.projects.gewerke.");
      return;
    }

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

    if (elBudget) elBudget.textContent = formatEuro(totalOffer);
    if (elPaid) elPaid.textContent = formatEuro(totalPaid);
    if (elProg) elProg.textContent = formatPercent(overallProg);
    if (elRisk) elRisk.textContent = (riskIndex >= 0 ? "+" : "") + formatPercent(riskIndex);

    if (ggSub) ggSub.textContent = `Aktive Gewerke: ${active.length} · Angebot/ Zahlungen/ gewichteter Fortschritt`;

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

    // Stacked budget bar (always full 100%)
    const palette = ["#2563eb","#22c55e","#f97316","#a855f7","#06b6d4","#ef4444","#eab308","#10b981","#3b82f6","#f43f5e","#84cc16","#0ea5e9"];

    if (stackTrack && stackLegend){
      const sorted = [...active].sort((a,b)=> num(b.Angebot) - num(a.Angebot));

      const segs = sorted.map((r, idx) => ({
        name: r.Gewerk || r.Handwerker || `Gewerk ${idx+1}`,
        val: num(r.Angebot),
        color: palette[idx % palette.length]
      }));

      const total = segs.reduce((s,x)=> s + x.val, 0) || 1;

      const widths = segs.map(s => (s.val / total) * 100);

      stackTrack.innerHTML = "";
      stackLegend.innerHTML = "";

      let left = 0;
      const dom = [];

      for (let i=0;i<segs.length;i++){
        const seg = segs[i];
        const pct = (seg.val/total)*100;

        const w = (i === segs.length-1) ? (100-left) : widths[i];
        const wC = clamp(w,0,100);

        const el = document.createElement("div");
        el.className = "gg-seg";
        el.style.background = seg.color;
        el.style.left = left.toFixed(4) + "%";
        el.style.width = "0%";
        el.dataset.width = wC.toFixed(4);
        el.title = `${seg.name}: ${formatEuro(seg.val)} (${formatPercent(pct)})`;

        stackTrack.appendChild(el);
        dom.push(el);

        const leg = document.createElement("div");
        leg.className = "gg-leg";
        leg.innerHTML = `
          <div class="gg-leg-left">
            <span class="gg-dot" style="background:${seg.color}"></span>
            <span class="gg-leg-name">${escapeHtml(seg.name)}</span>
          </div>
          <div class="gg-leg-val">${formatPercent(pct)} · ${formatEuro(seg.val)}</div>
        `;
        stackLegend.appendChild(leg);

        left += wC;
      }

      setTimeout(()=> {
        dom.forEach(el => el.style.width = (el.dataset.width || "0") + "%");
      }, 80);

      if (distMeta) distMeta.textContent = `Anteile: ${segs.length}`;
    }

    // Risks (Top 3)
    if (risksEl){
      const riskRows = active.map(r=>{
        const offer = num(r.Angebot);
        const paid  = num(r.Gezahlt);
        const prog  = clamp(num(r.Baufortschritt),0,100);
        const payP  = offer>0 ? (paid/offer*100) : 0;
        const delta = payP - prog;
        const score = delta * (offer>0?offer:1);
        return { r, offer, paid, prog, payP, delta, score };
      }).sort((a,b)=> b.score - a.score);

      const top3 = riskRows.slice(0,3);
      risksEl.innerHTML = "";
      top3.forEach(x=>{
        const badge = (x.delta>=0?"+":"") + formatPercent(x.delta);
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

    // Top sums (Top 3)
    if (topSumsEl){
      const topRows = [...active]
        .map(r=>({ r, offer:num(r.Angebot), paid:num(r.Gezahlt), prog:clamp(num(r.Baufortschritt),0,100) }))
        .sort((a,b)=> b.offer - a.offer)
        .slice(0,3);

      topSumsEl.innerHTML = "";
      topRows.forEach(x=>{
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
        const topSum = topRows.reduce((s,x)=> s + x.offer, 0);
        topSumMeta.textContent = `Top 3: ${formatPercent(totalOffer>0 ? (topSum/totalOffer*100) : 0)}`;
      }
    }

    const msgs = [];
    if (riskIndex > 10) msgs.push("Auffällig: Zahlungsquote deutlich über Fortschritt (OP/Abschläge prüfen).");
    if (overallProg < 30) msgs.push("Frühe Phase: Terminplan/Abhängigkeiten eng monitoren.");
    if (totalOffer > 0 && totalPaid > totalOffer) msgs.push("Über Budget gezahlt – Budget/NA prüfen.");

    if (note){
      if (msgs.length){ note.style.display="block"; note.textContent=msgs.join(" "); }
      else { note.style.display="none"; note.textContent=""; }
    }

    function setEmpty(text){
      if (note){ note.style.display="block"; note.textContent=text||"Keine Daten."; }
    }
  }

  function renderAll(){
    document.querySelectorAll(".gewerk-gesamt-modul").forEach(root => render(root));
  }

  function normalizeRow(r, i, projektName, objekt){
    const offer = num(r.Angebot ?? r.Angebotssumme ?? r["Angebot (€)"]);
    const paid  = num(r.Gezahlt ?? r.Zahlungen ?? r.Zahlungen_bisher ?? r["Zahlungen (€)"] ?? r["Zahlungen bisher"]);
    const prog  = clamp(num(r.Baufortschritt ?? r.Baufortschritt_prozent ?? r["Baufortschritt %"] ?? r.Fortschritt), 0, 100);

    return {
      ...r,
      Projekt: r.Projekt || projektName || "",
      Objekt: r.Objekt || objekt || "",
      Aktiv: r.Aktiv || "Ja",
      Sortierung: r.Sortierung ?? (i + 1),
      Angebot: offer,
      Gezahlt: paid,
      Baufortschritt: prog
    };
  }

  function num(v){
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (v === null || v === undefined) return 0;
    let s = String(v).trim().replace(/\s/g,"").replace(/€/g,"");
    const hasComma = s.includes(",");
    const hasDot = s.includes(".");
    if (hasComma && hasDot){ s = s.replace(/\./g,"").replace(",","."); }
    else if (hasComma && !hasDot){ s = s.replace(",","."); }
    s = s.replace(/[^0-9.\-]/g,"");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  function formatEuro(v){
    return new Intl.NumberFormat("de-DE",{ style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(Number(v)||0);
  }

  function formatPercent(v){
    const x = Number(v)||0;
    return (Math.round(x*10)/10).toFixed(1).replace(".",",") + " %";
  }

  function clamp(x,a,b){ return Math.max(a, Math.min(b,x)); }

  function escapeHtml(s){
    return String(s ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  document.addEventListener("DOMContentLoaded", renderAll);
  window.addEventListener("immo:data-ready", () => {
    renderAll();
    setTimeout(renderAll, 120);
    setTimeout(renderAll, 420);
  });
})();
