# 🌤️ MeteoVision - Previsioni Meteo, Qualità dell'Aria & Dati Storici

**MeteoVision** è un'applicazione web moderna e reattiva sviluppata in **Python (FastAPI)**, progettata per offrire un'esperienza fluida sia su schermi desktop (PC/Mac) sia su dispositivi mobili (smartphone e tablet).

Utilizza le API aperte e gratuite di **Open-Meteo** (nessuna API key richiesta) per fornire previsioni in tempo reale, dati sulla qualità dell'aria (Copernicus) e l'archivio storico meteorologico.

---

## 📱 Funzionalità Principali

1. **Layout Adattivo e Reattivo (PC & Smartphone)**:
   - **Desktop**: Dashboard a griglia con card affiancate, grafici ad alta risoluzione e navigazione rapida.
   - **Smartphone**: Layout verticale a scorrimento, barra di ancoraggio rapida (*Attuale, 24 Ore, 7 Giorni, Aria, Storico*), carosello orario touch-friendly con snap orizzontale.
   - Design con effetto *Glassmorphism* e sfondi dinamici che cambiano gradiente a seconda delle condizioni atmosferiche (sereno, pioggia, nuvoloso, notte, temporale).

2. **Dati Meteorologici Completi**:
   - **Temperatura**: Attuale, percepita, minime e massime giornaliere.
   - **Precipitazioni**: Pioggia in tempo reale (mm o pollici), probabilità (%) di precipitazioni per la giornata e per ogni ora.
   - **Vento**: Velocità media, raffiche massime, bussola grafica interattiva con orientamento dell'ago e direzione cardinale (N, NE, E, etc.).
   - **Parametri Atmosferici**: Umidità relativa, pressione barometrica (hPa), percentuale di copertura nuvolosa e indice UV con raccomandazioni per l'esposizione.

3. **Qualità dell'Aria (Air Quality - EAQI)**:
   - Indice europeo di qualità dell'aria (EAQI) e indice US AQI con badge di valutazione (*Eccellente, Buona, Moderata, Scarsa, Molto Scarsa*).
   - Analisi dettagliata dei principali inquinanti atmosferici:
     - **PM2.5** (Particolato fine)
     - **PM10** (Particolato inalabile)
     - **NO₂** (Biossido di azoto)
     - **O₃** (Ozono troposferico)
     - **SO₂** (Biossido di zolfo)

4. **Archivio Dati Storici con Grafici Interattivi**:
   - Analisi del meteo passato per qualsiasi città selezionata.
   - Selettore rapido periodo: **7 giorni**, **14 giorni**, **30 giorni**, **3 mesi**, oppure **intervallo date personalizzato**.
   - Statistiche aggregate: Temperatura media del periodo, pioggia totale cumulata, giorno con temperatura record e picco massimo di vento.
   - Due grafici interattivi powered by **Chart.js**:
     - *Escursione Termica*: Andamento delle temperature massime, minime e medie con sfumature traslucide.
     - *Precipitazioni & Vento*: Barre delle piogge cumulate (mm) e curva della velocità del vento (km/h).

5. **Ricerca Località & Geolocalizzazione**:
   - Ricerca live con completamento automatico di qualsiasi comune o città mondiale.
   - Pulsante **"Mia Posizione"** che sfrutta il GPS del browser (HTML5 Geolocation) con reverse geocoding automatico.
   - Chip di accesso rapido per le principali città italiane ed estere.
   - Toggle istantaneo unità di misura: **°C / °F**, **km/h / mph**, **mm / in**.

---

## 🚀 Requisiti e Installazione

### 1. Prerequisiti
- Python 3.10 o superiore.

### 2. Configurazione Ambiente
Se non hai ancora attivato l'ambiente virtuale:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## 💻 Come Avviare l'Applicazione

### Avvio Rapido:
Esegui lo script:
```bash
python run.py
```
Oppure direttamente con Uvicorn:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

L'applicazione sarà attiva su:
👉 **[http://localhost:8000](http://localhost:8000)**

---

## 📱 Come Usarla da Smartphone

Poiché il server è avviato con `--host 0.0.0.0`, è accessibile da qualsiasi smartphone connesso alla stessa rete locale (Wi-Fi):

1. **Trova l'indirizzo IP del tuo computer**:
   - Su **macOS**: `ipconfig getifaddr en0` (oppure in *Impostazioni di Sistema* > *Rete* > *Wi-Fi*).
   - Su **Linux**: `hostname -I`
   - Su **Windows**: `ipconfig` (guarda *Indirizzo IPv4*).
2. **Apri il browser dello smartphone** (Safari, Chrome, Firefox) e digita:
   ```text
   http://<INDIRIZZO-IP-DEL-TUO-PC>:8000
   ```
   *Esempio: `http://192.168.1.50:8000`*

L'interfaccia si adatterà istantaneamente allo schermo dello smartphone, con controlli touch, carosello orario a scorrimento orizzontale e pulsanti a portata di pollice.

---

## 📁 Struttura del Progetto

```text
weather_app/
├── app/
│   ├── __init__.py
│   ├── main.py              # Inizializzazione FastAPI, CORS, rotte e statici
│   ├── api/
│   │   ├── __init__.py
│   │   ├── weather.py       # Endpoint API previsioni, qualità aria, archivio
│   │   └── geocoding.py     # Endpoint API ricerca città
│   ├── services/
│   │   ├── __init__.py
│   │   ├── open_meteo.py    # Client API Open-Meteo asincrono (httpx)
│   │   └── weather_codes.py # Mappatura codici WMO, icone, colori e descrizioni
│   └── static/
│       ├── index.html       # Interfaccia grafica reattiva HTML5 + Tailwind CSS
│       ├── css/
│       │   └── style.css    # Effetti glassmorphism, scrollbar e animazioni
│       └── js/
│           ├── api.js       # Client API frontend con fallback automatico
│           ├── charts.js    # Configurazione grafici interattivi Chart.js
│           └── app.js       # Logica applicativa, state management ed eventi UI
├── tests/
│   └── test_app.py          # Suite di test unitari e di integrazione
├── requirements.txt         # Dipendenze Python
├── run.py                   # Runner principale dell'applicazione
└── README.md                # Documentazione del progetto
```

---

## 🧪 Esecuzione dei Test

Per eseguire i test dell'applicazione:
```bash
python -m unittest tests/test_app.py
```
Tutti i test verificheranno il caricamento dell'interfaccia web, i file statici, il mapping dei codici meteo WMO, la corretta stima degli indici di qualità dell'aria (AQI) e il calcolo delle direzioni del vento.

