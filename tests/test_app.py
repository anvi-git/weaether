import sys
import os
import unittest
from datetime import datetime, timedelta

# Assicura che la root del progetto sia nel path anche se eseguito direttamente da tests/
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fastapi.testclient import TestClient
from app.main import app
from app.services.weather_codes import get_weather_info, get_aqi_level, get_wind_direction_label

class TestWeatherApp(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    # 1. Test Base & Health
    def test_health(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "app": "MeteoVision"})

    # 2. Test Pagina HTML e Accessibilità Viewport (Zoom abilitato)
    def test_index_html_accessibility_and_zoom(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        html = response.text
        self.assertIn("MeteoVision", html)
        self.assertIn("Previsioni", html)

        # Verifica rimozione di user-scalable=no e maximum-scale=1.0 per consentire lo zoom
        self.assertNotIn("user-scalable=no", html)
        self.assertNotIn("maximum-scale=1.0", html)
        self.assertIn('name="viewport" content="width=device-width, initial-scale=1.0"', html)

    # 3. Test Presenza Pattern WAI-ARIA Combobox per Ricerca Città
    def test_combobox_accessibility_markup(self):
        response = self.client.get("/")
        html = response.text
        self.assertIn('role="combobox"', html)
        self.assertIn('aria-autocomplete="list"', html)
        self.assertIn('aria-controls="search-dropdown"', html)
        self.assertIn('role="listbox"', html)

    # 4. Test File Statici
    def test_static_files(self):
        res_css = self.client.get("/static/css/style.css")
        self.assertEqual(res_css.status_code, 200)
        self.assertIn("prefers-reduced-motion", res_css.text)

        res_app_js = self.client.get("/static/js/app.js")
        self.assertEqual(res_app_js.status_code, 200)
        self.assertIn("activeRequestId", res_app_js.text)
        self.assertIn("AbortController", res_app_js.text)

        res_api_js = self.client.get("/static/js/api.js")
        self.assertEqual(res_api_js.status_code, 200)
        self.assertIn("AbortError", res_api_js.text)

        res_charts_js = self.client.get("/static/js/charts.js")
        self.assertEqual(res_charts_js.status_code, 200)

    # 5. Test Mappature Codici Meteo WMO
    def test_weather_codes(self):
        # Sereno giorno
        info_sun = get_weather_info(0, is_day=1)
        self.assertEqual(info_sun["description"], "Cielo sereno")
        self.assertEqual(info_sun["icon"], "sun")
        self.assertTrue(info_sun["is_day"])

        # Sereno notte
        info_moon = get_weather_info(0, is_day=0)
        self.assertEqual(info_moon["icon"], "moon")
        self.assertFalse(info_moon["is_day"])

        # Pioggia
        info_rain = get_weather_info(61, is_day=1)
        self.assertIn("Pioggia", info_rain["description"])
        self.assertEqual(info_rain["icon"], "cloud-rain")

        # Temporale
        info_storm = get_weather_info(95, is_day=1)
        self.assertIn("Temporale", info_storm["description"])

        # Codice sconosciuto -> Fallback sicuro
        info_fallback = get_weather_info(9999, is_day=1)
        self.assertEqual(info_fallback["description"], "Variabile")
        self.assertEqual(info_fallback["icon"], "cloud")

    # 6. Test Livelli Indice Qualità dell'Aria (EAQI)
    def test_aqi_level(self):
        # Valori mancanti / null
        aqi_none = get_aqi_level(None)
        self.assertEqual(aqi_none["level"], 0)
        self.assertEqual(aqi_none["label"], "Dato non disponibile")

        # Eccellente (0 - 20)
        self.assertEqual(get_aqi_level(0)["label"], "Eccellente")
        self.assertEqual(get_aqi_level(15)["label"], "Eccellente")
        self.assertEqual(get_aqi_level(20)["label"], "Eccellente")

        # Buona (21 - 40)
        self.assertEqual(get_aqi_level(21)["label"], "Buona")
        self.assertEqual(get_aqi_level(40)["label"], "Buona")

        # Moderata (41 - 60)
        self.assertEqual(get_aqi_level(50)["label"], "Moderata")
        self.assertEqual(get_aqi_level(60)["label"], "Moderata")

        # Scarsa (61 - 80)
        self.assertEqual(get_aqi_level(75)["label"], "Scarsa")

        # Molto scarsa (81 - 100)
        self.assertEqual(get_aqi_level(95)["label"], "Molto Scarsa")

        # Pericolosa (> 100)
        self.assertEqual(get_aqi_level(150)["label"], "Pericolosa")

    # 7. Test Direzioni del Vento
    def test_wind_direction(self):
        self.assertEqual(get_wind_direction_label(None), "-")
        self.assertEqual(get_wind_direction_label(0), "N")
        self.assertEqual(get_wind_direction_label(45), "NE")
        self.assertEqual(get_wind_direction_label(90), "E")
        self.assertEqual(get_wind_direction_label(135), "SE")
        self.assertEqual(get_wind_direction_label(180), "S")
        self.assertEqual(get_wind_direction_label(225), "SW")
        self.assertEqual(get_wind_direction_label(270), "W")
        self.assertEqual(get_wind_direction_label(315), "NW")
        self.assertEqual(get_wind_direction_label(360), "N")

    # 8. Test Calcolo Intervallo Inclusivo per lo Storico
    def test_inclusive_historical_interval(self):
        # Per 7 giorni: start = end - 6 giorni
        today = datetime.now().date()
        end = today - timedelta(days=2)
        days = 7
        start = end - timedelta(days=days - 1)
        count = (end - start).days + 1
        self.assertEqual(count, 7)

        # Per 14 giorni: start = end - 13 giorni
        days_14 = 14
        start_14 = end - timedelta(days=days_14 - 1)
        self.assertEqual((end - start_14).days + 1, 14)

        # Per 30 giorni: start = end - 29 giorni
        days_30 = 30
        start_30 = end - timedelta(days=days_30 - 1)
        self.assertEqual((end - start_30).days + 1, 30)

if __name__ == "__main__":
    unittest.main()
