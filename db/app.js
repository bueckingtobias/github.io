/* ============================================================================
   app.js — Bücking Dashboard
   Auth · Routing · Home · Projekte · Vermietung · Finanzen (pro Projekt,
   Kredite, Break-Even) · Pflegemaske (Formular → data.js Export)
   ========================================================================== */
(function () {
  "use strict";

  let D = JSON.parse(JSON.stringify(window.DASHBOARD_DATA || {})); // Arbeitskopie (Pflegemaske bearbeitet diese)
  const FE = window.FinanceEngine;
  const SESSION_KEY = "buecking_session_v2";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const eur = n => (Number(n) || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const eur2 = n => (Number(n) || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
  const pct = n => (Number(n) || 0).toLocaleString("de-DE", { maximumFractionDigits: 0 }) + " %";
  const dttm = iso => iso ? new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
  const sum = (a, f) => a.reduce((x, y) => x + (Number(f(y)) || 0), 0);
  const el = h => { const t = document.createElement("template"); t.innerHTML = h.trim(); return t.content.firstElementChild; };

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
    startClock(); route("home");
  }
  function startClock() {
    const e = $("#clock");
    const t = () => e.textContent = new Date().toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    t(); setInterval(t, 20000);
  }

  /* ---------------- Routing ---------------- */
  const TITLES = {
    home: ["Home", "Gesamtüberblick über alle Projekte"],
    baumstrasse: ["Baumstraße", "Umbau Stall zu 5 Wohnungen"],
    huenenberg: ["Am Hünenberg", "Neubau Mehrfamilienhaus"],
    vermietung: ["Vermietung", "Objekte · Mieter · Nebenkosten"],
    finanzen: ["Finanzen", "Pro Projekt · Kredite · Break-Even"],
    daten: ["Daten", "Pflegemaske & Export"]
  };
  function route(v) {
    $$("#nav a").forEach(a => a.classList.toggle("active", a.dataset.view === v));
    const [t, s] = TITLES[v] || ["", ""]; $("#pageTitle").textContent = t; $("#pageSub").textContent = s;
    const host = $("#views"); host.innerHTML = "";
    (VIEWS[v] || (() => el(`<div></div>`)))().forEach(n => host.appendChild(n));
    $(".content").scrollTop = 0;
  }

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

    // pro Projekt eine Überblickskarte
    (D.projects || []).forEach(p => {
      const inv = FE.projectInvestment(p);
      const cf = FE.projectCashflow(p);
      const lastNetto = cf.length ? cf[cf.length - 1].netto : 0;
      const be = FE.breakEven(p);
      const fort = Math.round(p.gewerke.reduce((s, x) => s + x.fortschritt, 0) / (p.gewerke.length || 1));
      const beTxt = be.investBreakEven ? dttm(be.investBreakEven) + (be.monateBisBE ? " (" + be.monateBisBE + " Mon.)" : " erreicht") : "noch offen";
      out.push(el(`<div class="card col-6">
        <div class="card-h"><div><div class="card-t">${esc(p.name)}</div>
          <div class="card-s">${esc(p.scope)}</div></div>
          <span class="chip">${fort}% Bau</span></div>
        <div class="card-b">
          <div class="mini-grid">
            <div><span>Investiert</span><b>${eur(inv.investiert)}</b></div>
            <div><span>Netto-CF zuletzt</span><b class="${lastNetto < 0 ? 'neg-t' : 'pos-t'}">${eur(lastNetto)}</b></div>
            <div><span>Kreditrate/Mon.</span><b>${eur(FE.projectMonthlyDebt(p))}</b></div>
            <div><span>Invest-Break-Even</span><b>${beTxt}</b></div>
          </div>
          <div style="margin-top:12px">${spark(cf.map(r => r.netto), cf.map(r => r.monat))}</div>
        </div></div>`));
    });
    return out;
  }

  /* ---------------- PROJECT (Baumstraße / Am Hünenberg) ---------------- */
  function renderProject(id) {
    const p = (D.projects || []).find(x => x.id === id);
    const out = [];
    if (!p) { out.push(el(`<div class="card col-12"><div class="card-b note">Projekt nicht gefunden.</div></div>`)); return out; }

    const aktiv = p.gewerke.filter(g => g.aktiv).sort((a, b) => a.sort - b.sort);
    const inv = FE.projectInvestment(p);
    const totalA = sum(aktiv, g => g.angebot), totalG = sum(aktiv, g => g.gezahlt);
    const fort = Math.round(aktiv.reduce((s, x) => s + x.fortschritt, 0) / (aktiv.length || 1));

    // HERO header (visuell überarbeitet)
    out.push(el(`<div class="proj-hero col-12">
      <div class="proj-hero-bg"></div>
      <div class="proj-hero-in">
        <div class="proj-hero-l">
          <div class="proj-tag">Projekt</div>
          <h2>${esc(p.name)}</h2>
          <div class="proj-addr">📍 ${esc(p.address)}</div>
          <div class="proj-scope">${esc(p.scope)}</div>
        </div>
        <div class="proj-hero-r">
          <div class="ring" style="--p:${fort}">
            <div class="ring-num">${fort}<span>%</span></div>
            <div class="ring-lab">Fortschritt</div>
          </div>
        </div>
      </div>
      <div class="proj-stats">
        <div class="ps"><span>Investition geplant</span><b>${eur(inv.geplant)}</b></div>
        <div class="ps"><span>Bereits investiert</span><b>${eur(inv.investiert)}</b></div>
        <div class="ps"><span>Gewerke gezahlt</span><b>${eur(totalG)} / ${eur(totalA)}</b></div>
        <div class="ps"><span>Aktive Gewerke</span><b>${aktiv.length}</b></div>
      </div>
    </div>`));

    // Gewerke
    const cards = aktiv.map(g => {
      const o = g.angebot - g.gezahlt;
      const tone = g.fortschritt >= 100 ? "done" : g.fortschritt > 0 ? "wip" : "todo";
      return `<div class="gw ${tone}">
        <div class="gw-top"><div class="gw-name">${esc(g.name)}</div><div class="gw-pct">${g.fortschritt}%</div></div>
        <div class="gw-firma">${esc(g.firma)}</div>
        <div class="bar"><span style="width:${g.fortschritt}%"></span></div>
        <div class="gw-row"><span>Angebot</span><b>${eur(g.angebot)}</b></div>
        <div class="gw-row"><span>Gezahlt</span><b>${eur(g.gezahlt)}</b></div>
        <div class="gw-row"><span>Offen</span><b style="color:${o > 0 ? '#f3b4ae' : 'var(--accent-2)'}">${eur(o)}</b></div>
      </div>`;
    }).join("");
    out.push(el(`<div class="card col-12">
      <div class="card-h"><div><div class="card-t">Gewerke</div><div class="card-s">${aktiv.length} aktive Gewerke</div></div></div>
      <div class="card-b"><div class="gw-grid">${cards}</div></div></div>`));

    // Kurzfinanz auf der Projektseite (Detail unter Finanzen)
    out.push(financeProjectCard(p, true));
    return out;
  }

  /* ---------------- FINANZEN (pro Projekt) ---------------- */
  let financeActive = null;
  function renderFinanzen() {
    const out = [];
    const projs = D.projects || [];
    if (!financeActive) financeActive = projs[0] ? projs[0].id : null;

    // Tabs
    const tabs = projs.map(p => `<button class="ftab ${p.id === financeActive ? 'on' : ''}" data-pid="${p.id}">${esc(p.name)}</button>`).join("");
    const tabBar = el(`<div class="col-12 ftabs">${tabs}<button class="ftab ${financeActive === '__all' ? 'on' : ''}" data-pid="__all">Gesamt</button></div>`);
    tabBar.querySelectorAll(".ftab").forEach(b => b.onclick = () => { financeActive = b.dataset.pid; route("finanzen"); });
    out.push(tabBar);

    if (financeActive === "__all") { out.push(...financeAll()); return out; }
    const p = projs.find(x => x.id === financeActive) || projs[0];
    if (!p) { out.push(el(`<div class="card col-12"><div class="card-b note">Kein Projekt.</div></div>`)); return out; }

    // KPIs
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

    // Break-Even Karte
    out.push(breakEvenCard(p, be, inv, monthlyDebt));

    // Einnahmen vs Ausgaben monatlich
    out.push(el(`<div class="card col-8">
      <div class="card-h"><div><div class="card-t">Einnahmen vs. Ausgaben</div>
        <div class="card-s">monatlich · Ausgaben inkl. Kreditrate & Nebenkosten</div></div></div>
      <div class="card-b">${dualChart(cf)}</div></div>`));

    // Jahresübersicht
    const yrows = yc.map(y => `<tr><td><b>${y.jahr}</b></td><td class="num">${eur(y.einnahmen)}</td>
      <td class="num">${eur(y.ausgaben)}</td><td class="num ${y.netto < 0 ? 'neg-t' : 'pos-t'}">${eur(y.netto)}</td></tr>`).join("");
    out.push(el(`<div class="card col-4">
      <div class="card-h"><div><div class="card-t">Jahresübersicht</div><div class="card-s">Einnahmen / Ausgaben / Netto</div></div></div>
      <div class="card-b" style="padding-top:4px"><div class="tw"><table><thead><tr><th>Jahr</th><th class="num">Ein</th><th class="num">Aus</th><th class="num">Netto</th></tr></thead><tbody>${yrows}</tbody></table></div></div></div>`));

    // Kredite Detail
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
    else { status = "noch offen"; cls = "be-wait"; detail = be.monatlicheRate < 0 ? `Aktueller Netto-Cashflow negativ (${eur(be.monatlicheRate)}/Monat) – Vermietung/Erträge müssen steigen.` : "Zu wenig Datenbasis für eine Prognose."; }

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
    const artTxt = k.art === "endfaellig" ? "Endfällig (nur Zins, Tilgung am Ende)" : "Annuität (Zins + Tilgung)";
    const sonderRows = (k.sondertilgungen || []).map(x => `<tr><td>${dttm(x.datum)}</td><td class="num">${eur(x.betrag)}</td></tr>`).join("")
      || `<tr><td colspan="2" class="note">keine Sondertilgungen</td></tr>`;
    // Restschuld-Verlauf (jährlich) als Spark
    const yearly = []; const seen = {};
    s.plan.forEach(r => { const y = r.monat.slice(0, 4); seen[y] = r.restschuld; });
    Object.keys(seen).forEach(y => yearly.push(seen[y]));
    return el(`<div class="card col-6 credit-card">
      <div class="card-h"><div><div class="card-t">${esc(k.bezeichnung)}</div>
        <div class="card-s">${esc(k.glaeubiger)} · ${artTxt}</div></div>
        <span class="chip">${esc(k.zinsSatz)}% p.a.</span></div>
      <div class="card-b">
        <div class="mini-grid">
          <div><span>Darlehenssumme</span><b>${eur(k.betrag)}</b></div>
          <div><span>Restschuld aktuell</span><b class="neg-t">${eur(s.restschuld)}</b></div>
          <div><span>Rate / Monat</span><b>${eur(s.monatsrate)}</b></div>
          <div><span>Laufzeit</span><b>${esc(k.laufzeitJahre)} J. (bis ${dttm(s.abzahlungDatum)})</b></div>
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
      return `<tr><td><b>${esc(p.name)}</b></td><td class="num">${eur(inv.investiert)}</td>
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

  /* ---------------- DATEN (Pflegemaske) ---------------- */
  let dz = "projekte";
  function renderDaten() {
    const out = [];
    const subs = [["projekte", "Projekte & Gewerke"], ["kredite", "Kredite"], ["finanz", "Finanzbewegungen"], ["vermietung", "Vermietung"], ["zugang", "Zugang & Export"]];
    const bar = el(`<div class="col-12 ftabs">${subs.map(s => `<button class="ftab ${s[0] === dz ? 'on' : ''}" data-dz="${s[0]}">${s[1]}</button>`).join("")}</div>`);
    bar.querySelectorAll(".ftab").forEach(b => b.onclick = () => { dz = b.dataset.dz; route("daten"); });
    out.push(bar);

    out.push(el(`<div class="card col-12"><div class="card-b note" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <span>Änderungen werden sofort im Dashboard übernommen. Zum Sichern unten <b>data.js exportieren</b> und im Repo/Drive ersetzen.</span>
      <button class="btn btn-accent" id="exportBtn">⬇ data.js exportieren</button>
      <span class="note" id="exportMsg"></span></div></div>`));

    if (dz === "projekte") out.push(...formProjekte());
    if (dz === "kredite") out.push(...formKredite());
    if (dz === "finanz") out.push(...formFinanz());
    if (dz === "vermietung") out.push(...formVermietung());
    if (dz === "zugang") out.push(...formZugang());

    setTimeout(() => { const b = $("#exportBtn"); if (b) b.onclick = exportData; }, 0);
    return out;
  }

  // ---- Form helpers (live binding to D) ----
  function field(label, value, onInput, type) {
    const w = el(`<label class="fld"><span>${esc(label)}</span><input type="${type || 'text'}" value="${esc(value)}"></label>`);
    w.querySelector("input").addEventListener("input", e => onInput(type === "number" ? Number(e.target.value) : e.target.value));
    return w;
  }
  function selectField(label, value, options, onInput) {
    const opts = options.map(o => `<option value="${esc(o[0])}" ${o[0] === value ? "selected" : ""}>${esc(o[1])}</option>`).join("");
    const w = el(`<label class="fld"><span>${esc(label)}</span><select>${opts}</select></label>`);
    w.querySelector("select").addEventListener("change", e => onInput(e.target.value));
    return w;
  }
  function rowBtn(txt, fn, danger) {
    const b = el(`<button class="btn ${danger ? 'btn-danger' : ''}" type="button">${esc(txt)}</button>`);
    b.onclick = fn; return b;
  }

  function formProjekte() {
    const out = [];
    (D.projects || []).forEach((p, pi) => {
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

      // Gewerke table editor
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
            rowBtn("✕", () => { p.gewerke.splice(gi, 1); renderGw(); }, true),
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

      // weitere Investition
      body.appendChild(el(`<div class="sub-h">Weitere Investitionskosten</div>`));
      const wiWrap = el(`<div class="edit-rows"></div>`);
      p.weitereInvestition = p.weitereInvestition || [];
      const renderWi = () => {
        wiWrap.innerHTML = "";
        p.weitereInvestition.forEach((x, xi) => {
          const r = el(`<div class="erow erow-2"></div>`);
          r.append(field("Titel", x.titel, v => x.titel = v), field("Betrag €", x.betrag, v => x.betrag = v, "number"),
            rowBtn("✕", () => { p.weitereInvestition.splice(xi, 1); renderWi(); }, true));
          wiWrap.appendChild(r);
        });
      };
      renderWi(); body.appendChild(wiWrap);
      body.appendChild(rowBtn("+ Kostenposition", () => { p.weitereInvestition.push({ titel: "", betrag: 0 }); renderWi(); }));
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
          const g = el(`<div class="form-grid"></div>`);
          g.append(
            field("Bezeichnung", k.bezeichnung, v => k.bezeichnung = v),
            field("Gläubiger", k.glaeubiger, v => k.glaeubiger = v),
            selectField("Art", k.art, [["annuitaet", "Annuität (Zins+Tilgung)"], ["endfaellig", "Endfällig (nur Zins)"]], v => { k.art = v; }),
            field("Darlehenssumme €", k.betrag, v => k.betrag = v, "number"),
            field("Zins % p.a.", k.zinsSatz, v => k.zinsSatz = v, "number"),
            field("Tilgung % p.a.", k.tilgungSatz, v => k.tilgungSatz = v, "number"),
            field("Laufzeit (Jahre)", k.laufzeitJahre, v => k.laufzeitJahre = v, "number"),
            field("Start", k.start, v => k.start = v),
          );
          block.appendChild(g);
          block.appendChild(el(`<div class="sub-h">Sondertilgungen</div>`));
          const stWrap = el(`<div class="edit-rows"></div>`);
          k.sondertilgungen = k.sondertilgungen || [];
          const renderSt = () => {
            stWrap.innerHTML = "";
            k.sondertilgungen.forEach((s, si) => {
              const r = el(`<div class="erow erow-2"></div>`);
              r.append(field("Datum (YYYY-MM-DD)", s.datum, v => s.datum = v),
                field("Betrag €", s.betrag, v => s.betrag = v, "number"),
                rowBtn("✕", () => { k.sondertilgungen.splice(si, 1); renderSt(); }, true));
              stWrap.appendChild(r);
            });
          };
          renderSt(); block.appendChild(stWrap);
          block.appendChild(rowBtn("+ Sondertilgung", () => { k.sondertilgungen.push({ datum: "", betrag: 0 }); renderSt(); }));
          block.appendChild(rowBtn("Kredit entfernen", () => { p.kredite.splice(ki, 1); render(); }, true));
          body.appendChild(block);
        });
        body.appendChild(rowBtn("+ Kredit hinzufügen", () => {
          p.kredite.push({ id: "kredit-" + Date.now(), bezeichnung: "Neuer Kredit", glaeubiger: "", art: "annuitaet", betrag: 0, zinsSatz: 0, tilgungSatz: 0, laufzeitJahre: 20, start: "2026-01-01", sondertilgungen: [] });
          render();
        }));
      };
      render(); out.push(card);
    });
    return out;
  }

  function formFinanz() {
    const out = [];
    (D.projects || []).forEach(p => {
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
            field("", r.monat, v => r.monat = v),
            field("", r.miete, v => r.miete = v, "number"),
            field("", r.nebenkosten, v => r.nebenkosten = v, "number"),
            field("", r.betriebskosten, v => r.betriebskosten = v, "number"),
            field("", r.sonstigeKosten, v => r.sonstigeKosten = v, "number"),
            rowBtn("✕", () => { p.cashflow.splice(ri, 1); render(); }, true));
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
            rowBtn("✕", () => { o.einheiten.splice(ui, 1); render(); }, true));
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
    const inp = el(`<label class="fld"><span>Neues Passwort</span><input type="text" placeholder="neues Passwort"></label>`);
    const btn = rowBtn("Hash erzeugen & setzen", async () => {
      const v = inp.querySelector("input").value;
      if (!v) { $("#pwHashMsg").textContent = "Bitte Passwort eingeben."; return; }
      const h = await sha256(v);
      D.auth = D.auth || {}; D.auth.passwordHash = h;
      $("#pwHashMsg").innerHTML = `Gesetzt ✓ Hash: <code style="word-break:break-all">${h}</code> – jetzt unten exportieren.`;
    });
    pwRow.append(inp, btn); body.appendChild(pwRow);
    body.appendChild(el(`<div class="note" id="pwHashMsg" style="margin-top:10px">Aktueller Hash bleibt erhalten, bis du einen neuen erzeugst.</div>`));
    out.push(card);
    return out;
  }

  function exportData() {
    const clean = { meta: D.meta, auth: D.auth, projects: D.projects, rentals: D.rentals };
    const content = "/* data.js — exportiert am " + new Date().toLocaleString("de-DE") + " */\n" +
      "window.DASHBOARD_DATA = " + JSON.stringify(clean, null, 2) + ";\n";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: "text/javascript" }));
    a.download = "data.js"; a.click(); URL.revokeObjectURL(a.href);
    const m = $("#exportMsg"); if (m) { m.textContent = "✓ data.js heruntergeladen."; m.style.color = "var(--accent-2)"; }
  }

  const VIEWS = {
    home: renderHome,
    baumstrasse: () => renderProject("baumstrasse"),
    huenenberg: () => renderProject("huenenberg"),
    vermietung: renderVermietung,
    finanzen: renderFinanzen,
    daten: renderDaten
  };

  /* ---------------- Boot ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    $("#loginBtn").addEventListener("click", tryLogin);
    $("#pw").addEventListener("keydown", e => { if (e.key === "Enter") tryLogin(); });
    $("#logoutBtn").addEventListener("click", logout);
    $$("#nav a").forEach(a => a.addEventListener("click", () => route(a.dataset.view)));
    // delegated: project "Zu Finanzen" button
    document.addEventListener("click", e => { if (e.target && e.target.id === "goFin") route("finanzen"); });
    if (sessionValid()) enterApp();
    else { $("#login").classList.remove("hide"); setTimeout(() => $("#pw").focus(), 150); }
  });
})();
