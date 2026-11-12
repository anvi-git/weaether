/**
 * MeteoVision - Logica Applicativa Principale
 * Gestione dello stato, separazione dei caricamenti, accessibilità WAI-ARIA,
 * gestione preferiti/recenti con localStorage e grafici interattivi.
 */

// Gestore sicuro di archiviazione locale (con fallback in memoria se disabilitato/privato)
const Storage = {
  memory: {},
  get(key, defaultVal = null) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : defaultVal;
    } catch {
      return this.memory[key] !== undefined ? this.memory[key] : defaultVal;
    }
  },
  set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {
      this.memory[key] = val;
    }
  }
};

const State = {
  location: Storage.get('meteovision_last_loc', {
    name: "Roma",
    label: "Roma, Lazio, Italia",
    latitude: 41.89,
    longitude: 12.51,
    timezone: "auto"
  }),
  unit: Storage.get('meteovision_unit', "C"), // "C" o "F"
  weather: null,
  airQuality: null,
  history: null,
  historyDays: 14,
  historyStartDate: null,
  historyEndDate: null,
  loading: {
    weather: false,
    airQuality: false,
    history: false
  },
  favorites: Storage.get('meteovision_favorites', [
    { name: "Roma", label: "Roma, Lazio, IT", latitude: 41.89, longitude: 12.51, timezone: "auto" },
    { name: "Milano", label: "Milano, Lombardia, IT", latitude: 45.46, longitude: 9.19, timezone: "auto" }
  ]),
  recents: Storage.get('meteovision_recents', []),
  activeRequestId: 0 // Identificatore progressivo per evitare race condition tra richieste
};

// Formattazione data / ora in italiano
const ItalianDays = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const ItalianDaysShort = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const ItalianMonthsShort = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

// Utility conversione temperatura con distinzione esplicita tra zero e dato assente
function formatTemp(val, unit = State.unit) {
  if (val === null || val === undefined) return '--';
  if (unit === 'F') {
    const f = (val * 9 / 5) + 32;
    return Math.round(f);
  }
  return Math.round(val);
}

// Utility conversione vento con distinzione tra zero e dato assente
function formatWind(kmh, unit = State.unit) {
  if (kmh === null || kmh === undefined) return { val: '--', unit: unit === 'F' ? 'mph' : 'km/h' };
  if (unit === 'F') {
    return { val: Math.round(kmh * 0.621371), unit: 'mph' };
  }
  return { val: Math.round(kmh), unit: 'km/h' };
}

// Utility conversione precipitazioni con distinzione tra zero e dato assente
function formatPrecip(mm, unit = State.unit) {
  if (mm === null || mm === undefined) return { val: '--', unit: unit === 'F' ? 'in' : 'mm' };
  if (unit === 'F') {
    return { val: (mm * 0.0393701).toFixed(2), unit: 'in' };
  }
  return { val: mm.toFixed(1), unit: 'mm' };
}

// Icone Lucide Mapping
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
  setupComboboxSearch();
  setupHistoryDefaultDates();
  setupScrollspy();
  renderQuickChips();
  applyUnitUI(State.unit);

  // Carica i dati separatamente
  loadAllSections();
});

// Setup date di default per la sezione storico (conteggio inclusivo)
function setupHistoryDefaultDates() {
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() - 2); // 2 giorni fa per consolidamento ERA5

  const start = new Date(end);
  // Conteggio inclusivo: 14 giorni significa end - 13 giorni
  start.setDate(start.getDate() - (State.historyDays - 1));

  const toISO = (d) => d.toISOString().split('T')[0];
  State.historyStartDate = toISO(start);
  State.historyEndDate = toISO(end);

  const startInput = document.getElementById('history-start-date');
  const endInput = document.getElementById('history-end-date');

  if (startInput) startInput.value = State.historyStartDate;
  if (endInput) endInput.value = State.historyEndDate;
  updateHistoryRangeBadge();
}

function updateHistoryRangeBadge() {
  const badge = document.getElementById('history-range-badge');
  if (!badge) return;
  if (State.historyStartDate && State.historyEndDate) {
    const sParts = State.historyStartDate.split('-');
    const eParts = State.historyEndDate.split('-');
    const sFormatted = `${sParts[2]} ${ItalianMonthsShort[parseInt(sParts[1]) - 1]}`;
    const eFormatted = `${eParts[2]} ${ItalianMonthsShort[parseInt(eParts[1]) - 1]}`;
    badge.textContent = `Periodo: ${sFormatted} - ${eFormatted} (${State.historyDays} gg)`;
  }
}

