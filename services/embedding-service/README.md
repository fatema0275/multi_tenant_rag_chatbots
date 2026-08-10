# Embedding Microservice

Serves sentence-transformer embeddings over HTTP.

## Setup
pip install -r requirements.txt

## Run
uvicorn main:app --host 0.0.0.0 --port 5001

## Endpoints
POST /embed
Body: { "texts": ["string", ...] }
Response: { "embeddings": [[float, ...], ...] }

GET /health
Response: { "status": "ok" }
