(function () {
  window.GewerkModul = { renderAll };

  function renderAll() {
    const roots = document.querySelectorAll(".gewerk-modul");
    if (!roots.length) return;

    // Prefer master
    let rows =
      window.IMMO_MASTER_DATA?.projects?.gewerke ||
      window.IMMO_DATA?.projects?.gewerke ||
      [];

    if (!Array.isArray(rows)) rows = [];

    // Normalize + filter active + sort
    const list = rows
      .map((r, i) => normalizeRow(r, i))
      .filter(r => String(r.Aktiv || "Ja").toLowerCase().startsWith("j"))
      .sort((a, b) => (num(a.Sortierung) || 9999) - (num(b.Sortierung) || 9999));

    // Fill modules in order
    roots.forEach((root, idx) => {
      const r = list[idx];
      if (!r) return; // keep placeholders if fewer rows than modules

      const offer = num(r.Angebot);
      const paid = num(r.Gezahlt);
      const prog = clamp(num(r.Baufortschritt), 0, 100);

      const payPct = offer > 0 ? (paid / offer * 100) : 0;

      const elTitle = root.querySelector("#gmTitle");
      const elSub = root.querySelector("#gmSub");
      const elOffer = root.querySelector("#gmOffer");
      const elPaid = root.querySelector("#gmPaid");
      const elProg = root.querySelector("#gmProg");
      const elPayLabel = root.querySelector("#gmPayLabel");
      const elProgLabel = root.querySelector("#gmProgLabel");
      const payBar = root.querySelector("#gmPayBar");
      const progBar = root.querySelector("#gmProgBar");
      const badge = root.querySelector("#gmStatus");

      if (elTitle) elTitle.textContent = r.Gewerk || "Gewerk";
      if (elSub) elSub.textContent = `${r.Handwerker || ""}${r.Projekt ? " · " + r.Projekt : ""}`;

      if (elOffer) elOffer.textContent = eur(offer);
      if (elPaid) elPaid.textContent = eur(paid);
      if (elProg) elProg.textContent = pct(prog);

      if (elPayLabel) elPayLabel.textContent = `${eur(paid)} / ${eur(offer)}`;
      if (elProgLabel) elProgLabel.textContent = pct(prog);

      if (badge) badge.textContent = (payPct > prog) ? "Kosten > Fortschritt" : "OK";

      if (payBar) payBar.style.width = "0%";
      if (progBar) progBar.style.width = "0%";

      requestAnimationFrame(() => {
        if (payBar) payBar.style.width = clamp(payPct, 0, 100) + "%";
        if (progBar) progBar.style.width = prog + "%";
      });
    });
  }

  function normalizeRow(r, i) {
    // accept multiple key variants (robust)
    const offer = num(
      r.Angebot ?? r.Angebotssumme ?? r["Angebot (€)"] ?? r.Angebot_EUR
    );

    const paid = num(
      r.Gezahlt ?? r.Zahlungen ?? r.Zahlungen_bisher ?? r["Zahlungen (€)"] ?? r["Zahlungen bisher"]
    );

    const prog = num(
      r.Baufortschritt ?? r.Baufortschritt_prozent ?? r["Baufortschritt %"] ?? r["Fortschritt_%"] ?? r.Fortschritt
    );

    return {
      ...r,
      Aktiv: r.Aktiv || "Ja",
      Sortierung: r.Sortierung ?? (i + 1),
      Angebot: offer,
      Gezahlt: paid,
      Baufortschritt: prog
    };
  }

  function num(v) {
    if (typeof v === "number") return v;
    if (v === null || v === undefined || v === "") return 0;

    let s = String(v).trim().replace(/\s/g, "").replace(/€/g, "");
    const hasComma = s.includes(",");
    const hasDot = s.includes(".");

    if (hasComma && hasDot) {
      // "1.234,56" -> "1234.56"
      const lc = s.lastIndexOf(",");
      const ld = s.lastIndexOf(".");
      if (lc > ld) s = s.replace(/\./g, "").replace(",", ".");
      else s = s.replace(/,/g, "");
    } else if (hasComma && !hasDot) {
      s = s.replace(",", ".");
    }

    s = s.replace(/[^0-9.\-]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  function eur(v) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    }).format(Number(v) || 0);
  }

  function pct(v) {
    const x = Number(v) || 0;
    return (Math.round(x * 10) / 10).toFixed(1).replace(".", ",") + " %";
  }

  function clamp(x, a, b) {
    return Math.max(a, Math.min(b, x));
  }

  document.addEventListener("DOMContentLoaded", renderAll);
  window.addEventListener("immo:data-ready", renderAll);
})();
