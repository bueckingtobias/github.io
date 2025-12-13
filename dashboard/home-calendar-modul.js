(function(){
  window.HomeCalendarModul = window.HomeCalendarModul || {};
  window.HomeCalendarModul.rootClass = "home-calendar-root";
  window.HomeCalendarModul.render = render;

  function esc(s){ return String(s||"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m])); }

  function render(root, cfg){
    const webcal = cfg?.calendarWebcal || "";
    root.innerHTML = `
      <div class="hc-head">
        <div>
          <div class="hc-title">Kalender</div>
          <div class="hc-sub">iCloud (published) · Quick View</div>
        </div>
        <div class="hc-sub" id="hcStatus">bereit</div>
      </div>

      <div class="hc-body">
        <div class="hc-card">
          <div class="hc-linkRow">
            <a class="hc-a" id="hcLink" href="${esc(webcal)}">Kalender öffnen (webcal://)</a>
            <button class="hc-btn" id="hcCopy">Link kopieren</button>
          </div>
          <div class="hc-hint" style="margin-top:8px;">
            Hinweis: <strong>webcal://</strong> kann im Browser nicht ausgelesen werden (CORS/Schema).<br>
            Für eine echte Terminliste brauchst du später einen Proxy (webcal → https → ICS).
          </div>
        </div>

        <div class="hc-list" id="hcList">
          ${dummyItems()}
        </div>

        <div class="hc-hint" id="hcHint">
          Aktuell Dummy-Liste. Sobald du einen ICS-Proxy hast, füllen wir das live.
        </div>
      </div>
    `;

    const btn = root.querySelector("#hcCopy");
    btn.addEventListener("click", async ()=>{
      try{
        await navigator.clipboard.writeText(webcal);
        root.querySelector("#hcStatus").textContent = "kopiert ✅";
        setTimeout(()=> root.querySelector("#hcStatus").textContent = "bereit", 1200);
      }catch(e){
        root.querySelector("#hcStatus").textContent = "nicht möglich";
      }
    });
  }

  function dummyItems(){
    const now = new Date();
    const items = [
      { name:"Jour Fixe", time:"Heute 15:00–15:30", loc:"Teams / Office" },
      { name:"Bau Update", time:"Morgen 09:00–10:00", loc:"Baustelle" },
      { name:"Finanzen Review", time:"Fr 16:00–16:45", loc:"Office" }
    ];
    return items.map(x=>`
      <div class="hc-item">
        <div class="hc-top">
          <div class="hc-name">${x.name}</div>
          <div class="hc-time">${x.time}</div>
        </div>
        <div class="hc-loc">${x.loc}</div>
      </div>
    `).join("");
  }
})();