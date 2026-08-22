/* =============================================================
   data-save.js — schreibt Änderungen zurück nach Supabase
   Wird nach data-loader.js eingebunden.
   Die Rechenlogik bleibt unberührt: hier werden ausschließlich
   Rohwerte gespeichert, gerechnet wird weiterhin in finance-engine.js
   ============================================================= */

// ---------- Hilfsfunktionen ----------
async function meineOrgId() {
  const { data, error } = await window.sb
    .from('mitglieder').select('org_id').limit(1).single();
  if (error) throw error;
  return data.org_id;
}

function fehlerText(e) {
  const roh = (e && (e.message || e.hint || e.details || e.code || e.error_description || e.error)) || "";
  const s = String(roh).toLowerCase();

  // Häufige technische Meldungen in verständliches Deutsch übersetzen
  if (s.includes("violates row-level security") || s.includes("row-level security")) {
    return "Diese Änderung ist mit deinem aktuellen Tarif nicht möglich. Ein Upgrade schaltet sie frei.";
  }
  if (s.includes("null value") && s.includes("column")) {
    // Spaltenname herausziehen, falls vorhanden
    const m = String(roh).match(/column "([^"]+)"/);
    const feld = m ? feldName(m[1]) : "ein Pflichtfeld";
    return "Bitte fülle " + feld + " aus.";
  }
  if (s.includes("duplicate key") || s.includes("already exists")) {
    return "Dieser Eintrag existiert bereits. Bitte wähle einen anderen Namen oder Kurznamen.";
  }
  if (s.includes("violates check constraint")) {
    return "Ein Wert ist ungültig. Bitte prüfe deine Eingaben.";
  }
  if (s.includes("violates foreign key")) {
    return "Der Vorgang konnte nicht abgeschlossen werden, weil ein verknüpfter Eintrag fehlt.";
  }
  if (s.includes("invalid input syntax")) {
    return "Ein Wert hat das falsche Format. Bitte prüfe Zahlen- und Datumsfelder.";
  }
  if (s.includes("numeric field overflow") || s.includes("out of range")) {
    return "Eine Zahl ist zu groß. Bitte gib einen kleineren Wert ein.";
  }
  if (s.includes("permission denied")) {
    return "Dir fehlt die Berechtigung für diese Aktion.";
  }
  if (s.includes("jwt") || s.includes("token") || s.includes("session")) {
    return "Deine Sitzung ist abgelaufen. Bitte melde dich neu an.";
  }
  if (s.includes("failed to fetch") || s.includes("network")) {
    return "Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.";
  }
  if (s.includes("invalid login credentials")) {
    return "E-Mail oder Passwort ist falsch.";
  }
  if (s.includes("email not confirmed")) {
    return "Bitte bestätige zuerst deine E-Mail-Adresse.";
  }
  if (s.includes("user already registered") || s.includes("already been registered")) {
    return "Für diese E-Mail existiert bereits ein Konto. Bitte melde dich an.";
  }
  if (s.includes("over_email_send_rate_limit") || s.includes("rate limit")) {
    return "Zu viele Versuche. Bitte warte einen Moment und versuche es erneut.";
  }
  // Nichts erkannt: freundliche Standardmeldung statt technischem Text
  return roh ? "Es ist ein Fehler aufgetreten. Bitte versuche es erneut." : "Unbekannter Fehler.";
}

// Übersetzt Datenbank-Spaltennamen in verständliche Feldbezeichnungen
function feldName(spalte) {
  const map = {
    bezeichnung: "die Bezeichnung", name: "den Namen", flaeche: "die Fläche",
    summe: "die Darlehenssumme", zins_pa: "den Zinssatz", rate_monat: "die Monatsrate",
    paechter: "den Pächter", jahr_betrag: "die Jahrespacht", titel: "den Titel",
    datum: "das Datum", slug: "den Kurznamen", nachtpreis: "den Nachtpreis",
    mieter: "den Mieter", status: "den Status"
  };
  return map[spalte] || "das Feld „" + spalte + "“";
}

