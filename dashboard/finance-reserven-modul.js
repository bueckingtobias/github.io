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
    const root=container.querySelector("[data-fr-root]")||container;
    const rows=Array.isArray(data?.reservesRows)?data.reservesRows:[];

    const total=rows.reduce((a,r)=>a+n(r.Betrag||r.Summe),0);
    root.querySelector("[data-fr-total]").textContent=eur(total);

    const cashflowRows=data?.financeRows||[];
    const avgBurn=cashflowRows.length
      ? Math.abs(cashflowRows.reduce((a,r)=>a+n(r.Cashflow),0)/cashflowRows.length)
      : 0;
    const runway=avgBurn>0?(total/avgBurn).toFixed(1):"—";
    root.querySelector("[data-fr-runway]").textContent=
      runway==="—"?"Runway —":"Runway "+runway+" Monate";

    const bars=root.querySelector("[data-fr-bars]");
    bars.innerHTML="";
    rows.forEach(r=>{
      const b=document.createElement("div");
      b.className="fr-bar";
      const f=document.createElement("div");
      f.className="fr-fill";
      f.style.width=Math.min(100,(n(r.Betrag)/total)*100)+"%";
      b.appendChild(f);
      bars.appendChild(b);
    });
  }

  window.FinanceReservenModul={render};
})();
