/* ============================================================================
   app.js — Logik für das Bücking Dashboard
   Auth (SHA-256 + Session) · Routing · Views · Daten-Editor/Export
   Liest window.DASHBOARD_DATA aus data.js
   ========================================================================== */
(function () {
  "use strict";

  const D = window.DASHBOARD_DATA || {};
  const SESSION_KEY = "buecking_session_v2";

  /* ----------------------------- Helpers ----------------------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, m =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const eur = (n) => (Number(n) || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const pct = (n) => (Number(n) || 0).toLocaleString("de-DE", { maximumFractionDigits: 0 }) + " %";
  const sum = (arr, f) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);

  async function sha256(str) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  /* ----------------------------- Auth ----------------------------- */
  function sessionValid() {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (!s || !s.ok) return false;
      const hours = (D.auth && D.auth.sessionHours) || 12;
      return (Date.now() - s.ts) < hours * 3600 * 1000;
    } catch { return false; }
  }
  function setSession() {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ok: true, ts: Date.now() }));
  }
  function logout() {
    localStorage.removeItem(SESSION_KEY);
    location.reload();
  }

  async function tryLogin() {
    const msg = $("#loginMsg");
    const val = $("#pw").value;
    if (!val) { msg.textContent = "Bitte Passwort eingeben."; msg.className = "login-msg bad"; return; }
    msg.textContent = "Prüfe…"; msg.className = "login-msg";
    const hash = await sha256(val);
    if (hash === (D.auth && D.auth.passwordHash)) {
      setSession();
      msg.textContent = "Willkommen.";
      enterApp();
    } else {
      msg.textContent = "Falsches Passwort.";
      msg.className = "login-msg bad";
      $("#pw").select();
    }
  }

  function enterApp() {
    $("#login").classList.add("hide");
    $("#app").classList.remove("hide");
    $("#verChip").textContent = "v " + ((D.meta && D.meta.version) || "—");
    startClock();
    route("home");
  }

  /* ----------------------------- Clock ----------------------------- */
  function startClock() {
    const el = $("#clock");
    const tick = () => {
      el.textContent = new Date().toLocaleString("de-DE",
        { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    };
    tick(); setInterval(tick, 20000);
  }

  /* ----------------------------- Routing ----------------------------- */
  const TITLES = {
    home: ["Home", "Portfolio-Überblick & Kennzahlen"],
    baumstrasse: ["Baumstraße", "Umbau Stall zu 5 Wohnungen · Gewerke"],
    huenenberg: ["Am Hünenberg", "Neubau Mehrfamilienhaus · Gewerke"],
    vermietung: ["Vermietung", "Objekte · Mieter · Nebenkosten"],
    finanzen: ["Finanzen", "Cashflow · Budget · Offene Posten"],
    daten: ["Daten", "Pflege & Export der data.js"]
  };

  function route(view) {
    $$("#nav a").forEach(a => a.classList.toggle("active", a.dataset.view === view));
    const [t, s] = TITLES[view] || ["", ""];
    $("#pageTitle").textContent = t;
    $("#pageSub").textContent = s;
    const host = $("#views");
    host.innerHTML = "";
    const fn = VIEWS[view];
    if (fn) host.appendChild(fn());
    host.scrollTop = 0;
  }

  function el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  /* ----------------------------- Views ----------------------------- */
  const VIEWS = {
    home: renderHome,
    baumstrasse: () => renderProject("baumstrasse"),
    huenenberg: () => renderProject("huenenberg"),
    vermietung: renderVermietung,
    finanzen: renderFinanzen,
    daten: renderDaten
  };

  /* ---------- HOME ---------- */
  function renderHome() {
    const rentals = D.rentals || [];
    let totalUnits = 0, occUnits = 0, monthlyRent = 0, monthlyNk = 0;
    rentals.forEach(o => o.einheiten.forEach(u => {
      totalUnits++;
      if (u.status === "vermietet") { occUnits++; monthlyRent += u.kaltmiete; monthlyNk += u.nebenkosten; }
    }));
    const occRate = totalUnits ? Math.round(occUnits / totalUnits * 100) : 0;

    const projects = D.projects || [];
    const totalAngebot = sum(projects.flatMap(p => p.gewerke), g => g.angebot);
    const totalGezahlt = sum(projects.flatMap(p => p.gewerke), g => g.gezahlt);

    const cf = (D.finance && D.finance.cashflow) || [];
    const last = cf[cf.length - 1] || { einnahmen: 0, ausgaben: 0 };
    const lastCf = last.einnahmen - last.ausgaben;
    const yearCf = sum(cf, r => r.einnahmen - r.ausgaben);

    const wrap = el(`<div class="grid"></div>`);

    wrap.appendChild(el(`
      <div class="col-12 card"><div class="card-b">
        <div class="kpis">
          ${kpi("Monats-Cashflow", eur(lastCf), (last.monat||""), lastCf>=0)}
          ${kpi("Cashflow (12 Mon.)", eur(yearCf), "kumuliert", yearCf>=0)}
          ${kpi("Mieteinnahmen / Monat", eur(monthlyRent), "netto kalt", true)}
          ${kpi("Nebenkosten / Monat", eur(monthlyNk), "Vorauszahlung", true)}
          ${kpi("Auslastung", pct(occRate), occUnits+" / "+totalUnits+" Einheiten", occRate>=80)}
          ${kpi("Bau gezahlt", pct(totalAngebot? totalGezahlt/totalAngebot*100:0), eur(totalGezahlt)+" von "+eur(totalAngebot), true)}
        </div>
      </div></div>`));

    // Projects overview
    const projRows = projects.map(p => {
      const a = sum(p.gewerke, g => g.angebot), g = sum(p.gewerke, g => g.gezahlt);
      const f = Math.round(p.gewerke.reduce((s, x) => s + x.fortschritt, 0) / (p.gewerke.length || 1));
      return `<tr>
        <td><b>${esc(p.name)}</b><div style="font-size:11px;color:var(--soft)">${esc(p.scope)}</div></td>
        <td class="num">${eur(a)}</td><td class="num">${eur(g)}</td>
        <td style="min-width:140px"><div class="bar"><span style="width:${f}%"></span></div>
          <div style="font-size:11px;color:var(--soft);margin-top:4px">${f}% Fortschritt</div></td>
      </tr>`;
    }).join("");

    wrap.appendChild(el(`
      <div class="col-8 card">
        <div class="card-h"><div><div class="card-t">Projekte</div>
          <div class="card-s">Budget & Baufortschritt</div></div></div>
        <div class="card-b" style="padding-top:4px">
          <table><thead><tr><th>Projekt</th><th class="num">Angebot</th><th class="num">Gezahlt</th><th>Fortschritt</th></tr></thead>
          <tbody>${projRows}</tbody></table>
        </div>
      </div>`));

    // Cashflow spark
    wrap.appendChild(el(`
      <div class="col-4 card">
        <div class="card-h"><div><div class="card-t">Cashflow</div>
          <div class="card-s">letzte 12 Monate</div></div></div>
        <div class="card-b">${sparkChart(cf.map(r => r.einnahmen - r.ausgaben))}</div>
      </div>`));

    return wrap;
  }

  function kpi(label, val, sub, up) {
    return `<div class="kpi"><div class="k-label">${esc(label)}</div>
      <div class="k-val ${up ? "" : "k-down"}">${esc(val)}</div>
      <div class="k-sub">${esc(sub)}</div></div>`;
  }
  function sparkChart(vals) {
    if (!vals.length) return `<div class="note">Keine Daten.</div>`;
    const max = Math.max(...vals.map(Math.abs), 1);
    const cols = vals.map(v => {
      const h = Math.max(4, Math.round(Math.abs(v) / max * 84));
      return `<div class="col ${v < 0 ? "neg" : ""}" style="height:${h}px" title="${eur(v)}"></div>`;
    }).join("");
    return `<div class="spark">${cols}</div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--softer);margin-top:8px">
        <span>${esc(vals.length)} Monate</span><span>${eur(vals[vals.length-1])}</span></div>`;
  }

  /* ---------- PROJECT (Baumstraße / Am Hünenberg — identisch) ---------- */
  function renderProject(id) {
    const p = (D.projects || []).find(x => x.id === id);
    const wrap = el(`<div class="grid"></div>`);
    if (!p) { wrap.appendChild(el(`<div class="col-12 card"><div class="card-b note">Projekt nicht gefunden.</div></div>`)); return wrap; }

    const aktiv = p.gewerke.filter(g => g.aktiv).sort((a, b) => a.sort - b.sort);
    const totalA = sum(aktiv, g => g.angebot);
    const totalG = sum(aktiv, g => g.gezahlt);
    const offen = totalA - totalG;
    const fort = Math.round(aktiv.reduce((s, x) => s + x.fortschritt, 0) / (aktiv.length || 1));

    wrap.appendChild(el(`
      <div class="col-12 card"><div class="card-b">
        <div style="font-size:12.5px;color:var(--soft);margin-bottom:14px">
          📍 ${esc(p.address)} &nbsp;·&nbsp; ${esc(p.scope)}</div>
        <div class="kpis">
          ${kpi("Angebotssumme", eur(totalA), aktiv.length+" Gewerke", true)}
          ${kpi("Gezahlt", eur(totalG), pct(totalA? totalG/totalA*100:0)+" der Summe", true)}
          ${kpi("Offen", eur(offen), "noch zu zahlen", offen<=0)}
          ${kpi("Ø Baufortschritt", pct(fort), "gewichtet je Gewerk", fort>=50)}
        </div>
      </div></div>`));

    const cards = aktiv.map(g => {
      const o = g.angebot - g.gezahlt;
      return `<div class="gw">
        <div class="gw-top"><div class="gw-name">${esc(g.name)}</div><div class="gw-pct">${g.fortschritt}%</div></div>
        <div class="gw-firma">${esc(g.firma)}</div>
        <div class="bar"><span style="width:${g.fortschritt}%"></span></div>
        <div class="gw-row"><span>Angebot</span><b>${eur(g.angebot)}</b></div>
        <div class="gw-row"><span>Gezahlt</span><b>${eur(g.gezahlt)}</b></div>
        <div class="gw-row"><span>Offen</span><b style="color:${o>0?'#f3b4ae':'var(--accent-2)'}">${eur(o)}</b></div>
      </div>`;
    }).join("");

    wrap.appendChild(el(`
      <div class="col-12 card">
        <div class="card-h"><div><div class="card-t">Gewerke</div>
          <div class="card-s">${aktiv.length} aktive Gewerke</div></div></div>
        <div class="card-b"><div class="gw-grid">${cards}</div></div>
      </div>`));
    return wrap;
  }

  /* ---------- VERMIETUNG ---------- */
  function renderVermietung() {
    const rentals = D.rentals || [];
    const wrap = el(`<div class="grid"></div>`);

    let allUnits = 0, occ = 0, rent = 0, nk = 0;
    rentals.forEach(o => o.einheiten.forEach(u => {
      allUnits++; if (u.status === "vermietet") { occ++; rent += u.kaltmiete; nk += u.nebenkosten; }
    }));
    const rate = allUnits ? Math.round(occ / allUnits * 100) : 0;

    wrap.appendChild(el(`
      <div class="col-12 card"><div class="card-b">
        <div class="kpis">
          ${kpi("Auslastung", pct(rate), occ+" / "+allUnits+" vermietet", rate>=80)}
          ${kpi("Kaltmiete / Monat", eur(rent), "Summe vermietet", true)}
          ${kpi("Nebenkosten / Monat", eur(nk), "Vorauszahlung", true)}
          ${kpi("Warmmiete / Monat", eur(rent+nk), "kalt + NK", true)}
        </div>
      </div></div>`));

    rentals.forEach(o => {
      const rows = o.einheiten.map(u => {
        const badge = u.status === "vermietet" ? `<span class="badge b-ok">vermietet</span>`
          : u.status === "kuendigung" ? `<span class="badge b-warn">Kündigung</span>`
          : `<span class="badge b-free">frei</span>`;
        return `<tr>
          <td><b>${esc(u.wohnung)}</b></td>
          <td>${u.flaeche} m²</td>
          <td>${esc(u.mieter || "—")}</td>
          <td>${u.einzug ? new Date(u.einzug).toLocaleDateString("de-DE") : "—"}</td>
          <td class="num">${eur(u.kaltmiete)}</td>
          <td class="num">${eur(u.nebenkosten)}</td>
          <td class="num">${eur(u.kaltmiete + u.nebenkosten)}</td>
          <td>${badge}</td>
        </tr>`;
      }).join("");
      const oRent = sum(o.einheiten.filter(u => u.status === "vermietet"), u => u.kaltmiete);
      const oNk = sum(o.einheiten.filter(u => u.status === "vermietet"), u => u.nebenkosten);
      wrap.appendChild(el(`
        <div class="col-12 card">
          <div class="card-h"><div><div class="card-t">${esc(o.objekt)}</div>
            <div class="card-s">${esc(o.ort)} · ${o.einheiten.length} Einheiten</div></div>
            <div class="chip">${eur(oRent + oNk)} / Monat</div></div>
          <div class="card-b" style="padding-top:4px">
            <table><thead><tr>
              <th>Einheit</th><th>Fläche</th><th>Mieter</th><th>Einzug</th>
              <th class="num">Kaltmiete</th><th class="num">NK</th><th class="num">Warm</th><th>Status</th>
            </tr></thead><tbody>${rows}</tbody></table>
          </div>
        </div>`));
    });
    return wrap;
  }

  /* ---------- FINANZEN ---------- */
  function renderFinanzen() {
    const f = D.finance || {};
    const acc = f.account || {};
    const cf = f.cashflow || [];
    const budget = f.budget || [];
    const op = f.op || [];
    const wrap = el(`<div class="grid"></div>`);

    const yearCf = sum(cf, r => r.einnahmen - r.ausgaben);
    const totalBudget = sum(budget, b => b.budget);
    const totalIst = sum(budget, b => b.ist);

    wrap.appendChild(el(`
      <div class="col-12 card"><div class="card-b">
        <div class="kpis">
          ${kpi("Kontostand", eur(acc.kontostand), "aktuell", true)}
          ${kpi("Liquide Mittel", eur(acc.liquide), "verfügbar", true)}
          ${kpi("Rücklagen", eur(acc.ruecklagen), "gebunden", true)}
          ${kpi("Kurzfr. Verbindl.", eur(acc.verbindlichkeitenKurz), "fällig <12 Mon.", false)}
          ${kpi("Cashflow (12 Mon.)", eur(yearCf), "kumuliert", yearCf>=0)}
          ${kpi("Budget-Auslastung", pct(totalBudget? totalIst/totalBudget*100:0), eur(totalIst)+" / "+eur(totalBudget), true)}
        </div>
      </div></div>`));

    wrap.appendChild(el(`
      <div class="col-8 card">
        <div class="card-h"><div><div class="card-t">Cashflow-Verlauf</div>
          <div class="card-s">Einnahmen − Ausgaben, 12 Monate</div></div></div>
        <div class="card-b">${sparkChart(cf.map(r => r.einnahmen - r.ausgaben))}</div>
      </div>`));

    const budRows = budget.map(b => {
      const p = b.budget ? Math.round(b.ist / b.budget * 100) : 0;
      return `<tr><td><b>${esc(b.bereich)}</b><div class="bar" style="margin-top:6px"><span style="width:${Math.min(100,p)}%"></span></div></td>
        <td class="num">${eur(b.ist)}</td><td class="num">${eur(b.budget)}</td><td class="num">${p}%</td></tr>`;
    }).join("");
    wrap.appendChild(el(`
      <div class="col-4 card">
        <div class="card-h"><div><div class="card-t">Budget</div>
          <div class="card-s">Ist vs. Plan</div></div></div>
        <div class="card-b" style="padding-top:4px">
          <table><thead><tr><th>Bereich</th><th class="num">Ist</th><th class="num">Plan</th><th class="num">%</th></tr></thead>
          <tbody>${budRows}</tbody></table>
        </div>
      </div>`));

    const opRows = op.map(o => {
      const b = o.status === "offen" ? "b-warn" : "b-free";
      return `<tr><td><b>${esc(o.titel)}</b></td>
        <td>${o.faellig ? new Date(o.faellig).toLocaleDateString("de-DE") : "—"}</td>
        <td class="num">${eur(o.betrag)}</td><td><span class="badge ${b}">${esc(o.status)}</span></td></tr>`;
    }).join("");
    wrap.appendChild(el(`
      <div class="col-12 card">
        <div class="card-h"><div><div class="card-t">Offene Posten</div>
          <div class="card-s">${op.length} Einträge · Summe ${eur(sum(op, o => o.betrag))}</div></div></div>
        <div class="card-b" style="padding-top:4px">
          <table><thead><tr><th>Titel</th><th>Fällig</th><th class="num">Betrag</th><th>Status</th></tr></thead>
          <tbody>${opRows}</tbody></table>
        </div>
      </div>`));
    return wrap;
  }

  /* ---------- DATEN (Editor + Export + Passwort) ---------- */
  function renderDaten() {
    const wrap = el(`<div class="grid"></div>`);

    wrap.appendChild(el(`
      <div class="col-12 card">
        <div class="card-h"><div><div class="card-t">Datenpflege</div>
          <div class="card-s">Bearbeite die Daten und exportiere eine fertige <code>data.js</code></div></div></div>
        <div class="card-b editor">
          <p class="note">So funktioniert's: Daten unten als JSON bearbeiten → <b>Prüfen</b> → <b>data.js exportieren</b>.
          Die heruntergeladene Datei einfach in deinem GitHub-Repo (oder Google Drive) als <code>data.js</code> ersetzen.
          Beim nächsten Laden sind die neuen Werte aktiv.</p>
          <div style="display:flex;gap:10px;margin:14px 0 12px;flex-wrap:wrap">
            <button class="btn" id="edFormat">JSON formatieren</button>
            <button class="btn" id="edCheck">Prüfen</button>
            <button class="btn btn-accent" id="edExport">data.js exportieren</button>
            <button class="btn" id="edReset">Zurücksetzen</button>
          </div>
          <textarea id="edArea" spellcheck="false"></textarea>
          <div class="note" id="edMsg" style="margin-top:10px"></div>
        </div>
      </div>`));

    wrap.appendChild(el(`
      <div class="col-12 card">
        <div class="card-h"><div><div class="card-t">Passwort ändern</div>
          <div class="card-s">Erzeugt den Hash für <code>data.js</code> → <code>auth.passwordHash</code></div></div></div>
        <div class="card-b editor">
          <div class="inline-form">
            <input id="pwNew" type="text" placeholder="Neues Passwort" />
            <button class="btn btn-accent" id="pwGen">Hash erzeugen</button>
          </div>
          <div class="note" id="pwMsg" style="margin-top:12px">Der erzeugte Hash erscheint hier. Trage ihn in data.js ein.</div>
        </div>
      </div>`));

    // wire up after insertion
    setTimeout(() => {
      const area = $("#edArea");
      const editable = {
        meta: D.meta, auth: D.auth, projects: D.projects, rentals: D.rentals, finance: D.finance
      };
      area.value = JSON.stringify(editable, null, 2);

      $("#edFormat").onclick = () => {
        try { area.value = JSON.stringify(JSON.parse(area.value), null, 2); setMsg("#edMsg", "Formatiert.", false); }
        catch (e) { setMsg("#edMsg", "JSON-Fehler: " + e.message, true); }
      };
      $("#edCheck").onclick = () => {
        try { JSON.parse(area.value); setMsg("#edMsg", "✓ Gültiges JSON.", false); }
        catch (e) { setMsg("#edMsg", "✗ " + e.message, true); }
      };
      $("#edReset").onclick = () => { area.value = JSON.stringify(editable, null, 2); setMsg("#edMsg", "Zurückgesetzt.", false); };
      $("#edExport").onclick = () => {
        let obj;
        try { obj = JSON.parse(area.value); }
        catch (e) { setMsg("#edMsg", "Export abgebrochen – JSON-Fehler: " + e.message, true); return; }
        const content =
          "/* data.js — exportiert am " + new Date().toLocaleString("de-DE") + " */\n" +
          "window.DASHBOARD_DATA = " + JSON.stringify(obj, null, 2) + ";\n";
        const blob = new Blob([content], { type: "text/javascript" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "data.js";
        a.click();
        URL.revokeObjectURL(a.href);
        setMsg("#edMsg", "✓ data.js heruntergeladen. Jetzt im Repo/Drive ersetzen.", false);
      };
      $("#pwGen").onclick = async () => {
        const v = $("#pwNew").value;
        if (!v) { setMsg("#pwMsg", "Bitte ein Passwort eingeben.", true); return; }
        const h = await sha256(v);
        $("#pwMsg").innerHTML = `Hash für „${esc(v)}":<br><code style="word-break:break-all">${h}</code><br>
          → in data.js bei <code>auth.passwordHash</code> einsetzen.`;
      };
    }, 0);

    return wrap;
  }
  function setMsg(sel, text, bad) {
    const e = $(sel); if (!e) return;
    e.textContent = text; e.style.color = bad ? "var(--danger)" : "var(--accent-2)";
  }

  /* ----------------------------- Boot ----------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    $("#loginBtn").addEventListener("click", tryLogin);
    $("#pw").addEventListener("keydown", e => { if (e.key === "Enter") tryLogin(); });
    $("#logoutBtn").addEventListener("click", logout);
    $$("#nav a").forEach(a => a.addEventListener("click", () => route(a.dataset.view)));

    if (sessionValid()) enterApp();
    else { $("#login").classList.remove("hide"); setTimeout(() => $("#pw").focus(), 150); }
  });
})();
