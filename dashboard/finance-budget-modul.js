(function(){
  function n(x){
    if(x==null||x==="") return 0;
    if(typeof x==="number") return x;
    const s=String(x).replace(/\s/g,"").replace(/€/g,"").replace(/\./g,"").replace(",",".").replace(/[^\d.-]/g,"");
    const v=Number(s); return isFinite(v)?v:0;
  }
  function eur(v){
    return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n(v));
  }

  function render(container,data){
    const root=container.querySelector("[data-fb-root]")||container;
    const rows=Array.isArray(data?.budgetRows)?data.budgetRows:[];

    const table=root.querySelector("[data-fb-table]");
    table.innerHTML=`
      <div class="fb-h">Kategorie</div>
      <div class="fb-h">Budget</div>
      <div class="fb-h">Ist</div>
      <div class="fb-h">Abw.</div>
    `;

    rows.forEach(r=>{
      const bud=n(r.Budget), ist=n(r.Ist);
      const diff=bud-ist;
      table.innerHTML+=`
        <div class="fb-r">${r.Kategorie||"—"}</div>
        <div class="fb-r">${eur(bud)}</div>
        <div class="fb-r">${eur(ist)}</div>
        <div class="fb-r ${diff<0?'fb-neg':'fb-pos'}">${eur(diff)}</div>
      `;
    });
  }

  window.FinanceBudgetModul={render};
})();
