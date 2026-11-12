/**
 * MeteoVision - Main Application Logic
 */

const State = {
  location: {
    name: "Roma",
    label: "Roma, Lazio, Italia",
    latitude: 41.89,
    longitude: 12.51,
    timezone: "auto"
  },
  unit: "C", // "C" o "F"
  weather: null,
  airQuality: null,
  history: null,
  historyDays: 14,
  isLoading: false
};

// Formattazione data / ora in italiano
const ItalianDays = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const ItalianDaysShort = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const ItalianMonthsShort = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

// Utility conversione temperatura
function formatTemp(val, unit = State.unit) {
  if (val === null || val === undefined) return '--';
  if (unit === 'F') {
    const f = (val * 9 / 5) + 32;
    return Math.round(f);
  }
  return Math.round(val);
}

// Utility conversione vento
function formatWind(kmh, unit = State.unit) {
  if (kmh === null || kmh === undefined) return { val: '--', unit: 'km/h' };
  if (unit === 'F') {
    return { val: Math.round(kmh * 0.621371), unit: 'mph' };
  }
  return { val: Math.round(kmh), unit: 'km/h' };
}

// Utility conversione precipitazioni
function formatPrecip(mm, unit = State.unit) {
  if (mm === null || mm === undefined) return { val: '0.0', unit: 'mm' };
  if (unit === 'F') {
    return { val: (mm * 0.0393701).toFixed(2), unit: 'in' };
  }
  return { val: mm.toFixed(1), unit: 'mm' };
}

// Icone Lucide Mapping Fallback
function getLucideIconName(iconName) {
  const map = {
    'sun': 'sun',
    'sun-medium': 'sun-medium',
    'moon': 'moon',
    'cloud': 'cloud',
    'cloud-sun': 'cloud-sun',
    'cloud-moon': 'cloud-moon',
    'cloud-fog': 'cloud-fog',
    'cloud-rain': 'cloud-rain',
    'cloud-drizzle': 'cloud-drizzle',
    'cloud-hail': 'cloud-hail',
    'cloud-snow': 'cloud-snow',
    'cloud-lightning': 'cloud-lightning',
    'snowflake': 'snowflake',
    'wind': 'wind'
  };
  return map[iconName] || 'cloud';
}

// Inizializzazione Applicazione
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupDefaultDates();
  loadAllData();
});

function setupDefaultDates() {
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() - 2); // 2 giorni fa per certezza archivi

  const start = new Date(end);
  start.setDate(start.getDate() - 14);

  const formatISO = (d) => d.toISOString().split('T')[0];
  const startInput = document.getElementById('history-start-date');
  const endInput = document.getElementById('history-end-date');

  if (startInput) startInput.value = formatISO(start);
  if (endInput) endInput.value = formatISO(end);
}

