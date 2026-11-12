import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api.weather import router as weather_router
from app.api.geocoding import router as geo_router

app = FastAPI(
    title="MeteoVision - Previsioni Meteo & Dati Storici",
    description="Applicazione moderna e responsive per previsioni meteo, qualità dell'aria e serie storiche.",
    version="1.0.0"
)

# Configura CORS per consentire l'accesso multipiattaforma
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrazione Router API
app.include_router(weather_router)
app.include_router(geo_router)

# Percorso statici
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR, exist_ok=True)

# Mount dei file statici (CSS, JS, assets)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/", include_in_schema=False)
async def serve_index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    return FileResponse(index_path)

@app.get("/health")
async def health_check():
    return {"status": "ok", "app": "MeteoVision"}

