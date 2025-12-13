<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>Finanzen · Dashboard</title>
  <meta name="robots" content="noindex,nofollow" />
  <meta name="theme-color" content="#0b1220" />

  <link rel="stylesheet" href="./shell.css" />

  <script src="./auth.js"></script>
  <script>Auth.requireAuth({ loginUrl: "./login.html" });</script>

  <script src="./shell.js"></script>

  <!-- Finance-Module -->
  <link rel="stylesheet" href="./finance-cashflow-modul.css" />
  <script src="./finance-cashflow-modul.js"></script>

  <link rel="stylesheet" href="./finance-kpis-modul.css" />
  <script src="./finance-kpis-modul.js"></script>

  <style>
    .fin-grid{
      display:grid;
      grid-template-columns: repeat(12, minmax(0,1fr));
      gap: var(--gap);
      min-width:0;
    }
    .span12{ grid-column: span 12; }
  </style>
</head>

<body>
  <div id="app"></div>

  <template id="pageTpl">
    <section class="fin-grid">
      <section class="span12">
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Cashflow</div>
              <div class="card-sub">Monatlich · YTD · Forecast.</div>
            </div>
          </div>
          <div class="card-body">
            <div class="finance-cashflow-root"></div>
          </div>
        </div>
      </section>

      <section class="span12">
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Finance KPIs</div>
              <div class="card-sub">Charts + Kennzahlen.</div>
            </div>
          </div>
          <div class="card-body">
            <div class="finance-kpis-root"></div>
          </div>
        </div>
      </section>
    </section>
  </template>

  <script>
    (function(){
      Shell.mount({ active:"./view-finance.html", title:"Finanzen", sub:"Cashflow · KPIs · Forecast" });

      const c = document.querySelector(".finance-cashflow-root");
      if(c && window.FinanceCashflowModul && typeof FinanceCashflowModul.render === "function"){
        FinanceCashflowModul.render(c, {});
      } else if(c){
        c.textContent = "FinanceCashflowModul fehlt (JS nicht gefunden).";
      }

      const k = document.querySelector(".finance-kpis-root");
      if(k && window.FinanceKpisModul && typeof FinanceKpisModul.render === "function"){
        FinanceKpisModul.render(k, {});
      } else if(k){
        k.textContent = "FinanceKpisModul fehlt (JS nicht gefunden).";
      }
    })();
  </script>
</body>
</html>