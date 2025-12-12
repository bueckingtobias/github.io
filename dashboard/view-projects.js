/* ================================
   view-projects.js  (CSP-safe, robust)
   Ordner: /dashboard
================================== */

(function () {
  const elTabs = document.getElementById("vpTabs");
  const elGesamtSlot = document.getElementById("vpGesamtSlot");
  const elGrid = document.getElementById("vpGewerkeGrid");
  const elHint = document.getElementById("vpHint");
  const elErr = document.getElementById("vpError");
  const elBody = document.getElementById("vpBody");

  const FILE_GESAMT_HTML = "./gewerk-gesamt-modul.html";
  const FILE_GEWERK_HTML = "./gewerk-modul.html";

  function showError(msg) {
    if (!elErr) return;
    elErr.style.display = "block";
    elErr.textContent = msg;
  }
  function clearError() {
    if (!elErr) return;
    elErr.style.display = "none";
    elErr.textContent = "";
  }

  async function fetchText(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch fehlgeschlagen: ${url} (HTTP ${res.status})`);
    return await res.text();
  }

  // Wenn du HTML per innerHTML einfügst, laufen Scripts nicht -> optional reinject
  function reinjectScripts(container) {
    const scripts = Array.from(container.querySelectorAll("script"));
    scripts.forEach((old) => {
      const s = document.createElement("script");
      for (const a of Array.from(old.attributes)) s.setAttribute(a.name, a.value);
      s.textContent = old.textContent;
      old.replaceWith(s);
    });
  }

  // Projekte (jetzt Demo / später Excel)
  // Struktur entspricht deiner Excel: "Aktiv (Ja/Nein)", "Sortierung", "Gewerk", "Handwerker", etc.
  const PROJECTS = [
    {
      key: "baum35",
      name: "Baumstraße 35",
      rows: [
        {"Sortierung":1,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Rohbau","Handwerker":"Meyer","Angebotssumme (€)":320000,"Zahlungen bisher (€)":210000,"Offene Rechnungen (€)":18000,"Baufortschritt (%)":70},
        {"Sortierung":2,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Elektro","Handwerker":"Schröder","Angebotssumme (€)":95000,"Zahlungen bisher (€)":65000,"Offene Rechnungen (€)":9000,"Baufortschritt (%)":30},
        {"Sortierung":3,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Heizung/Sanitär","Handwerker":"Müller","Angebotssumme (€)":145000,"Zahlungen bisher (€)":60000,"Offene Rechnungen (€)":12000,"Baufortschritt (%)":40},
        {"Sortierung":4,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Fenster/Türen","Handwerker":"Becker","Angebotssumme (€)":78000,"Zahlungen bisher (€)":52000,"Offene Rechnungen (€)":0,"Baufortschritt (%)":85},
        {"Sortierung":5,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Dach","Handwerker":"Hofmann","Angebotssumme (€)":112000,"Zahlungen bisher (€)":90000,"Offene Rechnungen (€)":6000,"Baufortschritt (%)":90},
        {"Sortierung":6,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Innenputz","Handwerker":"König","Angebotssumme (€)":54000,"Zahlungen bisher (€)":15000,"Offene Rechnungen (€)":11000,"Baufortschritt (%)":25},
        {"Sortierung":7,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Bodenbeläge","Handwerker":"Nord","Angebotssumme (€)":68000,"Zahlungen bisher (€)":10000,"Offene Rechnungen (€)":0,"Baufortschritt (%)":15},
        {"Sortierung":8,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Fliesen","Handwerker":"Schulte","Angebotssumme (€)":42000,"Zahlungen bisher (€)":21000,"Offene Rechnungen (€)":0,"Baufortschritt (%)":50},
        {"Sortierung":9,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Außenanlagen","Handwerker":"Grünwerk","Angebotssumme (€)":60000,"Zahlungen bisher (€)":12000,"Offene Rechnungen (€)":8000,"Baufortschritt (%)":20},
        {"Sortierung":10,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Photovoltaik","Handwerker":"Solar Bremen","Angebotssumme (€)":98000,"Zahlungen bisher (€)":49000,"Offene Rechnungen (€)":0,"Baufortschritt (%)":45}
      ]
    },
    {
      key: "hof",
      name: "Hof Ganderkesee",
      rows: [
        {"Sortierung":1,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Rohbau","Handwerker":"Meyer","Angebotssumme (€)":410000,"Zahlungen bisher (€)":310000,"Offene Rechnungen (€)":22000,"Baufortschritt (%)":78},
        {"Sortierung":2,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Elektro","Handwerker":"Schröder","Angebotssumme (€)":120000,"Zahlungen bisher (€)":45000,"Offene Rechnungen (€)":14000,"Baufortschritt (%)":35}
      ]
    }
  ];

  let activeKey = PROJECTS[0]?.key || "baum35";

  function renderTabs() {
    if (!elTabs) return;
    elTabs.innerHTML = "";
    PROJECTS.forEach((p) => {
      const t = document.createElement("div");
      t.className = "vp-tab" + (p.key === activeKey ? " is-active" : "");
      t.textContent = p.name;
      t.addEventListener("click", () => {
        activeKey = p.key;
        renderTabs();
        renderAll().then(() => {
          if (elBody) elBody.scrollTo({ top: 0, behavior: "smooth" });
        });
      });
      elTabs.appendChild(t);
    });
  }

  function activeProject() {
    return PROJECTS.find((p) => p.key === activeKey) || PROJECTS[0];
  }

  async function renderAll() {
    clearError();
    const p = activeProject();
    if (!p) return;

    // global rows für Gesamtmodul (damit es auch standalone funktionieren kann)
    window.__PROJECT_ROWS__ = p.rows;

    // Hint (Debug, aber clean)
    if (elHint) {
      elHint.textContent =
        `Projekt: ${p.name} · aktive Gewerke: ${
          p.rows.filter(r => (""+(r["Aktiv (Ja/Nein)"]||"")).toLowerCase().startsWith("j")).length
        } · Dateien: ${FILE_GESAMT_HTML}, ${FILE_GEWERK_HTML}`;
    }

    // 1) Gesamtmodul laden
    try {
      const htmlGesamt = await fetchText(FILE_GESAMT_HTML);
      elGesamtSlot.innerHTML = htmlGesamt;
      reinjectScripts(elGesamtSlot); // falls du irgendwo inline drin hast (sicher ist sicher)
    } catch (e) {
      showError(
        `Gesamtmodul konnte nicht geladen werden.\n\n${String(e?.message || e)}\n\n` +
        `Check:\n- Liegt gewerk-gesamt-modul.html im /dashboard Ordner?\n- Dateiname exakt (case!)?\n- Öffne direkt: /dashboard/gewerk-gesamt-modul.html`
      );
      return;
    }

    // 2) Gewerkmodul Template laden
    let tpl;
    try {
      tpl = await fetchText(FILE_GEWERK_HTML);
    } catch (e) {
      showError(
        `Gewerkmodul Template konnte nicht geladen werden.\n\n${String(e?.message || e)}\n\n` +
        `Check:\n- Liegt gewerk-modul.html im /dashboard Ordner?\n- Dateiname exakt (case!)?\n- Öffne direkt: /dashboard/gewerk-modul.html`
      );
      return;
    }

    // 3) 10x Gewerkmodule rendern
    elGrid.innerHTML = "";

    const rows = p.rows
      .filter(r => (""+(r["Aktiv (Ja/Nein)"]||"")).toLowerCase().startsWith("j"))
      .sort((a,b) => (a["Sortierung"] ?? 9999) - (b["Sortierung"] ?? 9999))
      .slice(0, 10);

    rows.forEach((row) => {
      const slot = document.createElement("div");
      slot.innerHTML = tpl;

      // Payload fürs Gewerk-Modul (wird in gewerk-modul.js gelesen)
      const payload = {
        projekt: p.name,
        gewerk: (row["Gewerk"] || "") + (row["Handwerker"] ? (" – " + row["Handwerker"]) : ""),
        angebot: row["Angebotssumme (€)"] || 0,
        zahlungen: row["Zahlungen bisher (€)"] || 0,
        offeneRechnungen: row["Offene Rechnungen (€)"] || 0,
        fortschritt: row["Baufortschritt (%)"] || 0,
        owner: "Tobi",
        lastUpdate: ""
      };

      const root = slot.querySelector(".gewerk-modul-root");
      if (root) root.dataset.payload = JSON.stringify(payload);

      // Falls tpl inline scripts hätte (sollte es nicht): reinject
      reinjectScripts(slot);

      elGrid.appendChild(slot);
    });
  }

  // Boot
  window.addEventListener("DOMContentLoaded", () => {
    renderTabs();
    renderAll().catch((e) => {
      showError("Unerwarteter Fehler beim Rendern:\n\n" + String(e?.message || e));
      console.error(e);
    });
  });
})();