/* dashboard/admin-data.js */

(function(){
  const LS_KEY = "IMMO_DATA_OVERRIDE_V1";

  const elEditor = document.getElementById("jsonEditor");
  const msgBox = document.getElementById("msgBox");
  const sizeBox = document.getElementById("sizeBox");

  const chipSource = document.getElementById("chipSource");
  const chipVersion = document.getElementById("chipVersion");
  const chipUpdated = document.getElementById("chipUpdated");
  const chipCounts = document.getElementById("chipCounts");

  const overrideChip = document.getElementById("overrideChip");
  const clockTop = document.getElementById("clockTop");
  const clockSide = document.getElementById("clockSide");

  const btnReload = document.getElementById("btnReload");
  const btnValidate = document.getElementById("btnValidate");
  const btnSave = document.getElementById("btnSave");
  const btnCopy = document.getElementById("btnCopy");
  const btnDownload = document.getElementById("btnDownload");
  const btnClear = document.getElementById("btnClear");

  // Clock
  function tick(){
    const d = new Date();
    const t = d.toLocaleString("de-DE", { weekday:"short", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
    if(clockTop) clockTop.textContent = t;
    if(clockSide) clockSide.textContent = t;
  }
  tick(); setInterval(tick, 15000);

  function hasOverride(){
    try { return !!localStorage.getItem(LS_KEY); } catch { return false; }
  }

  function setMsg(text, ok){
    if(!msgBox) return;
    msgBox.textContent = text;
    msgBox.style.borderColor = ok ? "rgba(34,197,94,.30)" : "rgba(239,68,68,.30)";
    msgBox.style.background = ok ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)";
  }

  function setSize(){
    if(!sizeBox || !elEditor) return;
    sizeBox.textContent = `JSON size: ${Math.round((elEditor.value || "").length / 1024)} KB`;
  }

  function safeStringify(obj){
    return JSON.stringify(obj, null, 2);
  }

  function validateData(d){
    const errors = [];

    if (!d || typeof d !== "object") errors.push("Root ist kein Objekt.");
    if (!Array.isArray(d.home)) errors.push("home muss ein Array sein.");
    if (!d.projects || typeof d.projects !== "object") errors.push("projects fehlt/ist kein Objekt.");
    if (!d.projects || !d.projects.gesamt || typeof d.projects.gesamt !== "object") errors.push("projects.gesamt fehlt/ist kein Objekt.");
    if (!d.projects || !Array.isArray(d.projects.gewerke)) errors.push("projects.gewerke muss ein Array sein.");
    if (!d.finance || typeof d.finance !== "object") errors.push("finance fehlt/ist kein Objekt.");

    // Home KPI fields sanity
    if (Array.isArray(d.home) && d.home.length){
      const sample = d.home[0];
      const needed = ["Monat","Cashflow","Mieteinnahmen","Pachteinnahmen","Auslastung_%","Portfolio_Wert","Investiertes_Kapital"];
      needed.forEach(k=>{
        if (!(k in sample)) errors.push(`home[0] missing field: ${k}`);
      });
    }

    // Finance expected sections
    const fin = d.finance || {};
    ["gesamt","cashflow","mieten","op","reserven","budget"].forEach(k=>{
      if (!(k in fin)) errors.push(`finance missing section: ${k}`);
      else if (!Array.isArray(fin[k])) errors.push(`finance.${k} muss ein Array sein.`);
    });

    return errors;
  }

  async function refreshFromLoader(){
    await window.DataLoader.load();

    const overrideOn = hasOverride();
    if (overrideChip) overrideChip.textContent = overrideOn ? "override: ON" : "override: OFF";

    const src = overrideOn ? "Quelle: Local Override" : "Quelle: master-data.js";
    if (chipSource) chipSource.textContent = src;

    const d = window.IMMO_DATA || {};
    if (chipVersion) chipVersion.textContent = "Version: " + (d.version || "—");
    if (chipUpdated) chipUpdated.textContent = "Updated: " + (d.updatedAt || "—");

    const cHome = Array.isArray(d.home) ? d.home.length : 0;
    const cGewerke = Array.isArray(d.projects?.gewerke) ? d.projects.gewerke.length : 0;
    const fin = d.finance || {};
    const cFin = ["gesamt","cashflow","mieten","op","reserven","budget"]
      .map(k => `${k}:${Array.isArray(fin[k]) ? fin[k].length : 0}`)
      .join(" · ");
    if (chipCounts) chipCounts.textContent = `Counts: home:${cHome} · gewerke:${cGewerke} · ${cFin}`;

    // Fill editor with current active data (override or master)
    if (elEditor) elEditor.value = safeStringify(d);
    setSize();
    setMsg("Daten geladen.", true);
  }

  function parseEditorJSON(){
    if(!elEditor) return null;
    const raw = elEditor.value || "";
    try{
      return JSON.parse(raw);
    }catch(e){
      setMsg("JSON Fehler: " + (e && e.message ? e.message : String(e)), false);
      return null;
    }
  }

  function saveOverride(){
    const obj = parseEditorJSON();
    if(!obj) return;

    const errors = validateData(obj);
    if (errors.length){
      setMsg("Validierung fehlgeschlagen: " + errors[0], false);
      console.warn("Validation errors:", errors);
      return;
    }

    // Stamp meta
    obj.updatedAt = new Date().toISOString();
    obj.version = obj.version || "local";

    try{
      localStorage.setItem(LS_KEY, JSON.stringify(obj));
    }catch(e){
      setMsg("Konnte nicht speichern (LocalStorage): " + (e && e.message ? e.message : String(e)), false);
      return;
    }

    setMsg("Override gespeichert. Reload Views zum Testen.", true);
    refreshFromLoader();
  }

  function clearOverride(){
    try{
      localStorage.removeItem(LS_KEY);
    }catch{}
    setMsg("Override gelöscht. Jetzt gilt master-data.js", true);
    refreshFromLoader();
  }

  async function copyJSON(){
    try{
      await navigator.clipboard.writeText(elEditor.value || "");
      setMsg("JSON kopiert.", true);
    }catch{
      setMsg("Copy fehlgeschlagen (iOS Restriktion). Markiere & kopiere manuell.", false);
    }
  }

  function downloadMasterDataJS(){
    const obj = parseEditorJSON();
    if(!obj) return;

    const errors = validateData(obj);
    if (errors.length){
      setMsg("Export blockiert: Validierung fehlgeschlagen.", false);
      console.warn("Validation errors:", errors);
      return;
    }

    // Build a file that exactly sets window.IMMO_MASTER_DATA
    const out = `/* dashboard/master-data.js (exported) */
(function () {
  window.IMMO_MASTER_DATA = ${JSON.stringify(obj, null, 2)};
})();\n`;

    const blob = new Blob([out], { type: "application/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "master-data.js";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);

    setMsg("master-data.js exportiert (Download). Datei im Repo ersetzen.", true);
  }

  function validateOnly(){
    const obj = parseEditorJSON();
    if(!obj) return;
    const errors = validateData(obj);
    if (errors.length){
      setMsg("Validierung: Fehler – " + errors[0], false);
      console.warn("Validation errors:", errors);
      return;
    }
    setMsg("Validierung: OK.", true);
  }

  // Wire up events
  if (btnReload) btnReload.addEventListener("click", refreshFromLoader);
  if (btnValidate) btnValidate.addEventListener("click", validateOnly);
  if (btnSave) btnSave.addEventListener("click", saveOverride);
  if (btnClear) btnClear.addEventListener("click", clearOverride);
  if (btnCopy) btnCopy.addEventListener("click", copyJSON);
  if (btnDownload) btnDownload.addEventListener("click", downloadMasterDataJS);

  if (elEditor){
    elEditor.addEventListener("input", () => {
      setSize();
      setMsg("Änderungen nicht gespeichert.", false);
    });
  }

  // Boot
  refreshFromLoader();
})();
