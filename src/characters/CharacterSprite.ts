import * as THREE from 'three';
import type { StoryCharacter, CharacterActionType, EmotionType, Position3D } from '../types/story';
import type { CharacterRenderState } from './CharacterFactory';
import { CharacterFactory } from './CharacterFactory';

export class CharacterSprite {
  public character: StoryCharacter;
  public group: THREE.Group;
  public mesh: THREE.Mesh;
  public shadowMesh: THREE.Mesh;
  
  private canvas: HTMLCanvasElement;
  private texture: THREE.CanvasTexture;
  private material: THREE.MeshBasicMaterial;
  private shadowMaterial: THREE.MeshBasicMaterial;
  
  // Animation & Rendering state
  private state: CharacterRenderState;
  private lastState: CharacterRenderState;
  private currentAction: CharacterActionType = 'idle';
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  
  // Timers
  private actionTime: number = 0;
  private blinkTimer: number = 2.0;
  private isBlinking: boolean = false;
  private blinkDuration: number = 0.15;
  
  // Appearance & visibility
  private targetOpacity: number = 1.0;
  private currentOpacity: number = 1.0;
  private targetScale: THREE.Vector3 = new THREE.Vector3(0.7, 0.7, 0.7);
  private facingDirection: number = 1; // 1 = right, -1 = left

  constructor(character: StoryCharacter) {
    this.character = character;
    this.group = new THREE.Group();

    // Initial render state
    this.state = {
      emotion: character.emotion || 'happy',
      mouthOpen: false,
      wavePhase: 0,
      blink: false,
      tilt: 0
    };
    this.lastState = { ...this.state };

    // Canvas & Texture
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 512;
    CharacterFactory.renderCharacterToCanvas(this.character, this.state, this.canvas);

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;

    // Plane mesh for character
    const geometry = new THREE.PlaneGeometry(1.0, 1.0);
    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.y = 0.5;
    this.group.add(this.mesh);

    // Subtle soft ground shadow
    const shadowGeo = new THREE.PlaneGeometry(0.6, 0.25);
    this.shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.25,
      depthWrite: false
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, this.shadowMaterial);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.01;
    this.group.add(this.shadowMesh);