function setupEventListeners() {
  // Cambio unità °C / °F
  const btnC = document.getElementById('unit-c');
  const btnF = document.getElementById('unit-f');

  btnC.addEventListener('click', () => {
    if (State.unit === 'C') return;
    State.unit = 'C';
    btnC.classList.add('bg-sky-500', 'text-white');
    btnC.classList.remove('text-slate-400');
    btnF.classList.remove('bg-sky-500', 'text-white');
    btnF.classList.add('text-slate-400');
    updateAllViews();
  });

  btnF.addEventListener('click', () => {
    if (State.unit === 'F') return;
    State.unit = 'F';
    btnF.classList.add('bg-sky-500', 'text-white');
    btnF.classList.remove('text-slate-400');
    btnC.classList.remove('bg-sky-500', 'text-white');
    btnC.classList.add('text-slate-400');
    updateAllViews();
  });

  // Geolocation
  const geoBtn = document.getElementById('btn-geolocation');
  geoBtn.addEventListener('click', requestUserLocation);

  // Ricerca città con debounce
  const searchInput = document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear');
  const dropdown = document.getElementById('search-dropdown');

  let debounceTimer;
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (val.length > 0) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
      dropdown.classList.add('hidden');
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (val.length >= 2) {
        performSearch(val);
      }
    }, 280);
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.classList.add('hidden');
    dropdown.classList.add('hidden');
    searchInput.focus();
  });

  // Chiudi dropdown al click fuori
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });

  // Quick City Chips
  document.querySelectorAll('.quick-city-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const lat = parseFloat(btn.dataset.lat);
      const lon = parseFloat(btn.dataset.lon);
      const name = btn.dataset.name;
      selectLocation({
        name: name,
        label: `${name}, Posizione Rapida`,
        latitude: lat,
        longitude: lon,
        timezone: 'auto'
      });
    });
  });

  // Preset Storico (7, 14, 30, 90 giorni)
  document.querySelectorAll('.btn-history-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-history-preset').forEach(b => {
        b.className = 'btn-history-preset px-3 py-1.5 rounded-xl glass-card hover:bg-white/15 text-slate-200 transition-colors';
      });
      btn.className = 'btn-history-preset px-3 py-1.5 rounded-xl bg-purple-600 text-white font-medium transition-colors';

      State.historyDays = parseInt(btn.dataset.days);
      loadHistoricalData();
    });
  });

  // Intervallo Personalizzato Storico
  const applyCustomBtn = document.getElementById('btn-apply-history-custom');
  if (applyCustomBtn) {
    applyCustomBtn.addEventListener('click', () => {
      const start = document.getElementById('history-start-date').value;
      const end = document.getElementById('history-end-date').value;
      if (!start || !end) {
        alert("Inserisci entrambe le date (inizio e fine).");
        return;
      }
      if (new Date(start) > new Date(end)) {
        alert("La data di inizio non può essere successiva alla data di fine.");
        return;
      }
      document.querySelectorAll('.btn-history-preset').forEach(b => {
        b.className = 'btn-history-preset px-3 py-1.5 rounded-xl glass-card hover:bg-white/15 text-slate-200 transition-colors';
      });
      loadHistoricalData(start, end);
    });
  }

  // Retry button
  const retryBtn = document.getElementById('btn-retry');
  if (retryBtn) {
    retryBtn.addEventListener('click', loadAllData);
  }

  // Mobile nav links active highlight
  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.mobile-nav-link').forEach(l => l.classList.remove('text-sky-400'));
      link.classList.add('text-sky-400');
    });
  });
}

// Richiesta Geolocation dal browser
function requestUserLocation() {
  if (!navigator.geolocation) {
    alert("La geolocalizzazione non è supportata dal tuo browser.");
    return;
  }

  const geoBtn = document.getElementById('btn-geolocation');
  geoBtn.classList.add('animate-pulse');

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      geoBtn.classList.remove('animate-pulse');
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      
      const locInfo = await Api.reverseGeocode(lat, lon);
      selectLocation({
        name: locInfo.name,
        label: locInfo.label,
        latitude: lat,
        longitude: lon,
        timezone: 'auto'
      });
    },
    (err) => {
      geoBtn.classList.remove('animate-pulse');
      console.warn("Geolocalizzazione rifiutata o non disponibile:", err.message);
      alert("Impossibile accedere alla tua posizione: " + err.message + "\nPuoi comunque cercare qualsiasi città nella barra in alto.");
    },
    { timeout: 8000, enableHighAccuracy: true }
  );
}

