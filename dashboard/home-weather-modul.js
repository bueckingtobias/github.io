(function(){
  function qs(root, sel){ return root.querySelector(sel); }
  function pad(n){ return String(n).padStart(2,"0"); }

  function fmtDay(d){
    return d.toLocaleDateString("de-DE", { weekday:"short" });
  }
  function cToStr(v){
    if(v == null || !isFinite(v)) return "—";
    return Math.round(v) + "°";
  }

  async function fetchWeather(lat, lon){
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${encodeURIComponent(lat)}` +
      `&longitude=${encodeURIComponent(lon)}` +
      "&current=temperature_2m,apparent_temperature,wind_speed_10m" +
      "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
      "&timezone=Europe%2FBerlin";
    const r = await fetch(url, { cache:"no-store" });
    if(!r.ok) throw new Error("Wetter API Fehler (HTTP " + r.status + ")");
    return r.json();
  }

  async function geocode(name, country){
    const url =
      "https://geocoding-api.open-meteo.com/v1/search" +
      `?name=${encodeURIComponent(name)}` +
      `&count=1&language=de&format=json` +
      (country ? `&country=${encodeURIComponent(country)}` : "");
    const r = await fetch(url, { cache:"no-store" });
    if(!r.ok) throw new Error("Geocoding Fehler (HTTP " + r.status + ")");
    const j = await r.json();
    if(!j.results || !j.results.length) throw new Error("Ort nicht gefunden: " + name);
    return j.results[0];
  }

  function render(container, data){
    const root = container.querySelector("[data-aw-root]") || container;

    const location = (data && data.location) ? String(data.location) : "Ganderkesee";
    const country = (data && data.country) ? String(data.country) : "DE";

    const elCity = qs(root, "[data-aw-city]");
    const elSub  = qs(root, "[data-aw-sub]");
    const elPill = qs(root, "[data-aw-pill]");
    const elTemp = qs(root, "[data-aw-temp]");
    const elDesc = qs(root, "[data-aw-desc]");
    const elHiLo = qs(root, "[data-aw-hilo]");
    const elFeel = qs(root, "[data-aw-feel]");
    const elWind = qs(root, "[data-aw-wind]");
    const elPop  = qs(root, "[data-aw-pop]");
    const elFc   = qs(root, "[data-aw-forecast]");
    const elFoot = qs(root, "[data-aw-foot]");

    elCity.textContent = location;
    elSub.textContent = "Lädt…";
    elPill.textContent = "Live";
    elDesc.textContent = "—";

    (async ()=>{
      try{
        const geo = await geocode(location, country);
        const w = await fetchWeather(geo.latitude, geo.longitude);

        const now = new Date();
        const clock = now.toLocaleString("de-DE", { weekday:"short", day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });

        const t = w.current?.temperature_2m;
        const feel = w.current?.apparent_temperature;
        const wind = w.current?.wind_speed_10m;

        const dates = (w.daily?.time || []).slice(0,5);
        const tmax = (w.daily?.temperature_2m_max || []).slice(0,5);
        const tmin = (w.daily?.temperature_2m_min || []).slice(0,5);
        const pop = (w.daily?.precipitation_probability_max || []).slice(0,5);

        elSub.textContent = `${geo.name}${geo.admin1 ? " · " + geo.admin1 : ""} · ${clock}`;
        elTemp.textContent = cToStr(t);
        elDesc.textContent = "Aktuell";
        elHiLo.textContent = `H: ${cToStr(tmax[0])} · T: ${cToStr(tmin[0])}`;

        elFeel.textContent = cToStr(feel);
        elWind.textContent = (wind != null ? Math.round(wind) + " km/h" : "—");
        elPop.textContent  = (pop[0] != null ? Math.round(pop[0]) + "%" : "—");

        elFc.innerHTML = "";
        dates.forEach((iso, i)=>{
          const d = new Date(iso + "T12:00:00");
          const card = document.createElement("div");
          card.className = "aw-day";
          card.innerHTML = `
            <div class="aw-dow">${fmtDay(d)}</div>
            <div class="aw-range">${cToStr(tmax[i])} / ${cToStr(tmin[i])}</div>
            <div class="aw-pop">Regen ${pop[i] != null ? Math.round(pop[i]) + "%" : "—"}</div>
          `;
          elFc.appendChild(card);
        });

        elFoot.textContent = "Quelle: Open-Meteo";
      }catch(e){
        elSub.textContent = "—";
        elTemp.textContent = "—";
        elDesc.textContent = "Wetter konnte nicht geladen werden.";
        elHiLo.textContent = "";
        elFeel.textContent = "—";
        elWind.textContent = "—";
        elPop.textContent = "—";
        elFc.innerHTML = "";
        elFoot.textContent = (e && e.message) ? e.message : String(e);
      }
    })();
  }

  window.HomeWeatherModul = { render };
})();
