from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import datetime, timedelta
import asyncio
from app.services.open_meteo import get_weather_forecast, get_air_quality, get_historical_weather

router = APIRouter(prefix="/api/weather", tags=["Weather"])

@router.get("/forecast")
async def forecast(
    lat: float = Query(..., description="Latitudine"),
    lon: float = Query(..., description="Longitudine"),
    timezone: str = Query("auto", description="Fuso orario (default: auto)")
):
    try:
        data = await get_weather_forecast(latitude=lat, longitude=lon, timezone=timezone)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore recupero previsioni: {str(e)}")

@router.get("/air-quality")
async def air_quality(
    lat: float = Query(..., description="Latitudine"),
    lon: float = Query(..., description="Longitudine"),
    timezone: str = Query("auto", description="Fuso orario")
):
    try:
        data = await get_air_quality(latitude=lat, longitude=lon, timezone=timezone)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore recupero qualità aria: {str(e)}")

@router.get("/overview")
async def overview(
    lat: float = Query(..., description="Latitudine"),
    lon: float = Query(..., description="Longitudine"),
    timezone: str = Query("auto", description="Fuso orario")
):
    """Restituisce contemporaneamente previsioni e qualità dell'aria per velocizzare il caricamento."""
    try:
        weather_task = get_weather_forecast(latitude=lat, longitude=lon, timezone=timezone)
        aqi_task = get_air_quality(latitude=lat, longitude=lon, timezone=timezone)
        weather_res, aqi_res = await asyncio.gather(weather_task, aqi_task, return_exceptions=True)

        if isinstance(weather_res, Exception):
            raise weather_res
        
        aqi_data = None if isinstance(aqi_res, Exception) else aqi_res

        return {
            "weather": weather_res,
            "air_quality": aqi_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore recupero overview meteo: {str(e)}")

@router.get("/history")
async def history(
    lat: float = Query(..., description="Latitudine"),
    lon: float = Query(..., description="Longitudine"),
    start_date: Optional[str] = Query(None, description="Data inizio YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Data fine YYYY-MM-DD"),
    days_ago: Optional[int] = Query(None, description="Numero di giorni passati (es. 7, 30, 90)"),
    timezone: str = Query("auto", description="Fuso orario")
):
    try:
        # Se non sono passate date specifiche ma days_ago
        today = datetime.now().date()
        # Open-Meteo archive ha un ritardo di circa 2-5 giorni per la finalizzazione dei dati completi,
        # ma per date recenti sono disponibili fino a 2-3 giorni fa.
        if days_ago:
            end = today - timedelta(days=2)
            # Conteggio inclusivo: N giorni significa (end - (N - 1))
            days_offset = max(0, days_ago - 1)
            start = end - timedelta(days=days_offset)
            start_str = start.strftime("%Y-%m-%d")
            end_str = end.strftime("%Y-%m-%d")
        else:
            if not start_date or not end_date:
                # Default: ultimi 14 giorni inclusivi (fino a 2 giorni fa)
                end = today - timedelta(days=2)
                start = end - timedelta(days=13)
                start_str = start.strftime("%Y-%m-%d")
                end_str = end.strftime("%Y-%m-%d")
            else:
                start_str = start_date
                end_str = end_date

        data = await get_historical_weather(
            latitude=lat,
            longitude=lon,
            start_date=start_str,
            end_date=end_str,
            timezone=timezone
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore recupero dati storici: {str(e)}")

