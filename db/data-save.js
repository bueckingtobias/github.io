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
  return (e && (e.message || e.hint || e.details || e.code)) || JSON.stringify(e);
}

// ---------- Einheiten ----------
async function speichereEinheit(id, werte) {
  const { error } = await window.sb.from('einheiten').update(werte).eq('id', id);
  if (error) throw error;
}
async function neueEinheit(objektId, werte) {
  const { error } = await window.sb.from('einheiten')
    .insert({ ...werte, objekt_id: objektId });
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
  const { error } = await window.sb.from('objekte').update(werte).eq('id', id);
  if (error) throw error;
}
async function neuesObjekt(werte) {
  const org = await meineOrgId();
  const { error } = await window.sb.from('objekte')
    .insert({ ...werte, org_id: org });
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

window.nachSpeichern = nachSpeichern;
window.fehlerText = fehlerText;