// Configurazione Event Listener di base
function setupEventListeners() {
  // Cambio unità °C / °F
  const btnC = document.getElementById('unit-c');
  const btnF = document.getElementById('unit-f');

  btnC.addEventListener('click', () => switchUnit('C'));
  btnF.addEventListener('click', () => switchUnit('F'));

  // Geolocalizzazione
  const geoBtn = document.getElementById('btn-geolocation');
  if (geoBtn) {
    geoBtn.addEventListener('click', requestUserLocation);
  }

  // Tasto aggiungi/rimuovi preferito
  const favBtn = document.getElementById('btn-toggle-favorite');
  if (favBtn) {
    favBtn.addEventListener('click', toggleCurrentFavorite);
  }

  // Preset Giorni Storico (7, 14, 30, 90) con calcolo inclusivo
  document.querySelectorAll('.btn-history-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const days = parseInt(btn.dataset.days);
      selectHistoryPreset(days);
    });
  });

  // Intervallo Personalizzato Storico con validazione inline
  const applyCustomBtn = document.getElementById('btn-apply-history-custom');
  if (applyCustomBtn) {
    applyCustomBtn.addEventListener('click', applyCustomHistoryDates);
  }

  const closeAlertBtn = document.getElementById('btn-close-history-alert');
  if (closeAlertBtn) {
    closeAlertBtn.addEventListener('click', () => {
      document.getElementById('history-inline-alert').classList.add('hidden');
    });
  }

  // Retry pulsanti dedicati per sezione
  const mainRetryBtn = document.getElementById('btn-main-retry');
  if (mainRetryBtn) {
    mainRetryBtn.addEventListener('click', () => loadWeatherForecast());
  }

  const airRetryBtn = document.getElementById('btn-air-retry');
  if (airRetryBtn) {
    airRetryBtn.addEventListener('click', () => loadAirQuality());
  }

  const histRetryBtn = document.getElementById('btn-history-retry');
  if (histRetryBtn) {
    histRetryBtn.addEventListener('click', () => loadHistoricalData());
  }
}

// Cambio unità di misura
function switchUnit(newUnit) {
  if (State.unit === newUnit) return;
  State.unit = newUnit;
  Storage.set('meteovision_unit', newUnit);
  applyUnitUI(newUnit);
  updateAllViews();
}

function applyUnitUI(unit) {
  const btnC = document.getElementById('unit-c');
  const btnF = document.getElementById('unit-f');
  if (unit === 'C') {
    btnC.classList.add('bg-sky-500', 'text-white');
    btnC.classList.remove('text-slate-400');
    btnC.setAttribute('aria-pressed', 'true');
    btnF.classList.remove('bg-sky-500', 'text-white');
    btnF.classList.add('text-slate-400');
    btnF.setAttribute('aria-pressed', 'false');
  } else {
    btnF.classList.add('bg-sky-500', 'text-white');
    btnF.classList.remove('text-slate-400');
    btnF.setAttribute('aria-pressed', 'true');
    btnC.classList.remove('bg-sky-500', 'text-white');
    btnC.classList.add('text-slate-400');
    btnC.setAttribute('aria-pressed', 'false');
  }
}

// Gestione Preferiti
function toggleCurrentFavorite() {
  const current = State.location;
  const isFav = isLocationFavorite(current);
  if (isFav) {
    State.favorites = State.favorites.filter(f => f.name.toLowerCase() !== current.name.toLowerCase());
  } else {
    State.favorites.push({
      name: current.name,
      label: current.label,
      latitude: current.latitude,
      longitude: current.longitude,
      timezone: current.timezone || 'auto'
    });
  }
  Storage.set('meteovision_favorites', State.favorites);
  updateFavoriteStarUI();
  renderQuickChips();
}

function isLocationFavorite(loc) {
  if (!loc || !loc.name) return false;
  return State.favorites.some(f => f.name.toLowerCase() === loc.name.toLowerCase());
}

function updateFavoriteStarUI() {
  const star = document.getElementById('fav-star-icon');
  const isFav = isLocationFavorite(State.location);
  if (star) {
    if (isFav) {
      star.classList.add('fill-amber-400', 'text-amber-400');
      star.classList.remove('text-slate-400');
    } else {
      star.classList.remove('fill-amber-400', 'text-amber-400');
      star.classList.add('text-slate-400');
    }
  }
}

// Salvataggio nelle recenti
function addToRecents(loc) {
  if (!loc || !loc.name) return;
  State.recents = State.recents.filter(r => r.name.toLowerCase() !== loc.name.toLowerCase());
  State.recents.unshift({
    name: loc.name,
    label: loc.label,
    latitude: loc.latitude,
    longitude: loc.longitude,
    timezone: loc.timezone || 'auto'
  });
  if (State.recents.length > 5) State.recents.pop();
  Storage.set('meteovision_recents', State.recents);
  renderQuickChips();
}

// Render dei chip preferiti e recenti
function renderQuickChips() {
  const dContainer = document.getElementById('quick-chips-container');
  const mContainer = document.getElementById('quick-chips-mobile-container');
  if (!dContainer && !mContainer) return;

  // Unisce preferiti e recenti senza duplicati
  const items = [];
  const namesSeen = new Set();

  State.favorites.forEach(f => {
    namesSeen.add(f.name.toLowerCase());
    items.push({ ...f, isFav: true });
  });

  State.recents.forEach(r => {
    if (!namesSeen.has(r.name.toLowerCase())) {
      namesSeen.add(r.name.toLowerCase());
      items.push({ ...r, isFav: false });
    }
  });

  // Se vuoto, mostra città predefinite
  if (items.length === 0) {
    items.push(
      { name: "Roma", label: "Roma, Lazio, IT", latitude: 41.89, longitude: 12.51, timezone: "auto", isFav: false },
      { name: "Milano", label: "Milano, Lombardia, IT", latitude: 45.46, longitude: 9.19, timezone: "auto", isFav: false },
      { name: "Napoli", label: "Napoli, Campania, IT", latitude: 40.85, longitude: 14.27, timezone: "auto", isFav: false }
    );
  }

  const renderButtons = (container) => {
    if (!container) return;
    container.innerHTML = '';
    items.slice(0, 6).forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mobile-touch-target px-2.5 py-1 text-xs rounded-xl glass-card interactive-control text-slate-200 flex items-center gap-1 shrink-0';
      
      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', item.isFav ? 'star' : 'map-pin');
      icon.className = `w-3 h-3 ${item.isFav ? 'fill-amber-400 text-amber-400' : 'text-sky-400'}`;
      
      const span = document.createElement('span');
      span.textContent = item.name;

      btn.appendChild(icon);
      btn.appendChild(span);

      btn.addEventListener('click', () => {
        selectLocation(item);
      });

      container.appendChild(btn);
    });
  };

  renderButtons(dContainer);
  renderButtons(mContainer);
  lucide.createIcons();
}

