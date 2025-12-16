(function () {
  window.GewerkModul = { renderAll };

  function renderAll() {
    const roots = document.querySelectorAll(".gewerk-modul");
    const rows =
      window.IMMO_MASTER_DATA?.projects?.gewerke ||
      window.IMMO_DATA?.projects?.gewerke ||
      [];

    roots.forEach((root, idx) => {
      const r = rows[idx];
      if (!r) return;

      const offer = num(r.Angebot);
      const paid = num(r.Gezahlt);
      const prog = clamp(num(r.Baufortschritt), 0, 100);

      const payPct = offer > 0 ? (paid / offer * 100) : 0;

      root.querySelector("#gmTitle").textContent =
        r.Gewerk || "Gewerk";

      root.querySelector("#gmSub").textContent =
        `${r.Handwerker || ""} · ${r.Projekt || ""}`;

      root.querySelector("#gmOffer").textContent = eur(offer);
      root.querySelector("#gmPaid").textContent = eur(paid);
      root.querySelector("#gmProg").textContent = pct(prog);

      root.querySelector("#gmPayLabel").textContent =
        `${eur(paid)} / ${eur(offer)}`;

      root.querySelector("#gmProgLabel").textContent =
        pct(prog);

      const payBar = root.querySelector("#gmPayBar");
      const progBar = root.querySelector("#gmProgBar");

      payBar.style.width = "0%";
      progBar.style.width = "0%";

      requestAnimationFrame(() => {
        payBar.style.width = clamp(payPct, 0, 100) + "%";
        progBar.style.width = prog + "%";
      });

      const badge = root.querySelector("#gmStatus");
      badge.textContent = payPct > prog ? "Kosten > Fortschritt" : "OK";
    });
  }

  function num(v) {
    if (typeof v === "number") return v;
    if (!v) return 0;
    return Number(String(v).replace(/\./g, "").replace(",", ".")) || 0;
  }

  function eur(v) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    }).format(v || 0);
  }

  function pct(v) {
    return (Math.round(v * 10) / 10).toFixed(1).replace(".", ",") + " %";
  }

  function clamp(x, a, b) {
    return Math.max(a, Math.min(b, x));
  }

  document.addEventListener("DOMContentLoaded", renderAll);
  window.addEventListener("immo:data-ready", renderAll);
})();
