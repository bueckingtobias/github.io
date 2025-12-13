(function(){
  window.HomeCalendarModul = window.HomeCalendarModul || {};
  window.HomeCalendarModul.rootClass = "home-calendar-root";
  window.HomeCalendarModul.render = render;

  // >>> HIER EINTRAGEN nach Deployment (z.B. https://dein-worker.deinname.workers.dev/ics)
  const PROXY_URL = ""; // leer = zeigt Hinweis, dass Proxy fehlt

  function esc(s){ return String(s||"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m])); }

  function pad2(n){ return String(n).padStart(2,"0"); }
  function fmtDate(d){
    try{
      const dd = new Date(d);
      return dd.toLocaleString("de-DE", { weekday:"short", day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
    }catch(_){ return String(d||""); }
  }

  // Minimal ICS parser (VEVENT only, DTSTART/DTEND/SUMMARY/LOCATION/DESCRIPTION)
  function unfoldIcs(text){
    return text.replace(/\r?\n[ \t]/g, "");
  }

  function parseIcsDate(v){
    // Supports:
    // 20251213T120000Z
    // 20251213T120000
    // 20251213 (all-day)
    if(!v) return null;
    const s = String(v).trim();
    const isAllDay = /^\d{8}$/.test(s);
    if(isAllDay){
      const y = s.slice(0,4), m = s.slice(4,6), d = s.slice(6,8);
      return { date: new Date(`${y}-${m}-${d}T00:00:00`), allDay:true };
    }
    const z = s.endsWith("Z");
    const core = z ? s.slice(0,-1) : s;
    const y = core.slice(0,4), mo = core.slice(4,6), da = core.slice(6,8);
    const hh = core.slice(9,11), mm = core.slice(11,13), ss = core.slice(13,15) || "00";
    // interpret as UTC if Z else local
    const iso = `${y}-${mo}-${da}T${hh}:${mm}:${ss}${z ? "Z" : ""}`;
    return { date: new Date(iso), allDay:false };
  }

  function parseIcsEvents(icsText){
    const txt = unfoldIcs(icsText);
    const lines = txt.split(/\r?\n/);
    const events = [];
    let cur = null;

    for(const raw of lines){
      const line = raw.trim();
      if(line === "BEGIN:VEVENT"){ cur = {}; continue; }
      if(line === "END:VEVENT"){
        if(cur){
          events.push(cur);
          cur = null;
        }
        continue;
      }
      if(!cur) continue;

      const idx = line.indexOf(":");
      if(idx < 0) continue;

      const left = line.slice(0, idx);
      const value = line.slice(idx+1);

      const key = left.split(";")[0].toUpperCase();

      if(key === "SUMMARY") cur.summary = value;
      if(key === "LOCATION") cur.location = value;
      if(key === "DESCRIPTION") cur.description = value;

      if(key === "DTSTART"){
        cur.dtstartRaw = value;
        const parsed = parseIcsDate(value);
        if(parsed){ cur.dtstart = parsed.date; cur.allDay = parsed.allDay; }
      }
      if(key === "DTEND"){
        cur.dtendRaw = value;
        const parsed = parseIcsDate(value);
        if(parsed){ cur.dtend = parsed.date; }
      }
    }

    // filter invalid + sort
    const now = new Date();
    return events
      .filter(e => e.dtstart instanceof Date && !isNaN(e.dtstart.getTime()))
      .sort((a,b)=> a.dtstart - b.dtstart)
      .filter(e => e.dtend ? (e.dtend >= now || e.dtstart >= now) : (e.dtstart >= now));
  }

  function renderSkeleton(listEl){
    listEl.innerHTML = `
      <div class="hc-skeleton"></div>
      <div class="hc-skeleton"></div>
      <div class="hc-skeleton"></div>
    `;
  }

  async function fetchIcsViaProxy(webcalUrl){
    if(!PROXY_URL) throw new Error("PROXY_URL ist nicht gesetzt (Worker fehlt).");
    const url = PROXY_URL + "?url=" + encodeURIComponent(webcalUrl);
    const r = await fetch(url, { cache:"no-store" });
    if(!r.ok) throw new Error("Proxy HTTP " + r.status);
    return await r.text();
  }

  function render(root, cfg){
    const webcal = cfg?.calendarWebcal || "";
    root.innerHTML = `
      <div class="hc-head">
        <div>
          <div class="hc-title">Kalender</div>
          <div class="hc-sub">Live via ICS Proxy · iCloud Published</div>
        </div>
        <div class="hc-pill" id="hcStatus">bereit</div>
      </div>

      <div class="hc-body">
        <div class="hc-card">
          <div class="hc-linkRow">
            <a class="hc-a" id="hcLink" href="${esc(webcal)}">Kalender öffnen (webcal://)</a>
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
              <button class="hc-btn" id="hcReload">Reload</button>
              <button class="hc-btn" id="hcCopy">Link kopieren</button>
            </div>
          </div>
          <div class="hc-divider"></div>
          <div class="hc-hint" id="hcHint">
            Lädt Termine… (wenn Proxy konfiguriert ist).
          </div>
        </div>

        <div class="hc-list" id="hcList"></div>
      </div>
    `;

    const statusEl = root.querySelector("#hcStatus");
    const hintEl   = root.querySelector("#hcHint");
    const listEl   = root.querySelector("#hcList");

    renderSkeleton(listEl);

    async function load(){
      statusEl.textContent = "lädt…";
      renderSkeleton(listEl);

      try{
        if(!webcal) throw new Error("Kein Kalender-Link konfiguriert.");

        if(!PROXY_URL){
          statusEl.textContent = "Proxy fehlt";
          hintEl.innerHTML =
            `Damit wir den iCloud Kalender <strong>wirklich auslesen</strong>, brauchst du den Proxy (Cloudflare Worker).<br>` +
            `Sobald du die Worker-URL hast, trage sie oben in <code>PROXY_URL</code> ein.`;
          listEl.innerHTML = `
            <div class="hc-item">
              <div class="hc-top">
                <div class="hc-name">Kalender kann im Browser nicht direkt gelesen werden</div>
                <div class="hc-time">CORS / webcal</div>
              </div>
              <div class="hc-note">
                Du kannst den Kalender-Link trotzdem öffnen (Apple Kalender), aber fürs Dashboard brauchen wir den Proxy.
              </div>
            </div>
          `;
          return;
        }

        const ics = await fetchIcsViaProxy(webcal);
        const events = parseIcsEvents(ics).slice(0, 8);

        if(!events.length){
          statusEl.textContent = "keine Termine";
          hintEl.textContent = "Keine zukünftigen Termine gefunden (oder Kalender ist leer).";
          listEl.innerHTML = `
            <div class="hc-item">
              <div class="hc-top">
                <div class="hc-name">Keine zukünftigen Termine</div>
                <div class="hc-time">—</div>
              </div>
              <div class="hc-note">Wenn du erwartest Termine zu sehen: prüfe, ob der Kalender wirklich „published“ ist.</div>
            </div>
          `;
          return;
        }

        statusEl.textContent = events.length + " Termine";
        hintEl.textContent = "Live aus iCloud ICS (via Proxy).";

        listEl.innerHTML = events.map(ev=>{
          const title = esc(ev.summary || "Termin");
          const time  = ev.allDay ? "Ganztägig" : fmtDate(ev.dtstart);
          const loc   = esc(ev.location || "");
          const desc  = esc((ev.description||"").split("\\n").join("\n")).slice(0, 240);

          return `
            <div class="hc-item">
              <div class="hc-top">
                <div class="hc-name">${title}</div>
                <div class="hc-time">${time}</div>
              </div>
              ${loc ? `<div class="hc-loc">${loc}</div>` : ``}
              ${desc ? `<div class="hc-note">${desc}</div>` : ``}
            </div>
          `;
        }).join("");
      }catch(e){
        statusEl.textContent = "Fehler";
        hintEl.textContent = "Konnte Kalender nicht laden: " + (e?.message || e);
        listEl.innerHTML = `
          <div class="hc-item">
            <div class="hc-top">
              <div class="hc-name">Fehler beim Laden</div>
              <div class="hc-time">—</div>
            </div>
            <div class="hc-note">${esc(e?.message || String(e))}</div>
          </div>
        `;
      }
    }

    root.querySelector("#hcReload").addEventListener("click", load);
    root.querySelector("#hcCopy").addEventListener("click", async ()=>{
      try{
        await navigator.clipboard.writeText(webcal);
        statusEl.textContent = "kopiert ✅";
        setTimeout(()=> statusEl.textContent = "bereit", 1200);
      }catch(_){
        statusEl.textContent = "nicht möglich";
      }
    });

    load();
  }
})();