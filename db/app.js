/* ============================================================================
   app.js — Bücking Dashboard
   Auth · Routing (dynamisch je Projekt) · Home · Miet-Projekte · AirBnB ·
   Vermietung · Finanzen · Datenpflege (Formular → data.js Export)
   ========================================================================== */
(function () {
  "use strict";

  let D = JSON.parse(JSON.stringify(window.DASHBOARD_DATA || {}));
  const FE = window.FinanceEngine;
  const SESSION_KEY = "buecking_session_v2";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const eur = n => (Number(n) || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const eur2 = n => (Number(n) || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
  const pct = n => (Number(n) || 0).toLocaleString("de-DE", { maximumFractionDigits: 0 }) + " %";
  const num = n => (Number(n) || 0).toLocaleString("de-DE", { maximumFractionDigits: 1 });
  const dttm = iso => iso ? new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
  const sum = (a, f) => a.reduce((x, y) => x + (Number(f(y)) || 0), 0);
  const el = h => { const t = document.createElement("template"); t.innerHTML = h.trim(); return t.content.firstElementChild; };
  const isAir = p => p && p.type === "airbnb";

  async function sha256(str) {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join("");
  }

  /* ---------------- Auth ---------------- */
  function sessionValid() {
    try { const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (!s || !s.ok) return false;
      return (Date.now() - s.ts) < ((D.auth && D.auth.sessionHours) || 12) * 3600e3;
    } catch { return false; }
  }
  function setSession() { localStorage.setItem(SESSION_KEY, JSON.stringify({ ok: true, ts: Date.now() })); }
  function logout() { localStorage.removeItem(SESSION_KEY); location.reload(); }

  async function tryLogin() {
    const msg = $("#loginMsg"), val = $("#pw").value;
    if (!val) { msg.textContent = "Bitte Passwort eingeben."; msg.className = "login-msg bad"; return; }
    msg.textContent = "Prüfe…"; msg.className = "login-msg";
    if (await sha256(val) === (D.auth && D.auth.passwordHash)) { setSession(); enterApp(); }
    else { msg.textContent = "Falsches Passwort."; msg.className = "login-msg bad"; $("#pw").select(); }
  }
  function enterApp() {
    $("#login").classList.add("hide"); $("#app").classList.remove("hide");
    $("#verChip").textContent = "v " + ((D.meta && D.meta.version) || "—");
    buildNav();
    startClock(); route("home");
  }
  function startClock() {
    const e = $("#clock");
    const t = () => e.textContent = new Date().toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    t(); setInterval(t, 20000);
  }

  /* ---------------- Nav (dynamisch je Projekt) ---------------- */
  function buildNav() {
    const nav = $("#nav");
    const proj = (D.projects || []).map(p =>
      `<a data-view="${esc(p.id)}"><span class="ic">${isAir(p) ? "✦" : "▦"}</span><span class="txt">${esc(p.name)}</span></a>`
    ).join("");
    nav.innerHTML =
      `<a data-view="home" class="active"><span class="ic">◆</span><span class="txt">Home</span></a>
       <div class="nav-label">Projekte</div>
       ${proj}
       <div class="nav-label">Betrieb</div>
       <a data-view="vermietung"><span class="ic">▥</span><span class="txt">Vermietung</span></a>
       <a data-view="finanzen"><span class="ic">€</span><span class="txt">Finanzen</span></a>
       <div class="nav-label">Verwaltung</div>
       <a data-view="daten"><span class="ic">✎</span><span class="txt">Datenpflege</span></a>`;
    $$("#nav a").forEach(a => a.addEventListener("click", () => route(a.dataset.view)));
  }

  /* ---------------- Routing ---------------- */
  function titleFor(v) {
    const fixed = {
      home: ["Home", "Gesamtüberblick über alle Projekte"],
      vermietung: ["Vermietung", "Objekte · Mieter · Nebenkosten"],
      finanzen: ["Finanzen", "Pro Projekt · Kredite · Break-Even"],
      daten: ["Datenpflege", "Werte ändern & Export"]
    };
    if (fixed[v]) return fixed[v];
    const p = (D.projects || []).find(x => x.id === v);
    if (p) return [p.name, p.scope];
    return ["", ""];
  }
  function route(v) {
    $$("#nav a").forEach(a => a.classList.toggle("active", a.dataset.view === v));
    const [t, s] = titleFor(v); $("#pageTitle").textContent = t; $("#pageSub").textContent = s;
    const host = $("#views"); host.innerHTML = "";
    let nodes;
    const p = (D.projects || []).find(x => x.id === v);
    if (v === "home") nodes = renderHome();
    else if (v === "vermietung") nodes = renderVermietung();
    else if (v === "finanzen") nodes = renderFinanzen();
    else if (v === "daten") nodes = renderDaten();
    else if (p) nodes = isAir(p) ? renderAirbnb(p) : renderProject(p.id);
    else nodes = [el(`<div class="card col-12"><div class="card-b note">Nicht gefunden.</div></div>`)];
    nodes.forEach(n => host.appendChild(n));
    $(".content").scrollTop = 0;
    currentView = v;
  }
  let currentView = "home";

  /* ---------------- shared UI ---------------- */
  function kpi(label, val, sub, up) {
    return `<div class="kpi"><div class="k-label">${esc(label)}</div>
      <div class="k-val ${up === false ? "k-down" : ""}">${esc(val)}</div>
      <div class="k-sub">${esc(sub)}</div></div>`;
  }
  function spark(vals, labels) {
    if (!vals.length) return `<div class="note">Keine Daten.</div>`;
    const max = Math.max(...vals.map(Math.abs), 1);
    const cols = vals.map((v, i) => {
      const h = Math.max(4, Math.round(Math.abs(v) / max * 96));
      const lab = labels ? labels[i] : "";
      return `<div class="col ${v < 0 ? "neg" : ""}" style="height:${h}px" title="${lab} ${eur(v)}"></div>`;
    }).join("");
    return `<div class="spark">${cols}</div>`;
  }

  /* ---------------- HOME ---------------- */
  function renderHome() {
    const out = [];
    let units = 0, occ = 0, rent = 0, nk = 0;
    (D.rentals || []).forEach(o => o.einheiten.forEach(u => { units++; if (u.status === "vermietet") { occ++; rent += u.kaltmiete; nk += u.nebenkosten; } }));
    const rate = units ? Math.round(occ / units * 100) : 0;

    let totalInvGeplant = 0, totalInvIst = 0, totalDebtRest = 0, totalMonthlyDebt = 0, totalNetto = 0;
    (D.projects || []).forEach(p => {
      const inv = FE.projectInvestment(p);
      totalInvGeplant += inv.geplant; totalInvIst += inv.investiert;
      totalMonthlyDebt += FE.projectMonthlyDebt(p);
      (p.kredite || []).forEach(k => totalDebtRest += FE.creditSummary(k).restschuld);
      const cf = FE.projectCashflow(p); totalNetto += cf.reduce((s, r) => s + r.netto, 0);
    });

    out.push(el(`<div class="card col-12"><div class="card-b">
      <div class="kpis">
        ${kpi("Investition geplant", eur(totalInvGeplant), "über alle Projekte", true)}
        ${kpi("Bereits investiert", eur(totalInvIst), pct(totalInvGeplant ? totalInvIst / totalInvGeplant * 100 : 0) + " der Planung", true)}
        ${kpi("Restschuld Kredite", eur(totalDebtRest), eur(totalMonthlyDebt) + " / Monat", false)}
        ${kpi("Mieteinnahmen", eur(rent), "netto kalt / Monat", true)}
        ${kpi("Nebenkosten", eur(nk), "Vorauszahlung / Monat", true)}
        ${kpi("Auslastung", pct(rate), occ + " / " + units + " Einheiten", rate >= 80)}
      </div></div></div>`));

    (D.projects || []).forEach(p => {
      const inv = FE.projectInvestment(p);
      const cf = FE.projectCashflow(p);
      const lastNetto = cf.length ? cf[cf.length - 1].netto : 0;
      const be = FE.breakEven(p);
      const fort = Math.round((p.gewerke || []).reduce((s, x) => s + x.fortschritt, 0) / ((p.gewerke || []).length || 1));
      const beTxt = be.investBreakEven ? dttm(be.investBreakEven) + (be.monateBisBE ? " (" + be.monateBisBE + " Mon.)" : " erreicht") : "noch offen";
      const tag = isAir(p) ? `<span class="chip chip-air">AirBnB</span>` : `<span class="chip">${fort}% Bau</span>`;
      const extra = isAir(p)
        ? `<div><span>Ø Netto/Mon.</span><b class="${lastNetto < 0 ? 'neg-t' : 'pos-t'}">${eur(lastNetto)}</b></div>
           <div><span>Auslastung</span><b>${pct(p.airbnb ? p.airbnb.belegungsrate : 0)}</b></div>`
        : `<div><span>Netto-CF zuletzt</span><b class="${lastNetto < 0 ? 'neg-t' : 'pos-t'}">${eur(lastNetto)}</b></div>
           <div><span>Invest-Break-Even</span><b>${beTxt}</b></div>`;
      out.push(el(`<div class="card col-6 home-proj" data-go="${esc(p.id)}">
        <div class="card-h"><div><div class="card-t">${esc(p.name)}</div>
          <div class="card-s">${esc(p.scope)}</div></div>${tag}</div>
        <div class="card-b">
          <div class="mini-grid">
            <div><span>Investiert</span><b>${eur(inv.investiert)}</b></div>
            <div><span>Kreditrate/Mon.</span><b>${eur(FE.projectMonthlyDebt(p))}</b></div>
            ${extra}
          </div>
          <div style="margin-top:12px">${spark(cf.map(r => r.netto), cf.map(r => r.monat))}</div>
        </div></div>`));
    });

    const monthSet = {};
    (D.projects || []).forEach(p => FE.projectCashflow(p).forEach(r => {
      monthSet[r.monat] = (monthSet[r.monat] || 0) + r.netto;
    }));
    const months = Object.keys(monthSet).sort();
    const combined = months.map(m => monthSet[m]);
    out.push(el(`<div class="card col-8">
      <div class="card-h"><div><div class="card-t">Portfolio-Cashflow</div>
        <div class="card-s">Netto über alle Projekte je Monat</div></div>
        <span class="chip">Σ ${eur(totalNetto)}</span></div>
      <div class="card-b">${spark(combined, months)}
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--softer);margin-top:8px">
          <span>${months[0] || "—"}</span><span>${months[months.length - 1] || "—"}</span></div>
      </div></div>`));

    const alerts = [];
    (D.rentals || []).forEach(o => {
      const frei = o.einheiten.filter(u => u.status === "frei").length;
      const kuend = o.einheiten.filter(u => u.status === "kuendigung").length;
      if (frei) alerts.push({ t: "warn", txt: `${o.objekt}: ${frei} Einheit(en) frei` });
      if (kuend) alerts.push({ t: "warn", txt: `${o.objekt}: ${kuend} Kündigung(en)` });
    });
    (D.projects || []).forEach(p => {
      if (isAir(p)) {
        const inv = FE.projectInvestment(p);
        if (inv.investiert === 0) alerts.push({ t: "info", txt: `${p.name}: Investitionskosten in der Datenpflege ergänzen` });
        return;
      }
      const cf = FE.projectCashflow(p);
      if (cf.length && cf[cf.length - 1].netto < 0) alerts.push({ t: "warn", txt: `${p.name}: negativer Netto-Cashflow (${eur(cf[cf.length - 1].netto)})` });
      const now = new Date(); const in12 = new Date(now.getFullYear(), now.getMonth() + 12, 1);
      (p.kredite || []).forEach(k => (k.sondertilgungen || []).forEach(s => {
        const d = new Date(s.datum);
        if (d >= now && d <= in12) alerts.push({ t: "info", txt: `${dttm(s.datum)}: Sondertilgung ${eur(s.betrag)} (${k.bezeichnung})` });
      }));
    });
    if (!alerts.length) alerts.push({ t: "ok", txt: "Keine offenen Hinweise." });
    const alertRows = alerts.map(a => `<div class="alert a-${a.t}"><span class="adot"></span>${esc(a.txt)}</div>`).join("");
    out.push(el(`<div class="card col-4">
      <div class="card-h"><div><div class="card-t">Auf dem Schirm</div>
        <div class="card-s">Hinweise & Termine</div></div></div>
      <div class="card-b"><div class="alerts">${alertRows}</div></div></div>`));

    const kreditRows = [];
    (D.projects || []).forEach(p => (p.kredite || []).forEach(k => {
      const s = FE.creditSummary(k);
      kreditRows.push(`<tr><td><b>${esc(k.bezeichnung)}</b><div style="font-size:11px;color:var(--soft)">${esc(p.name)} · ${esc(k.glaeubiger)}</div></td>
        <td class="num">${eur(k.betrag)}</td><td class="num neg-t">${eur(s.restschuld)}</td>
        <td class="num">${eur(s.monatsrate)}</td><td>${esc(k.zinsSatz)}%</td><td>${s.tilgtNie ? "nie" : (s.abzahlungDatum ? dttm(s.abzahlungDatum) : "—")}</td></tr>`);
    }));
    if (!kreditRows.length) kreditRows.push(`<tr><td colspan="6" class="note">Keine Kredite erfasst.</td></tr>`);
    out.push(el(`<div class="card col-7">
      <div class="card-h"><div><div class="card-t">Kredite</div>
        <div class="card-s">alle Darlehen über alle Projekte</div></div>
        <span class="chip">${eur(totalDebtRest)} Restschuld</span></div>
      <div class="card-b" style="padding-top:4px"><div class="tw"><table><thead><tr>
        <th>Darlehen</th><th class="num">Summe</th><th class="num">Restschuld</th>
        <th class="num">Rate/Mon.</th><th>Zins</th><th>Ende</th></tr></thead>
        <tbody>${kreditRows.join("")}</tbody></table></div></div></div>`));

    const vermRows = (D.rentals || []).map(o => {
      let e = 0, v = 0, m = 0;
      o.einheiten.forEach(u => { e++; if (u.status === "vermietet") { v++; m += u.kaltmiete + u.nebenkosten; } });
      const r = e ? Math.round(v / e * 100) : 0;
      return `<div class="vstat">
        <div class="vstat-top"><b>${esc(o.objekt)}</b><span>${v}/${e}</span></div>
        <div class="bar"><span style="width:${r}%"></span></div>
        <div class="vstat-sub">${pct(r)} Auslastung · ${eur(m)}/Mon. warm</div></div>`;
    }).join("");
    out.push(el(`<div class="card col-5">
      <div class="card-h"><div><div class="card-t">Vermietung</div>
        <div class="card-s">Auslastung je Objekt</div></div></div>
      <div class="card-b"><div class="vstats">${vermRows}</div></div></div>`));

    setTimeout(() => $$(".home-proj").forEach(c => c.onclick = () => route(c.dataset.go)), 0);
    return out;
  }

  /* ---------------- MIET-PROJEKT ---------------- */
  function projectHero(p, fort, inv, statBoxes) {
    return `<div class="proj-hero col-12">
      <div class="proj-hero-bg"></div>
      <div class="proj-hero-in">
        <div class="proj-hero-l">
          <div class="proj-tag">${isAir(p) ? "Kurzzeitvermietung" : "Projekt"}</div>
          <h2>${esc(p.name)}</h2>
          <div class="proj-addr">${esc(p.address)}</div>
          <div class="proj-scope">${esc(p.scope)}</div>
        </div>
        <div class="proj-hero-r">
          <div class="ring" style="--p:${fort}">
            <div class="ring-num">${fort}<span>%</span></div>
            <div class="ring-lab">${isAir(p) ? "Auslastung" : "Fortschritt"}</div>
          </div>
        </div>
      </div>
      <div class="proj-stats">${statBoxes}</div>
    </div>`;
  }

  function renderProject(id) {
    const p = (D.projects || []).find(x => x.id === id);
    const out = [];
    if (!p) { out.push(el(`<div class="card col-12"><div class="card-b note">Projekt nicht gefunden.</div></div>`)); return out; }

    const aktiv = p.gewerke.filter(g => g.aktiv).sort((a, b) => a.sort - b.sort);
    const inv = FE.projectInvestment(p);
    const totalA = sum(aktiv, g => g.angebot), totalG = sum(aktiv, g => g.gezahlt);
    const fort = Math.round(aktiv.reduce((s, x) => s + x.fortschritt, 0) / (aktiv.length || 1));

    out.push(el(projectHero(p, fort, inv,
      `<div class="ps"><span>Investition geplant</span><b>${eur(inv.geplant)}</b></div>
       <div class="ps"><span>Bereits investiert</span><b>${eur(inv.investiert)}</b></div>
       <div class="ps"><span>Gewerke gezahlt</span><b>${eur(totalG)} / ${eur(totalA)}</b></div>
       <div class="ps"><span>Aktive Gewerke</span><b>${aktiv.length}</b></div>`)));

    const cf = FE.projectCashflow(p);
    const yc = FE.yearlyCashflow(p);
    const be = FE.breakEven(p);
    const monthlyDebt = FE.projectMonthlyDebt(p);
    let restTotal = 0; (p.kredite || []).forEach(k => restTotal += FE.creditSummary(k).restschuld);
    const lastNetto = cf.length ? cf[cf.length - 1].netto : 0;
    const yearNetto = yc.length ? yc[yc.length - 1].netto : 0;
    const obj = (D.rentals || []).find(o => o.projektId === p.id);
    let einh = 0, verm = 0, miete = 0;
    if (obj) obj.einheiten.forEach(u => { einh++; if (u.status === "vermietet") { verm++; miete += u.kaltmiete + u.nebenkosten; } });
    const occ = einh ? Math.round(verm / einh * 100) : 0;
    const beTxt = be.investBreakEven ? (be.monateBisBE === 0 ? "erreicht" : dttm(be.investBreakEven)) : "noch offen";

    out.push(el(`<div class="card col-12">
      <div class="card-h"><div><div class="card-t">Gesamtübersicht</div>
        <div class="card-s">Kennzahlen für ${esc(p.name)}</div></div>
        <span class="chip">${fort}% Baufortschritt</span></div>
      <div class="card-b">
        <div class="kpis">
          ${kpi("Investition geplant", eur(inv.geplant), "Gewerke + Nebenkosten", true)}
          ${kpi("Bereits investiert", eur(inv.investiert), pct(inv.geplant ? inv.investiert / inv.geplant * 100 : 0) + " der Planung", true)}
          ${kpi("Restschuld Kredite", eur(restTotal), eur(monthlyDebt) + " / Monat", false)}
          ${kpi("Netto-Cashflow / Monat", eur(lastNetto), cf.length ? cf[cf.length - 1].monat : "—", lastNetto >= 0)}
          ${kpi("Netto-Cashflow / Jahr", eur(yearNetto), yc.length ? yc[yc.length - 1].jahr : "—", yearNetto >= 0)}
          ${kpi("Mieteinnahmen", eur(miete), verm + " / " + einh + " vermietet (warm)", occ >= 80)}
          ${kpi("Auslastung", pct(occ), einh + " Einheiten", occ >= 80)}
          ${kpi("Invest-Break-Even", beTxt, be.investBreakEven && be.monateBisBE ? "in " + be.monateBisBE + " Mon." : "Prognose", !!be.investBreakEven)}
        </div>
      </div></div>`));

    const cards = aktiv.map(g => {
      const o = g.angebot - g.gezahlt;
      const tone = g.fortschritt >= 100 ? "done" : g.fortschritt > 0 ? "wip" : "todo";
      return `<div class="gw ${tone}">
        <div class="gw-top"><div class="gw-name">${esc(g.name)}</div><div class="gw-pct">${g.fortschritt}%</div></div>
        <div class="gw-firma">${esc(g.firma)}</div>
        <div class="bar"><span style="width:${g.fortschritt}%"></span></div>
        <div class="gw-row"><span>Angebot</span><b>${eur(g.angebot)}</b></div>
        <div class="gw-row"><span>Gezahlt</span><b>${eur(g.gezahlt)}</b></div>
        <div class="gw-row"><span>Offen</span><b style="color:${o > 0 ? 'var(--danger)' : 'var(--accent-2)'}">${eur(o)}</b></div>
      </div>`;
    }).join("");
    out.push(el(`<div class="card col-12">
      <div class="card-h"><div><div class="card-t">Gewerke</div><div class="card-s">${aktiv.length} aktive Gewerke</div></div></div>
      <div class="card-b"><div class="gw-grid">${cards}</div></div></div>`));

    out.push(financeProjectCard(p));
    return out;
  }

  /* ---------------- AIRBNB-PROJEKT ---------------- */
  function renderAirbnb(p) {
    const out = [];
    const a = p.airbnb || {};
    const inv = FE.projectInvestment(p);
    const mod = FE.airbnbModel(p, 30.4);
    const be = FE.breakEven(p);
    const cf = FE.projectCashflow(p);
    const jahresNetto = cf.reduce((s, r) => s + r.netto, 0);

    out.push(el(projectHero(p, Math.round(a.belegungsrate || 0), inv,
      `<div class="ps"><span>Ø Umsatz / Monat</span><b>${eur(mod.bruttoUmsatz)}</b></div>
       <div class="ps"><span>Ø Netto / Monat</span><b>${eur(mod.netto)}</b></div>
       <div class="ps"><span>Netto / Jahr</span><b>${eur(jahresNetto)}</b></div>
       <div class="ps"><span>Nachtpreis</span><b>${eur(a.nachtpreis)}</b></div>`)));

    // Steuerungspult
    out.push(el(`<div class="card col-12 air-control">
      <div class="card-h"><div><div class="card-t">Steuerung</div>
        <div class="card-s">Stellschrauben bewegen – die Hochrechnung aktualisiert sich live</div></div>
        <button class="btn" id="airToData">In Datenpflege öffnen →</button></div>
      <div class="card-b"><div class="air-sliders" id="airSliders"></div></div></div>`));

    // Live-Ergebniskarte
    out.push(el(`<div class="card col-12" id="airResultCard">
      <div class="card-h"><div><div class="card-t">Monats-Hochrechnung</div>
        <div class="card-s">auf Basis der aktuellen Steuerung (Ø-Monat = 30,4 Tage)</div></div></div>
      <div class="card-b" id="airResult"></div></div>`));

    // Jahresverlauf
    out.push(el(`<div class="card col-12">
      <div class="card-h"><div><div class="card-t">Jahresverlauf</div>
        <div class="card-s">Netto je Monat über 12 Monate (modelliert)</div></div>
        <span class="chip">Σ ${eur(jahresNetto)}</span></div>
      <div class="card-b" id="airYear"></div></div>`));

    setTimeout(() => { buildAirControls(p); }, 0);
    return out;
  }

  const AIR_FIELDS = [
    ["nachtpreis", "Nachtpreis", "€", 20, 400, 5],
    ["belegungsrate", "Belegung", "%", 0, 100, 1],
    ["naechteProBuchung", "Ø Nächte / Buchung", "", 1, 14, 1],
    ["reinigungProBuchung", "Reinigungsgebühr (Gast)", "€", 0, 150, 5],
    ["reinigungskostenIntern", "Reinigungskosten (intern)", "€", 0, 150, 5],
    ["plattformProvision", "Plattform-Provision", "%", 0, 30, 1],
    ["fixkostenMonat", "Fixkosten / Monat", "€", 0, 1500, 10],
    ["betreuungMonat", "Betreuung / Monat", "€", 0, 1500, 10]
  ];

  function buildAirControls(p) {
    const host = $("#airSliders");
    if (!host) return;
    p.airbnb = p.airbnb || {};
    host.innerHTML = "";
    AIR_FIELDS.forEach(([key, label, unit, min, max, step]) => {
      const val = Number(p.airbnb[key]) || 0;
      const row = el(`<div class="air-sl">
        <div class="air-sl-top"><span>${esc(label)}</span><b><span class="air-val">${num(val)}</span>${unit ? " " + unit : ""}</b></div>
        <input type="range" min="${min}" max="${max}" step="${step}" value="${val}">
      </div>`);
      const input = row.querySelector("input");
      const valEl = row.querySelector(".air-val");
      input.addEventListener("input", e => {
        const v = Number(e.target.value);
        p.airbnb[key] = v;
        valEl.textContent = num(v);
        updateAirResult(p);
      });
      host.appendChild(row);
    });
    updateAirResult(p);
  }

  function updateAirResult(p) {
    const mod = FE.airbnbModel(p, 30.4);
    const host = $("#airResult");
    if (host) {
      host.innerHTML = `<div class="kpis">
        ${kpi("Ø Umsatz / Monat", eur(mod.bruttoUmsatz), num(mod.belegteNaechte) + " belegte Nächte", true)}
        ${kpi("Plattform-Provision", "− " + eur(mod.provisionKosten), pct(p.airbnb.plattformProvision) + " v. Übernachtung", false)}
        ${kpi("Reinigung intern", "− " + eur(mod.reinigungskosten), num(mod.buchungen) + " Buchungen", false)}
        ${kpi("Fixkosten + Betreuung", "− " + eur(mod.fixkosten + mod.betreuung), "pro Monat", false)}
        ${kpi("Kreditrate", "− " + eur(mod.kreditrate), (p.kredite || []).length + " Kredit(e)", false)}
        ${kpi("Netto / Monat", eur(mod.netto), "nach allen Kosten", mod.netto >= 0)}
      </div>
      <div class="air-flow">
        <div class="air-flow-bar">
          <span class="afb afb-in" style="flex:${Math.max(0.01, mod.bruttoUmsatz)}" title="Umsatz ${eur(mod.bruttoUmsatz)}"></span>
        </div>
        <div class="air-flow-bar">
          <span class="afb afb-prov" style="flex:${Math.max(0.01, mod.provisionKosten)}" title="Provision"></span>
          <span class="afb afb-rein" style="flex:${Math.max(0.01, mod.reinigungskosten)}" title="Reinigung"></span>
          <span class="afb afb-fix" style="flex:${Math.max(0.01, mod.fixkosten + mod.betreuung)}" title="Fix + Betreuung"></span>
          <span class="afb afb-kredit" style="flex:${Math.max(0.01, mod.kreditrate)}" title="Kredit"></span>
          <span class="afb afb-net" style="flex:${Math.max(0.01, Math.abs(mod.netto))}" title="Netto"></span>
        </div>
        <div class="air-legend">
          <span><i class="afb-in"></i>Umsatz</span>
          <span><i class="afb-prov"></i>Provision</span>
          <span><i class="afb-rein"></i>Reinigung</span>
          <span><i class="afb-fix"></i>Fix/Betreuung</span>
          <span><i class="afb-kredit"></i>Kredit</span>
          <span><i class="afb-net"></i>Netto</span>
        </div>
      </div>`;
    }
    const yhost = $("#airYear");
    if (yhost) {
      const cf = FE.projectCashflow(p);
      yhost.innerHTML = spark(cf.map(r => r.netto), cf.map(r => r.monat)) +
        `<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--softer);margin-top:8px">
          <span>${cf[0] ? cf[0].monat : "—"}</span><span>${cf.length ? cf[cf.length - 1].monat : "—"}</span></div>`;
    }
  }

  /* ---------------- FINANZEN ---------------- */
  let financeActive = null;
  function renderFinanzen() {
    const out = [];
    const projs = D.projects || [];
    if (!financeActive || !projs.find(p => p.id === financeActive) && financeActive !== "__all") {
      financeActive = projs[0] ? projs[0].id : null;
    }

    const tabs = projs.map(p => `<button class="ftab ${p.id === financeActive ? 'on' : ''}" data-pid="${p.id}">${esc(p.name)}</button>`).join("");
    const tabBar = el(`<div class="col-12 ftabs">${tabs}<button class="ftab ${financeActive === '__all' ? 'on' : ''}" data-pid="__all">Gesamt</button></div>`);
    tabBar.querySelectorAll(".ftab").forEach(b => b.onclick = () => { financeActive = b.dataset.pid; route("finanzen"); });
    out.push(tabBar);

    if (financeActive === "__all") { out.push(...financeAll()); return out; }
    const p = projs.find(x => x.id === financeActive) || projs[0];
    if (!p) { out.push(el(`<div class="card col-12"><div class="card-b note">Kein Projekt.</div></div>`)); return out; }

    const inv = FE.projectInvestment(p);
    const cf = FE.projectCashflow(p);
    const yc = FE.yearlyCashflow(p);
    const be = FE.breakEven(p);
    const monthlyDebt = FE.projectMonthlyDebt(p);
    let restTotal = 0; (p.kredite || []).forEach(k => restTotal += FE.creditSummary(k).restschuld);
    const lastNetto = cf.length ? cf[cf.length - 1].netto : 0;
    const yearNetto = yc.length ? yc[yc.length - 1].netto : 0;
    const acc = p.account || {};

    out.push(el(`<div class="card col-12"><div class="card-b">
      <div class="kpis">
        ${kpi(acc.name || "Kontostand", eur(acc.kontostand), "Rücklagen " + eur(acc.ruecklagen), true)}
        ${kpi("Netto-Cashflow / Monat", eur(lastNetto), cf.length ? cf[cf.length - 1].monat : "—", lastNetto >= 0)}
        ${kpi("Netto-Cashflow / Jahr", eur(yearNetto), yc.length ? yc[yc.length - 1].jahr : "—", yearNetto >= 0)}
        ${kpi("Kreditrate / Monat", eur(monthlyDebt), (p.kredite || []).length + " Kredit(e)", false)}
        ${kpi("Restschuld", eur(restTotal), "aktuell", false)}
        ${kpi("Investiert", eur(inv.investiert), "von " + eur(inv.geplant), true)}
      </div></div></div>`));

    out.push(breakEvenCard(p, be, inv, monthlyDebt));

    out.push(el(`<div class="card col-8">
      <div class="card-h"><div><div class="card-t">Einnahmen vs. Ausgaben</div>
        <div class="card-s">monatlich · Ausgaben inkl. Kreditrate${isAir(p) ? " & Plattformkosten" : " & Nebenkosten"}</div></div></div>
      <div class="card-b">${dualChart(cf)}</div></div>`));

    const yrows = yc.map(y => `<tr><td><b>${y.jahr}</b></td><td class="num">${eur(y.einnahmen)}</td>
      <td class="num">${eur(y.ausgaben)}</td><td class="num ${y.netto < 0 ? 'neg-t' : 'pos-t'}">${eur(y.netto)}</td></tr>`).join("");
    out.push(el(`<div class="card col-4">
      <div class="card-h"><div><div class="card-t">Jahresübersicht</div><div class="card-s">Einnahmen / Ausgaben / Netto</div></div></div>
      <div class="card-b" style="padding-top:4px"><div class="tw"><table><thead><tr><th>Jahr</th><th class="num">Ein</th><th class="num">Aus</th><th class="num">Netto</th></tr></thead><tbody>${yrows}</tbody></table></div></div></div>`));

    (p.kredite || []).forEach(k => out.push(creditCard(k)));
    return out;
  }

  function financeProjectCard(p) {
    const cf = FE.projectCashflow(p);
    const be = FE.breakEven(p);
    const monthlyDebt = FE.projectMonthlyDebt(p);
    const lastNetto = cf.length ? cf[cf.length - 1].netto : 0;
    const beTxt = be.investBreakEven ? dttm(be.investBreakEven) : "noch offen";
    return el(`<div class="card col-12">
      <div class="card-h"><div><div class="card-t">Finanzen kompakt</div>
        <div class="card-s">Details unter „Finanzen"</div></div>
        <button class="btn" id="goFin">Zu Finanzen →</button></div>
      <div class="card-b">
        <div class="mini-grid">
          <div><span>Kreditrate/Mon.</span><b>${eur(monthlyDebt)}</b></div>
          <div><span>Netto-CF zuletzt</span><b class="${lastNetto < 0 ? 'neg-t' : 'pos-t'}">${eur(lastNetto)}</b></div>
          <div><span>Invest-Break-Even</span><b>${beTxt}</b></div>
          <div><span>Kredite</span><b>${(p.kredite || []).length}</b></div>
        </div>
      </div></div>`);
  }

  function breakEvenCard(p, be, inv, monthlyDebt) {
    const reached = be.investBreakEven && be.monateBisBE === 0;
    const proj = be.investBreakEven && be.monateBisBE > 0;
    let status, cls, detail;
    if (reached) { status = "Erreicht"; cls = "be-ok"; detail = "Die kumulierten Netto-Einnahmen decken die Investition."; }
    else if (proj) { status = dttm(be.investBreakEven); cls = "be-soon"; detail = `Voraussichtlich in ${be.monateBisBE} Monaten bei ø ${eur(be.monatlicheRate)} Netto/Monat.`; }
    else { status = "noch offen"; cls = "be-wait"; detail = be.monatlicheRate < 0 ? `Aktueller Netto-Cashflow negativ (${eur(be.monatlicheRate)}/Monat) – Erträge müssen steigen.` : "Zu wenig Datenbasis für eine Prognose."; }

    const cfBE = be.cfPositive ? "positiv" : "negativ";
    return el(`<div class="card col-12 be-card">
      <div class="card-h"><div><div class="card-t">Break-Even-Forecast</div>
        <div class="card-s">Investition vs. kumulierte Einnahmen über die Laufzeit</div></div></div>
      <div class="card-b">
        <div class="be-grid">
          <div class="be-box ${cls}">
            <div class="be-lab">Invest-Break-Even</div>
            <div class="be-val">${status}</div>
            <div class="be-detail">${detail}</div>
          </div>
          <div class="be-box ${be.cfPositive ? 'be-ok' : 'be-wait'}">
            <div class="be-lab">Cashflow-Break-Even</div>
            <div class="be-val">${be.cfPositive ? "gedeckt" : "noch nicht"}</div>
            <div class="be-detail">Monatlicher Netto-Cashflow aktuell ${cfBE} (ø ${eur(be.monatlicheRate)}). Kreditrate ${eur(monthlyDebt)}/Mon.</div>
          </div>
          <div class="be-box">
            <div class="be-lab">Fortschritt zur Deckung</div>
            <div class="be-val">${pct(inv.investiert ? Math.max(0, be.bisher) / inv.investiert * 100 : 0)}</div>
            <div class="bar" style="margin-top:8px"><span style="width:${Math.min(100, Math.max(0, be.bisher) / (inv.investiert || 1) * 100)}%"></span></div>
            <div class="be-detail">kumuliert ${eur(Math.max(0, be.bisher))} von ${eur(inv.investiert)}</div>
          </div>
        </div>
      </div></div>`);
  }

  function creditCard(k) {
    const s = FE.creditSummary(k);
    const modusTxt = k.art === "endfaellig" ? "Endfällig" :
      (k.rateModus === "rate" ? "Annuität · feste Rate" :
       k.rateModus === "laufzeit" ? "Annuität · feste Laufzeit" : "Annuität · Tilgungssatz");
    const sonderRows = (k.sondertilgungen || []).map(x => `<tr><td>${dttm(x.datum)}</td><td class="num">${eur(x.betrag)}</td></tr>`).join("")
      || `<tr><td colspan="2" class="note">keine Sondertilgungen</td></tr>`;
    const seen = {};
    s.plan.forEach(r => { const y = r.monat.slice(0, 4); seen[y] = r.restschuld; });
    const yearly = Object.keys(seen).map(y => seen[y]);
    const laufzeitTxt = s.tilgtNie ? "> 80 J. (Rate deckt Zins nicht)"
      : s.abzahlungDatum ? `${s.laufzeitJahre} J. (bis ${dttm(s.abzahlungDatum)})`
      : `${k.laufzeitJahre} J.`;
    const warn = s.tilgtNie ? `<div class="warn-box">Die monatliche Rate deckt die Zinsen nicht – das Darlehen wird so nie getilgt. Bitte Rate erhöhen.</div>` : "";
    return el(`<div class="card col-6 credit-card">
      <div class="card-h"><div><div class="card-t">${esc(k.bezeichnung)}</div>
        <div class="card-s">${esc(k.glaeubiger)} · ${modusTxt}</div></div>
        <span class="chip">${esc(k.zinsSatz)}% p.a.</span></div>
      <div class="card-b">
        ${warn}
        <div class="mini-grid">
          <div><span>Darlehenssumme</span><b>${eur(k.betrag)}</b></div>
          <div><span>Restschuld aktuell</span><b class="neg-t">${eur(s.restschuld)}</b></div>
          <div><span>Rate / Monat</span><b>${eur(s.monatsrate)}</b></div>
          <div><span>Laufzeit (berechnet)</span><b>${laufzeitTxt}</b></div>
          <div><span>Zinsen gesamt</span><b>${eur(s.gesamtZinsen)}</b></div>
          <div><span>Sondertilgung Σ</span><b>${eur(s.sonderSumme)}</b></div>
        </div>
        <div class="be-lab" style="margin:14px 0 6px">Restschuld-Verlauf (jährlich)</div>
        ${spark(yearly)}
        <div class="be-lab" style="margin:14px 0 6px">Sondertilgungen</div>
        <div class="tw"><table><thead><tr><th>Datum</th><th class="num">Betrag</th></tr></thead><tbody>${sonderRows}</tbody></table></div>
      </div></div>`);
  }

  function dualChart(cf) {
    if (!cf.length) return `<div class="note">Keine Daten.</div>`;
    const max = Math.max(...cf.map(r => Math.max(r.einnahmen, r.ausgaben)), 1);
    const cols = cf.map(r => {
      const he = Math.max(3, Math.round(r.einnahmen / max * 110));
      const ha = Math.max(3, Math.round(r.ausgaben / max * 110));
      return `<div class="dc-col" title="${r.monat}: +${eur(r.einnahmen)} / -${eur(r.ausgaben)}">
        <div class="dc-pair"><span class="dc-in" style="height:${he}px"></span><span class="dc-out" style="height:${ha}px"></span></div>
        <div class="dc-lab">${r.monat.slice(5)}</div></div>`;
    }).join("");
    return `<div class="dc-wrap"><div class="dc">${cols}</div></div>
      <div class="dc-legend"><span><i class="li-in"></i>Einnahmen</span><span><i class="li-out"></i>Ausgaben (inkl. Kredit)</span></div>`;
  }

  function financeAll() {
    const out = [];
    const projs = D.projects || [];
    let inG = 0, inI = 0, restT = 0, debtT = 0, kontoT = 0;
    projs.forEach(p => {
      const inv = FE.projectInvestment(p); inG += inv.geplant; inI += inv.investiert;
      debtT += FE.projectMonthlyDebt(p);
      (p.kredite || []).forEach(k => restT += FE.creditSummary(k).restschuld);
      kontoT += (p.account && p.account.kontostand) || 0;
    });
    out.push(el(`<div class="card col-12"><div class="card-b"><div class="kpis">
      ${kpi("Konten gesamt", eur(kontoT), "alle Projekte", true)}
      ${kpi("Investition geplant", eur(inG), "", true)}
      ${kpi("Investiert", eur(inI), pct(inG ? inI / inG * 100 : 0), true)}
      ${kpi("Restschuld gesamt", eur(restT), "alle Kredite", false)}
      ${kpi("Kreditrate / Monat", eur(debtT), "Summe", false)}
    </div></div></div>`));
    const rows = projs.map(p => {
      const inv = FE.projectInvestment(p);
      let rest = 0; (p.kredite || []).forEach(k => rest += FE.creditSummary(k).restschuld);
      const cf = FE.projectCashflow(p); const ln = cf.length ? cf[cf.length - 1].netto : 0;
      return `<tr><td><b>${esc(p.name)}</b>${isAir(p) ? ' <span class="chip chip-air">AirBnB</span>' : ''}</td><td class="num">${eur(inv.investiert)}</td>
        <td class="num">${eur(rest)}</td><td class="num">${eur(FE.projectMonthlyDebt(p))}</td>
        <td class="num ${ln < 0 ? 'neg-t' : 'pos-t'}">${eur(ln)}</td></tr>`;
    }).join("");
    out.push(el(`<div class="card col-12"><div class="card-h"><div><div class="card-t">Vergleich der Projekte</div>
      <div class="card-s">getrennte Konten</div></div></div>
      <div class="card-b" style="padding-top:4px"><div class="tw"><table><thead><tr><th>Projekt</th><th class="num">Investiert</th>
      <th class="num">Restschuld</th><th class="num">Rate/Mon.</th><th class="num">Netto-CF</th></tr></thead><tbody>${rows}</tbody></table></div></div></div>`));
    return out;
  }

  /* ---------------- VERMIETUNG ---------------- */
  function renderVermietung() {
    const out = [];
    let units = 0, occ = 0, rent = 0, nk = 0;
    (D.rentals || []).forEach(o => o.einheiten.forEach(u => { units++; if (u.status === "vermietet") { occ++; rent += u.kaltmiete; nk += u.nebenkosten; } }));
    const rate = units ? Math.round(occ / units * 100) : 0;
    out.push(el(`<div class="card col-12"><div class="card-b"><div class="kpis">
      ${kpi("Auslastung", pct(rate), occ + " / " + units + " vermietet", rate >= 80)}
      ${kpi("Kaltmiete / Monat", eur(rent), "Summe vermietet", true)}
      ${kpi("Nebenkosten / Monat", eur(nk), "Vorauszahlung", true)}
      ${kpi("Warmmiete / Monat", eur(rent + nk), "kalt + NK", true)}
    </div></div></div>`));
    (D.rentals || []).forEach(o => {
      const rows = o.einheiten.map(u => {
        const b = u.status === "vermietet" ? `<span class="badge b-ok">vermietet</span>`
          : u.status === "kuendigung" ? `<span class="badge b-warn">Kündigung</span>`
          : `<span class="badge b-free">frei</span>`;
        return `<tr><td><b>${esc(u.wohnung)}</b></td><td>${u.flaeche} m²</td><td>${esc(u.mieter || "—")}</td>
          <td>${dttm(u.einzug)}</td><td class="num">${eur(u.kaltmiete)}</td><td class="num">${eur(u.nebenkosten)}</td>
          <td class="num">${eur(u.kaltmiete + u.nebenkosten)}</td><td>${b}</td></tr>`;
      }).join("");
      const oR = sum(o.einheiten.filter(u => u.status === "vermietet"), u => u.kaltmiete);
      const oN = sum(o.einheiten.filter(u => u.status === "vermietet"), u => u.nebenkosten);
      out.push(el(`<div class="card col-12"><div class="card-h"><div><div class="card-t">${esc(o.objekt)}</div>
        <div class="card-s">${esc(o.ort)} · ${o.einheiten.length} Einheiten</div></div><span class="chip">${eur(oR + oN)} / Monat</span></div>
        <div class="card-b" style="padding-top:4px"><div class="tw"><table><thead><tr><th>Einheit</th><th>Fläche</th><th>Mieter</th><th>Einzug</th>
        <th class="num">Kaltmiete</th><th class="num">NK</th><th class="num">Warm</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></div></div>`));
    });
    return out;
  }

  /* ---------------- DATENPFLEGE ---------------- */
  let dz = "projekte";
  let diffShown = false;
  function renderDaten() {
    diffShown = false;
    const out = [];
    const subs = [["projekte", "Projekte & Gewerke"], ["airbnb", "AirBnB"], ["kredite", "Kredite"], ["finanz", "Finanzbewegungen"], ["vermietung", "Vermietung"], ["zugang", "Zugang & Export"]];
    const bar = el(`<div class="col-12 ftabs">${subs.map(s => `<button class="ftab ${s[0] === dz ? 'on' : ''}" data-dz="${s[0]}">${s[1]}</button>`).join("")}</div>`);
    bar.querySelectorAll(".ftab").forEach(b => b.onclick = () => { dz = b.dataset.dz; route("daten"); });
    out.push(bar);

    out.push(el(`<div class="card col-12 save-card"><div class="card-b" style="display:flex;flex-direction:column;gap:12px">
      <div class="note">Werte ändern – der <b>aktuelle Wert</b> steht klein darunter, geänderte Felder werden grün markiert. Prüfen, dann den Code kopieren und in <code>data.js</code> ersetzen.</div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-accent" id="copyBtn">Änderungen prüfen & Code kopieren</button>
        <span class="note" id="copyMsg"></span>
      </div>
      <div id="diffPanel" class="diff-panel" style="display:none"></div>
    </div></div>`));

    if (dz === "projekte") out.push(...formProjekte());
    if (dz === "airbnb") out.push(...formAirbnb());
    if (dz === "kredite") out.push(...formKredite());
    if (dz === "finanz") out.push(...formFinanz());
    if (dz === "vermietung") out.push(...formVermietung());
    if (dz === "zugang") out.push(...formZugang());

    setTimeout(() => { const b = $("#copyBtn"); if (b) b.onclick = showDiffThenCopy; }, 0);
    return out;
  }

  function field(label, value, onInput, type) {
    const cur = (value === "" || value == null) ? "leer" : value;
    const w = el(`<label class="fld">
      <span class="fld-lab">${esc(label)}</span>
      <input type="${type || 'text'}" value="${esc(value)}">
      <span class="fld-cur">aktuell: ${esc(cur)}</span>
    </label>`);
    const inp = w.querySelector("input");
    const curEl = w.querySelector(".fld-cur");
    inp.addEventListener("input", e => {
      onInput(type === "number" ? Number(e.target.value) : e.target.value);
      curEl.classList.toggle("changed", String(e.target.value) !== String(value));
    });
    return w;
  }
  function selectField(label, value, options, onInput) {
    const opts = options.map(o => `<option value="${esc(o[0])}" ${o[0] === value ? "selected" : ""}>${esc(o[1])}</option>`).join("");
    const curLabel = (options.find(o => o[0] === value) || [null, value])[1];
    const w = el(`<label class="fld">
      <span class="fld-lab">${esc(label)}</span>
      <select>${opts}</select>
      <span class="fld-cur">aktuell: ${esc(curLabel)}</span>
    </label>`);
    const curEl = w.querySelector(".fld-cur");
    w.querySelector("select").addEventListener("change", e => {
      onInput(e.target.value);
      curEl.classList.toggle("changed", e.target.value !== value);
    });
    return w;
  }
  function rowBtn(txt, fn, danger) {
    const b = el(`<button class="btn ${danger ? 'btn-danger' : ''}" type="button">${esc(txt)}</button>`);
    b.onclick = fn; return b;
  }

  function formProjekte() {
    const out = [];
    (D.projects || []).filter(p => !isAir(p)).forEach(p => {
      const card = el(`<div class="card col-12"><div class="card-h"><div><div class="card-t">${esc(p.name)}</div>
        <div class="card-s">Stammdaten · ${p.gewerke.length} Gewerke</div></div></div><div class="card-b form-body"></div></div>`);
      const body = card.querySelector(".form-body");
      const stamm = el(`<div class="form-grid"></div>`);
      stamm.append(
        field("Name", p.name, v => p.name = v),
        field("Adresse", p.address, v => p.address = v),
        field("Umfang", p.scope, v => p.scope = v),
        field("Investitionsstart", p.investitionStart, v => p.investitionStart = v),
        field("Kontostand (€)", (p.account || {}).kontostand, v => { p.account = p.account || {}; p.account.kontostand = v; }, "number"),
        field("Rücklagen (€)", (p.account || {}).ruecklagen, v => { p.account = p.account || {}; p.account.ruecklagen = v; }, "number"),
      );
      body.appendChild(stamm);

      body.appendChild(el(`<div class="sub-h">Gewerke</div>`));
      const gwWrap = el(`<div class="edit-rows"></div>`);
      const renderGw = () => {
        gwWrap.innerHTML = "";
        p.gewerke.forEach((g, gi) => {
          const r = el(`<div class="erow erow-gw"></div>`);
          r.append(
            field("Gewerk", g.name, v => g.name = v),
            field("Firma", g.firma, v => g.firma = v),
            field("Angebot €", g.angebot, v => g.angebot = v, "number"),
            field("Gezahlt €", g.gezahlt, v => g.gezahlt = v, "number"),
            field("Fortschr. %", g.fortschritt, v => g.fortschritt = v, "number"),
            rowBtn("Entfernen", () => { p.gewerke.splice(gi, 1); renderGw(); }, true),
          );
          gwWrap.appendChild(r);
        });
      };
      renderGw();
      body.appendChild(gwWrap);
      body.appendChild(rowBtn("+ Gewerk hinzufügen", () => {
        p.gewerke.push({ aktiv: true, sort: p.gewerke.length + 1, name: "Neues Gewerk", firma: "", angebot: 0, gezahlt: 0, fortschritt: 0 });
        renderGw();
      }));

      body.appendChild(el(`<div class="sub-h">Weitere Investitionskosten</div>`));
      const wiWrap = el(`<div class="edit-rows"></div>`);
      p.weitereInvestition = p.weitereInvestition || [];
      const renderWi = () => {
        wiWrap.innerHTML = "";
        p.weitereInvestition.forEach((x, xi) => {
          const r = el(`<div class="erow erow-2"></div>`);
          r.append(field("Titel", x.titel, v => x.titel = v), field("Betrag €", x.betrag, v => x.betrag = v, "number"),
            rowBtn("Entfernen", () => { p.weitereInvestition.splice(xi, 1); renderWi(); }, true));
          wiWrap.appendChild(r);
        });
      };
      renderWi(); body.appendChild(wiWrap);
      body.appendChild(rowBtn("+ Kostenposition", () => { p.weitereInvestition.push({ titel: "", betrag: 0 }); renderWi(); }));
      out.push(card);
    });
    return out;
  }

  function formAirbnb() {
    const out = [];
    const airProjects = (D.projects || []).filter(isAir);
    if (!airProjects.length) {
      out.push(el(`<div class="card col-12"><div class="card-b note">Kein AirBnB-Projekt vorhanden.</div></div>`));
      return out;
    }
    airProjects.forEach(p => {
      p.airbnb = p.airbnb || {};
      const card = el(`<div class="card col-12"><div class="card-h"><div><div class="card-t">${esc(p.name)}</div>
        <div class="card-s">Stammdaten & Steuerung der Kurzzeitvermietung</div></div></div><div class="card-b form-body"></div></div>`);
      const body = card.querySelector(".form-body");

      const stamm = el(`<div class="form-grid"></div>`);
      stamm.append(
        field("Name", p.name, v => p.name = v),
        field("Adresse", p.address, v => p.address = v),
        field("Umfang", p.scope, v => p.scope = v),
        field("Investitionsstart", p.investitionStart, v => p.investitionStart = v),
        field("Kontostand (€)", (p.account || {}).kontostand, v => { p.account = p.account || {}; p.account.kontostand = v; }, "number"),
        field("Rücklagen (€)", (p.account || {}).ruecklagen, v => { p.account = p.account || {}; p.account.ruecklagen = v; }, "number"),
      );
      body.appendChild(stamm);

      body.appendChild(el(`<div class="sub-h">Steuerung Kurzzeitvermietung</div>`));
      const air = el(`<div class="form-grid"></div>`);
      air.append(
        field("Nachtpreis €", p.airbnb.nachtpreis, v => p.airbnb.nachtpreis = v, "number"),
        field("Belegungsrate %", p.airbnb.belegungsrate, v => p.airbnb.belegungsrate = v, "number"),
        field("Ø Nächte / Buchung", p.airbnb.naechteProBuchung, v => p.airbnb.naechteProBuchung = v, "number"),
        field("Reinigungsgebühr Gast €", p.airbnb.reinigungProBuchung, v => p.airbnb.reinigungProBuchung = v, "number"),
        field("Reinigungskosten intern €", p.airbnb.reinigungskostenIntern, v => p.airbnb.reinigungskostenIntern = v, "number"),
        field("Plattform-Provision %", p.airbnb.plattformProvision, v => p.airbnb.plattformProvision = v, "number"),
        field("Fixkosten / Monat €", p.airbnb.fixkostenMonat, v => p.airbnb.fixkostenMonat = v, "number"),
        field("Betreuung / Monat €", p.airbnb.betreuungMonat, v => p.airbnb.betreuungMonat = v, "number"),
      );
      body.appendChild(air);

      body.appendChild(el(`<div class="sub-h">Investition (Gewerke / Ausstattung)</div>`));
      const gwWrap = el(`<div class="edit-rows"></div>`);
      p.gewerke = p.gewerke || [];
      const renderGw = () => {
        gwWrap.innerHTML = "";
        p.gewerke.forEach((g, gi) => {
          const r = el(`<div class="erow erow-gw"></div>`);
          r.append(
            field("Position", g.name, v => g.name = v),
            field("Firma", g.firma, v => g.firma = v),
            field("Angebot €", g.angebot, v => g.angebot = v, "number"),
            field("Gezahlt €", g.gezahlt, v => g.gezahlt = v, "number"),
            field("Fortschr. %", g.fortschritt, v => g.fortschritt = v, "number"),
            rowBtn("Entfernen", () => { p.gewerke.splice(gi, 1); renderGw(); }, true),
          );
          gwWrap.appendChild(r);
        });
      };
      renderGw(); body.appendChild(gwWrap);
      body.appendChild(rowBtn("+ Position hinzufügen", () => {
        p.gewerke.push({ aktiv: true, sort: p.gewerke.length + 1, name: "Neue Position", firma: "", angebot: 0, gezahlt: 0, fortschritt: 0 });
        renderGw();
      }));
      out.push(card);
    });
    return out;
  }

  function formKredite() {
    const out = [];
    (D.projects || []).forEach(p => {
      const card = el(`<div class="card col-12"><div class="card-h"><div><div class="card-t">${esc(p.name)} – Kredite</div>
        <div class="card-s">${(p.kredite || []).length} Kredit(e)</div></div></div><div class="card-b form-body"></div></div>`);
      const body = card.querySelector(".form-body");
      p.kredite = p.kredite || [];
      const render = () => {
        body.innerHTML = "";
        p.kredite.forEach((k, ki) => {
          const block = el(`<div class="credit-edit"></div>`);
          const fieldsWrap = el(`<div></div>`);
          const preview = el(`<div class="calc-preview"></div>`);
          const updatePreview = () => {
            const s = FE.creditSummary(k);
            if (k.art === "endfaellig") {
              preview.innerHTML = `<b>Zins/Monat ${eur(s.monatsrate)}</b> · Tilgung endfällig nach ${k.laufzeitJahre} J. · Zinsen gesamt ${eur(s.gesamtZinsen)}`;
            } else if (s.tilgtNie) {
              preview.innerHTML = `<span class="cp-warn">Rate ${eur(s.monatsrate)} deckt die Zinsen nicht – wird nie getilgt.</span>`;
            } else {
              preview.innerHTML = `<b>Rate ${eur(s.monatsrate)}/Monat</b> · Laufzeit <b>${s.laufzeitJahre} J.</b>${s.abzahlungDatum ? " (bis " + dttm(s.abzahlungDatum) + ")" : ""} · Zinsen gesamt ${eur(s.gesamtZinsen)}`;
            }
          };
          const buildFields = () => {
            fieldsWrap.innerHTML = "";
            const g = el(`<div class="form-grid"></div>`);
            const f = (lab, key, type) => field(lab, k[key], v => { k[key] = v; updatePreview(); }, type);
            g.append(
              f("Bezeichnung", "bezeichnung"),
              f("Gläubiger", "glaeubiger"),
              selectField("Art", k.art, [["annuitaet", "Annuität"], ["endfaellig", "Endfällig (nur Zins)"]], v => { k.art = v; buildFields(); updatePreview(); }),
              f("Darlehenssumme €", "betrag", "number"),
              f("Zins % p.a.", "zinsSatz", "number"),
            );
            if (k.art === "annuitaet") {
              g.append(selectField("Berechnung über", k.rateModus || "tilgungssatz", [
                ["tilgungssatz", "Tilgungssatz %"],
                ["rate", "feste Rate in €"],
                ["laufzeit", "feste Laufzeit (Jahre)"]
              ], v => { k.rateModus = v; buildFields(); updatePreview(); }));
              const modus = k.rateModus || "tilgungssatz";
              if (modus === "tilgungssatz") g.append(f("anf. Tilgung % p.a.", "tilgungSatz", "number"));
              if (modus === "rate") g.append(f("Rate € / Monat", "rateBetrag", "number"));
              if (modus === "laufzeit") g.append(f("Wunsch-Laufzeit (Jahre)", "laufzeitJahre", "number"));
            } else {
              g.append(f("Laufzeit (Jahre)", "laufzeitJahre", "number"));
            }
            g.append(f("Start (YYYY-MM-DD)", "start"));
            fieldsWrap.appendChild(g);
            fieldsWrap.appendChild(preview);
          };
          buildFields();
          updatePreview();
          block.appendChild(fieldsWrap);
          block.appendChild(el(`<div class="sub-h">Sondertilgungen</div>`));
          const stWrap = el(`<div class="edit-rows"></div>`);
          k.sondertilgungen = k.sondertilgungen || [];
          const renderSt = () => {
            stWrap.innerHTML = "";
            k.sondertilgungen.forEach((s, si) => {
              const r = el(`<div class="erow erow-2"></div>`);
              r.append(field("Datum (YYYY-MM-DD)", s.datum, v => { s.datum = v; updatePreview(); }),
                field("Betrag €", s.betrag, v => { s.betrag = v; updatePreview(); }, "number"),
                rowBtn("Entfernen", () => { k.sondertilgungen.splice(si, 1); renderSt(); updatePreview(); }, true));
              stWrap.appendChild(r);
            });
          };
          renderSt(); block.appendChild(stWrap);
          block.appendChild(rowBtn("+ Sondertilgung", () => { k.sondertilgungen.push({ datum: "", betrag: 0 }); renderSt(); }));
          block.appendChild(rowBtn("Kredit entfernen", () => { p.kredite.splice(ki, 1); render(); }, true));
          body.appendChild(block);
        });
        body.appendChild(rowBtn("+ Kredit hinzufügen", () => {
          p.kredite.push({ id: "kredit-" + Date.now(), bezeichnung: "Neuer Kredit", glaeubiger: "", art: "annuitaet", rateModus: "tilgungssatz", betrag: 100000, zinsSatz: 3.0, tilgungSatz: 2.0, rateBetrag: 0, laufzeitJahre: 20, start: "2026-01-01", sondertilgungen: [] });
          render();
        }));
      };
      render(); out.push(card);
    });
    return out;
  }

  function formFinanz() {
    const out = [];
    (D.projects || []).filter(p => !isAir(p)).forEach(p => {
      const card = el(`<div class="card col-12"><div class="card-h"><div><div class="card-t">${esc(p.name)} – Finanzbewegungen</div>
        <div class="card-s">monatlich · Miete & NK = Einnahmen, Betriebs-/sonstige Kosten = Ausgaben (Kreditrate rechnet das Dashboard)</div></div></div><div class="card-b form-body"></div></div>`);
      const body = card.querySelector(".form-body");
      p.cashflow = p.cashflow || [];
      const render = () => {
        body.innerHTML = "";
        const head = el(`<div class="erow erow-fin erow-head"><span>Monat</span><span>Miete</span><span>NK</span><span>Betrieb</span><span>Sonstige</span><span></span></div>`);
        body.appendChild(head);
        p.cashflow.forEach((r, ri) => {
          const row = el(`<div class="erow erow-fin"></div>`);
          row.append(
            field("Monat", r.monat, v => r.monat = v),
            field("Miete", r.miete, v => r.miete = v, "number"),
            field("NK", r.nebenkosten, v => r.nebenkosten = v, "number"),
            field("Betrieb", r.betriebskosten, v => r.betriebskosten = v, "number"),
            field("Sonstige", r.sonstigeKosten, v => r.sonstigeKosten = v, "number"),
            rowBtn("Entfernen", () => { p.cashflow.splice(ri, 1); render(); }, true));
          body.appendChild(row);
        });
        body.appendChild(rowBtn("+ Monat hinzufügen", () => {
          const last = p.cashflow[p.cashflow.length - 1];
          p.cashflow.push({ monat: last ? FE.addMonths(last.monat + "-01", 1).slice(0, 7) : "2026-01", miete: last ? last.miete : 0, nebenkosten: last ? last.nebenkosten : 0, betriebskosten: 0, sonstigeKosten: 0 });
          render();
        }));
      };
      render(); out.push(card);
    });
    const airNote = (D.projects || []).filter(isAir).length
      ? el(`<div class="card col-12"><div class="card-b note">AirBnB-Projekte werden über die Steuerung im Tab „AirBnB" modelliert – hier sind keine manuellen Monatsbewegungen nötig.</div></div>`)
      : null;
    if (airNote) out.push(airNote);
    return out;
  }

  function formVermietung() {
    const out = [];
    (D.rentals || []).forEach(o => {
      const card = el(`<div class="card col-12"><div class="card-h"><div><div class="card-t">${esc(o.objekt)}</div>
        <div class="card-s">${o.einheiten.length} Einheiten</div></div></div><div class="card-b form-body"></div></div>`);
      const body = card.querySelector(".form-body");
      const stamm = el(`<div class="form-grid"></div>`);
      stamm.append(field("Objekt", o.objekt, v => o.objekt = v), field("Ort", o.ort, v => o.ort = v));
      body.appendChild(stamm);
      body.appendChild(el(`<div class="sub-h">Einheiten / Mieter</div>`));
      const wrap = el(`<div class="edit-rows"></div>`);
      const render = () => {
        wrap.innerHTML = "";
        o.einheiten.forEach((u, ui) => {
          const r = el(`<div class="erow erow-rent"></div>`);
          r.append(
            field("Einheit", u.wohnung, v => u.wohnung = v),
            field("m²", u.flaeche, v => u.flaeche = v, "number"),
            field("Mieter", u.mieter, v => u.mieter = v),
            field("Einzug", u.einzug, v => u.einzug = v),
            field("Kalt €", u.kaltmiete, v => u.kaltmiete = v, "number"),
            field("NK €", u.nebenkosten, v => u.nebenkosten = v, "number"),
            selectField("Status", u.status, [["vermietet", "vermietet"], ["frei", "frei"], ["kuendigung", "Kündigung"]], v => u.status = v),
            rowBtn("Entfernen", () => { o.einheiten.splice(ui, 1); render(); }, true));
          wrap.appendChild(r);
        });
      };
      render(); body.appendChild(wrap);
      body.appendChild(rowBtn("+ Einheit hinzufügen", () => { o.einheiten.push({ wohnung: "Neue WE", flaeche: 0, mieter: "", einzug: "", kaltmiete: 0, nebenkosten: 0, status: "frei" }); render(); }));
      out.push(card);
    });
    return out;
  }

  function formZugang() {
    const out = [];
    const card = el(`<div class="card col-12"><div class="card-h"><div><div class="card-t">Zugang & Version</div>
      <div class="card-s">Passwort ändern erzeugt den Hash automatisch</div></div></div><div class="card-b form-body"></div></div>`);
    const body = card.querySelector(".form-body");
    const g = el(`<div class="form-grid"></div>`);
    g.append(
      field("Version", (D.meta || {}).version, v => { D.meta = D.meta || {}; D.meta.version = v; }),
      field("Session-Dauer (Std.)", (D.auth || {}).sessionHours, v => { D.auth = D.auth || {}; D.auth.sessionHours = v; }, "number"),
    );
    body.appendChild(g);
    body.appendChild(el(`<div class="sub-h">Passwort ändern</div>`));
    const pwRow = el(`<div class="erow erow-2"></div>`);
    const inp = el(`<label class="fld"><span class="fld-lab">neues Passwort</span><input type="text" placeholder="neues Passwort"><span class="fld-cur">setzt den Login-Hash</span></label>`);
    const btn = rowBtn("Hash setzen", async () => {
      const v = inp.querySelector("input").value;
      if (!v) { $("#pwHashMsg").textContent = "Bitte Passwort eingeben."; return; }
      const h = await sha256(v);
      D.auth = D.auth || {}; D.auth.passwordHash = h;
      $("#pwHashMsg").innerHTML = `Gesetzt – oben „Änderungen prüfen & Code kopieren" klicken.`;
    });
    pwRow.append(inp, btn); body.appendChild(pwRow);
    body.appendChild(el(`<div class="note" id="pwHashMsg" style="margin-top:10px">Aktueller Hash bleibt erhalten, bis du einen neuen erzeugst.</div>`));
    out.push(card);
    return out;
  }

  function buildDataCode() {
    const clean = { meta: D.meta, auth: D.auth, projects: D.projects, rentals: D.rentals };
    return "/* data.js — Stand " + new Date().toLocaleString("de-DE") + " */\n" +
      "window.DASHBOARD_DATA = " + JSON.stringify(clean, null, 2) + ";\n";
  }

  function computeChanges() {
    const orig = window.DASHBOARD_DATA || {};
    const changes = [];
    const fmt = v => {
      if (v === undefined) return "—";
      if (v === "") return "(leer)";
      if (typeof v === "object") return Array.isArray(v) ? `[${v.length} Einträge]` : "{…}";
      return String(v);
    };
    function walk(a, b, path) {
      if (Array.isArray(a) || Array.isArray(b)) {
        const ax = Array.isArray(a) ? a : [];
        const bx = Array.isArray(b) ? b : [];
        const max = Math.max(ax.length, bx.length);
        for (let i = 0; i < max; i++) {
          if (i >= ax.length) { changes.push({ path: path + "[" + (i + 1) + "]", from: "—", to: "neu hinzugefügt" }); }
          else if (i >= bx.length) { changes.push({ path: path + "[" + (i + 1) + "]", from: "vorhanden", to: "entfernt" }); }
          else walk(ax[i], bx[i], path + "[" + (i + 1) + "]");
        }
      } else if (a && b && typeof a === "object" && typeof b === "object") {
        const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
        keys.forEach(k => {
          if (k === "passwordHash") { if (a[k] !== b[k]) changes.push({ path: niceKey(path, k), from: "•••", to: "geändert" }); return; }
          walk(a[k], b[k], path ? path + " › " + labelize(k) : labelize(k));
        });
      } else {
        if (String(a) !== String(b)) changes.push({ path: path, from: fmt(a), to: fmt(b) });
      }
    }
    walk(orig.meta, D.meta, "Meta");
    walk(orig.auth, D.auth, "Zugang");
    (D.projects || []).forEach((p, i) => walk((orig.projects || [])[i], p, p.name || ("Projekt " + (i + 1))));
    (D.rentals || []).forEach((o, i) => walk((orig.rentals || [])[i], o, o.objekt || ("Objekt " + (i + 1))));
    return changes;
  }
  function labelize(k) {
    const map = { betrag: "Summe", zinsSatz: "Zins %", tilgungSatz: "Tilgung %", rateBetrag: "Rate €",
      laufzeitJahre: "Laufzeit J.", rateModus: "Berechnung", kaltmiete: "Kaltmiete", nebenkosten: "NK",
      fortschritt: "Fortschritt %", angebot: "Angebot", gezahlt: "Gezahlt", kontostand: "Kontostand",
      ruecklagen: "Rücklagen", mieter: "Mieter", einzug: "Einzug", status: "Status", flaeche: "Fläche",
      wohnung: "Einheit", name: "Name", firma: "Firma", glaeubiger: "Gläubiger", bezeichnung: "Bezeichnung",
      sondertilgungen: "Sondertilgungen", gewerke: "Gewerke", kredite: "Kredite", cashflow: "Cashflow",
      einheiten: "Einheiten", weitereInvestition: "Weitere Invest.", miete: "Miete",
      betriebskosten: "Betriebskosten", sonstigeKosten: "Sonstige Kosten", monat: "Monat",
      datum: "Datum", titel: "Titel", address: "Adresse", scope: "Umfang", version: "Version",
      sessionHours: "Session Std.", airbnb: "AirBnB", nachtpreis: "Nachtpreis", belegungsrate: "Belegung %",
      reinigungProBuchung: "Reinigungsgebühr", naechteProBuchung: "Nächte/Buchung", plattformProvision: "Provision %",
      reinigungskostenIntern: "Reinigung intern", fixkostenMonat: "Fixkosten/Mon.", betreuungMonat: "Betreuung/Mon.",
      type: "Typ" };
    return map[k] || k;
  }
  function niceKey(path, k) { return (path ? path + " › " : "") + labelize(k); }

  function showDiffThenCopy() {
    const panel = $("#diffPanel");
    const btn = $("#copyBtn");
    const msg = $("#copyMsg");
    if (!panel) return;

    if (!diffShown) {
      const changes = computeChanges();
      if (!changes.length) {
        panel.style.display = "block";
        panel.innerHTML = `<div class="diff-empty">Keine Änderungen gegenüber dem aktuellen Stand.</div>`;
        if (msg) { msg.textContent = ""; }
        return;
      }
      const rows = changes.map(c => `<div class="diff-row">
        <div class="diff-path">${esc(c.path)}</div>
        <div class="diff-val"><span class="dfrom">${esc(c.from)}</span><span class="darrow">→</span><span class="dto">${esc(c.to)}</span></div>
      </div>`).join("");
      panel.style.display = "block";
      panel.innerHTML = `<div class="diff-head">${changes.length} Änderung${changes.length === 1 ? "" : "en"} – bitte prüfen:</div>
        <div class="diff-list">${rows}</div>
        <div class="diff-note">Beim nächsten Klick wird der komplette Code in die Zwischenablage kopiert.</div>`;
      btn.textContent = "Jetzt in Zwischenablage kopieren";
      diffShown = true;
      return;
    }

    const code = buildDataCode();
    copyToClipboard(code).then(ok => {
      if (msg) {
        msg.textContent = ok ? "Kompletter Code kopiert – in data.js einfügen & ersetzen." : "Kopieren nicht möglich – Code unten markieren.";
        msg.style.color = ok ? "var(--accent-2)" : "var(--warn)";
      }
      if (!ok) {
        panel.innerHTML = `<div class="diff-head">Code manuell kopieren:</div>
          <textarea class="diff-code" readonly>${esc(code)}</textarea>`;
        const ta = panel.querySelector("textarea"); if (ta) { ta.focus(); ta.select(); }
      }
      btn.textContent = "Änderungen prüfen & Code kopieren";
      diffShown = false;
    });
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
    }
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  }

  /* ---------------- Boot ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    $("#loginBtn").addEventListener("click", tryLogin);
    $("#pw").addEventListener("keydown", e => { if (e.key === "Enter") tryLogin(); });
    $("#logoutBtn").addEventListener("click", logout);
    document.addEventListener("click", e => {
      if (e.target && e.target.id === "goFin") route("finanzen");
      if (e.target && e.target.id === "airToData") { dz = "airbnb"; route("daten"); }
    });
    if (sessionValid()) enterApp();
    else { $("#login").classList.remove("hide"); setTimeout(() => $("#pw").focus(), 150); }
  });
})();
