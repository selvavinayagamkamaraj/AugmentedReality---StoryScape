import { parseStory } from './semanticStory';
import type { StoryData, OllamaHealthStatus } from '../types/story';
import type { StoryAI } from './StoryAI';

export const FALLBACK_DEMO_STORY: StoryData = {
  title: "Leo & The Friendly Alien",
  summary: "A little astronaut named Leo discovers a friendly alien hiding behind a chair and helps him find his spaceship.",
  characters: [
    {
      id: "leo",
      name: "Leo",
      type: "human",
      appearance: "little astronaut in space suit with blue visor",
      color: "#38bdf8",
      emotion: "happy"
    },
    {
      id: "alien",
      name: "Zorb",
      type: "alien",
      appearance: "cute green alien with bouncy antennae",
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
      title: "The Astronaut's Mission",
      duration: 7,
      narration: "A little astronaut named Leo crept across the room, searching for secret space treasures!",
      actions: [
        {
          characterId: "leo",
          action: "appear",
          targetPosition: { x: -0.6, y: 0, z: -0.1 },
          emotion: "happy"
        },
        {
          characterId: "leo",
          action: "walk",
          targetPosition: { x: -0.25, y: 0, z: 0 },
          emotion: "happy"
        }
      ],
      dialogue: [
        {
          characterId: "leo",
          text: "Captain's Log! Exploring new planets right in this room!"
        }
      ]
    },
    {
      scene_number: 2,
      title: "A Green Surprise",
      duration: 7,
      narration: "Behind a chair, a tiny green alien peeked out and gasped with wide shiny eyes!",
      actions: [
        {
          characterId: "alien",
          action: "appear",
          targetPosition: { x: 0.5, y: 0, z: -0.2 },
          emotion: "surprised"
        },
        {
          characterId: "alien",
          action: "jump",
          targetPosition: { x: 0.35, y: 0, z: 0 },
          emotion: "surprised"
        },
        {
          characterId: "leo",
          action: "turn",
          targetPosition: { x: -0.15, y: 0, z: 0 },
          emotion: "surprised"
        }
      ],
      dialogue: [
        {
          characterId: "alien",
          text: "Zorp! Hello earthling! Please don't be scared, I come in peace!"
        }
      ]
    },
    {
      scene_number: 3,
      title: "Friendly Handshake",
      duration: 8,
      narration: "Leo waved back happily and asked the little traveler how he could help.",
      actions: [
        {
          characterId: "leo",
          action: "wave",
          targetPosition: { x: -0.1, y: 0, z: 0 },
          emotion: "happy"
        },
        {
          characterId: "alien",
          action: "wave",
          targetPosition: { x: 0.25, y: 0, z: 0 },
          emotion: "happy"
        }
      ],
      dialogue: [
        {
          characterId: "leo",
          text: "Hi Zorb! I'm Leo the astronaut. Did you lose your rocket ship?"
        },
        {
          characterId: "alien",
          text: "Yes! I think it is parked by the big window on the other side!"
        }
      ]
    },
    {
      scene_number: 4,
      title: "Cosmic Blast Off",
      duration: 8,
      narration: "Together, Leo and Zorb cheered as the tiny alien floated up to start his journey home!",
      actions: [
        {
          characterId: "leo",
          action: "jump",
          targetPosition: { x: -0.1, y: 0.25, z: -0.1 },
          emotion: "happy"
        },
        {
          characterId: "alien",
          action: "fly",
          targetPosition: { x: 0.2, y: 0.6, z: -0.3 },
          emotion: "happy"
        }
      ],
      dialogue: [
        {
          characterId: "alien",
          text: "Thank you Leo! You are the best astronaut friend in the galaxy!"
        },
        {
          characterId: "leo",
          text: "Safe travels Zorb! Come back and visit anytime!"
        }
      ]
    }
  ]
};

export class MockStoryAI implements StoryAI {
  async generateStory(prompt: string): Promise<{ story: StoryData; source: 'fallback'; warning?: string }> {
    const story = parseStory(prompt);
    return {
      story,
      source: 'fallback',
      warning: 'Using prompt-derived English rules. Review the timeline.'
    };
  }

  async checkHealth(): Promise<OllamaHealthStatus> {
    return {
      status: 'offline',
      ollamaHost: 'local-demo',
      currentModel: 'demo-engine',
      message: 'Demo mode active'
    };
  }

  async getDefaultDemoStory(): Promise<StoryData> {
    return FALLBACK_DEMO_STORY;
  }
}


