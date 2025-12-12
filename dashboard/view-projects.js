(function(){

  const elTabs = document.getElementById("vpTabs");
  const elGesamtSlot = document.getElementById("vpGesamtSlot");
  const elGrid = document.getElementById("vpGewerkeGrid");
  const elHint = document.getElementById("vpHint");
  const elError = document.getElementById("vpError");

  const FILE_GESAMT_HTML = "./gewerk-gesamt-modul.html";
  const FILE_GEWERK_HTML = "./gewerk-modul.html";

  const PROJECTS = [
    {
      key:"baum35",
      name:"Baumstraße 35",
      rows:[
        {"Sortierung":1,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Rohbau","Handwerker":"Bauunternehmen Meyer","Angebotssumme (€)":320000,"Zahlungen bisher (€)":210000,"Offene Rechnungen (€)":18000,"Baufortschritt (%)":70},
        {"Sortierung":2,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Elektro","Handwerker":"Elektro Schröder","Angebotssumme (€)":95000,"Zahlungen bisher (€)":65000,"Offene Rechnungen (€)":9000,"Baufortschritt (%)":30},
        {"Sortierung":3,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Heizung/Sanitär","Handwerker":"Haustechnik Müller","Angebotssumme (€)":145000,"Zahlungen bisher (€)":60000,"Offene Rechnungen (€)":12000,"Baufortschritt (%)":40},
        {"Sortierung":4,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Fenster/Türen","Handwerker":"Tischlerei Becker","Angebotssumme (€)":78000,"Zahlungen bisher (€)":52000,"Offene Rechnungen (€)":0,"Baufortschritt (%)":85},
        {"Sortierung":5,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Dach","Handwerker":"Dachdecker Hofmann","Angebotssumme (€)":112000,"Zahlungen bisher (€)":90000,"Offene Rechnungen (€)":6000,"Baufortschritt (%)":90},
        {"Sortierung":6,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Innenputz","Handwerker":"Malerbetrieb König","Angebotssumme (€)":54000,"Zahlungen bisher (€)":15000,"Offene Rechnungen (€)":11000,"Baufortschritt (%)":25},
        {"Sortierung":7,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Bodenbeläge","Handwerker":"Bodenstudio Nord","Angebotssumme (€)":68000,"Zahlungen bisher (€)":10000,"Offene Rechnungen (€)":0,"Baufortschritt (%)":15},
        {"Sortierung":8,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Fliesenarbeiten","Handwerker":"Fliesen Schulte","Angebotssumme (€)":42000,"Zahlungen bisher (€)":21000,"Offene Rechnungen (€)":0,"Baufortschritt (%)":50},
        {"Sortierung":9,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Außenanlagen","Handwerker":"Gartenbau Grünwerk","Angebotssumme (€)":60000,"Zahlungen bisher (€)":12000,"Offene Rechnungen (€)":8000,"Baufortschritt (%)":20},
        {"Sortierung":10,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Photovoltaik","Handwerker":"Solartechnik Bremen","Angebotssumme (€)":98000,"Zahlungen bisher (€)":49000,"Offene Rechnungen (€)":0,"Baufortschritt (%)":45}
      ]
    },
    {
      key:"hof",
      name:"Hof Ganderkesee",
      rows:[
        {"Sortierung":1,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Rohbau","Handwerker":"Meyer","Angebotssumme (€)":410000,"Zahlungen bisher (€)":310000,"Offene Rechnungen (€)":22000,"Baufortschritt (%)":78},
        {"Sortierung":2,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Elektro","Handwerker":"Schröder","Angebotssumme (€)":120000,"Zahlungen bisher (€)":45000,"Offene Rechnungen (€)":14000,"Baufortschritt (%)":35},
        {"Sortierung":3,"Aktiv (Ja/Nein)":"Ja","Gewerk":"Innenausbau","Handwerker":"König","Angebotssumme (€)":180000,"Zahlungen bisher (€)":90000,"Offene Rechnungen (€)":19000,"Baufortschritt (%)":52}
      ]
    }
  ];

  let activeKey = PROJECTS[0]?.key || "";

  function showError(msg){
    if(!elError) return;
    elError.style.display="block";
    elError.textContent=msg;
  }

  function clearError(){
    if(!elError) return;
    elError.style.display="none";
    elError.textContent="";
  }

  async function fetchText(url){
    const r = await fetch(url, { cache:"no-store" });
    if(!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
    return await r.text();
  }

  function activeProject(){
    return PROJECTS.find(p=>p.key===activeKey) || PROJECTS[0];
  }

  function activeRows(project){
    return (project.rows || [])
      .filter(r => (""+(r["Aktiv (Ja/Nein)"]||"")).toLowerCase().startsWith("j"))
      .sort((a,b)=>(a["Sortierung"] ?? 9999)-(b["Sortierung"] ?? 9999))
      .slice(0,10);
  }

  function renderTabs(){
    if(!elTabs) return;
    elTabs.innerHTML="";
    PROJECTS.forEach(p=>{
      const t=document.createElement("div");
      t.className="vp-tab"+(p.key===activeKey?" is-active":"");
      t.textContent=p.name;
      t.onclick=()=>{
        activeKey=p.key;
        renderTabs();
        renderAll();
      };
      elTabs.appendChild(t);
    });
  }

  function bust(){ return "v=" + Date.now(); }

  function loadCssOnce(id, href){
    let l = document.getElementById(id);
    if(!l){
      l = document.createElement("link");
      l.id = id;
      l.rel = "stylesheet";
      document.head.appendChild(l);
    }
    l.href = href + (href.includes("?") ? "&" : "?") + bust();
  }

  async function loadScriptFresh(id, src){
    const old = document.getElementById(id);
    if(old) old.remove();

    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.id = id;
      s.src = src + (src.includes("?") ? "&" : "?") + bust();
      s.onload = res;
      s.onerror = () => rej(new Error("Script konnte nicht geladen werden: " + s.src));
      document.head.appendChild(s);
    });
  }

  async function ensureGesamtAssets(){
    loadCssOnce("css-gesamt", "./gewerk-gesamt-modul.css");
    await loadScriptFresh("js-gesamt", "./gewerk-gesamt-modul.js");
    if(!window.GewerkGesamtModul || typeof window.GewerkGesamtModul.render !== "function"){
      throw new Error("GewerkGesamtModul.render fehlt nach Script-Load.");
    }
  }

  async function ensureGewerkAssets(){
    loadCssOnce("css-gewerk", "./gewerk-modul.css");
    await loadScriptFresh("js-gewerk", "./gewerk-modul.js");
    if(!window.GewerkModul || typeof window.GewerkModul.render !== "function"){
      throw new Error("GewerkModul.render fehlt nach Script-Load.");
    }
  }

  async function renderAll(){
    clearError();

    const project = activeProject();
    if(!project){
      showError("Keine Projekte gefunden.");
      return;
    }

    const rows = activeRows(project);
    if(elHint){
      elHint.textContent = `Projekt: ${project.name} · aktive Gewerke: ${rows.length}`;
    }

    /* ===== 1) Gesamtmodul ===== */
    try{
      const html = await fetchText(FILE_GESAMT_HTML);
      elGesamtSlot.innerHTML = html;

      await ensureGesamtAssets();

      const root = elGesamtSlot.querySelector(".gewerk-gesamt-root");
      if(!root) throw new Error("Container .gewerk-gesamt-root fehlt in gewerk-gesamt-modul.html");

      window.GewerkGesamtModul.render(root, project.rows, project.name + " – Gesamtübersicht");
    }catch(e){
      showError(
        "Gesamtmodul Fehler:\n" + (e?.message || e) + "\n\n" +
        "Check:\n" +
        "- /dashboard/gewerk-gesamt-modul.html\n" +
        "- /dashboard/gewerk-gesamt-modul.css\n" +
        "- /dashboard/gewerk-gesamt-modul.js\n"
      );
      return;
    }

    /* ===== 2) Gewerkmodule (10x) ===== */
    try{
      const gewerkHTML = await fetchText(FILE_GEWERK_HTML);
      await ensureGewerkAssets();

      elGrid.innerHTML = "";

      if(!rows.length){
        elGrid.innerHTML = `<div style="color:rgba(226,232,240,.72);font-size:12px;padding:6px 2px;">Keine aktiven Gewerke.</div>`;
        return;
      }

      rows.forEach(row=>{
        const slot = document.createElement("div");
        slot.innerHTML = gewerkHTML;

        const root = slot.querySelector(".gewerk-modul-root");
        if(!root) throw new Error("Container .gewerk-modul-root fehlt in gewerk-modul.html");

        window.GewerkModul.render(root, row, { projektName: project.name });

        elGrid.appendChild(slot);
      });

    }catch(e){
      showError(
        "Gewerk-Module Fehler:\n" + (e?.message || e) + "\n\n" +
        "Check:\n" +
        "- /dashboard/gewerk-modul.html\n" +
        "- /dashboard/gewerk-modul.css\n" +
        "- /dashboard/gewerk-modul.js\n"
      );
      return;
    }
  }

  window.addEventListener("DOMContentLoaded", ()=>{
    renderTabs();
    renderAll();
  });

})();