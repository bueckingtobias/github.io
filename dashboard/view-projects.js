/* ===================================
   view-projects.js
   =================================== */

(function(){

  const elTabs = document.getElementById("vpTabs");
  const elGesamtSlot = document.getElementById("vpGesamtSlot");
  const elGrid = document.getElementById("vpGewerkeGrid");
  const elHint = document.getElementById("vpHint");
  const elError = document.getElementById("vpError");

  const FILE_GESAMT_HTML = "./gewerk-gesamt-modul.html";

  /* Demo-Projekte (Excel kommt danach) */
  const PROJECTS = [
    {
      key:"baum35",
      name:"Baumstraße 35",
      rows:[
        {"Aktiv (Ja/Nein)":"Ja","Gewerk":"Rohbau","Handwerker":"Meyer","Angebotssumme (€)":320000,"Zahlungen bisher (€)":210000,"Offene Rechnungen (€)":18000,"Baufortschritt (%)":70},
        {"Aktiv (Ja/Nein)":"Ja","Gewerk":"Elektro","Handwerker":"Schröder","Angebotssumme (€)":95000,"Zahlungen bisher (€)":65000,"Offene Rechnungen (€)":9000,"Baufortschritt (%)":30}
      ]
    },
    {
      key:"hof",
      name:"Hof Ganderkesee",
      rows:[
        {"Aktiv (Ja/Nein)":"Ja","Gewerk":"Rohbau","Handwerker":"Meyer","Angebotssumme (€)":410000,"Zahlungen bisher (€)":310000,"Offene Rechnungen (€)":22000,"Baufortschritt (%)":78}
      ]
    }
  ];

  let activeKey = PROJECTS[0].key;

  function showError(msg){
    elError.style.display="block";
    elError.textContent=msg;
  }

  function clearError(){
    elError.style.display="none";
    elError.textContent="";
  }

  async function fetchText(url){
    const r = await fetch(url,{cache:"no-store"});
    if(!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
    return await r.text();
  }

  function renderTabs(){
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

  async function ensureGesamtAssets(){
    if(!document.getElementById("css-gesamt")){
      const l=document.createElement("link");
      l.id="css-gesamt";
      l.rel="stylesheet";
      l.href="./gewerk-gesamt-modul.css";
      document.head.appendChild(l);
    }

    if(!window.GewerkGesamtModul){
      await new Promise((res,rej)=>{
        const s=document.createElement("script");
        s.src="./gewerk-gesamt-modul.js";
        s.onload=res;
        s.onerror=()=>rej(new Error("gewerk-gesamt-modul.js nicht geladen"));
        document.head.appendChild(s);
      });
    }
  }

  async function renderAll(){
    clearError();

    const project = PROJECTS.find(p=>p.key===activeKey);
    if(!project) return;

    elHint.textContent=`Projekt: ${project.name} · aktive Gewerke: ${project.rows.length}`;

    try{
      const html = await fetchText(FILE_GESAMT_HTML);
      elGesamtSlot.innerHTML = html;

      await ensureGesamtAssets();

      const root = elGesamtSlot.querySelector(".gewerk-gesamt-root");
      window.GewerkGesamtModul.render(
        root,
        project.rows,
        project.name+" – Gesamtübersicht"
      );

    }catch(e){
      showError("Gesamtmodul Fehler:\n"+e.message);
      return;
    }

    /* Platzhalter für Gewerk-Module (kommen als Nächstes) */
    elGrid.innerHTML="";
  }

  window.addEventListener("DOMContentLoaded",()=>{
    renderTabs();
    renderAll();
  });

})();