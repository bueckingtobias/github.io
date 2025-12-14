(function(){
  function n(x){
    if(x == null || x === "") return 0;
    if(typeof x === "number" && isFinite(x)) return x;
    const s = String(x)
      .replace(/\s/g,"")
      .replace(/€/g,"")
      .replace(/\./g,"")
      .replace(",",".")
      .replace(/[^\d.-]/g,"");
    const v = Number(s);
    return isFinite(v) ? v : 0;
  }

  function eur(v){
    return new Intl.NumberFormat("de-DE",{
      style:"currency",
      currency:"EUR",
      maximumFractionDigits:0
    }).format(n(v));
  }

  function parseDate(x){
    if(!x) return null;
    if(x instanceof Date && !isNaN(x)) return x;
    const s = String(x).trim();
    const d1 = new Date(s);
    if(!isNaN(d1)) return d1;

    // dd.mm.yyyy
    const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if(m){
      const dd = Number(m[1]), mm = Number(m[2])-1, yy = Number(m[3]);
      const d2 = new Date(yy, mm, dd);
      if(!isNaN(d2)) return d2;
    }
    return null;
  }

  function dayDiff(a,b){
    // a - b in days
    return Math.round((a.getTime() - b.getTime()) / (1000*60*60*24));
  }

  function clamp(v){ return Math.max(0, Math.min(100, v)); }

  function safeText(x){ return (x == null) ? "" : String(x); }

  function render(container, data){
    const root = container.querySelector("[data-fop-root]") || container;

    const rows = Array.isArray(data?.opRows) ? data.opRows : [];
    const now = new Date();

    const elSub  = root.querySelector("[data-fop-sub]");
    const elPill = root.querySelector("[data-fop-pill]");
    const elKpis = root.querySelector("[data-fop-kpis]");
    const elAges = root.querySelector("[data-fop-ages]");
    const elTop  = root.querySelector("[data-fop-top]");
    const elDue  = root.querySelector("[data-fop-due]");
    const elFoot = root.querySelector("[data-fop-foot]");

    elSub.textContent = "Stand: " + now.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"});

    // Normalize
    const norm = rows.map(r=>{
      const amt = n(r.Betrag ?? r.Amount ?? r.Summe ?? r.Wert);
      const title = safeText(r.Bezeichnung ?? r.Text ?? r.Titel ?? r.Name ?? "OP");
      const counterparty = safeText(r.Partei ?? r.Lieferant ?? r.Kunde ?? r.Gegenkonto ?? "");
      const due = parseDate(r.Faelligkeit ?? r.Fälligkeitsdatum ?? r.DueDate ?? r.Datum ?? "");
      const days = due ? dayDiff(now, due) : 0; // positive => overdue days
      return { raw:r, amt, title, counterparty, due, days };
    });

    const total = norm.reduce((a,x)=>a + x.amt, 0);
    const overdueAmt = norm.filter(x=>x.due && x.days > 0).reduce((a,x)=>a + x.amt, 0);
    const dueSoonAmt = norm.filter(x=>x.due && x.days <= 0 && x.days >= -7).reduce((a,x)=>a + x.amt, 0);

    // KPIs
    const avgDays = (function(){
      const withDue = norm.filter(x=>x.due);
      if(!withDue.length) return null;
      const s = withDue.reduce((a,x)=>a + x.days, 0);
      return Math.round(s / withDue.length);
    })();

    const openCount = norm.length;
    const overdueCount = norm.filter(x=>x.due && x.days > 0).length;

    elKpis.innerHTML = "";
    const kpis = [
      {k:"Gesamt OP", v: eur(total), m: openCount + " Posten offen"},
      {k:"Überfällig", v: eur(overdueAmt), m: overdueCount + " Posten überfällig"},
      {k:"In 7 Tagen fällig", v: eur(dueSoonAmt), m: "kurzfristig"},
    ];
    kpis.forEach(t=>{
      const d = document.createElement("div");
      d.className = "fop-tile";
      d.innerHTML = `<div class="fop-k">${t.k}</div><div class="fop-v">${t.v}</div><div class="fop-m">${t.m}</div>`;
      elKpis.appendChild(d);
    });

    // Pill status
    const status =
      overdueAmt > 0 ? "kritisch" :
      total > 0 ? "offen" : "clean";
    elPill.textContent = "OP · " + status;

    // Aging buckets
    const buckets = [
      {label:"0–7 Tage", from:0, to:7},
      {label:"8–30 Tage", from:8, to:30},
      {label:"31–60 Tage", from:31, to:60},
      {label:"60+ Tage", from:61, to:9999},
    ];

    // Only overdue amounts for aging
    const overdue = norm.filter(x=>x.due && x.days > 0);
    const overTotal = overdue.reduce((a,x)=>a + x.amt, 0) || 1;

    elAges.innerHTML = "";
    buckets.forEach((b, idx)=>{
      const sum = overdue.filter(x=>x.days >= b.from && x.days <= b.to).reduce((a,x)=>a + x.amt, 0);
      const pct = clamp((sum / overTotal) * 100);
      const cls = idx <= 0 ? "ok" : idx === 1 ? "warn" : "bad";

      const box = document.createElement("div");
      box.className = "fop-age";
      box.innerHTML = `
        <div class="fop-age-top">
          <div class="fop-age-title">${b.label}</div>
          <div class="fop-age-val">${eur(sum)}</div>
        </div>
        <div class="fop-bar"><div class="fop-fill ${cls}" style="width:0%"></div></div>
      `;
      elAges.appendChild(box);

      const fill = box.querySelector(".fop-fill");
      requestAnimationFrame(()=> fill.style.width = pct + "%");
    });

    // Top OP by amount
    const top = [...norm].sort((a,b)=> b.amt - a.amt).slice(0,6);
    elTop.innerHTML = "";
    top.forEach(x=>{
      const dueTxt = x.due ? x.due.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"}) : "—";
      const badge = x.due && x.days > 0 ? ("überfällig · " + x.days + "d") : (x.due ? ("fällig " + dueTxt) : "ohne Datum");
      const row = document.createElement("div");
      row.className = "fop-row";
      row.innerHTML = `
        <div class="fop-row-left">
          <div class="fop-row-title">${x.title}</div>
          <div class="fop-row-sub">${x.counterparty ? (x.counterparty + " · ") : ""}${badge}</div>
        </div>
        <div class="fop-row-amt ${x.due && x.days > 0 ? "bad" : "ok"}">${eur(x.amt)}</div>
      `;
      elTop.appendChild(row);
    });

    // Next due dates (soonest)
    const dueSorted = norm
      .filter(x=>x.due)
      .sort((a,b)=> a.due - b.due)
      .slice(0,6);
    elDue.innerHTML = "";
    dueSorted.forEach(x=>{
      const dueTxt = x.due.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});
      const state = x.days > 0 ? ("überfällig · " + x.days + " Tage") :
                    x.days === 0 ? "heute fällig" :
                    ("in " + Math.abs(x.days) + " Tagen");
      const row = document.createElement("div");
      row.className = "fop-row";
      row.innerHTML = `
        <div class="fop-row-left">
          <div class="fop-row-title">${x.title}</div>
          <div class="fop-row-sub">${dueTxt} · ${state}</div>
        </div>
        <div class="fop-row-amt ${x.days > 0 ? "bad" : "ok"}">${eur(x.amt)}</div>
      `;
      elDue.appendChild(row);
    });

    // Footer
    const msg =
      overdueAmt > 0 ? ("Fokus: Überfällige OP abbauen (" + eur(overdueAmt) + ")") :
      total > 0 ? ("Fokus: Fälligkeiten sichern (Ø " + (avgDays==null?"—":avgDays+"d") + ")") :
      "Keine offenen Posten – sauber.";
    elFoot.textContent = msg;
  }

  window.FinanceOPModul = { render };
})();
