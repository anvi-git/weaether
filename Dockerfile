# Immagine base Python ufficiale leggera
FROM python:3.12-slim

# Evita la scrittura di bytecode e abilita l'output log immediato
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Installazione dipendenze di sistema minime
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copia e installazione dei requisiti
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia del codice sorgente
COPY app/ ./app/
COPY README.md .

# Porta standard (Render, Railway, Cloud Run impostano la variabile PORT)
ENV PORT=8000
EXPOSE 8000

# Avvio del server Uvicorn in modalità produzione
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2"]

