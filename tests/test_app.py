import sys
import os
import unittest

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

    def test_health(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "app": "MeteoVision"})

    def test_index_html(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("MeteoVision", response.text)
        self.assertIn("Previsioni Meteo", response.text)

    def test_static_files(self):
        res_css = self.client.get("/static/css/style.css")
        self.assertEqual(res_css.status_code, 200)
        res_js = self.client.get("/static/js/app.js")
        self.assertEqual(res_js.status_code, 200)

    def test_weather_codes(self):
        info_sun = get_weather_info(0, is_day=1)
        self.assertEqual(info_sun["description"], "Cielo sereno")
        self.assertEqual(info_sun["icon"], "sun")
        self.assertTrue(info_sun["is_day"])

        info_rain = get_weather_info(61, is_day=0)
        self.assertIn("Pioggia", info_rain["description"])
        self.assertEqual(info_rain["icon"], "cloud-rain")

    def test_aqi_level(self):
        aqi_good = get_aqi_level(15)
        self.assertEqual(aqi_good["label"], "Eccellente")
        aqi_mod = get_aqi_level(50)
        self.assertEqual(aqi_mod["label"], "Moderata")

    def test_wind_direction(self):
        self.assertEqual(get_wind_direction_label(0), "N")
        self.assertEqual(get_wind_direction_label(90), "E")
        self.assertEqual(get_wind_direction_label(180), "S")
        self.assertEqual(get_wind_direction_label(270), "W")

if __name__ == "__main__":
    unittest.main()
