/* ============================================================================
   app.js — Bücking Einnahmen-Dashboard (Visualisierung)
   ============================================================================ */
(function () {
  "use strict";
  let D = window.DASHBOARD_DATA || {};
  const FE = window.FinanceEngine;
  const SESSION = "buecking_income_v1";
  const LASTUSER = "buecking_lastuser";

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
  let currentUser = null;   // { id, name, anrede }

  function benutzerListe() {
    return (D.auth && D.auth.benutzer) || [{ id: "gast", name: "Gast", anrede: "" }];
  }
  function benutzerById(id) {
    return benutzerListe().find(b => b.id === id) || benutzerListe()[0];
  }
  function fuelleBenutzerAuswahl() {
    const sel = $("#whoami");
    if (!sel) return;
    sel.innerHTML = benutzerListe().map(b =>
      `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join("");
    // zuletzt genutzten Benutzer vorauswählen
    const last = localStorage.getItem(LASTUSER);
    if (last && benutzerListe().some(b => b.id === last)) sel.value = last;
  }
  function sessionOK() {
    try { const s = JSON.parse(localStorage.getItem(SESSION) || "null");
      if (!(s && s.ok && (Date.now() - s.ts) < ((D.auth && D.auth.sessionHours) || 12) * 3600e3))
        return false;
      currentUser = benutzerById(s.user);
      return true;
    } catch { return false; }
  }
  async function tryLogin() {
    const msg = $("#loginMsg"), v = $("#pw").value;
    const uid = $("#whoami") ? $("#whoami").value : "gast";
    if (!v) { msg.textContent = "Bitte Passwort eingeben."; msg.className = "login-msg bad"; return; }
    msg.textContent = "Prüfe…"; msg.className = "login-msg";
    if (await sha256(v) === (D.auth && D.auth.passwordHash)) {
      currentUser = benutzerById(uid);
      localStorage.setItem(SESSION, JSON.stringify({ ok: true, ts: Date.now(), user: uid }));
      localStorage.setItem(LASTUSER, uid);
      enterApp();
    } else { msg.textContent = "Falsches Passwort."; msg.className = "login-msg bad"; $("#pw").select(); }
  }
  function logout() { localStorage.removeItem(SESSION); location.reload(); }

  function enterApp() {
    $("#login").classList.add("hide"); $("#app").classList.remove("hide");
    buildRail(); route("overview");
  }

  /* ---------- NAV ---------- */
  // Alle Mietobjekte (kind === "miete") laufen unter einem Sammel-Reiter
  function mietStreams() { return (D.streams || []).filter(s => s.kind === "miete"); }

  function navItems() {
    const rest = (D.streams || []).filter(s => s.kind !== "miete")
      .map(s => ({ id: s.id, label: shortLabel(s.name), icon: s.icon || "euro" }));
    return [
      { id: "overview", label: "Übersicht", icon: "grid" },
      { id: "vermietung", label: "Vermietung", icon: "home", group: true },
      ...rest
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
      b.onclick = (e) => {
        if (it.group) { e.stopPropagation(); openSubmenu(b); }
        else route(it.id);
      };
      rail.insertBefore(b, spacer);
    });
  }

  /* ---------- SUBMENU (Mietobjekte) ---------- */
  function openSubmenu(anchor) {
    closeSubmenu();
    const items = mietStreams().map(s => {
      const m = FE.streamMonthly(s);
      const on = currentView === s.id;
      return `<div class="sub-item${on ? " on" : ""}" data-id="${s.id}">
        <div class="sub-ic">${svg(s.icon || "home")}</div>
        <div class="sub-tx"><div class="sub-n">${esc(s.name)}</div>
          <div class="sub-m">${m.vermietet}/${m.einheiten} vermietet</div></div>
        <div class="sub-v">${eur(m.gesamt)}</div></div>`;
    }).join("");
    const bd = el(`<div class="sub-bd"></div>`);
    const menu = el(`<div class="submenu">
      <div class="submenu-t">Vermietung</div>
      <div class="sub-item${currentView === "vermietung" ? " on" : ""}" data-id="vermietung">
        <div class="sub-ic">${svg("layers")}</div>
        <div class="sub-tx"><div class="sub-n">Alle Objekte</div>
          <div class="sub-m">Sammelübersicht</div></div></div>
      ${items}</div>`);
    document.body.appendChild(bd); document.body.appendChild(menu);

    // Position: Desktop/iPad neben der Rail, Handy als Bottom-Sheet (per CSS)
    if (window.innerWidth > 560) {
      const r = anchor.getBoundingClientRect();
      menu.style.left = (r.right + 10) + "px";
      const h = menu.offsetHeight;
      menu.style.top = Math.max(12, Math.min(r.top, window.innerHeight - h - 12)) + "px";
    }
    requestAnimationFrame(() => { bd.classList.add("on"); menu.classList.add("on"); });

    menu.querySelectorAll(".sub-item").forEach(it => {
      it.onclick = () => { const id = it.dataset.id; closeSubmenu(); route(id); };
    });
    bd.onclick = closeSubmenu;
    document.addEventListener("keydown", subEsc);
  }
  function subEsc(e) { if (e.key === "Escape") closeSubmenu(); }
  function closeSubmenu() {
    document.removeEventListener("keydown", subEsc);
    $$(".sub-bd, .submenu").forEach(n => {
      n.classList.remove("on");
      setTimeout(() => n.remove(), 220);
    });
  }

  const TITLES = {
    overview: ["Portfolio", "Übersicht", "Alle Einnahmequellen auf einen Blick"]
  };
  let currentView = "overview";
  function route(id) {
    currentView = id;
    const isMiete = mietStreams().some(s => s.id === id) || id === "vermietung";
    $$("#rail .rail-btn").forEach(b => {
      const d = b.dataset.id;
      b.classList.toggle("on", d === id || (d === "vermietung" && isMiete));
    });
    const host = $("#views"); host.innerHTML = "";
    if (id === "overview") renderOverview(host);
    else if (id === "vermietung") renderVermietung(host);
    else renderStream(host, id);
    $(".scroll").scrollTop = 0;
  }

  /* ---------- shared bits ---------- */
  function kpiCard(icon, num, lab, desc, accent, action) {
    return `<div class="card kpi ${accent ? 'accent' : ''}${action ? ' clickable' : ''}"${action ? ` data-act="${action}"` : ''}><div class="card-glow"></div>
      ${action ? '<span class="tapme">Details ›</span>' : ''}
      <div class="chip">${svg(icon)}</div>
      <div class="num">${esc(num)}</div>
      <div class="lab">${esc(lab)}</div>
      <div class="desc">${esc(desc)}</div></div>`;
  }
  // verdrahtet [data-act] innerhalb eines Containers
  function wireActs(node, map) {
    node.querySelectorAll("[data-act]").forEach(n => {
      const fn = map[n.dataset.act];
      if (fn) n.onclick = fn;
    });
    return node;
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

  /* ---------- SHEET (Detail-Overlay) ---------- */
  function openSheet(title, subtitle, bodyHtml) {
    closeSheet();
    const bd = el(`<div class="sheet-bd">
      <div class="sheet" role="dialog" aria-modal="true">
        <div class="sheet-grip"></div>
        <div class="sheet-h">
          <div class="st"><div class="sheet-t">${esc(title)}</div>
            ${subtitle ? `<div class="sheet-s">${esc(subtitle)}</div>` : ""}</div>
          <button class="sheet-x" aria-label="Schließen">×</button>
        </div>
        <div class="sheet-b">${bodyHtml}</div>
      </div></div>`);
    document.body.appendChild(bd);
    requestAnimationFrame(() => bd.classList.add("on"));
    bd.addEventListener("click", e => { if (e.target === bd) closeSheet(); });
    bd.querySelector(".sheet-x").onclick = closeSheet;
    document.addEventListener("keydown", sheetEsc);
    return bd;
  }
  function sheetEsc(e) { if (e.key === "Escape") closeSheet(); }
  function closeSheet() {
    document.removeEventListener("keydown", sheetEsc);
    $$(".sheet-bd").forEach(n => { n.classList.remove("on"); setTimeout(() => n.remove(), 260); });
  }
  const kv = (k, v, muted) => `<div class="kv${muted ? " muted" : ""}"><span>${esc(k)}</span><b>${v}</b></div>`;
  function miniBars(rows) {
    const max = Math.max(...rows.map(r => r.value), 1);
    return `<div class="mini">${rows.map(r => `<div class="mini-row">
      <span class="mini-lab">${esc(r.label)}</span>
      <span class="mini-track"><span style="width:${Math.round(r.value / max * 100)}%;background:${r.color || "linear-gradient(90deg,var(--deep),var(--mint))"}"></span></span>
      <span class="mini-val">${r.display || eur(r.value)}</span></div>`).join("")}</div>`;
  }

  /* ---------- INTELLIGENTE SUCHE ---------- */
  // Baut eine durchsuchbare Wissensbasis aus allen Dashboard-Daten
  function wissensBasis() {
    const eintraege = [];
    const t = FE.totals(D);
    const add = (titel, wert, detail, worte, aktion) =>
      eintraege.push({ titel, wert, detail, worte: worte.toLowerCase(), aktion });

    // Portfolio-Kennzahlen
    let debtMonth = 0, debtRest = 0, units = 0, let_ = 0;
    (D.streams || []).forEach(s => {
      (s.einheiten || []).forEach(u => { units++; if (u.status === "vermietet") let_++; });
      FE.creditsOf(s).forEach(kr => {
        debtMonth += Number(kr.abtragMonat) || 0;
        const p = FE.creditPlan(kr); debtRest += p ? p.restAktuell : 0;
      });
    });
    add("Einnahmen gesamt", eur(t.ist), "pro Monat über alle Quellen",
        "einnahmen gesamt monat portfolio umsatz miete summe wieviel verdiene ich einnahme",
        () => route("overview"));
    add("Einnahmen pro Jahr", eur(t.jahrIst), "hochgerechnet",
        "einnahmen jahr jaehrlich jährlich hochgerechnet", () => route("overview"));
    add("Netto-Cashflow", eur(t.ist - debtMonth), "nach allen Kreditraten",
        "netto cashflow überschuss gewinn nach tilgung übrig bleibt",
        () => route("overview"));
    add("Auslastung", Math.round(let_ / (units || 1) * 100) + " %",
        let_ + " von " + units + " Einheiten vermietet",
        "auslastung vermietet frei leer belegung quote wieviele wohnungen",
        () => route("overview"));
    add("Restschuld", eur(debtRest), "über alle Kredite",
        "restschuld schulden kredit darlehen offen rest tilgung schuld",
        () => route("overview"));
    add("Tilgung pro Monat", eur(debtMonth), "alle Kreditraten zusammen",
        "tilgung rate monatlich kredit zahlung abtrag", () => route("overview"));
    add("Potenzial", eur(t.potenzial), "bei Vollvermietung möglich",
        "potenzial möglich maximal vollvermietung upside luft nach oben",
        () => route("overview"));

    // je Objekt
    (D.streams || []).forEach(s => {
      const m = FE.streamMonthly(s);
      add(s.name, eur(m.gesamt), "Einnahmen pro Monat" + (s.ort ? " · " + s.ort : ""),
          s.name + " " + (s.ort || "") + " " + s.kind + " objekt einnahmen",
          () => route(s.id));

      if (s.kind === "miete" && s.invest) {
        const k = FE.immoKPIs(s);
        add("Rendite " + shortLabel(s.name), k.bruttoRendite.toLocaleString("de-DE") + " %",
            "Bruttomietrendite · Cashflow-ROI " + k.cashflowRoi.toLocaleString("de-DE") + " %",
            "rendite " + s.name + " roi ertrag verzinsung prozent", () => route(s.id));
      }
      if (m.nkPuffer) {
        add("Nebenkosten " + shortLabel(s.name), eur(m.nkPuffer), "Rücklage pro Monat",
            "nebenkosten nk puffer rücklage " + s.name, () => route(s.id));
      }

      // Wohneinheiten und Mieter
      (s.einheiten || []).forEach(u => {
        const inc = FE.unitIncome(u);
        const warm = eur(inc.gesamt);
        if (u.mieter) {
          add(u.mieter, warm, u.wohnung + " · " + u.flaeche + " m² · " + shortLabel(s.name)
              + (u.einzug ? " · Einzug " + dateDE(u.einzug) : ""),
              u.mieter + " " + u.wohnung + " mieter wohnt miete zahlt " + s.name,
              () => { route(s.id); setTimeout(() => openUnitSheet(s, u), 260); });
        } else {
          add(u.wohnung + " (frei)", warm, "würde " + warm + " bringen · "
              + u.flaeche + " m² · " + shortLabel(s.name),
              u.wohnung + " frei leer unvermietet " + s.name,
              () => { route(s.id); setTimeout(() => openUnitSheet(s, u), 260); });
        }
      });

      // Kredite
      FE.creditsOf(s).forEach(kr => {
        const p = FE.creditPlan(kr);
        add(kr.name, eur(p.restAktuell),
            "Restschuld · " + eur(kr.abtragMonat) + "/Monat · " + kr.zinsPa.toLocaleString("de-DE")
            + " % · abbezahlt " + (p.abzahlDatum ? monthYear(p.abzahlDatum) : "—"),
            kr.name + " kredit darlehen restschuld zins laufzeit " + s.name,
            () => { route(s.id); setTimeout(() => openCreditSheet(kr), 260); });
      });

      // Pacht
      (s.vertraege || []).forEach(v => {
        add(v.paechter, eur(v.jahr), "Pacht pro Jahr · " + v.flaeche.toLocaleString("de-DE")
            + " ha · " + v.art,
            v.paechter + " pacht pächter hektar acker grünland land",
            () => { route(s.id); setTimeout(() => openPachtSheet(s, v), 260); });
      });
    });

    // Termine
    (D.termine || []).forEach(tm => {
      add(tm.titel, dateDE(tm.datum), tm.info || "",
          tm.titel + " " + (tm.info || "") + " termin datum wann einzug zahlung",
          () => route("overview"));
    });
    return eintraege;
  }

  // Bewertet, wie gut ein Eintrag zur Frage passt
  // Wörter, die in Fragen häufig vorkommen und nichts zur Auswahl beitragen
  const STOPP = new Set(["was", "wer", "wie", "wo", "wann", "welche", "welcher", "welches",
    "der", "die", "das", "den", "dem", "ein", "eine", "einen", "ist", "sind", "hat",
    "habe", "haben", "wird", "werden", "für", "von", "mit", "und", "oder", "ich", "mir",
    "mein", "meine", "viel", "hoch", "aktuell", "gerade", "bitte", "zeig", "zeige"]);

  function bewerte(eintrag, frage) {
    const q = frage.toLowerCase().replace(/[?.,!]/g, " ");
    const roh = q.split(/\s+/).filter(w => w.length > 1);
    const woerter = roh.filter(w => !STOPP.has(w) && w.length > 2);
    if (!woerter.length && !roh.length) return 0;
    let score = 0;
    const titel = eintrag.titel.toLowerCase();
    const heu = (eintrag.titel + " " + eintrag.worte + " " + eintrag.detail).toLowerCase();

    // Wohnungsnummern gezielt behandeln: "we 2" / "we2" / "wohnung 2"
    const nr = q.match(/\b(?:we|wohnung|einheit)\s*(\d+)\b/);
    if (nr) {
      const treffer = new RegExp("we\\s*" + nr[1] + "\\b").test(heu);
      if (treffer) score += 30; else score -= 6;
    }
    woerter.forEach(w => {
      if (titel.includes(w)) score += 10;
      else if (heu.includes(w)) score += 4;
      else if (w.length > 4) {
        const stamm = w.slice(0, Math.max(4, w.length - 2));
        if (heu.includes(stamm)) score += 2;
      }
    });
    return score;
  }

  function sucheAntwort(frage) {
    const basis = wissensBasis();
    const treffer = basis
      .map(e => ({ e, score: bewerte(e, frage) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
    return treffer;
  }

  function searchCard() {
    const card = el(`<div class="card pad search-card">
      <div class="card-t" style="margin-bottom:4px">Suche</div>
      <div class="card-s" style="margin-bottom:14px">Frag nach Mietern, Zahlen oder Terminen</div>
      <div class="search-box">
        <span class="search-ic">${svg("chart")}</span>
        <input id="qInput" type="search" placeholder="z. B. Was zahlt Karin Schröder?"
               autocomplete="off" enterkeyhint="search">
        <button class="mic-btn" id="micBtn" title="Spracheingabe" aria-label="Spracheingabe">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
               stroke-linecap="round"><path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z"/>
          <path d="M19 11a7 7 0 0 1-14 0"/><path d="M12 18v3"/></svg>
        </button>
      </div>
      <div class="search-hint" id="qHint">Tipp: „Restschuld", „freie Wohnung", „Rendite Syke"</div>
      <div id="qOut"></div>
    </div>`);

    const input = card.querySelector("#qInput");
    const out = card.querySelector("#qOut");
    const hint = card.querySelector("#qHint");

    const zeige = (frage) => {
      const q = frage.trim();
      if (!q) { out.innerHTML = ""; hint.style.display = ""; return; }
      hint.style.display = "none";
      const treffer = sucheAntwort(q);
      if (!treffer.length) {
        out.innerHTML = `<div class="note" style="margin-top:12px">Dazu habe ich nichts gefunden.
          Versuch es mit einem Namen, einer Wohnung oder einem Begriff wie „Restschuld".</div>`;
        return;
      }
      out.innerHTML = `<div class="qres">${treffer.map((x, i) => `
        <div class="qr${i === 0 ? " top" : ""}" data-i="${i}">
          <div class="qr-l"><div class="qr-t">${esc(x.e.titel)}</div>
            <div class="qr-d">${esc(x.e.detail)}</div></div>
          <div class="qr-v">${x.e.wert}</div>
        </div>`).join("")}</div>`;
      out.querySelectorAll(".qr").forEach(n => n.onclick = () => {
        const x = treffer[Number(n.dataset.i)];
        if (x && x.e.aktion) x.e.aktion();
      });
    };

    let timer = null;
    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => zeige(input.value), 160);
    });
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") { clearTimeout(timer); zeige(input.value); }
      if (e.key === "Escape") { input.value = ""; zeige(""); }
    });

    // Spracheingabe (Web Speech API – im Browser eingebaut, kostenlos)
    const mic = card.querySelector("#micBtn");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      mic.style.display = "none";
    } else {
      let rec = null, laeuft = false;
      mic.onclick = () => {
        if (laeuft && rec) { rec.stop(); return; }
        rec = new SR();
        rec.lang = "de-DE";
        rec.interimResults = true;
        rec.continuous = false;
        rec.onstart = () => { laeuft = true; mic.classList.add("on");
          hint.style.display = ""; hint.textContent = "Ich höre zu…"; };
        rec.onresult = (e) => {
          let text = "";
          for (let i = e.resultIndex; i < e.results.length; i++) text += e.results[i][0].transcript;
          input.value = text;
          if (e.results[e.results.length - 1].isFinal) zeige(text);
        };
        rec.onerror = (e) => {
          mic.classList.remove("on"); laeuft = false;
          hint.style.display = "";
          hint.textContent = e.error === "not-allowed"
            ? "Mikrofon-Zugriff wurde abgelehnt."
            : "Spracheingabe nicht möglich.";
        };
        rec.onend = () => { mic.classList.remove("on"); laeuft = false;
          if (hint.textContent === "Ich höre zu…") {
            hint.textContent = 'Tipp: „Restschuld", „freie Wohnung", „Rendite Syke"';
          }
          if (input.value.trim()) zeige(input.value); };
        try { rec.start(); } catch (_) {}
      };
    }
    return card;
  }

  /* ---------- BEGRÜSSUNG ---------- */
  function tagesZeit() {
    const h = new Date().getHours();
    if (h < 5)  return "nacht";
    if (h < 11) return "morgen";
    if (h < 18) return "tag";
    if (h < 23) return "abend";
    return "nacht";
  }
  // Sammelt ausschließlich erfreuliche Kennzahlen
  function motivierendeFakten() {
    const f = [];
    const t = FE.totals(D);
    let units = 0, let_ = 0, tilgGetilgt = 0, tilgMonat = 0, nkJahr = 0;
    (D.streams || []).forEach(s => {
      const m = FE.streamMonthly(s);
      (s.einheiten || []).forEach(u => { units++; if (u.status === "vermietet") let_++; });
      if (m.nkPuffer) nkJahr += m.nkPuffer * 12;
      FE.creditsOf(s).forEach(kr => {
        const p = FE.creditPlan(kr);
        tilgGetilgt += p.getilgtBisher; tilgMonat += Number(kr.abtragMonat) || 0;
      });
    });

    if (t.ist > 0) f.push(`Aktuell fließen <b>${eur(t.ist)}</b> pro Monat herein.`);
    if (t.jahrIst > 0) f.push(`Hochgerechnet sind das <b>${eur(t.jahrIst)}</b> im Jahr.`);
    if (units && let_ === units) f.push(`Alle <b>${units} Einheiten</b> sind vermietet – volle Auslastung.`);
    else if (units && let_ / units >= 0.6)
      f.push(`<b>${let_} von ${units}</b> Einheiten sind vermietet – ${Math.round(let_ / units * 100)} % Auslastung.`);
    if (tilgMonat > 0) f.push(`Jeden Monat wandern <b>${eur(tilgMonat)}</b> in die Tilgung – das ist Vermögensaufbau.`);
    if (tilgGetilgt > 0) f.push(`Bereits <b>${eur(tilgGetilgt)}</b> Schulden getilgt.`);
    if (nkJahr > 0) f.push(`<b>${eur(nkJahr)}</b> Nebenkosten-Rücklage pro Jahr sorgen für Puffer.`);

    // objektbezogene Fakten
    (D.streams || []).forEach(s => {
      const m = FE.streamMonthly(s);
      if (s.kind === "miete" && s.invest) {
        const k = FE.immoKPIs(s);
        if (k.bruttoRendite > 0)
          f.push(`${esc(shortLabel(s.name))} erzielt <b>${k.bruttoRendite.toLocaleString("de-DE")} %</b> Bruttomietrendite.`);
      }
      if (s.kind === "airbnb" && m.gesamt > 0)
        f.push(`Die Ferienwohnung bringt <b>${eur(m.gesamt)}</b> im Monat.`);
      if (s.kind === "pacht" && m.jahr > 0)
        f.push(`Die Landpacht bringt <b>${eur(m.jahr)}</b> jährlich – ganz ohne Aufwand.`);
    });

    // freie Einheit als Chance formulieren, nicht als Mangel
    const upside = t.potenzial - t.ist;
    if (upside > 0) f.push(`Noch <b>${eur(upside)}</b> monatlich Luft nach oben bei Vollvermietung.`);
    return f;
  }
  function begruessungsKarte() {
    const zeit = tagesZeit();
    const vorlagen = (D.begruessungen && D.begruessungen[zeit]) || ["Hallo {name}!"];
    const name = (currentUser && currentUser.anrede) || "";
    const gruss = vorlagen[Math.floor(Math.random() * vorlagen.length)]
      .replace("{name}", name).replace(/\s*,\s*!/, "!").trim();
    const fakten = motivierendeFakten();
    const fakt = fakten.length ? fakten[Math.floor(Math.random() * fakten.length)] : "";
    const datum = new Date().toLocaleDateString("de-DE",
      { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    return el(`<div class="card pad hello">
      <div class="hello-t">${esc(gruss)}</div>
      ${fakt ? `<div class="hello-f">${fakt}</div>` : ""}
      <div class="hello-d">${esc(datum)}</div></div>`);
  }

  /* ---------- SAMMELSEITE VERMIETUNG ---------- */
  function renderVermietung(host) {
    $("#eyebrow").textContent = "Vermietung";
    $("#pageTitle").textContent = "Alle Mietobjekte";
    const streams = mietStreams();
    $("#pageSub").textContent = streams.length + " Objekte im Bestand";

    let ist = 0, pot = 0, tilg = 0, rest = 0, units = 0, let_ = 0, nkP = 0, invest = 0;
    streams.forEach(s => {
      const m = FE.streamMonthly(s);
      ist += m.gesamt; pot += m.gesamtPotenzial; tilg += m.kreditAbtrag; nkP += m.nkPuffer;
      units += m.einheiten; let_ += m.vermietet; invest += Number(s.invest) || 0;
      FE.creditsOf(s).forEach(kr => { const p = FE.creditPlan(kr); rest += p ? p.restAktuell : (kr.summe || 0); });
    });
    const netto = ist - tilg, occ = units ? Math.round(let_ / units * 100) : 0;

    host.appendChild(el(`<div class="grid g-kpi">
      ${kpiCard("euro", eur(ist), "Einnahmen / Monat", "alle Objekte", true)}
      ${kpiCard("layers", eur(pot), "Potenzial / Monat", "+" + eur(pot - ist) + " ungenutzt")}
      ${kpiCard("wallet", eur(netto), "Netto-Cashflow", "nach Tilgung", netto >= 0)}
      ${kpiCard("home", occ + " %", "Auslastung", let_ + " / " + units + " Einheiten", occ >= 60)}
    </div>`));

    // Kerninsights je Objekt
    const cards = streams.map(s => {
      const m = FE.streamMonthly(s);
      const k = FE.immoKPIs(s);
      const o = m.einheiten ? Math.round(m.vermietet / m.einheiten * 100) : 0;
      const flaeche = (s.einheiten || []).reduce((a, u) => a + (Number(u.flaeche) || 0), 0);
      return `<div class="card pad clickable obj-card" data-id="${s.id}">
        <div class="tile-head"><div class="tile-ic">${svg(s.icon || "home")}</div>
          <div><div class="tile-name">${esc(s.name)}</div><div class="tile-loc">${esc(s.ort || "")}</div></div></div>
        <div class="stat-strip" style="margin-bottom:14px">
          <div class="s"><span>Einnahmen</span><b>${eur(m.gesamt)}</b></div>
          <div class="s"><span>Netto n. Tilgung</span><b style="color:${m.netto >= 0 ? "var(--mint-2)" : "var(--danger)"}">${eur(m.netto)}</b></div>
          <div class="s"><span>Auslastung</span><b>${o} %</b></div>
          <div class="s"><span>Fläche</span><b>${flaeche} m²</b></div>
        </div>
        <div class="mini">
          <div class="mini-row"><span class="mini-lab">Vermietet</span>
            <span class="mini-track"><span style="width:${o}%"></span></span>
            <span class="mini-val">${m.vermietet}/${m.einheiten}</span></div>
          <div class="mini-row"><span class="mini-lab">Rendite</span>
            <span class="mini-track"><span style="width:${Math.min(100, k.bruttoRendite * 6)}%"></span></span>
            <span class="mini-val">${k.bruttoRendite.toLocaleString("de-DE")} %</span></div>
        </div></div>`;
    }).join("");
    const grid = el(`<div class="grid g-2">${cards}</div>`);
    grid.querySelectorAll(".obj-card").forEach(c => c.onclick = () => route(c.dataset.id));
    host.appendChild(grid);

    // Verteilung + Kennzahlen
    const segs = streams.map((s, i) => ({ name: s.name, value: FE.streamMonthly(s).gesamt, color: PALETTE[i % PALETTE.length] })).filter(x => x.value > 0);
    const legend = segs.map(x => `<div class="leg"><span class="sw" style="background:${x.color}"></span>
      <span class="lt">${esc(x.name)}</span><span class="lv">${eur(x.value)}</span></div>`).join("");
    host.appendChild(el(`<div class="grid g-2">
      <div class="card pad"><div class="card-t" style="margin-bottom:4px">Verteilung</div>
        <div class="card-s" style="margin-bottom:18px">Einnahmen je Objekt</div>
        <div class="donut-row">${donut(segs)}<div class="legend">${legend}</div></div></div>
      <div class="card pad"><div class="card-t" style="margin-bottom:4px">Kennzahlen gesamt</div>
        <div class="card-s" style="margin-bottom:14px">Über alle Mietobjekte</div>
        ${kv("Investition", eur(invest))}
        ${kv("Restschuld heute", eur(rest))}
        ${kv("Tilgung / Monat", eur(tilg))}
        ${kv("NK-Puffer / Monat", eur(nkP))}
        ${kv("Einnahmen / Jahr", eur(ist * 12))}
        ${kv("Netto / Jahr", eur(netto * 12))}
      </div></div>`));
  }

  /* ---------- OVERVIEW ---------- */
  function renderOverview(host) {
    const t = FE.totals(D);
    // Portfolio-Kredite + Einheiten aggregieren
    let debtMonth = 0, debtRest = 0, debtOrig = 0, paidSoFar = 0;
    let unitsTotal = 0, unitsLet = 0;
    (D.streams || []).forEach(s => {
      FE.creditsOf(s).forEach(kr => {
        debtMonth += Number(kr.abtragMonat) || 0;
        debtOrig += Number(kr.summe) || 0;
        const pl = FE.creditPlan(kr);
        debtRest += pl ? pl.restAktuell : (Number(kr.summe) || 0);
        paidSoFar += pl ? pl.getilgtBisher : 0;
      });
      (s.einheiten || []).forEach(u => { unitsTotal++; if (u.status === "vermietet") unitsLet++; });
    });
    const nettoMonth = t.ist - debtMonth;
    const occ = unitsTotal ? Math.round(unitsLet / unitsTotal * 100) : 0;
    const upside = t.potenzial - t.ist;          // ungenutztes Einnahmenpotenzial
    const nettoPot = t.potenzial - debtMonth;    // Netto bei Vollvermietung

    $("#eyebrow").textContent = "Portfolio";
    $("#pageTitle").textContent = "Übersicht";
    $("#pageSub").textContent = "Alle Einnahmequellen auf einen Blick · Stand " + ((D.meta && D.meta.version) || "");

    const ctx = { t, debtMonth, debtRest, paidSoFar, debtOrig, unitsTotal, unitsLet, nettoMonth, nettoPot, upside };

    // Persönliche Begrüßung + Suche
    host.appendChild(begruessungsKarte());
    host.appendChild(searchCard());

    // KPI-Reihe 1 — Einnahmen & Cashflow
    host.appendChild(wireActs(el(`<div class="grid g-kpi">
      ${kpiCard("euro", eur(t.ist), "Einnahmen / Monat", "aktuell vermietet", true, "einnahmen")}
      ${kpiCard("layers", eur(t.potenzial), "Potenzial / Monat", "+" + eur(upside) + " ungenutzt", false, "potenzial")}
      ${kpiCard("wallet", eur(nettoMonth), "Netto-Cashflow", "nach Tilgung", nettoMonth >= 0, "netto")}
      ${kpiCard("home", occ + " %", "Auslastung", unitsLet + " / " + unitsTotal + " Einheiten", occ >= 60, "auslastung")}
    </div>`), {
      einnahmen: () => openPortfolioSheet("einnahmen", ctx),
      potenzial: () => openPortfolioSheet("potenzial", ctx),
      netto: () => openPortfolioSheet("netto", ctx),
      auslastung: () => openPortfolioSheet("auslastung", ctx)
    }));

    // KPI-Reihe 2 — Jahr, Tilgung, Schuldenstand
    host.appendChild(wireActs(el(`<div class="grid g-kpi">
      ${kpiCard("trend", eur(t.jahrIst), "Einnahmen / Jahr", "hochgerechnet", false, "jahr")}
      ${kpiCard("chart", eur(nettoPot), "Netto-Potenzial / Mon.", "bei Vollvermietung", nettoPot >= 0, "potenzial")}
      ${kpiCard("bank", eur(debtMonth), "Tilgung / Monat", eur(debtMonth * 12) + " / Jahr", false, "tilgung")}
      ${kpiCard("debt", eur(debtRest), "Restschuld heute", "exakt " + eur2(debtRest), false, "schuld")}
    </div>`), {
      jahr: () => openPortfolioSheet("einnahmen", ctx),
      potenzial: () => openPortfolioSheet("potenzial", ctx),
      tilgung: () => openPortfolioSheet("schuld", ctx),
      schuld: () => openPortfolioSheet("schuld", ctx)
    }));

    // Composition donut + legend (nur echte Einnahmen)
    const segs = (D.streams || []).map((s, i) => {
      const m = FE.streamMonthly(s);
      return { id: s.id, name: s.name, value: m.gesamt, color: PALETTE[i % PALETTE.length], kind: s.kind };
    }).filter(x => x.value > 0);
    const legend = segs.map(s => `<div class="leg clickable" data-sid="${esc(s.id)}">
      <span class="sw" style="background:${s.color}"></span>
      <span class="lt">${esc(s.name)}</span>
      <span class="lv">${eur(s.value)}</span></div>`).join("");
    const compCard = el(`<div class="card pad">
      <div class="card-t" style="margin-bottom:4px">Zusammensetzung</div>
      <div class="card-s" style="margin-bottom:18px">Beitrag je Einnahmequelle / Monat</div>
      <div class="donut-row">${donut(segs)}<div class="legend">${legend}</div></div></div>`);
    compCard.querySelectorAll(".leg[data-sid]").forEach(l =>
      l.onclick = () => route(l.dataset.sid));
    host.appendChild(compCard);

    // Kalender + Wetter nebeneinander
    const row = el(`<div class="grid g-2"></div>`);
    row.appendChild(calendarCard());
    row.appendChild(weatherCard());
    host.appendChild(row);

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

  /* ---------- KALENDER (Monatsansicht) ---------- */
  // Alle Termine eines Monats als Map { "YYYY-MM-DD": [events] }
  function eventsForMonth(year, month) {
    const map = {};
    const push = (d, t) => {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      (map[key] = map[key] || []).push(t);
    };
    const first = new Date(year, month, 1), last = new Date(year, month + 1, 0);
    (D.termine || []).forEach(t => {
      const base = new Date(t.datum);
      if (t.wiederholung === "monatlich") {
        const d = new Date(year, month, Math.min(base.getDate(), last.getDate()));
        push(d, t);
      } else if (t.wiederholung === "jaehrlich") {
        if (base.getMonth() === month && new Date(year, month, 1) >= new Date(base.getFullYear(), base.getMonth(), 1))
          push(new Date(year, month, base.getDate()), t);
      } else if (t.wiederholung === "halbjaehrlich") {
        // alle 6 Monate ab Basismonat
        const diff = (year - base.getFullYear()) * 12 + (month - base.getMonth());
        if (diff >= 0 && diff % 6 === 0) push(new Date(year, month, base.getDate()), t);
      } else {
        if (base.getFullYear() === year && base.getMonth() === month) push(base, t);
      }
    });
    return map;
  }

  const EVT = {
    miete:   { col: "#4ade9e", bg: "rgba(74,222,158,.14)",  br: "rgba(74,222,158,.4)",  label: "Miete" },
    einzug:  { col: "#7ef0bd", bg: "rgba(126,240,189,.14)", br: "rgba(126,240,189,.4)", label: "Einzug" },
    zahlung: { col: "#d8b978", bg: "rgba(216,185,120,.16)", br: "rgba(216,185,120,.45)",label: "Zahlung" },
    termin:  { col: "#59c9a0", bg: "rgba(89,201,160,.14)",  br: "rgba(89,201,160,.4)",  label: "Termin" }
  };

  let calYear = null, calMonth = null, calSelected = null;
  function calendarCard() {
    const now = new Date();
    if (calYear == null) { calYear = now.getFullYear(); calMonth = now.getMonth(); }
    const card = el(`<div class="card cal-card">
      <div class="card-h">
        <div><div class="card-t">Kalender</div><div class="card-s" id="calSub"></div></div>
        <div class="cal-nav">
          <button class="cal-btn" id="calPrev" aria-label="Vorheriger Monat">‹</button>
          <button class="cal-btn" id="calToday">heute</button>
          <button class="cal-btn" id="calNext" aria-label="Nächster Monat">›</button>
          <button class="cal-btn" id="calInfo" aria-label="Übersicht" title="Jahresübersicht">⋯</button>
        </div>
      </div>
      <div class="card-b"><div id="calGridHost"></div><div id="calDetail"></div></div></div>`);

    const draw = () => {
      const host = card.querySelector("#calGridHost");
      const detail = card.querySelector("#calDetail");
      const map = eventsForMonth(calYear, calMonth);
      const first = new Date(calYear, calMonth, 1);
      const daysIn = new Date(calYear, calMonth + 1, 0).getDate();
      const startDow = (first.getDay() + 6) % 7; // Montag = 0
      const todayKey = new Date().toISOString().slice(0, 10);

      card.querySelector("#calSub").textContent =
        first.toLocaleDateString("de-DE", { month: "long", year: "numeric" });

      const dows = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
        .map(d => `<div class="cal-dow">${d}</div>`).join("");
      let cells = "";
      for (let i = 0; i < startDow; i++) cells += `<div class="cal-cell empty"></div>`;
      for (let day = 1; day <= daysIn; day++) {
        const key = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const evts = map[key] || [];
        const isToday = key === todayKey;
        const isSel = key === calSelected;
        // Farbe nach höchster Priorität: einzug > zahlung > miete
        let cfg = null;
        if (evts.length) {
          const order = ["einzug", "zahlung", "miete", "termin"];
          const typ = order.find(o => evts.some(e => e.typ === o)) || "termin";
          cfg = EVT[typ];
        }
        const style = cfg ? `background:${cfg.bg};border-color:${cfg.br}` : "";
        const dots = evts.slice(0, 3).map(e => {
          const c = EVT[e.typ] || EVT.termin;
          return `<span class="cal-d" style="background:${c.col}"></span>`;
        }).join("");
        cells += `<div class="cal-cell${evts.length ? " has" : ""}${isToday ? " today" : ""}${isSel ? " sel" : ""}"
          data-key="${key}" style="${style}">
          <span class="cal-n">${day}</span>
          <span class="cal-dots">${dots}</span></div>`;
      }
      host.innerHTML = `<div class="cal-grid">${dows}${cells}</div>`;

      // Detailbereich
      const renderDetail = (key) => {
        const evts = (map[key] || []);
        if (!key) { detail.innerHTML = `<div class="cal-hint">Tag antippen, um Ereignisse zu sehen.</div>`; return; }
        const d = new Date(key);
        const head = d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });
        if (!evts.length) {
          detail.innerHTML = `<div class="cal-detail"><div class="cal-detail-h">${esc(head)}</div>
            <div class="cal-hint">Keine Ereignisse an diesem Tag.</div></div>`;
          return;
        }
        const t = FE.totals(D);
        const list = evts.map(e => {
          const c = EVT[e.typ] || EVT.termin;
          // Betrag je Ereignistyp ableiten
          let betrag = "";
          if (e.typ === "miete") betrag = eur(t.miete + t.airbnb);
          else if (e.typ === "zahlung" && e.info) {
            const mm = String(e.info).match(/([\d.]+(?:,\d+)?)\s*€/);
            if (mm) betrag = mm[0];
          }
          return `<div class="cal-ev" style="border-left-color:${c.col}">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline">
              <div class="cal-ev-t">${esc(e.titel)}</div>
              ${betrag ? `<div class="tl-v" style="color:${c.col}">${esc(betrag)}</div>` : ""}
            </div>
            <div class="cal-ev-i">${esc(e.info || c.label)}</div></div>`;
        }).join("");
        // Tagessumme, falls Mieteingang dabei
        const hatMiete = evts.some(e => e.typ === "miete");
        const foot = hatMiete
          ? `<div class="note" style="margin-top:10px">Zufluss an diesem Tag: ${eur(t.miete + t.airbnb)} aus ${mietStreams().length + 1} Quellen.</div>`
          : "";
        detail.innerHTML = `<div class="cal-detail"><div class="cal-detail-h">${esc(head)}</div>${list}${foot}</div>`;
      };
      renderDetail(calSelected);

      host.querySelectorAll(".cal-cell[data-key]").forEach(c => {
        c.onclick = () => {
          calSelected = (calSelected === c.dataset.key) ? null : c.dataset.key;
          draw();
        };
      });
    };

    card.querySelector("#calPrev").onclick = () => {
      calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } calSelected = null; draw();
    };
    card.querySelector("#calNext").onclick = () => {
      calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } calSelected = null; draw();
    };
    card.querySelector("#calInfo").onclick = () => openCalendarSheet();
    card.querySelector("#calToday").onclick = () => {
      const n = new Date(); calYear = n.getFullYear(); calMonth = n.getMonth();
      calSelected = n.toISOString().slice(0, 10); draw();
    };
    draw();
    return card;
  }

  /* ---------- WETTER ---------- */
  const WCODE = {
    0: ["Klar", "☀️"], 1: ["Überwiegend klar", "🌤"], 2: ["Teils bewölkt", "⛅️"], 3: ["Bedeckt", "☁️"],
    45: ["Nebel", "🌫"], 48: ["Reifnebel", "🌫"], 51: ["Leichter Niesel", "🌦"], 53: ["Niesel", "🌦"],
    55: ["Starker Niesel", "🌧"], 61: ["Leichter Regen", "🌦"], 63: ["Regen", "🌧"], 65: ["Starker Regen", "🌧"],
    71: ["Leichter Schnee", "🌨"], 73: ["Schnee", "🌨"], 75: ["Starker Schnee", "❄️"],
    80: ["Schauer", "🌦"], 81: ["Schauer", "🌧"], 82: ["Starke Schauer", "⛈"],
    95: ["Gewitter", "⛈"], 96: ["Gewitter mit Hagel", "⛈"], 99: ["Schweres Gewitter", "⛈"]
  };
  function weatherCard() {
    const w = D.wetter || { ort: "—", lat: 53.0333, lon: 8.5333 };
    const card = el(`<div class="card">
      <div class="card-h"><div><div class="card-t">Wetter</div>
        <div class="card-s">${esc(w.ort)} · Tag antippen für Stundenverlauf</div></div>
        <div class="head-pill" style="padding:7px 13px" id="wNow">lädt…</div></div>
      <div class="card-b" id="wBody"><div class="note">Wetterdaten werden geladen…</div></div></div>`);
    // Open-Meteo (kein API-Key) inkl. Stundenwerte
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${w.lat}&longitude=${w.lon}`
      + `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m`
      + `&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m`
      + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,sunrise,sunset`
      + `&timezone=Europe%2FBerlin&forecast_days=5`;
    fetch(url).then(r => r.json()).then(j => {
      const body = card.querySelector("#wBody"), now = card.querySelector("#wNow");
      if (!j || !j.current) throw new Error("keine Daten");
      const c = j.current, cc = WCODE[c.weather_code] || ["—", "•"];
      now.innerHTML = `${cc[1]} <b style="margin-left:5px">${Math.round(c.temperature_2m)}°</b>`;
      const days = (j.daily && j.daily.time || []).map((t, i) => {
        const dc = WCODE[j.daily.weather_code[i]] || ["—", "•"];
        const dd = new Date(t);
        return `<div class="w-day clickable" data-i="${i}">
          <span class="w-dow">${i === 0 ? "heute" : dd.toLocaleDateString("de-DE", { weekday: "short" })}</span>
          <span class="w-ic">${dc[1]}</span>
          <span class="w-t"><b>${Math.round(j.daily.temperature_2m_max[i])}°</b><i>${Math.round(j.daily.temperature_2m_min[i])}°</i></span>
        </div>`;
      }).join("");
      body.innerHTML = `<div class="w-now">
          <div class="w-now-ic">${cc[1]}</div>
          <div><div class="w-now-t">${Math.round(c.temperature_2m)}°</div>
            <div class="w-now-d">${esc(cc[0])} · ${Math.round(c.wind_speed_10m)} km/h · ${Math.round(c.relative_humidity_2m)} % rF</div></div>
        </div><div class="w-days">${days}</div>`;
      body.querySelectorAll(".w-day").forEach(d =>
        d.onclick = () => openWeatherSheet(j, Number(d.dataset.i)));
    }).catch(() => {
      card.querySelector("#wNow").textContent = "offline";
      card.querySelector("#wBody").innerHTML = `<div class="note">Wetterdaten konnten nicht geladen werden (keine Internetverbindung).</div>`;
    });
    return card;
  }

  function openWeatherSheet(j, idx) {
    const day = j.daily.time[idx];
    const dc = WCODE[j.daily.weather_code[idx]] || ["—", "•"];
    const d = new Date(day);
    const head = d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });
    // Stunden dieses Tages
    const hrs = [];
    (j.hourly && j.hourly.time || []).forEach((t, i) => {
      if (t.slice(0, 10) !== day) return;
      const h = Number(t.slice(11, 13));
      if (h % 3 !== 0) return; // 3-Stunden-Schritte
      const hc = WCODE[j.hourly.weather_code[i]] || ["—", "•"];
      hrs.push(`<div class="hour"><div class="hh">${String(h).padStart(2, "0")}:00</div>
        <div class="hi">${hc[1]}</div>
        <div class="ht">${Math.round(j.hourly.temperature_2m[i])}°</div>
        <div class="hr">${j.hourly.precipitation_probability ? Math.round(j.hourly.precipitation_probability[i]) + " %" : ""}</div></div>`);
    });
    const sr = j.daily.sunrise ? j.daily.sunrise[idx].slice(11, 16) : "—";
    const ss = j.daily.sunset ? j.daily.sunset[idx].slice(11, 16) : "—";
    const body = `
      <div class="stat-strip" style="margin-bottom:18px">
        <div class="s"><span>Höchst</span><b>${Math.round(j.daily.temperature_2m_max[idx])}°</b></div>
        <div class="s"><span>Tiefst</span><b>${Math.round(j.daily.temperature_2m_min[idx])}°</b></div>
        <div class="s"><span>Niederschlag</span><b>${(j.daily.precipitation_sum ? j.daily.precipitation_sum[idx] : 0).toLocaleString("de-DE")} mm</b></div>
        <div class="s"><span>Wind max</span><b>${Math.round(j.daily.wind_speed_10m_max ? j.daily.wind_speed_10m_max[idx] : 0)} km/h</b></div>
      </div>
      <div class="card-t" style="font-size:14px;margin-bottom:10px">Tagesverlauf</div>
      <div class="hours">${hrs.join("")}</div>
      <div style="margin-top:18px">
        ${kv("Sonnenaufgang", sr + " Uhr")}
        ${kv("Sonnenuntergang", ss + " Uhr")}
      </div>`;
    openSheet(dc[1] + "  " + dc[0], head, body);
  }

  /* ---------- STREAM DETAIL ---------- */
  function renderStream(host, id) {
    const s = (D.streams || []).find(x => x.id === id);
    if (!s) { host.appendChild(el(`<div class="card pad note">Quelle nicht gefunden.</div>`)); return; }
    const m = FE.streamMonthly(s);
    $("#eyebrow").textContent = s.kind === "airbnb" ? "Kurzzeitvermietung" : s.kind === "pacht" ? "Landpacht" : "Vermietung";
    $("#pageTitle").textContent = s.name;
    $("#pageSub").textContent = s.ort || "";

    if (s.kind === "airbnb") return renderAirbnb(host, s, m);
    if (s.kind === "pacht") return renderPacht(host, s, m);
    return renderMiete(host, s, m);
  }

  function dateDE(iso) { const d = new Date(iso); return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }); }

  function renderAirbnb(host, s, m) {
    const cfg = s.airbnb || {};
    let occ = Number(cfg.auslastung) || 0;

    const kpiHost = el(`<div id="abKpi"></div>`);
    const calcHost = el(`<div id="abCalc"></div>`);

    // Slider
    const sld = el(`<div class="card pad">
      <div class="card-t" style="margin-bottom:4px">Auslastung simulieren</div>
      <div class="card-s" style="margin-bottom:16px">Regler verschieben – alle Zahlen rechnen live mit</div>
      <div class="sld-wrap">
        <div class="sld-top"><span class="sld-lab">Belegung im Monat</span>
          <span class="sld-val" id="abVal">${occ} %</span></div>
        <input type="range" class="sld" id="abSld" min="0" max="100" step="1" value="${occ}" style="--p:${occ}%">
        <div class="sld-marks"><span>0 %</span><span>25 %</span><span>50 %</span><span>75 %</span><span>100 %</span></div>
      </div>
      <div class="stat-strip" id="abQuick"></div>
    </div>`);

    const paint = () => {
      const a = FE.airbnbIncome(cfg, occ);
      kpiHost.innerHTML = `<div class="grid g-kpi">
        ${kpiCard("bed", eur(a.netto), "Netto / Monat", "nach Gebühr & Kosten", true)}
        ${kpiCard("euro", eur(cfg.nachtpreis), "pro Nacht", "Listenpreis")}
        ${kpiCard("trend", a.naechte.toLocaleString("de-DE"), "Nächte / Monat", a.buchungen.toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " Buchungen")}
        ${kpiCard("chart", eur(a.netto * 12), "pro Jahr", "hochgerechnet")}
      </div>`;
      const q = sld.querySelector("#abQuick");
      q.innerHTML = `
        <div class="s"><span>Umsatz</span><b>${eur(a.brutto)}</b></div>
        <div class="s"><span>Gebühr</span><b>−${eur(a.fee)}</b></div>
        <div class="s"><span>Kosten</span><b>−${eur(a.kosten)}</b></div>
        <div class="s"><span>Netto</span><b style="color:var(--mint-2)">${eur(a.netto)}</b></div>`;
      sld.querySelector("#abVal").textContent = occ + " %";
      sld.querySelector("#abSld").style.setProperty("--p", occ + "%");

      // Rechenweg
      calcHost.innerHTML = `<div class="card pad clickable" id="abDetail">
        <span class="tapme">Details ›</span>
        <div class="card-t" style="margin-bottom:4px">Rechenweg</div>
        <div class="card-s" style="margin-bottom:16px">bei ${occ} % Auslastung · Ø ${cfg.aufenthaltsdauer} Nächte pro Buchung</div>
        ${kv("Übernachtungen (" + a.naechte.toLocaleString("de-DE") + " × " + eur(cfg.nachtpreis) + ")", eur(a.uebernachtung))}
        ${kv("Reinigungsgebühr (" + a.buchungen.toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " × " + eur(cfg.reinigungsgebuehr) + ")", eur(a.reinigungUmsatz))}
        ${kv("Umsatz gesamt", eur(a.brutto))}
        ${kv("− Airbnb-Gebühr (" + a.feeProz + " %)", "−" + eur(a.fee))}
        ${kv("− Reinigungskosten", "−" + eur(a.reinigungKosten))}
        ${kv("− Wäsche & Verbrauch", "−" + eur(a.verbrauch))}
        ${kv("Netto", eur(a.netto))}
        <div class="note" style="margin-top:12px">Effektiv ${eur(a.proNacht)} je vermieteter Nacht.</div>
      </div>`;
      calcHost.querySelector("#abDetail").onclick = () => openAirbnbSheet(cfg, occ);
    };

    host.appendChild(kpiHost);
    host.appendChild(sld);
    host.appendChild(calcHost);
    const input = sld.querySelector("#abSld");
    input.addEventListener("input", e => { occ = Number(e.target.value); paint(); });
    paint();

    // Szenarien-Chart (echtes Modell inkl. Kosten)
    const occs = [30, 40, 50, 60, 70, 80, 90, 100];
    const vals = occs.map(o => FE.airbnbIncome(cfg, o).netto);
    host.appendChild(el(`<div class="card"><div class="card-h"><div><div class="card-t">Auslastungs-Szenarien</div>
      <div class="card-s">Netto nach Gebühren und Betriebskosten</div></div>
      <div class="head-pill" style="padding:7px 13px">Basis ${cfg.auslastung} %</div></div>
      <div class="card-b">${areaChart(vals, occs.map(o => o + "%"))}</div></div>`));

    // Break-even
    let be = null;
    for (let o = 0; o <= 100; o++) { if (FE.airbnbIncome(cfg, o).netto > 0) { be = o; break; } }
    host.appendChild(el(`<div class="card pad">
      <div class="card-t" style="margin-bottom:4px">Kennzahlen</div>
      <div class="card-s" style="margin-bottom:14px">Modellannahmen und Schwellen</div>
      ${kv("Ø Aufenthaltsdauer", cfg.aufenthaltsdauer + " Nächte")}
      ${kv("Reinigungsgebühr (Gast)", eur(cfg.reinigungsgebuehr))}
      ${kv("Reinigungskosten (real)", eur(cfg.reinigungskosten))}
      ${kv("Verbrauch je Buchung", eur(cfg.verbrauchProBuchung))}
      ${kv("Gebührenmodell", cfg.gebuehrenmodell === "vereinfacht" ? "Vereinfachte Preise (~15 %)" : "Host-Fee (" + cfg.servicegebuehrProzent + " %)")}
      ${be != null ? kv("Kostendeckung ab", be + " % Auslastung") : ""}
      <div class="note" style="margin-top:12px">Die Airbnb-Gebühr wird auf den Gesamtumsatz inkl. Reinigungsgebühr berechnet. Mehr Buchungen bei gleicher Nächtezahl erhöhen daher Umsatz <em>und</em> Kosten.</div>
    </div>`));
  }

  function openAirbnbSheet(cfg, occ) {
    const a = FE.airbnbIncome(cfg, occ);
    const rows = [
      { label: "Übernachtung", value: a.uebernachtung, color: PALETTE[0] },
      { label: "Reinigung", value: a.reinigungUmsatz, color: PALETTE[2] }
    ];
    const abzug = [
      { label: "Airbnb-Gebühr", value: a.fee, color: "linear-gradient(90deg,#8a6d2f,var(--gold))" },
      { label: "Reinigung", value: a.reinigungKosten, color: "linear-gradient(90deg,#8a6d2f,var(--gold))" },
      { label: "Verbrauch", value: a.verbrauch, color: "linear-gradient(90deg,#8a6d2f,var(--gold))" }
    ];
    // Vergleich Aufenthaltsdauer
    const dauern = [2, 3, 5, 7, 14];
    const trs = dauern.map(d => {
      const alt = FE.airbnbIncome({ ...cfg, aufenthaltsdauer: d }, occ);
      const cur = d === Number(cfg.aufenthaltsdauer);
      return `<tr><td>${cur ? "<b>" + d + " N</b>" : d + " N"}</td>
        <td>${alt.buchungen.toLocaleString("de-DE", { maximumFractionDigits: 1 })}</td>
        <td>${eur(alt.brutto)}</td><td>${eur(alt.kosten + alt.fee)}</td>
        <td class="${cur ? "hl" : ""}">${eur(alt.netto)}</td></tr>`;
    }).join("");
    const body = `
      <div class="stat-strip" style="margin-bottom:18px">
        <div class="s"><span>Nächte</span><b>${a.naechte.toLocaleString("de-DE")}</b></div>
        <div class="s"><span>Buchungen</span><b>${a.buchungen.toLocaleString("de-DE", { maximumFractionDigits: 1 })}</b></div>
        <div class="s"><span>Netto/Nacht</span><b>${eur(a.proNacht)}</b></div>
        <div class="s"><span>Marge</span><b>${a.brutto ? Math.round(a.netto / a.brutto * 100) : 0} %</b></div>
      </div>
      <div class="card-t" style="font-size:14px;margin-bottom:10px">Umsatz</div>
      ${miniBars(rows)}
      <div class="card-t" style="font-size:14px;margin:20px 0 10px">Abzüge</div>
      ${miniBars(abzug)}
      <div class="card-t" style="font-size:14px;margin:20px 0 10px">Einfluss der Aufenthaltsdauer</div>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Ø Dauer</th><th>Buch.</th><th>Umsatz</th><th>Abzüge</th><th>Netto</th></tr></thead>
        <tbody>${trs}</tbody></table></div>
      <div class="note" style="margin-top:12px">Kürzere Aufenthalte bringen mehr Reinigungsgebühren, verursachen aber auch mehr Reinigungs- und Verbrauchskosten.</div>`;
    openSheet("Airbnb-Kalkulation", occ + " % Auslastung · " + eur(cfg.nachtpreis) + "/Nacht", body);
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
      return `<div class="drow clickable" data-vi="${i}"><div class="drow-l"><div class="drow-badge">${svg("sprout")}</div>
        <div><div class="drow-name">${esc(v.paechter)}</div>
        <div class="drow-sub">${v.flaeche.toLocaleString("de-DE")} ha · ${esc(v.art)} · ${laufzeit}</div></div></div>
        <div class="drow-val"><b>${eur(v.jahr / 12)}</b><span>${eur(v.jahr)}/Jahr${abgelaufen ? " · verlängert" : ""}</span></div></div>`;
    }).join("");
    const pTbl = el(`<div class="card"><div class="card-h"><div><div class="card-t">Pachtverträge</div>
      <div class="card-s">Zeile antippen für Vertragsdetails</div></div></div><div class="card-b">${rows}</div></div>`);
    pTbl.querySelectorAll(".drow[data-vi]").forEach(r =>
      r.onclick = () => openPachtSheet(s, sorted[Number(r.dataset.vi)]));
    host.appendChild(pTbl);

    // Zusatz-Insights: Preisvergleich und Kündigungsfristen
    const proHaListe = sorted.map((v, i) => ({
      label: v.paechter.split(" ").slice(-1)[0], value: v.flaeche ? v.jahr / v.flaeche : 0,
      color: PALETTE[i % PALETTE.length],
      display: eur(v.flaeche ? v.jahr / v.flaeche : 0) + "/ha"
    }));
    const heute = new Date();
    const fristen = sorted.filter(v => v.ende && v.ende !== "jährlich").map(v => {
      const e = new Date(v.ende);
      const kuend = new Date(e); kuend.setMonth(kuend.getMonth() - 6);
      return { v, ende: e, kuend, offen: kuend > heute };
    }).sort((a, b) => a.kuend - b.kuend);
    host.appendChild(el(`<div class="grid g-2">
      <div class="card pad"><div class="card-t" style="margin-bottom:4px">Pachtpreis je Hektar</div>
        <div class="card-s" style="margin-bottom:16px">Ø ${eur(proHa)} · Spanne ${eur(Math.min(...proHaListe.map(x => x.value)))} – ${eur(Math.max(...proHaListe.map(x => x.value)))}</div>
        ${miniBars(proHaListe)}
        <div class="note" style="margin-top:12px">Ackerland erzielt höhere Pachten als Grünland – die Unterschiede spiegeln die Flächenart wider.</div></div>
      <div class="card pad"><div class="card-t" style="margin-bottom:4px">Laufzeiten & Fristen</div>
        <div class="card-s" style="margin-bottom:16px">Kündigung jeweils 6 Monate vor Ablauf</div>
        <div class="tl">
          ${fristen.length ? fristen.map(f => `<div class="tl-i">
            <span class="tl-dot" style="background:${f.offen ? "var(--gold)" : "var(--mint)"}"></span>
            <div class="tl-b"><div class="tl-t">${esc(f.v.paechter)}</div>
              <div class="tl-s">Ende ${dateDE(f.v.ende)} · Kündigung bis ${dateDE(f.kuend.toISOString().slice(0, 10))}</div></div>
            <span class="tl-v">${eur(f.v.jahr)}</span></div>`).join("")
            : `<div class="note">Alle Verträge laufen jährlich weiter.</div>`}
        </div>
        <div class="note" style="margin-top:12px">Ohne fristgerechte Kündigung verlängern sich die Verträge automatisch um ein Jahr.</div></div>
    </div>`));
  }

  function openPachtSheet(s, v) {
    if (!v) return;
    const m = FE.streamMonthly(s);
    const anteil = m.jahr ? Math.round(v.jahr / m.jahr * 100) : 0;
    const proHa = v.flaeche ? v.jahr / v.flaeche : 0;
    const schnitt = m.flaeche ? m.jahr / m.flaeche : 0;
    const laufzeit = v.ende === "jährlich" ? "jährlich verlängert"
      : dateDE(v.start) + " – " + (v.ende.match(/\d{4}-\d{2}-\d{2}/) ? dateDE(v.ende) : v.ende);
    let kuendTxt = "—";
    if (v.ende && v.ende !== "jährlich") {
      const k = new Date(v.ende); k.setMonth(k.getMonth() - 6);
      kuendTxt = dateDE(k.toISOString().slice(0, 10));
    }
    const body = `
      <div class="stat-strip" style="margin-bottom:18px">
        <div class="s"><span>je Jahr</span><b style="color:var(--mint-2)">${eur(v.jahr)}</b></div>
        <div class="s"><span>je Monat</span><b>${eur(v.jahr / 12)}</b></div>
        <div class="s"><span>Fläche</span><b>${v.flaeche.toLocaleString("de-DE")} ha</b></div>
        <div class="s"><span>je Hektar</span><b>${eur(proHa)}</b></div>
      </div>
      <div class="card-t" style="font-size:14px;margin-bottom:6px">Vertrag</div>
      ${kv("Pächter", esc(v.paechter))}
      ${kv("Flächenart", esc(v.art))}
      ${kv("Laufzeit", laufzeit)}
      ${kv("Kündigung bis", kuendTxt)}
      ${kv("Zahlungstermin", "jährlich zum 01.12.")}
      ${kv("Anteil am Pachtertrag", anteil + " %")}
      <div class="card-t" style="font-size:14px;margin:20px 0 10px">Im Vergleich</div>
      ${miniBars([
        { label: "dieser Vertrag", value: proHa, color: PALETTE[0], display: eur(proHa) + "/ha" },
        { label: "Ø alle Flächen", value: schnitt, color: PALETTE[4], display: eur(schnitt) + "/ha" }
      ])}
      <div class="note" style="margin-top:12px">${proHa >= schnitt ? "Über" : "Unter"} dem Durchschnitt von ${eur(schnitt)} je Hektar (${proHa >= schnitt ? "+" : ""}${eur(proHa - schnitt)}).</div>`;
    openSheet(v.paechter, v.flaeche.toLocaleString("de-DE") + " ha · " + v.art, body);
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
      <div class="card-s">${eur(kr.summe)} · ${kr.zinsPa ? kr.zinsPa.toLocaleString("de-DE") + " % Zins · " : ""}${eur2(kr.abtragMonat)}/Monat · Start ${startTxt}</div></div>
      <div class="head-pill" style="padding:7px 13px">${plan && plan.getilgt ? "Laufzeit " + plan.jahre.toLocaleString("de-DE") + " J." : "läuft"}</div></div>
      <div class="card-b">
        <div class="stat-strip" style="margin-bottom:16px">
          <div class="s"><span>Restschuld heute</span><b>${eur2(restNow)}</b></div>
          <div class="s"><span>getilgt bisher</span><b>${startFuture ? "—" : eur2(paid)}</b></div>
          <div class="s"><span>Rate/Monat</span><b>${eur2(kr.abtragMonat)}</b></div>
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
      // Rendite-Kennzahlen (Syke-Stil) — auch für Baumstraße
      host.appendChild(wireActs(el(`<div class="grid g-kpi">
        ${kpiCard("wallet", eur(m.netto), "Netto-Cashflow / Monat", "nach Kreditrate", m.netto >= 0, "cf")}
        ${kpiCard("trend", k.bruttoRendite.toLocaleString("de-DE") + " %", "Bruttomietrendite", "Kaltmiete / Invest")}
        ${kpiCard("chart", k.cashflowRoi.toLocaleString("de-DE") + " %", "Cashflow-ROI", "netto / Invest p.a.")}
        ${kpiCard("coins", eur(k.invest), "Investition", "eingesetztes Kapital")}
      </div>`), { cf: () => openCashflowSheet(s) }));
      // Zweite Reihe mit Einnahmen/Tilgung/Restschuld (nützlich bei mehreren Krediten)
      host.appendChild(wireActs(el(`<div class="grid g-kpi">
        ${kpiCard("euro", eur(m.gesamt), "Einnahmen / Monat", m.vermietet + "/" + m.einheiten + " vermietet", true)}
        ${kpiCard("layers", eur(m.gesamtPotenzial), "Potenzial / Monat", "bei Vollvermietung")}
        ${kpiCard("bank", eur(k.kreditAbtrag), "Tilgung / Monat", kredite.length + (kredite.length === 1 ? " Kredit" : " Kredite"))}
        ${kpiCard("debt", eur(k.restschuldGesamt), "Restschuld heute", "exakt " + eur2(k.restschuldGesamt))}
      </div>`), { cf: () => openCashflowSheet(s) }));
    } else if (k && kredite.length) {
      host.appendChild(wireActs(el(`<div class="grid g-kpi">
        ${kpiCard("euro", eur(m.gesamt), "Einnahmen / Monat", m.vermietet + "/" + m.einheiten + " vermietet", true)}
        ${kpiCard("layers", eur(m.gesamtPotenzial), "Potenzial / Monat", "bei Vollvermietung")}
        ${kpiCard("bank", eur(k.kreditAbtrag), "Tilgung / Monat", kredite.length + " Kredite")}
        ${kpiCard("wallet", eur(m.netto), "Netto-Cashflow", "nach Tilgung", m.netto >= 0, "cf")}
      </div>`), { cf: () => openCashflowSheet(s) }));
      host.appendChild(wireActs(el(`<div class="grid g-kpi">
        ${kpiCard("home", m.einheiten, "Einheiten", (s.einheiten || []).reduce((a, u) => a + (Number(u.flaeche) || 0), 0) + " m² gesamt")}
        ${kpiCard("debt", eur(k.restschuldGesamt), "Restschuld gesamt", "exakt " + eur2(k.restschuldGesamt))}
        ${kpiCard("layers", eur(m.nkPuffer), "NK-Puffer / Monat", "Rücklage")}
        ${kpiCard("trend", eur(m.gesamt * 12), "Einnahmen / Jahr", "aktuell vermietet")}
      </div>`), { cf: () => openCashflowSheet(s) }));
    } else {
      host.appendChild(wireActs(el(`<div class="grid g-kpi">
        ${kpiCard("euro", eur(m.gesamt), "Einnahmen / Monat", m.vermietet + "/" + m.einheiten + " vermietet", true)}
        ${kpiCard("layers", eur(m.gesamtPotenzial), "Potenzial / Monat", "bei Vollvermietung")}
        ${kpiCard("home", m.einheiten, "Einheiten", (s.einheiten || []).reduce((a, u) => a + (Number(u.flaeche) || 0), 0) + " m² gesamt")}
        ${kpiCard("trend", eur(m.gesamt * 12), "pro Jahr", "aktuell vermietet")}
      </div>`), { cf: () => openCashflowSheet(s) }));
    }

    // Kredit-Tilgung Karten — eine je Kredit
    kredite.forEach(kr => {
      const c = creditCard(kr);
      c.classList.add("clickable");
      c.onclick = () => openCreditSheet(kr);
      host.appendChild(c);
    });

    // NK-Puffer Hinweis (klickbar)
    if (m.nkPuffer > 0) {
      const nkCard = el(`<div class="card pad clickable" style="border-color:rgba(216,185,120,.28)">
        <span class="tapme">Details ›</span>
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          <div class="tile-ic" style="color:var(--gold);border-color:rgba(216,185,120,.3)">${svg("layers")}</div>
          <div style="flex:1;min-width:180px"><div class="card-t">Nebenkosten als Puffer</div>
            <div class="note">${eur(m.nkPuffer)}/Monat (${eur(m.nkPuffer * 12)}/Jahr) werden vollständig zurückgelegt – antippen für Aufschlüsselung.</div></div>
          <div style="text-align:right"><div class="tile-num" style="color:var(--gold)">${eur(m.nkPuffer)}</div><div class="note">Rücklage/Mon.</div></div>
        </div></div>`);
      nkCard.onclick = () => openNkSheet(s, m);
      host.appendChild(nkCard);
    }

    // Per-unit horizontal bars
    const maxUnit = Math.max(...(s.einheiten || []).map(u => FE.unitIncome(u).gesamt), 1);
    const bars = (s.einheiten || []).map(u => {
      const inc = FE.unitIncome(u);
      const on = u.status === "vermietet";
      const w = Math.round(inc.gesamt / maxUnit * 100);
      const mieterTxt = u.mieter ? ` · ${esc(u.mieter)}` : "";
      return `<div class="unit-bar clickable" data-i="${(s.einheiten||[]).indexOf(u)}" style="padding:2px 0">
        <div class="hbar-top"><div class="hbar-name">${esc(u.wohnung)}<span class="loc">${u.flaeche} m²${mieterTxt}</span></div>
          <div class="hbar-val">${eur(inc.gesamt)} ${on ? '<span class="badge b-on">vermietet</span>' : '<span class="badge b-off">frei</span>'}</div></div>
        <div class="track ${on ? '' : 'ghost'}"><span style="width:${w}%"></span></div></div>`;
    }).join("");
    const barCard = el(`<div class="card pad">
      <div class="card-t" style="margin-bottom:4px">Einnahmen je Wohnung</div>
      <div class="card-s" style="margin-bottom:18px">Einheit antippen für Details</div>
      <div class="hbars">${bars}</div></div>`);
    barCard.querySelectorAll(".unit-bar").forEach(b =>
      b.onclick = () => openUnitSheet(s, (s.einheiten || [])[Number(b.dataset.i)]));
    host.appendChild(barCard);

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
      return `<div class="drow clickable" data-i="${i}"><div class="drow-l"><div class="drow-badge">${esc((u.wohnung.match(/\d+/) || [i + 1])[0])}</div>
        <div><div class="drow-name">${esc(u.wohnung)} · ${u.flaeche} m²${u.mieter ? " · " + esc(u.mieter) : ""}</div>
        <div class="drow-sub">kalt ${eur(inc.kalt)} · NK ${eur(inc.nk)}${inc.kueche ? " · Küche " + eur(inc.kueche) : ""}${inc.strom ? " · Strom " + eur(inc.strom) : ""}${inc.stell ? " · Stellpl. " + eur(inc.stell) : ""}</div></div></div>
        <div class="drow-val"><b>${eur(inc.gesamt)}</b><span>${u.status === "vermietet" ? "vermietet" : "frei"}</span></div></div>`;
    }).join("");
    const tblCard = el(`<div class="card"><div class="card-h"><div><div class="card-t">Wohneinheiten</div>
      <div class="card-s">Zeile antippen für Mieter- und Vertragsdaten</div></div></div><div class="card-b">${rows}</div></div>`);
    tblCard.querySelectorAll(".drow[data-i]").forEach(r =>
      r.onclick = () => openUnitSheet(s, (s.einheiten || [])[Number(r.dataset.i)]));
    host.appendChild(tblCard);
  }

  /* ---------- DETAIL-SHEETS ---------- */
  function openUnitSheet(s, u) {
    if (!u) return;
    const inc = FE.unitIncome(u);
    const alle = (s.einheiten || []).map(x => FE.unitIncome(x).gesamt);
    const gesamtAlle = alle.reduce((a, b) => a + b, 0) || 1;
    const anteil = Math.round(inc.gesamt / gesamtAlle * 100);
    const proM2 = u.flaeche ? inc.kalt / u.flaeche : 0;
    const schnitt = (s.einheiten || []).reduce((a, x) => {
      const i2 = FE.unitIncome(x); return a + (x.flaeche ? i2.kalt / x.flaeche : 0);
    }, 0) / ((s.einheiten || []).length || 1);
    const v = u.vertrag || {};
    const on = u.status === "vermietet";

    // Mietdauer
    let dauer = "—";
    if (u.einzug) {
      const d0 = new Date(u.einzug), now = new Date();
      const mon = (now.getFullYear() - d0.getFullYear()) * 12 + (now.getMonth() - d0.getMonth());
      dauer = d0 > now ? "Einzug steht bevor" : (mon < 1 ? "seit diesem Monat" : mon + " Monate");
    }

    const parts = [
      { label: "Kaltmiete", value: inc.kalt, color: PALETTE[0] },
      { label: s.nkAlsPuffer ? "NK (Puffer)" : "Nebenkosten", value: inc.nk, color: PALETTE[1] },
      { label: "Küche", value: inc.kueche, color: PALETTE[3] },
      { label: "Strom", value: inc.strom, color: PALETTE[4] },
      { label: "Stellplatz", value: inc.stell, color: PALETTE[5] }
    ].filter(x => x.value > 0);

    const body = `
      <div class="stat-strip" style="margin-bottom:18px">
        <div class="s"><span>Warmmiete</span><b>${eur(inc.gesamt)}</b></div>
        <div class="s"><span>Ertrag${s.nkAlsPuffer ? " (o. NK)" : ""}</span><b style="color:var(--mint-2)">${eur(s.nkAlsPuffer ? inc.gesamt - inc.nk : inc.gesamt)}</b></div>
        <div class="s"><span>€ / m²</span><b>${proM2.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></div>
        <div class="s"><span>Anteil Objekt</span><b>${anteil} %</b></div>
      </div>
      <div class="card-t" style="font-size:14px;margin-bottom:10px">Zusammensetzung</div>
      ${miniBars(parts)}
      <div class="card-t" style="font-size:14px;margin:20px 0 6px">Mieter</div>
      ${kv("Name", on ? esc(u.mieter || "—") : '<span style="color:var(--gold)">frei</span>')}
      ${kv("Einzug", u.einzug ? dateDE(u.einzug) : "—")}
      ${kv("Mietdauer", dauer)}
      ${v.telefon ? kv("Telefon", esc(v.telefon)) : ""}
      ${v.email ? kv("E-Mail", esc(v.email)) : ""}
      <div class="card-t" style="font-size:14px;margin:20px 0 6px">Vertrag</div>
      ${kv("Kaution", v.kaution != null ? eur(v.kaution) : "—", v.kaution == null)}
      ${kv("Vertragsdatum", v.vertragsdatum ? dateDE(v.vertragsdatum) : "—", !v.vertragsdatum)}
      ${kv("Laufzeit", v.laufzeit ? esc(v.laufzeit) : "—", !v.laufzeit)}
      ${kv("Kündigungsfrist", v.kuendigungsfrist ? esc(v.kuendigungsfrist) : "—", !v.kuendigungsfrist)}
      ${v.notiz ? `<div class="note" style="margin-top:14px">${esc(v.notiz)}</div>` : ""}
      <div class="note" style="margin-top:16px">Vergleich: ${proM2 >= schnitt ? "über" : "unter"} dem Objektschnitt von ${schnitt.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/m².</div>`;
    openSheet(u.wohnung + " · " + u.flaeche + " m²", s.name, body);
  }

  function openCreditSheet(kr) {
    const p = FE.creditPlan(kr);
    if (!p) return;
    const rows = p.rows;
    // Jahresweise verdichten
    const byYear = {};
    rows.forEach(r => {
      const y = r.monat.slice(0, 4);
      byYear[y] = byYear[y] || { zins: 0, tilgung: 0, sonder: 0, rest: 0 };
      byYear[y].zins += r.zins; byYear[y].tilgung += r.tilgung;
      byYear[y].sonder += r.sonder; byYear[y].rest = r.rest;
    });
    const trs = Object.keys(byYear).sort().map(y => {
      const b = byYear[y];
      return `<tr><td>${y}</td><td>${eur(b.zins)}</td><td>${eur(b.tilgung + b.sonder)}</td>
        <td class="hl">${eur(b.rest)}</td></tr>`;
    }).join("");
    const zinsAnteil = p.zinsGesamt / ((Number(kr.summe) || 1) + p.zinsGesamt) * 100;
    const body = `
      <div class="stat-strip" style="margin-bottom:18px">
        <div class="s"><span>Restschuld heute</span><b>${eur(p.restAktuell)}</b></div>
        <div class="s"><span>getilgt</span><b>${eur(p.getilgtBisher)}</b></div>
        <div class="s"><span>Zinsen gesamt</span><b>${eur(p.zinsGesamt)}</b></div>
        <div class="s"><span>Laufzeit</span><b>${p.jahre.toLocaleString("de-DE")} J.</b></div>
      </div>
      <div class="card-t" style="font-size:14px;margin-bottom:10px">Kostenverteilung</div>
      ${miniBars([
        { label: "Darlehen", value: Number(kr.summe) || 0, color: "linear-gradient(90deg,var(--deep),var(--mint))" },
        { label: "Zinskosten", value: p.zinsGesamt, color: "linear-gradient(90deg,#8a6d2f,var(--gold))" }
      ])}
      <div class="note" style="margin-top:8px">${zinsAnteil.toFixed(1)} % der Gesamtkosten sind Zinsen.</div>
      <div class="card-t" style="font-size:14px;margin:20px 0 10px">Tilgung je Jahr</div>
      <table class="tbl"><thead><tr><th>Jahr</th><th>Zins</th><th>Tilgung</th><th>Restschuld</th></tr></thead>
      <tbody>${trs}</tbody></table>`;
    openSheet(kr.name || "Kredit", eur(kr.summe) + " · " + (kr.zinsPa || 0).toLocaleString("de-DE") + " % · " + eur(kr.abtragMonat) + "/Monat", body);
  }

  function openCashflowSheet(s) {
    const m = FE.streamMonthly(s);
    const k = FE.immoKPIs(s);
    const kredite = FE.creditsOf(s);
    const body = `
      <div class="card-t" style="font-size:14px;margin-bottom:10px">Herleitung</div>
      ${kv("Ertrag" + (s.nkAlsPuffer ? " (ohne NK)" : ""), eur(m.gesamt))}
      ${kredite.map(kr => kv("− " + (kr.name || "Kredit"), "−" + eur(kr.abtragMonat))).join("")}
      ${kv("Netto-Cashflow", eur(m.netto))}
      ${s.nkAlsPuffer ? `<div class="note" style="margin-top:12px">Zusätzlich ${eur(m.nkPuffer)}/Monat Nebenkosten als Rücklage (nicht im Ertrag).</div>` : ""}
      <div class="card-t" style="font-size:14px;margin:20px 0 10px">Wenn alles vermietet wäre</div>
      ${kv("Potenzial-Ertrag", eur(m.gesamtPotenzial))}
      ${kv("Netto-Cashflow", eur(m.gesamtPotenzial - m.kreditAbtrag))}
      ${kv("Cashflow-ROI", s.invest ? ((m.gesamtPotenzial - m.kreditAbtrag) * 12 / s.invest * 100).toFixed(2) + " %" : "—")}
      <div class="note" style="margin-top:14px">Differenz zu heute: ${eur(m.gesamtPotenzial - m.gesamt)}/Monat aus leerstehenden Einheiten.</div>`;
    openSheet("Netto-Cashflow", s.name, body);
  }

  function openNkSheet(s, m) {
    const verm = (s.einheiten || []).filter(u => u.status === "vermietet");
    const proWohnung = verm.map((u, i) => {
      const inc = FE.unitIncome(u);
      return { label: u.wohnung, value: inc.nk, color: PALETTE[i % PALETTE.length],
               display: eur(inc.nk) };
    });
    const jahr = m.nkPuffer * 12;
    const pos = (s.nkPositionen || []).map((p, i) => ({
      label: p.titel, value: m.nkPuffer * p.anteil / 100,
      color: PALETTE[i % PALETTE.length],
      display: eur(m.nkPuffer * p.anteil / 100) + "  ·  " + p.anteil + " %"
    }));
    const frei = (s.einheiten || []).filter(u => u.status !== "vermietet");
    const entgangen = frei.reduce((a, u) => a + FE.unitIncome(u).nk, 0);

    const body = `
      <div class="stat-strip" style="margin-bottom:18px">
        <div class="s"><span>je Monat</span><b style="color:var(--gold)">${eur(m.nkPuffer)}</b></div>
        <div class="s"><span>je Jahr</span><b>${eur(jahr)}</b></div>
        <div class="s"><span>je m²</span><b>${(s.einheiten || [])[0] ? ((s.einheiten[0].nkProM2 != null ? s.einheiten[0].nkProM2 : (FE.unitIncome(s.einheiten[0]).nk / (s.einheiten[0].flaeche || 1)))).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"} €</b></div>
        <div class="s"><span>Einheiten</span><b>${verm.length} vermietet</b></div>
      </div>
      <div class="card-t" style="font-size:14px;margin-bottom:10px">Beitrag je Wohnung</div>
      ${miniBars(proWohnung)}
      ${entgangen > 0 ? `<div class="note" style="margin-top:10px">Durch Leerstand fehlen zusätzlich ${eur(entgangen)}/Monat an NK-Umlage.</div>` : ""}
      ${pos.length ? `<div class="card-t" style="font-size:14px;margin:20px 0 10px">Wofür die Rücklage verwendet wird</div>
      ${miniBars(pos)}
      <div class="note" style="margin-top:10px">Richtwerte für die Verteilung. Die tatsächliche Abrechnung erfolgt jährlich gegenüber den Mietern.</div>` : ""}
      <div class="card-t" style="font-size:14px;margin:20px 0 6px">Warum Puffer statt Ertrag</div>
      <div class="note">Nebenkosten sind durchlaufende Posten: Die Mieter zahlen Vorauszahlungen, aus denen Heizung, Grundsteuer, Versicherung und Wartung beglichen werden. Über- oder Nachzahlungen werden jährlich ausgeglichen. Deshalb zählen sie hier nicht zum Ertrag – sonst würde der Cashflow zu hoch ausgewiesen.</div>
      <div style="margin-top:16px">
        ${kv("Rücklage über 3 Jahre", eur(jahr * 3))}
        ${kv("Rücklage über 10 Jahre", eur(jahr * 10))}
      </div>`;
    openSheet("Nebenkosten-Puffer", s.name, body);
  }

  function openCalendarSheet() {
    const now = new Date();
    const y = now.getFullYear(), mo = now.getMonth();
    // Jahresübersicht der Zahlungsströme
    const monate = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(y, mo + i, 1);
      const map = eventsForMonth(d.getFullYear(), d.getMonth());
      let anzahl = 0, typen = {};
      Object.values(map).forEach(list => list.forEach(e => { anzahl++; typen[e.typ] = (typen[e.typ] || 0) + 1; }));
      monate.push({ d, anzahl, typen });
    }
    const t = FE.totals(D);
    // Sondertilgungen & Pacht im Jahresverlauf
    let sonderJahr = 0;
    (D.streams || []).forEach(s => FE.creditsOf(s).forEach(kr => {
      if (kr.sondertilgung) sonderJahr += (kr.sondertilgung.betrag || 0) * (kr.sondertilgung.monate || []).length;
    }));
    const pachtStream = (D.streams || []).find(s => s.kind === "pacht");
    const pachtJahr = pachtStream ? FE.streamMonthly(pachtStream).jahr : 0;

    const trs = monate.map(x => `<tr>
      <td>${x.d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" })}</td>
      <td>${x.typen.miete || 0}</td><td>${x.typen.einzug || 0}</td>
      <td>${x.typen.zahlung || 0}</td><td class="hl">${x.anzahl}</td></tr>`).join("");

    const body = `
      <div class="stat-strip" style="margin-bottom:18px">
        <div class="s"><span>Mieteingang/Mon.</span><b>${eur(t.miete + t.airbnb)}</b></div>
        <div class="s"><span>Pacht/Jahr</span><b>${eur(pachtJahr)}</b></div>
        <div class="s"><span>Sondertilgung/Jahr</span><b>${eur(sonderJahr)}</b></div>
        <div class="s"><span>Termine 12 Mon.</span><b>${monate.reduce((a, x) => a + x.anzahl, 0)}</b></div>
      </div>
      <div class="card-t" style="font-size:14px;margin-bottom:10px">Wiederkehrende Ereignisse</div>
      <div class="tl">
        <div class="tl-i"><span class="tl-dot" style="background:${EVT.miete.col}"></span>
          <div class="tl-b"><div class="tl-t">Mieteingang</div>
            <div class="tl-s">jeden 1. des Monats · alle Objekte</div></div>
          <span class="tl-v">${eur(t.miete + t.airbnb)}</span></div>
        <div class="tl-i"><span class="tl-dot" style="background:${EVT.zahlung.col}"></span>
          <div class="tl-b"><div class="tl-t">Sondertilgung Syke</div>
            <div class="tl-s">1. Juni und 1. Dezember</div></div>
          <span class="tl-v">${eur(1500)}</span></div>
        <div class="tl-i"><span class="tl-dot" style="background:${EVT.zahlung.col}"></span>
          <div class="tl-b"><div class="tl-t">Sondertilgung VR-Darlehen</div>
            <div class="tl-s">jährlich im Dezember</div></div>
          <span class="tl-v">${eur(10000)}</span></div>
        <div class="tl-i"><span class="tl-dot" style="background:${EVT.zahlung.col}"></span>
          <div class="tl-b"><div class="tl-t">Pachtzahlung</div>
            <div class="tl-s">jährlich zum 1. Dezember</div></div>
          <span class="tl-v">${eur(pachtJahr)}</span></div>
      </div>
      <div class="card-t" style="font-size:14px;margin:20px 0 10px">Termine je Monat</div>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Monat</th><th>Miete</th><th>Einzug</th><th>Zahlung</th><th>Gesamt</th></tr></thead>
        <tbody>${trs}</tbody></table></div>
      <div class="note" style="margin-top:12px">Der Dezember ist der zahlungsintensivste Monat: Pacht und beide Sondertilgungen fallen zusammen (${eur(pachtJahr + 11500)}).</div>`;
    openSheet("Kalender-Übersicht", "Zahlungsströme der nächsten 12 Monate", body);
  }

  function openPortfolioSheet(kind, c) {
    const t = c.t;
    const streams = (D.streams || []);
    if (kind === "einnahmen") {
      const rows = streams.map((s, i) => {
        const m = FE.streamMonthly(s);
        return { label: shortLabel(s.name), value: m.gesamt, color: PALETTE[i % PALETTE.length] };
      }).filter(x => x.value > 0);
      const body = `
        <div class="stat-strip" style="margin-bottom:18px">
          <div class="s"><span>je Monat</span><b style="color:var(--mint-2)">${eur(t.ist)}</b></div>
          <div class="s"><span>je Jahr</span><b>${eur(t.jahrIst)}</b></div>
          <div class="s"><span>je Quartal</span><b>${eur(t.ist * 3)}</b></div>
          <div class="s"><span>je Tag</span><b>${eur(t.ist * 12 / 365)}</b></div>
        </div>
        <div class="card-t" style="font-size:14px;margin-bottom:10px">Nach Quelle</div>
        ${miniBars(rows)}
        <div class="card-t" style="font-size:14px;margin:20px 0 10px">Nach Art</div>
        ${miniBars([
          { label: "Wohnraum", value: t.miete, color: PALETTE[0] },
          { label: "Kurzzeit", value: t.airbnb, color: PALETTE[2] },
          { label: "Landpacht", value: t.pacht, color: PALETTE[3] }
        ].filter(x => x.value > 0))}
        <div class="note" style="margin-top:12px">Nebenkosten sind nicht enthalten – sie laufen als Rücklage separat.</div>`;
      return openSheet("Einnahmen", "Alle Quellen · Stand heute", body);
    }
    if (kind === "potenzial") {
      const rows = streams.map((s, i) => {
        const m = FE.streamMonthly(s);
        const diff = (m.gesamtPotenzial || m.gesamt) - m.gesamt;
        return { label: shortLabel(s.name), value: diff, color: PALETTE[i % PALETTE.length] };
      }).filter(x => x.value > 0);
      const frei = [];
      streams.forEach(s => (s.einheiten || []).forEach(u => {
        if (u.status !== "vermietet") frei.push({ s, u, inc: FE.unitIncome(u) });
      }));
      const body = `
        <div class="stat-strip" style="margin-bottom:18px">
          <div class="s"><span>Ist</span><b>${eur(t.ist)}</b></div>
          <div class="s"><span>Potenzial</span><b style="color:var(--mint-2)">${eur(t.potenzial)}</b></div>
          <div class="s"><span>Differenz</span><b>${eur(c.upside)}</b></div>
          <div class="s"><span>je Jahr</span><b>${eur(c.upside * 12)}</b></div>
        </div>
        ${rows.length ? `<div class="card-t" style="font-size:14px;margin-bottom:10px">Ungenutztes Potenzial</div>${miniBars(rows)}` : ""}
        ${frei.length ? `<div class="card-t" style="font-size:14px;margin:20px 0 10px">Leerstehende Einheiten</div>
        ${frei.map(f => kv(f.u.wohnung + " · " + f.u.flaeche + " m² (" + shortLabel(f.s.name) + ")",
          eur(f.s.nkAlsPuffer ? f.inc.gesamt - f.inc.nk : f.inc.gesamt))).join("")}` : ""}
        <div class="card-t" style="font-size:14px;margin:20px 0 6px">Auswirkung bei Vollvermietung</div>
        ${kv("Netto-Cashflow heute", eur(c.nettoMonth))}
        ${kv("Netto-Cashflow voll", eur(c.nettoPot))}
        ${kv("Zuwachs je Jahr", eur((c.nettoPot - c.nettoMonth) * 12))}`;
      return openSheet("Einnahmen-Potenzial", "Was bei Vollvermietung möglich ist", body);
    }
    if (kind === "netto") {
      const body = `
        <div class="card-t" style="font-size:14px;margin-bottom:10px">Herleitung</div>
        ${kv("Einnahmen gesamt", eur(t.ist))}
        ${kv("− Tilgung alle Kredite", "−" + eur(c.debtMonth))}
        ${kv("Netto-Cashflow", eur(c.nettoMonth))}
        <div class="card-t" style="font-size:14px;margin:20px 0 10px">Tilgungsanteil je Kredit</div>
        ${miniBars((() => {
          const out = [];
          streams.forEach((s, si) => FE.creditsOf(s).forEach((kr, ki) => out.push({
            label: (kr.name || "Kredit"), value: Number(kr.abtragMonat) || 0,
            color: PALETTE[(si + ki) % PALETTE.length]
          })));
          return out;
        })())}
        <div class="note" style="margin-top:12px">Die Tilgung ist kein Verlust – sie baut Eigenkapital auf. Aktuell fließen ${eur(c.debtMonth)}/Monat in die Entschuldung.</div>
        <div class="card-t" style="font-size:14px;margin:20px 0 6px">Zeitraum</div>
        ${kv("je Monat", eur(c.nettoMonth))}
        ${kv("je Jahr", eur(c.nettoMonth * 12))}
        ${kv("bei Vollvermietung / Jahr", eur(c.nettoPot * 12))}`;
      return openSheet("Netto-Cashflow", "Nach allen Kreditraten", body);
    }
    if (kind === "auslastung") {
      const rows = [];
      streams.forEach(s => (s.einheiten || []).forEach(u => {
        const inc = FE.unitIncome(u);
        rows.push({ s, u, inc, on: u.status === "vermietet" });
      }));
      const frei = rows.filter(r => !r.on);
      const body = `
        <div class="stat-strip" style="margin-bottom:18px">
          <div class="s"><span>Vermietet</span><b style="color:var(--mint-2)">${c.unitsLet}</b></div>
          <div class="s"><span>Frei</span><b style="color:var(--gold)">${c.unitsTotal - c.unitsLet}</b></div>
          <div class="s"><span>Quote</span><b>${Math.round(c.unitsLet / c.unitsTotal * 100)} %</b></div>
          <div class="s"><span>Fläche gesamt</span><b>${rows.reduce((a, r) => a + (Number(r.u.flaeche) || 0), 0)} m²</b></div>
        </div>
        <div class="card-t" style="font-size:14px;margin-bottom:10px">Alle Einheiten</div>
        ${rows.map(r => kv(
          r.u.wohnung + " · " + r.u.flaeche + " m²" + (r.u.mieter ? " · " + r.u.mieter : ""),
          r.on ? eur(r.s.nkAlsPuffer ? r.inc.gesamt - r.inc.nk : r.inc.gesamt)
               : '<span style="color:var(--gold)">frei</span>')).join("")}
        ${frei.length ? `<div class="note" style="margin-top:12px">Bei Vermietung der ${frei.length === 1 ? "freien Einheit" : frei.length + " freien Einheiten"} steigt der Ertrag um ${eur(c.upside)}/Monat.</div>` : `<div class="note" style="margin-top:12px">Alle Einheiten sind vermietet.</div>`}`;
      return openSheet("Auslastung", c.unitsLet + " von " + c.unitsTotal + " Einheiten vermietet", body);
    }
    if (kind === "schuld") {
      const list = [];
      streams.forEach(s => FE.creditsOf(s).forEach(kr => {
        const p = FE.creditPlan(kr);
        list.push({ s, kr, p });
      }));
      const quote = c.debtOrig ? (c.paidSoFar / c.debtOrig * 100) : 0;
      const trs = list.map(x => `<tr><td>${esc(x.kr.name || "Kredit")}</td>
        <td>${eur(x.kr.summe)}</td><td>${eur(x.p.restAktuell)}</td>
        <td>${(x.kr.zinsPa || 0).toLocaleString("de-DE")} %</td>
        <td class="hl">${x.p.jahre.toLocaleString("de-DE")} J</td></tr>`).join("");
      const body = `
        <div class="stat-strip" style="margin-bottom:18px">
          <div class="s"><span>Restschuld</span><b>${eur(c.debtRest)}</b></div>
          <div class="s"><span>getilgt</span><b style="color:var(--mint-2)">${eur(c.paidSoFar)}</b></div>
          <div class="s"><span>Tilgungsquote</span><b>${quote.toFixed(1)} %</b></div>
          <div class="s"><span>Rate/Monat</span><b>${eur(c.debtMonth)}</b></div>
        </div>
        <div class="card-t" style="font-size:14px;margin-bottom:10px">Restschuld je Kredit</div>
        ${miniBars(list.map((x, i) => ({ label: x.kr.name || "Kredit", value: x.p.restAktuell, color: PALETTE[i % PALETTE.length] })))}
        <div class="card-t" style="font-size:14px;margin:20px 0 10px">Konditionen</div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Kredit</th><th>Ursprung</th><th>Rest</th><th>Zins</th><th>Laufzeit</th></tr></thead>
          <tbody>${trs}</tbody></table></div>
        <div class="note" style="margin-top:12px">Tilgung ${eur(c.debtMonth * 12)}/Jahr. Die Restschuld sinkt mit jeder Rate, der Tilgungsanteil steigt dabei kontinuierlich.</div>`;
      return openSheet("Restschuld", "Alle Kredite im Portfolio", body);
    }
  }

  /* ---------- BOOT ---------- */
  // Zoom unterbinden (iOS ignoriert user-scalable=no)
  function blockZoom() {
    document.addEventListener("gesturestart", e => e.preventDefault(), { passive: false });
    document.addEventListener("gesturechange", e => e.preventDefault(), { passive: false });
    document.addEventListener("gestureend", e => e.preventDefault(), { passive: false });
    document.addEventListener("touchmove", e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    let lastTouch = 0;
    document.addEventListener("touchend", e => {
      const now = Date.now();
      if (now - lastTouch <= 320) e.preventDefault(); // Doppeltipp-Zoom
      lastTouch = now;
    }, { passive: false });
    document.addEventListener("wheel", e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    blockZoom();
    fuelleBenutzerAuswahl();
    $("#loginBtn").addEventListener("click", tryLogin);
    $("#pw").addEventListener("keydown", e => { if (e.key === "Enter") tryLogin(); });
    if ($("#whoami")) $("#whoami").addEventListener("change", () => $("#pw").focus());
    $("#logoutBtn").addEventListener("click", logout);

    if (sessionOK()) {
      try {
        await window.ladeDaten();
        D = window.DASHBOARD_DATA;
        enterApp();
      } catch (e) {
        $("#login").classList.remove("hide");
        $("#loginMsg").textContent = "Daten konnten nicht geladen werden.";
        $("#loginMsg").className = "login-msg bad";
        console.error(e);
      }
    } else {
      $("#login").classList.remove("hide");
      setTimeout(() => $("#pw").focus(), 150);
    }
  });

})();
