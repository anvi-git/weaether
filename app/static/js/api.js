/**
 * MeteoVision API Client
 * Gestisce le chiamate al backend FastAPI con fallback automatico alle API
 * pubbliche Open-Meteo per garantire il funzionamento anche in ambienti statici o isolati.
 */

const Api = {
  // Cerca località per nome con supporto AbortSignal per evitare race condition
  async searchCities(query, signal = null) {
    if (!query || query.trim().length < 2) return [];

    // 1. Prova endpoint FastAPI locale
    try {
      const res = await fetch(`/api/geo/search?q=${encodeURIComponent(query)}`, { signal });
      if (res.ok) {
        const data = await res.json();
        return data.results || [];
      }
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      // Procedi con il fallback se il backend non è disponibile
    }

    // 2. Fallback diretto a Open-Meteo Geocoding
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=it&format=json`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      return (data.results || []).map(item => ({
        id: item.id,
        name: item.name,
        label: `${item.name}${item.admin1 ? ', ' + item.admin1 : ''}${item.country ? ', ' + item.country : ''}`,
        latitude: item.latitude,
        longitude: item.longitude,
        country: item.country,
        country_code: item.country_code,
        admin1: item.admin1,
        timezone: item.timezone || 'auto'
      }));
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      console.warn("Fallback ricerca città non riuscito:", err);
      return [];
    }
  },

  // Recupera solo le previsioni meteo
  async getForecast(lat, lon, timezone = 'auto', signal = null) {
    try {
      const res = await fetch(`/api/weather/forecast?lat=${lat}&lon=${lon}&timezone=${timezone}`, { signal });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      if (e.name === 'AbortError') throw e;
    }

    // Fallback diretto per il meteo
    return await this.fetchDirectForecast(lat, lon, timezone, signal);
  },

  // Recupera solo la qualità dell'aria
  async getAirQuality(lat, lon, timezone = 'auto', signal = null) {
    try {
      const res = await fetch(`/api/weather/air-quality?lat=${lat}&lon=${lon}&timezone=${timezone}`, { signal });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      if (e.name === 'AbortError') throw e;
    }

    // Fallback diretto per la qualità dell'aria
    return await this.fetchDirectAirQuality(lat, lon, timezone, signal);
  },

  // Recupera previsioni meteo + qualità dell'aria (con separazione logica)
  async getWeatherOverview(lat, lon, timezone = 'auto', signal = null) {
    // Esegue in parallelo le due richieste indipendenti
    const forecastPromise = this.getForecast(lat, lon, timezone, signal);
    const airQualityPromise = this.getAirQuality(lat, lon, timezone, signal).catch(err => {
      console.warn("Qualità dell'aria non disponibile:", err);
      return null;
    });

    const [weather, airQuality] = await Promise.all([forecastPromise, airQualityPromise]);
    return { weather, air_quality: airQuality };
  },

  // Recupera dati meteo storici (archivio)
  async getHistoricalData(lat, lon, startDate, endDate, timezone = 'auto', signal = null) {
    try {
      const res = await fetch(`/api/weather/history?lat=${lat}&lon=${lon}&start_date=${startDate}&end_date=${endDate}&timezone=${timezone}`, { signal });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      if (e.name === 'AbortError') throw e;
    }

    // Fallback diretto Open-Meteo Archive
    try {
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=weather_code,temperature_2m_max,temperature_2m_min,temperature_2m_mean,apparent_temperature_max,apparent_temperature_min,precipitation_sum,wind_speed_10m_max&timezone=${timezone}`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const daily = data.daily || {};
      const times = daily.time || [];
      const records = [];
      let totalPrecip = 0;
      const temps = [];

      for (let i = 0; i < times.length; i++) {
        const tMax = daily.temperature_2m_max?.[i];
        const tMin = daily.temperature_2m_min?.[i];
        const tMean = daily.temperature_2m_mean?.[i];
        const precip = daily.precipitation_sum?.[i] !== undefined && daily.precipitation_sum?.[i] !== null ? daily.precipitation_sum[i] : 0;
        const speed = daily.wind_speed_10m_max?.[i];
        const wCode = daily.weather_code?.[i] !== undefined ? daily.weather_code[i] : 0;

        if (precip !== null && precip !== undefined) totalPrecip += precip;
        if (tMean !== null && tMean !== undefined) temps.push(tMean);

        records.push({
          date: times[i],
          temp_max: tMax,
          temp_min: tMin,
          temp_mean: tMean,
          precipitation: precip,
          wind_speed_max: speed,
          weather_info: {
            code: wCode,
            description: "Dato storico",
            icon: "calendar"
          }
        });
      }

      const avgTemp = temps.length ? +(temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : null;

      return {
        start_date: startDate,
        end_date: endDate,
        total_days: times.length,
        total_precipitation: +totalPrecip.toFixed(1),
        average_temperature: avgTemp,
        daily: records
      };
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      console.error("Errore recupero storico da archivio Open-Meteo:", err);
      throw err;
    }
  },

  // Fallback diretto per meteo forecast
  async fetchDirectForecast(lat, lon, timezone = 'auto', signal = null) {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=${timezone}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant`;

    const res = await fetch(weatherUrl, { signal });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const wRes = await res.json();

    const currentRaw = wRes.current || {};
    const isDay = currentRaw.is_day !== undefined ? currentRaw.is_day : 1;
    const wCode = currentRaw.weather_code !== undefined ? currentRaw.weather_code : 0;

    return {
      latitude: lat,
      longitude: lon,
      timezone: wRes.timezone,
      current: {
        time: currentRaw.time,
        temperature: currentRaw.temperature_2m,
        apparent_temperature: currentRaw.apparent_temperature,
        humidity: currentRaw.relative_humidity_2m,
        precipitation: currentRaw.precipitation !== undefined ? currentRaw.precipitation : null,
        rain: currentRaw.rain !== undefined ? currentRaw.rain : 0,
        snowfall: currentRaw.snowfall !== undefined ? currentRaw.snowfall : 0,
        weather_code: wCode,
        weather_info: {
          code: wCode,
          description: "Meteo rilevato",
          icon: isDay ? "sun" : "moon",
          is_day: Boolean(isDay),
          bg_gradient: "from-sky-500 via-blue-600 to-indigo-800"
        },
        cloud_cover: currentRaw.cloud_cover,
        pressure: currentRaw.pressure_msl || currentRaw.surface_pressure,
        wind_speed: currentRaw.wind_speed_10m,
        wind_direction: currentRaw.wind_direction_10m,
        wind_direction_label: "N",
        wind_gusts: currentRaw.wind_gusts_10m
      },
      hourly: (wRes.hourly?.time || []).slice(0, 24).map((t, i) => ({
        time: t,
        temperature: wRes.hourly.temperature_2m?.[i],
        humidity: wRes.hourly.relative_humidity_2m?.[i],
        precipitation_probability: wRes.hourly.precipitation_probability?.[i] !== undefined ? wRes.hourly.precipitation_probability[i] : null,
        precipitation: wRes.hourly.precipitation?.[i] !== undefined ? wRes.hourly.precipitation[i] : 0,
        wind_speed: wRes.hourly.wind_speed_10m?.[i],
        uv_index: wRes.hourly.uv_index?.[i],
        weather_info: { code: wRes.hourly.weather_code?.[i] || 0, description: "", icon: "cloud" }
      })),
      daily: (wRes.daily?.time || []).map((d, i) => ({
        date: d,
        temp_max: wRes.daily.temperature_2m_max?.[i],
        temp_min: wRes.daily.temperature_2m_min?.[i],
        apparent_temp_max: wRes.daily.apparent_temperature_max?.[i],
        apparent_temp_min: wRes.daily.apparent_temperature_min?.[i],
        precipitation_sum: wRes.daily.precipitation_sum?.[i] !== undefined ? wRes.daily.precipitation_sum[i] : 0,
        precipitation_probability_max: wRes.daily.precipitation_probability_max?.[i] !== undefined ? wRes.daily.precipitation_probability_max[i] : null,
        wind_speed_max: wRes.daily.wind_speed_10m_max?.[i],
        weather_info: { code: wRes.daily.weather_code?.[i] || 0, description: "", icon: "cloud" }
      }))
    };
  },

  // Fallback diretto per qualità dell'aria
  async fetchDirectAirQuality(lat, lon, timezone = 'auto', signal = null) {
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&timezone=${timezone}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,uv_index`;
    const res = await fetch(aqiUrl, { signal });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const aRes = await res.json();

    const curr = aRes.current || {};
    const eaqi = curr.european_aqi;
    
    // Calcola rating in base alla scala ufficiale EAQI
    let rating = {
      level: 0,
      label: "Non disponibile",
      color: "text-gray-400",
      bg: "bg-gray-500/20",
      border: "border-gray-500/30"
    };

    if (eaqi !== null && eaqi !== undefined) {
      const val = Math.round(eaqi);
      if (val <= 20) {
        rating = { level: 1, label: "Eccellente", color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/30" };
      } else if (val <= 40) {
        rating = { level: 2, label: "Buona", color: "text-green-400", bg: "bg-green-500/20", border: "border-green-500/30" };
      } else if (val <= 60) {
        rating = { level: 3, label: "Moderata", color: "text-yellow-400", bg: "bg-yellow-500/20", border: "border-yellow-500/30" };
      } else if (val <= 80) {
        rating = { level: 4, label: "Scarsa", color: "text-orange-400", bg: "bg-orange-500/20", border: "border-orange-500/30" };
      } else {
        rating = { level: 5, label: "Molto Scarsa", color: "text-rose-500", bg: "bg-rose-500/20", border: "border-rose-500/30" };
      }
    }

    return {
      current: {
        european_aqi: eaqi,
        us_aqi: curr.us_aqi,
        pm2_5: curr.pm2_5,
        pm10: curr.pm10,
        nitrogen_dioxide: curr.nitrogen_dioxide,
        ozone: curr.ozone,
        sulphur_dioxide: curr.sulphur_dioxide,
        carbon_monoxide: curr.carbon_monoxide,
        rating
      }
    };
  },

  // Reverse geocoding da coordinate GPS
  async reverseGeocode(lat, lon) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'it' } });
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const name = addr.city || addr.town || addr.village || addr.municipality || addr.county || "Posizione Rilevata";
        const region = addr.state || addr.region || "";
        const country = addr.country || "";
        return {
          name,
          label: `${name}${region ? ', ' + region : ''}${country ? ', ' + country : ''}`,
          latitude: lat,
          longitude: lon,
          country
        };
      }
    } catch (e) {
      console.warn("Reverse geocode fallito:", e);
    }
    return {
      name: "La tua posizione",
      label: `Coordinate (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
      latitude: lat,
      longitude: lon
    };
  }
};
