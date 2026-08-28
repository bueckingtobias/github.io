/* ============================================================================
   app.js — Bücking Einnahmen-Dashboard (Visualisierung)
   ============================================================================ */
(function () {
  "use strict";
  let D = window.DASHBOARD_DATA || {};
  const FE = window.FinanceEngine;
  const SESSION = "buecking_income_v1";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const eur = n => (Number(n) || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const eur2 = n => (Number(n) || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const el = h => { const t = document.createElement("template"); t.innerHTML = h.trim(); return t.content.firstElementChild; };
  const monthShort = m => { const d = new Date(m + "-01"); return d.toLocaleDateString("de-DE", { month: "short" }); };


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
    debt: '<path d="M12 3v18M8 7h6a2.5 2.5 0 0 1 0 5H9a2.5 2.5 0 0 0 0 5h7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    calendar: '<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 9h16M8 3v3M16 3v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    user: '<circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  const svg = (k, cls) => `<svg viewBox="0 0 24 24" fill="none" class="${cls || ''}">${IC[k] || IC.grid}</svg>`;

  /* ---------- AUTH ---------- */
  let currentUser = null;   // { id, name, anrede }

  // Lädt das Profil des angemeldeten Nutzers aus der Datenbank
  async function ladeProfil(session) {
    const mail = ((session.user && session.user.email) || "");
    let profil = null;
    try {
      const { data } = await window.sb.from("mitglieder")
        .select("name, email, avatar_url, rolle, theme, accent, tipps_an").limit(1).single();
      profil = data;
    } catch (_) {}
    const name = (profil && profil.name) || mail.split("@")[0];
    currentUser = {
      id: session.user.id,
      name: name,
      anrede: (name || "").split(" ")[0],
      email: mail,
      avatar: profil && profil.avatar_url || null,
      rolle: profil && profil.rolle || "inhaber",
      theme: profil && profil.theme || null,
      accent: profil && profil.accent || null,
      tipps_an: profil && profil.tipps_an === false ? false : true
    };
    // Farbschema aus dem Profil anwenden (geräteübergreifend).
    // Fällt auf den lokal gespeicherten Wert zurück, sonst Standard Graphit/Silber.
    const theme = currentUser.theme || localStorage.getItem("estriq_theme") || "graphit";
    const accent = currentUser.accent || localStorage.getItem("estriq_accent") || "buecking";
    themeAnwenden(theme, accent);
    themeSpeichern(theme, accent);
  }
  // Prüft die Supabase-Sitzung
  async function sessionOK() {
    try {
      if (!window.sb) return false;
      const { data: { session } } = await window.sb.auth.getSession();
      if (!session) return false;
      await ladeProfil(session);
      return true;
    } catch { return false; }
  }

  async function tryLogin() {
    const msg = $("#loginMsg"), v = $("#pw").value;
    const mail = ($("#mail") && $("#mail").value.trim()) || "";
    if (!mail) { msg.textContent = "Bitte E-Mail eingeben."; msg.className = "login-msg bad"; return; }
    if (!v) { msg.textContent = "Bitte Passwort eingeben."; msg.className = "login-msg bad"; return; }
    msg.textContent = "Anmeldung läuft…"; msg.className = "login-msg";

    const { data, error } = await window.sb.auth.signInWithPassword({
      email: mail, password: v
    });
    if (error) {
      msg.textContent = "Anmeldung fehlgeschlagen. E-Mail oder Passwort falsch.";
      msg.className = "login-msg bad";
      $("#pw").select();
      console.error(error);
      return;
    }
    try {
      await ladeProfil(data.session);
      await window.ladeDaten();
      D = window.DASHBOARD_DATA;
      enterApp();
    } catch (e) {
      msg.textContent = window.fehlerText(e);
      msg.className = "login-msg bad";
      console.error(e);
    }
  }

  async function logout() {
    try { if (window.sb) await window.sb.auth.signOut(); } catch (_) {}
    localStorage.removeItem(SESSION);
    location.reload();
  }

  /* ---------- DESIGN / THEME ---------- */
  const THEMES = [
    { id: "graphit", name: "Graphit", bg: "#1c1f26" },
    { id: "hell",    name: "Hell",    bg: "#f4f6f9" },
    { id: "smaragd", name: "Smaragd", bg: "#0a1f1a" },
    { id: "marine",  name: "Marine",  bg: "#111a2b" }
  ];
  const AKZENTE = [
    { id: "buecking",  name: "Bücking",   farbe: "#4CAF7D" },
    { id: "teal",      name: "Teal",      farbe: "#2dd4bf" },
    { id: "mint",      name: "Mint",      farbe: "#4ade9e" },
    { id: "blau",      name: "Blau",      farbe: "#4a9fee" },
    { id: "violett",   name: "Violett",   farbe: "#a98cf0" },
    { id: "bernstein", name: "Bernstein", farbe: "#e0a94a" },
    { id: "rose",      name: "Rosé",      farbe: "#ee7a9f" },
    { id: "rubin",     name: "Rubin",     farbe: "#c0392b" },
    { id: "silber",    name: "Silber",    farbe: "#c8ccd4" }
  ];
  function themeAnwenden(theme, accent) {
    const el2 = document.documentElement;
    if (theme === "graphit") el2.removeAttribute("data-theme");
    else el2.setAttribute("data-theme", theme);
    el2.setAttribute("data-accent", accent || "teal");
    PALETTE = palette();
    if (typeof currentView !== "undefined" && currentView) { try { route(currentView); } catch (_) {} }
  }
  function themeSpeichern(theme, accent) {
    try {
      if (theme === "graphit") localStorage.removeItem("estriq_theme");
      else localStorage.setItem("estriq_theme", theme);
      localStorage.setItem("estriq_accent", accent || "buecking");
    } catch (_) {}
  }
  // Farbschema am Nutzer in der Datenbank speichern (geräteübergreifend)
  async function themeInDB(theme, accent) {
    try {
      if (!currentUser || !window.sb) return;
      await window.sb.from("mitglieder")
        .update({ theme: theme, accent: accent }).eq("auth_user_id", currentUser.id);
      currentUser.theme = theme; currentUser.accent = accent;
    } catch (_) {}
  }
  function aktThemeId() {
    const t = document.documentElement.getAttribute("data-theme");
    return t || "graphit";
  }
  function aktAccentId() {
    return document.documentElement.getAttribute("data-accent") || "teal";
  }

  /* ---------- ABO / TARIF ---------- */
  const TARIFE = {
    basic:   { name: "Basic",   preis: "19,99 €", objekte: 3, einheiten: 10 },
    premium: { name: "Premium", preis: "29,99 €", objekte: Infinity, einheiten: Infinity }
  };
  function abo() {
    return (D && D.abo) || { tarif: "premium", roh_tarif: "test", objekte: 0, einheiten: 0 };
  }
  function istPremium() { return abo().tarif === "premium"; }
  function istGesperrt() { return abo().tarif === "gesperrt"; }

  // Prüft, ob eine Aktion erlaubt ist. Gibt true zurück oder zeigt den Upgrade-Hinweis.
  function pruefeObjekt(art) {
    const a = abo();
    if (a.tarif === "gesperrt") { openUpgradeSheet("gesperrt"); return false; }
    if (a.tarif === "premium") return true;
    // basic
    if (art && art !== "miete") { openUpgradeSheet("art"); return false; }
    if (a.objekte >= 3) { openUpgradeSheet("objekte"); return false; }
    return true;
  }
  function pruefeEinheit() {
    const a = abo();
    if (a.tarif === "gesperrt") { openUpgradeSheet("gesperrt"); return false; }
    if (a.tarif === "premium") return true;
    if (a.einheiten >= 10) { openUpgradeSheet("einheiten"); return false; }
    return true;
  }

  function openUpgradeSheet(grund) {
    const texte = {
      objekte:   { t: "Objekt-Grenze erreicht", d: "Im Basic-Tarif kannst du bis zu 3 Objekte verwalten. Mit Premium werden es unbegrenzt viele." },
      einheiten: { t: "Einheiten-Grenze erreicht", d: "Basic umfasst bis zu 10 Einheiten. Premium hebt die Grenze vollständig auf." },
      art:       { t: "Nur mit Premium", d: "AirBNB- und Landpacht-Objekte sind Premium vorbehalten. Basic deckt die klassische Vermietung ab." },
      gesperrt:  { t: "Bearbeiten pausiert", d: "Dein Testzeitraum ist abgelaufen oder es liegt keine gültige Zahlung vor. Deine Daten bleiben erhalten und lesbar — mit einem aktiven Abo kannst du sie wieder bearbeiten." }
    };
    const info = texte[grund] || texte.objekte;
    const prem = TARIFE.premium;
    const body = `
      <div class="up-hero">
        <div class="up-badge">${grund === "gesperrt" ? "Pausiert" : "Upgrade"}</div>
        <div class="up-t">${esc(info.t)}</div>
        <div class="up-d">${esc(info.d)}</div>
      </div>
      <div class="up-plan">
        <div class="up-plan-h">
          <div><div class="up-plan-n">Premium</div>
            <div class="up-plan-s">Alles ohne Grenzen</div></div>
          <div class="up-plan-p">${prem.preis}<span>/Monat</span></div>
        </div>
        <ul class="up-feats">
          <li>Unbegrenzt Objekte und Einheiten</li>
          <li>AirBNB- und Landpacht-Objekte</li>
          <li>Alle Analysen und Auswertungen</li>
        </ul>
        <button class="up-cta" id="upCta">Auf Premium wechseln</button>
        <div class="up-note">Erster Monat kostenlos · monatlich kündbar</div>
      </div>`;
    const sheet = openSheet(grund === "gesperrt" ? "Abo" : "Mehr freischalten", "", body);
    sheet.querySelector("#upCta").onclick = () => { closeSheet(); openTarifSheet(); };
  }

  // Tarifübersicht (Vergleich beider Stufen)
  function openTarifSheet() {
    const a = abo();
    const aktuell = a.tarif;
    const body = `
      <div class="tarif-grid">
        <div class="tarif-card${aktuell === "basic" ? " current" : ""}">
          <div class="tarif-n">Basic</div>
          <div class="tarif-p">19,99 €<span>/Monat</span></div>
          <ul class="tarif-feats">
            <li>Bis zu 3 Objekte</li>
            <li>Bis zu 10 Einheiten</li>
            <li>Klassische Vermietung</li>
            <li>Alle Analysen</li>
          </ul>
          ${aktuell === "basic" ? `<div class="tarif-badge">Dein Tarif</div>`
            : `<button class="tarif-btn" data-plan="basic">Basic wählen</button>`}
        </div>
        <div class="tarif-card premium${aktuell === "premium" ? " current" : ""}">
          <div class="tarif-flag">Empfohlen</div>
          <div class="tarif-n">Premium</div>
          <div class="tarif-p">29,99 €<span>/Monat</span></div>
          <ul class="tarif-feats">
            <li>Unbegrenzt Objekte</li>
            <li>Unbegrenzt Einheiten</li>
            <li>AirBNB & Landpacht</li>
            <li>Alle Analysen</li>
          </ul>
          ${aktuell === "premium" ? `<div class="tarif-badge">Dein Tarif</div>`
            : `<button class="tarif-btn prem" data-plan="premium">Premium wählen</button>`}
        </div>
      </div>
      <div class="tarif-code">
        <label class="ef-l">Rabattcode</label>
        <div class="tarif-code-row">
          <input class="ef-i" id="rabattCode" placeholder="Code eingeben">
          <button class="tarif-code-btn" id="rabattBtn">Einlösen</button>
        </div>
        <div class="ef-msg" id="rabattMsg"></div>
      </div>
      <div class="up-note" style="margin-top:14px">Erster Monat kostenlos · jederzeit kündbar</div>
      ${a.hat_stripe ? `<div class="abo-verwalten"><a href="#" id="portalLink">Abo verwalten oder kündigen</a></div>` : ""}`;
    const sheet = openSheet("Tarif wählen", "Aktuell: " + (TARIFE[aktuell] ? TARIFE[aktuell].name : "Test"), body);

    const pl = sheet.querySelector("#portalLink");
    if (pl) pl.onclick = (e) => { e.preventDefault(); oeffnePortal(pl); };

    sheet.querySelectorAll(".tarif-btn").forEach(b => b.onclick = () => starteCheckout(b.dataset.plan, sheet));
    sheet.querySelector("#rabattBtn").onclick = () => loeseRabattEin(sheet);
  }

  // Öffnet das Stripe-Kundenportal (Abo ansehen, Zahlungsmittel, kündigen)
  async function oeffnePortal(link) {
    const alt = link.textContent;
    link.textContent = "Portal wird geöffnet…";
    try {
      const { data: { session } } = await window.sb.auth.getSession();
      const token = session && session.access_token;
      const res = await fetch(window.SB_FUNKTION + "/portal-oeffnen", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ zurueck_url: location.origin + location.pathname })
      });
      const j = await res.json();
      if (j.url) { location.href = j.url; }
      else { link.textContent = alt; showToast(j.fehler || "Portal konnte nicht geöffnet werden."); }
    } catch (e) {
      link.textContent = alt; showToast("Verbindung fehlgeschlagen.");
    }
  }

  // Leitet zur von Stripe gehosteten Bezahlseite (30 Tage Test, Karte vorab)
  async function starteCheckout(plan, sheet) {
    const msg = sheet.querySelector("#rabattMsg");
    msg.textContent = "Bezahlseite wird geöffnet…"; msg.className = "ef-msg";
    try {
      const { data: { session } } = await window.sb.auth.getSession();
      const token = session && session.access_token;
      const res = await fetch(window.SB_FUNKTION + "/checkout-starten", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({
          plan,
          erfolg_url: location.origin + location.pathname + "?bezahlt=1",
          abbruch_url: location.origin + location.pathname + "?abbruch=1"
        })
      });
      const j = await res.json();
      if (j.url) { location.href = j.url; }   // weiter zu Stripe
      else { msg.textContent = j.fehler || "Bezahlseite konnte nicht geöffnet werden."; msg.className = "ef-msg bad"; }
    } catch (e) {
      msg.textContent = "Verbindung zu Stripe fehlgeschlagen. Bitte später erneut."; msg.className = "ef-msg bad";
    }
  }

  async function loeseRabattEin(sheet) {
    const code = (sheet.querySelector("#rabattCode").value || "").trim();
    const msg = sheet.querySelector("#rabattMsg");
    if (!code) { msg.textContent = "Bitte Code eingeben."; msg.className = "ef-msg bad"; return; }
    msg.textContent = "Prüfe Code…"; msg.className = "ef-msg";
    try {
      const { data: { session } } = await window.sb.auth.getSession();
      const token = session && session.access_token;
      const res = await fetch(window.SB_FUNKTION + "/rabatt-einloesen", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ code })
      });
      const j = await res.json();
      if (j.status === "ok") {
        msg.textContent = "Code eingelöst – Premium ist freigeschaltet."; msg.className = "ef-msg";
        await window.nachSpeichern();
        setTimeout(closeSheet, 900);
      } else if (j.status === "ungueltig") {
        msg.textContent = "Dieser Code ist ungültig."; msg.className = "ef-msg bad";
      } else {
        msg.textContent = "Code konnte nicht eingelöst werden."; msg.className = "ef-msg bad";
      }
    } catch (e) {
      msg.textContent = "Verbindung fehlgeschlagen. Bitte später erneut."; msg.className = "ef-msg bad";
    }
  }

  /* ---------- BILD ZUSCHNEIDEN ---------- */
  // Öffnet den Zuschneider und liefert per Callback eine quadratische Bilddatei
  function zuschneiden(file, fertig) {
    const overlay = $("#cropper");
    const stage = $("#cropStage");
    const img = $("#cropImg");
    const zoom = $("#cropZoom");
    const AUSGABE = 512;              // Kantenlänge des fertigen Bildes
    const RAHMEN = 260;              // Größe der Bühne (muss zum CSS passen)

    let natW = 0, natH = 0, basis = 1, scale = 1;
    let posX = 0, posY = 0;
    let drag = false, sx = 0, sy = 0, px = 0, py = 0;

    const url = URL.createObjectURL(file);
    img.onload = () => {
      natW = img.naturalWidth; natH = img.naturalHeight;
      // Basis-Skalierung: Bild füllt den Rahmen (kleinere Seite = Rahmen)
      basis = Math.max(RAHMEN / natW, RAHMEN / natH);
      zoom.value = "1";
      scale = basis;
      // zentrieren
      posX = (RAHMEN - natW * scale) / 2;
      posY = (RAHMEN - natH * scale) / 2;
      anwenden();
      overlay.classList.remove("hide");
    };
    img.src = url;

    function grenzen() {
      const w = natW * scale, h = natH * scale;
      posX = Math.min(0, Math.max(RAHMEN - w, posX));
      posY = Math.min(0, Math.max(RAHMEN - h, posY));
    }
    function anwenden() {
      grenzen();
      img.style.transform = `translate(${posX}px,${posY}px) scale(${scale})`;
    }

    zoom.oninput = () => {
      const faktor = parseFloat(zoom.value);
      const neu = basis * faktor;
      // um die Bildmitte zoomen
      const mx = RAHMEN / 2, my = RAHMEN / 2;
      const bx = (mx - posX) / scale, by = (my - posY) / scale;
      scale = neu;
      posX = mx - bx * scale;
      posY = my - by * scale;
      anwenden();
    };

    const start = (x, y) => { drag = true; sx = x; sy = y; px = posX; py = posY; };
    const move = (x, y) => { if (!drag) return; posX = px + (x - sx); posY = py + (y - sy); anwenden(); };
    const ende = () => { drag = false; };

    stage.onmousedown = e => { e.preventDefault(); start(e.clientX, e.clientY); };
    window.addEventListener("mousemove", mm);
    window.addEventListener("mouseup", mu);
    function mm(e) { move(e.clientX, e.clientY); }
    function mu() { ende(); }
    stage.ontouchstart = e => { const t = e.touches[0]; start(t.clientX, t.clientY); };
    stage.ontouchmove = e => { e.preventDefault(); const t = e.touches[0]; move(t.clientX, t.clientY); };
    stage.ontouchend = ende;

    function aufraeumen() {
      overlay.classList.add("hide");
      window.removeEventListener("mousemove", mm);
      window.removeEventListener("mouseup", mu);
      URL.revokeObjectURL(url);
    }

    $("#cropCancel").onclick = () => aufraeumen();
    $("#cropOk").onclick = () => {
      // Sichtbaren Kreisausschnitt in ein quadratisches Bild rendern
      const cv = document.createElement("canvas");
      cv.width = AUSGABE; cv.height = AUSGABE;
      const ctx = cv.getContext("2d");
      const f = AUSGABE / RAHMEN;
      // Position/Skalierung vom Rahmen auf die Ausgabegröße umrechnen
      ctx.drawImage(img, posX * f, posY * f, natW * scale * f, natH * scale * f);
      aufraeumen();
      cv.toBlob(blob => {
        if (!blob) return;
        const datei = new File([blob], "profil.jpg", { type: "image/jpeg" });
        fertig(datei, cv.toDataURL("image/jpeg", 0.9));
      }, "image/jpeg", 0.9);
    };
  }

  /* ---------- PROFIL ---------- */
  let profilAvatarDatei = null;

  function openProfilSheet() {
    if (!currentUser) return;
    const ava = currentUser.avatar;
    const initial = (currentUser.name || "?").slice(0, 1).toUpperCase();
    const body = `
      <div class="prof-head">
        <button type="button" class="ava-circle ${ava ? "filled" : ""}" id="pAvaBtn" aria-label="Profilbild ändern">
          <div class="ava-img" id="pAvaPrev" ${ava ? `style="background-image:url(${esc(ava)})"` : ""}></div>
          ${ava ? "" : `<div class="ava-letter">${esc(initial)}</div>`}
          <div class="ava-edit"><svg viewBox="0 0 24 24" fill="none" stroke="#052018" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></div>
        </button>
        <input type="file" id="pAvaFile" accept="image/*" class="hide">
        <div class="prof-cap" id="pAvaCap">Zum Ändern tippen</div>
      </div>
      ${efTitel("Konto")}
      ${ef("Name", "name", currentUser.name || "", "text", { pflicht: true })}
      ${ef("E-Mail", "email", currentUser.email || "", "email", { readonly: true, hinweis: "E-Mail kann derzeit nicht geändert werden" })}
      <div class="ef-actions">
        <button class="ef-save" id="pSave">Speichern</button>
      </div>
      <div class="ef-msg" id="pMsg"></div>
      ${efTitel("Darstellung")}
      <div class="ef-l">Hintergrund</div>
      <div class="theme-row" id="themeRow">
        ${THEMES.map(t => `<button type="button" class="theme-chip" data-theme="${t.id}" style="--sw:${t.bg}">
          <span class="theme-sw"></span>${esc(t.name)}</button>`).join("")}
      </div>
      <div class="ef-l" style="margin-top:14px">Akzentfarbe</div>
      <div class="accent-row" id="accentRow">
        ${AKZENTE.map(a => `<button type="button" class="accent-dot" data-accent="${a.id}"
          style="--ac:${a.farbe}" title="${esc(a.name)}" aria-label="${esc(a.name)}"></button>`).join("")}
      </div>
      ${efTitel("Hinweise")}
      <div class="opt-row">
        <div class="opt-tx">
          <div class="opt-n">Verbesserungs-Vorschläge</div>
          <div class="opt-m">Ab und zu ein Hinweis, wie du dein Portfolio vollständiger pflegst</div>
        </div>
        <button type="button" class="opt-schalter" id="pTipps" role="switch"><span></span></button>
      </div>
      ${efTitel("Tarif")}
      <div class="prof-tarif" id="pTarif"></div>
      <button class="up-cta" id="pTarifBtn" style="margin-top:12px">Tarif verwalten</button>
      ${efTitel("Konto")}
      <button class="up-cta" id="pLogout" style="margin-top:4px">Abmelden</button>
      ${efTitel("Gefahrenzone")}
      <button class="ef-del" id="pDel" style="width:100%">Konto löschen</button>
      <div class="ef-h" style="margin-top:8px">Löscht dein Konto und alle zugehörigen Daten unwiderruflich.</div>`;

    const sheet = openSheet("Mein Profil", currentUser.email || "", body);

    // Tarif-Status anzeigen — bildet den echten (Stripe-)Zustand ab
    const a = abo();
    const istOnboarding = a.roh_tarif === "onboarding";
    const tarifName = istOnboarding ? "Kein Abo"
      : a.tarif === "premium" ? "Premium"
      : a.tarif === "basic" ? "Basic"
      : a.tarif === "gesperrt" ? "Pausiert" : "Test";
    const ss = a.stripe_status || "";
    // Nur ein echtes Stripe-Trialing ist eine Testphase – nicht der Onboarding-Zustand
    const imTest = ss === "trialing";
    let statusZeile = "";
    if (istOnboarding) {
      statusZeile = "Wähle einen Tarif, um alle Funktionen zu behalten";
    } else if (a.tarif === "gesperrt") {
      statusZeile = "Bearbeiten pausiert — Daten bleiben lesbar";
    } else if (imTest && a.tarif_bis) {
      const tage = Math.max(0, Math.ceil((new Date(a.tarif_bis) - new Date()) / 86400000));
      statusZeile = `Testphase · noch ${tage} Tag${tage === 1 ? "" : "e"}, danach kostenpflichtig`;
    } else if (ss === "active" && a.tarif_bis) {
      const d = new Date(a.tarif_bis).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
      statusZeile = `Aktiv · verlängert sich am ${d}`;
    } else if (a.tarif === "basic") {
      statusZeile = `${a.objekte}/3 Objekte · ${a.einheiten}/10 Einheiten`;
    } else if (a.tarif === "premium") {
      statusZeile = ss === "demo_code" ? "Freigeschaltet (Demo)" : "Unbegrenzt";
    }
    const pt = sheet.querySelector("#pTarif");
    if (pt) pt.innerHTML = `
      <div class="pt-row">
        <div class="pt-name ${a.tarif}">${esc(tarifName)}</div>
        <div class="pt-status">${esc(statusZeile)}</div>
      </div>`;
    const ptb = sheet.querySelector("#pTarifBtn");
    if (ptb) ptb.onclick = () => { closeSheet(); openTarifSheet(); };
    const plo = sheet.querySelector("#pLogout");
    if (plo) plo.onclick = () => logout();

    // Schalter für Verbesserungs-Vorschläge
    const tp = sheet.querySelector("#pTipps");
    if (tp) {
      const setzen = () => tp.classList.toggle("an", currentUser && currentUser.tipps_an !== false);
      setzen();
      tp.onclick = async () => {
        const neu = !(currentUser && currentUser.tipps_an !== false);
        await tippsSchalten(neu); setzen();
      };
    }

    // Design: Hintergrund + Akzent, sofortige Vorschau, direkt gespeichert
    function markiere() {
      const tid = aktThemeId(), aid = aktAccentId();
      sheet.querySelectorAll("#themeRow .theme-chip").forEach(b =>
        b.classList.toggle("active", b.dataset.theme === tid));
      sheet.querySelectorAll("#accentRow .accent-dot").forEach(b =>
        b.classList.toggle("active", b.dataset.accent === aid));
    }
    sheet.querySelectorAll("#themeRow .theme-chip").forEach(b => b.onclick = () => {
      themeAnwenden(b.dataset.theme, aktAccentId());
      themeSpeichern(b.dataset.theme, aktAccentId());
      themeInDB(b.dataset.theme, aktAccentId());
      markiere();
    });
    sheet.querySelectorAll("#accentRow .accent-dot").forEach(b => b.onclick = () => {
      themeAnwenden(aktThemeId(), b.dataset.accent);
      themeSpeichern(aktThemeId(), b.dataset.accent);
      themeInDB(aktThemeId(), b.dataset.accent);
      markiere();
    });
    markiere();

    // Bildauswahl
    const avaBtn = sheet.querySelector("#pAvaBtn");
    const avaFile = sheet.querySelector("#pAvaFile");
    avaBtn.onclick = () => avaFile.click();
    avaFile.onchange = (ev) => {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        const m = sheet.querySelector("#pMsg");
        m.textContent = "Bild ist zu groß (max. 10 MB)."; m.className = "ef-msg bad"; return;
      }
      zuschneiden(file, (datei, vorschau) => {
        profilAvatarDatei = datei;
        const prev = sheet.querySelector("#pAvaPrev");
        prev.style.backgroundImage = `url(${vorschau})`;
        avaBtn.classList.add("filled");
        const letter = sheet.querySelector(".ava-letter");
        if (letter) letter.remove();
        sheet.querySelector("#pAvaCap").textContent = "Bild geändert";
      });
      ev.target.value = "";   // erneutes Wählen desselben Bildes erlauben
    };

    // Speichern
    sheet.querySelector("#pSave").onclick = async () => {
      const msg = sheet.querySelector("#pMsg");
      const name = sheet.querySelector('[data-f="name"]').value.trim();
      if (!name) { msg.textContent = "Bitte Namen eingeben."; msg.className = "ef-msg bad"; return; }
      msg.textContent = "Speichere…"; msg.className = "ef-msg";
      try {
        const werte = { name };
        if (profilAvatarDatei) {
          const url = await ladeAvatarHoch(currentUser.id, profilAvatarDatei);
          if (url) werte.avatar_url = url;
        }
        const { error } = await window.sb.from("mitglieder")
          .update(werte).eq("auth_user_id", currentUser.id);
        if (error) throw error;
        currentUser.name = name;
        currentUser.anrede = name.split(" ")[0];
        if (werte.avatar_url) currentUser.avatar = werte.avatar_url;
        profilAvatarDatei = null;
        closeSheet();
        route(currentView);   // Begrüßung mit neuem Bild/Namen neu zeichnen
      } catch (e) {
        msg.textContent = window.fehlerText(e);
        msg.className = "ef-msg bad";
      }
    };

    // Löschen (zweistufig)
    const del = sheet.querySelector("#pDel");
    del.onclick = async () => {
      if (del.dataset.sicher !== "1") {
        del.dataset.sicher = "1";
        del.textContent = "Wirklich? Konto endgültig löschen";
        del.classList.add("armed");
        setTimeout(() => {
          if (del.dataset.sicher === "1") {
            del.dataset.sicher = ""; del.textContent = "Konto löschen"; del.classList.remove("armed");
          }
        }, 4000);
        return;
      }
      const msg = sheet.querySelector("#pMsg");
      msg.textContent = "Konto wird gelöscht…"; msg.className = "ef-msg"; del.disabled = true;
      try {
        // Eigene Organisation entfernen (Objekte/Einheiten/Kredite/Pacht/Termine folgen per Kaskade,
        // das Mitglied ebenfalls). Das Auth-Konto selbst wird beim nächsten Schritt abgemeldet.
        const org = await window.meineOrgId();
        const { error } = await window.sb.from("organisationen").delete().eq("id", org);
        if (error) throw error;
        await window.sb.auth.signOut();
        location.reload();
      } catch (e) {
        msg.textContent = window.fehlerText(e);
        msg.className = "ef-msg bad"; del.disabled = false;
      }
    };
  }

  let regMode = false;            // false = anmelden, true = registrieren
  let avatarDatei = null;         // gewählte Bilddatei

  function setRegMode(on) {
    regMode = on;
    const zeig = (id, sichtbar) => { const n = $(id); if (n) n.classList.toggle("hide", !sichtbar); };
    zeig("#rowAvatar", on);
    zeig("#rowName", on);
    zeig("#rowConsent", on);
    zeig("#loginBtn", !on);
    zeig("#registerBtn", on);
    // Reiter-Optik
    $("#tabLogin").classList.toggle("active", !on);
    $("#tabRegister").classList.toggle("active", on);
    $("#tabInd").classList.toggle("right", on);
    $("#pw").setAttribute("autocomplete", on ? "new-password" : "current-password");
    $("#pw").value = "";
    $("#loginMsg").textContent = "";
    $("#loginMsg").className = "login-msg";
  }

  function waehleAvatar() {
    const f = $("#avaFile");
    if (f) f.click();
  }
  function avatarGewaehlt(ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      $("#loginMsg").textContent = "Bild ist zu groß (max. 10 MB).";
      $("#loginMsg").className = "login-msg bad";
      return;
    }
    zuschneiden(file, (datei, vorschau) => {
      avatarDatei = datei;
      $("#avaPrev").style.backgroundImage = `url(${vorschau})`;
      $("#avaBtn").classList.add("filled");
      $("#avaCap").textContent = "Bild ändern";
    });
    ev.target.value = "";
  }

  async function tryRegister() {
    const msg = $("#loginMsg");
    const name = $("#regName").value.trim();
    const mail = $("#mail").value.trim();
    const pw = $("#pw").value;
    if (!name) { msg.textContent = "Bitte Namen eingeben."; msg.className = "login-msg bad"; return; }
    if (!mail) { msg.textContent = "Bitte E-Mail eingeben."; msg.className = "login-msg bad"; return; }
    if (pw.length < 6) { msg.textContent = "Das Passwort muss mindestens 6 Zeichen lang sein."; msg.className = "login-msg bad"; return; }
    if (!$("#consentBox") || !$("#consentBox").checked) {
      msg.textContent = "Bitte stimme der Speicherung deiner Daten zu, um fortzufahren.";
      msg.className = "login-msg bad"; return;
    }
    msg.textContent = "Konto wird erstellt…"; msg.className = "login-msg";
    $("#registerBtn").disabled = true;

    // 1. Konto anlegen. Der Datenbank-Trigger legt automatisch die eigene Organisation an.
    const { data, error } = await window.sb.auth.signUp({
      email: mail, password: pw,
      options: { data: { name: name } }
    });
    if (error) {
      msg.textContent = window.fehlerText(error);
      msg.className = "login-msg bad";
      $("#registerBtn").disabled = false;
      return;
    }

    // 2. Ohne aktive Sitzung (E-Mail-Bestätigung nötig): Hinweis zeigen
    if (!data.session) {
      msg.textContent = "Fast fertig — bitte bestätige die E-Mail, die wir dir geschickt haben.";
      msg.className = "login-msg";
      $("#registerBtn").disabled = false;
      return;
    }

    // 3. Profilbild hochladen (falls gewählt)
    try {
      if (avatarDatei && data.user) {
        const url = await ladeAvatarHoch(data.user.id, avatarDatei);
        if (url) await window.sb.from("mitglieder")
          .update({ avatar_url: url }).eq("auth_user_id", data.user.id);
      }
    } catch (e) { console.error("Avatar:", e); }

    // 4. Direkt einloggen
    try {
      await ladeProfil(data.session);
      await window.ladeDaten();
      D = window.DASHBOARD_DATA;
      enterApp();
    } catch (e) {
      msg.textContent = "Dein Konto wurde erstellt. " + window.fehlerText(e);
      msg.className = "login-msg bad";
      $("#registerBtn").disabled = false;
    }
  }

  async function ladeAvatarHoch(userId, file) {
    const endung = (file.name.split(".").pop() || "jpg").toLowerCase();
    const pfad = `${userId}/profil.${endung}`;
    const { error } = await window.sb.storage.from("avatars")
      .upload(pfad, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const { data } = window.sb.storage.from("avatars").getPublicUrl(pfad);
    return data.publicUrl;
  }

  // Brücken für data-save.js
  window.setD = (neu) => { D = neu; };
  window.refreshView = () => {
    // Falls das aktuelle Objekt gelöscht wurde: zurück zur Übersicht
    const bekannt = currentView === "overview" || currentView === "vermietung"
      || (D.streams || []).some(x => x.id === currentView);
    buildRail();
    route(bekannt ? currentView : "overview");
  };

  function enterApp() {
    document.documentElement.classList.remove("pre-login");
    const lp = $("#landing"); if (lp) lp.classList.add("hide");
    const tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute("content", "#16181d");
    $("#login").classList.add("hide"); $("#app").classList.remove("hide");
    buildRail(); route("overview");
    // Rückkehr von der Stripe-Bezahlseite auswerten
    const params = new URLSearchParams(location.search);
    if (params.get("bezahlt") === "1") {
      localStorage.setItem("estriq_tarif_gewaehlt", "1");
      localStorage.setItem("estriq_onboarding_fertig", "1");
      localStorage.removeItem("estriq_checkout_aus_onboarding");
      geschichteBereinigen();
      // Der Webhook braucht evtl. 1–3 Sek. Mehrfach nachladen, bis der Tarif steht,
      // und danach die Übersicht sicher neu zeichnen.
      let versuche = 0;
      const nachladen = async () => {
        versuche++;
        try {
          await window.nachSpeichern();
          route("overview");   // Ansicht mit frischen Daten neu rendern
        } catch (_) {}
        const a = abo();
        // Weiter versuchen, solange noch kein echtes Stripe-Abo greift
        if (versuche < 4 && a && !a.hat_stripe) {
          setTimeout(nachladen, 1500);
        } else {
          showToast("Zahlung erfolgreich – dein Tarif ist aktiv.");
        }
      };
      setTimeout(nachladen, 1000);
      return;
    }
    if (params.get("abbruch") === "1") {
      geschichteBereinigen();
      // B1: Kam der Abbruch aus dem Onboarding, wird auf "nur lesen" gesetzt.
      // Der Nutzer sieht sein gefülltes Dashboard, kann aber nicht bearbeiten,
      // bis er einen Tarif wählt.
      if (localStorage.getItem("estriq_checkout_aus_onboarding") === "1") {
        localStorage.removeItem("estriq_checkout_aus_onboarding");
        (async () => {
          try {
            const org = await window.meineOrgId();
            const a = abo();
            // Nur sperren, wenn noch kein echtes Abo besteht
            if (a && a.roh_tarif === "onboarding" && !a.hat_stripe) {
              await window.sb.from("organisationen").update({ tarif: "gesperrt" }).eq("id", org);
              await window.nachSpeichern();
              route("overview");
            }
          } catch (_) {}
          showToast("Kein Tarif gewählt – du kannst dein Dashboard ansehen, aber nicht bearbeiten.");
        })();
      } else {
        showToast("Bezahlvorgang abgebrochen.");
      }
    }
    // Neuen Nutzern den Onboarding-Funnel zeigen (einmalig):
    // Farbe → erstes Objekt → Einheit → 3 Fragen → Abo-Empfehlung → Checkout
    try {
      const fertig = localStorage.getItem("estriq_onboarding_fertig");
      const a = abo();
      const nochKeinAbo = a && (a.roh_tarif === "onboarding" || a.roh_tarif === "test") && !a.hat_stripe;
      if (!fertig && nochKeinAbo) {
        setTimeout(() => openFarbwahlSheet({ onboarding: true }), 400);
        return;
      }
      // Sonst: fällige Mieten prüfen, danach ggf. ein Verbesserungs-Tipp
      setTimeout(() => { if (!pruefeMieteingaenge()) zeigeTippWennFaellig(); }, 600);
    } catch (_) {}
  }

  /* ---------- GEFÜHRTE EINGABE (ASSISTENT) ---------- */

  // Zeigt eine Frage pro Schritt. schritte = [{ id, frage, hinweis, typ, platzhalter,
  // einheit, pflicht, optionen:[{t,v}], vorgabe, ueberspringbar }]
  // aufFertig(antworten) wird am Ende aufgerufen.
  function openAssistent(titel, schritte, aufFertig) {
    const antworten = {};
    let idx = 0;
    const sheet = openSheet(titel, "", `<div id="asBody"></div>`);
    const bodyEl = sheet.querySelector("#asBody");

    function punkte() {
      return `<div class="wc-steps">${schritte.map((_, i) =>
        `<span class="${i < idx ? "done" : i === idx ? "on" : ""}"></span>`).join("")}</div>`;
    }

    function zeige() {
      const f = schritte[idx];
      const istWahl = !!f.optionen;
      bodyEl.innerHTML = `
        <div class="wc-hero" style="padding-bottom:16px">
          ${punkte()}
          <div class="wc-badge">Schritt ${idx + 1} von ${schritte.length}</div>
          <div class="wc-t" style="font-size:19px">${esc(f.frage)}</div>
          ${f.hinweis ? `<div class="wc-d">${esc(f.hinweis)}</div>` : ""}
        </div>
        ${istWahl
          ? `<div class="frage-opts">${f.optionen.map(o =>
              `<button class="frage-opt" data-v="${esc(o.v)}">${esc(o.t)}</button>`).join("")}</div>`
          : `<div class="as-feld">
               <input class="ef-i as-i" id="asInput" type="${f.typ || "text"}"
                 placeholder="${esc(f.platzhalter || "")}"
                 value="${esc(antworten[f.id] != null ? antworten[f.id] : (f.vorgabe != null ? f.vorgabe : ""))}"
                 ${f.typ === "number" ? 'inputmode="decimal" step="any"' : ""}>
               ${f.einheit ? `<span class="as-einheit">${esc(f.einheit)}</span>` : ""}
             </div>
             <div class="ef-msg" id="asMsg"></div>`}
        <div class="as-nav">
          ${istWahl ? "" : `<button class="wc-cta prem" id="asWeiter">${idx === schritte.length - 1 ? "Fertig" : "Weiter"}</button>`}
          ${idx > 0 ? `<button class="wc-cta" id="asZurueck" style="margin-top:10px">Zurück</button>` : ""}
          ${f.ueberspringbar && !istWahl ? `<div class="wc-skip"><a href="#" id="asSkip">Überspringen</a></div>` : ""}
        </div>`;

      if (istWahl) {
        bodyEl.querySelectorAll(".frage-opt").forEach(b => b.onclick = () => {
          antworten[f.id] = b.dataset.v; weiter();
        });
      } else {
        const inp = bodyEl.querySelector("#asInput");
        setTimeout(() => { try { inp.focus(); } catch (_) {} }, 120);
        const abschicken = () => {
          const wert = (inp.value || "").trim();
          if (f.pflicht && !wert) {
            const m = bodyEl.querySelector("#asMsg");
            m.textContent = "Bitte ausfüllen, um fortzufahren."; m.className = "ef-msg bad";
            return;
          }
          antworten[f.id] = wert; weiter();
        };
        bodyEl.querySelector("#asWeiter").onclick = abschicken;
        inp.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); abschicken(); } };
        const sk = bodyEl.querySelector("#asSkip");
        if (sk) sk.onclick = (e) => { e.preventDefault(); antworten[f.id] = ""; weiter(); };
      }
      const zb = bodyEl.querySelector("#asZurueck");
      if (zb) zb.onclick = () => { idx--; zeige(); };
    }

    async function weiter() {
      if (idx < schritte.length - 1) { idx++; zeige(); return; }
      // Letzter Schritt: speichern
      bodyEl.innerHTML = `<div class="wc-hero"><div class="wc-t" style="font-size:18px">Wird gespeichert…</div></div>`;
      try {
        await aufFertig(antworten);
      } catch (e) {
        bodyEl.innerHTML = `<div class="wc-hero">
          <div class="wc-t" style="font-size:18px">Das hat nicht geklappt</div>
          <div class="wc-d">${esc(window.fehlerText(e))}</div></div>
          <button class="wc-cta prem" id="asNochmal">Nochmal versuchen</button>`;
        bodyEl.querySelector("#asNochmal").onclick = () => { idx = schritte.length - 1; zeige(); };
      }
    }
    zeige();
    return sheet;
  }

  // Geführtes Anlegen eines Objekts
  function assistentObjekt(art, opt) {
    opt = opt || {};
    const istPacht = art === "pacht";
    const schritte = [
      { id: "name", frage: "Wie soll dein Objekt heißen?",
        hinweis: "Ein Name, unter dem du es wiedererkennst.",
        typ: "text", pflicht: true,
        platzhalter: istPacht ? "z. B. Ackerland Nord" : "z. B. Haus Bergstraße 12" },
      { id: "ort", frage: "Wo liegt das Objekt?",
        hinweis: "Nur für dich zur Orientierung – wird nirgends veröffentlicht.",
        typ: "text", ueberspringbar: true, platzhalter: "z. B. Bremen" },
      { id: "invest", frage: "Was hast du insgesamt investiert?",
        hinweis: "Kaufpreis inklusive Nebenkosten wie Notar, Grunderwerbsteuer und Makler. Daraus berechnet ESTRIQ deine Rendite.",
        typ: "number", einheit: "€", pflicht: true, platzhalter: "z. B. 250000" }
    ];
    if (!istPacht) {
      schritte.push({
        id: "nk_als_puffer", frage: "Wie sollen Nebenkosten behandelt werden?",
        hinweis: "Als Rücklage bedeutet: Die Nebenkosten deiner Mieter werden für Ausgaben zurückgelegt und nicht als Gewinn gezählt. Das ist die vorsichtigere Rechnung.",
        optionen: [
          { t: "Als Rücklage zurücklegen", v: "1" },
          { t: "Als Ertrag mitzählen", v: "0" }
        ]
      });
    }
    openAssistent(istPacht ? "Landpacht anlegen" : (art === "airbnb" ? "Kurzzeitvermietung anlegen" : "Objekt anlegen"),
      schritte, async (a) => {
        await neuesObjekt({
          name: a.name || "Objekt",
          slug: (a.name || "objekt").toLowerCase().replace(/[^a-z0-9-]/g, "-"),
          art: art,
          icon: ART_ICON[art] || "home",
          ort: a.ort || "",
          notiz: "",
          invest: Number(String(a.invest).replace(",", ".")) || null,
          nk_als_puffer: a.nk_als_puffer === "1",
          nk_positionen: null
        });
        closeSheet();
        await window.nachSpeichern();
        const streams = (D.streams || []);
        const neuesObj = streams[streams.length - 1];
        if (opt.nachOnboarding) {
          if (art === "miete" && neuesObj) setTimeout(() => assistentEinheit(neuesObj, { nachOnboarding: true }), 300);
          else setTimeout(() => openTarifFragenSheet(), 300);
        } else {
          showToast("Objekt angelegt.");
          if (art === "miete" && neuesObj) setTimeout(() => assistentEinheit(neuesObj), 350);
        }
      });
  }

  // Geführtes Anlegen einer Einheit
  function assistentEinheit(s, opt) {
    opt = opt || {};
    const schritte = [
      { id: "bezeichnung", frage: "Wie heißt diese Wohneinheit?",
        hinweis: "Zum Beispiel nach Lage oder Nummer.",
        typ: "text", pflicht: true, platzhalter: "z. B. Erdgeschoss links" },
      { id: "status", frage: "Ist die Einheit vermietet?",
        optionen: [
          { t: "Ja, sie ist vermietet", v: "vermietet" },
          { t: "Nein, sie steht leer", v: "frei" }
        ] },
      { id: "flaeche", frage: "Wie groß ist die Wohnung?",
        hinweis: "Die Wohnfläche in Quadratmetern.",
        typ: "number", einheit: "m²", ueberspringbar: true, platzhalter: "z. B. 72" },
      { id: "kalt_fix", frage: "Wie hoch ist die Kaltmiete?",
        hinweis: "Die reine Miete pro Monat, ohne Nebenkosten.",
        typ: "number", einheit: "€ / Monat", pflicht: true, platzhalter: "z. B. 650" },
      { id: "nk_fix", frage: "Was zahlt der Mieter an Nebenkosten?",
        hinweis: "Die monatliche Vorauszahlung für Heizung, Wasser, Müll und so weiter.",
        typ: "number", einheit: "€ / Monat", ueberspringbar: true, platzhalter: "z. B. 180" },
      { id: "zahltag", frage: "An welchem Tag im Monat kommt die Miete?",
        hinweis: "Ab diesem Tag fragt ESTRIQ beim Login nach, ob die Zahlung eingegangen ist.",
        typ: "number", einheit: "des Monats", vorgabe: 1, platzhalter: "1" },
      { id: "mieter", frage: "Wer wohnt dort?",
        hinweis: "Der Name deines Mieters – hilfreich für die Zahlungskontrolle.",
        typ: "text", ueberspringbar: true, platzhalter: "z. B. Familie Müller" }
    ];
    openAssistent("Einheit anlegen", schritte, async (a) => {
      const z = (v) => { const n = Number(String(v).replace(",", ".")); return isFinite(n) && v !== "" ? n : null; };
      await neueEinheit(s._id, {
        bezeichnung: a.bezeichnung || "Einheit",
        flaeche: z(a.flaeche),
        status: a.status || "vermietet",
        kalt_fix: z(a.kalt_fix), nk_fix: z(a.nk_fix),
        zahltag: Math.min(31, Math.max(1, Number(a.zahltag) || 1)),
        mieter: a.mieter || "", einzug: null,
        vertrag: {}
      });
      closeSheet();
      await window.nachSpeichern();
      if (opt.nachOnboarding) setTimeout(() => openTarifFragenSheet(), 300);
      else { showToast("Einheit angelegt – deine Zahlen sind aktualisiert."); route(s.id); }
    });
  }

  /* ---------- VERBESSERUNGS-TIPPS ---------- */

  // Sucht echte Lücken im Portfolio und macht daraus konkrete Vorschläge
  function findeTipps() {
    const t = [];
    const streams = (D.streams || []);
    if (!streams.length) return t;

    streams.forEach(s => {
      if (s.kind === "pacht") return;
      // Fehlende Investitionssumme -> keine Rendite berechenbar
      if (!s.invest) {
        t.push({
          titel: "Rendite für " + s.name + " freischalten",
          text: "Ohne Investitionssumme kann ESTRIQ keine Rendite berechnen. Trag den Kaufpreis inkl. Nebenkosten ein.",
          aktion: "Jetzt eintragen", ziel: () => pflegeInvest(s)
        });
      }
      // Objekt ohne Einheiten
      if (s.kind === "miete" && !(s.einheiten || []).length) {
        t.push({
          titel: s.name + " hat noch keine Einheit",
          text: "Leg eine Wohnung an, damit Einnahmen und Auslastung berechnet werden.",
          aktion: "Einheit anlegen", ziel: () => assistentEinheit(s)
        });
      }
      // Freie Einheiten -> Potenzial sichtbar machen
      (s.einheiten || []).forEach(u => {
        if (u.status !== "vermietet") {
          const i = FE.unitIncome(u);
          if (i.gesamt > 0) {
            t.push({
              titel: (u.wohnung || "Eine Einheit") + " steht leer",
              text: "Bei Vermietung kämen " + eur(i.gesamt) + " im Monat dazu – das sind " + eur(i.gesamt * 12) + " im Jahr.",
              aktion: "Status prüfen", ziel: () => pflegeLeerstand(s, u)
            });
          }
        }
        // Vermietet, aber kein Mieter hinterlegt
        if (u.status === "vermietet" && !u.mieter) {
          t.push({
            titel: "Mieter bei " + (u.wohnung || "einer Einheit") + " ergänzen",
            text: "Mit hinterlegtem Mieter behältst du Verträge und Zahlungseingänge besser im Blick.",
            aktion: "Mieter eintragen", ziel: () => pflegeMieter(s, u)
          });
        }
      });
      // Keine Nebenkosten hinterlegt
      if (s.kind === "miete" && !(s.nkPositionen || []).length) {
        t.push({
          titel: "Nebenkosten bei " + s.name + " erfassen",
          text: "Trag Grundsteuer, Versicherung & Co. ein, damit dein Cashflow realistisch wird.",
          aktion: "Jetzt erfassen", ziel: () => pflegeNebenkosten(s)
        });
      }
    });
    return t;
  }

  function zeigeTippWennFaellig() {
    try {
      if (currentUser && currentUser.tipps_an === false) return;   // im Profil abgeschaltet
      const n = Number(localStorage.getItem("estriq_login_zaehler") || "0") + 1;
      localStorage.setItem("estriq_login_zaehler", String(n));
      if (n % 3 !== 0) return;                                     // nur jeden dritten Login
      const tipps = findeTipps();
      if (!tipps.length) return;
      // Wechselnden Tipp zeigen, damit es nicht immer derselbe ist
      const idx = Math.floor(n / 3) % tipps.length;
      openTippSheet(tipps[idx]);
    } catch (_) {}
  }

  function openTippSheet(tipp) {
    const body = `
      <div class="wc-hero" style="padding-bottom:10px">
        <div class="wc-badge">Vorschlag für dich</div>
        <div class="wc-t" style="font-size:19px">${esc(tipp.titel)}</div>
        <div class="wc-d">${esc(tipp.text)}</div>
      </div>
      <button class="wc-cta prem" id="tippGo">${esc(tipp.aktion)}</button>
      <button class="wc-cta" id="tippSpaeter" style="margin-top:10px">Nicht jetzt</button>
      <div class="wc-skip"><a href="#" id="tippAus">Solche Vorschläge abschalten</a></div>`;
    const sheet = openSheet("Tipp", "", body);
    sheet.querySelector("#tippGo").onclick = () => { closeSheet(); setTimeout(() => tipp.ziel(), 250); };
    sheet.querySelector("#tippSpaeter").onclick = () => closeSheet();
    sheet.querySelector("#tippAus").onclick = async (e) => {
      e.preventDefault();
      await tippsSchalten(false);
      closeSheet(); showToast("Vorschläge abgeschaltet – im Profil jederzeit wieder einschaltbar.");
    };
  }

  // Einstellung speichern (geräteübergreifend am Nutzer)
  async function tippsSchalten(an) {
    try {
      if (currentUser) currentUser.tipps_an = an;
      if (window.sb && currentUser) {
        await window.sb.from("mitglieder").update({ tipps_an: an }).eq("auth_user_id", currentUser.id);
      }
    } catch (_) {}
  }

  /* ---------- GEFÜHRTE NACHPFLEGE (aus Tipps) ---------- */

  const alsZahl = (v) => {
    const n = Number(String(v == null ? "" : v).replace(",", "."));
    return (isFinite(n) && String(v).trim() !== "") ? n : null;
  };

  // Investitionssumme nachtragen → schaltet die Rendite frei
  function pflegeInvest(s) {
    openAssistent("Rendite freischalten", [
      { id: "invest", frage: "Was hast du in " + s.name + " investiert?",
        hinweis: "Kaufpreis inklusive Nebenkosten wie Notar, Grunderwerbsteuer und Makler. Daraus berechnet ESTRIQ deine Rendite.",
        typ: "number", einheit: "€", pflicht: true, platzhalter: "z. B. 250000" }
    ], async (a) => {
      await speichereObjekt(s._id, { invest: alsZahl(a.invest) });
      closeSheet(); await window.nachSpeichern();
      showToast("Rendite wird jetzt berechnet."); route(s.id);
    });
  }

  // Mieter nachtragen
  function pflegeMieter(s, u) {
    openAssistent("Mieter eintragen", [
      { id: "mieter", frage: "Wer wohnt in " + (u.wohnung || "dieser Einheit") + "?",
        hinweis: "Der Name hilft dir bei der Zahlungskontrolle und den Verträgen.",
        typ: "text", pflicht: true, platzhalter: "z. B. Familie Müller" },
      { id: "einzug", frage: "Seit wann wohnt die Person dort?",
        hinweis: "Kannst du auch später ergänzen.",
        typ: "date", ueberspringbar: true }
    ], async (a) => {
      await speichereEinheit(u._id, { mieter: a.mieter || null, einzug: a.einzug || null });
      closeSheet(); await window.nachSpeichern();
      showToast("Mieter gespeichert."); route(s.id);
    });
  }

  // Leerstand prüfen → ggf. auf vermietet setzen
  function pflegeLeerstand(s, u) {
    openAssistent("Status prüfen", [
      { id: "jetzt_vermietet", frage: "Ist " + (u.wohnung || "die Einheit") + " inzwischen vermietet?",
        hinweis: "Sobald du sie als vermietet führst, fließt die Miete in deine Einnahmen ein.",
        optionen: [
          { t: "Ja, sie ist vermietet", v: "ja" },
          { t: "Nein, sie steht weiter leer", v: "nein" }
        ] },
      { id: "mieter", frage: "Wer wohnt dort?",
        hinweis: "Der Name hilft bei der Zahlungskontrolle.",
        typ: "text", ueberspringbar: true, platzhalter: "z. B. Familie Müller" }
    ], async (a) => {
      if (a.jetzt_vermietet === "ja") {
        await speichereEinheit(u._id, { status: "vermietet", mieter: a.mieter || null });
        closeSheet(); await window.nachSpeichern();
        showToast("Einheit ist jetzt als vermietet erfasst.");
      } else {
        closeSheet();
        showToast("Alles klar – Status bleibt unverändert.");
      }
      route(s.id);
    });
  }

  // Nebenkosten geführt erfassen
  function pflegeNebenkosten(s) {
    openAssistent("Nebenkosten erfassen", [
      { id: "grundsteuer", frage: "Wie viel Grundsteuer zahlst du?",
        hinweis: "Pro Monat. Wenn du den Jahresbetrag kennst, teile ihn durch zwölf.",
        typ: "number", einheit: "€ / Monat", ueberspringbar: true, platzhalter: "z. B. 45" },
      { id: "versicherung", frage: "Was kostet die Versicherung?",
        hinweis: "Gebäude- und Haftpflichtversicherung, pro Monat.",
        typ: "number", einheit: "€ / Monat", ueberspringbar: true, platzhalter: "z. B. 60" },
      { id: "hausgeld", frage: "Zahlst du Hausgeld oder Verwaltung?",
        hinweis: "Zum Beispiel an die Hausverwaltung, pro Monat.",
        typ: "number", einheit: "€ / Monat", ueberspringbar: true, platzhalter: "z. B. 120" },
      { id: "sonstige", frage: "Gibt es weitere laufende Kosten?",
        hinweis: "Zum Beispiel Wartung, Gartenpflege oder Schornsteinfeger – zusammengefasst pro Monat.",
        typ: "number", einheit: "€ / Monat", ueberspringbar: true, platzhalter: "z. B. 30" }
    ], async (a) => {
      const pos = [];
      const nimm = (titel, wert) => { const n = alsZahl(wert); if (n) pos.push({ titel: titel, betrag: n }); };
      nimm("Grundsteuer", a.grundsteuer);
      nimm("Versicherung", a.versicherung);
      nimm("Hausgeld / Verwaltung", a.hausgeld);
      nimm("Sonstige Kosten", a.sonstige);
      await speichereObjekt(s._id, { nk_positionen: pos.length ? pos : null });
      closeSheet(); await window.nachSpeichern();
      showToast(pos.length ? "Nebenkosten gespeichert." : "Keine Angaben – nichts geändert.");
      route(s.id);
    });
  }

  /* ---------- MIETKONTROLLE ---------- */

  // Liefert alle Einheiten, deren Miete diesen Monat fällig, aber noch nicht bestätigt ist
  function offeneMieten() {
    const jetzt = new Date();
    const tagHeute = jetzt.getDate();
    const jahr = jetzt.getFullYear(), monat = jetzt.getMonth() + 1;
    const zahlungen = (D.zahlungen || []);
    const erledigt = new Set(zahlungen.filter(z => z.status === "eingegangen").map(z => z.einheit_id));
    const offen = [];
    (D.streams || []).filter(s => s.kind === "miete").forEach(s => {
      (s.einheiten || []).forEach(u => {
        if (u.status !== "vermietet") return;          // nur vermietete Einheiten
        const zahltag = Number(u.zahltag) || 1;
        if (tagHeute < zahltag) return;                // noch nicht fällig
        if (erledigt.has(u._id)) return;               // schon bestätigt
        const i = FE.unitIncome(u);
        offen.push({ objekt: s, einheit: u, soll: i.gesamt, jahr, monat });
      });
    });
    return offen;
  }

  // Beim Login: fällige Mieten abfragen. Gibt true zurück, wenn ein Fenster geöffnet wurde.
  function pruefeMieteingaenge() {
    // "Später erinnern" gilt bis zum nächsten Login
    if (sessionStorage.getItem("estriq_miete_spaeter") === "1") return false;
    const offen = offeneMieten();
    if (!offen.length) return false;
    openMietCheckSheet(offen);
    return true;
  }

  function openMietCheckSheet(offen) {
    const monatName = new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    // Nach Objekt gruppieren
    const gruppen = {};
    offen.forEach(o => {
      const k = o.objekt._id;
      if (!gruppen[k]) gruppen[k] = { name: o.objekt.name, icon: o.objekt.icon || "home", zeilen: [] };
      gruppen[k].zeilen.push(o);
    });
    const summe = offen.reduce((a, o) => a + o.soll, 0);

    const body = `
      <div class="wc-hero" style="padding-bottom:14px">
        <div class="wc-badge">Mietkontrolle · ${esc(monatName)}</div>
        <div class="wc-t">Sind diese Mieten eingegangen?</div>
        <div class="wc-d">${offen.length} ${offen.length === 1 ? "Zahlung ist" : "Zahlungen sind"} fällig · zusammen ${eur(summe)}</div>
      </div>
      <div id="mkListe">
        ${Object.keys(gruppen).map(k => `
          <div class="mk-obj">
            <div class="mk-obj-h">${svg(gruppen[k].icon)}<span>${esc(gruppen[k].name)}</span></div>
            ${gruppen[k].zeilen.map(o => `
              <div class="mk-row" data-einheit="${o.einheit._id}">
                <div class="mk-tx">
                  <div class="mk-n">${esc(o.einheit.wohnung || "Einheit")}</div>
                  <div class="mk-m">${esc(o.einheit.mieter || "ohne Mieter")} · fällig am ${Number(o.einheit.zahltag) || 1}.</div>
                </div>
                <div class="mk-soll">${eur(o.soll)}</div>
                <button class="mk-ok" data-einheit="${o.einheit._id}" data-betrag="${o.soll}">Eingegangen</button>
              </div>`).join("")}
          </div>`).join("")}
      </div>
      <div class="ef-msg" id="mkMsg"></div>
      <div class="mk-actions">
        <button class="wc-cta prem" id="mkAlle">Alle als eingegangen bestätigen</button>
        <button class="wc-cta" id="mkSpaeter">Später erinnern</button>
      </div>`;
    const sheet = openSheet("Mieteingänge", "", body);
    const msg = sheet.querySelector("#mkMsg");

    async function bestaetige(einheitId, betrag, zeile) {
      const jetzt = new Date();
      try {
        await window.mietEingangSetzen(einheitId, jetzt.getFullYear(), jetzt.getMonth() + 1, "eingegangen", betrag);
        if (zeile) { zeile.classList.add("erledigt"); const b = zeile.querySelector(".mk-ok"); if (b) { b.textContent = "Bestätigt"; b.disabled = true; } }
        return true;
      } catch (e) {
        msg.textContent = window.fehlerText(e); msg.className = "ef-msg bad";
        return false;
      }
    }

    sheet.querySelectorAll(".mk-ok").forEach(b => b.onclick = async () => {
      b.disabled = true; b.textContent = "…";
      const ok = await bestaetige(b.dataset.einheit, Number(b.dataset.betrag), b.closest(".mk-row"));
      if (!ok) { b.disabled = false; b.textContent = "Eingegangen"; return; }
      // Wenn alle erledigt sind, Fenster schließen
      if (!sheet.querySelectorAll(".mk-row:not(.erledigt)").length) {
        await window.nachSpeichern(); closeSheet(); showToast("Mieteingänge gespeichert.");
      }
    });

    sheet.querySelector("#mkAlle").onclick = async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true; btn.textContent = "Speichere…";
      let ok = 0, fehler = 0;
      for (const b of sheet.querySelectorAll(".mk-row:not(.erledigt) .mk-ok")) {
        const r = await bestaetige(b.dataset.einheit, Number(b.dataset.betrag), b.closest(".mk-row"));
        r ? ok++ : fehler++;
      }
      if (fehler) {
        // Nicht schließen und keinen Erfolg melden, wenn etwas schiefging
        btn.disabled = false; btn.textContent = "Erneut versuchen";
        return;
      }
      await window.nachSpeichern();
      // Gegenprobe: steht es wirklich in der Datenbank?
      const nochOffen = offeneMieten().length;
      closeSheet();
      showToast(nochOffen
        ? "Gespeichert, aber es sind noch " + nochOffen + " Zahlungen offen."
        : "Alle Mieteingänge bestätigt.");
    };

    sheet.querySelector("#mkSpaeter").onclick = () => {
      sessionStorage.setItem("estriq_miete_spaeter", "1");
      closeSheet();
      showToast("Wir erinnern dich beim nächsten Login.");
    };
  }

  // Entfernt ?bezahlt / ?abbruch aus der Adresszeile
  function geschichteBereinigen() {
    try { history.replaceState(null, "", location.origin + location.pathname); } catch (_) {}
  }

  // Kurze Einblend-Nachricht am unteren Rand
  function showToast(text) {
    let t = $("#toast");
    if (!t) { t = el(`<div id="toast" class="toast"></div>`); document.body.appendChild(t); }
    t.textContent = text;
    t.classList.add("on");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("on"), 3500);
  }

  // Willkommen: Abo wählen (30 Tage Test)
  // Onboarding-Schritt 1: Farbschema wählen
  function openFarbwahlSheet(opt) {
    opt = opt || {};
    const themeChips = THEMES.map(t => `<button type="button" class="theme-chip" data-theme="${t.id}" style="--sw:${t.bg}">
      <span class="theme-sw"></span>${esc(t.name)}</button>`).join("");
    const accentDots = AKZENTE.map(a => `<button type="button" class="accent-dot" data-accent="${a.id}"
      style="--ac:${a.farbe}" title="${esc(a.name)}" aria-label="${esc(a.name)}"></button>`).join("");
    const body = `
      <div class="wc-hero">
        ${opt.onboarding ? `<img src="estriq.PNG" alt="ESTRIQ" class="wc-logo" onerror="this.style.display='none'">` : ""}
        ${opt.onboarding ? `<div class="wc-steps"><span class="on"></span><span></span><span></span></div>` : ""}
        <div class="wc-badge">${opt.onboarding ? "Willkommen bei ESTRIQ" : "Darstellung"}</div>
        <div class="wc-t">Mach es zu deinem</div>
        <div class="wc-d">Wähle Hintergrund und Akzentfarbe. Du kannst das jederzeit im Profil ändern — die Auswahl gilt auf all deinen Geräten.</div>
      </div>
      <div class="ef-l">Hintergrund</div>
      <div class="theme-row" id="wcTheme">${themeChips}</div>
      <div class="ef-l" style="margin-top:16px">Akzentfarbe</div>
      <div class="accent-row" id="wcAccent">${accentDots}</div>
      <button class="wc-cta prem" id="wcDone" style="margin-top:24px">${opt.onboarding ? "Weiter" : "Speichern"}</button>`;
    const sheet = openSheet("Darstellung", "", body);

    function markiere() {
      const tid = aktThemeId(), aid = aktAccentId();
      sheet.querySelectorAll("#wcTheme .theme-chip").forEach(b => b.classList.toggle("active", b.dataset.theme === tid));
      sheet.querySelectorAll("#wcAccent .accent-dot").forEach(b => b.classList.toggle("active", b.dataset.accent === aid));
    }
    sheet.querySelectorAll("#wcTheme .theme-chip").forEach(b => b.onclick = () => {
      themeAnwenden(b.dataset.theme, aktAccentId()); themeSpeichern(b.dataset.theme, aktAccentId()); markiere();
    });
    sheet.querySelectorAll("#wcAccent .accent-dot").forEach(b => b.onclick = () => {
      themeAnwenden(aktThemeId(), b.dataset.accent); themeSpeichern(aktThemeId(), b.dataset.accent); markiere();
    });
    markiere();
    sheet.querySelector("#wcDone").onclick = async () => {
      await themeInDB(aktThemeId(), aktAccentId());
      if (opt.onboarding) { closeSheet(); setTimeout(() => openErstesObjektSheet(), 250); }
      else { closeSheet(); }
    };
  }

  // Onboarding-Schritt 2: erstes Objekt anlegen (erzeugt Bindung)
  function openErstesObjektSheet() {
    const body = `
      <div class="wc-hero">
        <div class="wc-steps"><span class="done"></span><span class="on"></span><span></span></div>
        <div class="wc-badge">Erster Schritt in dein Portfolio</div>
        <div class="wc-t">Leg dein erstes Objekt an</div>
        <div class="wc-d">Trag eine Immobilie ein, die du vermietest. Du siehst sofort, wie ESTRIQ deine Einnahmen und Rendite berechnet.</div>
      </div>
      <div class="ob-arten">
        <button class="ob-art" data-art="miete">${svg("home")}<div><div class="ob-art-n">Vermietung</div><div class="ob-art-m">Wohnung oder Haus mit Mietern</div></div></button>
        <button class="ob-art" data-art="airbnb">${svg("bed")}<div><div class="ob-art-n">Kurzzeitvermietung</div><div class="ob-art-m">Ferienwohnung, AirBNB & Co.</div></div></button>
        <button class="ob-art" data-art="pacht">${svg("sprout")}<div><div class="ob-art-n">Landpacht</div><div class="ob-art-m">Acker- oder Grünland</div></div></button>
      </div>
      <div class="wc-skip"><a href="#" id="obSkip">Überspringen</a></div>`;
    const sheet = openSheet("Erstes Objekt", "", body);
    sheet.querySelectorAll(".ob-art").forEach(b => b.onclick = () => {
      const art = b.dataset.art;
      closeSheet();
      // Nach dem Speichern des Objekts geht es weiter zu den Fragen
      setTimeout(() => assistentObjekt(art, { nachOnboarding: true }), 200);
    });
    sheet.querySelector("#obSkip").onclick = (e) => { e.preventDefault(); closeSheet(); setTimeout(() => openTarifFragenSheet(), 200); };
  }

  // Onboarding-Schritt 3: drei Fragen → Abo-Empfehlung
  function openTarifFragenSheet() {
    const fragen = [
      { id: "objekte", frage: "Wie viele Immobilien möchtest du verwalten?",
        hinweis: "Das bestimmt, wie viel Struktur du brauchst.",
        opt: [
          { t: "1 – 3 Objekte", v: "wenige" },
          { t: "4 – 10 Objekte", v: "mittel" },
          { t: "Mehr als 10", v: "viele" }
        ] },
      { id: "arten", frage: "Welche Arten der Vermietung nutzt du?",
        hinweis: "Ferienwohnungen und Landpacht brauchen spezielle Auswertungen.",
        opt: [
          { t: "Nur klassische Vermietung", v: "miete" },
          { t: "Auch Ferienwohnung / AirBNB", v: "airbnb" },
          { t: "Auch verpachtetes Land", v: "pacht" }
        ] },
      { id: "auswertung", frage: "Wie tief möchtest du deine Zahlen auswerten?",
        hinweis: "ESTRIQ rechnet Rendite, Cashflow, Tilgung und Reserven – je mehr Objekte, desto wertvoller der Gesamtüberblick.",
        opt: [
          { t: "Überblick über meine Einnahmen genügt", v: "basis" },
          { t: "Rendite und Cashflow je Objekt", v: "detail" },
          { t: "Volles Controlling über alle Objekte", v: "voll" }
        ] }
    ];
    const antworten = {};
    let idx = 0;

    const sheet = openSheet("Kurz gefragt", "", `<div id="fragenBody"></div>`);
    const bodyEl = sheet.querySelector("#fragenBody");

    function zeigeFrage() {
      const f = fragen[idx];
      bodyEl.innerHTML = `
        <div class="wc-hero">
          <div class="wc-steps"><span class="done"></span><span class="done"></span><span class="on"></span></div>
          <div class="wc-badge">Frage ${idx + 1} von ${fragen.length}</div>
          <div class="wc-t" style="font-size:19px">${esc(f.frage)}</div>
          <div class="wc-d">${esc(f.hinweis)}</div>
        </div>
        <div class="frage-opts">
          ${f.opt.map(o => `<button class="frage-opt" data-v="${o.v}">${esc(o.t)}</button>`).join("")}
        </div>`;
      bodyEl.querySelectorAll(".frage-opt").forEach(b => b.onclick = () => {
        antworten[f.id] = b.dataset.v;
        if (idx < fragen.length - 1) { idx++; zeigeFrage(); }
        else { closeSheet(); setTimeout(() => openEmpfehlungSheet(antworten), 200); }
      });
    }
    zeigeFrage();
  }

  // Onboarding-Schritt 4: Empfehlung + Checkout
  function openEmpfehlungSheet(antworten) {
    // Entscheidung: Premium wenn viele Objekte ODER AirBNB/Pacht ODER volles Controlling
    const brauchtPremium =
      antworten.objekte === "mittel" || antworten.objekte === "viele" ||
      antworten.arten === "airbnb" || antworten.arten === "pacht" ||
      antworten.auswertung === "voll";
    const plan = brauchtPremium ? "premium" : "basic";
    const preis = brauchtPremium ? "29,99 €" : "19,99 €";
    const name = brauchtPremium ? "Premium" : "Basic";
    const begruendung = brauchtPremium
      ? "Weil du mehrere Objekte oder besondere Vermietungsarten nutzt, empfehlen wir Premium – unbegrenzt Objekte, AirBNB und Landpacht inklusive."
      : "Für deinen Einstieg genügt Basic – bis zu 3 Objekte und 10 Einheiten mit allen Auswertungen. Wechseln kannst du jederzeit.";

    const body = `
      <div class="wc-hero">
        <div class="wc-steps"><span class="done"></span><span class="done"></span><span class="done"></span></div>
        <div class="wc-badge">Unsere Empfehlung für dich</div>
        <div class="wc-t">${name}</div>
        <div class="wc-d">${begruendung}</div>
      </div>
      <div class="empf-plan ${plan === "premium" ? "premium" : ""}">
        <div class="empf-top">
          <div class="empf-n">${name}</div>
          <div class="empf-p">${preis}<span>/Monat</span></div>
        </div>
        <ul class="wc-feats">
          ${brauchtPremium
            ? "<li>Unbegrenzt Objekte & Einheiten</li><li>AirBNB & Landpacht</li><li>Volles Controlling</li>"
            : "<li>Bis zu 3 Objekte</li><li>Bis zu 10 Einheiten</li><li>Alle Auswertungen</li>"}
        </ul>
      </div>
      <button class="wc-cta prem" id="empfCta" style="margin-top:8px">30 Tage kostenlos testen</button>
      <button class="wc-cta" id="empfAlt" style="margin-top:10px">${brauchtPremium ? "Lieber mit Basic starten" : "Doch lieber Premium ansehen"}</button>
      <div class="wc-note" style="margin-top:14px">Erster Monat kostenlos · jederzeit kündbar · danach ${preis}/Monat</div>`;
    const sheet = openSheet("Dein Tarif", "", body);

    sheet.querySelector("#empfCta").onclick = () => onboardingCheckout(plan, sheet.querySelector("#empfCta"));
    sheet.querySelector("#empfAlt").onclick = () => {
      const anderer = plan === "premium" ? "basic" : "premium";
      onboardingCheckout(anderer, sheet.querySelector("#empfAlt"));
    };
  }

  // Checkout aus dem Onboarding: markiert Fluss als fertig, dann zu Stripe
  async function onboardingCheckout(plan, btn) {
    const alt = btn.textContent;
    btn.disabled = true; btn.textContent = "Bezahlseite wird geöffnet…";
    try {
      localStorage.setItem("estriq_onboarding_fertig", "1");
      localStorage.setItem("estriq_checkout_aus_onboarding", "1");   // für B1 bei Abbruch
      const { data: { session } } = await window.sb.auth.getSession();
      const token = session && session.access_token;
      const res = await fetch(window.SB_FUNKTION + "/checkout-starten", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({
          plan,
          erfolg_url: location.origin + location.pathname + "?bezahlt=1",
          abbruch_url: location.origin + location.pathname + "?abbruch=1"
        })
      });
      const j = await res.json();
      if (j.url) { location.href = j.url; }
      else { btn.disabled = false; btn.textContent = alt; showToast(j.fehler || "Konnte nicht öffnen."); }
    } catch (e) {
      btn.disabled = false; btn.textContent = alt; showToast("Verbindung fehlgeschlagen.");
    }
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
      ...rest,
      { id: "tools", label: "Tools", icon: "chart" }
    ];
  }
  function shortLabel(n) { return (n || "").split(" · ")[0]; }

  function buildRail() {
    const rail = $("#rail");
    const mobil = window.innerWidth <= 560;
    if (mobil) { buildRailMobil(rail); return; }
    const spacer = rail.querySelector(".rail-spacer");
    // remove old nav buttons (keep mark, spacer, profile, logout, add)
    $$(".rail-btn:not(.logout):not(.profile):not(.rail-add)", rail).forEach(b => b.remove());
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

  // Handy: feste Leiste — Neu · Übersicht · Objekte · Profil · Logout
  function buildRailMobil(rail) {
    rail.innerHTML = "";
    const mk = (cls, icon, label, fn, extra) => {
      const b = el(`<button class="rail-btn ${cls}" title="${esc(label)}">
        ${svg(icon)}<span class="tip">${esc(label)}</span></button>`);
      b.onclick = fn;
      rail.appendChild(b);
      return b;
    };
    mk("rail-add", "plus", "Neu", (e) => { e.stopPropagation(); openAnlegenMenu(rail); });
    mk("", "grid", "Übersicht", () => route("overview"));
    const objBtn = mk("", "home", "Objekte", (e) => { e.stopPropagation(); openObjekteMenu(objBtn); });
    mk("", "chart", "Tools", () => route("tools"));
    mk("profile", "user", "Profil", () => openProfilSheet());
  }

  // Handy: Objekte-Menü (Vermietung / AirBNB / Landpacht + einzelne Objekte)
  function openObjekteMenu(anchor) {
    closeSubmenu();
    const streams = (D.streams || []);
    const gruppe = (kind, icon, titel) => {
      const list = streams.filter(s => s.kind === kind);
      if (!list.length) return "";
      return `<div class="sub-cat">${esc(titel)}</div>` + list.map(s => {
        const m = FE.streamMonthly(s);
        const on = currentView === s.id;
        return `<div class="sub-item${on ? " on" : ""}" data-id="${s.id}">
          <div class="sub-ic">${svg(s.icon || icon)}</div>
          <div class="sub-tx"><div class="sub-n">${esc(s.name)}</div>
            <div class="sub-m">${eur(m.gesamt)}/Monat</div></div></div>`;
      }).join("");
    };
    const inhalt = gruppe("miete", "home", "Vermietung")
      + gruppe("airbnb", "bed", "Kurzzeitvermietung")
      + gruppe("pacht", "sprout", "Landpacht");
    const bd = el(`<div class="sub-bd"></div>`);
    const menu = el(`<div class="submenu obj-menu">
      <div class="submenu-t">Objekte</div>
      <div class="sub-item${currentView === "vermietung" ? " on" : ""}" data-id="vermietung">
        <div class="sub-ic">${svg("layers")}</div>
        <div class="sub-tx"><div class="sub-n">Alle Vermietungen</div>
          <div class="sub-m">Sammelübersicht</div></div></div>
      ${inhalt || `<div class="sub-empty">Noch keine Objekte. Tippe auf „Neu", um zu starten.</div>`}
    </div>`);
    document.body.appendChild(bd); document.body.appendChild(menu);
    positioniereSubmenu(anchor, menu);
    menu.querySelectorAll(".sub-item[data-id]").forEach(it =>
      it.onclick = () => { const id = it.dataset.id; closeSubmenu(); route(id); });
    bd.onclick = closeSubmenu;
  }

  /* ---------- ANLEGEN (zentrales +) ---------- */
  // Icon je Objektart – neue Objekte bekommen automatisch das passende Symbol
  const ART_ICON = { miete: "home", airbnb: "bed", pacht: "sprout" };
  const ART_INFO = {
    miete:  { icon: "home",   name: "Vermietung",      desc: "Wohnung oder Haus mit Mietern" },
    airbnb: { icon: "bed",    name: "Kurzzeitvermietung", desc: "Ferienwohnung, AirBNB & Co." },
    pacht:  { icon: "sprout", name: "Landpacht",       desc: "Acker- oder Grünland verpachten" }
  };

  function openAnlegenMenu(anchor) {
    closeSubmenu();
    const arten = ["miete", "airbnb", "pacht"].map(art => {
      const i = ART_INFO[art];
      const gesperrt = !istPremium() && art !== "miete";
      return `<div class="sub-item anlegen-item${gesperrt ? " locked" : ""}" data-art="${art}">
        <div class="sub-ic">${svg(i.icon)}</div>
        <div class="sub-tx"><div class="sub-n">${esc(i.name)}${gesperrt ? ' <span class="lock-badge">Premium</span>' : ""}</div>
          <div class="sub-m">${esc(i.desc)}</div></div>
        <div class="sub-v">${svg("plus")}</div></div>`;
    }).join("");
    const bd = el(`<div class="sub-bd"></div>`);
    const menu = el(`<div class="submenu anlegen-menu">
      <div class="submenu-t">Neu anlegen</div>
      ${arten}
      <div class="anlegen-sep"></div>
      <div class="sub-item anlegen-item" data-neu="termin">
        <div class="sub-ic">${svg("calendar")}</div>
        <div class="sub-tx"><div class="sub-n">Termin</div>
          <div class="sub-m">Frist, Zahlung oder Notiz</div></div>
        <div class="sub-v">${svg("plus")}</div></div>
    </div>`);
    document.body.appendChild(bd); document.body.appendChild(menu);
    positioniereSubmenu(anchor, menu);

    const schliessenUndTun = (fn) => { closeSubmenu(); fn(); };
    menu.querySelectorAll(".anlegen-item[data-art]").forEach(n => n.onclick = () => {
      const art = n.dataset.art;
      if (!istPremium() && art !== "miete") { schliessenUndTun(() => openUpgradeSheet("art")); return; }
      if (!pruefeObjekt(art)) { closeSubmenu(); return; }
      schliessenUndTun(() => assistentObjekt(art));
    });
    const t = menu.querySelector('[data-neu="termin"]');
    if (t) t.onclick = () => schliessenUndTun(() => openTerminEdit(null, true));
    bd.onclick = closeSubmenu;
  }

  function positioniereSubmenu(anchor, menu) {
    const bd = document.querySelector(".sub-bd");
    if (window.innerWidth > 560) {
      const r = anchor.getBoundingClientRect();
      menu.style.left = (r.right + 10) + "px";
      const h = menu.offsetHeight;
      menu.style.top = Math.max(12, Math.min(r.top, window.innerHeight - h - 12)) + "px";
    }
    requestAnimationFrame(() => { if (bd) bd.classList.add("on"); menu.classList.add("on"); });
    document.addEventListener("keydown", subEsc);
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
    else if (id === "tools") renderTools(host);
    else renderStream(host, id);
    $(".scroll").scrollTop = 0;
  }

  /* ---------- shared bits ---------- */
  /* ================= TOOLS: RECHNER & WISSEN ================= */

  const WISSEN = [
    { id: "mietarten", kat: "grundlagen", icon: "euro", titel: "Kaltmiete, Warmmiete, Nettokaltmiete",
      kurz: "Drei Begriffe, die ständig verwechselt werden.",
      inhalt: `
        <p><b>Nettokaltmiete</b> ist die reine Miete für den Wohnraum. Kein Strom, keine Heizung, kein Wasser. Das ist die Zahl, mit der du rechnest — bei Rendite, bei Mieterhöhung, bei allem.</p>
        <p><b>Kaltmiete</b> wird umgangssprachlich meist gleichbedeutend benutzt. In Mietverträgen taucht manchmal die Bruttokaltmiete auf: Nettokaltmiete plus kalte Betriebskosten, aber ohne Heizung.</p>
        <p><b>Warmmiete</b> ist alles zusammen: Nettokaltmiete plus sämtliche Nebenkosten inklusive Heizung. Das ist die Zahl, die dein Mieter überweist.</p>
        <div class="wi-merke">Für deine Kalkulation zählt ausschließlich die Nettokaltmiete. Wer mit der Warmmiete rechnet, überschätzt seine Rendite deutlich — die Nebenkosten gehören dir nicht, du reichst sie nur durch.</div>`
    },
    { id: "cashflow-rendite", kat: "grundlagen", icon: "chart", titel: "Cashflow ist nicht Rendite",
      kurz: "Zwei Zahlen, zwei völlig verschiedene Aussagen.",
      inhalt: `
        <p><b>Rendite</b> misst die Qualität des Objekts: Wie viel Miete bringt es im Verhältnis zum Kaufpreis? Sie ist unabhängig davon, wie du finanziert hast.</p>
        <p><b>Cashflow</b> misst deine Liquidität: Was bleibt nach Abzug der Kreditrate übrig? Er hängt massiv von deiner Finanzierung ab.</p>
        <p>Dasselbe Objekt kann mit hoher Tilgung negativen Cashflow haben und mit niedriger Tilgung positiven — die Rendite bleibt identisch.</p>
        <div class="wi-merke">Rendite sagt dir, ob das Objekt gut ist. Cashflow sagt dir, ob du es dir leisten kannst. Du brauchst beide Zahlen.</div>`
    },
    { id: "umlagefaehig", kat: "betrieb", icon: "layers", titel: "Umlagefähig oder nicht?",
      kurz: "Was du auf den Mieter umlegen darfst — und was nicht.",
      inhalt: `
        <p><b>Umlagefähig</b> nach Betriebskostenverordnung sind unter anderem: Grundsteuer, Wasser und Abwasser, Heizung, Aufzug, Straßenreinigung, Müllabfuhr, Gebäudereinigung, Gartenpflege, Beleuchtung, Schornsteinfeger, Sach- und Haftpflichtversicherung, Hauswart und Gemeinschaftsantenne.</p>
        <p><b>Nicht umlagefähig</b> sind: Instandhaltung und Reparaturen, Verwaltungskosten, Kontoführung, Rechtsberatung, Mietausfallwagnis, Leerstandskosten und Rücklagen.</p>
        <div class="wi-merke">Die Faustregel: Laufender Betrieb ja, Werterhalt nein. Reparaturen sind immer deine Sache — auch wenn es im Mietvertrag anders steht, solche Klauseln sind meist unwirksam.</div>
        <div class="wi-hinweis">Das ist eine Orientierung, keine Rechtsberatung. Im Zweifel den Mieterverein oder einen Fachanwalt fragen.</div>`
    },
    { id: "versteckte-kosten", kat: "grundlagen", icon: "wallet", titel: "Die vier versteckten Kosten",
      kurz: "Was in fast jeder Renditerechnung fehlt.",
      inhalt: `
        <p><b>1. Instandhaltung.</b> Rechne mit etwa 1 Prozent des Gebäudewerts pro Jahr, oder rund 10 Euro je Quadratmeter. Das Dach kommt irgendwann, garantiert.</p>
        <p><b>2. Mietausfall.</b> Leerstand, Mietnomaden, Zahlungsausfälle. Zwei bis fünf Prozent der Jahresmiete als Puffer sind realistisch.</p>
        <p><b>3. Verwaltung.</b> Auch wenn du selbst verwaltest, kostet es Zeit. Bei Fremdverwaltung etwa 20 bis 30 Euro je Einheit und Monat.</p>
        <p><b>4. Kaufnebenkosten.</b> Grunderwerbsteuer, Notar, Grundbuch, Makler — je nach Bundesland 9 bis 15 Prozent des Kaufpreises. Sie gehören in die Investitionssumme.</p>
        <div class="wi-merke">Wer diese vier Posten weglässt, rechnet sich eine Rendite schön, die es nie gab.</div>`
    },
    { id: "mieterhoehung", kat: "recht", icon: "trend", titel: "Mieterhöhung: die Regeln",
      kurz: "Wann, wie viel und in welcher Form.",
      inhalt: `
        <p><b>Sperrfrist:</b> Seit der letzten Erhöhung müssen zwölf Monate vergangen sein, und die Miete muss fünfzehn Monate unverändert gewesen sein.</p>
        <p><b>Kappungsgrenze:</b> Innerhalb von drei Jahren höchstens 20 Prozent. In angespannten Wohnlagen sind es nur 15 Prozent.</p>
        <p><b>Obergrenze:</b> Die ortsübliche Vergleichsmiete. Nachweisen kannst du sie über den Mietspiegel, ein Gutachten oder drei Vergleichswohnungen.</p>
        <p><b>Form:</b> Schriftlich mit Begründung. Der Mieter hat dann bis zum Ende des übernächsten Monats Zeit zuzustimmen.</p>
        <div class="wi-hinweis">Orientierung, keine Rechtsberatung. Regionale Regeln können abweichen.</div>`
    },
    { id: "nebenkosten", kat: "recht", icon: "calendar", titel: "Nebenkostenabrechnung: Pflichtangaben",
      kurz: "Sechs Punkte, ohne die sie angreifbar ist.",
      inhalt: `
        <p><b>1.</b> Zusammenstellung der Gesamtkosten je Kostenart.<br>
           <b>2.</b> Angabe und Erläuterung des Verteilerschlüssels.<br>
           <b>3.</b> Berechnung des Anteils für diesen Mieter.<br>
           <b>4.</b> Abzug der geleisteten Vorauszahlungen.<br>
           <b>5.</b> Klarer Abrechnungszeitraum von zwölf Monaten.<br>
           <b>6.</b> Zugang innerhalb von zwölf Monaten nach Ende des Zeitraums.</p>
        <div class="wi-merke">Die Frist ist hart: Kommt die Abrechnung zu spät, kannst du keine Nachzahlung mehr verlangen — Guthaben musst du trotzdem auszahlen.</div>
        <div class="wi-hinweis">Orientierung, keine Rechtsberatung.</div>`
    },
    { id: "leise-verluste", kat: "betrieb", icon: "debt", titel: "Wo Geld leise verschwindet",
      kurz: "Sechs Stellen, die kaum jemand prüft.",
      inhalt: `
        <p><b>Mieten, die nie angepasst wurden.</b> Nach fünf Jahren unter Marktniveau summiert sich das erheblich.</p>
        <p><b>Zu niedrige Vorauszahlungen.</b> Du streckst die Betriebskosten das ganze Jahr vor und bekommst erst spät Geld zurück.</p>
        <p><b>Nicht umgelegte Positionen.</b> Umlagefähige Kosten, die schlicht vergessen wurden.</p>
        <p><b>Leerstand zwischen zwei Mietern.</b> Jeder Monat ist unwiederbringlich weg.</p>
        <p><b>Zu hohe Zinsen nach Ablauf der Bindung.</b> Anschlussfinanzierung nicht rechtzeitig geprüft.</p>
        <p><b>Ungenutzte Sondertilgung.</b> Das vertragliche Recht verfällt jedes Jahr aufs Neue.</p>
        <div class="wi-merke">Keiner dieser Punkte tut spürbar weh. Zusammen kosten sie oft mehr als eine ganze Monatsmiete pro Jahr.</div>`
    },
    { id: "zinsbindung", kat: "finanzierung", icon: "bank", titel: "Zinsbindung und Anschlussfinanzierung",
      kurz: "Warum du Jahre vorher anfangen solltest.",
      inhalt: `
        <p>Nach Ablauf der Zinsbindung wird die Restschuld neu finanziert — zum dann geltenden Zins. Steigt der von 2 auf 5 Prozent, kann sich deine Rate fast verdoppeln.</p>
        <p><b>Forward-Darlehen</b> sichern dir den heutigen Zins bis zu 60 Monate im Voraus. Dafür zahlst du einen kleinen Aufschlag je Monat Vorlauf.</p>
        <p><b>Sondertilgung</b> senkt die Restschuld und damit dein Risiko bei der Anschlussfinanzierung. Viele Verträge erlauben 5 Prozent jährlich.</p>
        <div class="wi-merke">Trag dir das Ende der Zinsbindung drei Jahre vorher in den Kalender. Wer erst im letzten Monat verhandelt, hat keine Verhandlungsposition.</div>`
    }
  ];

  const WISSEN_KAT = [
    { id: "grundlagen", name: "Grundlagen", info: "Die Begriffe, die alles bestimmen" },
    { id: "betrieb", name: "Betrieb & Kosten", info: "Was im Alltag Geld kostet" },
    { id: "recht", name: "Recht & Fristen", info: "Regeln, die du kennen musst" },
    { id: "finanzierung", name: "Finanzierung", info: "Kredit, Zins und Tilgung" }
  ];

  const RECHNER = [
    {
      id: "rendite", titel: "Renditerechner", icon: "trend", kat: "kauf",
      kurz: "Was wirft eine Immobilie im Verhältnis zum Kaufpreis ab?",
      felder: [
        { id: "kaufpreis", label: "Kaufpreis", einheit: "€", wert: 250000 },
        { id: "nebenkosten", label: "Kaufnebenkosten", einheit: "%", wert: 12, hinweis: "Notar, Grunderwerbsteuer, Makler" },
        { id: "miete", label: "Kaltmiete pro Monat", einheit: "€", wert: 950 },
        { id: "bewirt", label: "Bewirtschaftungskosten", einheit: "% der Miete", wert: 20, hinweis: "Instandhaltung, Verwaltung, Mietausfall" }
      ],
      rechne: (w) => {
        const invest = w.kaufpreis * (1 + w.nebenkosten / 100);
        const jahr = w.miete * 12;
        const netto = jahr * (1 - w.bewirt / 100);
        return {
          zeilen: [
            { l: "Gesamtinvestition", v: eur(invest), gross: true },
            { l: "Jahreskaltmiete", v: eur(jahr) },
            { l: "Bruttorendite", v: (invest ? (jahr / invest * 100) : 0).toFixed(2).replace(".", ",") + " %", gross: true },
            { l: "Nettorendite", v: (invest ? (netto / invest * 100) : 0).toFixed(2).replace(".", ",") + " %", gross: true },
            { l: "davon Bewirtschaftung", v: "− " + eur(jahr - netto) }
          ],
          balken: Math.max(0, Math.min(100, invest ? (jahr / invest * 100) * 10 : 0)),
          fazit: invest && (jahr / invest * 100) >= 5
            ? "Solide Ausgangslage. Prüf trotzdem den Cashflow nach Finanzierung."
            : "Rechnerisch dünn. Bei dieser Rendite wird positiver Cashflow schwierig."
        };
      }
    },
    {
      id: "kredit", titel: "Kreditrechner", icon: "bank", kat: "finanzierung",
      kurz: "Was kostet dich die Finanzierung monatlich?",
      felder: [
        { id: "summe", label: "Darlehenssumme", einheit: "€", wert: 200000 },
        { id: "zins", label: "Sollzins", einheit: "% p. a.", wert: 3.5 },
        { id: "tilgung", label: "Anfangstilgung", einheit: "% p. a.", wert: 2 }
      ],
      rechne: (w) => {
        const rate = w.summe * (w.zins + w.tilgung) / 100 / 12;
        const zinsM = w.summe * w.zins / 100 / 12;
        const tilgM = rate - zinsM;
        // Laufzeit bis vollständige Tilgung
        let rest = w.summe, monate = 0;
        const zM = w.zins / 100 / 12;
        while (rest > 0 && monate < 1200) { rest = rest + rest * zM - rate; monate++; }
        const jahre = Math.floor(monate / 12), restM = monate % 12;
        return {
          zeilen: [
            { l: "Monatliche Rate", v: eur(rate), gross: true },
            { l: "davon Zinsen", v: eur(zinsM) },
            { l: "davon Tilgung", v: eur(tilgM) },
            { l: "Schuldenfrei nach", v: jahre + " Jahren " + restM + " Monaten", gross: true },
            { l: "Zinskosten gesamt", v: eur(Math.max(0, rate * monate - w.summe)) }
          ],
          verhaeltnis: { zins: rate ? zinsM / rate * 100 : 0, tilgung: rate ? tilgM / rate * 100 : 0 },
          fazit: "Eine höhere Anfangstilgung verkürzt die Laufzeit stark und spart Zinsen — kostet aber monatlich mehr."
        };
      }
    },
    {
      id: "zinseszins", titel: "Zinseszinsrechner", icon: "chart", kat: "vermoegen",
      kurz: "Wie stark wächst Kapital über die Zeit?",
      felder: [
        { id: "start", label: "Startkapital", einheit: "€", wert: 20000 },
        { id: "sparrate", label: "Monatliche Sparrate", einheit: "€", wert: 500 },
        { id: "zins", label: "Rendite", einheit: "% p. a.", wert: 6 },
        { id: "jahre", label: "Laufzeit", einheit: "Jahre", wert: 20 }
      ],
      rechne: (w) => {
        const m = w.zins / 100 / 12;
        let kap = w.start;
        const verlauf = [kap];
        for (let i = 0; i < w.jahre * 12; i++) { kap = kap * (1 + m) + w.sparrate; if ((i + 1) % 12 === 0) verlauf.push(kap); }
        const eingezahlt = w.start + w.sparrate * 12 * w.jahre;
        return {
          zeilen: [
            { l: "Endkapital", v: eur(kap), gross: true },
            { l: "davon eingezahlt", v: eur(eingezahlt) },
            { l: "davon Zinsertrag", v: eur(Math.max(0, kap - eingezahlt)), gross: true }
          ],
          verlauf: verlauf,
          fazit: "Der Zinsertrag wächst nicht gleichmäßig, sondern beschleunigt sich. Die letzten Jahre bringen am meisten."
        };
      }
    },
    {
      id: "opportunitaet", titel: "Opportunitätskosten", icon: "layers", kat: "vermoegen",
      kurz: "Was hätte dein Geld woanders gebracht?",
      felder: [
        { id: "kapital", label: "Eingesetztes Eigenkapital", einheit: "€", wert: 60000 },
        { id: "immoRendite", label: "Rendite der Immobilie", einheit: "% p. a.", wert: 5 },
        { id: "altRendite", label: "Alternative Anlage", einheit: "% p. a.", wert: 7, hinweis: "z. B. breit gestreuter Aktienindex" },
        { id: "jahre", label: "Zeitraum", einheit: "Jahre", wert: 15 }
      ],
      rechne: (w) => {
        const immo = w.kapital * Math.pow(1 + w.immoRendite / 100, w.jahre);
        const alt = w.kapital * Math.pow(1 + w.altRendite / 100, w.jahre);
        const diff = immo - alt;
        return {
          zeilen: [
            { l: "Immobilie nach " + w.jahre + " Jahren", v: eur(immo), gross: true },
            { l: "Alternative nach " + w.jahre + " Jahren", v: eur(alt), gross: true },
            { l: "Unterschied", v: (diff >= 0 ? "+ " : "− ") + eur(Math.abs(diff)) }
          ],
          vergleich: { a: immo, b: alt },
          fazit: diff >= 0
            ? "Rechnerisch liegt die Immobilie vorn. Bedenke: Sie bringt Aufwand mit, dafür kannst du sie mit Fremdkapital hebeln."
            : "Rechnerisch läge die Alternative vorn. Der Vergleich blendet aber den Kredithebel aus — mit Fremdkapital arbeitet die Immobilie mit dem Geld der Bank."
        };
      }
    },
    {
      id: "kaufneben", titel: "Kaufnebenkosten", icon: "coins", kat: "kauf",
      kurz: "Was zum Kaufpreis noch obendrauf kommt.",
      felder: [
        { id: "kaufpreis", label: "Kaufpreis", einheit: "€", wert: 250000 },
        { id: "grest", label: "Grunderwerbsteuer", einheit: "%", wert: 5, hinweis: "Bundeslandabhängig: 3,5 bis 6,5 %" },
        { id: "notar", label: "Notar und Grundbuch", einheit: "%", wert: 2 },
        { id: "makler", label: "Maklercourtage", einheit: "%", wert: 3.57, hinweis: "Oft geteilt, entfällt beim Direktkauf" }
      ],
      rechne: (w) => {
        const g = w.kaufpreis * w.grest / 100, n = w.kaufpreis * w.notar / 100, m = w.kaufpreis * w.makler / 100;
        const nk = g + n + m, ges = w.kaufpreis + nk;
        return {
          zeilen: [
            { l: "Grunderwerbsteuer", v: eur(g) },
            { l: "Notar und Grundbuch", v: eur(n) },
            { l: "Makler", v: eur(m) },
            { l: "Nebenkosten gesamt", v: eur(nk), gross: true },
            { l: "Anteil am Kaufpreis", v: (w.kaufpreis ? nk / w.kaufpreis * 100 : 0).toFixed(1).replace(".", ",") + " %" },
            { l: "Gesamtinvestition", v: eur(ges), gross: true }
          ],
          stapel: [
            { l: "Kaufpreis", v: w.kaufpreis, f: "a" },
            { l: "Grunderwerbsteuer", v: g, f: "b" },
            { l: "Notar", v: n, f: "c" },
            { l: "Makler", v: m, f: "d" }
          ],
          fazit: "Die Nebenkosten sind verlorenes Geld — sie stecken nicht im Wert der Immobilie. Deshalb gehören sie zwingend in die Renditerechnung."
        };
      }
    },
    {
      id: "cashflow", titel: "Cashflow-Rechner", icon: "wallet", kat: "kauf",
      kurz: "Was bleibt nach allen Kosten und der Kreditrate übrig?",
      felder: [
        { id: "miete", label: "Kaltmiete pro Monat", einheit: "€", wert: 950 },
        { id: "rate", label: "Kreditrate pro Monat", einheit: "€", wert: 780 },
        { id: "instand", label: "Instandhaltung", einheit: "€/Monat", wert: 80, hinweis: "Faustregel: 1 € je m² und Monat" },
        { id: "verwaltung", label: "Verwaltung", einheit: "€/Monat", wert: 25 },
        { id: "ausfall", label: "Mietausfallrisiko", einheit: "% der Miete", wert: 3 }
      ],
      rechne: (w) => {
        const ausfall = w.miete * w.ausfall / 100;
        const cf = w.miete - (w.rate + w.instand + w.verwaltung + ausfall);
        return {
          zeilen: [
            { l: "Mieteinnahme", v: eur(w.miete) },
            { l: "− Kreditrate", v: "− " + eur(w.rate) },
            { l: "− Instandhaltung", v: "− " + eur(w.instand) },
            { l: "− Verwaltung", v: "− " + eur(w.verwaltung) },
            { l: "− Mietausfallrisiko", v: "− " + eur(ausfall) },
            { l: "Cashflow pro Monat", v: eur(cf), gross: true },
            { l: "Cashflow pro Jahr", v: eur(cf * 12), gross: true }
          ],
          wasserfall: [
            { l: "Miete", v: w.miete, typ: "plus" },
            { l: "Rate", v: w.rate, typ: "minus" },
            { l: "Kosten", v: w.instand + w.verwaltung + ausfall, typ: "minus" },
            { l: "Rest", v: Math.abs(cf), typ: cf >= 0 ? "rest" : "neg" }
          ],
          fazit: cf >= 0
            ? "Positiver Cashflow: Das Objekt trägt sich selbst und wirft zusätzlich etwas ab."
            : "Negativer Cashflow: Du legst monatlich " + eur(Math.abs(cf)) + " drauf. Das kann sich lohnen, wenn die Tilgung hoch ist — du musst es dir aber leisten können."
        };
      }
    },
    {
      id: "sondertilgung", titel: "Sondertilgung", icon: "coins", kat: "finanzierung",
      kurz: "Wie viel Zinsen sparst du durch eine Extrazahlung?",
      felder: [
        { id: "summe", label: "Restschuld", einheit: "€", wert: 200000 },
        { id: "zins", label: "Sollzins", einheit: "% p. a.", wert: 3.5 },
        { id: "rate", label: "Monatliche Rate", einheit: "€", wert: 917 },
        { id: "sonder", label: "Sondertilgung pro Jahr", einheit: "€", wert: 5000 }
      ],
      rechne: (w) => {
        const lauf = (mitSonder) => {
          let rest = w.summe, mon = 0, zins = 0;
          const zM = w.zins / 100 / 12;
          while (rest > 0 && mon < 1200) {
            const z = rest * zM; zins += z;
            rest = rest + z - w.rate;
            if (mitSonder && (mon + 1) % 12 === 0) rest -= w.sonder;
            mon++;
          }
          return { mon, zins };
        };
        const ohne = lauf(false), mit = lauf(true);
        const sparMon = Math.max(0, ohne.mon - mit.mon), sparZins = Math.max(0, ohne.zins - mit.zins);
        return {
          zeilen: [
            { l: "Ohne Sondertilgung", v: Math.floor(ohne.mon / 12) + " J " + (ohne.mon % 12) + " M" },
            { l: "Mit Sondertilgung", v: Math.floor(mit.mon / 12) + " J " + (mit.mon % 12) + " M", gross: true },
            { l: "Schneller schuldenfrei", v: Math.floor(sparMon / 12) + " J " + (sparMon % 12) + " M", gross: true },
            { l: "Gesparte Zinsen", v: eur(sparZins), gross: true }
          ],
          vergleich: { a: ohne.mon, b: mit.mon, la: "ohne Sondertilgung", lb: "mit Sondertilgung", einheit: "Monate" },
          fazit: "Sondertilgung wirkt am stärksten früh in der Laufzeit, weil dann der Zinsanteil am höchsten ist. Viele Verträge erlauben 5 % jährlich kostenfrei."
        };
      }
    },
    {
      id: "anschluss", titel: "Anschlussfinanzierung", icon: "debt", kat: "finanzierung",
      kurz: "Was passiert, wenn der Zins nach der Bindung steigt?",
      felder: [
        { id: "rest", label: "Restschuld bei Ablauf", einheit: "€", wert: 150000 },
        { id: "altZins", label: "Bisheriger Zins", einheit: "% p. a.", wert: 2 },
        { id: "neuZins", label: "Erwarteter neuer Zins", einheit: "% p. a.", wert: 4.5 },
        { id: "tilgung", label: "Tilgung", einheit: "% p. a.", wert: 2 }
      ],
      rechne: (w) => {
        const alt = w.rest * (w.altZins + w.tilgung) / 100 / 12;
        const neu = w.rest * (w.neuZins + w.tilgung) / 100 / 12;
        const diff = neu - alt;
        return {
          zeilen: [
            { l: "Bisherige Rate", v: eur(alt) },
            { l: "Neue Rate", v: eur(neu), gross: true },
            { l: "Mehrbelastung pro Monat", v: (diff >= 0 ? "+ " : "− ") + eur(Math.abs(diff)), gross: true },
            { l: "Mehrbelastung pro Jahr", v: (diff >= 0 ? "+ " : "− ") + eur(Math.abs(diff * 12)) }
          ],
          vergleich: { a: alt, b: neu, la: "bisherige Rate", lb: "neue Rate", waehrung: true },
          fazit: diff > 0
            ? "Deine Rate steigt spürbar. Prüfe rechtzeitig ein Forward-Darlehen oder erhöhe vorher die Tilgung, um die Restschuld zu senken."
            : "Die Anschlussfinanzierung wird günstiger. Überlege, ob du stattdessen die Tilgung erhöhst."
        };
      }
    },
    {
      id: "kauffaktor", titel: "Kaufpreisfaktor", icon: "layers", kat: "kauf",
      kurz: "Wie viele Jahresmieten kostet die Immobilie?",
      felder: [
        { id: "kaufpreis", label: "Kaufpreis", einheit: "€", wert: 250000 },
        { id: "miete", label: "Kaltmiete pro Monat", einheit: "€", wert: 950 }
      ],
      rechne: (w) => {
        const jahr = w.miete * 12;
        const faktor = jahr ? w.kaufpreis / jahr : 0;
        const rendite = w.kaufpreis ? jahr / w.kaufpreis * 100 : 0;
        return {
          zeilen: [
            { l: "Jahreskaltmiete", v: eur(jahr) },
            { l: "Kaufpreisfaktor", v: faktor.toFixed(1).replace(".", ",") + " ×", gross: true },
            { l: "entspricht Bruttorendite", v: rendite.toFixed(2).replace(".", ",") + " %", gross: true }
          ],
          faktor: faktor,
          fazit: faktor <= 20
            ? "Unter Faktor 20 gilt als günstig — in Städten kaum noch zu finden, in ländlichen Lagen realistisch."
            : faktor <= 28
              ? "Im normalen Bereich für gute Lagen. Der Cashflow wird hier meist knapp."
              : "Hoher Faktor. Das lohnt sich fast nur, wenn du auf Wertsteigerung setzt — nicht auf laufende Erträge."
        };
      }
    },
    {
      id: "instandhaltung", titel: "Instandhaltungsrücklage", icon: "home", kat: "betrieb",
      kurz: "Wie viel solltest du monatlich zurücklegen?",
      felder: [
        { id: "flaeche", label: "Wohnfläche", einheit: "m²", wert: 80 },
        { id: "baujahr", label: "Baujahr", einheit: "", wert: 1985 },
        { id: "gebaeude", label: "Gebäudewert", einheit: "€", wert: 200000, hinweis: "Kaufpreis ohne Grundstücksanteil" }
      ],
      rechne: (w) => {
        const alter = Math.max(0, new Date().getFullYear() - w.baujahr);
        const proQm = alter < 22 ? 9 : alter < 32 ? 11.5 : 14;
        const nachFlaeche = w.flaeche * proQm / 12;
        const nachWert = w.gebaeude * 0.01 / 12;
        const empfehlung = Math.max(nachFlaeche, nachWert);
        return {
          zeilen: [
            { l: "Gebäudealter", v: alter + " Jahre" },
            { l: "Nach Fläche", v: eur(nachFlaeche) + " / Monat" },
            { l: "Nach Gebäudewert (1 % p. a.)", v: eur(nachWert) + " / Monat" },
            { l: "Empfehlung", v: eur(empfehlung) + " / Monat", gross: true },
            { l: "Pro Jahr", v: eur(empfehlung * 12), gross: true }
          ],
          vergleich: { a: nachFlaeche, b: nachWert, la: "nach Fläche", lb: "nach Wert", waehrung: true },
          fazit: "Ältere Gebäude brauchen mehr Rücklage — ab 32 Jahren rechnet man mit rund 14 € je m² und Jahr. Wer nichts zurücklegt, finanziert das nächste Dach über einen teuren Kredit."
        };
      }
    },
    {
      id: "mieterhoehung", titel: "Mieterhöhung", icon: "trend", kat: "betrieb",
      kurz: "Wie viel darfst du erhöhen — und was bringt es?",
      felder: [
        { id: "aktuell", label: "Aktuelle Kaltmiete", einheit: "€/Monat", wert: 700 },
        { id: "vergleich", label: "Ortsübliche Vergleichsmiete", einheit: "€/Monat", wert: 880 },
        { id: "kappung", label: "Kappungsgrenze", einheit: "%", wert: 20, hinweis: "15 % in angespannten Wohnlagen" }
      ],
      rechne: (w) => {
        const maxKappung = w.aktuell * (1 + w.kappung / 100);
        const neu = Math.min(maxKappung, w.vergleich);
        const plus = Math.max(0, neu - w.aktuell);
        return {
          zeilen: [
            { l: "Grenze durch Kappung", v: eur(maxKappung) },
            { l: "Grenze durch Vergleichsmiete", v: eur(w.vergleich) },
            { l: "Zulässige neue Miete", v: eur(neu), gross: true },
            { l: "Erhöhung pro Monat", v: "+ " + eur(plus), gross: true },
            { l: "Mehr pro Jahr", v: "+ " + eur(plus * 12), gross: true }
          ],
          grenzen: { aktuell: w.aktuell, kappung: maxKappung, vergleich: w.vergleich, neu: neu },
          fazit: "Es gilt immer die niedrigere der beiden Grenzen. Zwischen zwei Erhöhungen müssen zwölf Monate liegen, die Miete muss fünfzehn Monate unverändert gewesen sein.",
          rechtlich: true
        };
      }
    }
  ];

  const RECHNER_KAT = [
    { id: "kauf", name: "Kauf & Rendite", info: "Lohnt sich dieses Objekt?" },
    { id: "finanzierung", name: "Finanzierung", info: "Was kostet dich die Bank?" },
    { id: "betrieb", name: "Betrieb & Miete", info: "Laufende Kosten und Mieteinnahmen" },
    { id: "vermoegen", name: "Vermögen & Vergleich", info: "Was macht dein Geld sonst?" }
  ];


  function renderTools(host) {
    $("#eyebrow").textContent = "Tools";
    $("#pageTitle").textContent = "Rechner & Wissen";
    $("#pageSub").textContent = RECHNER.length + " Rechner · " + WISSEN.length + " Themen";

    // Rechner nach Kategorien
    RECHNER_KAT.forEach(k => {
      const liste = RECHNER.filter(r => r.kat === k.id);
      if (!liste.length) return;
      host.appendChild(el(`<div class="kat-kopf">
        <div class="kat-n">${esc(k.name)}</div>
        <div class="kat-i">${esc(k.info)}</div></div>`));
      const g = el(`<div class="grid g-objekte">${liste.map(r => `
        <div class="card pad clickable tool-karte" data-rechner="${r.id}">
          <div class="chip">${svg(r.icon)}</div>
          <div class="tool-n">${esc(r.titel)}</div>
          <div class="tool-k">${esc(r.kurz)}</div>
          <span class="tapme">Öffnen ›</span>
        </div>`).join("")}</div>`);
      g.querySelectorAll("[data-rechner]").forEach(n => n.onclick = () => openRechner(n.dataset.rechner));
      host.appendChild(g);
    });

    // Wissensbereich nach Kategorien
    WISSEN_KAT.forEach(k => {
      const liste = WISSEN.filter(a => a.kat === k.id);
      if (!liste.length) return;
      host.appendChild(el(`<div class="kat-kopf">
        <div class="kat-n">${esc(k.name)}</div>
        <div class="kat-i">${esc(k.info)}</div></div>`));
      const g = el(`<div class="grid g-objekte">${liste.map(a => `
        <div class="card pad clickable wi-karte" data-wissen="${a.id}">
          <div class="wi-ic">${svg(a.icon || "chart")}</div>
          <div class="wi-n">${esc(a.titel)}</div>
          <div class="wi-k">${esc(a.kurz)}</div>
          <span class="tapme">Lesen ›</span>
        </div>`).join("")}</div>`);
      g.querySelectorAll("[data-wissen]").forEach(n => n.onclick = () => openWissen(n.dataset.wissen));
      host.appendChild(g);
    });

    host.appendChild(el(`<div class="note" style="margin-top:6px">
      Angaben zu Mietrecht und Betriebskosten dienen der Orientierung und ersetzen keine Rechts- oder Steuerberatung.</div>`));
  }

  function openWissen(id) {
    const a = WISSEN.find(x => x.id === id);
    if (!a) return;
    openSheet(a.titel, a.kurz, `<div class="wi-inhalt">${a.inhalt}</div>`);
  }

  function openRechner(id) {
    const r = RECHNER.find(x => x.id === id);
    if (!r) return;
    const body = `
      <div class="rechner-kurz">${esc(r.kurz)}</div>
      <div id="rcFelder">${r.felder.map(f => `
        <div class="rc-row">
          <label class="rc-l">${esc(f.label)}${f.hinweis ? `<small>${esc(f.hinweis)}</small>` : ""}</label>
          <div class="rc-feld">
            <input class="ef-i rc-i" type="number" step="any" inputmode="decimal"
              data-f="${f.id}" value="${f.wert}">
            <span class="rc-e">${esc(f.einheit)}</span>
          </div>
        </div>`).join("")}</div>
      <div id="rcErgebnis" class="rc-erg"></div>`;
    const sheet = openSheet(r.titel, "", body);

    const rechnen = () => {
      const w = {};
      sheet.querySelectorAll(".rc-i").forEach(i => {
        w[i.dataset.f] = Number(String(i.value).replace(",", ".")) || 0;
      });
      const e = r.rechne(w);
      let extra = "";
      // Zins-/Tilgungsverhältnis
      if (e.verhaeltnis) extra = `
        <div class="rc-vh"><i class="z" style="width:${e.verhaeltnis.zins.toFixed(1)}%"></i><i class="t" style="width:${e.verhaeltnis.tilgung.toFixed(1)}%"></i></div>
        <div class="rc-leg"><b class="z"></b>Zinsanteil <b class="t"></b>Tilgungsanteil</div>`;
      // Renditeskala
      else if (e.balken != null) extra = `
        <div class="rc-skala"><i style="width:${e.balken.toFixed(1)}%"></i></div>
        <div class="rc-leg-s"><span>0 %</span><span>5 %</span><span>10 %</span></div>`;
      // Verlaufskurve
      else if (e.verlauf) extra = rcVerlauf(e.verlauf);
      // Gestapelte Anteile (Kaufnebenkosten)
      else if (e.stapel) {
        const ges = e.stapel.reduce((a, x) => a + x.v, 0) || 1;
        extra = `<div class="rc-stapel">${e.stapel.map(x =>
          `<i class="f-${x.f}" style="width:${(x.v / ges * 100).toFixed(2)}%" title="${esc(x.l)}"></i>`).join("")}</div>
          <div class="rc-stapel-leg">${e.stapel.map(x =>
          `<span><b class="f-${x.f}"></b>${esc(x.l)}</span>`).join("")}</div>`;
      }
      // Wasserfall (Cashflow)
      else if (e.wasserfall) {
        const max = Math.max(...e.wasserfall.map(x => x.v)) || 1;
        extra = `<div class="rc-wf">${e.wasserfall.map(x =>
          `<div class="rc-wf-i">
             <i class="${x.typ}" style="height:${Math.max(5, x.v / max * 100).toFixed(1)}%"></i>
             <span>${esc(x.l)}</span>
             <b>${eur(x.v)}</b>
           </div>`).join("")}</div>`;
      }
      // Kaufpreisfaktor auf einer Skala
      else if (e.faktor != null) {
        const pos = Math.max(0, Math.min(100, (e.faktor - 12) / 28 * 100));
        extra = `<div class="rc-faktor">
            <div class="rc-fk-bar"><i style="left:${pos.toFixed(1)}%"></i></div>
            <div class="rc-fk-marks"><span>12×<small>günstig</small></span><span>20×</span><span>28×</span><span>40×<small>teuer</small></span></div>
          </div>`;
      }
      // Grenzen bei der Mieterhöhung
      else if (e.grenzen) {
        const g = e.grenzen, max = Math.max(g.kappung, g.vergleich) || 1;
        const bar = (v, kl, l) => `<div class="rc-vg"><span>${l}</span><i class="${kl}" style="width:${(v / max * 100).toFixed(1)}%"></i><b>${eur(v)}</b></div>`;
        extra = `<div class="rc-verg">
          ${bar(g.aktuell, "grau", "heute")}
          ${bar(g.kappung, "alt", "Kappung")}
          ${bar(g.vergleich, "alt", "Vergleich")}
          ${bar(g.neu, "", "zulässig")}
        </div>`;
      }
      // Zwei Werte gegenüberstellen
      else if (e.vergleich) {
        const max = Math.max(e.vergleich.a, e.vergleich.b) || 1;
        const fmt = (v) => e.vergleich.waehrung === false ? Math.round(v) + " " + (e.vergleich.einheit || "") : eur(v);
        extra = `<div class="rc-verg">
          <div class="rc-vg"><span>${esc(e.vergleich.la || "Immobilie")}</span><i style="width:${(e.vergleich.a / max * 100).toFixed(1)}%"></i><b>${e.vergleich.einheit ? Math.round(e.vergleich.a) + " " + e.vergleich.einheit : eur(e.vergleich.a)}</b></div>
          <div class="rc-vg"><span>${esc(e.vergleich.lb || "Alternative")}</span><i class="alt" style="width:${(e.vergleich.b / max * 100).toFixed(1)}%"></i><b>${e.vergleich.einheit ? Math.round(e.vergleich.b) + " " + e.vergleich.einheit : eur(e.vergleich.b)}</b></div>
        </div>`;
      }
      sheet.querySelector("#rcErgebnis").innerHTML = `
        ${extra}
        <div class="rc-zeilen">${e.zeilen.map(z =>
          `<div class="rc-z${z.gross ? " gross" : ""}"><span>${esc(z.l)}</span><b>${esc(z.v)}</b></div>`).join("")}</div>
        <div class="rc-fazit">${esc(e.fazit)}</div>
        ${e.rechtlich ? `<div class="wi-hinweis">Orientierung, keine Rechtsberatung.</div>` : ""}`;
    };
    sheet.querySelectorAll(".rc-i").forEach(i => i.addEventListener("input", rechnen));
    rechnen();
  }

  // Kleines Liniendiagramm für den Zinseszins-Verlauf
  function rcVerlauf(werte) {
    const max = Math.max(...werte) || 1, n = werte.length;
    const pkt = werte.map((v, i) => `${(i / (n - 1) * 200).toFixed(1)},${(70 - v / max * 62).toFixed(1)}`).join(" ");
    return `<svg viewBox="0 0 200 72" class="rc-svg" preserveAspectRatio="none">
      <polyline points="${pkt}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg><div class="rc-leg-s"><span>Start</span><span>Ende</span></div>`;
  }
  // Jede Kennzahl bekommt ein kleines "i". Aufbau: Was ist das, wie rechnet ESTRIQ,
  // was ist ein guter Wert, und eine kleine Grafik zur Veranschaulichung.
  const KPI_INFO = {
    einnahmen: {
      titel: "Einnahmen pro Monat",
      kurz: "Was tatsächlich jeden Monat auf dein Konto kommt.",
      text: "Summe aller Mieten aus <b>vermieteten</b> Einheiten. Leerstehende Wohnungen zählen hier nicht mit — die findest du im Potenzial.",
      formel: "Kaltmiete + Nebenkosten (aller vermieteten Einheiten)",
      merke: "Einnahmen sind nicht dein Gewinn. Kreditrate und laufende Kosten gehen noch ab — das siehst du im Netto-Cashflow.",
      grafik: "balken"
    },
    potenzial: {
      titel: "Potenzial pro Monat",
      kurz: "Was möglich wäre, wenn alles vermietet ist.",
      text: "Rechnet alle Einheiten mit, auch die leerstehenden. Die Lücke zu den echten Einnahmen ist dein <b>Leerstandsverlust</b>.",
      formel: "Einnahmen bei Vollvermietung",
      merke: "Jeder Monat Leerstand ist verlorenes Geld, das nicht nachgeholt werden kann.",
      grafik: "luecke"
    },
    cashflow: {
      titel: "Netto-Cashflow",
      kurz: "Was am Monatsende wirklich übrig bleibt.",
      text: "Die ehrlichste Zahl im Dashboard. Von den Einnahmen wird die Kreditrate abgezogen. Ist sie negativ, legst du jeden Monat Geld drauf.",
      formel: "Einnahmen − Tilgung − Zinsen",
      merke: "Ein negativer Cashflow ist nicht automatisch schlecht: Tilgung ist Vermögensaufbau. Aber du musst ihn dir leisten können.",
      grafik: "wasserfall"
    },
    rendite: {
      titel: "Bruttomietrendite",
      kurz: "Wie viel Prozent deines Kaufpreises die Miete jährlich einbringt.",
      text: "Die Standardkennzahl zum Vergleichen von Objekten. Sie sagt nichts über Kosten oder Finanzierung — dafür ist sie schnell und überall gleich gerechnet.",
      formel: "(Jahreskaltmiete ÷ Investition) × 100",
      merke: "Als grobe Orientierung: unter 4 % wird es in der Regel schwer, positiven Cashflow zu erreichen. Ab etwa 6 % wird es interessant. Die Lage entscheidet mit.",
      grafik: "skala"
    },
    auslastung: {
      titel: "Auslastung",
      kurz: "Wie viele deiner Einheiten vermietet sind.",
      text: "Verhältnis von vermieteten zu allen Einheiten. Schon eine leere Wohnung von fünf drückt deine Einnahmen um rund 20 Prozent.",
      formel: "(Vermietete Einheiten ÷ alle Einheiten) × 100",
      merke: "Dauerhafter Leerstand hat fast immer einen von drei Gründen: zu hoher Preis, schlechter Zustand oder schwache Lage.",
      grafik: "kreis"
    },
    restschuld: {
      titel: "Restschuld",
      kurz: "Was du der Bank aktuell noch schuldest.",
      text: "Summe aller offenen Kredite. Sie sinkt mit jeder Tilgungsrate und mit Sondertilgungen.",
      formel: "Ursprungsdarlehen − geleistete Tilgung",
      merke: "Die Restschuld allein sagt wenig. Entscheidend ist, ob der Wert der Immobilie darüber liegt und ob du die Rate tragen kannst.",
      grafik: "abbau"
    },
    tilgung: {
      titel: "Tilgung pro Monat",
      kurz: "Der Teil deiner Rate, der die Schulden verringert.",
      text: "Deine Kreditrate besteht aus Zins und Tilgung. Nur die Tilgung baut Vermögen auf — der Zins ist der Preis fürs Geliehene.",
      formel: "Kreditrate − Zinsanteil",
      merke: "Am Anfang der Laufzeit ist der Zinsanteil hoch. Mit jeder Rate verschiebt sich das Verhältnis zugunsten der Tilgung.",
      grafik: "zinstilgung"
    },
    invest: {
      titel: "Investition",
      kurz: "Was dich das Objekt insgesamt gekostet hat.",
      text: "Kaufpreis plus Kaufnebenkosten: Grunderwerbsteuer, Notar, Grundbuch und gegebenenfalls Makler. Basis für alle Renditekennzahlen.",
      formel: "Kaufpreis + Kaufnebenkosten",
      merke: "Die Kaufnebenkosten liegen in Deutschland je nach Bundesland bei etwa 9 bis 15 Prozent. Wer sie weglässt, rechnet sich die Rendite schön.",
      grafik: "anteile"
    },
    roi: {
      titel: "Cashflow-ROI",
      kurz: "Wie stark sich dein eingesetztes Kapital verzinst.",
      text: "Setzt den jährlichen Netto-Cashflow ins Verhältnis zur Investition. Anders als die Bruttorendite berücksichtigt er die Finanzierung.",
      formel: "(Netto-Cashflow × 12 ÷ Investition) × 100",
      merke: "Vergleich diesen Wert mit dem, was dein Geld woanders bringen würde — das nennt man Opportunitätskosten.",
      grafik: "skala"
    },
    nkpuffer: {
      titel: "Nebenkosten-Rücklage",
      kurz: "Was du für Betriebskosten zurücklegst.",
      text: "Nebenkosten sind durchlaufende Posten: Dein Mieter zahlt sie voraus, du gibst sie für Heizung, Wasser, Müll und Versicherung wieder aus.",
      formel: "Nebenkostenvorauszahlungen der Mieter",
      merke: "Nebenkosten als Gewinn zu zählen ist der häufigste Rechenfehler von Vermietern. Am Jahresende sind sie meist weg.",
      grafik: "durchlauf"
    }
  };

  // Kleine Grafiken zu den Erklärungen (schlicht, ohne Zusatzbibliothek)
  function infoGrafik(art) {
    const g = (inhalt) => `<div class="ig">${inhalt}</div>`;
    switch (art) {
      case "balken": return g(`
        <div class="ig-bal"><span style="height:78%"></span><span style="height:88%"></span><span style="height:84%"></span><span style="height:92%"></span></div>
        <div class="ig-cap">Monatliche Mieteingänge</div>`);
      case "luecke": return g(`
        <div class="ig-stack"><div class="ig-voll"><i style="width:100%"></i><span>Potenzial</span></div>
          <div class="ig-voll"><i class="ist" style="width:80%"></i><span>tatsächlich</span></div></div>
        <div class="ig-cap">Die Lücke ist dein Leerstand</div>`);
      case "wasserfall": return g(`
        <div class="ig-wf">
          <div class="ig-wf-i"><b>+</b><i style="height:100%"></i><span>Miete</span></div>
          <div class="ig-wf-i"><b>−</b><i class="ab" style="height:58%"></i><span>Rate</span></div>
          <div class="ig-wf-i"><b>=</b><i class="rest" style="height:42%"></i><span>übrig</span></div>
        </div>
        <div class="ig-cap">Von der Miete zur Rate zum Rest</div>`);
      case "skala": return g(`
        <div class="ig-skala"><div class="ig-sk-bar"><i></i></div>
          <div class="ig-sk-marks"><span>0 %</span><span>4 %</span><span>6 %</span><span>10 %</span></div></div>
        <div class="ig-cap">Grobe Einordnung — die Lage entscheidet mit</div>`);
      case "kreis": return g(`
        <div class="ig-kreis" style="--p:80"><div class="ig-kr-in">80<small>%</small></div></div>
        <div class="ig-cap">4 von 5 Einheiten vermietet</div>`);
      case "abbau": return g(`
        <svg viewBox="0 0 200 70" class="ig-svg"><path d="M0,12 C60,16 120,42 200,62" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
        <div class="ig-cap">Restschuld sinkt mit jeder Rate</div>`);
      case "zinstilgung": return g(`
        <div class="ig-zt">
          <div class="ig-zt-r"><span>Jahr 1</span><i class="z" style="width:70%"></i><i class="t" style="width:30%"></i></div>
          <div class="ig-zt-r"><span>Jahr 10</span><i class="z" style="width:48%"></i><i class="t" style="width:52%"></i></div>
          <div class="ig-zt-r"><span>Jahr 20</span><i class="z" style="width:22%"></i><i class="t" style="width:78%"></i></div>
        </div>
        <div class="ig-leg"><b class="z"></b>Zins <b class="t"></b>Tilgung</div>`);
      case "anteile": return g(`
        <div class="ig-anteil"><i style="width:88%">Kaufpreis</i><i class="nk" style="width:12%">NK</i></div>
        <div class="ig-cap">Kaufnebenkosten: rund 9 – 15 %</div>`);
      case "durchlauf": return g(`
        <div class="ig-durch"><span>Mieter zahlt</span><b>→</b><span>du legst zurück</span><b>→</b><span>Versorger</span></div>
        <div class="ig-cap">Durchlaufender Posten, kein Gewinn</div>`);
      default: return "";
    }
  }

  function openInfoSheet(schluessel) {
    const i = KPI_INFO[schluessel];
    if (!i) return;
    const body = `
      <div class="info-kopf">
        <div class="info-kurz">${esc(i.kurz)}</div>
      </div>
      ${infoGrafik(i.grafik)}
      <p class="info-text">${i.text}</p>
      <div class="info-formel"><span>So rechnet ESTRIQ</span><b>${esc(i.formel)}</b></div>
      <div class="info-merke"><span>Merke</span>${esc(i.merke)}</div>
      <button class="wc-cta" id="infoTools" style="margin-top:20px">Passende Rechner öffnen</button>`;
    const sheet = openSheet(i.titel, "", body);
    sheet.querySelector("#infoTools").onclick = () => { closeSheet(); route("tools"); };
  }

  // Kleines "i" für eine Kennzahl
  function infoIcon(schluessel) {
    return KPI_INFO[schluessel]
      ? `<button class="kpi-i" data-info="${schluessel}" aria-label="Erklärung" title="Was bedeutet das?">i</button>`
      : "";
  }

  function kpiCard(icon, num, lab, desc, accent, action, info) {
    return `<div class="card kpi ${accent ? 'accent' : ''}${action ? ' clickable' : ''}"${action ? ` data-act="${action}"` : ''}><div class="card-glow"></div>
      ${action ? '<span class="tapme">Details ›</span>' : ''}
      ${infoIcon(info)}
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
          <stop offset="0%" stop-color="color-mix(in srgb,var(--mint) 34%,transparent)"/><stop offset="100%" stop-color="transparent"/>
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
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="color-mix(in srgb,var(--bg) 60%,transparent)" stroke-width="14"/>
      ${rings}
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="var(--text)" font-family="var(--fdisp)" font-size="26" font-weight="600">${eur(total).replace(/\s?€/, "")}</text>
      <text x="${cx}" y="${cy + 16}" text-anchor="middle" fill="var(--soft)" font-size="11">€ / Monat</text>
    </svg>`;
  }

  // Palette folgt dem Akzent: liest die aktuellen CSS-Variablen zur Laufzeit
  function cssVar(name, fallback) {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (_) { return fallback; }
  }
  function palette() {
    const mint = cssVar("--mint", "#2dd4bf");
    const mint2 = cssVar("--mint-2", "#5eead4");
    const deep = cssVar("--deep", "#0f766e");
    const gold = cssVar("--gold", "#d8b978");
    return [mint, deep, mint2, gold,
      "color-mix(in srgb," + mint + " 60%,#000)",
      "color-mix(in srgb," + mint2 + " 70%," + deep + ")"];
  }
  let PALETTE = palette();  // wird bei Themewechsel neu befüllt

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
  /* ---------- BEARBEITEN: Formular-Bausteine ---------- */
  // Einzelnes Eingabefeld
  function ef(label, name, wert, typ, opt) {
    opt = opt || {};
    const v = (wert === null || wert === undefined) ? "" : wert;
    const step = typ === "number" ? ` step="${opt.step || "0.01"}"` : "";
    const ph = opt.platzhalter ? ` placeholder="${esc(opt.platzhalter)}"` : "";
    return `<div class="ef-row">
      <label class="ef-l">${esc(label)}${opt.pflicht ? ' <span class="ef-req">*</span>' : ""}</label>
      <input class="ef-i" data-f="${name}" type="${typ || "text"}"${step}${ph}
             value="${esc(v)}"${opt.readonly ? " readonly" : ""}>
      ${opt.hinweis ? `<div class="ef-h">${esc(opt.hinweis)}</div>` : ""}
    </div>`;
  }
  // Auswahlfeld
  function efSel(label, name, wert, optionen, opt) {
    opt = opt || {};
    return `<div class="ef-row">
      <label class="ef-l">${esc(label)}</label>
      <select class="ef-i" data-f="${name}">
        ${optionen.map(o => `<option value="${esc(o.v)}"${o.v === wert ? " selected" : ""}>${esc(o.t)}</option>`).join("")}
      </select>
      ${opt.hinweis ? `<div class="ef-h">${esc(opt.hinweis)}</div>` : ""}
    </div>`;
  }
  // Mehrzeiliges Feld
  function efArea(label, name, wert, opt) {
    opt = opt || {};
    return `<div class="ef-row">
      <label class="ef-l">${esc(label)}</label>
      <textarea class="ef-i" data-f="${name}" rows="3">${esc(wert || "")}</textarea>
      ${opt.hinweis ? `<div class="ef-h">${esc(opt.hinweis)}</div>` : ""}
    </div>`;
  }
  // Abschnittsüberschrift im Formular
  const efTitel = (t) => `<div class="ef-sec">${esc(t)}</div>`;
  // Knopfleiste
  function efAktionen(opt) {
    opt = opt || {};
    return `<div class="ef-actions">
      <button class="ef-save" id="efSave">${esc(opt.speichern || "Speichern")}</button>
      ${opt.loeschen ? `<button class="ef-del" id="efDel">${esc(opt.loeschen)}</button>` : ""}
    </div>
    <div class="ef-msg" id="efMsg"></div>`;
  }
  // Werte aus dem Formular auslesen
  function efWerte(wurzel) {
    const o = {};
    wurzel.querySelectorAll("[data-f]").forEach(n => { o[n.dataset.f] = n.value; });
    return o;
  }
  const zahl = v => (v === "" || v === null || v === undefined) ? null : Number(v);
  const text = v => (v === "" || v === null || v === undefined) ? null : String(v).trim();

  // Speichern-Knopf verdrahten, inkl. Fehleranzeige
  function efBind(sheet, speichernFn, loeschenFn, loeschFrage, nachErfolg) {
    const msg = sheet.querySelector("#efMsg");
    const btn = sheet.querySelector("#efSave");
    if (btn) btn.onclick = async () => {
      msg.textContent = "Speichere…"; msg.className = "ef-msg";
      btn.disabled = true;
      try {
        await speichernFn(efWerte(sheet));
        closeSheet();
        await window.nachSpeichern();
        if (nachErfolg) nachErfolg();
      } catch (e) {
        msg.textContent = window.fehlerText(e);
        msg.className = "ef-msg bad";
        btn.disabled = false;
      }
    };
    const del = sheet.querySelector("#efDel");
    if (del && loeschenFn) del.onclick = async () => {
      if (del.dataset.sicher !== "1") {
        del.dataset.sicher = "1";
        del.textContent = loeschFrage || "Wirklich löschen?";
        del.classList.add("armed");
        setTimeout(() => {
          if (del.dataset.sicher === "1") {
            del.dataset.sicher = ""; del.textContent = "Löschen"; del.classList.remove("armed");
          }
        }, 4000);
        return;
      }
      msg.textContent = "Lösche…"; msg.className = "ef-msg";
      del.disabled = true;
      try {
        await loeschenFn();
        closeSheet();
        await window.nachSpeichern();
      } catch (e) {
        msg.textContent = window.fehlerText(e);
        msg.className = "ef-msg bad";
        del.disabled = false;
      }
    };
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
        <input id="qInput" type="search" placeholder="z. B. Wie viel Miete nehme ich ein?"
               autocomplete="off" enterkeyhint="search">
        <button class="mic-btn" id="micBtn" title="Spracheingabe" aria-label="Spracheingabe">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
               stroke-linecap="round"><path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z"/>
          <path d="M19 11a7 7 0 0 1-14 0"/><path d="M12 18v3"/></svg>
        </button>
      </div>
      <div class="search-hint" id="qHint">Tipp: „Restschuld", „freie Wohnung", „Rendite"</div>
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
            hint.textContent = 'Tipp: „Restschuld", „freie Wohnung", „Rendite"';
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
    const ava = currentUser && currentUser.avatar;
    const avaHtml = ava
      ? `<div class="hello-ava" style="background-image:url(${esc(ava)})"></div>`
      : (name ? `<div class="hello-ava hello-ava-i">${esc(name.slice(0,1).toUpperCase())}</div>` : "");
    return el(`<div class="card pad hello${avaHtml ? " has-ava" : ""}">
      ${avaHtml}
      <div class="hello-body">
        <div class="hello-t">${esc(gruss)}</div>
        ${fakt ? `<div class="hello-f">${fakt}</div>` : ""}
        <div class="hello-d">${esc(datum)}</div>
      </div></div>`);
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
      ${kpiCard("euro", eur(ist), "Einnahmen / Monat", "alle Objekte", true, null, "einnahmen")}
      ${kpiCard("layers", eur(pot), "Potenzial / Monat", "+" + eur(pot - ist) + " ungenutzt", false, null, "potenzial")}
      ${kpiCard("wallet", eur(netto), "Netto-Cashflow", "nach Tilgung", netto >= 0, null, "cashflow")}
      ${kpiCard("home", occ + " %", "Auslastung", let_ + " / " + units + " Einheiten", occ >= 60, null, "auslastung")}
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
            <span class="mini-track"><span style="width:${m.einheiten > 0 ? Math.round(m.vermietet / m.einheiten * 100) : 0}%"></span></span>
            <span class="mini-val">${m.vermietet}/${m.einheiten}</span></div>
          <div class="mini-row"><span class="mini-lab">Rendite</span>
            <span class="mini-track"><span style="width:${Math.max(2, Math.min(100, k.bruttoRendite / 10 * 100))}%"></span></span>
            <span class="mini-val">${k.bruttoRendite.toLocaleString("de-DE")} %</span></div>
        </div></div>`;
    }).join("");
    const grid = el(`<div class="grid g-objekte">${cards}</div>`);
    grid.querySelectorAll(".obj-card").forEach(c => c.onclick = () => route(c.dataset.id));
    host.appendChild(grid);

    const addObj = el(`<div class="card pad add-card"><button class="add-btn wide" id="addObjekt">+ Objekt anlegen</button></div>`);
    addObj.querySelector("#addObjekt").onclick = () => { if (pruefeObjekt("miete")) assistentObjekt("miete"); };
    host.appendChild(addObj);

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
      ${kpiCard("euro", eur(t.ist), "Einnahmen / Monat", "aktuell vermietet", true, "einnahmen", "einnahmen")}
      ${kpiCard("layers", eur(t.potenzial), "Potenzial / Monat", "+" + eur(upside) + " ungenutzt", false, "potenzial", "potenzial")}
      ${kpiCard("wallet", eur(nettoMonth), "Netto-Cashflow", "nach Tilgung", nettoMonth >= 0, "netto", "cashflow")}
      ${kpiCard("home", occ + " %", "Auslastung", unitsLet + " / " + unitsTotal + " Einheiten", occ >= 60, "auslastung", "auslastung")}
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
      ${kpiCard("bank", eur(debtMonth), "Tilgung / Monat", eur(debtMonth * 12) + " / Jahr", false, "tilgung", "tilgung")}
      ${kpiCard("debt", eur(debtRest), "Restschuld heute", "exakt " + eur2(debtRest), false, "schuld", "restschuld")}
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
    miete:   { col: "var(--mint)", bg: "color-mix(in srgb,var(--mint) 14%,transparent)",  br: "color-mix(in srgb,var(--mint) 40%,transparent)",  label: "Miete" },
    einzug:  { col: "var(--mint-2)", bg: "color-mix(in srgb,var(--mint-2) 14%,transparent)", br: "color-mix(in srgb,var(--mint-2) 40%,transparent)", label: "Einzug" },
    zahlung: { col: "#d8b978", bg: "rgba(216,185,120,.16)", br: "rgba(216,185,120,.45)",label: "Zahlung" },
    termin:  { col: "var(--deep)", bg: "color-mix(in srgb,var(--deep) 20%,transparent)",  br: "color-mix(in srgb,var(--deep) 45%,transparent)",  label: "Termin" }
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
          <button class="cal-btn" id="calAdd" aria-label="Termin anlegen" title="Termin anlegen">+</button>
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
          return `<div class="cal-ev${e._id ? " clickable" : ""}" ${e._id ? `data-ti="${evts.indexOf(e)}"` : ""} style="border-left-color:${c.col}">
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

      // Termin anlegen / bearbeiten
      const neuBtn = card.querySelector("#calAdd");
      if (neuBtn) neuBtn.onclick = () => {
        const vor = calSelected
          ? { titel: "", datum: calSelected, typ: "termin" }
          : null;
        openTerminEdit(vor ? { titel: "", datum: calSelected, typ: "termin" } : null, true);
      };
      detail.querySelectorAll(".cal-ev[data-ti]").forEach(n => n.onclick = (ev) => {
        ev.stopPropagation();
        const key = calSelected;
        const liste = (map[key] || []);
        const t = liste[Number(n.dataset.ti)];
        if (t && t._id) openTerminEdit(t, false);
      });

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
    const w = D.wetter || { ort: null, lat: null, lon: null };
    const card = el(`<div class="card">
      <div class="card-h"><div><div class="card-t">Wetter</div>
        <div class="card-s" id="wOrt">${w.ort ? esc(w.ort) + " · " : ""}Tag antippen für Stundenverlauf</div></div>
        <div class="head-pill" style="padding:7px 13px" id="wNow">lädt…</div></div>
      <div class="card-b" id="wBody"><div class="note">Wetterdaten werden geladen…</div></div></div>`);

    function ladeWetter(lat, lon, ortName) {
      const ortEl = card.querySelector("#wOrt");
      if (ortName && ortEl) ortEl.textContent = ortName + " · Tag antippen für Stundenverlauf";
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
      + `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m`
      + `&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m`
      + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,sunrise,sunset`
      + `&timezone=auto&forecast_days=5`;
      fetchWetter(url);
    }

    // Ort bestimmen: hinterlegter Ort > Gerätestandort > Karte ausblenden
    if (w.lat && w.lon) {
      ladeWetter(w.lat, w.lon, w.ort);
    } else if (navigator.geolocation) {
      card.querySelector("#wNow").textContent = "Standort…";
      navigator.geolocation.getCurrentPosition(
        pos => ladeWetter(pos.coords.latitude, pos.coords.longitude, "Dein Standort"),
        ()  => { card.style.display = "none"; },
        { timeout: 8000, maximumAge: 3600000 }
      );
    } else {
      card.style.display = "none";
    }

    function fetchWetter(url) {
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
    }
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

    // Objektstammdaten bearbeiten
    const bar = el(`<div class="obj-bar">
      <button class="add-btn" id="editObj">Objekt bearbeiten</button></div>`);
    bar.querySelector("#editObj").onclick = () => openObjektEdit(s, false);
    host.appendChild(bar);

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
      <div class="note" style="margin-top:12px">Kürzere Aufenthalte bringen mehr Reinigungsgebühren, verursachen aber auch mehr Reinigungs- und Verbrauchskosten.</div>
      <button class="ef-open" id="efEdit">Werte bearbeiten</button>`;
    const sh = openSheet("Airbnb-Kalkulation", occ + " % Auslastung · " + eur(cfg.nachtpreis) + "/Nacht", body);
    const astream = (D.streams || []).find(x => x.kind === "airbnb");
    sh.querySelector("#efEdit").onclick = () => openAirbnbEdit(astream);
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
      <div class="card-s">Zeile antippen für Vertragsdetails</div></div>
      <button class="add-btn" id="addPacht">+ Vertrag</button></div><div class="card-b">${rows}</div></div>`);
    pTbl.querySelectorAll(".drow[data-vi]").forEach(r =>
      r.onclick = () => openPachtSheet(s, sorted[Number(r.dataset.vi)]));
    pTbl.querySelector("#addPacht").onclick = () => openPachtEdit(s, null, true);
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
      <div class="note" style="margin-top:12px">${proHa >= schnitt ? "Über" : "Unter"} dem Durchschnitt von ${eur(schnitt)} je Hektar (${proHa >= schnitt ? "+" : ""}${eur(proHa - schnitt)}).</div>
      <button class="ef-open" id="efEdit">Bearbeiten</button>`;
    const sh = openSheet(v.paechter, v.flaeche.toLocaleString("de-DE") + " ha · " + v.art, body);
    sh.querySelector("#efEdit").onclick = () => openPachtEdit(s, v, false);
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
      // Rendite-Kennzahlen für alle Objekte
      host.appendChild(wireActs(el(`<div class="grid g-kpi">
        ${kpiCard("wallet", eur(m.netto), "Netto-Cashflow / Monat", "nach Kreditrate", m.netto >= 0, "cf", "cashflow")}
        ${kpiCard("trend", k.bruttoRendite.toLocaleString("de-DE") + " %", "Bruttomietrendite", "Kaltmiete / Invest", false, null, "rendite")}
        ${kpiCard("chart", k.cashflowRoi.toLocaleString("de-DE") + " %", "Cashflow-ROI", "netto / Invest p.a.", false, null, "roi")}
        ${kpiCard("coins", eur(k.invest), "Investition", "eingesetztes Kapital", false, null, "invest")}
      </div>`), { cf: () => openCashflowSheet(s) }));
      // Zweite Reihe mit Einnahmen/Tilgung/Restschuld (nützlich bei mehreren Krediten)
      host.appendChild(wireActs(el(`<div class="grid g-kpi">
        ${kpiCard("euro", eur(m.gesamt), "Einnahmen / Monat", m.vermietet + "/" + m.einheiten + " vermietet", true)}
        ${kpiCard("layers", eur(m.gesamtPotenzial), "Potenzial / Monat", "bei Vollvermietung")}
        ${kpiCard("bank", eur(k.kreditAbtrag), "Tilgung / Monat", kredite.length + (kredite.length === 1 ? " Kredit" : " Kredite"), false, null, "tilgung")}
        ${kpiCard("debt", eur(k.restschuldGesamt), "Restschuld heute", "exakt " + eur2(k.restschuldGesamt), false, null, "restschuld")}
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
    const addKr = el(`<div class="card pad add-card"><button class="add-btn wide" id="addCredit">+ Kredit hinzufügen</button></div>`);
    addKr.querySelector("#addCredit").onclick = () => openCreditEdit(s, null, true);
    host.appendChild(addKr);

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
      <div class="card-s">Zeile antippen für Mieter- und Vertragsdaten</div></div>
      <button class="add-btn" id="addUnit">+ Einheit</button></div><div class="card-b">${rows}</div></div>`);
    tblCard.querySelectorAll(".drow[data-i]").forEach(r =>
      r.onclick = () => openUnitSheet(s, (s.einheiten || [])[Number(r.dataset.i)]));
    tblCard.querySelector("#addUnit").onclick = () => { if (pruefeEinheit()) assistentEinheit(s); };
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
      <div class="note" style="margin-top:16px">Vergleich: ${proM2 >= schnitt ? "über" : "unter"} dem Objektschnitt von ${schnitt.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/m².</div>
      <button class="ef-open" id="efEdit">Bearbeiten</button>`;
    const sh = openSheet(u.wohnung + " · " + u.flaeche + " m²", s.name, body);
    sh.querySelector("#efEdit").onclick = () => openUnitEdit(s, u, false);
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
      <tbody>${trs}</tbody></table>
      <button class="ef-open" id="efEdit">Bearbeiten</button>`;
    const sh = openSheet(kr.name || "Kredit", eur(kr.summe) + " · " + (kr.zinsPa || 0).toLocaleString("de-DE") + " % · " + eur(kr.abtragMonat) + "/Monat", body);
    const kstream = (D.streams || []).find(x => FE.creditsOf(x).some(c => c._id === kr._id));
    sh.querySelector("#efEdit").onclick = () => openCreditEdit(kstream, kr, false);
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
    const pos = (s.nkPositionen || []).map((p, i) => {
      // Neue Daten haben feste Beträge; alte hatten Prozent-Anteile
      const wert = p.betrag != null ? Number(p.betrag) : (m.nkPuffer * (p.anteil || 0) / 100);
      return { label: p.titel, value: wert, color: PALETTE[i % PALETTE.length], display: eur(wert) + " /Monat" };
    });
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
        ${(t.miete + t.airbnb) > 0 ? `<div class="tl-i"><span class="tl-dot" style="background:${EVT.miete.col}"></span>
          <div class="tl-b"><div class="tl-t">Mieteingang</div>
            <div class="tl-s">jeden 1. des Monats · alle Objekte</div></div>
          <span class="tl-v">${eur(t.miete + t.airbnb)}</span></div>` : ""}
        ${(D.streams || []).flatMap(s => FE.creditsOf(s).filter(kr => kr.sondertilgung).map(kr => {
          const st = kr.sondertilgung;
          const monLabel = (st.monate || []).map(m => ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][m-1]).join(" und ");
          return `<div class="tl-i"><span class="tl-dot" style="background:${EVT.zahlung.col}"></span>
            <div class="tl-b"><div class="tl-t">Sondertilgung ${esc(kr.name || "")}</div>
              <div class="tl-s">${monLabel || "jährlich"}</div></div>
            <span class="tl-v">${eur(st.betrag || 0)}</span></div>`;
        })).join("")}
        ${pachtJahr > 0 ? `<div class="tl-i"><span class="tl-dot" style="background:${EVT.zahlung.col}"></span>
          <div class="tl-b"><div class="tl-t">Pachtzahlung</div>
            <div class="tl-s">jährlich</div></div>
          <span class="tl-v">${eur(pachtJahr)}</span></div>` : ""}
      </div>
      <div class="card-t" style="font-size:14px;margin:20px 0 10px">Termine je Monat</div>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Monat</th><th>Miete</th><th>Einzug</th><th>Zahlung</th><th>Gesamt</th></tr></thead>
        <tbody>${trs}</tbody></table></div>
      <div class="note" style="margin-top:12px">Sondertilgungen und Pacht summieren sich über das Jahr auf ${eur(sonderJahr + pachtJahr)}.</div>`;
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

  /* ---------- BEARBEITEN: Masken ---------- */

  // --- Wohneinheit ---
  function openUnitEdit(s, u, neu) {
    const v = (u && u.vertrag) || {};
    const fix = s.einheiten && s.einheiten.some(x => x.kaltFix != null);
    const body = `
      ${efTitel("Grunddaten")}
      ${ef("Bezeichnung", "bezeichnung", u ? u.wohnung : "", "text", { pflicht: true, platzhalter: "z. B. WE 6" })}
      ${ef("Fläche in m²", "flaeche", u ? u.flaeche : "", "number", { step: "0.01" })}
      ${efSel("Status", "status", u ? u.status : "frei",
        [{ v: "vermietet", t: "vermietet" }, { v: "frei", t: "frei" }])}
      ${efTitel("Miete")}
      ${fix
        ? ef("Kaltmiete fix", "kalt_fix", u ? (u.kaltFix ?? "") : "", "number", { hinweis: "Fester Betrag statt €/m²" }) +
          ef("Nebenkosten fix", "nk_fix", u ? (u.nkFix ?? "") : "", "number")
        : ef("Kalt je m²", "kalt_pro_m2", u ? (u.kaltProM2 ?? "") : "", "number") +
          ef("Nebenkosten je m²", "nk_pro_m2", u ? (u.nkProM2 ?? "") : "", "number")}
      ${ef("Küche", "kueche", u ? (u.kueche ?? "") : "", "number")}
      ${ef("Strom", "strom", u ? (u.strom ?? "") : "", "number")}
      ${ef("Stellplatz", "stellplatz", u ? (u.stellplatz ?? "") : "", "number")}
      ${efTitel("Mieter")}
      ${ef("Name", "mieter", u ? (u.mieter || "") : "")}
      ${ef("Einzug", "einzug", u ? (u.einzug || "") : "", "date")}
      ${ef("Telefon", "v_telefon", v.telefon || "")}
      ${ef("E-Mail", "v_email", v.email || "", "email")}
      ${efTitel("Vertrag")}
      ${ef("Miete fällig am", "zahltag", (u && u.zahltag) || 1, "number",
        { hinweis: "Tag im Monat – danach fragt ESTRIQ beim Login nach dem Zahlungseingang", platzhalter: "1" })}
      ${ef("Kaution", "v_kaution", v.kaution ?? "", "number")}
      ${ef("Vertragsdatum", "v_vertragsdatum", v.vertragsdatum || "", "date")}
      ${ef("Laufzeit", "v_laufzeit", v.laufzeit || "", "text", { platzhalter: "z. B. unbefristet" })}
      ${ef("Kündigungsfrist", "v_kuendigungsfrist", v.kuendigungsfrist || "", "text", { platzhalter: "z. B. 3 Monate" })}
      ${efArea("Notiz", "v_notiz", v.notiz || "")}
      ${efAktionen({ loeschen: neu ? null : "Löschen" })}`;

    const sheet = openSheet(neu ? "Neue Einheit" : "Bearbeiten",
      (neu ? "" : u.wohnung + " · ") + s.name, body);

    const bauen = (w) => {
      const o = {
        bezeichnung: text(w.bezeichnung) || "Einheit",
        flaeche: zahl(w.flaeche),
        status: w.status,
        kueche: zahl(w.kueche), strom: zahl(w.strom), stellplatz: zahl(w.stellplatz),
        mieter: text(w.mieter), einzug: text(w.einzug),
        zahltag: Math.min(31, Math.max(1, Number(w.zahltag) || 1)),
        vertrag: {
          kaution: zahl(w.v_kaution),
          vertragsdatum: text(w.v_vertragsdatum),
          laufzeit: text(w.v_laufzeit),
          kuendigungsfrist: text(w.v_kuendigungsfrist),
          telefon: w.v_telefon || "", email: w.v_email || "", notiz: w.v_notiz || ""
        }
      };
      if ("kalt_fix" in w) { o.kalt_fix = zahl(w.kalt_fix); o.nk_fix = zahl(w.nk_fix); }
      else { o.kalt_pro_m2 = zahl(w.kalt_pro_m2); o.nk_pro_m2 = zahl(w.nk_pro_m2); }
      return o;
    };
    efBind(sheet,
      async (w) => neu ? await neueEinheit(s._id, bauen(w)) : await speichereEinheit(u._id, bauen(w)),
      neu ? null : async () => await loescheEinheit(u._id),
      "Einheit endgültig löschen?");
  }

  // --- Kredit ---
  function openCreditEdit(s, kr, neu) {
    const st = (kr && kr.sondertilgung) || null;
    const body = `
      ${efTitel("Grunddaten")}
      ${ef("Bezeichnung", "name", kr ? kr.name : "", "text", { pflicht: true, platzhalter: "z. B. KfW-Darlehen" })}
      ${ef("Darlehenssumme", "summe", kr ? kr.summe : "", "number", { pflicht: true })}
      ${ef("Zinssatz % p. a.", "zins_pa", kr ? kr.zinsPa : "", "number", { step: "0.001", pflicht: true })}
      ${ef("Rate je Monat", "rate_monat", kr ? kr.abtragMonat : "", "number", { pflicht: true })}
      ${ef("Erste Rate am", "start", kr ? (kr.start || "") : "", "date",
        { hinweis: "Bestimmt den Tilgungsverlauf" })}
      ${efTitel("Kontostand")}
      ${ef("Restschuld laut Bank", "rest_stand_betrag", kr && kr.restStand ? kr.restStand.betrag : "", "number",
        { hinweis: "Maßgeblich für die Anzeige – überschreibt die Modellrechnung" })}
      ${ef("Stand vom", "rest_stand_datum", kr && kr.restStand ? kr.restStand.datum : "", "date")}
      ${efTitel("Sondertilgung")}
      ${ef("Betrag je Zahlung", "st_betrag", st ? st.betrag : "", "number",
        { hinweis: "Leer lassen, wenn keine Sondertilgung vereinbart ist" })}
      ${ef("Monate", "st_monate", st ? (st.monate || []).join(", ") : "", "text",
        { platzhalter: "z. B. 12  oder  6, 12", hinweis: "Monatsnummern durch Komma getrennt" })}
      ${efAktionen({ loeschen: neu ? null : "Löschen" })}`;

    const sheet = openSheet(neu ? "Neuer Kredit" : "Kredit bearbeiten",
      (neu ? "" : (kr.name + " · ")) + s.name, body);

    const bauen = (w) => {
      const monate = String(w.st_monate || "").split(",")
        .map(x => parseInt(x.trim(), 10)).filter(x => x >= 1 && x <= 12);
      const betrag = zahl(w.st_betrag);
      return {
        name: text(w.name) || "Kredit",
        summe: zahl(w.summe) || 0,
        zins_pa: zahl(w.zins_pa) || 0,
        rate_monat: zahl(w.rate_monat) || 0,
        start: text(w.start),
        rest_stand_betrag: zahl(w.rest_stand_betrag),
        rest_stand_datum: text(w.rest_stand_datum),
        sondertilgung: (betrag && monate.length) ? { betrag, monate } : null
      };
    };
    efBind(sheet,
      async (w) => neu ? await neuerKredit(s._id, bauen(w)) : await speichereKredit(kr._id, bauen(w)),
      neu ? null : async () => await loescheKredit(kr._id),
      "Kredit endgültig löschen?");
  }

  // --- Pachtvertrag ---
  function openPachtEdit(s, v, neu) {
    const body = `
      ${efTitel("Vertrag")}
      ${ef("Pächter", "paechter", v ? v.paechter : "", "text", { pflicht: true })}
      ${ef("Pacht je Jahr", "jahr_betrag", v ? v.jahr : "", "number", { pflicht: true })}
      ${ef("Fläche in ha", "flaeche", v ? v.flaeche : "", "number", { step: "0.01" })}
      ${ef("Flächenart", "art", v ? (v.art || "") : "", "text", { platzhalter: "z. B. Ackerland" })}
      ${efTitel("Laufzeit")}
      ${ef("Beginn", "start", v ? (v.start || "") : "", "date")}
      ${ef("Ende", "ende", v ? (v.ende || "") : "", "text",
        { platzhalter: "JJJJ-MM-TT oder „jährlich“", hinweis: "„jährlich“ bei automatischer Verlängerung" })}
      ${efAktionen({ loeschen: neu ? null : "Löschen" })}`;

    const sheet = openSheet(neu ? "Neuer Pachtvertrag" : "Vertrag bearbeiten",
      neu ? s.name : v.paechter, body);

    const bauen = (w) => ({
      paechter: text(w.paechter) || "Pächter",
      jahr_betrag: zahl(w.jahr_betrag) || 0,
      flaeche: zahl(w.flaeche),
      art: text(w.art),
      start: text(w.start),
      ende: text(w.ende)
    });
    efBind(sheet,
      async (w) => neu ? await neuerPachtvertrag(s._id, bauen(w)) : await speicherePacht(v._id, bauen(w)),
      neu ? null : async () => await loeschePacht(v._id),
      "Vertrag endgültig löschen?");
  }

  // --- Objekt ---
  function openObjektEdit(s, neu, artVorgabe, opt) {
    opt = opt || {};
    const nkPos = (s && s.nkPositionen) || [];
    const art = neu ? (artVorgabe || "miete") : (s ? s.kind : "miete");
    const artName = ART_INFO[art] ? ART_INFO[art].name : "Objekt";
    const body = `
      ${opt.nachOnboarding ? `<div class="wc-hero" style="padding-bottom:14px">
        <div class="wc-steps"><span class="done"></span><span class="on"></span><span></span></div>
        <div class="wc-badge">Dein erstes Objekt</div>
        <div class="wc-d">Gib deiner Immobilie einen Namen und trag die Eckdaten ein. Danach legst du gleich die erste Wohnung an.</div>
      </div>` : ""}
      ${neu && !opt.nachOnboarding ? `<div class="anlegen-kopf">${svg(ART_INFO[art] ? ART_INFO[art].icon : "home")}<span>${esc(artName)}</span></div>` : ""}
      ${efTitel("Grunddaten")}
      ${ef("Name", "name", s ? s.name : "", "text", { pflicht: true, platzhalter: art === "pacht" ? "z. B. Ackerland Nord" : "z. B. Haus Bergstraße 12" })}
      ${ef("Kurzname (intern)", "slug", s ? s.id : "", "text",
        { pflicht: true, hinweis: "Ohne Leerzeichen, z. B. haus-nord" })}
      ${neu ? "" : efSel("Art", "art", art,
        [{ v: "miete", t: "Vermietung" }, { v: "airbnb", t: "Kurzzeitvermietung" }, { v: "pacht", t: "Landpacht" }],
        { hinweis: "Nachträgliche Änderung kann Daten unbrauchbar machen" })}
      ${ef("Ort", "ort", s ? (s.ort || "") : "")}
      ${efArea("Notiz", "notiz", s ? (s.note || "") : "")}
      ${efTitel("Wirtschaftlich")}
      ${ef("Investitionssumme", "invest", s ? (s.invest ?? "") : "", "number",
        { hinweis: "Kaufpreis inkl. Kaufnebenkosten – Basis für die Rendite", platzhalter: "z. B. 250000" })}
      ${efSel("Nebenkosten", "nk_als_puffer", s && s.nkAlsPuffer ? "1" : "0",
        [{ v: "1", t: "als Rücklage behandeln" }, { v: "0", t: "als Ertrag zählen" }],
        { hinweis: "Rücklage: NK werden für Ausgaben zurückgelegt. Ertrag: NK zählen zu den Einnahmen." })}
      ${efArea("Nebenkosten-Arten", "nk_positionen",
        nkPos.map(p => p.titel + " | " + (p.betrag != null ? p.betrag : (p.anteil || 0))).join("\n"),
        { hinweis: "Je Zeile eine Position: Bezeichnung | Betrag pro Monat in €. Beispiel: Grundsteuer | 45" })}
      ${efAktionen({ loeschen: neu ? null : "Objekt löschen", speichern: opt.nachOnboarding ? (art === "miete" ? "Weiter zur Wohnung" : "Weiter") : "Speichern" })}`;

    const sheet = openSheet(neu ? "Neu: " + artName : "Objekt bearbeiten", neu ? "" : s.name, body);

    const bauen = (w) => {
      // Nebenkosten-Zeilen "Bezeichnung | Betrag" einlesen (€ pro Monat)
      const pos = String(w.nk_positionen || "").split("\n")
        .map(z => z.split("|"))
        .filter(t => t.length === 2 && t[0].trim())
        .map(t => ({ titel: t[0].trim(), betrag: Number(String(t[1]).replace(",", ".").trim()) || 0 }));
      // Art: bei Neuanlage aus Vorgabe, sonst aus Feld
      const gewaehlteArt = neu ? art : (w.art || art);
      return {
        name: text(w.name) || "Objekt",
        slug: (text(w.slug) || "objekt").toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        art: gewaehlteArt,
        icon: ART_ICON[gewaehlteArt] || "home",   // automatisch passendes Symbol
        ort: text(w.ort),
        notiz: text(w.notiz),
        invest: zahl(w.invest),
        nk_als_puffer: w.nk_als_puffer === "1",
        nk_positionen: pos.length ? pos : null
      };
    };
    efBind(sheet,
      async (w) => {
        if (neu) {
          // Im Onboarding darf das erste Objekt jeder Art angelegt werden
          if (!opt.nachOnboarding && !istPremium() && art !== "miete") {
            closeSheet(); openUpgradeSheet("art");
            throw new Error("Diese Objektart ist Premium vorbehalten.");
          }
          await neuesObjekt(bauen(w));
        }
        else { await speichereObjekt(s._id, bauen(w)); }
      },
      neu ? null : async () => { await loescheObjekt(s._id); currentView = "overview"; },
      "Objekt mit allen Daten löschen?",
      opt.nachOnboarding ? () => {
        // Nach dem Objekt: bei Vermietung direkt eine Einheit anlegen (füllt das Dashboard),
        // bei AirBNB/Pacht geht es weiter zu den Fragen.
        // Das gerade angelegte Objekt ist das zuletzt erstellte (höchste created_at bzw. letztes in der Liste).
        const streams = (D.streams || []);
        const neuesObj = streams[streams.length - 1];
        if (art === "miete" && neuesObj) {
          setTimeout(() => openErsteEinheitSheet(neuesObj), 300);
        } else {
          setTimeout(() => openTarifFragenSheet(), 300);
        }
      } : null);
  }

  // Onboarding: erste Wohneinheit mit Details anlegen → sofort Zahlen im Dashboard
  function openErsteEinheitSheet(s) {
    const body = `
      <div class="wc-hero">
        <div class="wc-steps"><span class="done"></span><span class="on"></span><span></span></div>
        <div class="wc-badge">Damit dein Dashboard sofort lebt</div>
        <div class="wc-t">Erste Wohneinheit</div>
        <div class="wc-d">Trag die wichtigsten Zahlen zu einer Wohnung ein. ESTRIQ berechnet daraus sofort deine Einnahmen, Rendite und den Cashflow.</div>
      </div>
      ${efTitel("Wohnung")}
      ${ef("Bezeichnung", "bezeichnung", "", "text", { pflicht: true, platzhalter: "z. B. Erdgeschoss links" })}
      ${ef("Fläche in m²", "flaeche", "", "number", { step: "0.01", platzhalter: "z. B. 72" })}
      ${efSel("Status", "status", "vermietet",
        [{ v: "vermietet", t: "vermietet" }, { v: "frei", t: "frei / in Vermarktung" }])}
      ${efTitel("Miete pro Monat")}
      ${ef("Kaltmiete", "kalt_fix", "", "number", { pflicht: true, platzhalter: "z. B. 650", hinweis: "Reine Miete ohne Nebenkosten" })}
      ${ef("Nebenkosten", "nk_fix", "", "number", { platzhalter: "z. B. 180", hinweis: "Monatliche Vorauszahlung des Mieters" })}
      ${efTitel("Mieter (optional)")}
      ${ef("Name", "mieter", "", "text", { platzhalter: "z. B. Familie Müller" })}
      ${ef("Einzug", "einzug", "", "date")}
      ${efAktionen({ speichern: "Speichern & weiter" })}
      <div class="wc-skip"><a href="#" id="ehSkip">Ohne Einheit weiter</a></div>`;
    const sheet = openSheet("Erste Einheit", "", body);

    const bauen = (w) => {
      const o = {
        bezeichnung: text(w.bezeichnung) || "Einheit",
        flaeche: zahl(w.flaeche),
        status: w.status,
        mieter: text(w.mieter), einzug: text(w.einzug),
        kalt_fix: zahl(w.kalt_fix), nk_fix: zahl(w.nk_fix),
        vertrag: {}
      };
      return o;
    };
    efBind(sheet,
      async (w) => { await neueEinheit(s._id, bauen(w)); },
      null, null,
      () => { setTimeout(() => openTarifFragenSheet(), 250); });

    sheet.querySelector("#ehSkip").onclick = (e) => { e.preventDefault(); closeSheet(); setTimeout(() => openTarifFragenSheet(), 200); };
  }

  // --- AirBNB-Einstellungen ---
  function openAirbnbEdit(s) {
    const a = s.airbnb || {};
    const body = `
      ${efTitel("Preise")}
      ${ef("Preis je Nacht", "nachtpreis", a.nachtpreis ?? "", "number", { pflicht: true })}
      ${ef("Auslastung in %", "auslastung", a.auslastung ?? "", "number",
        { hinweis: "Ausgangswert für den Regler" })}
      ${ef("Reinigungsgebühr (Gast)", "reinigungsgebuehr", a.reinigungsgebuehr ?? "", "number")}
      ${efTitel("Kosten")}
      ${ef("Reinigungskosten je Buchung", "reinigungskosten", a.reinigungskosten ?? "", "number")}
      ${ef("Verbrauch je Buchung", "verbrauchProBuchung", a.verbrauchProBuchung ?? "", "number",
        { hinweis: "Wäsche, Verbrauchsmaterial" })}
      ${efTitel("Buchungen")}
      ${ef("Ø Aufenthaltsdauer", "aufenthaltsdauer", a.aufenthaltsdauer ?? "", "number",
        { step: "1", hinweis: "Nächte je Buchung – bestimmt die Anzahl der Reinigungen" })}
      ${ef("Servicegebühr in %", "servicegebuehrProzent", a.servicegebuehrProzent ?? "", "number", { step: "0.1" })}
      ${efSel("Gebührenmodell", "gebuehrenmodell", a.gebuehrenmodell || "host",
        [{ v: "host", t: "Host-Fee (Gast zahlt Servicegebühr)" },
         { v: "vereinfacht", t: "Vereinfachte Preise (~15 %)" }])}
      ${efAktionen({})}`;

    const sheet = openSheet("Kalkulation bearbeiten", s.name, body);
    efBind(sheet, async (w) => {
      await speichereObjekt(s._id, {
        airbnb_config: {
          nachtpreis: zahl(w.nachtpreis) || 0,
          auslastung: zahl(w.auslastung) || 0,
          reinigungsgebuehr: zahl(w.reinigungsgebuehr) || 0,
          reinigungskosten: zahl(w.reinigungskosten) || 0,
          verbrauchProBuchung: zahl(w.verbrauchProBuchung) || 0,
          aufenthaltsdauer: zahl(w.aufenthaltsdauer) || 1,
          servicegebuehrProzent: zahl(w.servicegebuehrProzent) || 0,
          gebuehrenmodell: w.gebuehrenmodell
        }
      });
    });
  }

  // --- Termin ---
  function openTerminEdit(t, neu) {
    const body = `
      ${ef("Titel", "titel", t ? t.titel : "", "text", { pflicht: true })}
      ${ef("Datum", "datum", t ? t.datum : new Date().toISOString().slice(0, 10), "date", { pflicht: true })}
      ${efSel("Art", "art", t ? t.typ : "termin",
        [{ v: "miete", t: "Mieteingang" }, { v: "einzug", t: "Einzug" },
         { v: "zahlung", t: "Zahlung" }, { v: "termin", t: "Termin" }])}
      ${efSel("Wiederholung", "wiederholung", t ? (t.wiederholung || "") : "",
        [{ v: "", t: "einmalig" }, { v: "monatlich", t: "monatlich" },
         { v: "halbjaehrlich", t: "halbjährlich" }, { v: "jaehrlich", t: "jährlich" }])}
      ${ef("Zusatz", "info", t ? (t.info || "") : "", "text",
        { platzhalter: "z. B. 10.000 €", hinweis: "Erscheint in der Tagesansicht" })}
      ${efAktionen({ loeschen: neu ? null : "Löschen" })}`;

    const sheet = openSheet(neu ? "Neuer Termin" : "Termin bearbeiten",
      neu ? "" : dateDE(t.datum), body);

    const bauen = (w) => ({
      titel: text(w.titel) || "Termin",
      datum: text(w.datum),
      art: w.art,
      wiederholung: text(w.wiederholung),
      info: text(w.info)
    });
    efBind(sheet,
      async (w) => neu ? await neuerTermin(bauen(w)) : await speichereTermin(t._id, bauen(w)),
      neu ? null : async () => await loescheTermin(t._id),
      "Termin löschen?");
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

  /* ---------- LANDING ---------- */

  function loginOeffnen(modus) {
    $("#login").classList.remove("hide");
    setRegMode(false);   // Beta: keine Selbstregistrierung
    setTimeout(() => { const f = $("#mail"); if (f) f.focus(); }, 180);
  }
  function loginSchliessen() {
    $("#login").classList.add("hide");
    const m = $("#loginMsg"); if (m) { m.textContent = ""; m.className = "login-msg"; }
  }

  function landingVerdrahten() {
    // Landing sichtbar, Login zunächst geschlossen
    const lp = $("#landing");
    if (lp) $("#login").classList.add("hide");

    document.querySelectorAll("[data-login]").forEach(b =>
      b.addEventListener("click", () => loginOeffnen(b.dataset.login)));

    const zu = $("#loginZu");
    if (zu) zu.addEventListener("click", loginSchliessen);
    // Klick auf den abgedunkelten Hintergrund schließt ebenfalls
    const lg = $("#login");
    if (lg) lg.addEventListener("click", (e) => { if (e.target === lg) loginSchliessen(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && lg && !lg.classList.contains("hide")) loginSchliessen();
    });

    // Sanftes Scrollen zu den Ankern
    document.querySelectorAll('.lp-nav-links a[href^="#"]').forEach(a =>
      a.addEventListener("click", (e) => {
        const ziel = document.querySelector(a.getAttribute("href"));
        if (ziel) { e.preventDefault(); ziel.scrollIntoView({ behavior: "smooth", block: "start" }); }
      }));

    zaehleHoch();
    kippBeimScrollen();
    stickyKnopf();
    impressumVerdrahten();
    wartelisteVerdrahten();
  }

  /* ---------- WARTELISTE (Beta-Phase) ---------- */

  async function wartelisteEintragen(mail, feld, msg, btn) {
    const wert = (mail || "").trim().toLowerCase();
    if (!wert || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(wert)) {
      msg.textContent = "Bitte gib eine gültige E-Mail-Adresse ein.";
      msg.className = "lp-warte-msg bad";
      return false;
    }
    const alt = btn.textContent;
    btn.disabled = true; btn.textContent = "Moment…";
    try {
      // Woher kommt der Besuch? (für die Auswertung eurer Werbung)
      const p = new URLSearchParams(location.search);
      const quelle = p.get("utm_source") || p.get("quelle") || (document.referrer ? "web" : "direkt");
      if (!window.sb) throw new Error("Keine Verbindung zur Datenbank.");
      const { error } = await window.sb.from("warteliste").insert({ email: wert, quelle: quelle });
      // Doppelte Eintragung ist für den Besucher kein Fehler
      const txt = String((error && (error.message || error.details)) || "");
      const schonDrin = /duplicate|unique|23505/i.test(txt);
      if (error && !schonDrin) throw error;
      msg.textContent = schonDrin
        ? "Du stehst bereits auf der Liste — wir melden uns zum Start."
        : "Danke! Du stehst auf der Liste — wir melden uns zum Start.";
      msg.className = "lp-warte-msg ok";
      if (feld) feld.classList.add("fertig");
      return true;
    } catch (e) {
      btn.disabled = false; btn.textContent = alt;
      const detail = String((e && (e.message || e.details)) || "");
      console.error("Warteliste:", e);
      // Klartext statt Rätselraten
      msg.textContent = /permission|denied|row-level|policy|42501/i.test(detail)
        ? "Eintragen ist gerade nicht möglich (Zugriff). Bitte melde dich unter info@buecking-immobilien.de."
        : "Das hat leider nicht geklappt: " + (detail || "unbekannter Fehler");
      msg.className = "lp-warte-msg bad";
      return false;
    }
  }

  function wartelisteVerdrahten() {
    // Formular im Heldenbereich
    const f1 = $("#warteForm");
    if (f1) f1.addEventListener("submit", (e) => {
      e.preventDefault();
      wartelisteEintragen($("#warteMail").value, f1, $("#warteMsg"), $("#warteBtn"));
    });

    // Popup-Formular
    const box = $("#warteBox"), f2 = $("#warteForm2"), zu = $("#wbZu");
    if (f2) f2.addEventListener("submit", (e) => {
      e.preventDefault();
      wartelisteEintragen($("#warteMail2").value, f2, $("#warteMsg2"), $("#warteBtn2"));
    });
    if (zu) zu.addEventListener("click", () => box.classList.add("hide"));
    if (box) box.addEventListener("click", (e) => { if (e.target === box) box.classList.add("hide"); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && box && !box.classList.contains("hide")) box.classList.add("hide");
    });

    // Alle Knöpfe mit data-warte öffnen das Popup
    document.querySelectorAll("[data-warte]").forEach(b =>
      b.addEventListener("click", () => {
        box.classList.remove("hide");
        setTimeout(() => { const i = $("#warteMail2"); if (i) i.focus(); }, 180);
      }));

    // Aus dem Login heraus zur Warteliste
    const bw = $("#betaWarte");
    if (bw) bw.addEventListener("click", (e) => {
      e.preventDefault();
      loginSchliessen();
      box.classList.remove("hide");
      setTimeout(() => { const i = $("#warteMail2"); if (i) i.focus(); }, 200);
    });
  }

  // Impressum & Datenschutz
  function impressumVerdrahten() {
    const link = $("#lpImpressum"), box = $("#impressum"), zu = $("#impZu");
    if (!link || !box) return;
    link.addEventListener("click", (e) => { e.preventDefault(); box.classList.remove("hide"); });
    if (zu) zu.addEventListener("click", () => box.classList.add("hide"));
    box.addEventListener("click", (e) => { if (e.target === box) box.classList.add("hide"); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !box.classList.contains("hide")) box.classList.add("hide");
    });
  }

  // Fester Handlungsknopf auf dem Handy: erscheint, sobald der Held vorbei ist
  function stickyKnopf() {
    const bar = $("#lpSticky"), lp = $("#landing");
    if (!bar || !lp) return;
    let warten = false;
    const pruefen = () => {
      warten = false;
      bar.classList.toggle("an", lp.scrollTop > 420);
    };
    lp.addEventListener("scroll", () => {
      if (!warten) { warten = true; requestAnimationFrame(pruefen); }
    }, { passive: true });
    pruefen();
  }

  // Die Produktvorschau richtet sich beim Scrollen langsam auf
  function kippBeimScrollen() {
    const shot = $("#lpShot"), lp = $("#landing");
    if (!lp) return;
    const minis = Array.from(document.querySelectorAll(".lp-mini"));
    const ruhig = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const schmal = window.innerWidth <= 900;
    if (ruhig || schmal) {
      if (shot) shot.style.transform = "none";
      minis.forEach(m => m.style.transform = "none");
      return;
    }
    let warten = false;
    const anpassen = () => {
      warten = false;
      // Heldenbereich: über die ersten 520 Pixel aufrichten
      if (shot) {
        const p = Math.max(0, Math.min(1, lp.scrollTop / 520));
        shot.style.transform = `rotateY(${(-9 * (1 - p)).toFixed(2)}deg) rotateX(${(5 * (1 - p)).toFixed(2)}deg)`;
      }
      // Einblick-Karten: aufrichten, während sie durchs Bild wandern
      const hoehe = lp.clientHeight || window.innerHeight;
      minis.forEach(m => {
        const r = m.getBoundingClientRect();
        const mitte = r.top + r.height / 2;
        // 0 = weit unten, 1 = auf Höhe der Bildmitte
        const p = Math.max(0, Math.min(1, (hoehe - mitte) / (hoehe * 0.55)));
        const seite = m.closest(".lp-ein-dreh") ? -7 : 7;
        m.style.transform = `rotateY(${(seite * (1 - p)).toFixed(2)}deg) rotateX(${(4 * (1 - p)).toFixed(2)}deg)`;
      });
    };
    lp.addEventListener("scroll", () => {
      if (!warten) { warten = true; requestAnimationFrame(anpassen); }
    }, { passive: true });
    anpassen();
  }

  // Die Zahl im Heldenbereich zählt beim Laden hoch — das Versprechen des Produkts
  function zaehleHoch() {
    const el1 = $("#lpZahl"), el2 = $("#lpRendite");
    if (!el1) return;
    const kurz = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const zielB = 8326, zielR = 6.11;
    if (kurz) {
      el1.textContent = zielB.toLocaleString("de-DE") + " €";
      if (el2) el2.textContent = zielR.toLocaleString("de-DE", { minimumFractionDigits: 2 }) + " %";
      return;
    }
    const start = performance.now(), dauer = 1500;
    const lauf = (t) => {
      const p = Math.min(1, (t - start) / dauer);
      const e = 1 - Math.pow(1 - p, 3);   // weich auslaufend
      el1.textContent = Math.round(zielB * e).toLocaleString("de-DE") + " €";
      if (el2) el2.textContent = (zielR * e).toLocaleString("de-DE",
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " %";
      if (p < 1) requestAnimationFrame(lauf);
    };
    requestAnimationFrame(lauf);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    blockZoom();
    landingVerdrahten();
    // Erklär-Knöpfe an Kennzahlen (gilt auch für später gezeichnete Karten)
    document.addEventListener("click", (e) => {
      const b = e.target.closest && e.target.closest("[data-info]");
      if (b) { e.stopPropagation(); openInfoSheet(b.dataset.info); }
    });
    $("#loginBtn").addEventListener("click", tryLogin);
    $("#pw").addEventListener("keydown", e => { if (e.key === "Enter") regMode ? tryRegister() : tryLogin(); });
    $("#logoutBtn").addEventListener("click", logout);
    if ($("#profileBtn")) $("#profileBtn").addEventListener("click", openProfilSheet);
    // Rail bei Wechsel zwischen Handy/Desktop neu aufbauen
    let warMobil = window.innerWidth <= 560;
    window.addEventListener("resize", () => {
      const jetztMobil = window.innerWidth <= 560;
      if (jetztMobil !== warMobil) { warMobil = jetztMobil; buildRail(); }
    });
    if ($("#railAdd")) $("#railAdd").addEventListener("click", (e) => { e.stopPropagation(); openAnlegenMenu($("#railAdd")); });

    // Registrierung
    if ($("#registerBtn")) $("#registerBtn").addEventListener("click", tryRegister);
    if ($("#tabLogin")) $("#tabLogin").addEventListener("click", () => setRegMode(false));
    if ($("#tabRegister")) $("#tabRegister").addEventListener("click", () => setRegMode(true));
    if ($("#avaBtn")) $("#avaBtn").addEventListener("click", waehleAvatar);
    if ($("#avaFile")) $("#avaFile").addEventListener("change", avatarGewaehlt);
    if ($("#datenschutzLink")) $("#datenschutzLink").addEventListener("click", (e) => {
      e.preventDefault();
      alert("Datenschutzerklärung\n\nDeine Daten werden verschlüsselt gespeichert und sind ausschließlich für dich zugänglich. Der Betreiber kann deine Immobiliendaten nicht einsehen.\n\n(Dies ist ein Platzhalter. Eine vollständige Datenschutzerklärung wird vor dem öffentlichen Start hinterlegt.)");
    });

    if (await sessionOK()) {
      try {
        await window.ladeDaten();
        D = window.DASHBOARD_DATA;
        enterApp();
      } catch (e) {
        // Angemeldet, aber Daten konnten nicht geladen werden → Login-Popup mit Hinweis
        loginOeffnen("anmelden");
        $("#loginMsg").textContent = window.fehlerText(e);
        $("#loginMsg").className = "login-msg bad";
        console.error(e);
      }
    }
    // Sonst bleibt die Landing-Seite stehen; der Login öffnet sich erst per Klick.
  });
})();
