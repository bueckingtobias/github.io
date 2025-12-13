(function(){
  window.HomeCalendarModul = window.HomeCalendarModul || {};
  window.HomeCalendarModul.rootClass = "home-calendar-root";
  window.HomeCalendarModul.render = render;

  // Fixed rent date: 01. of each month
  const RENT_DAY = 1;

  function esc(s){ return String(s||"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m])); }

  function ymd(d){
    const x = new Date(d);
    const y = x.getFullYear();
    const m = String(x.getMonth()+1).padStart(2,"0");
    const da= String(x.getDate()).padStart(2,"0");
    return `${y}-${m}-${da}`;
  }
  function addDays(date, n){ const d = new Date(date); d.setDate(d.getDate()+n); return d; }
  function addMonths(date, n){ const d = new Date(date); d.setDate(1); d.setMonth(d.getMonth()+n); return d; }
  function stripTime(d){ const x = new Date(d); x.setHours(0,0,0,0); return x; }
  function monthLabel(d){ return d.toLocaleDateString("de-DE",{ month:"long", year:"numeric" }); }
  function dowLabels(){ return ["Mo","Di","Mi","Do","Fr","Sa","So"]; }

  function daysBetween(a,b){
    const A = stripTime(a).getTime();
    const B = stripTime(b).getTime();
    return Math.round((B - A) / (1000*60*60*24));
  }

  function nextRentDate(fromDate){
    const d = stripTime(fromDate);
    const y = d.getFullYear();
    const m = d.getMonth();
    const thisMonth = new Date(y, m, RENT_DAY);
    if(thisMonth >= d) return thisMonth;
    return new Date(y, m+1, RENT_DAY);
  }

  // Easter Sunday (Gregorian)
  function easterSunday(year){
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
    const month = Math.floor((h + l - 7*m + 114) / 31);
    const day = ((h + l - 7*m + 114) % 31) + 1;
    return new Date(year, month-1, day);
  }

  // Germany (bundesweit) holidays: fixed + Easter-based subset
  function holidayMapForYear(year){
    const map = new Map();

    // Fixed
    [
      { mmdd:"01-01", name:"Neujahr" },
      { mmdd:"05-01", name:"Tag der Arbeit" },
      { mmdd:"10-03", name:"Tag der Deutschen Einheit" },
      { mmdd:"12-25", name:"1. Weihnachtstag" },
      { mmdd:"12-26", name:"2. Weihnachtstag" }
    ].forEach(h=> map.set(`${year}-${h.mmdd}`, h.name));

    // Easter-based
    const easter = easterSunday(year);
    map.set(ymd(addDays(easter, -2)), "Karfreitag");
    map.set(ymd(addDays(easter, 1)), "Ostermontag");
    map.set(ymd(addDays(easter, 39)), "Christi Himmelfahrt");
    map.set(ymd(addDays(easter, 50)), "Pfingstmontag");

    return map;
  }

  function holidayName(date){
    const y = date.getFullYear();
    const key = ymd(date);
    const m1 = holidayMapForYear(y-1);
    const m2 = holidayMapForYear(y);
    const m3 = holidayMapForYear(y+1);
    return m1.get(key) || m2.get(key) || m3.get(key) || "";
  }

  function buildMonthGrid(viewDate){
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const first = new Date(y, m, 1);
    const last  = new Date(y, m+1, 0);

    // monday-first
    const firstDowSunday0 = first.getDay(); // 0=Sun
    const firstDowMon1 = (firstDowSunday0 === 0) ? 7 : firstDowSunday0; // 1..7
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

  function render(root){
    const today = stripTime(new Date());
    let view = new Date(today.getFullYear(), today.getMonth(), 1);

    root.innerHTML = `
      <div class="hc-head">
        <div>
          <div class="hc-title">Kalender</div>
          <div class="hc-sub" id="hcSub">—</div>
        </div>
        <div class="hc-right">
          <span class="hc-pill" id="hcNow">—</span>
          <button class="hc-btn" id="hcToday">Heute</button>
        </div>
      </div>

      <div class="hc-body">
        <div class="hc-calWrap">
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
    `;

    const elNow = root.querySelector("#hcNow");
    const elSub = root.querySelector("#hcSub");

    function tick(){
      const d = new Date();
      elNow.textContent = d.toLocaleString("de-DE", { weekday:"short", day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
    }
    tick(); setInterval(tick, 15000);

    root.querySelector("#hcToday").addEventListener("click", ()=>{
      view = new Date(today.getFullYear(), today.getMonth(), 1);
      renderAll();
    });
    root.querySelector("#hcPrev").addEventListener("click", ()=>{
      view = addMonths(view, -1);
      renderAll();
    });
    root.querySelector("#hcNext").addEventListener("click", ()=>{
      view = addMonths(view, +1);
      renderAll();
    });

    function renderAll(){
      // Countdown (only thing besides calendar)
      const nr = nextRentDate(new Date());
      const left = daysBetween(new Date(), nr);
      const rentTxt = nr.toLocaleDateString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric" });

      elSub.textContent =
        left === 0
          ? `Mieteinnahme am 01. — heute (${rentTxt})`
          : `Countdown bis Mieteinnahme am 01.: ${left} Tage (nächster Termin: ${rentTxt})`;

      // Month label
      root.querySelector("#hcMonth").textContent = monthLabel(view);

      // DOW header
      root.querySelector("#hcDow").innerHTML = dowLabels().map(x=>`<div class="hc-dow">${x}</div>`).join("");

      // Grid
      const cells = buildMonthGrid(view);
      const grid = root.querySelector("#hcGrid");
      const todayKey = ymd(new Date());
      const rentKey  = ymd(new Date(view.getFullYear(), view.getMonth(), RENT_DAY));

      grid.innerHTML = cells.map(c=>{
        const key = ymd(c.date);
        const hol = holidayName(c.date);
        const isToday = key === todayKey;
        const isRent  = key === rentKey;

        const cls = [
          "hc-day",
          c.out ? "out":"in",
          c.weekend ? "weekend":"",
          hol ? "holiday":"",
          isRent ? "rentday":"",
          isToday ? "today":""
        ].join(" ").trim();

        const title = hol ? `${hol}` : (isRent ? "Mieteinnahme (01.)" : "");
        const dot = hol ? `<span class="hc-holDot" aria-hidden="true"></span>` : "";

        return `
          <div class="${cls}" title="${esc(title)}">
            ${dot}
            <div class="n">${c.date.getDate()}</div>
          </div>
        `;
      }).join("");
    }

    renderAll();
  }
})();