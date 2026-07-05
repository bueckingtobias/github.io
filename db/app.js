/* ============================================================================
   app.js — Bücking Einnahmen-Dashboard (Visualisierung)
   ============================================================================ */
(function () {
  "use strict";
  const D = window.DASHBOARD_DATA || {};
  const FE = window.FinanceEngine;
  const SESSION = "buecking_income_v1";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const eur = n => (Number(n) || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const eur2 = n => (Number(n) || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const el = h => { const t = document.createElement("template"); t.innerHTML = h.trim(); return t.content.firstElementChild; };
  const monthShort = m => { const d = new Date(m + "-01"); return d.toLocaleDateString("de-DE", { month: "short" }); };

  async function sha256(str) {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join("");
  }

  /* ---------- ICONS ---------- */
  const IC = {
    grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    chart: '<path d="M4 19V5M4 19h16M8 15l3-4 3 2 4-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    home: '<path d="M4 11l8-6 8 6M6 10v9h12v-9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    bed: '<path d="M3 8v10M3 12h18a2 2 0 0 0-2-2H3M21 12v6M6 10V8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    coins: '<ellipse cx="8" cy="7" rx="5" ry="2.5" stroke="currentColor" stroke-width="1.8"/><path d="M3 7v5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7" stroke="currentColor" stroke-width="1.8"/><path d="M11 14.5c.6 1.2 2.6 2 5 2 2.8 0 5-1.1 5-2.5v-5" stroke="currentColor" stroke-width="1.8"/><ellipse cx="16" cy="9" rx="5" ry="2.5" stroke="currentColor" stroke-width="1.8"/>',
    euro: '<path d="M15 8a5 5 0 1 0 0 8M5 10h7M5 14h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    key: '<circle cx="8" cy="8" r="4" stroke="currentColor" stroke-width="1.8"/><path d="M11 11l7 7M16 16l2-2M14 18l2-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
  };
  const svg = (k, cls) => `<svg viewBox="0 0 24 24" fill="none" class="${cls || ''}">${IC[k] || IC.grid}</svg>`;

  /* ---------- AUTH ---------- */
  function sessionOK() {
    try { const s = JSON.parse(localStorage.getItem(SESSION) || "null");
      return s && s.ok && (Date.now() - s.ts) < ((D.auth && D.auth.sessionHours) || 12) * 3600e3;
    } catch { return false; }
  }
  async function tryLogin() {
    const msg = $("#loginMsg"), v = $("#pw").value;
    if (!v) { msg.textContent = "Bitte Passwort eingeben."; msg.className = "login-msg bad"; return; }
    msg.textContent = "Prüfe…"; msg.className = "login-msg";
    if (await sha256(v) === (D.auth && D.auth.passwordHash)) {
      localStorage.setItem(SESSION, JSON.stringify({ ok: true, ts: Date.now() })); enterApp();
    } else { msg.textContent = "Falsches Passwort."; msg.className = "login-msg bad"; $("#pw").select(); }
  }
  function logout() { localStorage.removeItem(SESSION); location.reload(); }

  function enterApp() {
    $("#login").classList.add("hide"); $("#app").classList.remove("hide");
    buildRail(); route("overview");
  }

  /* ---------- NAV ---------- */
  function navItems() {
    return [
      { id: "overview", label: "Übersicht", icon: "grid" },
      ...(D.streams || []).map(s => ({ id: s.id, label: shortLabel(s.name), icon: s.icon || "euro" }))
    ];
  }
  function shortLabel(n) { return n.replace("Baumstraße · ", "").replace("Doppelhaus ", ""); }

  function buildRail() {
    const rail = $("#rail");
    const spacer = rail.querySelector(".rail-spacer");
    // remove old nav buttons (keep mark, spacer, logout)
    $$(".rail-btn:not(.logout)", rail).forEach(b => b.remove());
    navItems().forEach(it => {
      const b = el(`<button class="rail-btn" data-id="${it.id}" title="${esc(it.label)}">
        ${svg(it.icon)}<span class="tip">${esc(it.label)}</span></button>`);
      b.onclick = () => route(it.id);
      rail.insertBefore(b, spacer);
    });
  }

  const TITLES = {
    overview: ["Portfolio", "Übersicht", "Alle Einnahmequellen auf einen Blick"]
  };
  function route(id) {
    $$("#rail .rail-btn").forEach(b => b.classList.toggle("on", b.dataset.id === id));
    const host = $("#views"); host.innerHTML = "";
    if (id === "overview") { renderOverview(host); }
    else { renderStream(host, id); }
    $(".scroll").scrollTop = 0;
  }

  /* ---------- shared bits ---------- */
  function kpiCard(icon, num, lab, desc, accent) {
    return `<div class="card kpi ${accent ? 'accent' : ''}"><div class="card-glow"></div>
      <div class="chip">${svg(icon)}</div>
      <div class="num">${esc(num)}</div>
      <div class="lab">${esc(lab)}</div>
      <div class="desc">${esc(desc)}</div></div>`;
  }

  // SVG area+line chart from values
  function areaChart(values, labels) {
    const W = 720, H = 220, pad = 16;
    if (!values.length) return `<div class="note">Keine Daten.</div>`;
    const max = Math.max(...values) * 1.12, min = Math.min(...values, 0) * 0.9;
    const span = (max - min) || 1;
    const n = values.length;
    const x = i => pad + i * (W - pad * 2) / (n - 1 || 1);
    const y = v => H - pad - (v - min) / span * (H - pad * 2);
    const pts = values.map((v, i) => [x(i), y(v)]);
    // smooth path
    let dLine = `M ${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i - 1], [cx, cy] = pts[i];
      const mx = (px + cx) / 2;
      dLine += ` C ${mx},${py} ${mx},${cy} ${cx},${cy}`;
    }
    const dArea = dLine + ` L ${pts[n - 1][0]},${H - pad} L ${pts[0][0]},${H - pad} Z`;
    const gridY = [0.25, 0.5, 0.75].map(f => `<line class="grid-l" x1="${pad}" x2="${W - pad}" y1="${pad + f * (H - pad * 2)}" y2="${pad + f * (H - pad * 2)}"/>`).join("");
    const last = pts[n - 1];
    const xlabs = labels ? `<div class="chart-x">${labels.map(l => `<span>${esc(l)}</span>`).join("")}</div>` : "";
    return `<div class="chart-wrap">
      <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:220px">
        <defs><linearGradient id="mintFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(74,222,158,.34)"/><stop offset="100%" stop-color="rgba(74,222,158,0)"/>
        </linearGradient></defs>
        ${gridY}
        <path class="area" d="${dArea}"/>
        <path class="line" d="${dLine}"/>
        <circle class="dot lastdot" cx="${last[0]}" cy="${last[1]}" r="4.5"/>
      </svg>${xlabs}</div>`;
  }

  // Donut chart (composition)
  function donut(segments, size) {
    const S = size || 168, r = S / 2 - 14, cx = S / 2, cy = S / 2, C = 2 * Math.PI * r;
    const total = segments.reduce((a, s) => a + s.value, 0) || 1;
    let off = 0;
    const rings = segments.map(s => {
      const frac = s.value / total, len = frac * C;
      const ring = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="14"
        stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="butt"/>`;
      off += len; return ring;
    }).join("");
    return `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" class="donut">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(6,20,16,.6)" stroke-width="14"/>
      ${rings}
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="var(--text)" font-family="var(--fdisp)" font-size="26" font-weight="600">${eur(total).replace(/\s?€/, "")}</text>
      <text x="${cx}" y="${cy + 16}" text-anchor="middle" fill="var(--soft)" font-size="11">€ / Monat</text>
    </svg>`;
  }

  const PALETTE = ["#4ade9e", "#2bb781", "#7ef0bd", "#d8b978", "#1f7a5a", "#59c9a0"];

  /* ---------- OVERVIEW ---------- */
  function renderOverview(host) {
    const t = FE.totals(D);
    $("#eyebrow").textContent = "Portfolio";
    $("#pageTitle").textContent = "Übersicht";
    $("#pageSub").textContent = "Alle Einnahmequellen auf einen Blick";
    $("#headPill").innerHTML = `Ist-Einnahmen <b>${eur(t.ist)}</b> / Monat`;

    // KPIs (reference style)
    const kpis = el(`<div class="grid g-kpi">
      ${kpiCard("euro", eur(t.ist), "Einnahmen / Monat", "vermietet · real", true)}
      ${kpiCard("trend", eur(t.jahrIst), "Einnahmen / Jahr", "hochgerechnet")}
      ${kpiCard("layers", eur(t.potenzial), "Potenzial / Monat", "bei Vollvermietung")}
      ${kpiCard("coins", eur(t.invest), "Sparrate / Monat", "Depot-Zufluss")}
    </div>`);
    host.appendChild(kpis);

    // Big cashflow chart
    const hist = D.historie || [];
    const chartCard = el(`<div class="card">
      <div class="card-h"><div><div class="card-t">Einnahmen-Verlauf</div>
        <div class="card-s">Monatliche Ist-Einnahmen · letzte ${hist.length} Monate</div></div>
        <div class="head-pill" style="padding:7px 13px">Ø ${eur(hist.reduce((a, r) => a + r.betrag, 0) / (hist.length || 1))}</div></div>
      <div class="card-b">${areaChart(hist.map(r => r.betrag), hist.map(r => monthShort(r.monat)))}</div></div>`);
    host.appendChild(chartCard);

    // Composition donut + legend
    const segs = (D.streams || []).map((s, i) => {
      const m = FE.streamMonthly(s);
      return { name: s.name, value: s.kind === "invest" ? m.gesamt : m.gesamt, color: PALETTE[i % PALETTE.length], kind: s.kind };
    });
    const legend = segs.map(s => `<div class="leg">
      <span class="sw" style="background:${s.color}"></span>
      <span class="lt">${esc(s.name)}${s.kind === "invest" ? " · Sparrate" : ""}</span>
      <span class="lv">${eur(s.value)}</span></div>`).join("");
    const compCard = el(`<div class="card pad">
      <div class="card-t" style="margin-bottom:4px">Zusammensetzung</div>
      <div class="card-s" style="margin-bottom:18px">Beitrag je Quelle (inkl. Sparrate)</div>
      <div class="donut-row">${donut(segs)}<div class="legend">${legend}</div></div></div>`);
    host.appendChild(compCard);

    // Stream tiles
    const tiles = el(`<div class="tiles"></div>`);
    (D.streams || []).forEach(s => {
      const m = FE.streamMonthly(s);
      let meta = "";
      if (s.kind === "miete") meta = `<span class="pillet on">${m.vermietet}/${m.einheiten} vermietet</span><span class="pillet">Potenzial ${eur(m.gesamtPotenzial)}</span>`;
      else if (s.kind === "airbnb") meta = `<span class="pillet on">${m.detail.naechte} Nächte/Mon.</span><span class="pillet">${s.airbnb.auslastung}% Auslastung</span>`;
      else meta = `<span class="pillet invest">Sparplan</span><span class="pillet">${(s.positionen || []).length} Positionen</span>`;
      const t = el(`<div class="tile" data-id="${s.id}">
        <div class="tile-go">${svg("trend")}</div>
        <div class="tile-head"><div class="tile-ic">${svg(s.icon || "euro")}</div>
          <div><div class="tile-name">${esc(s.name)}</div><div class="tile-loc">${esc(s.ort || "")}</div></div></div>
        <div class="tile-num">${eur(m.gesamt)} <small>/ Mon.</small></div>
        <div class="tile-meta">${meta}</div></div>`);
      t.onclick = () => route(s.id);
      tiles.appendChild(t);
    });
    host.appendChild(tiles);
  }

  /* ---------- STREAM DETAIL ---------- */
  function renderStream(host, id) {
    const s = (D.streams || []).find(x => x.id === id);
    if (!s) { host.appendChild(el(`<div class="card pad note">Quelle nicht gefunden.</div>`)); return; }
    const m = FE.streamMonthly(s);
    $("#eyebrow").textContent = s.kind === "invest" ? "Vermögensaufbau" : s.kind === "airbnb" ? "Kurzzeitvermietung" : "Vermietung";
    $("#pageTitle").textContent = s.name;
    $("#pageSub").textContent = s.ort || "";
    $("#headPill").innerHTML = `${s.kind === "invest" ? "Sparrate" : "Einnahmen"} <b>${eur(m.gesamt)}</b> / Monat`;

    if (s.kind === "invest") return renderInvest(host, s, m);
    if (s.kind === "airbnb") return renderAirbnb(host, s, m);
    return renderMiete(host, s, m);
  }

  function renderInvest(host, s, m) {
    host.appendChild(el(`<div class="grid g-kpi">
      ${kpiCard("coins", eur(m.gesamt), "Sparrate / Monat", "gesamt", true)}
      ${kpiCard("trend", eur(m.gesamt * 12), "pro Jahr", "hochgerechnet")}
      ${kpiCard("layers", (s.positionen || []).length, "Positionen", "ETF-Sparpläne")}
      ${kpiCard("chart", "ACC", "Thesaurierend", "reinvestiert")}
    </div>`));

    // Donut of positions
    const segs = (s.positionen || []).map((p, i) => ({ name: p.titel, value: p.betrag, color: PALETTE[i % PALETTE.length] }));
    const legend = segs.map(x => `<div class="leg"><span class="sw" style="background:${x.color}"></span>
      <span class="lt">${esc(x.name)}</span><span class="lv">${eur(x.value)}</span></div>`).join("");
    host.appendChild(el(`<div class="card pad">
      <div class="card-t" style="margin-bottom:4px">Aufteilung Sparplan</div>
      <div class="card-s" style="margin-bottom:18px">${esc(s.note || "")}</div>
      <div class="donut-row">${donut(segs)}<div class="legend">${legend}</div></div></div>`));

    // Positions detail
    const rows = (s.positionen || []).map((p, i) => `<div class="drow">
      <div class="drow-l"><div class="drow-badge" style="color:${PALETTE[i % PALETTE.length]}">${i + 1}</div>
        <div><div class="drow-name">${esc(p.titel)}</div><div class="drow-sub">${esc(p.sub || "")}</div></div></div>
      <div class="drow-val"><b>${eur2(p.betrag)}</b><span>monatlich</span></div></div>`).join("");
    host.appendChild(el(`<div class="card"><div class="card-h"><div><div class="card-t">Positionen</div>
      <div class="card-s">Monatliche Sparraten</div></div></div><div class="card-b">${rows}</div></div>`));
  }

  function renderAirbnb(host, s, m) {
    const a = m.detail;
    host.appendChild(el(`<div class="grid g-kpi">
      ${kpiCard("bed", eur(m.gesamt), "Netto / Monat", "nach Gebühr", true)}
      ${kpiCard("euro", eur(s.airbnb.nachtpreis), "pro Nacht", "Nachtpreis")}
      ${kpiCard("trend", a.naechte, "Nächte / Monat", s.airbnb.auslastung + "% Auslastung")}
      ${kpiCard("chart", eur(m.gesamt * 12), "pro Jahr", "hochgerechnet")}
    </div>`));

    // Breakdown bar: brutto -> fee -> netto
    host.appendChild(el(`<div class="card pad">
      <div class="card-t" style="margin-bottom:4px">Rechnung</div>
      <div class="card-s" style="margin-bottom:18px">${esc(s.note || "")}</div>
      <div class="stat-strip">
        <div class="s"><span>Nachtpreis</span><b>${eur(s.airbnb.nachtpreis)}</b></div>
        <div class="s"><span>Nächte/Monat</span><b>${a.naechte}</b></div>
        <div class="s"><span>Brutto</span><b>${eur(a.brutto)}</b></div>
        <div class="s"><span>AirBNB-Gebühr</span><b>−${eur(a.fee)}</b></div>
        <div class="s"><span>Netto</span><b style="color:var(--mint-2)">${eur(a.netto)}</b></div>
      </div></div>`));

    // Occupancy sensitivity chart
    const occs = [40, 50, 60, 65, 70, 80, 90];
    const vals = occs.map(o => { const nights = 30.4 * o / 100; const g = nights * s.airbnb.nachtpreis; return g - g * s.airbnb.servicegebuehrProzent / 100; });
    host.appendChild(el(`<div class="card"><div class="card-h"><div><div class="card-t">Auslastungs-Szenarien</div>
      <div class="card-s">Netto-Einnahmen je Auslastung</div></div>
      <div class="head-pill" style="padding:7px 13px">aktuell ${s.airbnb.auslastung}%</div></div>
      <div class="card-b">${areaChart(vals, occs.map(o => o + "%"))}</div></div>`));
  }

  function renderMiete(host, s, m) {
    host.appendChild(el(`<div class="grid g-kpi">
      ${kpiCard("euro", eur(m.gesamt), "Einnahmen / Monat", m.vermietet + "/" + m.einheiten + " vermietet", true)}
      ${kpiCard("layers", eur(m.gesamtPotenzial), "Potenzial / Monat", "bei Vollvermietung")}
      ${kpiCard("home", m.einheiten, "Einheiten", (s.einheiten || []).reduce((a, u) => a + (Number(u.flaeche) || 0), 0) + " m² gesamt")}
      ${kpiCard("trend", eur(m.gesamt * 12), "pro Jahr", "aktuell vermietet")}
    </div>`));

    // Per-unit horizontal bars (potential vs actual)
    const maxUnit = Math.max(...(s.einheiten || []).map(u => FE.unitIncome(u).gesamt), 1);
    const bars = (s.einheiten || []).map(u => {
      const inc = FE.unitIncome(u);
      const on = u.status === "vermietet";
      const w = Math.round(inc.gesamt / maxUnit * 100);
      return `<div>
        <div class="hbar-top"><div class="hbar-name">${esc(u.wohnung)}<span class="loc">${u.flaeche} m²</span></div>
          <div class="hbar-val">${eur(inc.gesamt)} ${on ? '<span class="badge b-on">vermietet</span>' : '<span class="badge b-off">frei</span>'}</div></div>
        <div class="track ${on ? '' : 'ghost'}"><span style="width:${w}%"></span></div></div>`;
    }).join("");
    host.appendChild(el(`<div class="card pad">
      <div class="card-t" style="margin-bottom:4px">Einnahmen je Wohnung</div>
      <div class="card-s" style="margin-bottom:18px">${esc(s.note || "")}</div>
      <div class="hbars">${bars}</div></div>`));

    // Composition of a representative rent (kalt / nk / küche / strom / stellplatz)
    const totalKalt = (s.einheiten || []).reduce((a, u) => a + FE.unitIncome(u).kalt, 0);
    const totalNk = (s.einheiten || []).reduce((a, u) => a + FE.unitIncome(u).nk, 0);
    const totalKueche = (s.einheiten || []).reduce((a, u) => a + (Number(u.kueche) || 0), 0);
    const totalStrom = (s.einheiten || []).reduce((a, u) => a + (Number(u.strom) || 0), 0);
    const totalStell = (s.einheiten || []).reduce((a, u) => a + (Number(u.stellplatz) || 0), 0);
    const comp = [
      { name: "Kaltmiete", value: totalKalt, color: PALETTE[0] },
      { name: "Nebenkosten", value: totalNk, color: PALETTE[1] },
      { name: "Küche", value: totalKueche, color: PALETTE[3] },
      { name: "Strom", value: totalStrom, color: PALETTE[4] },
      { name: "Stellplatz", value: totalStell, color: PALETTE[5] }
    ].filter(x => x.value > 0);
    const legend = comp.map(x => `<div class="leg"><span class="sw" style="background:${x.color}"></span>
      <span class="lt">${esc(x.name)}</span><span class="lv">${eur(x.value)}</span></div>`).join("");
    host.appendChild(el(`<div class="card pad">
      <div class="card-t" style="margin-bottom:4px">Zusammensetzung (Potenzial)</div>
      <div class="card-s" style="margin-bottom:18px">Alle Einheiten bei Vollvermietung</div>
      <div class="donut-row">${donut(comp)}<div class="legend">${legend}</div></div></div>`));

    // Detail table per unit
    const rows = (s.einheiten || []).map((u, i) => {
      const inc = FE.unitIncome(u);
      return `<div class="drow"><div class="drow-l"><div class="drow-badge">${esc(u.wohnung.replace(/\D/g, "") || (i + 1))}</div>
        <div><div class="drow-name">${esc(u.wohnung)} · ${u.flaeche} m²</div>
        <div class="drow-sub">kalt ${eur(inc.kalt)} · NK ${eur(inc.nk)}${inc.kueche ? " · Küche " + eur(inc.kueche) : ""}${inc.strom ? " · Strom " + eur(inc.strom) : ""}${inc.stell ? " · Stellpl. " + eur(inc.stell) : ""}</div></div></div>
        <div class="drow-val"><b>${eur(inc.gesamt)}</b><span>${u.status === "vermietet" ? "vermietet" : "frei"}</span></div></div>`;
    }).join("");
    host.appendChild(el(`<div class="card"><div class="card-h"><div><div class="card-t">Wohneinheiten</div>
      <div class="card-s">Aufschlüsselung je WE</div></div></div><div class="card-b">${rows}</div></div>`));
  }

  /* ---------- BOOT ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    $("#loginBtn").addEventListener("click", tryLogin);
    $("#pw").addEventListener("keydown", e => { if (e.key === "Enter") tryLogin(); });
    $("#logoutBtn").addEventListener("click", logout);
    if (sessionOK()) enterApp();
    else { $("#login").classList.remove("hide"); setTimeout(() => $("#pw").focus(), 150); }
  });
})();
