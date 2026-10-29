import * as THREE from 'three';
import type { StoryData, StoryScene, CharacterAction, Position3D, RealWorldSurface } from '../types/story';
import { Character3D } from '../characters/Character3D';
import { VoiceManager } from '../audio/VoiceManager';
import { SpatialDialogue } from '../dialogue/SpatialDialogue';
import { AssetGenerator, disposeObject, fitModel } from '../assets/AssetGenerator';

export interface StoryEngineEvents {
  onSceneChange: (sceneIndex: number, scene: StoryScene) => void;
  onSubtitleChange: (subtitle: { speaker: string; text: string; characterId?: string; isDialogue: boolean } | null) => void;
  onStoryComplete: () => void; onPlayStateChange: (playing: boolean) => void;
}
interface Step { action: CharacterAction; target: THREE.Vector3; duration: number; }
export class StoryEngine {
  readonly story: StoryData;
  readonly charactersMap = new Map<string, Character3D>();
  readonly objectsMap = new Map<string, THREE.Group>();
  readonly bubbles = new Map<string, SpatialDialogue>();
  currentSceneIndex = 0;
  private root: THREE.Group;
  private world: THREE.Scene;
  private voice: VoiceManager;
  private events: StoryEngineEvents;
  private assets = new AssetGenerator();
  private playing = false;
  private finished = false;
  private disposed = false;
  private elapsed = 0;
  private stepElapsed = 0;
  private steps: Step[] = [];
  private current: Step | null = null;
  private actionQueue: CharacterAction[] = [];
  private dialogue: { characterId: string; text: string }[] = [];
  private supports = new Map<string, THREE.Vector3>();
  private environment = new THREE.Group();
  private originalObjects = new Map<string, { position: THREE.Vector3; scale: THREE.Vector3 }>();
  private carried = new Map<string, string>();
  private generation = 0;

