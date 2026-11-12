import uvicorn
import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"🚀 Avvio di MeteoVision su http://localhost:{port}")
    print(f"📱 Accessibile sia da desktop che da smartphone (stessa rete WiFi o tunnel).")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)

