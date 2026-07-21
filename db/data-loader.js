/* =============================================================
   data-loader.js — lädt die Dashboard-Daten aus Supabase
   Ersetzt data.js. Kapitel 5 der Umsetzungsanleitung.

   >>> HIER DIE ZWEI WERTE EINTRAGEN <<<
   Zu finden unter: Project Settings -> API
   ============================================================= */

const SB_URL = 'https://DEINPROJEKT.supabase.co';   // Project URL
const SB_KEY = 'DEIN-ANON-KEY';                     // anon public key (darf öffentlich sein)

window.sb = supabase.createClient(SB_URL, SB_KEY);

/* -------------------------------------------------------------
   Lokale Einstellungen (liegen bewusst NICHT in der Datenbank)
   ------------------------------------------------------------- */
const LOKAL = {
  meta: { org: "Bücking", title: "Einnahmen" },

  // Benutzer für die Auswahl auf dem Anmeldebildschirm
  auth: {
    // Passwort bleibt in Kapitel 5 noch lokal (Hash von "baumstrasse").
    // In Kapitel 6 wird das durch die Supabase-Anmeldung ersetzt.
    passwordHash: "774abd2c0374e9d3d262d1b7269ce9913f5333021ad6e7356261a2305638c1e8",
    sessionHours: 12,
    benutzer: [
      { id: "tobias",    name: "Tobias",    anrede: "Tobias" },
      { id: "bernfried", name: "Bernfried", anrede: "Bernfried" }
    ]
  },

  // Begrüßungen nach Tageszeit. {name} wird ersetzt.
  begruessungen: {
    morgen: [
      "Guten Morgen, {name}!",
      "Moin {name} – auf einen guten Tag!",
      "Frühstück erledigt, {name}? Dann los.",
      "Guten Morgen, {name}. Frisch ans Werk."
    ],
    tag: [
      "Hallo {name}!",
      "Schön, dass du da bist, {name}.",
      "Moin {name}!",
      "Hallo {name} – alles im Blick."
    ],
    abend: [
      "Guten Abend, {name}!",
      "Feierabend, {name}? Ein Blick lohnt sich.",
      "Schönen Abend, {name}!",
      "Guten Abend, {name}. Zeit für die Bilanz."
    ],
    nacht: [
      "Noch wach, {name}?",
      "Späte Runde, {name}?",
      "Gute Nacht, {name} – oder noch kurz reinschauen?"
    ]
  },

  wetter: { ort: "Ganderkesee", lat: 53.0333, lon: 8.5333 }
};

/* -------------------------------------------------------------
   Umsetzer: Datenbankzeile -> Struktur wie bisher in data.js
   ------------------------------------------------------------- */
function zuStream(o) {
  const s = {
    id: o.slug, name: o.name, kind: o.art, ort: o.ort || "",
    icon: o.icon || "home", note: o.notiz || ""
  };
  if (o.invest)        s.invest       = Number(o.invest);
  if (o.nk_als_puffer) s.nkAlsPuffer  = true;
  if (o.nk_positionen) s.nkPositionen = o.nk_positionen;

  if (o.art === "miete") {
    s.einheiten = (o.einheiten || [])
      .sort((a, b) => (a.sortierung || 0) - (b.sortierung || 0))
      .map(e => {
        const u = { wohnung: e.bezeichnung, flaeche: Number(e.flaeche), status: e.status };
        if (e.kalt_pro_m2 != null) u.kaltProM2 = Number(e.kalt_pro_m2);
        if (e.nk_pro_m2   != null) u.nkProM2   = Number(e.nk_pro_m2);
        if (e.kalt_fix    != null) u.kaltFix   = Number(e.kalt_fix);
        if (e.nk_fix      != null) u.nkFix     = Number(e.nk_fix);
        if (e.kueche)     u.kueche     = Number(e.kueche);
        if (e.strom)      u.strom      = Number(e.strom);
        if (e.stellplatz) u.stellplatz = Number(e.stellplatz);
        if (e.mieter)     u.mieter     = e.mieter;
        if (e.einzug)     u.einzug     = e.einzug;
        if (e.vertrag)    u.vertrag    = e.vertrag;
        u._id = e.id;                       // für die spätere Bearbeitung
        return u;
      });

    const kr = (o.kredite || [])
      .sort((a, b) => (a.sortierung || 0) - (b.sortierung || 0))
      .map(k => {
        const c = {
          name: k.name, summe: Number(k.summe), zinsPa: Number(k.zins_pa),
          abtragMonat: Number(k.rate_monat), start: k.start
        };
        if (k.rest_stand_betrag != null)
          c.restStand = { datum: k.rest_stand_datum, betrag: Number(k.rest_stand_betrag) };
        if (k.sondertilgung) c.sondertilgung = k.sondertilgung;
        c._id = k.id;
        return c;
      });
    if (kr.length === 1)    s.kredit  = kr[0];
    else if (kr.length > 1) s.kredite = kr;
  }

  if (o.art === "airbnb") s.airbnb = o.airbnb_config;

  if (o.art === "pacht") {
    s.vertraege = (o.pachtvertraege || []).map(v => ({
      paechter: v.paechter, jahr: Number(v.jahr_betrag), flaeche: Number(v.flaeche),
      art: v.art, start: v.start, ende: v.ende, _id: v.id
    }));
  }
  s._id = o.id;
  return s;
}

function zuTermin(t) {
  const o = { titel: t.titel, datum: t.datum, typ: t.art, _id: t.id };
  if (t.wiederholung) o.wiederholung = t.wiederholung;
  if (t.info)         o.info         = t.info;
  return o;
}

/* -------------------------------------------------------------
   Laden
   ------------------------------------------------------------- */
async function ladeDaten() {
  const { data: objekte, error: e1 } = await window.sb
    .from('objekte')
    .select('*, einheiten(*), kredite(*), pachtvertraege(*)')
    .order('sortierung');
  if (e1) throw e1;

  const { data: termine, error: e2 } = await window.sb
    .from('termine').select('*').order('datum');
  if (e2) throw e2;

  window.DASHBOARD_DATA = {
    meta: { ...LOKAL.meta, version: new Date().toISOString().slice(0, 10) },
    auth: LOKAL.auth,
    begruessungen: LOKAL.begruessungen,
    wetter: LOKAL.wetter,
    streams: (objekte || []).map(zuStream),
    termine: (termine || []).map(zuTermin)
  };
  return window.DASHBOARD_DATA;
}

// Damit die Benutzerauswahl schon vor dem Anmelden gefüllt werden kann
window.DASHBOARD_DATA = {
  meta: LOKAL.meta, auth: LOKAL.auth, begruessungen: LOKAL.begruessungen,
  wetter: LOKAL.wetter, streams: [], termine: []
};
window.ladeDaten = ladeDaten;