    this.group.scale.copy(this.targetScale);
  }

  private normalizeAction(act: string): CharacterActionType {
    const a = (act || '').toLowerCase();
    if (['walk', 'step', 'follow', 'chase', 'march', 'approach'].includes(a)) return 'walk';
    if (['run', 'dash', 'sprint', 'rush'].includes(a)) return 'run';
    if (['talk', 'speak', 'say', 'shout', 'whisper', 'tell'].includes(a)) return 'talk';
    if (['wave', 'greet', 'hello', 'bye', 'salute'].includes(a)) return 'wave';
    if (['jump', 'hop', 'leap', 'bounce'].includes(a)) return 'jump';
    if (['fly', 'float', 'hover', 'glide', 'soar'].includes(a)) return 'fly';
    if (['look', 'turn', 'face', 'listen', 'watch'].includes(a)) return 'turn';
    if (['appear', 'enter', 'arrive', 'spawn'].includes(a)) return 'appear';
    if (['disappear', 'leave', 'exit', 'hide', 'crouch'].includes(a)) return 'disappear';
    if (['happy', 'smile', 'dance', 'cheer', 'celebrate', 'laugh'].includes(a)) return 'happy';
    if (['sad', 'cry', 'frown', 'droop'].includes(a)) return 'sad';
    if (['surprised', 'gasp', 'shock', 'startled'].includes(a)) return 'surprised';
    return 'idle';
  }

  public setAction(action: CharacterActionType | string, targetPos?: Position3D, emotion?: EmotionType) {
    const normalized = this.normalizeAction(action);
    this.currentAction = normalized;
    this.actionTime = 0;

    if (emotion) {
      this.state.emotion = emotion;
    }

    if (targetPos) {
      this.targetPosition.set(targetPos.x, targetPos.y, targetPos.z);
      const dx = targetPos.x - this.group.position.x;
      if (Math.abs(dx) > 0.05) {
        this.facingDirection = dx > 0 ? 1 : -1;
      }
    }

    if (normalized === 'appear') {
      this.currentOpacity = 0.0;
      this.targetOpacity = 1.0;
      this.group.scale.set(0.1, 0.1, 0.1);
    } else if (normalized === 'disappear') {
      this.targetOpacity = 0.0;
    } else if (normalized === 'turn') {
      this.facingDirection *= -1;
    }
  }

  public setEmotion(emotion: EmotionType) {
    this.state.emotion = emotion;
  }

  public setPosition(pos: Position3D) {
    this.group.position.set(pos.x, pos.y, pos.z);
    this.targetPosition.copy(this.group.position);
  }

  public update(delta: number, camera: THREE.Camera) {
    this.actionTime += delta;

    // Face camera (billboard effect around Y axis)
    this.group.quaternion.copy(camera.quaternion);

    // Flip horizontal based on facing direction
    this.mesh.scale.x = this.facingDirection;

    // Blink logic
    this.blinkTimer -= delta;
    if (this.blinkTimer <= 0) {
      this.isBlinking = true;
      if (this.blinkTimer <= -this.blinkDuration) {
        this.isBlinking = false;
        this.blinkTimer = 2.0 + Math.random() * 3.5;
      }
    }
    this.state.blink = this.isBlinking;

    // Opacity & Scale transitions
    this.currentOpacity += (this.targetOpacity - this.currentOpacity) * Math.min(delta * 5, 1);
    this.material.opacity = this.currentOpacity;
    this.shadowMaterial.opacity = this.currentOpacity * 0.25;

    // Action-specific animation loops
    this.handleActionAnimation(delta);

    // Re-render canvas texture only when render state meaningfully changes
    const shouldRedraw = 
      this.state.blink !== this.lastState.blink ||
      this.state.mouthOpen !== this.lastState.mouthOpen ||
      this.state.emotion !== this.lastState.emotion ||
      Math.abs(this.state.wavePhase - this.lastState.wavePhase) > 0.4 ||
      Math.abs(this.state.tilt - this.lastState.tilt) > 0.08;

    if (shouldRedraw) {
      CharacterFactory.renderCharacterToCanvas(this.character, this.state, this.canvas);
      this.texture.needsUpdate = true;
      this.lastState = { ...this.state };
    }
  }

  private handleActionAnimation(delta: number) {
    let bounceY = 0;
    let tilt = 0;
    let mouth = false;
    let wave = 0;

    switch (this.currentAction) {
      case 'idle':
        bounceY = Math.sin(this.actionTime * 2.5) * 0.02;
        tilt = Math.sin(this.actionTime * 1.5) * 0.03;
        break;

      case 'walk':
        this.group.position.lerp(this.targetPosition, Math.min(delta * 2.0, 0.1));
        bounceY = Math.abs(Math.sin(this.actionTime * 8)) * 0.08;
        tilt = Math.sin(this.actionTime * 8) * 0.08;
        break;

      case 'run':
        this.group.position.lerp(this.targetPosition, Math.min(delta * 3.5, 0.15));
        bounceY = Math.abs(Math.sin(this.actionTime * 14)) * 0.14;
        tilt = Math.sin(this.actionTime * 14) * 0.15;
        break;

      case 'talk':
        mouth = Math.sin(this.actionTime * 12) > 0;
        tilt = Math.sin(this.actionTime * 3) * 0.05;
        bounceY = Math.sin(this.actionTime * 5) * 0.03;
        break;

      case 'wave':
        wave = this.actionTime * 10;
        bounceY = Math.sin(this.actionTime * 4) * 0.03;
        tilt = Math.sin(this.actionTime * 3) * 0.04;
        break;

      case 'jump':
        const jumpProgress = (this.actionTime % 1.2) / 1.2;
        bounceY = Math.sin(jumpProgress * Math.PI) * 0.45;
        tilt = Math.sin(jumpProgress * Math.PI * 2) * 0.1;
        break;

      case 'fly':
        this.group.position.lerp(this.targetPosition, Math.min(delta * 1.5, 0.08));
        bounceY = Math.sin(this.actionTime * 3) * 0.15;
        tilt = Math.sin(this.actionTime * 2) * 0.12;
        wave = this.actionTime * 8;
        break;

      case 'happy':
        bounceY = Math.abs(Math.sin(this.actionTime * 10)) * 0.12;
        tilt = Math.sin(this.actionTime * 6) * 0.1;
        wave = this.actionTime * 6;
        break;

      case 'sad':
        bounceY = -0.05 + Math.sin(this.actionTime * 1.2) * 0.01;
        tilt = 0.05;
        break;

      case 'surprised':
        bounceY = Math.max(0, Math.sin(Math.min(this.actionTime * 8, Math.PI)) * 0.15);
        tilt = 0;
        break;

      case 'eat':
      case 'drink':
        mouth = Math.sin(this.actionTime * 8) > 0;
        tilt = 0.12 + Math.sin(this.actionTime * 6) * 0.08;
        bounceY = -0.04 + Math.sin(this.actionTime * 6) * 0.015;
        break;

      case 'sit':
        bounceY = -0.12;
        tilt = -0.04;
        break;

      case 'read':
        tilt = 0.08;
        bounceY = -0.02 + Math.sin(this.actionTime * 1.5) * 0.01;
        break;

      case 'climb':
      case 'chase':
        this.group.position.lerp(this.targetPosition, Math.min(delta * 3.0, 0.12));
        bounceY = Math.abs(Math.sin(this.actionTime * 12)) * 0.1;
        tilt = Math.sin(this.actionTime * 12) * 0.12;
        wave = this.actionTime * 10;
        break;

      case 'appear':
        this.group.scale.lerp(this.targetScale, Math.min(delta * 6, 1));
        bounceY = Math.sin(this.actionTime * 4) * 0.04;
        break;

      case 'disappear':
        this.group.scale.lerp(new THREE.Vector3(0.01, 0.01, 0.01), Math.min(delta * 5, 1));
        break;

      default:
        bounceY = Math.sin(this.actionTime * 2) * 0.02;
        break;
    }

    this.mesh.position.y = 0.5 + bounceY;
    this.state.tilt = tilt;
    this.state.mouthOpen = mouth;
    this.state.wavePhase = wave;

    const shadowScale = Math.max(0.2, 1 - bounceY * 1.5);
    this.shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
  }

  public dispose() {
    this.material.dispose();
    this.shadowMaterial.dispose();
    this.texture.dispose();
  }
}
