import logging
from typing import List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("embedding-service")

app = FastAPI(title="SiteMind Embedding Microservice")

# Load model ONCE at module startup
logger.info("Loading sentence-transformer model 'all-MiniLM-L6-v2'...")
model = SentenceTransformer("all-MiniLM-L6-v2")
logger.info("Model 'all-MiniLM-L6-v2' loaded successfully.")

class EmbedRequest(BaseModel):
    texts: List[str]

class EmbedResponse(BaseModel):
    embeddings: List[List[float]]

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/embed", response_model=EmbedResponse)
def embed(body: EmbedRequest):
    if not body.texts:
        return EmbedResponse(embeddings=[])
    try:
        embeddings_numpy = model.encode(body.texts, convert_to_numpy=True)
        embeddings_list = embeddings_numpy.tolist()
        return EmbedResponse(embeddings=embeddings_list)
    except Exception as e:
        logger.error(f"Error generating embeddings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)