// Ricerca Città Accessibile (WAI-ARIA Combobox) con AbortController
let searchAbortCtrl = null;
let activeComboboxIndex = -1;

function setupComboboxSearch() {
  const input = document.getElementById('search-input');
  const dropdown = document.getElementById('search-dropdown');
  const clearBtn = document.getElementById('search-clear');

  let debounceTimer = null;

  input.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (val.length > 0) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
      closeDropdown();
      return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (val.length >= 2) {
        performAccessibleSearch(val);
      }
    }, 280);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.add('hidden');
    closeDropdown();
    input.focus();
  });

  // Gestione navigazione da tastiera WAI-ARIA
  input.addEventListener('keydown', (e) => {
    const options = dropdown.querySelectorAll('[role="option"]');
    if (!options.length || dropdown.classList.contains('hidden')) {
      if (e.key === 'Escape') closeDropdown();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeComboboxIndex = (activeComboboxIndex + 1) % options.length;
      updateActiveOption(options);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeComboboxIndex = (activeComboboxIndex - 1 + options.length) % options.length;
      updateActiveOption(options);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeComboboxIndex >= 0 && activeComboboxIndex < options.length) {
        options[activeComboboxIndex].click();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown();
    }
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      closeDropdown();
    }
  });
}

function updateActiveOption(options) {
  const input = document.getElementById('search-input');
  options.forEach((opt, idx) => {
    if (idx === activeComboboxIndex) {
      opt.classList.add('bg-sky-500/30', 'text-white');
      opt.setAttribute('aria-selected', 'true');
      input.setAttribute('aria-activedescendant', opt.id);
      opt.scrollIntoView({ block: 'nearest' });
    } else {
      opt.classList.remove('bg-sky-500/30', 'text-white');
      opt.setAttribute('aria-selected', 'false');
    }
  });
}

function closeDropdown() {
  const dropdown = document.getElementById('search-dropdown');
  const input = document.getElementById('search-input');
  dropdown.classList.add('hidden');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-activedescendant', '');
  activeComboboxIndex = -1;
}

async function performAccessibleSearch(query) {
  const dropdown = document.getElementById('search-dropdown');
  const input = document.getElementById('search-input');

  if (searchAbortCtrl) {
    searchAbortCtrl.abort();
  }
  searchAbortCtrl = new AbortController();

  dropdown.innerHTML = '';
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'px-4 py-3 text-xs text-slate-400 flex items-center gap-2';
  loadingDiv.textContent = `Ricerca di "${query}" in corso...`;
  dropdown.appendChild(loadingDiv);
  dropdown.classList.remove('hidden');
  input.setAttribute('aria-expanded', 'true');

  try {
    const results = await Api.searchCities(query, searchAbortCtrl.signal);
    dropdown.innerHTML = '';

    if (!results || results.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'px-4 py-3 text-xs text-slate-400';
      emptyDiv.textContent = `Nessuna località trovata per "${query}".`;
      dropdown.appendChild(emptyDiv);
      return;
    }

    activeComboboxIndex = -1;

    results.forEach((item, index) => {
      const opt = document.createElement('div');
      opt.id = `search-opt-${index}`;
      opt.setAttribute('role', 'option');
      opt.setAttribute('aria-selected', 'false');
      opt.className = 'px-4 py-3 text-xs sm:text-sm text-slate-200 hover:bg-sky-500/20 hover:text-white cursor-pointer transition-colors flex items-center justify-between border-b border-white/5 last:border-none';

      const left = document.createElement('div');
      left.className = 'flex items-center gap-2.5';

      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', 'map-pin');
      icon.className = 'w-4 h-4 text-sky-400 shrink-0';

      const textWrapper = document.createElement('div');
      const nameEl = document.createElement('div');
      nameEl.className = 'font-semibold text-white';
      nameEl.textContent = item.name;

      const labelEl = document.createElement('div');
      labelEl.className = 'text-[11px] text-slate-400';
      labelEl.textContent = item.label;

      textWrapper.appendChild(nameEl);
      textWrapper.appendChild(labelEl);
      left.appendChild(icon);
      left.appendChild(textWrapper);

      opt.appendChild(left);

      if (item.country_code) {
        const badge = document.createElement('span');
        badge.className = 'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/10 text-slate-300';
        badge.textContent = item.country_code;
        opt.appendChild(badge);
      }

      opt.addEventListener('click', () => {
        selectLocation(item);
        closeDropdown();
        input.value = '';
        document.getElementById('search-clear').classList.add('hidden');
      });

      dropdown.appendChild(opt);
    });

    lucide.createIcons();

  } catch (err) {
    if (err.name === 'AbortError') return;
    dropdown.innerHTML = '';
    const errDiv = document.createElement('div');
    errDiv.className = 'px-4 py-3 text-xs text-rose-400';
    errDiv.textContent = `Errore di ricerca: ${err.message}`;
    dropdown.appendChild(errDiv);
  }
}

