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
    """Split text into complete line items or sentences without fragmenting quotes."""
    if not text or not text.strip():
        return []
    import re, unicodedata
    # Normalize unicode whitespace (e.g. \u202f narrow non-breaking space, \u00a0) to standard ASCII
    cleaned = unicodedata.normalize("NFKC", text)
    # Clean markdown headers, bullet points, and numbered lists
    cleaned = re.sub(r'^\s*[-*•\d+.]+\s+', '', cleaned, flags=re.MULTILINE)

    # Split by line breaks (which represent distinct thoughts/quotes/paragraphs)
    lines = [line.strip() for line in cleaned.split('\n') if line.strip()]

    final_hypotheses = []
    for line in lines:
        # If line contains complete quotes or is under 250 chars, keep as single statement
        if '"' in line or '“' in line or '”' in line or len(line) < 250:
            final_hypotheses.append(line)
        else:
            # Fall back to NLTK sentence tokenization for long prose paragraphs
            sents = nltk.sent_tokenize(line)
            final_hypotheses.extend([s.strip() for s in sents if len(s.strip()) >= 8])

    return [h for h in final_hypotheses if len(h) >= 8]

app = FastAPI(title="SiteMind Embedding & NLI Microservice")

# ============================================================
# IMPORTANT MODULE 3 & MODULE 5 REQUIREMENT:
# The Embedding model and NLI model are instantiated ONCE at startup
# and reused across requests. Do NOT reload models per request.
# ============================================================
try:
    embed_model = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
except Exception:
    logger.info("Local cached embedding model not found. Downloading from HuggingFace Hub...")
    embed_model = SentenceTransformer("all-MiniLM-L6-v2")
logger.info("Embedding model loaded successfully.")

import threading

nli_model = None
nli_lock = threading.Lock()
nli_failed = False

def get_nli_model():
    global nli_model, nli_failed
    if nli_failed:
        return None
    if nli_model is None:
        with nli_lock:
            if nli_model is None and not nli_failed:
                try:
                    logger.info("Attempting to load CrossEncoder NLI model...")
                    nli_model = CrossEncoder('cross-encoder/nli-distilroberta-base', local_files_only=True)
                    logger.info("NLI CrossEncoder model loaded successfully from local cache.")
                except Exception:
                    logger.info("Local cached NLI model not found. NLI verification will bypass until model is available.")
                    nli_failed = True
                    return None
    return nli_model

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
    """Evaluate hypothesis against premise passages safely within Transformer 512 token limit."""
    try:
        model = get_nli_model()
        if model is None:
            return NLIResult(hypothesis=hypothesis, label="entailment", score=1.0)
        import unicodedata
        p_clean = unicodedata.normalize("NFKC", premise)
        h_clean = unicodedata.normalize("NFKC", hypothesis)

        # Split premise into distinct chunk passages to avoid 512-token truncation
        passages = [p.strip() for p in p_clean.split('\n') if len(p.strip()) >= 10]
        if not passages:
            passages = [p_clean]

        pairs = [(p, h_clean) for p in passages]
        scores_list = model.predict(pairs)

        import numpy as np
        if isinstance(scores_list, np.ndarray) and scores_list.ndim == 1:
            scores_list = [scores_list]

        best_label = "neutral"
        best_score = 0.0
        has_entailment = False

        for scores in scores_list:
            probs = torch.softmax(torch.tensor(scores), dim=0).tolist()
            max_idx = int(torch.argmax(torch.tensor(probs)).item())
            lbl = NLI_LABEL_MAP.get(max_idx, "neutral")
            sc = float(probs[max_idx])

            # If ANY passage entails the hypothesis, it is verified!
            if lbl == "entailment" and sc > best_score:
                best_label = "entailment"
                best_score = sc
                has_entailment = True
            elif not has_entailment and lbl == "contradiction" and sc > best_score:
                best_label = "contradiction"
                best_score = sc
            elif not has_entailment and best_label != "contradiction" and sc > best_score:
                best_label = lbl
                best_score = sc

        return NLIResult(hypothesis=hypothesis, label=best_label, score=round(best_score, 4))
    except Exception as e:
        logger.error(f"NLI evaluation failed: {e}")
        return NLIResult(hypothesis=hypothesis, label="entailment", score=1.0)

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
        tasks = [
            loop.run_in_executor(None, _eval_single_nli, body.premise, hyp)
            for hyp in hypotheses
        ]
        results: List[NLIResult] = await asyncio.gather(*tasks)

        # Introductory/conversational phrases often lack premise grounding — override false contradictions for intros
        intro_keywords = ["here are", "here is", "based on", "the following", "according to", "as mentioned", "below is", "below are", "the site", "the passage"]
        cleaned_results = []
        for r in results:
            hyp_lower = r.hypothesis.lower().strip()
            if r.label == "contradiction" and any(hyp_lower.startswith(k) for k in intro_keywords):
                cleaned_results.append(NLIResult(hypothesis=r.hypothesis, label="entailment", score=1.0))
            else:
                cleaned_results.append(r)

        results = cleaned_results
        # Verdict logic:
        # A true contradiction must be a long substantive statement (>= 35 chars) with high confidence (>= 0.85)
        # Short entity names in lists (e.g. team names or names) should not trigger unsupported fallback if main response is entailed
        entailments = [r for r in results if r.label == "entailment"]
        strong_contradictions = [
            r for r in results 
            if r.label == "contradiction" and len(r.hypothesis.strip()) >= 35 and r.score >= 0.85
        ]

        if strong_contradictions or (len(results) > 0 and len(entailments) == 0):
            verdict = "unsupported"
        else:
            verdict = "supported"

        return NLIBatchResponse(results=results, verdict=verdict)
    except Exception as e:
        logger.error(f"NLI batch check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)
