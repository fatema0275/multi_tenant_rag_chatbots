import asyncio
import logging
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, CrossEncoder
import torch
import nltk

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("embedding-service")

# Setup NLTK tokenizers
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)
try:
    nltk.data.find('tokenizers/punkt_tab')
except LookupError:
    nltk.download('punkt_tab', quiet=True)

def split_sentences(text: str) -> List[str]:
    """Split text into sentences using nltk.sent_tokenize to handle abbreviations cleanly."""
    if not text or not text.strip():
        return []
    return nltk.sent_tokenize(text.strip())

app = FastAPI(title="SiteMind Embedding & NLI Microservice")

# ============================================================
# IMPORTANT MODULE 3 & MODULE 5 REQUIREMENT:
# The Embedding model and NLI model are instantiated ONCE at startup
# and reused across requests. Do NOT reload models per request.
# ============================================================
logger.info("Loading sentence-transformer model 'all-MiniLM-L6-v2'...")
embed_model = SentenceTransformer("all-MiniLM-L6-v2")
logger.info("Embedding model loaded successfully.")

logger.info("Loading NLI CrossEncoder model 'cross-encoder/nli-distilroberta-base'...")
nli_model = CrossEncoder('cross-encoder/nli-distilroberta-base')
logger.info("NLI CrossEncoder model loaded successfully.")

# Label mapping for cross-encoder/nli-distilroberta-base: 0: contradiction, 1: entailment, 2: neutral
NLI_LABEL_MAP = {0: "contradiction", 1: "entailment", 2: "neutral"}


class EmbedRequest(BaseModel):
    texts: List[str]

class EmbedResponse(BaseModel):
    embeddings: List[List[float]]

class NLIRequest(BaseModel):
    premise: str
    hypothesis: str

class NLIResult(BaseModel):
    hypothesis: str
    label: str
    score: float

class NLIBatchRequest(BaseModel):
    premise: str
    hypotheses: Optional[List[str]] = None
    answer: Optional[str] = None

class NLIBatchResponse(BaseModel):
    results: List[NLIResult]
    verdict: str


@app.get("/health")
def health():
    return {"status": "ok", "models_loaded": True}

@app.post("/embed", response_model=EmbedResponse)
def embed(body: EmbedRequest):
    if not body.texts:
        return EmbedResponse(embeddings=[])
    try:
        embeddings_numpy = embed_model.encode(body.texts, convert_to_numpy=True)
        embeddings_list = embeddings_numpy.tolist()
        return EmbedResponse(embeddings=embeddings_list)
    except Exception as e:
        logger.error(f"Error generating embeddings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def _eval_single_nli(premise: str, hypothesis: str) -> NLIResult:
    """Evaluate a single hypothesis against premise using the loaded NLI model instance."""
    scores = nli_model.predict([(premise, hypothesis)])
    # Apply softmax over logits
    probs = torch.softmax(torch.tensor(scores[0]), dim=0).tolist()
    max_idx = int(torch.argmax(torch.tensor(probs)).item())
    label = NLI_LABEL_MAP.get(max_idx, "neutral")
    score = float(probs[max_idx])
    return NLIResult(hypothesis=hypothesis, label=label, score=round(score, 4))

@app.post("/nli", response_model=NLIResult)
async def nli_single(body: NLIRequest):
    try:
        loop = asyncio.get_running_loop()
        res = await loop.run_in_executor(None, _eval_single_nli, body.premise, body.hypothesis)
        return res
    except Exception as e:
        logger.error(f"NLI single check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/nli/batch", response_model=NLIBatchResponse)
async def nli_batch(body: NLIBatchRequest):
    try:
        hypotheses = body.hypotheses
        if not hypotheses:
            target_text = body.answer or ""
            hypotheses = split_sentences(target_text)

        if not hypotheses:
            return NLIBatchResponse(results=[], verdict="supported")

        loop = asyncio.get_running_loop()
        # Run all hypothesis checks concurrently using asyncio.gather
        tasks = [
            loop.run_in_executor(None, _eval_single_nli, body.premise, hyp)
            for hyp in hypotheses
        ]
        results: List[NLIResult] = await asyncio.gather(*tasks)

        # Verdict logic:
        # All labels entailment -> supported
        # Any label contradiction -> unsupported
        # Anything else -> partial
        labels = [r.label for r in results]
        if all(lbl == "entailment" for lbl in labels):
            verdict = "supported"
        elif any(lbl == "contradiction" for lbl in labels):
            verdict = "unsupported"
        else:
            verdict = "partial"

        return NLIBatchResponse(results=results, verdict=verdict)
    except Exception as e:
        logger.error(f"NLI batch check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)
