(function(){
  window.HomeCalendarModul = window.HomeCalendarModul || {};
  window.HomeCalendarModul.rootClass = "home-calendar-root";
  window.HomeCalendarModul.render = render;

  // ===== Config (kannst du später aus Excel speisen) =====
  const DEFAULT_RENT_DAY = 1; // 1..28 empfohlen
  const STORAGE_KEY = "DASH_HOME_USER_EVENTS_V1";
  const STORAGE_CFG = "DASH_HOME_CAL_CFG_V1";

  function esc(s){ return String(s||"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m])); }

  function ymd(d){
    const x = new Date(d);
    const y = x.getFullYear();
    const m = String(x.getMonth()+1).padStart(2,"0");
    const da= String(x.getDate()).padStart(2,"0");
    return `${y}-${m}-${da}`;
  }

  function addDays(date, n){
    const d = new Date(date);
    d.setDate(d.getDate()+n);
    return d;
  }

  function startOfMonth(y,m){ return new Date(y, m, 1); }
  function endOfMonth(y,m){ return new Date(y, m+1, 0); }

  function monthLabel(d){
    return d.toLocaleDateString("de-DE",{ month:"long", year:"numeric" });
  }

  function dowLabels(){
    // Monday-first
    return ["Mo","Di","Mi","Do","Fr","Sa","So"];
  }

  // ===== Holidays (Germany national) =====
  // We implement: fixed + Easter-based.
  function easterSunday(year){
    // Anonymous Gregorian algorithm (Meeus/Jones/Butcher)
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19*a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2*e + 2*i - h - k) % 7;
    const m = Math.floor((a + 11*h + 22*l) / 451);
    const month = Math.floor((h + l - 7*m + 114) / 31); // 3=March, 4=April
    const day = ((h + l - 7*m + 114) % 31) + 1;
    return new Date(year, month-1, day);
  }

  function holidayMapForYear(year){
    const map = new Map();

    const fixed = [
      { mmdd:"01-01", name:"Neujahr" },
      { mmdd:"05-01", name:"Tag der Arbeit" },
      { mmdd:"10-03", name:"Tag der Deutschen Einheit" },
      { mmdd:"12-25", name:"1. Weihnachtstag" },
      { mmdd:"12-26", name:"2. Weihnachtstag" }
    ];
    fixed.forEach(h=>{
      map.set(`${year}-${h.mmdd}`, h.name);
    });

    const easter = easterSunday(year);
    const goodFriday = addDays(easter, -2);
    const easterMonday = addDays(easter, 1);
    const ascension = addDays(easter, 39);
    const whitMonday = addDays(easter, 50);

    map.set(ymd(goodFriday), "Karfreitag");
    map.set(ymd(easterMonday), "Ostermontag");
    map.set(ymd(ascension), "Christi Himmelfahrt");
    map.set(ymd(whitMonday), "Pfingstmontag");

    return map;
  }

  function loadUserEvents(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if(!Array.isArray(arr)) return [];
      return arr
        .filter(e=>e && typeof e === "object")
        .map(e=>({ id:e.id||cryptoId(), title:String(e.title||"").trim(), date:String(e.date||"") }))
        .filter(e=>e.title && /^\d{4}-\d{2}-\d{2}$/.test(e.date));
    }catch(_){ return []; }
  }

  function saveUserEvents(events){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }

  function loadCfg(){
    try{
      const raw = localStorage.getItem(STORAGE_CFG);
      const cfg = raw ? JSON.parse(raw) : {};
      const rentDay = clampInt(cfg.rentDay ?? DEFAULT_RENT_DAY, 1, 28);
      return { rentDay };
    }catch(_){
      return { rentDay: DEFAULT_RENT_DAY };
    }
  }

  function saveCfg(cfg){
    localStorage.setItem(STORAGE_CFG, JSON.stringify(cfg));
  }

  function clampInt(v, a, b){
    const n = Math.floor(Number(v));
    if(!isFinite(n)) return a;
    return Math.max(a, Math.min(b, n));
  }

  function cryptoId(){
    // simple id, no dependency
    return "e_" + Math.random().toString(36).slice(2,10) + Date.now().toString(36);
  }

  function nextRentDate(fromDate, rentDay){
    const d = new Date(fromDate);
    const y = d.getFullYear();
    const m = d.getMonth();

    const thisMonthRent = new Date(y, m, rentDay);
    if(thisMonthRent >= stripTime(d)) return thisMonthRent;

    // next month
    return new Date(y, m+1, rentDay);
  }

  function stripTime(d){
    const x = new Date(d);
    x.setHours(0,0,0,0);
    return x;
  }

  function daysBetween(a,b){
    const A = stripTime(a).getTime();
    const B = stripTime(b).getTime();
    return Math.round((B - A) / (1000*60*60*24));
  }

  function buildMonthGrid(viewDate){
    // monday-first grid with leading/trailing days
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const first = startOfMonth(y,m);
    const last  = endOfMonth(y,m);

    const firstDowSunday0 = first.getDay(); // 0=Sun
    const firstDowMon1 = (firstDowSunday0 === 0) ? 7 : firstDowSunday0; // 1..7, Mon=1
    const leading = firstDowMon1 - 1;

    const daysInMonth = last.getDate();
    const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;

    const start = addDays(first, -leading);
    const cells = [];
    for(let i=0;i<totalCells;i++){
      const d = addDays(start, i);
      const out = (d.getMonth() !== m);
      const dowMon1 = ((d.getDay()===0)?7:d.getDay());
      const weekend = (dowMon1 === 6 || dowMon1 === 7);
      cells.push({ date:d, out, weekend });
    }
    return cells;
  }

  function render(root, cfg){
    const today = new Date();
    let view = stripTime(today);

    const state = {
      cfg: loadCfg(),
      events: loadUserEvents()
    };

    root.innerHTML = `
      <div class="hc-head">
        <div>
          <div class="hc-title">Kalender</div>
          <div class="hc-sub">Feiertage · Wochenenden · Miet-Countdown · Quick-Events</div>
        </div>
        <div class="hc-actions">
          <span class="hc-pill" id="hcNow">—</span>
          <button class="hc-btn" id="hcToday">Heute</button>
        </div>
      </div>

      <div class="hc-body">
        <div class="hc-topgrid">
          <div class="hc-card">
            <div class="hc-kpiRow">
              <div class="hc-kpi">
                <div class="hc-k">Nächste Mieteinnahme</div>
                <div class="hc-v" id="rentNext">—</div>
                <div class="hc-h" id="rentHint">—</div>
              </div>
              <div class="hc-kpi">
                <div class="hc-k">Countdown</div>
                <div class="hc-v" id="rentCountdown">—</div>
                <div class="hc-h">Tage bis zur nächsten Miete</div>
              </div>
              <div class="hc-kpi">
                <div class="hc-k">Einstellungen</div>
                <div class="hc-v" id="rentDayTxt">—</div>
                <div class="hc-h">
                  Miettag (monatlich).<br>
                  <span style="opacity:.85">Edit unten im Quick-Add.</span>
                </div>
              </div>
            </div>

            <div style="margin-top:12px;">
              <div class="hc-calHead">
                <div class="hc-month" id="hcMonth">—</div>
                <div class="hc-nav">
                  <button id="hcPrev" aria-label="Vorheriger Monat">←</button>
                  <button id="hcNext" aria-label="Nächster Monat">→</button>
                </div>
              </div>

              <div class="hc-grid" id="hcDow"></div>
              <div class="hc-grid" id="hcGrid"></div>
            </div>
          </div>

          <div class="hc-card">
            <div class="hc-sideTitle">Nächste Events</div>
            <div class="hc-list" id="hcUpcoming"></div>

            <div class="hc-divider" style="height:1px;background:rgba(148,163,184,.14);margin:12px 0;"></div>

            <div class="hc-sideTitle">Quick Add</div>
            <div class="hc-form">
              <input class="hc-input" id="evTitle" placeholder="Event Titel (z.B. Handwerker Termin, Abnahme, Call…)" />
              <input class="hc-input" id="evDate" type="date" />
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;">
              <button class="hc-btn" id="evAdd">Event hinzufügen</button>
              <button class="hc-btn" id="evClear">Alle eigenen Events löschen</button>
              <button class="hc-btn" id="rentEdit">Miettag ändern</button>
            </div>
            <div class="hc-small">
              Eigene Events werden lokal im Browser gespeichert (localStorage). Kein Sync – dafür 100% simpel.
            </div>
          </div>
        </div>
      </div>
    `;

    const elNow = root.querySelector("#hcNow");

    function tick(){
      const d = new Date();
      elNow.textContent = d.toLocaleString("de-DE", { weekday:"short", day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
    }
    tick(); setInterval(tick, 15000);

    root.querySelector("#hcToday").addEventListener("click", ()=>{
      view = stripTime(new Date());
      renderAll();
    });

    root.querySelector("#hcPrev").addEventListener("click", ()=>{
      view = new Date(view.getFullYear(), view.getMonth()-1, 1);
      renderAll();
    });
    root.querySelector("#hcNext").addEventListener("click", ()=>{
      view = new Date(view.getFullYear(), view.getMonth()+1, 1);
      renderAll();
    });

    root.querySelector("#evAdd").addEventListener("click", ()=>{
      const title = String(root.querySelector("#evTitle").value||"").trim();
      const date  = String(root.querySelector("#evDate").value||"").trim();
      if(!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

      state.events.push({ id: cryptoId(), title, date });
      saveUserEvents(state.events);
      root.querySelector("#evTitle").value = "";
      renderAll();
    });

    root.querySelector("#evClear").addEventListener("click", ()=>{
      state.events = [];
      saveUserEvents(state.events);
      renderAll();
    });

    root.querySelector("#rentEdit").addEventListener("click", ()=>{
      const cur = state.cfg.rentDay;
      const input = prompt("Miettag (monatlich) eingeben (1–28):", String(cur));
      if(input == null) return;
      const v = clampInt(input, 1, 28);
      state.cfg.rentDay = v;
      saveCfg(state.cfg);
      renderAll();
    });

    // init date input default = today
    root.querySelector("#evDate").value = ymd(new Date());

    function renderAll(){
      // KPIs
      const nextRent = nextRentDate(new Date(), state.cfg.rentDay);
      const dLeft = daysBetween(new Date(), nextRent);

      root.querySelector("#rentNext").textContent = nextRent.toLocaleDateString("de-DE", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });
      root.querySelector("#rentHint").textContent = "Monatlich am " + state.cfg.rentDay + ".";
      root.querySelector("#rentCountdown").textContent = (dLeft === 0) ? "Heute" : (dLeft + " Tage");
      root.querySelector("#rentDayTxt").textContent = "Miettag: " + state.cfg.rentDay + ".";

      // Month label
      root.querySelector("#hcMonth").textContent = monthLabel(new Date(view));

      // DOW labels
      const dow = root.querySelector("#hcDow");
      dow.innerHTML = dowLabels().map(x=>`<div class="hc-dow">${x}</div>`).join("");

      // Holidays map for current year + adjacent year (for leading/trailing days)
      const y = view.getFullYear();
      const holA = holidayMapForYear(y-1);
      const holB = holidayMapForYear(y);
      const holC = holidayMapForYear(y+1);

      function holidayName(date){
        const key = ymd(date);
        return holA.get(key) || holB.get(key) || holC.get(key) || "";
      }

      // Build month cells
      const cells = buildMonthGrid(new Date(view));
      const grid = root.querySelector("#hcGrid");

      const todayKey = ymd(new Date());
      const rentKeyThisMonth = ymd(new Date(view.getFullYear(), view.getMonth(), state.cfg.rentDay));

      // Build event map (user)
      const userByDate = new Map();
      for(const ev of state.events){
        if(!userByDate.has(ev.date)) userByDate.set(ev.date, []);
        userByDate.get(ev.date).push(ev);
      }

      grid.innerHTML = cells.map(c=>{
        const key = ymd(c.date);
        const hol = holidayName(c.date);
        const isToday = key === todayKey;

        // rent badge on rent day of THIS viewed month
        const isRent = key === rentKeyThisMonth;

        const badges = [];
        if(hol) badges.push(`<div class="hc-badge hol"><span>${esc(hol)}</span></div>`);
        if(isRent) badges.push(`<div class="hc-badge pay"><span>Mieteinnahme</span></div>`);

        const userEvents = (userByDate.get(key) || []);
        userEvents.slice(0,2).forEach(ev=>{
          badges.push(`<div class="hc-badge user"><span>${esc(ev.title)}</span></div>`);
        });
        if(userEvents.length > 2){
          badges.push(`<div class="hc-badge user"><span>+${userEvents.length-2} weitere</span></div>`);
        }

        const cls = [
          "hc-day",
          c.out ? "out":"in",
          c.weekend ? "weekend":"",
          hol ? "holiday":"",
          isToday ? "today":""
        ].join(" ").trim();

        return `
          <div class="${cls}" title="${esc(hol||"")}">
            <div class="n">${c.date.getDate()}</div>
            <div class="hc-badges">${badges.join("")}</div>
          </div>
        `;
      }).join("");

      // Upcoming list (next 14 days)
      const now = stripTime(new Date());
      const horizon = addDays(now, 60);

      const upcoming = [];

      // Rent events (next 3 occurrences)
      let r1 = nextRentDate(now, state.cfg.rentDay);
      upcoming.push({ date: r1, type:"pay", title:"Mieteinnahme", sub:"Monatlich am " + state.cfg.rentDay + "." });
      let r2 = nextRentDate(addDays(r1, 1), state.cfg.rentDay);
      upcoming.push({ date: r2, type:"pay", title:"Mieteinnahme", sub:"Monatlich am " + state.cfg.rentDay + "." });
      let r3 = nextRentDate(addDays(r2, 1), state.cfg.rentDay);
      upcoming.push({ date: r3, type:"pay", title:"Mieteinnahme", sub:"Monatlich am " + state.cfg.rentDay + "." });

      // Holidays in range
      for(let d = new Date(now); d <= horizon; d = addDays(d, 1)){
        const hn = holidayName(d);
        if(hn){
          upcoming.push({ date: new Date(d), type:"hol", title: hn, sub:"Feiertag (bundesweit)" });
        }
      }

      // User events
      for(const ev of state.events){
        const d = new Date(ev.date + "T00:00:00");
        if(d >= now && d <= horizon){
          upcoming.push({ date: d, type:"user", title: ev.title, sub:"Eigenes Event" });
        }
      }

      upcoming.sort((a,b)=> a.date - b.date);

      const list = root.querySelector("#hcUpcoming");
      const items = upcoming.slice(0,8);

      if(!items.length){
        list.innerHTML = `<div class="hc-item"><div class="hc-itemName">Keine Events</div><div class="hc-itemSub">Füge unten ein Event hinzu.</div></div>`;
      }else{
        list.innerHTML = items.map(x=>{
          const tag =
            x.type === "pay" ? "Miete" :
            x.type === "hol" ? "Feiertag" : "Event";
          const time = x.date.toLocaleDateString("de-DE", { weekday:"short", day:"2-digit", month:"2-digit" });
          return `
            <div class="hc-item">
              <div class="hc-itemTop">
                <div class="hc-itemName">${esc(x.title)}</div>
                <div class="hc-itemTime">${time}</div>
              </div>
              <div class="hc-itemSub">${esc(tag)} · ${esc(x.sub || "")}</div>
            </div>
          `;
        }).join("");
      }
    }

    renderAll();
  }
})();