// Selezione nuova località
function selectLocation(loc) {
  State.location = {
    name: loc.name,
    label: loc.label || `${loc.name}`,
    latitude: loc.latitude,
    longitude: loc.longitude,
    timezone: loc.timezone || 'auto'
  };

  Storage.set('meteovision_last_loc', State.location);
  addToRecents(State.location);
  updateFavoriteStarUI();
  loadAllSections();
}

// Geolocalizzazione utente
function requestUserLocation() {
  if (!navigator.geolocation) {
    showInlineHistoryAlert("La geolocalizzazione non è supportata dal browser.");
    return;
  }

  const geoBtn = document.getElementById('btn-geolocation');
  if (geoBtn) geoBtn.classList.add('animate-pulse');

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      if (geoBtn) geoBtn.classList.remove('animate-pulse');
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
      if (geoBtn) geoBtn.classList.remove('animate-pulse');
      console.warn("Geolocalizzazione rifiutata:", err.message);
      showInlineHistoryAlert(`Geolocalizzazione non disponibile: ${err.message}`);
    },
    { timeout: 9000, enableHighAccuracy: true }
  );
}

// Indicatore di aggiornamento non invasivo
function setUpdatingIndicator(show) {
  const ind = document.getElementById('updating-indicator');
  if (ind) {
    if (show) ind.classList.remove('-translate-y-full');
    else ind.classList.add('-translate-y-full');
  }
}

// Caricamento sezioni separate con isolamento errori
async function loadAllSections() {
  const reqId = ++State.activeRequestId;
  const isFirstLoad = !State.weather;

  const initSkeleton = document.getElementById('initial-skeleton');
  const mainError = document.getElementById('main-error-alert');
  const weatherContent = document.getElementById('weather-content');

  if (isFirstLoad) {
    initSkeleton.classList.remove('hidden');
    weatherContent.classList.add('hidden');
  } else {
    setUpdatingIndicator(true);
    weatherContent.classList.add('opacity-75');
  }
  mainError.classList.add('hidden');

  // Esegue i tre caricamenti in modo indipendente
  loadWeatherForecast(reqId);
  loadAirQuality(reqId);
  loadHistoricalData(null, null, reqId);
}

// 1. Caricamento Previsioni Meteo Principali
async function loadWeatherForecast(reqId = State.activeRequestId) {
  State.loading.weather = true;
  try {
    const data = await Api.getForecast(State.location.latitude, State.location.longitude, State.location.timezone);
    if (reqId !== State.activeRequestId) return; // Scarta risposte fuori ordine

    State.weather = data;
    State.loading.weather = false;

    // Nasconde lo skeleton iniziale e mostra il contenuto
    document.getElementById('initial-skeleton').classList.add('hidden');
    const weatherContent = document.getElementById('weather-content');
    weatherContent.classList.remove('hidden', 'opacity-75');
    setUpdatingIndicator(false);

    renderHeroCard();
    renderDailySummary();
    renderKeyMetrics();
    renderHourlyForecast();
    renderDailyForecast();

    updateFavoriteStarUI();
    lucide.createIcons();
  } catch (err) {
    if (reqId !== State.activeRequestId) return;
    State.loading.weather = false;
    setUpdatingIndicator(false);
    console.error("Errore caricamento meteo:", err);

    if (!State.weather) {
      document.getElementById('initial-skeleton').classList.add('hidden');
      document.getElementById('main-error-alert').classList.remove('hidden');
      document.getElementById('main-error-message').textContent = err.message || "Errore di connessione con il servizio meteorologico.";
    }
  }
}

// 2. Caricamento Qualità dell'Aria
async function loadAirQuality(reqId = State.activeRequestId) {
  State.loading.airQuality = true;
  const errBox = document.getElementById('air-quality-error');
  const dataBox = document.getElementById('air-quality-data-container');
  if (errBox) errBox.classList.add('hidden');
  if (dataBox) dataBox.classList.remove('hidden');

  try {
    const data = await Api.getAirQuality(State.location.latitude, State.location.longitude, State.location.timezone);
    if (reqId !== State.activeRequestId) return;

    State.airQuality = data;
    State.loading.airQuality = false;
    renderAirQualityDetails();
    lucide.createIcons();
  } catch (err) {
    if (reqId !== State.activeRequestId) return;
    State.loading.airQuality = false;
    console.warn("Qualità aria non disponibile:", err);
    if (errBox) errBox.classList.remove('hidden');
    if (dataBox) dataBox.classList.add('hidden');
  }
}

