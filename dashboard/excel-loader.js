<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
<script>
(function(){
  let DATA = {};
  let LOADED = false;

  window.ExcelLoader = {
    load,
    getSheet,
    isLoaded: () => LOADED
  };

  async function load(path){
    const res = await fetch(path, { cache:"no-store" });
    if(!res.ok) throw new Error("Excel nicht gefunden: " + path);

    const buf = await res.arrayBuffer();
    const wb = XLSX.read(buf, { type:"array" });

    DATA = {};
    wb.SheetNames.forEach(name=>{
      DATA[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval:null });
    });

    // 🔁 Legacy-Kompatibilität für bestehende Module
    window.IMMO_DATA = {
      home: DATA.Home_KPIs || [],
      finance: DATA.Finance || [],
      projects: {
        gesamt: (DATA.Projects_Gesamt || [])[0] || {},
        gewerke: DATA.Projects_Gewerke || []
      }
    };

    LOADED = true;
    return DATA;
  }

  function getSheet(name){
    return DATA[name] || [];
  }
})();
</script>