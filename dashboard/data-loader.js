/* dashboard/data-loader.js
   Master → IMMO_DATA (used by all modules)
   Self-healing: tries script injection; if blocked (MIME/nosniff/CSP), fallback fetch+eval.
*/

(function () {
  window.DataLoader = { load };

  const LS_KEY = "IMMO_ADMIN_OVERRIDE_V1";

  async function load() {
    const masterOk = await ensureMaster();

    if (!masterOk) {
      window.IMMO_DATA = { home: [], projects: { gesamt: {}, gewerke: [] }, finance: {} };
      window.IMMO_DATA_META = {
        ok: false,
        source: "none",
        version: "",
        updatedAt: "",
        homeCount: 0,
        expectedUrl: expectedMasterUrl(),
        reason: window.IMMO_DATA_META?.reason || "IMMO_MASTER_DATA fehlt. master-data.js konnte nicht ausgeführt werden."
      };
      fire(false, window.IMMO_DATA_META.reason);
      return;
    }

    // Optional override from Admin
    let override = null;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) override = JSON.parse(raw);
    } catch (_) {}

    const merged = deepMerge(clone(window.IMMO_MASTER_DATA), override || {});

    window.IMMO_DATA = {
      home: Array.isArray(merged.home) ? merged.home : [],
      projects: {
        gesamt: merged.projects?.gesamt || {},
        gewerke: Array.isArray(merged.projects?.gewerke) ? merged.projects.gewerke : [],
      },
      finance: merged.finance || {},
    };

    window.IMMO_DATA_META = {
      ok: true,
      source: override ? "master+override" : "master",
      version: merged.version || "",
      updatedAt: merged.updatedAt || "",
      homeCount: Array.isArray(window.IMMO_DATA.home) ? window.IMMO_DATA.home.length : 0,
      expectedUrl: expectedMasterUrl(),
      reason: ""
    };

    fire(true, `OK (${window.IMMO_DATA_META.source})`);
  }

  /* -------------------- Master self-heal -------------------- */

  async function ensureMaster() {
    if (window.IMMO_MASTER_DATA) return true;

    const urlBase = expectedMasterUrl();
    const url = urlBase + (urlBase.includes("?") ? "&" : "?") + "v=" + Date.now();

    // 1) Try normal script tag
    try {
      await loadScript(url);
      if (window.IMMO_MASTER_DATA) return true;
    } catch (e) {
      // continue to fetch+eval
      window.IMMO_DATA_META = window.IMMO_DATA_META || {};
      window.IMMO_DATA_META.reason =
        "Script-Load von master-data.js fehlgeschlagen (evtl. MIME/nosniff). Fallback via fetch+eval. " +
        "URL: " + url + " · Fehler: " + msg(e);
    }

    // 2) Fallback: fetch as text and eval (ignores MIME)
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status + " " + res.statusText);

      const code = await res.text();
      // Execute in global scope
      (new Function(code))();

      if (window.IMMO_MASTER_DATA) return true;

      window.IMMO_DATA_META = window.IMMO_DATA_META || {};
      window.IMMO_DATA_META.reason =
        "master-data.js wurde geladen, aber IMMO_MASTER_DATA wurde nicht gesetzt. " +
        "Bitte sicherstellen, dass am Ende `window.IMMO_MASTER_DATA = {...}` steht.";
      return false;

    } catch (e) {
      window.IMMO_DATA_META = window.IMMO_DATA_META || {};
      window.IMMO_DATA_META.reason =
        "master-data.js konnte nicht via fetch+eval ausgeführt werden (evtl. CSP blockt eval). " +
        "URL: " + url + " · Fehler: " + msg(e);
      return false;
    }
  }

  function expectedMasterUrl() {
    try {
      const base = location.href.replace(/#.*$/, "").replace(/\?.*$/, "");
      const dir = base.substring(0, base.lastIndexOf("/") + 1);
      return dir + "master-data.js";
    } catch (_) {
      return "./master-data.js";
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Script load error"));
      document.head.appendChild(s);
    });
  }

  /* -------------------- Helpers -------------------- */

  function fire(ok, msg) {
    try {
      window.dispatchEvent(new CustomEvent("immo:data-ready", { detail: { ok, msg } }));
    } catch (_) {}
    console.log("✅ DataLoader:", ok, msg, window.IMMO_DATA_META);
  }

  function clone(obj) {
    try { if (typeof structuredClone === "function") return structuredClone(obj); } catch (_) {}
    return JSON.parse(JSON.stringify(obj || {}));
  }

  function isObj(x) {
    return x && typeof x === "object" && !Array.isArray(x);
  }

  function deepMerge(base, patch) {
    if (!isObj(base) || !isObj(patch)) return patch ?? base;
    const out = { ...base };
    Object.keys(patch).forEach((k) => {
      const pv = patch[k];
      const bv = base[k];
      if (isObj(bv) && isObj(pv)) out[k] = deepMerge(bv, pv);
      else out[k] = pv;
    });
    return out;
  }

  function msg(e){
    return String(e && e.message ? e.message : e);
  }
})();
