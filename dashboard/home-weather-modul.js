(function(){
  window.HomeWeatherModul = window.HomeWeatherModul || {};
  window.HomeWeatherModul.rootClass = "home-weather-root";
  window.HomeWeatherModul.render = render;

  function esc(s){ return String(s||"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m])); }

  function fmtDay(iso){
    try{
      const d = new Date(iso+"T00:00:00");
      return d.toLocaleDateString("de-DE",{ weekday:"short", day:"2-digit", month:"2-digit" });
    }catch(_){ return iso; }
  }

  async function geocode(city){
    const url = "https://geocoding-api.open-meteo.com/v1/search?count=1&language=de&format=json&name=" + encodeURIComponent(city);
    const r = await fetch(url, { cache:"no-store" });
    if(!r.ok) throw new Error("Geocoding HTTP " + r.status);
    const j = await r.json();
    if(!j.results || !j.results.length) throw new Error("Ort nicht gefunden");
    return j.results[0];
  }

  async function getWeather(lat, lon){
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      "?latitude=" + encodeURIComponent(lat) +
      "&longitude=" + encodeURIComponent(lon) +
      "&current=temperature_2m,apparent_temperature,wind_speed_10m,precipitation" +
      "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum" +
      "&timezone=Europe%2FBerlin";
    const r = await fetch(url, { cache:"no-store" });
    if(!r.ok) throw new Error("Weather HTTP " + r.status);
    return await r.json();
  }

  function render(root, cfg){
    const savedCity = localStorage.getItem("HOME_WEATHER_CITY") || "Ganderkesee";
    root.innerHTML = `
      <div class="hw-head">
        <div>
          <div class="hw-title">Wetter</div>
          <div class="hw-sub" id="hwSub">Live Forecast (Open-Meteo)</div>
        </div>
        <div class="hw-badge" id="hwBadge">—</div>
      </div>

      <div class="hw-body">
        <div class="hw-row">
          <div class="hw-city" style="flex:1;min-width:0;">
            <input class="hw-input" id="hwCity" value="${esc(savedCity)}" placeholder="Ort (z. B. Ganderkesee, München, Berlin)" />
          </div>
          <button class="hw-btn" id="hwGo">Update</button>
        </div>

        <div class="hw-now" id="hwNow">
          <div>
            <div class="hw-temp">—</div>
            <div class="hw-meta">—</div>
          </div>
          <div class="hw-badge">—</div>
        </div>

        <div class="hw-forecast" id="hwForecast"></div>

        <div class="hw-hint" id="hwHint">Tipp: Ort ändern → Update.</div>
      </div>
    `;

    const elCity = root.querySelector("#hwCity");
    const btn = root.querySelector("#hwGo");

    async function load(){
      const city = (elCity.value || "").trim();
      if(!city) return;

      root.querySelector("#hwBadge").textContent = "lädt…";
      root.querySelector("#hwHint").textContent = "—";

      try{
        localStorage.setItem("HOME_WEATHER_CITY", city);
        const loc = await geocode(city);
        const w = await getWeather(loc.latitude, loc.longitude);

        const c = w.current;
        const t = Math.round(c.temperature_2m);
        const feels = Math.round(c.apparent_temperature);
        const wind = Math.round(c.wind_speed_10m);
        const pr = Number(c.precipitation||0);

        root.querySelector("#hwBadge").textContent = loc.name + (loc.admin1 ? " · " + loc.admin1 : "");

        const now = root.querySelector("#hwNow");
        now.innerHTML = `
          <div>
            <div class="hw-temp">${t}°</div>
            <div class="hw-meta">
              Gefühlt ${feels}° · Wind ${wind} km/h · Niederschlag ${pr} mm
            </div>
          </div>
          <div class="hw-badge">${new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}</div>
        `;

        const d = w.daily;
        const days = d.time.slice(0,4).map((day,i)=>({
          day,
          min: Math.round(d.temperature_2m_min[i]),
          max: Math.round(d.temperature_2m_max[i]),
          pr:  Math.round(d.precipitation_sum[i] || 0)
        }));

        root.querySelector("#hwForecast").innerHTML = days.map(x=>`
          <div class="hw-day">
            <div class="hw-d">${fmtDay(x.day)}</div>
            <div class="hw-v">${x.max}° / ${x.min}°</div>
            <div class="hw-h">Regen ${x.pr} mm</div>
          </div>
        `).join("");

        root.querySelector("#hwHint").textContent = "Datenquelle: Open-Meteo (ohne API-Key).";
      }catch(e){
        root.querySelector("#hwBadge").textContent = "Fehler";
        root.querySelector("#hwHint").textContent = "Konnte Wetter nicht laden: " + (e?.message || e);
      }
    }

    btn.addEventListener("click", load);
    elCity.addEventListener("keydown", (ev)=>{ if(ev.key === "Enter") load(); });

    load();
  }
})();