(function(){
  window.HomeKpisModul = window.HomeKpisModul || {};
  window.HomeKpisModul.rootClass = "home-kpis-root";
  window.HomeKpisModul.render = render;

  function esc(s){ return String(s||"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m])); }

  function render(root, cfg){
    const kpis = cfg?.kpis || [];
    root.innerHTML = `
      <div class="hk-head">
        <div>
          <div class="hk-title">KPIs</div>
          <div class="hk-sub">5 Kennzahlen (Demo) · später aus Dashboard.xlsx</div>
        </div>
        <button class="hk-btn" id="hkEdit">Edit</button>
      </div>

      <div class="hk-body">
        <div class="hk-grid" id="hkGrid"></div>
      </div>
    `;

    const grid = root.querySelector("#hkGrid");
    grid.innerHTML = kpis.slice(0,5).map(k=>`
      <div class="hk-kpi">
        <div class="hk-k">${esc(k.label)}</div>
        <div class="hk-v">${esc(k.value)}</div>
        <div class="hk-h">${esc(k.hint || "")}</div>
      </div>
    `).join("");

    // Optional: schneller Editor als Prompt (einfach, robust)
    root.querySelector("#hkEdit").addEventListener("click", ()=>{
      const labels = kpis.slice(0,5).map(x=>x.label).join(", ");
      const values = kpis.slice(0,5).map(x=>x.value).join(", ");
      alert(
        "KPI-Edit folgt später über Dashboard.xlsx.\n\nAktuell (Demo):\n" +
        "Labels: " + labels + "\n" +
        "Values: " + values
      );
    });
  }
})();