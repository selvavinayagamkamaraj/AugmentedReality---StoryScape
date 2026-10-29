import type { 
  StoryCharacter, 
  StoryObject3D, 
  CharacterType, 
  ObjectType, 
  StoryEnvironment 
} from '../types/story';

export interface ParsedNLPStory {
  title: string;
  characters: StoryCharacter[];
  objects: StoryObject3D[];
  environment: StoryEnvironment;
  rawActions: string[];
  dialogues: { speaker: string; text: string }[];
}

export class NLPParser {
  /**
   * Universal client-side NLP extraction engine.
   * Parses arbitrary natural language text without requiring an external paid API.
   */
  public static parse(storyText: string): ParsedNLPStory {
    const text = storyText.trim();

    // 1. Extract Quoted Dialogue
    const dialogues: { speaker: string; text: string }[] = [];
    const quoteRegex = /['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = quoteRegex.exec(text)) !== null) {
      if (match[1].length > 2) {
        dialogues.push({
          speaker: '', // will be attributed below
          text: match[1]
        });
      }
    }

    // 2. Extract Characters
    const characters = this.extractCharacters(text);

    // Attribute extracted dialogue to the most relevant character
    if (dialogues.length > 0 && characters.length > 0) {
      dialogues.forEach(d => {
        // Look for character mentioned near the quote
        const primary = characters[0];
        d.speaker = primary.name;
      });
    }

    // 3. Extract Objects
    const objects = this.extractObjects(text);

    // 4. Extract Environment
    const environment = this.extractEnvironment(text);

    // 5. Title generation
    let title = 'An AR Story Adventure';
    if (characters.length > 0) {
      title = `${characters[0].name}'s Adventure`;
      if (characters.length > 1) {
        title = `${characters[0].name} & ${characters[1].name}`;
      }
    }

    return {
      title,
      characters,
      objects,
      environment,
      rawActions: this.extractActionPhrases(text),
      dialogues
    };
  }

