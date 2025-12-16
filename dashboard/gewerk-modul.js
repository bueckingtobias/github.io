(function(){
  "use strict";

  window.GewerkModul = { render };

  function render(mountEl, opts){
    const root =
      (mountEl && mountEl.querySelector && mountEl.querySelector(".gewerk-modul")) ||
      mountEl ||
      document.querySelector(".gewerk-modul");

    if (!root) return;

    const index = Number(opts && opts.index != null ? opts.index : 0);

    const title = root.querySelector("#gmTitle");
    const sub = root.querySelector("#gmSub");
    const tag = root.querySelector("#gmTag");

    const payMeta = root.querySelector("#gmPayMeta");
    const progMeta = root.querySelector("#gmProgMeta");

    const payBar = root.querySelector("#gmPayBar");
    const progBar = root.querySelector("#gmProgBar");

    const payTxt = root.querySelector("#gmPayTxt");
    const progTxt = root.querySelector("#gmProgTxt");

    const foot = root.querySelector("#gmFoot");

    const all = window.IMMO_DATA?.projects?.gewerke;
    const rows = Array.isArray(all) ? all : [];

    const active = rows
      .filter(r => String(r.Aktiv || "Ja").toLowerCase().startsWith("j"))
      .sort((a,b)=> num(a.Sortierung) - num(b.Sortierung));

    const r = active[index];

    if (!r){
      setEmpty(`Kein Gewerk für Index ${index}. Aktive Gewerke: ${active.length}.`);
      return;
    }

    const gewerk = r.Gewerk || "Gewerk";
    const handwerker = r.Handwerker || "Handwerker";

    const offer = num(r.Angebot ?? r.Angebotssumme ?? r["Angebot (€)"]);
    const paid  = num(r.Gezahlt ?? r.Zahlungen ?? r.Zahlungen_bisher ?? r["Zahlungen (€)"]);
    const prog  = num(r.Baufortschritt ?? r.Baufortschritt_prozent ?? r["Baufortschritt %"]);

    const payPct = offer > 0 ? (paid / offer * 100) : 0;
    const payClamp = clamp(payPct, 0, 100);
    const progClamp = clamp(prog, 0, 100);

    const isWarn = payPct > prog; // Kostenquote > Fortschritt

    if (title) title.textContent = `${gewerk} · ${handwerker}`;
    if (sub) sub.textContent = `${formatEuro(paid)} / ${formatEuro(offer)} · Fortschritt ${formatPercent(prog)}`;
    if (tag) tag.textContent = isWarn ? "Kosten > Fortschritt" : "OK";

    if (payMeta) payMeta.textContent = `${formatPercent(payPct)} · ${formatEuro(paid)} / ${formatEuro(offer)}`;
    if (progMeta) progMeta.textContent = `${formatPercent(prog)} · Ziel 100 %`;

    if (payTxt) payTxt.textContent = formatPercent(payPct);
    if (progTxt) progTxt.textContent = formatPercent(prog);

    // animate
    if (payBar) payBar.style.width = "0%";
    if (progBar) progBar.style.width = "0%";

    requestAnimationFrame(() => {
      if (payBar) payBar.style.width = payClamp + "%";
      if (progBar) progBar.style.width = progClamp + "%";
    });

    if (foot){
      const deltaPct = payPct - prog;
      const deltaTxt = (deltaPct >= 0 ? "+" : "") + formatPercent(deltaPct);
      const rest = Math.max(0, offer - paid);
      foot.textContent =
        `Abweichung (Quote): ${deltaTxt} · Restbudget: ${formatEuro(rest)} · ` +
        `Hinweis: ${isWarn ? "Abschläge/NA prüfen." : "Im Plan."}`;
    }

    function setEmpty(text){
      if (title) title.textContent = "—";
      if (sub) sub.textContent = "—";
      if (tag) tag.textContent = "—";
      if (payMeta) payMeta.textContent = "—";
      if (progMeta) progMeta.textContent = "—";
      if (payTxt) payTxt.textContent = "";
      if (progTxt) progTxt.textContent = "";
      if (payBar) payBar.style.width = "0%";
      if (progBar) progBar.style.width = "0%";
      if (foot) foot.textContent = text || "Keine Daten.";
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
    return new Intl.NumberFormat("de-DE",{ style:"currency", currency:"EUR", maximum