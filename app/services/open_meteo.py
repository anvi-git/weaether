import httpx
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from app.services.weather_codes import get_weather_info, get_aqi_level, get_wind_direction_label

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"

TIMEOUT = 10.0


async def search_cities(query: str, count: int = 6) -> List[Dict[str, Any]]:
    """Cerca città o luoghi per nome usando Open-Meteo Geocoding."""
    params = {
        "name": query,
        "count": count,
        "language": "it",
        "format": "json"
    }
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(GEOCODING_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        
        formatted = []
        for item in results:
            country = item.get("country", "")
            admin1 = item.get("admin1", "")
            name = item.get("name", "")
            subtext_parts = [p for p in [admin1, country] if p]
            formatted.append({
                "id": item.get("id"),
                "name": name,
                "label": f"{name}{', ' + ', '.join(subtext_parts) if subtext_parts else ''}",
                "latitude": item.get("latitude"),
                "longitude": item.get("longitude"),
                "country": country,
                "country_code": item.get("country_code", ""),
                "admin1": admin1,
                "timezone": item.get("timezone", "auto"),
                "elevation": item.get("elevation")
            })
        return formatted


async def get_weather_forecast(latitude: float, longitude: float, timezone: str = "auto") -> Dict[str, Any]:
    """Recupera meteo attuale, previsioni orarie (prossime 24-48h) e giornaliere (7 giorni)."""
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "timezone": timezone,
        "current": [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "is_day",
            "precipitation",
            "rain",
            "showers",
            "snowfall",
            "weather_code",
            "cloud_cover",
            "pressure_msl",
            "surface_pressure",
            "wind_speed_10m",
            "wind_direction_10m",
            "wind_gusts_10m"
        ],
        "hourly": [
            "temperature_2m",
            "relative_humidity_2m",
            "precipitation_probability",
            "precipitation",
            "weather_code",
            "wind_speed_10m",
            "wind_direction_10m",
            "uv_index",
            "is_day"
        ],
        "daily": [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "apparent_temperature_max",
            "apparent_temperature_min",
            "sunrise",
            "sunset",
            "uv_index_max",
            "precipitation_sum",
            "precipitation_probability_max",
            "wind_speed_10m_max",
            "wind_gusts_10m_max",
            "wind_direction_10m_dominant"
        ]
    }
    
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(FORECAST_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    current_raw = data.get("current", {})
    weather_code = current_raw.get("weather_code", 0)
    is_day = current_raw.get("is_day", 1)
    weather_meta = get_weather_info(weather_code, is_day)

    current_data = {
        "time": current_raw.get("time"),
        "temperature": current_raw.get("temperature_2m"),
        "apparent_temperature": current_raw.get("apparent_temperature"),
        "humidity": current_raw.get("relative_humidity_2m"),
        "precipitation": current_raw.get("precipitation", 0.0),
        "rain": current_raw.get("rain", 0.0),
        "snowfall": current_raw.get("snowfall", 0.0),
        "weather_code": weather_code,
        "weather_info": weather_meta,
        "cloud_cover": current_raw.get("cloud_cover"),
        "pressure": current_raw.get("pressure_msl") or current_raw.get("surface_pressure"),
        "wind_speed": current_raw.get("wind_speed_10m"),
        "wind_direction": current_raw.get("wind_direction_10m"),
        "wind_direction_label": get_wind_direction_label(current_raw.get("wind_direction_10m")),
        "wind_gusts": current_raw.get("wind_gusts_10m")
    }

    # Process hourly (next 24 hours from now)
    hourly_raw = data.get("hourly", {})
    hourly_times = hourly_raw.get("time", [])
    now_iso = current_raw.get("time", "")
    
    start_idx = 0
    if now_iso and hourly_times:
        # Trova l'ora più vicina
        for idx, t in enumerate(hourly_times):
            if t >= now_iso:
                start_idx = idx
                break
    
    hourly_list = []
    # Prendiamo le successive 24 ore
    end_idx = min(start_idx + 24, len(hourly_times))
    for i in range(start_idx, end_idx):
        h_code = hourly_raw.get("weather_code", [])[i] if i < len(hourly_raw.get("weather_code", [])) else 0
        h_is_day = hourly_raw.get("is_day", [])[i] if i < len(hourly_raw.get("is_day", [])) else 1
        h_meta = get_weather_info(h_code, h_is_day)
        
        hourly_list.append({
            "time": hourly_times[i],
            "temperature": hourly_raw.get("temperature_2m", [])[i] if i < len(hourly_raw.get("temperature_2m", [])) else None,
            "humidity": hourly_raw.get("relative_humidity_2m", [])[i] if i < len(hourly_raw.get("relative_humidity_2m", [])) else None,
            "precipitation_probability": hourly_raw.get("precipitation_probability", [])[i] if i < len(hourly_raw.get("precipitation_probability", [])) else 0,
            "precipitation": hourly_raw.get("precipitation", [])[i] if i < len(hourly_raw.get("precipitation", [])) else 0.0,
            "wind_speed": hourly_raw.get("wind_speed_10m", [])[i] if i < len(hourly_raw.get("wind_speed_10m", [])) else None,
            "uv_index": hourly_raw.get("uv_index", [])[i] if i < len(hourly_raw.get("uv_index", [])) else None,
            "weather_info": h_meta
        })

    # Process daily (7 days)
    daily_raw = data.get("daily", {})
    daily_times = daily_raw.get("time", [])
    daily_list = []
    for i in range(len(daily_times)):
        d_code = daily_raw.get("weather_code", [])[i] if i < len(daily_raw.get("weather_code", [])) else 0
        d_meta = get_weather_info(d_code, 1)
        
        daily_list.append({
            "date": daily_times[i],
            "weather_info": d_meta,
            "temp_max": daily_raw.get("temperature_2m_max", [])[i] if i < len(daily_raw.get("temperature_2m_max", [])) else None,
            "temp_min": daily_raw.get("temperature_2m_min", [])[i] if i < len(daily_raw.get("temperature_2m_min", [])) else None,
            "apparent_temp_max": daily_raw.get("apparent_temperature_max", [])[i] if i < len(daily_raw.get("apparent_temperature_max", [])) else None,
            "apparent_temp_min": daily_raw.get("apparent_temperature_min", [])[i] if i < len(daily_raw.get("apparent_temperature_min", [])) else None,
            "sunrise": daily_raw.get("sunrise", [])[i] if i < len(daily_raw.get("sunrise", [])) else None,
            "sunset": daily_raw.get("sunset", [])[i] if i < len(daily_raw.get("sunset", [])) else None,
            "uv_index_max": daily_raw.get("uv_index_max", [])[i] if i < len(daily_raw.get("uv_index_max", [])) else None,
            "precipitation_sum": daily_raw.get("precipitation_sum", [])[i] if i < len(daily_raw.get("precipitation_sum", [])) else 0.0,
            "precipitation_probability_max": daily_raw.get("precipitation_probability_max", [])[i] if i < len(daily_raw.get("precipitation_probability_max", [])) else 0,
            "wind_speed_max": daily_raw.get("wind_speed_10m_max", [])[i] if i < len(daily_raw.get("wind_speed_10m_max", [])) else None,
            "wind_gusts_max": daily_raw.get("wind_gusts_10m_max", [])[i] if i < len(daily_raw.get("wind_gusts_10m_max", [])) else None,
            "wind_direction": daily_raw.get("wind_direction_10m_dominant", [])[i] if i < len(daily_raw.get("wind_direction_10m_dominant", [])) else None,
        })

    return {
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
        "elevation": data.get("elevation"),
        "timezone": data.get("timezone"),
        "current": current_data,
        "hourly": hourly_list,
        "daily": daily_list
    }


async def get_air_quality(latitude: float, longitude: float, timezone: str = "auto") -> Dict[str, Any]:
    """Recupera la qualità dell'aria (EAQI, PM2.5, PM10, Ozono, Biossido di azoto, ecc.)."""
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "timezone": timezone,
        "current": [
            "european_aqi",
            "us_aqi",
            "pm10",
            "pm2_5",
            "carbon_monoxide",
            "nitrogen_dioxide",
            "sulphur_dioxide",
            "ozone",
            "uv_index"
        ],
        "hourly": [
            "european_aqi",
            "pm10",
            "pm2_5",
            "nitrogen_dioxide"
        ]
    }
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(AIR_QUALITY_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    curr = data.get("current", {})
    eaqi = curr.get("european_aqi")
    aqi_eval = get_aqi_level(eaqi)

    return {
        "current": {
            "european_aqi": eaqi,
            "us_aqi": curr.get("us_aqi"),
            "pm2_5": curr.get("pm2_5"),
            "pm10": curr.get("pm10"),
            "nitrogen_dioxide": curr.get("nitrogen_dioxide"),
            "ozone": curr.get("ozone"),
            "sulphur_dioxide": curr.get("sulphur_dioxide"),
            "carbon_monoxide": curr.get("carbon_monoxide"),
            "uv_index": curr.get("uv_index"),
            "rating": aqi_eval
        },
        "hourly": {
            "time": data.get("hourly", {}).get("time", [])[:24],
            "european_aqi": data.get("hourly", {}).get("european_aqi", [])[:24],
            "pm2_5": data.get("hourly", {}).get("pm2_5", [])[:24],
            "pm10": data.get("hourly", {}).get("pm10", [])[:24],
        }
    }


async def get_historical_weather(
    latitude: float,
    longitude: float,
    start_date: str,
    end_date: str,
    timezone: str = "auto"
) -> Dict[str, Any]:
    """
    Recupera dati meteo storici (archivio) per la posizione tra due date (formato YYYY-MM-DD).
    Fornisce precipitazioni, temperature max/min/medie, vento.
    """
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": start_date,
        "end_date": end_date,
        "timezone": timezone,
        "daily": [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "temperature_2m_mean",
            "apparent_temperature_max",
            "apparent_temperature_min",
            "precipitation_sum",
            "rain_sum",
            "snowfall_sum",
            "precipitation_hours",
            "wind_speed_10m_max",
            "wind_gusts_10m_max"
        ]
    }
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(ARCHIVE_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    daily = data.get("daily", {})
    times = daily.get("time", [])
    
    records = []
    total_precip = 0.0
    temps = []

    for i in range(len(times)):
        t_max = daily.get("temperature_2m_max", [])[i] if i < len(daily.get("temperature_2m_max", [])) else None
        t_min = daily.get("temperature_2m_min", [])[i] if i < len(daily.get("temperature_2m_min", [])) else None
        t_mean = daily.get("temperature_2m_mean", [])[i] if i < len(daily.get("temperature_2m_mean", [])) else None
        precip = daily.get("precipitation_sum", [])[i] if i < len(daily.get("precipitation_sum", [])) else 0.0
        w_code = daily.get("weather_code", [])[i] if i < len(daily.get("weather_code", [])) else 0
        w_speed = daily.get("wind_speed_10m_max", [])[i] if i < len(daily.get("wind_speed_10m_max", [])) else None

        if precip is not None:
            total_precip += precip
        if t_mean is not None:
            temps.append(t_mean)

        records.append({
            "date": times[i],
            "temp_max": t_max,
            "temp_min": t_min,
            "temp_mean": t_mean,
            "precipitation": precip,
            "wind_speed_max": w_speed,
            "weather_info": get_weather_info(w_code, 1)
        })

    avg_temp = round(sum(temps) / len(temps), 1) if temps else None

    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_days": len(times),
        "total_precipitation": round(total_precip, 1),
        "average_temperature": avg_temp,
        "daily": records
    }

