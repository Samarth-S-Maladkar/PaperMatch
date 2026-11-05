"""
PaperMatch Embedding Service
-----------------------------
A minimal FastAPI microservice that wraps a sentence-transformers model to
turn text (paper title + abstract, or a user search query) into a dense
vector embedding suitable for storage in / querying against a pgvector
column.

Model: sentence-transformers/all-MiniLM-L6-v2
  - 384-dimensional embeddings
  - Chosen for this student project because it is small (~80MB), fast on
    CPU, and gives strong semantic-similarity quality relative to its size,
    which matters since this service is expected to run without a GPU.
  - Similarity metric: cosine similarity (pgvector `<=>` operator with
    vector_cosine_ops), matching how the model was trained/evaluated.
"""

import os
import logging
from functools import lru_cache

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("embedding-service")

MODEL_NAME = os.environ.get("MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")

app = FastAPI(title="PaperMatch Embedding Service", version="1.0.0")


@lru_cache(maxsize=1)
def get_model() -> SentenceTransformer:
    logger.info("Loading embedding model: %s", MODEL_NAME)
    return SentenceTransformer(MODEL_NAME)


class EmbedRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=8000)


class EmbedResponse(BaseModel):
    embedding: list[float]
    model: str
    dimensions: int


class BatchEmbedRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=256)


class BatchEmbedResponse(BaseModel):
    embeddings: list[list[float]]
    model: str
    dimensions: int


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text must not be empty")
    model = get_model()
    vector = model.encode(text, normalize_embeddings=True)
    return EmbedResponse(
        embedding=vector.tolist(),
        model=MODEL_NAME,
        dimensions=len(vector),
    )


@app.post("/embed/batch", response_model=BatchEmbedResponse)
def embed_batch(req: BatchEmbedRequest):
    cleaned = [t.strip() for t in req.texts if t.strip()]
    if not cleaned:
        raise HTTPException(status_code=400, detail="texts must not be empty")
    model = get_model()
    vectors = model.encode(cleaned, normalize_embeddings=True)
    return BatchEmbedResponse(
        embeddings=[v.tolist() for v in vectors],
        model=MODEL_NAME,
        dimensions=vectors.shape[1],
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
