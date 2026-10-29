export type CharacterType = 
  | 'human' 
  | 'rabbit' 
  | 'cat' 
  | 'dog' 
  | 'robot' 
  | 'alien' 
  | 'bird'
  | 'butterfly' 
  | 'dragon'
  | 'bat'
  | 'spiderman'
  | 'hero'
  | 'generic'
  | (string & {});

export type CharacterActionType = 
  | 'idle' 
  | 'walk' 
  | 'run' 
  | 'talk' 
  | 'look' 
  | 'turn' 
  | 'wave' 
  | 'jump' 
  | 'appear' 
  | 'disappear' 
  | 'fly' 
  | 'happy' 
  | 'sad' 
  | 'surprised'
  | 'sit'
  | 'eat'
  | 'sleep'
  | 'climb'
  | 'drink'
  | 'read'
  | 'chase'
  | 'pick'
  | 'swing'
  | 'swoop'
  | 'crawl';

export type EmotionType = 'happy' | 'sad' | 'surprised' | 'idle';

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface VoiceProfile {
  gender: 'female' | 'male' | 'child' | 'creature' | 'robot';
  pitch: number; // 0.5 to 2.0
  speed: number; // 0.7 to 1.3
  timbre?: string;
  preferredVoice?: string;
}

export interface StoryCharacter {
  id: string;
  name: string;
  type: CharacterType;
  appearance: string;
  color?: string;
  emotion?: EmotionType;
  voice?: VoiceProfile;
  initialScale?: number; // Real-world scale in meters
  modelUrl?: string;
}

export type ObjectType = 
  | 'food' 
  | 'furniture' 
  | 'nature' 
  | 'prop' 
  | 'vehicle' 
  | 'tool';

export interface StoryObject3D {
  id: string;
  name: string;
  type: ObjectType;
  appearance: string;
  color?: string;
  scale?: number; // in meters (e.g. apple = 0.08)
  initialPosition?: Position3D;
  surfaceAnchor?: 'floor' | 'table' | 'chair' | 'ground';
  modelUrl?: string;
  placeholder?: boolean;
}

export interface CharacterAction {
  characterId: string;
  action: CharacterActionType;
  targetPosition?: Position3D;
  targetSurface?: 'floor' | 'table' | 'chair' | 'wall';
  targetObjectId?: string; // e.g. cat approaches 'apple'
  emotion?: EmotionType;
  duration?: number;
}

export interface DialogueItem {
  characterId: string;
  text: string;
}

export interface StoryScene {
  scene_number: number;
  title: string;
  duration: number; // in seconds
  narration?: string;
  actions: CharacterAction[];
  dialogue: DialogueItem[];
  objects?: StoryObject3D[];
}

export interface StoryEnvironment {
  mood?: string;
  theme?: 'room' | 'forest' | 'beach' | 'space' | 'castle' | 'village' | 'underwater' | string;
  virtualElements?: string[]; // e.g. ['trees', 'rocks', 'leaves', 'fog']
  isHybrid?: boolean; // whether to blend with physical room
}

export interface StoryData {
  title: string;
  summary: string;
  characters: StoryCharacter[];
  objects?: StoryObject3D[];
  environment?: StoryEnvironment;
  scenes: StoryScene[];
  originalPrompt?: string;
  warnings?: string[];
  nlpSource?: string;
  relationships?: { subject: string; predicate: string; object: string }[];
}

// Real-world Environment Understanding
export type SurfaceType = 'floor' | 'table' | 'desk' | 'chair' | 'bed' | 'wall' | 'couch' | 'unknown';

export interface RealWorldSurface {
  id: string;
  type: SurfaceType;
  orientation: 'horizontal' | 'vertical';
  height: number; // height relative to floor in meters
  width: number;
  depth: number;
  position: Position3D;
  confidence: number;
}

export interface RoomEnvironment {
  surfaces: RealWorldSurface[];
  lighting: {
    intensity: number;
    direction: [number, number, number];
    ambientColor?: string;
    temperature?: number;
  };
  depthAvailable: boolean;
  planesCount: number;
  lastUpdated: number;
}

export interface DiagnosticsState {
  cameraSupported: boolean;
  cameraActive: boolean;
  cameraFacing: string;
  webxrSupported: boolean;
  webxrActive: boolean;
  hitTestSupported: boolean;
  planeDetectionSupported: boolean;
  depthSensingSupported: boolean;
  lightEstimationSupported: boolean;
  gpuRenderer: string;
  threeVersion: string;
  aiBackendOnline: boolean;
  aiModel: string;
  ttsAvailable: boolean;
  isSecureContext: boolean;
  fps: number;
  planesDetected: number;
  sceneTriangles: number;
}

export interface OllamaHealthStatus {
  status: 'online' | 'offline';
  ollamaHost: string;
  currentModel: string;
  availableModels?: string[];
  message?: string;
}