// Ricerca e render suggerimenti dropdown
async function performSearch(query) {
  const dropdown = document.getElementById('search-dropdown');
  dropdown.innerHTML = `
    <div class="px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
      <div class="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
      <span>Ricerca di "${query}"...</span>
    </div>
  `;
  dropdown.classList.remove('hidden');

  try {
    const results = await Api.searchCities(query);
    if (!results || results.length === 0) {
      dropdown.innerHTML = `
        <div class="px-4 py-3 text-xs text-slate-400">
          Nessuna località trovata per "<strong>${query}</strong>"
        </div>
      `;
      return;
    }

    dropdown.innerHTML = results.map(item => `
      <div class="search-result-item px-4 py-3 text-xs sm:text-sm text-slate-200 hover:bg-sky-500/20 hover:text-white cursor-pointer transition-colors flex items-center justify-between"
           data-lat="${item.latitude}" 
           data-lon="${item.longitude}" 
           data-name="${item.name}" 
           data-label="${item.label}"
           data-timezone="${item.timezone || 'auto'}">
        <div class="flex items-center gap-2.5">
          <i data-lucide="map-pin" class="w-4 h-4 text-sky-400 shrink-0"></i>
          <div>
            <div class="font-medium">${item.name}</div>
            <div class="text-[11px] text-slate-400">${item.label}</div>
          </div>
        </div>
        ${item.country_code ? `<span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/10 text-slate-300">${item.country_code}</span>` : ''}
      </div>
    `).join('');

    lucide.createIcons();

    // Event listener click sui risultati
    dropdown.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        selectLocation({
          name: el.dataset.name,
          label: el.dataset.label,
          latitude: parseFloat(el.dataset.lat),
          longitude: parseFloat(el.dataset.lon),
          timezone: el.dataset.timezone
        });
        dropdown.classList.add('hidden');
        document.getElementById('search-input').value = '';
        document.getElementById('search-clear').classList.add('hidden');
      });
    });

  } catch (err) {
    dropdown.innerHTML = `
      <div class="px-4 py-3 text-xs text-rose-400">
        Errore durante la ricerca: ${err.message}
      </div>
    `;
  }
}

function selectLocation(loc) {
  State.location = loc;
  loadAllData();
}

// Caricamento Dati Completi (Meteo + Aria + Storico)
async function loadAllData() {
  const loading = document.getElementById('loading-state');
  const errorState = document.getElementById('error-state');
  const weatherContent = document.getElementById('weather-content');

  loading.classList.remove('hidden');
  errorState.classList.add('hidden');
  weatherContent.classList.add('opacity-40');

  try {
    const overviewPromise = Api.getWeatherOverview(
      State.location.latitude,
      State.location.longitude,
      State.location.timezone
    );

    const historyPromise = fetchHistoryForCurrentState();

    const [overviewData, historyData] = await Promise.all([overviewPromise, historyPromise]);

    State.weather = overviewData.weather;
    State.airQuality = overviewData.air_quality;
    State.history = historyData;

    loading.classList.add('hidden');
    weatherContent.classList.remove('opacity-40');

    updateAllViews();

  } catch (err) {
    console.error("Errore caricamento dati:", err);
    loading.classList.add('hidden');
    errorState.classList.remove('hidden');
    document.getElementById('error-message').textContent = err.message || "Impossibile recuperare i dati meteo. Verifica la connessione.";
  }
}

// Caricamento solo dei dati storici (es. quando l'utente cambia periodo)
async function loadHistoricalData(customStart = null, customEnd = null) {
  try {
    let start = customStart;
    let end = customEnd;

    if (!start || !end) {
      const today = new Date();
      const eDate = new Date(today);
      eDate.setDate(eDate.getDate() - 2);
      const sDate = new Date(eDate);
      sDate.setDate(sDate.getDate() - State.historyDays);

      const toISO = (d) => d.toISOString().split('T')[0];
      start = toISO(sDate);
      end = toISO(eDate);
    }

    State.history = await Api.getHistoricalData(
      State.location.latitude,
      State.location.longitude,
      start,
      end,
      State.location.timezone
    );

    renderHistoricalSection();
  } catch (err) {
    console.error("Errore caricamento storico:", err);
  }
}

function fetchHistoryForCurrentState() {
  const today = new Date();
  const eDate = new Date(today);
  eDate.setDate(eDate.getDate() - 2);
  const sDate = new Date(eDate);
  sDate.setDate(sDate.getDate() - State.historyDays);

  const toISO = (d) => d.toISOString().split('T')[0];
  return Api.getHistoricalData(
    State.location.latitude,
    State.location.longitude,
    toISO(sDate),
    toISO(eDate),
    State.location.timezone
  );
}

// Aggiorna l'intera interfaccia
function updateAllViews() {
  if (!State.weather) return;

  renderHeroCard();
  renderKeyMetrics();
  renderHourlyForecast();
  renderDailyForecast();
  renderAirQualityDetails();
  renderHistoricalSection();

  lucide.createIcons();
}

// 1. Render Hero Card
function renderHeroCard() {
  const current = State.weather.current || {};
  const meta = current.weather_info || {};
  const dailyToday = State.weather.daily?.[0] || {};

  document.getElementById('current-city-name').textContent = State.location.name;
  document.getElementById('current-location-label').textContent = State.location.label;
  
  const dayBadge = document.getElementById('current-badge-day');
  if (current.is_day) {
    dayBadge.textContent = "Giorno";
    dayBadge.className = "ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300";
  } else {
    dayBadge.textContent = "Notte";
    dayBadge.className = "ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-400/20 text-indigo-300";
  }

  document.getElementById('current-weather-desc').textContent = meta.description || 'Variabile';
  document.getElementById('current-temp').textContent = formatTemp(current.temperature);
  document.getElementById('current-temp-unit').textContent = `°${State.unit}`;
  document.getElementById('current-apparent-temp').textContent = `${formatTemp(current.apparent_temperature)}°${State.unit}`;

  document.getElementById('current-temp-max').textContent = `${formatTemp(dailyToday.temp_max)}°`;
  document.getElementById('current-temp-min').textContent = `${formatTemp(dailyToday.temp_min)}°`;

  // Orario di aggiornamento
  if (current.time) {
    const timeParts = current.time.split('T')[1]?.substring(0, 5) || current.time;
    document.getElementById('current-updated-time').textContent = timeParts;
  }

  // Icona
  const iconEl = document.getElementById('current-weather-icon');
  iconEl.setAttribute('data-lucide', getLucideIconName(meta.icon));

  // Dynamic Background Gradient
  const bg = document.getElementById('weather-bg');
  const grad = meta.bg_gradient || "from-slate-900 via-indigo-950 to-slate-950";
  bg.className = `fixed inset-0 pointer-events-none -z-10 bg-gradient-to-br ${grad} opacity-90 transition-all duration-1000`;
}

// 2. Render Metriche Chiave (Precipitazioni, Vento, Aria, Parametri)
function renderKeyMetrics() {
  const current = State.weather.current || {};
  const dailyToday = State.weather.daily?.[0] || {};

  // Precipitazioni
  const pFormatted = formatPrecip(current.precipitation);
  document.getElementById('metric-precip-value').textContent = pFormatted.val;
  document.getElementById('metric-precip-unit').textContent = pFormatted.unit;
  const prob = dailyToday.precipitation_probability_max || 0;
  document.getElementById('metric-precip-prob').textContent = `${prob}%`;
  document.getElementById('metric-precip-bar').style.width = `${Math.min(prob, 100)}%`;

  // Vento
  const wFormatted = formatWind(current.wind_speed);
  const gFormatted = formatWind(current.wind_gusts);
  document.getElementById('metric-wind-speed').textContent = wFormatted.val;
  document.getElementById('metric-wind-unit').textContent = wFormatted.unit;
  document.getElementById('metric-wind-gusts').textContent = `${gFormatted.val} ${gFormatted.unit}`;
  
  const dirLabel = current.wind_direction_label || 'N';
  const deg = current.wind_direction !== undefined ? current.wind_direction : 0;
  document.getElementById('metric-wind-direction').textContent = `${dirLabel} (${deg}°)`;
  
  // Orientamento ago bussola
  const needle = document.getElementById('compass-needle');
  if (needle) {
    needle.style.transform = `rotate(${deg}deg)`;
  }

  // Qualità Aria Mini Card
  const aqiCurr = State.airQuality?.current;
  if (aqiCurr && aqiCurr.european_aqi !== null && aqiCurr.european_aqi !== undefined) {
    document.getElementById('metric-aqi-value').textContent = Math.round(aqiCurr.european_aqi);
    const badge = document.getElementById('metric-aqi-badge');
    const rating = aqiCurr.rating || {};
    badge.textContent = rating.label || 'Buona';
    badge.className = `text-xs font-bold px-2 py-0.5 rounded-full ${rating.bg || 'bg-emerald-500/20'} ${rating.color || 'text-emerald-300'} border ${rating.border || 'border-emerald-500/30'}`;

    document.getElementById('metric-aqi-us').textContent = `US: ${aqiCurr.us_aqi ? Math.round(aqiCurr.us_aqi) : '--'}`;
    document.getElementById('metric-pm25').textContent = aqiCurr.pm2_5 ? `${Math.round(aqiCurr.pm2_5)} µg/m³` : '--';
    document.getElementById('metric-pm10').textContent = aqiCurr.pm10 ? `${Math.round(aqiCurr.pm10)} µg/m³` : '--';
  } else {
    document.getElementById('metric-aqi-value').textContent = '--';
    document.getElementById('metric-aqi-badge').textContent = 'N/D';
  }

  // Parametri Atmosferici
  document.getElementById('metric-humidity').textContent = `${current.humidity !== undefined ? current.humidity : '--'}%`;
  document.getElementById('metric-pressure').textContent = `${current.pressure ? Math.round(current.pressure) : '--'} hPa`;
  
  const uv = dailyToday.uv_index_max !== undefined ? dailyToday.uv_index_max : (State.weather.hourly?.[0]?.uv_index || 0);
  document.getElementById('metric-uv').textContent = uv !== null && uv !== undefined ? Math.round(uv) : '--';
  document.getElementById('metric-clouds').textContent = `${current.cloud_cover !== undefined ? current.cloud_cover : '--'}%`;

  let uvDesc = 'Basso';
  if (uv > 2 && uv <= 5) uvDesc = 'Moderato';
  else if (uv > 5 && uv <= 7) uvDesc = 'Alto';
  else if (uv > 7 && uv <= 10) uvDesc = 'Molto Alto';
  else if (uv > 10) uvDesc = 'Estremo (Attenzione)';
  document.getElementById('metric-uv-desc').textContent = uvDesc;
}

// 3. Render Previsioni Orarie (24 ore)
function renderHourlyForecast() {
  const container = document.getElementById('hourly-container');
  const hourly = State.weather.hourly || [];

  if (hourly.length === 0) {
    container.innerHTML = `<div class="text-xs text-slate-400 p-4">Dati orari non disponibili.</div>`;
    return;
  }

  container.innerHTML = hourly.map((item, idx) => {
    const timeStr = item.time ? item.time.split('T')[1]?.substring(0, 5) : '--:--';
    const isNow = idx === 0;
    const meta = item.weather_info || {};
    const iconName = getLucideIconName(meta.icon);
    const pProb = item.precipitation_probability || 0;

    return `
      <div class="snap-start shrink-0 w-20 sm:w-24 p-3 rounded-2xl glass-card flex flex-col items-center justify-between text-center ${isNow ? 'border-sky-400/50 bg-sky-500/15' : ''}">
        <span class="text-xs font-semibold ${isNow ? 'text-sky-300' : 'text-slate-300'}">
          ${isNow ? 'Adesso' : timeStr}
        </span>
        <div class="my-2 p-1.5 rounded-xl bg-white/5">
          <i data-lucide="${iconName}" class="w-6 h-6 text-sky-400"></i>
        </div>
        <div class="text-sm sm:text-base font-bold text-white">
          ${formatTemp(item.temperature)}°
        </div>
        <div class="text-[10px] text-sky-300 flex items-center gap-0.5 mt-1 font-medium">
          <i data-lucide="droplet" class="w-2.5 h-2.5"></i>
          <span>${pProb}%</span>
        </div>
      </div>
    `;
  }).join('');
}

// 4. Render Previsioni 7 Giorni
function renderDailyForecast() {
  const container = document.getElementById('daily-container');
  const daily = State.weather.daily || [];

  if (daily.length === 0) {
    container.innerHTML = `<div class="text-xs text-slate-400 p-4">Previsioni a 7 giorni non disponibili.</div>`;
    return;
  }

  // Calcolo min/max globale dei 7 giorni per la scala delle barre
  const allMins = daily.map(d => d.temp_min).filter(v => v !== null);
  const allMaxs = daily.map(d => d.temp_max).filter(v => v !== null);
  const globalMin = Math.min(...allMins);
  const globalMax = Math.max(...allMaxs);
  const range = (globalMax - globalMin) || 1;

  container.innerHTML = daily.map((item, idx) => {
    let dayLabel = "";
    if (idx === 0) dayLabel = "Oggi";
    else if (idx === 1) dayLabel = "Domani";
    else {
      const parts = item.date.split('-');
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      dayLabel = ItalianDays[d.getDay()];
    }

    const parts = item.date.split('-');
    const dateFormatted = `${parts[2]} ${ItalianMonthsShort[parseInt(parts[1]) - 1]}`;

    const meta = item.weather_info || {};
    const iconName = getLucideIconName(meta.icon);
    const pProb = item.precipitation_probability_max || 0;

    // Calcolo posizionamento barra termica
    const minPercent = ((item.temp_min - globalMin) / range) * 100;
    const maxPercent = ((item.temp_max - globalMin) / range) * 100;
    const barWidth = Math.max(maxPercent - minPercent, 8);

    return `
      <div class="py-3 sm:py-3.5 flex items-center justify-between gap-3 text-xs sm:text-sm">
        
        <!-- Day & Date -->
        <div class="w-24 sm:w-28 shrink-0">
          <div class="font-bold text-white ${idx === 0 ? 'text-sky-300' : ''}">${dayLabel}</div>
          <div class="text-[11px] text-slate-400">${dateFormatted}</div>
        </div>

        <!-- Weather Condition & Icon -->
        <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div class="p-1.5 rounded-lg bg-white/5 shrink-0">
            <i data-lucide="${iconName}" class="w-5 h-5 text-sky-400"></i>
          </div>
          <div class="truncate text-slate-300 hidden md:block text-xs">
            ${meta.description}
          </div>
          ${pProb > 15 ? `
            <span class="text-[10px] font-semibold text-sky-400 flex items-center gap-0.5 ml-auto sm:ml-0">
              <i data-lucide="droplet" class="w-3 h-3"></i> ${pProb}%
            </span>
          ` : ''}
        </div>

        <!-- Temperature Range & Thermal Bar -->
        <div class="flex items-center gap-3 shrink-0">
          <span class="w-8 text-right font-medium text-sky-400 text-xs sm:text-sm">
            ${formatTemp(item.temp_min)}°
          </span>

          <!-- Range Bar (Desktop & Tablet) -->
          <div class="hidden sm:block w-24 sm:w-32 bg-white/10 h-2 rounded-full relative overflow-hidden">
            <div class="absolute h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-rose-500"
                 style="left: ${minPercent}%; width: ${barWidth}%"></div>
          </div>

          <span class="w-8 text-left font-bold text-rose-400 text-xs sm:text-sm">
            ${formatTemp(item.temp_max)}°
          </span>
        </div>

      </div>
    `;
  }).join('');
}

// 5. Render Dettaglio Qualità dell'Aria
function renderAirQualityDetails() {
  const curr = State.airQuality?.current;
  if (!curr) return;

  const rating = curr.rating || {};
  const cardBadge = document.getElementById('aqi-card-level');
  if (cardBadge) {
    cardBadge.textContent = rating.label || 'Buona';
    cardBadge.className = `text-xs font-semibold px-2.5 py-0.5 rounded-full ${rating.bg || 'bg-emerald-500/20'} ${rating.color || 'text-emerald-300'}`;
  }

  // Inquinanti e percentuali rispetto ai limiti OMS
  const setPollutant = (id, val, maxLimit) => {
    const valEl = document.getElementById(`pollutant-${id}`);
    const barEl = document.getElementById(`pollutant-${id}-bar`);
    if (valEl) valEl.textContent = val !== null && val !== undefined ? `${Math.round(val)} µg/m³` : '--';
    if (barEl) {
      const pct = val ? Math.min((val / maxLimit) * 100, 100) : 0;
      barEl.style.width = `${pct}%`;
      if (pct > 80) barEl.className = 'bg-rose-500 h-1.5 rounded-full';
      else if (pct > 50) barEl.className = 'bg-amber-400 h-1.5 rounded-full';
    }
  };

  setPollutant('pm25', curr.pm2_5, 50);
  setPollutant('pm10', curr.pm10, 100);
  setPollutant('no2', curr.nitrogen_dioxide, 150);
  setPollutant('o3', curr.ozone, 180);
  setPollutant('so2', curr.sulphur_dioxide, 100);
}

// 6. Render Sezione Storico (Statistiche e Grafici Chart.js)
function renderHistoricalSection() {
  const hist = State.history;
  if (!hist || !hist.daily || hist.daily.length === 0) return;

  const records = hist.daily;

  // Calcolo statistiche riassuntive
  let maxTemp = -Infinity;
  let maxTempDate = '';
  let maxWind = -Infinity;
  let maxWindDate = '';

  records.forEach(r => {
    if (r.temp_max !== null && r.temp_max > maxTemp) {
      maxTemp = r.temp_max;
      maxTempDate = r.date;
    }
    if (r.wind_speed_max !== null && r.wind_speed_max > maxWind) {
      maxWind = r.wind_speed_max;
      maxWindDate = r.date;
    }
  });

  const formatDateLabel = (d) => {
    if (!d) return '--';
    const parts = d.split('-');
    return `${parts[2]} ${ItalianMonthsShort[parseInt(parts[1]) - 1]}`;
  };

  // Stat Cards
  document.getElementById('hist-stat-avg-temp').textContent = formatTemp(hist.average_temperature);
  document.getElementById('hist-unit-temp').textContent = `°${State.unit}`;

  const pTot = formatPrecip(hist.total_precipitation);
  document.getElementById('hist-stat-total-precip').textContent = pTot.val;

  document.getElementById('hist-stat-max-temp').textContent = formatTemp(maxTemp);
  document.getElementById('hist-unit-max').textContent = `°${State.unit}`;
  document.getElementById('hist-stat-max-date').textContent = `Rilevato il ${formatDateLabel(maxTempDate)}`;

  const wMax = formatWind(maxWind);
  document.getElementById('hist-stat-max-wind').textContent = wMax.val;
  document.getElementById('hist-unit-wind').textContent = wMax.unit;
  document.getElementById('hist-stat-wind-date').textContent = `Rilevato il ${formatDateLabel(maxWindDate)}`;

  // Render Grafici Chart.js
  Charts.renderTemperatureHistory('chart-temp-history', records, State.unit === 'F');
  Charts.renderPrecipitationWindHistory('chart-precip-wind-history', records, State.unit === 'F');
}

