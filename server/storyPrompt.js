export const SYSTEM_PROMPT = `You are StoryAR AI, an expert children's interactive AR story director.
Your job is to transform a short story provided by a parent into a structured, highly visual AR scene timeline for mobile Augmented Reality.

You MUST respond strictly with a valid JSON object matching the schema below. Do not output markdown code blocks or any other commentary.

SCHEMA SPECIFICATION:
{
  "title": "Short catchy story title",
  "summary": "1 sentence synopsis",
  "characters": [
    {
      "id": "lowercase_unique_id (e.g. leo, alien, bunny)",
      "name": "Display Name",
      "type": "MUST be one of: human, rabbit, cat, dog, robot, alien, bird, butterfly, dragon, generic",
      "appearance": "Short visual appearance description (e.g. astronaut suit, green antenna, cute robot)",
      "color": "Hex color code representing primary color (e.g. #38bdf8, #4ade80)",
      "emotion": "Initial emotion: happy, sad, surprised, idle"
    }
  ],
  "environment": {
    "mood": "playful | cozy | mysterious | joyful",
    "theme": "space | forest | living_room | fantasy"
  },
  "scenes": [
    {
      "scene_number": 1,
      "title": "Brief scene title",
      "duration": 6,
      "narration": "Expressive 1-2 sentence narration read aloud by the narrator",
      "actions": [
        {
          "characterId": "character id",
          "action": "MUST be one of: idle, walk, run, talk, look, turn, wave, jump, appear, disappear, fly, happy, sad, surprised, sit, eat, drink, read, chase, pick",
          "targetPosition": { "x": -0.5, "y": 0, "z": 0 },
          "emotion": "happy | sad | surprised | idle"
        }
      ],
      "dialogue": [
        {
          "characterId": "character id",
          "text": "Character speech spoken out loud with a speech bubble"
        }
      ]
    }
  ]
}

SEMANTIC RULES (take priority over examples):
- Extract ALL characters and objects, including unfamiliar nouns. Never replace the prompt with an unrelated story.
- Add a top-level objects array: [{id,name,type,appearance,color,scale,surfaceAnchor}]. Type is food/furniture/nature/prop/vehicle/tool. scale is physical size in metres, NOT a multiplier.
- Give each action targetObjectId where it affects an object and targetSurface (floor/table/chair/wall) where appropriate. Include duration in seconds. Put sequential actions in sequential scenes. Never omit eat, sit or dialogue.
- Each character and interactive object is separate; never output a scene image.
- Add environment.virtualElements as an array of individual semantic element names appropriate to ANY theme. These will become separate meshes. Use hybrid real-room placement.
- Reuse real surfaces when available; otherwise generate furniture. A cat starts on the floor, jumps to a table, approaches and eats the apple. The apple belongs on that table. The bird flies before sitting on the chair.
- Use anchor-LOCAL metre coordinates, NOT camera coordinates. Origin is selected floor point. x left/right, y height, z forward/back around 0. Avoid explicit coordinates when targetObjectId or targetSurface is known.
- Unknown character type = generic with original appearance preserved. Unknown objects MUST remain in objects.
- Preserve exact user dialogue, with correct characterId.

COORDINATE GUIDELINES:
- In anchor-local coordinates:
  - x: horizontal position (-1.0 left to +1.0 right)
  - y: height from floor (0 is ground floor, 0.5 is flying/floating)
  - z: depth relative to floor origin (-1.0 to +1.0)
- Generate enough scenes to preserve the entire action sequence.
- Duration should be between 5 to 10 seconds per scene.
- Every scene should have clear character actions and expressive dialogue or narration.
- Ensure all characterIds in actions and dialogue match characters in the characters array.
- ONLY output the JSON object.`;

export function buildStoryPrompt(userStory) {
  return `Convert the following story into the StoryAR structured JSON format:

STORY:
"${userStory}"

Output valid JSON only.`;
}

export const DEFAULT_DEMO_STORY = {
  title: "Leo & The Friendly Alien",
  summary: "A little astronaut named Leo discovers a friendly alien hiding behind a chair and helps him find his spaceship.",
  characters: [
    {
      id: "leo",
      name: "Leo",
      type: "human",
      appearance: "brave astronaut with silver suit and blue visor",
      color: "#38bdf8",
      emotion: "happy"
    },
    {
      id: "alien",
      name: "Zorb",
      type: "alien",
      appearance: "friendly glowing green alien with twitchy antennae",
      color: "#4ade80",
      emotion: "surprised"
    }
  ],
  environment: {
    mood: "playful and adventurous",
    theme: "space"
  },
  scenes: [
    {
      scene_number: 1,
      title: "The Little Astronaut Arrives",
      duration: 7,
      narration: "A little astronaut named Leo stepped into the room, scanning the floor with his space scanner.",
      actions: [
        {
          characterId: "leo",
          action: "appear",
          targetPosition: { x: -0.7, y: 0, z: -0.1 },
          emotion: "happy"
        },
        {
          characterId: "leo",
          action: "walk",
          targetPosition: { x: -0.3, y: 0, z: 0 },
          emotion: "happy"
        }
      ],
      dialogue: [
        {
          characterId: "leo",
          text: "Captain's Log: Room expedition in progress! Wait... did I hear something?"
        }
      ]
    },
    {
      scene_number: 2,
      title: "A Surprise Behind the Chair",
      duration: 8,
      narration: "Suddenly, two curious antennae popped up from behind the furniture!",
      actions: [
        {
          characterId: "alien",
          action: "appear",
          targetPosition: { x: 0.5, y: 0, z: -0.3 },
          emotion: "surprised"
        },
        {
          characterId: "alien",
          action: "jump",
          targetPosition: { x: 0.35, y: 0, z: -0.1 },
          emotion: "surprised"
        },
        {
          characterId: "leo",
          action: "turn",
          targetPosition: { x: -0.2, y: 0, z: 0 },
          emotion: "surprised"
        }
      ],
      dialogue: [
        {
          characterId: "alien",
          text: "Beep boop! Hello human! Please do not be frightened!"
        }
      ]
    },
    {
      scene_number: 3,
      title: "Making Friends",
      duration: 8,
      narration: "Leo smiled, waved his astronaut glove, and knelt down to greet his cosmic friend.",
      actions: [
        {
          characterId: "leo",
          action: "wave",
          targetPosition: { x: -0.15, y: 0, z: 0 },
          emotion: "happy"
        },
        {
          characterId: "alien",
          action: "wave",
          targetPosition: { x: 0.2, y: 0, z: 0 },
          emotion: "happy"
        }
      ],
      dialogue: [
        {
          characterId: "leo",
          text: "Hi Zorb! I'm Leo. Are you lost in my room?"
        },
        {
          characterId: "alien",
          text: "Yes! My saucer is parked somewhere beyond the stars... or maybe behind the sofa!"
        }
      ]
    },
    {
      scene_number: 4,
      title: "The Rocket Journey",
      duration: 8,
      narration: "Leo and Zorb joined hands and launched toward the stars with a joyful cheer!",
      actions: [
        {
          characterId: "leo",
          action: "jump",
          targetPosition: { x: -0.1, y: 0.4, z: -0.2 },
          emotion: "happy"
        },
        {
          characterId: "alien",
          action: "fly",
          targetPosition: { x: 0.15, y: 0.6, z: -0.2 },
          emotion: "happy"
        }
      ],
      dialogue: [
        {
          characterId: "leo",
          text: "Blast off! To the stars, my friend!"
        },
        {
          characterId: "alien",
          text: "Woohoo! Thank you Leo, best astronaut ever!"
        }
      ]
    }
  ]
};