// 3. Caricamento Archivio Storico
async function loadHistoricalData(customStart = null, customEnd = null, reqId = State.activeRequestId) {
  State.loading.history = true;
  const errCard = document.getElementById('history-error-card');
  const statsBox = document.getElementById('history-stats-container');
  if (errCard) errCard.classList.add('hidden');
  if (statsBox) statsBox.classList.remove('opacity-50');

  let start = customStart || State.historyStartDate;
  let end = customEnd || State.historyEndDate;

  if (!start || !end) {
    const today = new Date();
    const eDate = new Date(today);
    eDate.setDate(eDate.getDate() - 2);
    const sDate = new Date(eDate);
    sDate.setDate(sDate.getDate() - (State.historyDays - 1));

    const toISO = (d) => d.toISOString().split('T')[0];
    start = toISO(sDate);
    end = toISO(eDate);
    State.historyStartDate = start;
    State.historyEndDate = end;
  }

  try {
    const histData = await Api.getHistoricalData(
      State.location.latitude,
      State.location.longitude,
      start,
      end,
      State.location.timezone
    );
    if (reqId !== State.activeRequestId) return;

    State.history = histData;
    State.loading.history = false;
    updateHistoryRangeBadge();
    renderHistoricalSection();
    lucide.createIcons();
  } catch (err) {
    if (reqId !== State.activeRequestId) return;
    State.loading.history = false;
    console.error("Errore caricamento storico:", err);
    if (errCard) {
      errCard.classList.remove('hidden');
      document.getElementById('history-error-msg').textContent = err.message || "Impossibile recuperare i dati archiviati di Open-Meteo per questo intervallo.";
    }
  }
}

// Selettore Preset Storico (7, 14, 30, 90)
function selectHistoryPreset(days) {
  State.historyDays = days;

  // Aggiorna stile bottoni preset
  document.querySelectorAll('.btn-history-preset').forEach(b => {
    if (parseInt(b.dataset.days) === days) {
      b.className = 'btn-history-preset mobile-touch-target px-3 py-1.5 rounded-xl bg-purple-600 text-white font-semibold shadow-sm';
    } else {
      b.className = 'btn-history-preset mobile-touch-target px-3 py-1.5 rounded-xl glass-card interactive-control text-slate-200';
    }
  });

  setupHistoryDefaultDates();
  loadHistoricalData();
}

