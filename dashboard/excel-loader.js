<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
<script>
(function(){
  const STATE = {
    loaded: false,
    data: {}
  };

  window.ExcelLoader = {
    load,
    get
  };

  async function load(url){
    const res = await fetch(url);
    if(!res.ok) throw new Error("Excel nicht ladbar: " + url);
    const buf = await res.arrayBuffer();

    const wb = XLSX.read(buf, { type:"array" });
    const out = {};

    wb.SheetNames.forEach(name=>{
      out[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval:null });
    });

    STATE.loaded = true;
    STATE.data = out;

    // Legacy-Kompatibilität für bestehende Module
    window.IMMO_DATA = mapToLegacy(out);

    return out;
  }

  function get(sheet){
    return STATE.data[sheet] || [];
  }

  function mapToLegacy(all){
    return {
      home: all.Home_KPIs || [],
      finance: all.Finance || [],
      projects: {
        gesamt: (all.Projects_Gesamt || [])[0] || {},
        gewerke: all.Projects_Gewerke || []
      }
    };
  }
})();
</script>