// ---------- Einheiten ----------
// Leere Texte zu null machen. Verhindert Formatfehler, wenn ein leeres
// Feld in eine Datums- oder Zahlenspalte geschrieben wird.
function ohneLeere(werte) {
  const o = {};
  Object.keys(werte || {}).forEach(k => {
    const v = werte[k];
    o[k] = (typeof v === "string" && v.trim() === "") ? null : v;
  });
  return o;
}

async function speichereEinheit(id, werte) {
  const { error } = await window.sb.from('einheiten').update(ohneLeere(werte)).eq('id', id);
  if (error) throw error;
}
async function neueEinheit(objektId, werte) {
  const { error } = await window.sb.from('einheiten')
    .insert({ ...ohneLeere(werte), objekt_id: objektId });
  if (error) throw error;
}
async function loescheEinheit(id) {
  const { error } = await window.sb.from('einheiten').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Kredite ----------
async function speichereKredit(id, werte) {
  const { error } = await window.sb.from('kredite').update(werte).eq('id', id);
  if (error) throw error;
}
async function neuerKredit(objektId, werte) {
  const { error } = await window.sb.from('kredite')
    .insert({ ...werte, objekt_id: objektId });
  if (error) throw error;
}
async function loescheKredit(id) {
  const { error } = await window.sb.from('kredite').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Pachtverträge ----------
async function speicherePacht(id, werte) {
  const { error } = await window.sb.from('pachtvertraege').update(werte).eq('id', id);
  if (error) throw error;
}
async function neuerPachtvertrag(objektId, werte) {
  const { error } = await window.sb.from('pachtvertraege')
    .insert({ ...werte, objekt_id: objektId });
  if (error) throw error;
}
async function loeschePacht(id) {
  const { error } = await window.sb.from('pachtvertraege').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Objekte ----------
async function speichereObjekt(id, werte) {
  const { error } = await window.sb.from('objekte').update(ohneLeere(werte)).eq('id', id);
  if (error) throw error;
}
async function neuesObjekt(werte) {
  const org = await meineOrgId();
  const { error } = await window.sb.from('objekte')
    .insert({ ...ohneLeere(werte), org_id: org });
  if (error) throw error;
}
async function loescheObjekt(id) {
  // Einheiten, Kredite und Pachtverträge verschwinden automatisch mit
  const { error } = await window.sb.from('objekte').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Termine ----------
async function speichereTermin(id, werte) {
  const { error } = await window.sb.from('termine').update(werte).eq('id', id);
  if (error) throw error;
}
async function neuerTermin(werte) {
  const org = await meineOrgId();
  const { error } = await window.sb.from('termine')
    .insert({ ...werte, org_id: org });
  if (error) throw error;
}
async function loescheTermin(id) {
  const { error } = await window.sb.from('termine').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Nach dem Speichern: neu laden und Ansicht auffrischen ----------
async function nachSpeichern() {
  await window.ladeDaten();
  window.setD(window.DASHBOARD_DATA);
  window.refreshView();
}

// Mieteingang für eine Einheit im laufenden Monat festhalten
async function mietEingangSetzen(einheitId, jahr, monat, status, betrag) {
  // Über eine geprüfte Datenbankfunktion – umgeht Upsert-Berechtigungsprobleme
  const { data, error } = await window.sb.rpc('miete_bestaetigen', {
    p_einheit: einheitId,
    p_jahr: jahr,
    p_monat: monat,
    p_status: status,
    p_betrag: betrag ?? null
  });
  if (error) throw error;
  if (data === 'kein_zugriff') throw new Error('Diese Einheit gehört nicht zu deinem Konto.');
}

window.meineOrgId = meineOrgId;
window.nachSpeichern = nachSpeichern;
window.mietEingangSetzen = mietEingangSetzen;
window.fehlerText = fehlerText;
