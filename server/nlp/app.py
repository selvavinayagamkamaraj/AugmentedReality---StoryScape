"""Optional local NLP service. No camera frames, cloud APIs or credentials."""
import json
import os
import urllib.request
from functools import lru_cache

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="StoryAR local NLP")


class ParseRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=12000)
    model: str = Field(default="llama3.2:latest", max_length=120)
    system: str = Field(default="Return a StoryAR scene as JSON.", max_length=16000)


@lru_cache(maxsize=1)
def language_model():
    try:
        import spacy
        return spacy.load(os.getenv("SPACY_MODEL", "en_core_web_sm"))
    except (ImportError, OSError):
        return None


@app.get("/health")
def health():
    return {"backend": "python", "spacy": language_model() is not None, "inference": "local Ollama"}


@app.post("/parse")
def parse(request: ParseRequest):
    nlp = language_model()
    phrases = [chunk.text for chunk in nlp(request.prompt).noun_chunks] if nlp else []
    payload = {
        "model": request.model, "system": request.system,
        "prompt": request.prompt + "\nRetain these extracted noun phrases: " + json.dumps(phrases),
        "stream": False, "format": "json", "options": {"temperature": 0.2, "num_predict": 4096},
    }
    url = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434") + "/api/generate"
    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=55) as response:
            story = json.loads(json.load(response)["response"])
        if not isinstance(story, dict) or not story.get("scenes"):
            raise ValueError("Incomplete local model response")
        story["nlpSource"] = "python/spacy/ollama" if nlp else "python/ollama"
        story["originalPrompt"] = request.prompt
        if not nlp:
            story.setdefault("warnings", []).append("spaCy English model unavailable; used local model extraction.")
        return story
    except (OSError, ValueError, KeyError) as error:
        # Express retains the original prompt and performs its deterministic fallback.
        raise HTTPException(status_code=503, detail="Local NLP unavailable; use prompt-derived fallback") from error
