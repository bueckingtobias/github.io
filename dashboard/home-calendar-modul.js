(function(){
  function qs(root, sel){ return root.querySelector(sel); }
  function pad(n){ return String(n).padStart(2,"0"); }
  function iso(d){ return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }

  // Easter (Anonymous Gregorian algorithm)
  function easterDate(year){
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
  function addDays(d, n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }

  function holidaysDE(year, region){
    const e = easterDate(year);
    const map = new Map();

    map.set(`${year}-01-01`, "Neujahr");
    map.set(`${year}-05-01`, "Tag der Arbeit");
    map.set(`${year}-10-03`, "Tag der Deutschen Einheit");
    map.set(`${year}-12-25`, "1. Weihnachtstag");
    map.set(`${year}-12-26`, "2. Weihnachtstag");

    map.set(iso(addDays(e,-2)), "Karfreitag");
    map.set(iso(addDays(e,1)), "Ostermontag");
    map.set(iso(addDays(e,39)), "Christi Himmelfahrt");
    map.set(iso(addDays(e,50)), "Pfingstmontag");

    if(String(region||"").toUpperCase() === "NI"){
      map.set(`${year}-10-31`, "Reformationstag");
    }
    return map;
  }

  function render(container, data){
    const root = container.querySelector("[data-ac-root]") || container;

    const rentDay = (data && Number(data.rentDay)) ? Number(data.rentDay) : 1;
    const region = (data && data.region) ? String(data.region) : "NI";

    const elMonth = qs(root, "[data-ac-month]");
    const elMini = qs(root, "[data-ac-mini]");
    const elCountdown = qs(root, "[data-ac-countdown]");
    const elGrid = qs(root, "[data-ac-grid]");

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const todayIso = iso(now);

    const monthName = now.toLocaleDateString("de-DE", { month:"long", year:"numeric" });
    elMonth.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    // Countdown to next rent day
    const nextRent = new Date(year, month, rentDay);
    if(now > nextRent) nextRent.setMonth(nextRent.getMonth()+1);
    const diffMs = nextRent.setHours(0,0,0,0) - new Date().setHours(0,0,0,0);
    const days = Math.max(0, Math.round(diffMs / (1000*60*60*24)));
    elCountdown.textContent = days + " Tage";

    elMini.textContent = "Wochenenden dezenter · Feiertage rot · 01. markiert";

    const hol = holidaysDE(year, region);

    elGrid.innerHTML = "";
    const dows = ["Mo","Di","Mi","Do","Fr","Sa","So"];
    dows.forEach(x=>{
      const c = document.createElement("div");
      c.className = "ac-dow";
      c.textContent = x;
      elGrid.appendChild(c);
    });

    const first = new Date(year, month, 1);
    const firstDow = (first.getDay() + 6) % 7; // Mon=0..Sun=6
    const daysInMonth = new Date(year, month+1, 0).getDate();

    const prevDays = new Date(year, month, 0).getDate();
    for(let i=0;i<firstDow;i++){
      const day = prevDays - firstDow + 1 + i;
      const cell = document.createElement("div");
      cell.className = "ac-cell muted";
      cell.innerHTML = `
        <div class="ac-topline"><div class="ac-day">${day}</div><div class="ac-badge"></div></div>
        <div class="ac-tag"></div>
      `;
      elGrid.appendChild(cell);
    }

    for(let day=1; day<=daysInMonth; day++){
      const dateObj = new Date(year, month, day);
      const dow = (dateObj.getDay() + 6) % 7;
      const isWeekend = (dow >= 5);

      const key = iso(dateObj);
      const holidayName = hol.get(key);

      const cls = [
        "ac-cell",
        isWeekend ? "weekend" : "",
        holidayName ? "holiday" : "",
        (day === rentDay) ? "rent" : "",
        (key === todayIso) ? "today" : ""
      ].filter(Boolean).join(" ");

      const tag = holidayName ? holidayName : (day === rentDay ? "Mieteinnahme" : "");
      const cell = document.createElement("div");
      cell.className = cls;
      cell.innerHTML = `
        <div class="ac-topline"><div class="ac-day">${day}</div><div class="ac-badge"></div></div>
        <div class="ac-tag">${tag}</div>
      `;
      elGrid.appendChild(cell);
    }

    const totalCells = 7 + firstDow + daysInMonth;
    const remainder = totalCells % 7;
    const fill = remainder === 0 ? 0 : (7 - remainder);
    for(let i=1;i<=fill;i++){
      const cell = document.createElement("div");
      cell.className = "ac-cell muted";
      cell.innerHTML = `
        <div class="ac-topline"><div class="ac-day">${i}</div><div class="ac-badge"></div></div>
        <div class="ac-tag"></div>
      `;
      elGrid.appendChild(cell);
    }
  }

  window.HomeCalendarModul = { render };
})();
