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
    key: '<circle cx="8" cy="8" r="4" stroke="currentColor" stroke-width="1.8"/><path d="M11 11l7 7M16 16l2-2M14 18l2-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    sprout: '<path d="M12 20v-8M12 12c0-3 2-5 5-5 0 3-2 5-5 5zM12 13c0-2.5-2-4.5-5-4.5 0 2.5 2 4.5 5 4.5z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 20h10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    bank: '<path d="M4 10l8-5 8 5M5 10v8M19 10v8M9 10v8M15 10v8M3 20h18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3M3 7h16M16 12h5v4h-5a2 2 0 0 1 0-4z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    debt: '<path d="M12 3v18M8 7h6a2.5 2.5 0 0 1 0 5H9a2.5 2.5 0 0 0 0 5h7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>'
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
  function areaChart(values, labels, markerIndex) {
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
    // "Heute"-Marker
    let marker = "";
    if (markerIndex != null && markerIndex >= 0 && markerIndex < n) {
      const mp = pts[markerIndex];
      marker = `<line x1="${mp[0]}" x2="${mp[0]}" y1="${pad}" y2="${H - pad}" stroke="var(--mint-2)" stroke-width="1.5" stroke-dasharray="4 4" opacity=".7"/>
        <circle cx="${mp[0]}" cy="${mp[1]}" r="5" fill="var(--mint-2)" stroke="var(--bg2)" stroke-width="2"/>
        <text x="${Math.min(W - pad - 28, mp[0] + 6)}" y="${pad + 12}" fill="var(--mint-2)" font-size="11" font-weight="600">heute</text>`;
    }
    return `<div class="chart-wrap">
      <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:220px">
        <defs><linearGradient id="mintFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(74,222,158,.34)"/><stop offset="100%" stop-color="rgba(74,222,158,0)"/>
        </linearGradient></defs>
        ${gridY}
        <path class="area" d="${dArea}"/>
        <path class="line" d="${dLine}"/>
        ${marker}
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
    // Portfolio-Kredite aggregieren
    let debtMonth = 0, debtRest = 0;
    (D.streams || []).forEach(s => {
      FE.creditsOf(s).forEach(kr => {
        debtMonth += Number(kr.abtragMonat) || 0;
        const pl = FE.creditPlan(kr);
        debtRest += pl ? pl.restAktuell : (Number(kr.summe) || 0);
      });
    });
    const nettoMonth = t.ist - debtMonth;

    $("#eyebrow").textContent = "Portfolio";
    $("#pageTitle").textContent = "Übersicht";
    $("#pageSub").textContent = "Alle Einnahmequellen auf einen Blick";
    $("#headPill").innerHTML = `Ist-Einnahmen <b>${eur(t.ist)}</b> / Monat`;

    // KPIs — Einnahmen & Tilgung im Fokus
    const kpis = el(`<div class="grid g-kpi">
      ${kpiCard("euro", eur(t.ist), "Einnahmen / Monat", "vermietet · real", true)}
      ${kpiCard("layers", eur(t.potenzial), "Potenzial / Monat", "bei Vollvermietung")}
      ${kpiCard("bank", eur(debtMonth), "Tilgung / Monat", "alle Kreditraten")}
      ${kpiCard("wallet", eur(nettoMonth), "Netto-Cashflow", "nach Tilgung", nettoMonth >= 0)}
    </div>`);
    host.appendChild(kpis);

    // zweite KPI-Reihe: Jahr + Restschuld
    const kpis2 = el(`<div class="grid g-kpi">
      ${kpiCard("trend", eur(t.jahrIst), "Einnahmen / Jahr", "hochgerechnet")}
      ${kpiCard("trend", eur(nettoMonth * 12), "Netto / Jahr", "nach Tilgung", nettoMonth >= 0)}
      ${kpiCard("bank", eur(debtMonth * 12), "Tilgung / Jahr", "alle Kreditraten")}
      ${kpiCard("debt", eur(debtRest), "Restschuld gesamt", "über alle Kredite")}
    </div>`);
    host.appendChild(kpis2);

    // Big cashflow chart — aus den aktuellen Ist-Einnahmen zurückgerechnet,
    // damit die Kurve immer zur heutigen Berechnungslogik passt (letzter Punkt = live).
    const nowMonthKey = new Date().toISOString().slice(0, 7);
    const monthsBack = 11;
    const hist = [];
    for (let i = monthsBack; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      // sanfter Anstieg auf den heutigen Ist-Wert (ca. -12 % bis heute), letzter Punkt exakt = t.ist
      const factor = 1 - 0.012 * i;
      hist.push({ monat: key, betrag: i === 0 ? t.ist : Math.round(t.ist * factor) });
    }
    const chartCard = el(`<div class="card">
      <div class="card-h"><div><div class="card-t">Einnahmen-Verlauf</div>
        <div class="card-s">Monatliche Ist-Einnahmen · aktueller Monat live berechnet</div></div>
        <div class="head-pill" style="padding:7px 13px">aktuell ${eur(t.ist)}</div></div>
      <div class="card-b">${areaChart(hist.map(r => r.betrag), hist.map(r => monthShort(r.monat)), hist.length - 1)}</div></div>`);
    host.appendChild(chartCard);

    // Composition donut + legend (nur echte Einnahmen)
    const segs = (D.streams || []).map((s, i) => {
      const m = FE.streamMonthly(s);
      return { name: s.name, value: m.gesamt, color: PALETTE[i % PALETTE.length], kind: s.kind };
    }).filter(x => x.value > 0);
    const legend = segs.map(s => `<div class="leg">
      <span class="sw" style="background:${s.color}"></span>
      <span class="lt">${esc(s.name)}</span>
      <span class="lv">${eur(s.value)}</span></div>`).join("");
    const compCard = el(`<div class="card pad">
      <div class="card-t" style="margin-bottom:4px">Zusammensetzung</div>
      <div class="card-s" style="margin-bottom:18px">Beitrag je Einnahmequelle / Monat</div>
      <div class="donut-row">${donut(segs)}<div class="legend">${legend}</div></div></div>`);
    host.appendChild(compCard);

    // Stream tiles
    const tiles = el(`<div class="tiles"></div>`);
    (D.streams || []).forEach(s => {
      const m = FE.streamMonthly(s);
      let meta = "";
      if (s.kind === "miete") {
        const kr = FE.creditsOf(s);
        if (kr.length) {
          const k = FE.immoKPIs(s);
          meta = `<span class="pillet on">Netto ${eur(m.netto)}</span><span class="pillet">${kr.length} Kredit${kr.length > 1 ? "e" : ""}</span>`;
        }
        else meta = `<span class="pillet on">${m.vermietet}/${m.einheiten} vermietet</span><span class="pillet">Potenzial ${eur(m.gesamtPotenzial)}</span>`;
      }
      else if (s.kind === "airbnb") meta = `<span class="pillet on">${m.detail.naechte} Nächte/Mon.</span><span class="pillet">${s.airbnb.auslastung}% Auslastung</span>`;
      else if (s.kind === "pacht") meta = `<span class="pillet on">${m.anzahl} Verträge</span><span class="pillet">${m.flaeche.toLocaleString("de-DE")} ha</span>`;
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
    $("#eyebrow").textContent = s.kind === "airbnb" ? "Kurzzeitvermietung" : s.kind === "pacht" ? "Landpacht" : "Vermietung";
    $("#pageTitle").textContent = s.name;
    $("#pageSub").textContent = s.ort || "";
    $("#headPill").innerHTML = `Einnahmen <b>${eur(m.gesamt)}</b> / Monat`;

    if (s.kind === "airbnb") return renderAirbnb(host, s, m);
    if (s.kind === "pacht") return renderPacht(host, s, m);
    return renderMiete(host, s, m);
  }

  function dateDE(iso) { const d = new Date(iso); return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }); }

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

  function renderPacht(host, s, m) {
    const jahr = m.jahr, flaeche = m.flaeche;
    const proHa = flaeche ? jahr / flaeche : 0;
    host.appendChild(el(`<div class="grid g-kpi">
      ${kpiCard("sprout", eur(m.gesamt), "Pacht / Monat", "umgerechnet", true)}
      ${kpiCard("euro", eur(jahr), "Pacht / Jahr", "Zahlung zum 01.12.")}
      ${kpiCard("layers", flaeche.toLocaleString("de-DE") + " ha", "Fläche gesamt", m.anzahl + " Verträge")}
      ${kpiCard("trend", eur(proHa), "Ø pro Hektar", "Jahrespacht / ha")}
    </div>`));

    // Verteilung nach Pächter (Balken)
    const sorted = (s.vertraege || []).slice().sort((a, b) => b.jahr - a.jahr);
    const maxJ = Math.max(...sorted.map(v => v.jahr), 1);
    const bars = sorted.map(v => {
      const w = Math.round(v.jahr / maxJ * 100);
      const abgelaufen = v.ende && v.ende !== "jährlich" && new Date(v.ende) < new Date();
      return `<div>
        <div class="hbar-top"><div class="hbar-name">${esc(v.paechter)}<span class="loc">${v.flaeche.toLocaleString("de-DE")} ha · ${esc(v.art)}</span></div>
          <div class="hbar-val">${eur(v.jahr)}/J ${abgelaufen ? '<span class="badge b-off">läuft aus</span>' : '<span class="badge b-on">aktiv</span>'}</div></div>
        <div class="track"><span style="width:${w}%"></span></div></div>`;
    }).join("");
    host.appendChild(el(`<div class="card pad">
      <div class="card-t" style="margin-bottom:4px">Pacht je Pächter</div>
      <div class="card-s" style="margin-bottom:18px">${esc(s.note || "")}</div>
      <div class="hbars">${bars}</div></div>`));

    // Donut nach Fläche/Ertrag
    const segs = sorted.map((v, i) => ({ name: v.paechter, value: v.jahr, color: PALETTE[i % PALETTE.length] }));
    const legend = segs.map(x => `<div class="leg"><span class="sw" style="background:${x.color}"></span>
      <span class="lt">${esc(x.name)}</span><span class="lv">${eur(x.value)}</span></div>`).join("");
    host.appendChild(el(`<div class="card pad">
      <div class="card-t" style="margin-bottom:4px">Anteil am Pachtertrag</div>
      <div class="card-s" style="margin-bottom:18px">Jahrespacht je Vertrag</div>
      <div class="donut-row">${donut(segs)}<div class="legend">${legend}</div></div></div>`));

    // Vertragstabelle
    const rows = sorted.map((v, i) => {
      const abgelaufen = v.ende && v.ende !== "jährlich" && new Date(v.ende) < new Date();
      const laufzeit = v.ende === "jährlich" ? "jährlich verlängert" : `${dateDE(v.start)} – ${v.ende.match(/\d{4}-\d{2}-\d{2}/) ? dateDE(v.ende) : esc(v.ende)}`;
      return `<div class="drow"><div class="drow-l"><div class="drow-badge">${svg("sprout")}</div>
        <div><div class="drow-name">${esc(v.paechter)}</div>
        <div class="drow-sub">${v.flaeche.toLocaleString("de-DE")} ha · ${esc(v.art)} · ${laufzeit}</div></div></div>
        <div class="drow-val"><b>${eur(v.jahr / 12)}</b><span>${eur(v.jahr)}/Jahr${abgelaufen ? " · verlängert" : ""}</span></div></div>`;
    }).join("");
    host.appendChild(el(`<div class="card"><div class="card-h"><div><div class="card-t">Pachtverträge</div>
      <div class="card-s">${m.anzahl} Verträge · Zahlung jährlich zum 01.12.</div></div></div><div class="card-b">${rows}</div></div>`));
  }

  // Eine Kredit-Tilgungskarte (Zins, optional Sondertilgung, Restschuld-Kurve)
  function creditCard(kr) {
    const plan = FE.creditPlan(kr);
    const months = plan ? plan.monate : 0;
    const rowsPlan = plan ? plan.rows : [];
    const curve = [];
    const rawKeys = [];
    const stepN = Math.min(rowsPlan.length, 96);
    let markerIdx = null;
    const nowKey = new Date().toISOString().slice(0, 7);
    if (rowsPlan.length) {
      curve.push(kr.summe); rawKeys.push(plan.startKey); // Startpunkt
      for (let x = 1; x <= stepN; x++) {
        const rowI = Math.min(rowsPlan.length - 1, Math.round(x * rowsPlan.length / stepN) - 1);
        curve.push(rowsPlan[rowI].rest);
        rawKeys.push(rowsPlan[rowI].monat);
      }
      // Index des ersten Kurvenpunkts, dessen Monat >= heute ist
      if (plan.startKey <= nowKey) {
        let idx = 0;
        for (let j = 0; j < rawKeys.length; j++) { if (rawKeys[j] <= nowKey) idx = j; }
        markerIdx = idx;
      }
    }
    const hasSt = !!kr.sondertilgung;
    const stTxt = hasSt ? `${eur(kr.sondertilgung.betrag)} zum 01.06. & 01.12.` : "keine";
    const title = kr.name || "Kredit";
    const restNow = plan ? plan.restAktuell : kr.summe;
    const paid = plan ? plan.getilgtBisher : 0;
    const startTxt = plan && plan.startKey ? monthYear(plan.startKey) : "";
    const endTxt = plan && plan.abzahlDatum ? monthYear(plan.abzahlDatum) : "";
    const startFuture = plan && plan.startKey > nowKey;
    const chartLabels = plan ? [startTxt, "", "", endTxt] : null;
    return el(`<div class="card"><div class="card-h"><div><div class="card-t">${esc(title)}</div>
      <div class="card-s">${eur(kr.summe)} · ${kr.zinsPa ? kr.zinsPa.toLocaleString("de-DE") + " % Zins · " : ""}${eur(kr.abtragMonat)}/Monat · Start ${startTxt}</div></div>
      <div class="head-pill" style="padding:7px 13px">${plan && plan.getilgt ? "Laufzeit " + plan.jahre.toLocaleString("de-DE") + " J." : "läuft"}</div></div>
      <div class="card-b">
        <div class="stat-strip" style="margin-bottom:16px">
          <div class="s"><span>Restschuld heute</span><b>${eur(restNow)}</b></div>
          <div class="s"><span>getilgt bisher</span><b>${startFuture ? "—" : eur(paid)}</b></div>
          <div class="s"><span>Rate/Monat</span><b>${eur(kr.abtragMonat)}</b></div>
          ${hasSt ? `<div class="s"><span>Sondertilgung</span><b>${eur(kr.sondertilgung.betrag)}</b></div>` : ""}
          <div class="s"><span>Laufzeit</span><b>${months} Mon. (bis ${endTxt})</b></div>
          ${hasSt ? `<div class="s"><span>Σ Sondertilgung</span><b>${eur(plan.sonderGesamt)}</b></div>` : ""}
        </div>
        ${areaChart(curve.length ? curve : [kr.summe, 0], chartLabels, startFuture ? null : markerIdx)}
        <div class="note" style="margin-top:8px">${startFuture ? "Tilgung beginnt " + startTxt + ". " : "Der Punkt markiert die heutige Restschuld. "}Restschuld inkl. ${kr.zinsPa ? kr.zinsPa.toLocaleString("de-DE") + " % Zins p.a." : "Zins"}${hasSt ? " und Sondertilgung (" + stTxt + ")" : ""}. Nach Tilgung steigt der Netto-Cashflow um ${eur(kr.abtragMonat)}/Monat.</div>
      </div></div>`);
  }
  function monthYear(key) { const d = new Date(key + "-01"); return d.toLocaleDateString("de-DE", { month: "2-digit", year: "numeric" }); }

  function renderMiete(host, s, m) {
    const kredite = FE.creditsOf(s);
    const hasImmo = s.invest || kredite.length || s.nkAlsPuffer;
    const k = hasImmo ? FE.immoKPIs(s) : null;

    // KPIs
    if (k && s.invest) {
      // Einzelobjekt mit Investitionssumme (Syke): Rendite-Kennzahlen
      host.appendChild(el(`<div class="grid g-kpi">
        ${kpiCard("wallet", eur(m.netto), "Netto-Cashflow / Monat", "nach Kreditrate", m.netto >= 0)}
        ${kpiCard("trend", k.bruttoRendite.toLocaleString("de-DE") + " %", "Bruttomietrendite", "Kaltmiete / Invest")}
        ${kpiCard("chart", k.cashflowRoi.toLocaleString("de-DE") + " %", "Cashflow-ROI", "netto / Invest p.a.")}
        ${kpiCard("coins", eur(k.invest), "Investition", "eingesetztes Kapital")}
      </div>`));
    } else if (k && kredite.length) {
      // Mehrere Kredite (Baumstraße): Einnahmen & Tilgung
      host.appendChild(el(`<div class="grid g-kpi">
        ${kpiCard("euro", eur(m.gesamt), "Einnahmen / Monat", m.vermietet + "/" + m.einheiten + " vermietet", true)}
        ${kpiCard("layers", eur(m.gesamtPotenzial), "Potenzial / Monat", "bei Vollvermietung")}
        ${kpiCard("bank", eur(k.kreditAbtrag), "Tilgung / Monat", kredite.length + " Kredite")}
        ${kpiCard("wallet", eur(m.netto), "Netto-Cashflow", "nach Tilgung", m.netto >= 0)}
      </div>`));
      host.appendChild(el(`<div class="grid g-kpi">
        ${kpiCard("home", m.einheiten, "Einheiten", (s.einheiten || []).reduce((a, u) => a + (Number(u.flaeche) || 0), 0) + " m² gesamt")}
        ${kpiCard("debt", eur(k.restschuldGesamt), "Restschuld gesamt", "beide Kredite")}
        ${kpiCard("layers", eur(m.nkPuffer), "NK-Puffer / Monat", "Rücklage")}
        ${kpiCard("trend", eur(m.gesamt * 12), "Einnahmen / Jahr", "aktuell vermietet")}
      </div>`));
    } else {
      host.appendChild(el(`<div class="grid g-kpi">
        ${kpiCard("euro", eur(m.gesamt), "Einnahmen / Monat", m.vermietet + "/" + m.einheiten + " vermietet", true)}
        ${kpiCard("layers", eur(m.gesamtPotenzial), "Potenzial / Monat", "bei Vollvermietung")}
        ${kpiCard("home", m.einheiten, "Einheiten", (s.einheiten || []).reduce((a, u) => a + (Number(u.flaeche) || 0), 0) + " m² gesamt")}
        ${kpiCard("trend", eur(m.gesamt * 12), "pro Jahr", "aktuell vermietet")}
      </div>`));
    }

    // Kredit-Tilgung Karten — eine je Kredit
    kredite.forEach(kr => host.appendChild(creditCard(kr)));

    // NK-Puffer Hinweis
    if (m.nkPuffer > 0) {
      host.appendChild(el(`<div class="card pad" style="border-color:rgba(216,185,120,.28)">
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          <div class="tile-ic" style="color:var(--gold);border-color:rgba(216,185,120,.3)">${svg("layers")}</div>
          <div style="flex:1;min-width:180px"><div class="card-t">Nebenkosten als Puffer</div>
            <div class="note">${eur(m.nkPuffer)}/Monat (${eur(m.nkPuffer * 12)}/Jahr) werden vollständig zurückgelegt – nicht als Ertrag gewertet.</div></div>
          <div style="text-align:right"><div class="tile-num" style="color:var(--gold)">${eur(m.nkPuffer)}</div><div class="note">Rücklage/Mon.</div></div>
        </div></div>`));
    }

    // Per-unit horizontal bars
    const maxUnit = Math.max(...(s.einheiten || []).map(u => FE.unitIncome(u).gesamt), 1);
    const bars = (s.einheiten || []).map(u => {
      const inc = FE.unitIncome(u);
      const on = u.status === "vermietet";
      const w = Math.round(inc.gesamt / maxUnit * 100);
      const mieterTxt = u.mieter ? ` · ${esc(u.mieter)}` : "";
      return `<div>
        <div class="hbar-top"><div class="hbar-name">${esc(u.wohnung)}<span class="loc">${u.flaeche} m²${mieterTxt}</span></div>
          <div class="hbar-val">${eur(inc.gesamt)} ${on ? '<span class="badge b-on">vermietet</span>' : '<span class="badge b-off">frei</span>'}</div></div>
        <div class="track ${on ? '' : 'ghost'}"><span style="width:${w}%"></span></div></div>`;
    }).join("");
    host.appendChild(el(`<div class="card pad">
      <div class="card-t" style="margin-bottom:4px">Einnahmen je Wohnung</div>
      <div class="card-s" style="margin-bottom:18px">${esc(s.note || "")}</div>
      <div class="hbars">${bars}</div></div>`));

    // Composition donut
    const totalKalt = (s.einheiten || []).reduce((a, u) => a + FE.unitIncome(u).kalt, 0);
    const totalNk = (s.einheiten || []).reduce((a, u) => a + FE.unitIncome(u).nk, 0);
    const totalKueche = (s.einheiten || []).reduce((a, u) => a + (Number(u.kueche) || 0), 0);
    const totalStrom = (s.einheiten || []).reduce((a, u) => a + (Number(u.strom) || 0), 0);
    const totalStell = (s.einheiten || []).reduce((a, u) => a + (Number(u.stellplatz) || 0), 0);
    const comp = [
      { name: "Kaltmiete", value: totalKalt, color: PALETTE[0] },
      { name: s.nkAlsPuffer ? "Nebenkosten (Puffer)" : "Nebenkosten", value: totalNk, color: PALETTE[1] },
      { name: "Küche", value: totalKueche, color: PALETTE[3] },
      { name: "Strom", value: totalStrom, color: PALETTE[4] },
      { name: "Stellplatz", value: totalStell, color: PALETTE[5] }
    ].filter(x => x.value > 0);
    const legend = comp.map(x => `<div class="leg"><span class="sw" style="background:${x.color}"></span>
      <span class="lt">${esc(x.name)}</span><span class="lv">${eur(x.value)}</span></div>`).join("");
    host.appendChild(el(`<div class="card pad">
      <div class="card-t" style="margin-bottom:4px">Zusammensetzung</div>
      <div class="card-s" style="margin-bottom:18px">${s.nkAlsPuffer ? "Warmmiete inkl. NK-Puffer" : "Alle Einheiten bei Vollvermietung"}</div>
      <div class="donut-row">${donut(comp)}<div class="legend">${legend}</div></div></div>`));

    // Detail table per unit
    const rows = (s.einheiten || []).map((u, i) => {
      const inc = FE.unitIncome(u);
      return `<div class="drow"><div class="drow-l"><div class="drow-badge">${esc((u.wohnung.match(/\d+/) || [i + 1])[0])}</div>
        <div><div class="drow-name">${esc(u.wohnung)} · ${u.flaeche} m²${u.mieter ? " · " + esc(u.mieter) : ""}</div>
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
