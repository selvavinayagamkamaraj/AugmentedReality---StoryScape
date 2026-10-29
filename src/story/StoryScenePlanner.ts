import type { 
  StoryData, 
  StoryScene, 
  RoomEnvironment, 
  Position3D, 
  RealWorldSurface 
} from '../types/story';
import type { ParsedNLPStory } from './NLPParser';

export class StoryScenePlanner {
  /**
   * Environment-Aware Scene Planner:
   * Synthesizes Story Semantics + Real-World Physical Surfaces into an AR Scene Execution Plan
   */
  public static planScene(parsed: ParsedNLPStory, room: RoomEnvironment): StoryData {
    // 1. Resolve physical surfaces from environment representation
    const tableSurface = room.surfaces.find(s => s.type === 'table') || {
      id: 'table_default',
      type: 'table',
      orientation: 'horizontal',
      height: 0.72,
      width: 1.1,
      depth: 0.75,
      position: { x: 0.45, y: 0.72, z: -1.5 },
      confidence: 0.9
    } as RealWorldSurface;

    const chairSurface = room.surfaces.find(s => s.type === 'chair') || {
      id: 'chair_default',
      type: 'chair',
      orientation: 'horizontal',
      height: 0.44,
      width: 0.5,
      depth: 0.5,
      position: { x: -0.55, y: 0.44, z: -1.4 },
      confidence: 0.85
    } as RealWorldSurface;

    const floorY = 0.0;

    // 2. Resolve object initial positions on physical surfaces
    const plannedObjects = (parsed.objects || []).map((obj, idx) => {
      let initialPos: Position3D;

      if (obj.surfaceAnchor === 'table') {
        // Place on table surface
        initialPos = {
          x: tableSurface.position.x + (idx === 0 ? 0.05 : (idx - 1) * 0.15),
          y: tableSurface.height,
          z: tableSurface.position.z
        };
      } else if (obj.surfaceAnchor === 'chair') {
        // Place on chair
        initialPos = {
          x: chairSurface.position.x,
          y: chairSurface.height,
          z: chairSurface.position.z
        };
      } else {
        // Place on floor
        initialPos = {
          x: (idx === 0 ? -0.8 : 0.8) + (idx > 1 ? (idx - 1) * 0.3 : 0),
          y: floorY,
          z: -1.8 - idx * 0.2
        };
      }

      return {
        ...obj,
        initialPosition: initialPos
      };
    });

    const primaryChar = parsed.characters[0];
    const secondaryChar = parsed.characters[1];

    // Check key semantic verbs in raw story
    const fullText = parsed.rawActions.join(' ').toLowerCase();
    const hasJumpToTable = fullText.includes('table') && (fullText.includes('jump') || fullText.includes('climb'));
    const hasEat = fullText.includes('eat') || fullText.includes('eats');
    const hasFly = fullText.includes('fly') || fullText.includes('flies') || (secondaryChar && secondaryChar.type === 'bird');

    const scenes: StoryScene[] = [];

    // SCENE 1: Introduction & Ground Movement
    scenes.push({
      scene_number: 1,
      title: `${primaryChar.name} Arrives`,
      duration: 6,
      narration: `${primaryChar.name} steps into the room, looking around curiously at the surroundings.`,
      actions: [
        {
          characterId: primaryChar.id,
          action: 'appear',
          targetPosition: { x: -0.8, y: floorY, z: -1.6 },
          emotion: 'happy'
        },
        {
          characterId: primaryChar.id,
          action: 'walk',
          targetPosition: { x: hasJumpToTable ? tableSurface.position.x - 0.35 : -0.2, y: floorY, z: -1.5 },
          emotion: 'happy'
        }
      ],
      dialogue: []
    });

    // SCENE 2: Surface Transition / Table Interaction
    if (hasJumpToTable) {
      scenes.push({
        scene_number: 2,
        title: 'Jumping Onto The Table',
        duration: 7,
        narration: `${primaryChar.name} spots the table, gathers energy, and leaps straight up onto the surface!`,
        actions: [
          {
            characterId: primaryChar.id,
            action: 'jump',
            targetPosition: { 
              x: tableSurface.position.x - 0.15, 
              y: tableSurface.height, 
              z: tableSurface.position.z 
            },
            targetSurface: 'table',
            emotion: 'happy'
          }
        ],
        dialogue: []
      });
    }

    // SCENE 3: Object Interaction & Dialogue
    const speechText = parsed.dialogues[0]?.text || "This is delicious!";
    if (hasEat) {
      scenes.push({
        scene_number: scenes.length + 1,
        title: 'A Tasty Treat',
        duration: 8,
        narration: `${primaryChar.name} walks over to the delicious treat, takes a bite, and smiles.`,
        actions: [
          {
            characterId: primaryChar.id,
            action: 'walk',
            targetPosition: { 
              x: tableSurface.position.x - 0.05, 
              y: tableSurface.height, 
              z: tableSurface.position.z 
            },
            emotion: 'happy'
          },
          {
            characterId: primaryChar.id,
            action: 'eat',
            targetObjectId: plannedObjects[0]?.id,
            emotion: 'happy'
          },
          {
            characterId: primaryChar.id,
            action: 'talk',
            emotion: 'happy'
          }
        ],
        dialogue: [
          {
            characterId: primaryChar.id,
            text: speechText
          }
        ]
      });
    } else {
      // General action & dialogue
      scenes.push({
        scene_number: scenes.length + 1,
        title: `${primaryChar.name} Speaks`,
        duration: 7,
        narration: `${primaryChar.name} explores the space and shares a joyful greeting.`,
        actions: [
          {
            characterId: primaryChar.id,
            action: 'wave',
            emotion: 'happy'
          },
          {
            characterId: primaryChar.id,
            action: 'talk',
            emotion: 'happy'
          }
        ],
        dialogue: [
          {
            characterId: primaryChar.id,
            text: speechText
          }
        ]
      });
    }

    // SCENE 4: Secondary Character Arrival (e.g. Bird on Chair)
    if (secondaryChar) {
      const landsOnChair = fullText.includes('chair');
      const targetPos: Position3D = landsOnChair ? {
        x: chairSurface.position.x,
        y: chairSurface.height,
        z: chairSurface.position.z
      } : {
        x: 0.3,
        y: floorY,
        z: -1.4
      };

      scenes.push({
        scene_number: scenes.length + 1,
        title: `${secondaryChar.name} Enters the Scene`,
        duration: 7,
        narration: hasFly 
          ? `Suddenly, ${secondaryChar.name} flies into the room with graceful wings and lands gently on the chair!`
          : `Then, ${secondaryChar.name} arrives to join the adventure with a cheerful wave!`,
        actions: [
          {
            characterId: secondaryChar.id,
            action: hasFly ? 'fly' : 'walk',
            targetPosition: targetPos,
            targetSurface: landsOnChair ? 'chair' : 'floor',
            emotion: 'happy'
          },
          {
            characterId: primaryChar.id,
            action: 'look',
            targetPosition: targetPos,
            emotion: 'happy'
          }
        ],
        dialogue: [
          {
            characterId: secondaryChar.id,
            text: `Hello ${primaryChar.name}! What a wonderful day to explore!`
          }
        ]
      });
    }

    return {
      title: parsed.title,
      summary: `${parsed.title}: an environment-aware spatial AR adventure.`,
      characters: parsed.characters,
      objects: plannedObjects,
      environment: parsed.environment,
      scenes
    };
  }
}
