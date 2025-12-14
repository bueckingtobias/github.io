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
    const root=container.querySelector("[data-fop-root]")||container;
    const rows=Array.isArray(data?.opRows)?data.opRows:[];

    const now=new Date();
    root.querySelector("[data-fop-sub]").textContent =
      "Stand " + now.toLocaleDateString("de-DE");

    let total=0, overdue=0, daysSum=0;
    rows.forEach(r=>{
      const amt=n(r.Betrag||r.Summe||r.Amount);
      total+=amt;
      const due=new Date(r.Faelligkeit||r.DueDate||r.Fällig);
      if(!isNaN(due)){
        const diff=(now-due)/(1000*60*60*24);
        if(diff>0) overdue+=amt;
        daysSum+=diff;
      }
    });

    root.querySelector("[data-fop-total]").textContent=eur(total);
    root.querySelector("[data-fop-overdue]").textContent=eur(overdue);
    root.querySelector("[data-fop-avgdays]").textContent =
      rows.length?Math.round(daysSum/rows.length)+"":"—";

    const list=root.querySelector("[data-fop-list]");
    list.innerHTML="";
    rows.slice(0,5).forEach(r=>{
      const row=document.createElement("div");
      row.className="fop-row";
      row.innerHTML=`
        <span>${r.Bezeichnung||r.Text||"Posten"}</span>
        <span class="${n(r.Betrag)>0?'':'fop-warn'}">${eur(r.Betrag)}</span>
      `;
      list.appendChild(row);
    });
  }

  window.FinanceOPModul={render};
})();