  private static extractCharacters(text: string): StoryCharacter[] {
    const lower = text.toLowerCase();
    const characters: StoryCharacter[] = [];
    const foundTypes = new Set<string>();

    const characterDefinitions: {
      type: CharacterType;
      keywords: string[];
      defaultName: string;
      color: string;
      scale: number;
    }[] = [
      { type: 'cat', keywords: ['cat', 'kitten', 'kitty'], defaultName: 'Mittens', color: '#fb923c', scale: 0.30 },
      { type: 'dog', keywords: ['dog', 'puppy', 'pup', 'hound'], defaultName: 'Buddy', color: '#eab308', scale: 0.40 },
      { type: 'bird', keywords: ['bird', 'blue bird', 'parrot', 'sparrow', 'robin'], defaultName: 'Pip', color: '#38bdf8', scale: 0.20 },
      { type: 'rabbit', keywords: ['rabbit', 'bunny', 'hare'], defaultName: 'Fluffy', color: '#f472b6', scale: 0.25 },
      { type: 'robot', keywords: ['robot', 'bot', 'droid', 'cyborg', 'bleep'], defaultName: 'Bleep', color: '#818cf8', scale: 0.50 },
      { type: 'alien', keywords: ['alien', 'martian', 'extraterrestrial', 'zorb'], defaultName: 'Zorb', color: '#4ade80', scale: 0.45 },
      { type: 'dragon', keywords: ['dragon', 'drake', 'wyrm'], defaultName: 'Draco', color: '#10b981', scale: 0.48 },
      { type: 'butterfly', keywords: ['butterfly', 'moth'], defaultName: 'Flutter', color: '#c084fc', scale: 0.15 },
      { type: 'human', keywords: ['boy', 'girl', 'child', 'astronaut', 'pirate', 'wizard', 'man', 'woman', 'leo'], defaultName: 'Hero', color: '#38bdf8', scale: 0.65 },
      { type: 'spiderman', keywords: ['spiderman', 'spider-man', 'spider man', 'webslinger', 'peter parker'], defaultName: 'Spider-Man', color: '#dc2626', scale: 0.70 },
      { type: 'bat', keywords: ['bat', 'bats', 'vampire bat', 'fruit bat'], defaultName: 'Midnight', color: '#1e293b', scale: 0.28 },
      { type: 'hero', keywords: ['batman', 'superman', 'ironman', 'iron man', 'superhero', 'avenger', 'hero'], defaultName: 'Superhero', color: '#2563eb', scale: 0.70 }
    ];

    characterDefinitions.forEach(def => {
      for (const kw of def.keywords) {
        if (lower.includes(kw) && !foundTypes.has(def.type)) {
          foundTypes.add(def.type);

          // Detect color adjectives preceding keyword (e.g. "orange cat", "blue bird", "white rabbit")
          let detectedColor = def.color;
          let displayName = def.defaultName;

          if (lower.includes(`orange ${kw}`)) detectedColor = '#f97316';
          else if (lower.includes(`blue ${kw}`)) detectedColor = '#38bdf8';
          else if (lower.includes(`red ${kw}`)) detectedColor = '#ef4444';
          else if (lower.includes(`white ${kw}`)) detectedColor = '#ffffff';
          else if (lower.includes(`black ${kw}`)) detectedColor = '#334155';
          else if (lower.includes(`green ${kw}`)) detectedColor = '#22c55e';
          else if (lower.includes(`golden ${kw}`)) detectedColor = '#fbbf24';

          if (kw === 'pirate') displayName = 'Captain Barnaby';
          else if (kw === 'astronaut' || kw === 'leo') displayName = 'Leo';
          else if (kw === 'wizard') displayName = 'Merlin';
          else if (kw === 'cat' && detectedColor === '#f97316') displayName = 'Ginger';
          else if (kw === 'bird') displayName = 'Bluebird';
          else if (def.type === 'spiderman') displayName = 'Spider-Man';
          else if (def.type === 'bat') displayName = 'Bat';

          characters.push({
            id: `char_${def.type}_${characters.length}`,
            name: displayName,
            type: def.type,
            appearance: `${def.type} with ${detectedColor} color`,
            color: detectedColor,
            emotion: 'happy',
            initialScale: def.scale
          });
          break;
        }
      }
    });

    // Universal NER for arbitrary custom entities
    if (characters.length === 0) {
      const nounMatch = text.match(/\b(?:a|an|the|my)\s+([a-z0-9'-]+(?:\s+[a-z0-9'-]+)?)\s+(?:walks|runs|jumps|flies|swings|swoops|crawls|sits|eats|dances|moves|stands|looks)/i);
      if (nounMatch) {
        const entityName = nounMatch[1];
        const lowerName = entityName.toLowerCase();
        let entityType: CharacterType = 'generic';
        let defaultScale = 0.5;
        let color = '#a855f7';
        if (/spider[- ]?man/i.test(lowerName)) { entityType = 'spiderman'; defaultScale = 0.70; color = '#dc2626'; }
        else if (/\bbat\b/i.test(lowerName)) { entityType = 'bat'; defaultScale = 0.28; color = '#1e293b'; }
        else if (/fly|bird|wing|dragon|hawk|eagle|falcon/i.test(lowerName)) { entityType = 'bat'; defaultScale = 0.35; color = '#64748b'; }
        else if (/man|boy|girl|warrior|knight|ninja|hero/i.test(lowerName)) { entityType = 'hero'; defaultScale = 0.70; color = '#2563eb'; }

        characters.push({
          id: `char_custom_0`,
          name: entityName.charAt(0).toUpperCase() + entityName.slice(1),
          type: entityType,
          appearance: entityName,
          color,
          emotion: 'happy',
          initialScale: defaultScale
        });
      }
    }

    // Fallback if no specific character mentioned
    if (characters.length === 0) {
      characters.push({
        id: 'char_hero_0',
        name: 'Adventurer',
        type: 'human',
        appearance: 'brave adventurer',
        color: '#38bdf8',
        emotion: 'happy',
        initialScale: 0.65
      });
    }

