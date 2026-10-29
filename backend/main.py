import os
import re
import json
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import requests

app = FastAPI(title="StoryAR NLP & Scene Planning Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:latest")

class ParseRequest(BaseModel):
    prompt: str
    model: Optional[str] = DEFAULT_MODEL
    system: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    backend: str
    nlp: str
    ollama_host: str

@app.get("/health")
@app.get("/api/health")
def health_check():
    ollama_online = False
    try:
        r = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=2.0)
        if r.status_code == 200:
            ollama_online = True
    except Exception:
        pass

    return {
        "status": "online",
        "backend": "fastapi_python",
        "nlp": "ollama" if ollama_online else "python_nlp_rules",
        "ollama_host": OLLAMA_HOST,
        "ollama_connected": ollama_online
    }

@app.post("/parse")
@app.post("/api/parse-story")
def parse_story(req: ParseRequest):
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Story prompt is required")

    # Try local Ollama if available
    try:
        payload = {
            "model": req.model or DEFAULT_MODEL,
            "prompt": prompt,
            "system": req.system or "You are an AR scene director. Output valid JSON with characters, objects, and scenes.",
            "stream": False,
            "format": "json"
        }
        res = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=45.0)
        if res.status_code == 200:
            data = res.json()
            raw_text = data.get("response", "").strip()
            # Clean markdown codeblocks
            raw_text = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text)
            parsed = json.loads(raw_text)
            return parsed
    except Exception as e:
        # Fallback to Python NLP Rule Engine
        pass

    # Built-in Python NLP Semantic Decomposition
    return python_semantic_parse(prompt)

def python_semantic_parse(text: str) -> Dict[str, Any]:
    lower = text.lower()

    # Characters
    characters = []
    char_defs = [
        {"type": "cat", "kw": ["cat", "kitten"], "name": "Ginger", "color": "#fb923c", "scale": 0.3},
        {"type": "dog", "kw": ["dog", "puppy"], "name": "Buddy", "color": "#eab308", "scale": 0.4},
        {"type": "bird", "kw": ["bird", "sparrow", "robin"], "name": "Pip", "color": "#38bdf8", "scale": 0.2},
        {"type": "robot", "kw": ["robot", "droid", "bot"], "name": "Bleep", "color": "#818cf8", "scale": 0.5},
        {"type": "alien", "kw": ["alien", "martian", "zorb"], "name": "Zorb", "color": "#4ade80", "scale": 0.45},
        {"type": "human", "kw": ["astronaut", "boy", "girl", "leo", "pirate", "wizard"], "name": "Leo", "color": "#38bdf8", "scale": 0.65}
    ]

    for c in char_defs:
        if any(k in lower for k in c["kw"]):
            characters.append({
                "id": f"char_{c['type']}",
                "name": c["name"],
                "type": c["type"],
                "appearance": f"Friendly {c['type']}",
                "color": c["color"],
                "emotion": "happy",
                "initialScale": c["scale"]
            })

    if not characters:
        characters.append({
            "id": "char_hero",
            "name": "Adventurer",
            "type": "human",
            "appearance": "Brave explorer",
            "color": "#38bdf8",
            "emotion": "happy",
            "initialScale": 0.65
        })

    # Objects
    objects = []
    if "apple" in lower:
        objects.append({"id": "obj_apple", "name": "Red Apple", "type": "food", "color": "#ef4444", "scale": 0.08, "surfaceAnchor": "table"})
    if "carrot" in lower:
        objects.append({"id": "obj_carrot", "name": "Carrot", "type": "food", "color": "#f97316", "scale": 0.15, "surfaceAnchor": "table"})
    if "chest" in lower or "treasure" in lower:
        objects.append({"id": "obj_chest", "name": "Treasure Chest", "type": "prop", "color": "#78350f", "scale": 0.35, "surfaceAnchor": "floor"})
    if "book" in lower:
        objects.append({"id": "obj_book", "name": "Ancient Book", "type": "prop", "color": "#3b82f6", "scale": 0.22, "surfaceAnchor": "table"})

    # Quotes / Speech
    quotes = re.findall(r"['\"]([^'\"]+)['\"]", text)
    dialogue_text = quotes[0] if quotes else "This is wonderful!"

    # Multi-scene breakdown
    primary_id = characters[0]["id"]
    scenes = [
        {
            "scene_number": 1,
            "title": f"{characters[0]['name']} Steps In",
            "duration": 6,
            "narration": f"{characters[0]['name']} steps into the room, scanning the floor.",
            "actions": [
                {"characterId": primary_id, "action": "appear", "targetPosition": {"x": -0.7, "y": 0, "z": -1.6}, "emotion": "happy"},
                {"characterId": primary_id, "action": "walk", "targetPosition": {"x": -0.2, "y": 0, "z": -1.5}, "emotion": "happy"}
            ],
            "dialogue": []
        }
    ]

    if "table" in lower and ("jump" in lower or "climb" in lower):
        scenes.append({
            "scene_number": 2,
            "title": "Jumping Onto The Table",
            "duration": 7,
            "narration": f"{characters[0]['name']} spots the table and leaps right up onto the wooden surface!",
            "actions": [
                {"characterId": primary_id, "action": "jump", "targetPosition": {"x": 0.35, "y": 0.72, "z": -1.5}, "targetSurface": "table", "emotion": "happy"}
            ],
            "dialogue": []
        })

    if "eat" in lower:
        scenes.append({
            "scene_number": len(scenes) + 1,
            "title": "A Delicious Bite",
            "duration": 8,
            "narration": f"{characters[0]['name']} takes a bite of the tasty food and smiles with delight.",
            "actions": [
                {"characterId": primary_id, "action": "eat", "targetObjectId": "obj_apple", "emotion": "happy"},
                {"characterId": primary_id, "action": "talk", "emotion": "happy"}
            ],
            "dialogue": [
                {"characterId": primary_id, "text": dialogue_text}
            ]
        })
    else:
        scenes.append({
            "scene_number": len(scenes) + 1,
            "title": "Sharing a Thought",
            "duration": 7,
            "narration": f"{characters[0]['name']} turns to share an exciting message.",
            "actions": [
                {"characterId": primary_id, "action": "wave", "emotion": "happy"},
                {"characterId": primary_id, "action": "talk", "emotion": "happy"}
            ],
            "dialogue": [
                {"characterId": primary_id, "text": dialogue_text}
            ]
        })

    if len(characters) > 1:
        sec_id = characters[1]["id"]
        scenes.append({
            "scene_number": len(scenes) + 1,
            "title": f"{characters[1]['name']} Joins",
            "duration": 7,
            "narration": f"Then, {characters[1]['name']} arrives into the room and perches comfortably!",
            "actions": [
                {"characterId": sec_id, "action": "fly" if characters[1]["type"] == "bird" else "walk", "targetPosition": {"x": -0.55, "y": 0.44, "z": -1.4}, "targetSurface": "chair", "emotion": "happy"}
            ],
            "dialogue": [
                {"characterId": sec_id, "text": f"Hello {characters[0]['name']}!"}
            ]
        })

    return {
        "title": f"{characters[0]['name']}'s Journey",
        "summary": "An environment-aware spatial AR experience.",
        "characters": characters,
        "objects": objects,
        "environment": {"theme": "room", "mood": "playful", "isHybrid": True},
        "scenes": scenes,
        "nlpSource": "python_fastapi"
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