  constructor(story: StoryData, voice: VoiceManager, events: StoryEngineEvents, root: THREE.Group, world: THREE.Scene) {
    this.story = story; this.voice = voice; this.events = events; this.root = root; this.world = world;
    story.characters.forEach(c => {
      const character = new Character3D(c); this.charactersMap.set(c.id, character); root.add(character.group);
      if (c.voice) voice.registerCustomVoice(c.id, c.voice);
      voice.getOrCreateVoiceProfile(c.id, c.type);
      if (typeof document !== 'undefined') { const bubble = new SpatialDialogue(); this.bubbles.set(c.id, bubble); world.add(bubble.group); }
    });
    for (const item of story.objects || []) {
      const object = this.assets.createObject(item); root.add(object); this.objectsMap.set(item.id, object);
      if (item.modelUrl) void this.assets.provider.load(item.modelUrl).then(gltf => {
        if (this.disposed) { disposeObject(gltf.scene); return; }
        fitModel(gltf.scene, item.scale || 0.3, item.type === 'furniture');
        [...object.children].forEach(disposeObject); object.add(gltf.scene); object.userData.assetSource = 'GLB';
      }).catch(() => { object.userData.assetSource = 'procedural fallback (GLB unavailable)'; });
    }
    // Each environment element is an independent entity. Arbitrary themes may supply their own list.
    (story.environment?.virtualElements || []).slice(0, 24).forEach((name, i, elements) => {
      const object = this.assets.createObject({ id: `environment_${i}`, name, type: 'nature', appearance: name,
        placeholder: !/tree|bush|rock|flower|plant|water|wave|sand|star|planet|asteroid|building|road|sign|leaves|fish/.test(name) });
      const angle = (i / Math.max(elements.length, 1)) * Math.PI * 1.5 + Math.PI / 4;
      object.position.set(Math.cos(angle) * 1.8, 0, Math.sin(angle) * -1.8 - 0.8); this.environment.add(object);
    });
    root.add(this.environment); this.bindSurfaces([]); this.resetState();
  }
  bindSurfaces(surfaces: RealWorldSurface[]) {
    this.supports.clear(); this.root.updateWorldMatrix(true, true);
    const sorted = [...surfaces].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    for (const s of sorted) {
      const point = this.root.worldToLocal(new THREE.Vector3(s.position.x, s.position.y, s.position.z));
      const key = s.type === 'desk' ? 'table' : s.type;
      if (!this.supports.has(key)) {
        this.supports.set(key, point);
      }
    }
    this.supports.set('floor', new THREE.Vector3(0, 0, 0));
    let index = 0;
    for (const item of this.story.objects || []) {
      const object = this.objectsMap.get(item.id)!;
      const kind = /table|desk/i.test(item.name) ? 'table' : /chair/i.test(item.name) ? 'chair' : '';
      const real = kind ? this.supports.get(kind) : undefined;
      object.userData.physical = !!real;
      object.visible = !real;
      if (real) {
        object.position.copy(real!); this.supports.set(item.id, real!.clone());
      } else {
        object.position.set(kind === 'table' ? 0.3 : kind === 'chair' ? 1.05 : -0.35 + index++ * 0.22, 0, kind ? -0.3 : 0.2);
        if (item.initialPosition) object.position.copy(new THREE.Vector3(item.initialPosition.x, item.initialPosition.y, item.initialPosition.z));
        if (kind) {
          const top = object.position.clone();
          top.y += kind === 'chair' ? (item.scale || 0.85) * 0.52 : (item.scale || 0.75);
          this.supports.set(kind, top); this.supports.set(item.id, top.clone());
        }
      }
    }
    for (const item of this.story.objects || []) {
      const object = this.objectsMap.get(item.id)!;
      if (!object.userData.physical && item.surfaceAnchor && !['floor', 'ground'].includes(item.surfaceAnchor)) {
        const support = this.supports.get(item.surfaceAnchor);
        if (support) { object.position.copy(support); object.position.x += 0.15; }
      }
      this.originalObjects.set(item.id, { position: object.position.clone(), scale: object.scale.clone() });
    }
  }
  private resetState() {
    this.carried.clear();
    let index = 0;
    this.charactersMap.forEach((character, id) => {
      character.setPosition({ x: -0.65 + index++ * 0.65, y: 0, z: 0.25 }); character.setAction('idle');
      const firstScene = this.story.scenes.findIndex(s => s.actions.some(a => a.characterId === id));
      character.group.visible = firstScene <= 0;
    });
    this.objectsMap.forEach((object, id) => {
      const initial = this.originalObjects.get(id)!;
      object.position.copy(initial.position); object.scale.copy(initial.scale); object.visible = !object.userData.physical;
    });
    this.bubbles.forEach(b => b.hide());
  }
  start() {
    this.generation++; this.voice.stop(); this.resetState(); this.finished = false; this.playing = true;
    this.events.onPlayStateChange(true); this.loadScene(0);
  }
  restart() { this.start(); }
  pause() { this.playing = false; this.voice.pause(); this.events.onPlayStateChange(false); }
  resume() { if (this.finished) return this.restart(); this.playing = true; this.voice.resume(); this.events.onPlayStateChange(true); }
  getIsPlaying() { return this.playing; }
  getIsFinished() { return this.finished; }
  private loadScene(index: number) {
    this.currentSceneIndex = index; this.elapsed = 0; this.current = null; this.steps = [];
    const scene = this.story.scenes[index];
    this.actionQueue = [...scene.actions]; this.dialogue = [...scene.dialogue]; this.events.onSceneChange(index, scene);
    if (scene.narration) {
      this.events.onSubtitleChange({ speaker: 'Narrator', text: scene.narration, isDialogue: false });
      this.voice.speak(scene.narration, 'narrator', 'narrator', { onEnd: () => this.events.onSubtitleChange(null) });
    }
    this.nextAction();
  }
  private targetFor(action: CharacterAction, character: Character3D) {
    const object = action.targetObjectId ? this.objectsMap.get(action.targetObjectId) : undefined;
    const support = this.supports.get(action.targetObjectId || '') || this.supports.get(action.targetSurface || '');
    let target = character.group.position.clone();
    if (object) target.copy(support || object.position);
    else if (support && action.targetSurface !== 'floor') target.copy(support);
    else if (action.targetPosition) target.set(action.targetPosition.x, action.targetPosition.y, action.targetPosition.z);
    else if (['walk', 'run', 'fly'].includes(action.action)) target.x += 0.4;
    if (action.action === 'fly') target.y += 0.65;
    if (object && ['walk', 'eat', 'drink', 'read', 'pick', 'chase'].includes(action.action)) target.x -= 0.13;
    if (action.action === 'jump') target.x -= 0.2;
    return target;
  }
  private nextAction() {
    if (!this.steps.length) {
      const action = this.actionQueue.shift(); if (!action) { this.current = null; return; }
      const character = this.charactersMap.get(action.characterId); if (!character) { this.nextAction(); return; }
      const target = this.targetFor(action, character); const duration = action.duration || 2.4;
      if (['eat', 'drink', 'read', 'pick', 'sit'].includes(action.action) && target.distanceTo(character.group.position) > 0.08) {
        const needsJump = (target.y - character.group.position.y) > 0.25;
        const walkOrJump = needsJump ? 'jump' : (character.character.type === 'bird' ? 'fly' : 'walk');
        this.steps.push({ action: { ...action, action: walkOrJump }, target: target.clone(), duration: 1.8 });
      }
      this.steps.push({ action, target, duration });
    }
    this.current = this.steps.shift()!; this.stepElapsed = 0;
    const { action, target, duration } = this.current;
    const character = this.charactersMap.get(action.characterId)!; character.group.visible = action.action !== 'disappear';
    if (action.action === 'fly' && character.group.position.y === 0) character.setPosition({ x: -1.3, y: 0.9, z: 0 });
    const targetObj = action.targetObjectId ? this.objectsMap.get(action.targetObjectId) : undefined;
    character.setAction(
      action.action === 'chase' ? 'run' : action.action,
      target,
      action.emotion,
      targetObj ? targetObj.position : undefined,
      duration
    );
  }
  update(delta: number, camera?: THREE.Camera) {
    if (!this.playing || this.finished || this.disposed) { if (camera) this.updateBubbles(camera); return; }
    this.elapsed += delta; this.voice.update(delta);
    this.charactersMap.forEach(c => c.update(delta, camera || new THREE.PerspectiveCamera()));
    if (this.current) {
      this.stepElapsed += delta;
      const { action, target, duration } = this.current;
      const character = this.charactersMap.get(action.characterId)!;
      const object = action.targetObjectId ? this.objectsMap.get(action.targetObjectId) : undefined;
      if (object && ['eat', 'drink', 'pick', 'read'].includes(action.action)) {
        const mouth = this.root.worldToLocal(character.getHeadWorldPosition()); mouth.y -= 0.025;
        object.position.lerp(mouth, Math.min(1, delta * 8));
        if (action.action === 'eat') {
          const original = this.originalObjects.get(action.targetObjectId!)!.scale;
          object.scale.copy(original).multiplyScalar(Math.max(0.02, 1 - this.stepElapsed / duration));
        }
      }
      if (object && action.action === 'chase') object.position.x += delta * 0.15;
      if (this.stepElapsed >= duration) {
        if (['walk', 'run', 'jump', 'fly', 'climb'].includes(action.action)) character.setPosition(target as Position3D);
        if (object && action.action === 'eat') object.visible = false;
        if (object && action.action === 'pick') this.carried.set(action.targetObjectId!, action.characterId);
        character.setAction(action.action === 'sit' ? 'sit' : 'idle'); this.nextAction();
      }
    }
    for (const [objectId, characterId] of this.carried) this.objectsMap.get(objectId)!.position.copy(this.root.worldToLocal(this.charactersMap.get(characterId)!.getHeadWorldPosition()));
    if (!this.current && !this.voice.isSpeaking()) {
      if (this.dialogue.length) this.speakNext();
      else if (this.elapsed >= (this.story.scenes[this.currentSceneIndex].duration || 3)) {
        if (this.currentSceneIndex + 1 < this.story.scenes.length) this.loadScene(this.currentSceneIndex + 1);
        else { this.finished = true; this.playing = false; this.events.onPlayStateChange(false); this.events.onStoryComplete(); }
      }
    }
    if (camera) this.updateBubbles(camera);
  }
  private speakNext() {
    const item = this.dialogue.shift()!; const character = this.charactersMap.get(item.characterId);
    if (!character) return;
    const generation = this.generation; const bubble = this.bubbles.get(item.characterId);
    this.voice.speak(item.text, item.characterId, character.character.type, {
      onStart: () => {
        character.setAction('talk');
        bubble?.show(character.character.name, item.text, character.character.color);
        this.events.onSubtitleChange({ speaker: character.character.name, text: item.text, characterId: item.characterId, isDialogue: true });
      },
      onEnd: () => {
        if (generation !== this.generation) return;
        bubble?.hide();
        character.setAction('idle');
        this.events.onSubtitleChange(null);
      },
    });
  }
  private updateBubbles(camera: THREE.Camera) {
    this.root.updateWorldMatrix(true, true);
    this.bubbles.forEach((bubble, id) => bubble.update(this.charactersMap.get(id)!.getHeadWorldPosition(), camera));
  }
  dispose() {
    this.disposed = true; this.generation++; this.playing = false; this.voice.stop();
    this.charactersMap.forEach(c => { c.dispose(); c.group.removeFromParent(); });
    this.objectsMap.forEach(disposeObject); disposeObject(this.environment);
    this.bubbles.forEach(b => { b.dispose(); this.world.remove(b.group); });
  }
}