    return characters;
  }

  private static extractObjects(text: string): StoryObject3D[] {
    const lower = text.toLowerCase();
    const objects: StoryObject3D[] = [];
    const found = new Set<string>();

    const objectDefinitions: {
      name: string;
      keywords: string[];
      type: ObjectType;
      color: string;
      scale: number;
      surfaceAnchor?: 'floor' | 'table' | 'chair';
    }[] = [
      { name: 'Red Apple', keywords: ['apple', 'red apple'], type: 'food', color: '#ef4444', scale: 0.08, surfaceAnchor: 'table' },
      { name: 'Carrot', keywords: ['carrot', 'golden carrot'], type: 'food', color: '#f97316', scale: 0.15, surfaceAnchor: 'table' },
      { name: 'Cheese', keywords: ['cheese'], type: 'food', color: '#facc15', scale: 0.12, surfaceAnchor: 'table' },
      { name: 'Treasure Chest', keywords: ['chest', 'treasure', 'treasure chest'], type: 'prop', color: '#78350f', scale: 0.35, surfaceAnchor: 'floor' },
      { name: 'Ancient Book', keywords: ['book', 'spellbook', 'diary'], type: 'prop', color: '#3b82f6', scale: 0.22, surfaceAnchor: 'table' },
      { name: 'Magic Ball', keywords: ['ball', 'orb', 'crystal ball'], type: 'prop', color: '#ec4899', scale: 0.15, surfaceAnchor: 'floor' },
      { name: 'Pine Tree', keywords: ['tree'], type: 'nature', color: '#15803d', scale: 1.8, surfaceAnchor: 'floor' },
      { name: 'Forest Rock', keywords: ['rock', 'stone', 'boulder'], type: 'nature', color: '#64748b', scale: 0.30, surfaceAnchor: 'floor' },
      { name: 'Flower', keywords: ['flower', 'rose'], type: 'nature', color: '#f43f5e', scale: 0.20, surfaceAnchor: 'floor' },
      { name: 'Bush', keywords: ['bush', 'shrub'], type: 'nature', color: '#166534', scale: 0.35, surfaceAnchor: 'floor' },
      { name: 'Spaceship', keywords: ['spaceship', 'saucer', 'rocket', 'ship'], type: 'vehicle', color: '#94a3b8', scale: 0.40, surfaceAnchor: 'floor' }
    ];

    objectDefinitions.forEach(def => {
      for (const kw of def.keywords) {
        if (lower.includes(kw) && !found.has(def.name)) {
          found.add(def.name);
          objects.push({
            id: `obj_${objects.length}`,
            name: def.name,
            type: def.type,
            appearance: def.name,
            color: def.color,
            scale: def.scale,
            surfaceAnchor: def.surfaceAnchor
          });
          break;
        }
      }
    });

    return objects;
  }

  private static extractEnvironment(text: string): StoryEnvironment {
    const lower = text.toLowerCase();

    if (lower.includes('forest') || lower.includes('woods') || lower.includes('jungle')) {
      return {
        theme: 'forest',
        mood: 'mystical and adventurous',
        virtualElements: ['trees', 'bushes', 'rocks', 'leaves'],
        isHybrid: true
      };
    }
    if (lower.includes('beach') || lower.includes('ocean') || lower.includes('sea') || lower.includes('island')) {
      return {
        theme: 'beach',
        mood: 'sunny and breezy',
        virtualElements: ['sand', 'rocks', 'shells', 'waves'],
        isHybrid: true
      };
    }
    if (lower.includes('space') || lower.includes('planet') || lower.includes('stars') || lower.includes('galaxy')) {
      return {
        theme: 'space',
        mood: 'cosmic and mysterious',
        virtualElements: ['stars', 'asteroids', 'cosmic dust'],
        isHybrid: true
      };
    }
    if (lower.includes('castle') || lower.includes('dungeon') || lower.includes('palace')) {
      return {
        theme: 'castle',
        mood: 'majestic',
        virtualElements: ['crystals', 'pillars', 'magic dust'],
        isHybrid: true
      };
    }

    // Default: living room with hybrid AR sparkles
    return {
      theme: 'room',
      mood: 'playful and cozy',
      virtualElements: ['sparkles'],
      isHybrid: true
    };
  }

  private static extractActionPhrases(text: string): string[] {
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    return sentences;
  }
}
