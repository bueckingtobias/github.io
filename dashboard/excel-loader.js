<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
<script>
(function(){
  let DATA = {};
  let LOADED = false;
  let LAST_ERROR = "";

  window.ExcelLoader = {
    load,
    getSheet,
    isLoaded: () => LOADED,
    lastError: () => LAST_ERROR
  };

  async function load(path){
    // Immer zuerst Fallback setzen, damit Views IMMER Daten haben
    const fallback = buildFallback();
    applyMappedLegacy(fallback);
    DATA = fallback;
    LOADED = false;
    LAST_ERROR = "";

    try{
      const res = await fetch(path, { cache:"no-store" });
      if(!res.ok) throw new Error("HTTP " + res.status + " (" + path + ")");
      const buf = await res.arrayBuffer();
      const wb = XLSX.read(buf, { type:"array" });

      const out = {};
      wb.SheetNames.forEach(name=>{
        out[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval:null });
      });

      DATA = out;
      applyMappedLegacy(out);
      LOADED = true;
      return out;

    }catch(e){
      LAST_ERROR = String(e && e.message ? e.message : e);
      // Fallback bleibt aktiv
      return fallback;
    }
  }

  function getSheet(name){
    return DATA[name] || [];
  }

  function applyMappedLegacy(all){
    // Legacy mapping: was deine bestehenden Module erwarten können
    window.IMMO_DATA = {
      home: all.Home_KPIs || [],
      finance: all.Finance || [],
      projects: {
        gesamt: (all.Projects_Gesamt || [])[0] || {},
        gewerke: all.Projects_Gewerke || []
      }
    };
  }

  function buildFallback(){
    // Dummy Daten, damit IMMER etwas gerendert werden kann (auch wenn Excel fehlt)
    return {
      Home_KPIs: [
        { KPI:"Monats-Cashflow", Wert:3200, Einheit:"EUR", Kommentar:"Fallback (Excel fehlt)" },
        { KPI:"Jahres-Cashflow", Wert:28100, Einheit:"EUR", Kommentar:"Fallback (Excel fehlt)" },
        { KPI:"Mieteinnahmen pro Monat", Wert:9800, Einheit:"EUR", Kommentar:"Fallback (Excel fehlt)" },
        { KPI:"Auslastung Wohnungen", Wert:96.5, Einheit:"%", Kommentar:"Fallback (Excel fehlt)" },
        { KPI:"Portfolio ROI", Wert:7.4, Einheit:"%", Kommentar:"Fallback (Excel fehlt)" }
      ],
      Finance: [
        { Monat:"Apr", Cashflow:2800, Mieteinnahmen:9600, OP_Kosten:4200, Reserven:15000, Budget:10000 },
        { Monat:"Mai", Cashflow:3100, Mieteinnahmen:9700, OP_Kosten:4300, Reserven:15200, Budget:10000 },
        { Monat:"Jun", Cashflow:2900, Mieteinnahmen:9800, OP_Kosten:4400, Reserven:15500, Budget:10000 },
        { Monat:"Jul", Cashflow:3300, Mieteinnahmen:9900, OP_Kosten:4500, Reserven:15800, Budget:10000 },
        { Monat:"Aug", Cashflow:3500, Mieteinnahmen:10000, OP_Kosten:4600, Reserven:16000, Budget:10000 },
        { Monat:"Sep", Cashflow:3200, Mieteinnahmen:10050, OP_Kosten:4700, Reserven:16200, Budget:10000 }
      ],
      Projects_Gesamt: [
        { Projekt:"Baumstraße 35", Gesamtbudget:980000, Gezahlt:620000, Fortschritt_%:63 }
      ],
      Projects_Gewerke: Array.from({length:10}).map((_,i)=>({
        Projekt:"Baumstraße 35",
        Gewerk:"Gewerk " + (i+1),
        Angebot: 80000 + (i+1)*5000,
        Gezahlt: 40000 + (i+1)*4000,
        Fortschritt_%: 40 + (i+1)*4
      }))
    };
  }
})();
</script>