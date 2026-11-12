from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Any
from app.services.open_meteo import search_cities

router = APIRouter(prefix="/api/geo", tags=["Geocoding"])

@router.get("/search")
async def search_location(q: str = Query(..., min_length=2, description="Nome della città")):
    try:
        results = await search_cities(q)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore ricerca geografica: {str(e)}")