// Validazione e applicazione date personalizzate storico
function applyCustomHistoryDates() {
  const startInput = document.getElementById('history-start-date');
  const endInput = document.getElementById('history-end-date');
  const start = startInput.value;
  const end = endInput.value;

  if (!start || !end) {
    showInlineHistoryAlert("Seleziona entrambe le date (inizio e fine).");
    return;
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (startDate > endDate) {
    showInlineHistoryAlert("La data iniziale non può essere successiva alla data finale.");
    return;
  }

  // L'archivio ERA5 Open-Meteo richiede almeno 2 giorni di ritardo per dati consolidati
  const today = new Date();
  const maxAllowed = new Date(today);
  maxAllowed.setDate(maxAllowed.getDate() - 2);

  if (endDate > maxAllowed) {
    showInlineHistoryAlert("L'archivio storico è consolidato fino a 2 giorni fa. Seleziona una data di fine valida.");
    return;
  }

  // Calcolo giorni inclusivi
  const diffDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  State.historyDays = diffDays;
  State.historyStartDate = start;
  State.historyEndDate = end;

  // Deseleziona i bottoni preset
  document.querySelectorAll('.btn-history-preset').forEach(b => {
    b.className = 'btn-history-preset mobile-touch-target px-3 py-1.5 rounded-xl glass-card interactive-control text-slate-200';
  });

  hideInlineHistoryAlert();
  updateHistoryRangeBadge();
  loadHistoricalData(start, end);
}

function showInlineHistoryAlert(msg) {
  const alert = document.getElementById('history-inline-alert');
  const text = document.getElementById('history-inline-msg');
  if (alert && text) {
    text.textContent = msg;
    alert.classList.remove('hidden');
  }
}

function hideInlineHistoryAlert() {
  const alert = document.getElementById('history-inline-alert');
  if (alert) alert.classList.add('hidden');
}

// Aggiorna l'intera interfaccia
function updateAllViews() {
  if (State.weather) {
    renderHeroCard();
    renderDailySummary();
    renderKeyMetrics();
    renderHourlyForecast();
    renderDailyForecast();
  }
  if (State.airQuality) {
    renderAirQualityDetails();
  }
  if (State.history) {
    renderHistoricalSection();
  }
  lucide.createIcons();
}

// 1. Render Hero Card
function renderHeroCard() {
  const current = State.weather?.current || {};
  const meta = current.weather_info || {};
  const dailyToday = State.weather?.daily?.[0] || {};

  document.getElementById('current-city-name').textContent = State.location.name;
  document.getElementById('current-location-label').textContent = State.location.label;

  const dayBadge = document.getElementById('current-badge-day');
  if (current.is_day) {
    dayBadge.textContent = "Giorno";
    dayBadge.className = "ml-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300";
  } else {
    dayBadge.textContent = "Notte";
    dayBadge.className = "ml-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-400/20 text-indigo-300";
  }

  document.getElementById('current-weather-desc').textContent = meta.description || 'Variabile';
  document.getElementById('current-temp').textContent = formatTemp(current.temperature);
  document.getElementById('current-temp-unit').textContent = `°${State.unit}`;
  document.getElementById('current-apparent-temp').textContent = `${formatTemp(current.apparent_temperature)}°${State.unit}`;

  document.getElementById('current-temp-max').textContent = `${formatTemp(dailyToday.temp_max)}°`;
  document.getElementById('current-temp-min').textContent = `${formatTemp(dailyToday.temp_min)}°`;

  // Orario di riferimento del dato
  if (current.time) {
    const timeParts = current.time.split('T')[1]?.substring(0, 5) || current.time;
    document.getElementById('current-updated-time').textContent = `${timeParts} (fuso locale)`;
  } else {
    document.getElementById('current-updated-time').textContent = '--:--';
  }

  // Icona meteo
  const iconEl = document.getElementById('current-weather-icon');
  iconEl.setAttribute('data-lucide', getLucideIconName(meta.icon));

  // Dynamic Background Gradient
  const bg = document.getElementById('weather-bg');
  const grad = meta.bg_gradient || "from-slate-900 via-indigo-950 to-slate-950";
  bg.className = `fixed inset-0 pointer-events-none -z-10 bg-gradient-to-br ${grad} opacity-90 transition-all duration-1000`;
}

// 2. Generatore Sintesi Giornaliera Testuale Intelligente
function renderDailySummary() {
  const container = document.getElementById('section-summary');
  const textEl = document.getElementById('summary-text');
  if (!container || !textEl) return;

  const w = State.weather;
  if (!w || !w.daily || !w.daily[0]) {
    container.classList.add('hidden');
    return;
  }

  const today = w.daily[0];
  const hourly = w.hourly || [];
  const meta = today.weather_info || {};

  const sentences = [];

  // Condizione principale
  sentences.push(`Oggi a ${State.location.name} si prevede ${meta.description.toLowerCase()}.`);

  // Precipitazioni
  const pProb = today.precipitation_probability_max;
  const pSum = today.precipitation_sum;

  if (pProb !== null && pProb > 40) {
    if (pSum > 2) {
      sentences.push(`Possibili piogge con probabilità del ${pProb}% e accumulo stimato di circa ${pSum.toFixed(1)} mm.`);
    } else {
      sentences.push(`Possibilità di brevi rovesci isolati (probabilità ${pProb}%).`);
    }
  } else if (pProb !== null && pProb <= 20) {
    sentences.push(`Precipitazioni molto poco probabili nel corso della giornata.`);
  }

  // Vento
  const wMax = today.wind_speed_max;
  if (wMax !== null && wMax >= 30) {
    sentences.push(`Attenzione a venti sostenuti con raffiche che potranno toccare i ${Math.round(wMax)} km/h.`);
  }

  // Temperatura
  if (today.temp_max !== null && today.temp_min !== null) {
    sentences.push(`Temperature comprese tra ${formatTemp(today.temp_min)}°${State.unit} e ${formatTemp(today.temp_max)}°${State.unit}.`);
  }

  textEl.textContent = sentences.join(' ');
  container.classList.remove('hidden');
}

// 3. Render Metriche Chiave
function renderKeyMetrics() {
  const current = State.weather?.current || {};
  const dailyToday = State.weather?.daily?.[0] || {};

  // Precipitazioni
  const pFormatted = formatPrecip(current.precipitation);
  document.getElementById('metric-precip-value').textContent = pFormatted.val;
  document.getElementById('metric-precip-unit').textContent = pFormatted.unit;

  const prob = dailyToday.precipitation_probability_max;
  const probVal = prob !== null && prob !== undefined ? `${prob}%` : '--';
  document.getElementById('metric-precip-prob').textContent = probVal;
  document.getElementById('metric-precip-bar').style.width = prob !== null ? `${Math.min(prob, 100)}%` : '0%';

  // Vento
  const wFormatted = formatWind(current.wind_speed);
  const gFormatted = formatWind(current.wind_gusts);
  document.getElementById('metric-wind-speed').textContent = wFormatted.val;
  document.getElementById('metric-wind-unit').textContent = wFormatted.unit;
  document.getElementById('metric-wind-gusts').textContent = `${gFormatted.val} ${gFormatted.unit}`;

  const dirLabel = current.wind_direction_label || '-';
  const deg = current.wind_direction !== undefined && current.wind_direction !== null ? current.wind_direction : null;
  document.getElementById('metric-wind-direction').textContent = deg !== null ? `${dirLabel} (${deg}°)` : '--';

  const needle = document.getElementById('compass-needle');
  if (needle) {
    needle.style.transform = deg !== null ? `rotate(${deg}deg)` : 'rotate(0deg)';
  }

  // Parametri Atmosferici
  document.getElementById('metric-humidity').textContent = current.humidity !== undefined && current.humidity !== null ? `${current.humidity}%` : '--%';
  document.getElementById('metric-pressure').textContent = current.pressure ? `${Math.round(current.pressure)} hPa` : '-- hPa';

  const uv = dailyToday.uv_index_max !== undefined ? dailyToday.uv_index_max : null;
  document.getElementById('metric-uv').textContent = uv !== null ? Math.round(uv) : '--';
  document.getElementById('metric-clouds').textContent = current.cloud_cover !== undefined && current.cloud_cover !== null ? `${current.cloud_cover}%` : '--%';

  let uvDesc = 'Non disponibile';
  if (uv !== null) {
    if (uv <= 2) uvDesc = 'Basso';
    else if (uv <= 5) uvDesc = 'Moderato';
    else if (uv <= 7) uvDesc = 'Alto';
    else if (uv <= 10) uvDesc = 'Molto Alto';
    else uvDesc = 'Estremo (Protezione max)';
  }
  document.getElementById('metric-uv-desc').textContent = uvDesc;
}

// 4. Render Previsioni Orarie
function renderHourlyForecast() {
  const container = document.getElementById('hourly-container');
  const hourly = State.weather?.hourly || [];

  if (hourly.length === 0) {
    container.innerHTML = `<div class="text-xs text-slate-400 p-4">Previsioni orarie non disponibili.</div>`;
    return;
  }

  container.innerHTML = hourly.map((item, idx) => {
    const timeStr = item.time ? item.time.split('T')[1]?.substring(0, 5) : '--:--';
    const isNow = idx === 0;
    const meta = item.weather_info || {};
    const iconName = getLucideIconName(meta.icon);
    const pProb = item.precipitation_probability !== null && item.precipitation_probability !== undefined ? `${item.precipitation_probability}%` : '--';

    return `
      <div class="snap-start shrink-0 w-20 sm:w-24 p-3 rounded-2xl glass-card flex flex-col items-center justify-between text-center ${isNow ? 'border-sky-400/50 bg-sky-500/15' : ''}">
        <span class="text-xs font-semibold ${isNow ? 'text-sky-300' : 'text-slate-300'}">
          ${isNow ? 'Adesso' : timeStr}
        </span>
        <div class="my-2 p-1.5 rounded-xl bg-white/5">
          <i data-lucide="${iconName}" class="w-6 h-6 text-sky-400" aria-hidden="true"></i>
        </div>
        <div class="text-sm sm:text-base font-bold text-white">
          ${formatTemp(item.temperature)}°
        </div>
        <div class="text-[11px] text-sky-300 flex items-center gap-0.5 mt-1 font-medium" title="Probabilità precipitazioni">
          <i data-lucide="droplet" class="w-2.5 h-2.5" aria-hidden="true"></i>
          <span>${pProb}</span>
        </div>
      </div>
    `;
  }).join('');
}

// 5. Render Previsioni 7 Giorni
function renderDailyForecast() {
  const container = document.getElementById('daily-container');
  const daily = State.weather?.daily || [];

  if (daily.length === 0) {
    container.innerHTML = `<div class="text-xs text-slate-400 p-4">Previsioni settimanali non disponibili.</div>`;
    return;
  }

  const allMins = daily.map(d => d.temp_min).filter(v => v !== null);
  const allMaxs = daily.map(d => d.temp_max).filter(v => v !== null);
  const globalMin = allMins.length ? Math.min(...allMins) : 0;
  const globalMax = allMaxs.length ? Math.max(...allMaxs) : 30;
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
    const pProb = item.precipitation_probability_max;

    const minPercent = item.temp_min !== null ? ((item.temp_min - globalMin) / range) * 100 : 0;
    const maxPercent = item.temp_max !== null ? ((item.temp_max - globalMin) / range) * 100 : 100;
    const barWidth = Math.max(maxPercent - minPercent, 8);

    return `
      <div class="py-3 sm:py-3.5 flex items-center justify-between gap-3 text-xs sm:text-sm">
        
        <!-- Giorno e Data -->
        <div class="w-24 sm:w-28 shrink-0">
          <div class="font-bold text-white ${idx === 0 ? 'text-sky-300' : ''}">${dayLabel}</div>
          <div class="text-[11px] text-slate-400">${dateFormatted}</div>
        </div>

        <!-- Condizione & Icona -->
        <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div class="p-1.5 rounded-lg bg-white/5 shrink-0">
            <i data-lucide="${iconName}" class="w-5 h-5 text-sky-400" aria-hidden="true"></i>
          </div>
          <div class="truncate text-slate-300 hidden md:block text-xs">
            ${meta.description}
          </div>
          ${pProb !== null && pProb > 15 ? `
            <span class="text-xs font-semibold text-sky-400 flex items-center gap-0.5 ml-auto sm:ml-0" title="Probabilità di pioggia">
              <i data-lucide="droplet" class="w-3 h-3" aria-hidden="true"></i> ${pProb}%
            </span>
          ` : ''}
        </div>

        <!-- Range Termico e Barra Gradiente -->
        <div class="flex items-center gap-3 shrink-0">
          <span class="w-8 text-right font-medium text-sky-400 text-xs sm:text-sm">
            ${formatTemp(item.temp_min)}°
          </span>

          <div class="hidden sm:block w-24 sm:w-32 bg-white/10 h-2 rounded-full relative overflow-hidden" aria-hidden="true">
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

// 6. Render Dettaglio Qualità dell'Aria (EAQI & Copernicus)
function renderAirQualityDetails() {
  const curr = State.airQuality?.current;
  if (!curr) return;

  const rating = curr.rating || {};
  const valEl = document.getElementById('metric-aqi-value');
  const badgeEl = document.getElementById('metric-aqi-badge');
  const usEl = document.getElementById('metric-aqi-us');

  if (curr.european_aqi !== null && curr.european_aqi !== undefined) {
    valEl.textContent = Math.round(curr.european_aqi);
    badgeEl.textContent = rating.label || 'Buona';
    badgeEl.className = `text-xs font-bold px-2 py-0.5 rounded-full ${rating.bg || 'bg-emerald-500/20'} ${rating.color || 'text-emerald-300'} border ${rating.border || 'border-emerald-500/30'}`;
    usEl.textContent = curr.us_aqi ? `US AQI: ${Math.round(curr.us_aqi)}` : 'US AQI: --';
  } else {
    valEl.textContent = '--';
    badgeEl.textContent = 'Non disponibile';
    badgeEl.className = 'text-xs font-bold px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30';
    usEl.textContent = 'US AQI: --';
  }

  // Mini summary
  document.getElementById('metric-pm25').textContent = curr.pm2_5 !== null && curr.pm2_5 !== undefined ? `${Math.round(curr.pm2_5)} µg/m³` : '--';
  document.getElementById('metric-pm10').textContent = curr.pm10 !== null && curr.pm10 !== undefined ? `${Math.round(curr.pm10)} µg/m³` : '--';

  // Configurazione soglie EAQI ufficiali: [valore, sogliaMax, unita]
  const setPollutantBar = (id, val, maxLimit, unitStr = 'µg/m³') => {
    const valElem = document.getElementById(`pollutant-${id}`);
    const barElem = document.getElementById(`pollutant-${id}-bar`);
    if (!valElem || !barElem) return;

    if (val !== null && val !== undefined) {
      valElem.textContent = `${Math.round(val * 10) / 10} ${unitStr}`;
      const pct = Math.min((val / maxLimit) * 100, 100);
      barElem.style.width = `${Math.max(pct, 4)}%`;

      // Ricalcolo colore semantico da zero a ogni render
      if (pct > 80) barElem.className = 'bg-rose-500 h-2 rounded-full transition-all duration-500';
      else if (pct > 50) barElem.className = 'bg-amber-400 h-2 rounded-full transition-all duration-500';
      else if (pct > 25) barElem.className = 'bg-yellow-400 h-2 rounded-full transition-all duration-500';
      else barElem.className = 'bg-emerald-400 h-2 rounded-full transition-all duration-500';
    } else {
      valElem.textContent = 'Non disponibile';
      barElem.style.width = '0%';
      barElem.className = 'bg-slate-600 h-2 rounded-full';
    }
  };

  setPollutantBar('pm25', curr.pm2_5, 50);
  setPollutantBar('pm10', curr.pm10, 90);
  setPollutantBar('no2', curr.nitrogen_dioxide, 120);
  setPollutantBar('o3', curr.ozone, 140);
  setPollutantBar('so2', curr.sulphur_dioxide, 150);
  setPollutantBar('co', curr.carbon_monoxide, 1000);
}

// 7. Render Sezione Storico
function renderHistoricalSection() {
  const hist = State.history;
  if (!hist || !hist.daily || hist.daily.length === 0) return;

  const records = hist.daily;

  let maxTemp = -Infinity;
  let maxTempDate = '';
  let maxWind = -Infinity;
  let maxWindDate = '';

  records.forEach(r => {
    if (r.temp_max !== null && r.temp_max !== undefined && r.temp_max > maxTemp) {
      maxTemp = r.temp_max;
      maxTempDate = r.date;
    }
    if (r.wind_speed_max !== null && r.wind_speed_max !== undefined && r.wind_speed_max > maxWind) {
      maxWind = r.wind_speed_max;
      maxWindDate = r.date;
    }
  });

  const formatDateLabel = (d) => {
    if (!d) return '--';
    const parts = d.split('-');
    return `${parts[2]} ${ItalianMonthsShort[parseInt(parts[1]) - 1]}`;
  };

  // Stat Cards con unità coerente
  document.getElementById('hist-stat-avg-temp').textContent = formatTemp(hist.average_temperature);
  document.getElementById('hist-unit-temp').textContent = `°${State.unit}`;

  const pTot = formatPrecip(hist.total_precipitation);
  document.getElementById('hist-stat-total-precip').textContent = pTot.val;
  document.getElementById('hist-unit-precip').textContent = pTot.unit; // Corretta unità in pollici o mm!

  document.getElementById('hist-stat-max-temp').textContent = maxTemp !== -Infinity ? formatTemp(maxTemp) : '--';
  document.getElementById('hist-unit-max').textContent = `°${State.unit}`;
  document.getElementById('hist-stat-max-date').textContent = maxTempDate ? `Picco il ${formatDateLabel(maxTempDate)}` : '--';

  const wMax = maxWind !== -Infinity ? formatWind(maxWind) : { val: '--', unit: State.unit === 'F' ? 'mph' : 'km/h' };
  document.getElementById('hist-stat-max-wind').textContent = wMax.val;
  document.getElementById('hist-unit-wind').textContent = wMax.unit;
  document.getElementById('hist-stat-wind-date').textContent = maxWindDate ? `Picco il ${formatDateLabel(maxWindDate)}` : '--';

  // Render grafici Chart.js
  Charts.renderTemperatureHistory('chart-temp-history', records, State.unit === 'F');
  Charts.renderPrecipitationWindHistory('chart-precip-wind-history', records, State.unit === 'F');
}

// Sincronizzazione Navigazione Mobile con IntersectionObserver (Scrollspy)
function setupScrollspy() {
  const sections = [
    { id: 'section-current', linkText: 'Attuale' },
    { id: 'section-hourly', linkText: '24 Ore' },
    { id: 'section-daily', linkText: '7 Giorni' },
    { id: 'section-details', linkText: 'Dettagli' },
    { id: 'section-air', linkText: 'Aria' },
    { id: 'section-history', linkText: 'Storico' }
  ];

  const links = document.querySelectorAll('.mobile-nav-link');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const targetId = entry.target.id;
        links.forEach(l => {
          const href = l.getAttribute('href')?.replace('#', '');
          if (href === targetId) {
            l.className = 'mobile-nav-link py-1 text-sky-400 border-b-2 border-sky-400 font-bold';
          } else {
            l.className = 'mobile-nav-link py-1 hover:text-white text-slate-400';
          }
        });
      }
    });
  }, {
    rootMargin: '-20% 0px -60% 0px',
    threshold: 0
  });

  sections.forEach(s => {
    const el = document.getElementById(s.id);
    if (el) observer.observe(el);
  });
}
