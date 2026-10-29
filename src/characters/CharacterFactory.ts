import * as THREE from 'three';
import type { StoryCharacter, CharacterType, EmotionType } from '../types/story';

export interface CharacterRenderState {
  emotion: EmotionType;
  mouthOpen: boolean;
  wavePhase: number;
  blink: boolean;
  tilt: number;
}

export class CharacterFactory {

  /**
   * Generates or updates a canvas with high-DPI 2D character art
   */
  public static renderCharacterToCanvas(
    character: StoryCharacter,
    state: CharacterRenderState,
    canvas?: HTMLCanvasElement
  ): HTMLCanvasElement {
    const size = 512;
    const targetCanvas = canvas || document.createElement('canvas');
    if (targetCanvas.width !== size || targetCanvas.height !== size) {
      targetCanvas.width = size;
      targetCanvas.height = size;
    }

    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return targetCanvas;

    ctx.clearRect(0, 0, size, size);
    ctx.save();

    // Center coordinates
    const cx = size / 2;
    const cy = size / 2;
    const primaryColor = character.color || this.getDefaultColor(character.type);

    // Apply tilt
    ctx.translate(cx, cy);
    ctx.rotate(state.tilt);
    ctx.translate(-cx, -cy);

    // Render type-specific body
    switch (character.type) {
      case 'alien':
        this.drawAlien(ctx, cx, cy, primaryColor, state);
        break;
      case 'human':
        this.drawHumanAstronaut(ctx, cx, cy, primaryColor, state, character.appearance);
        break;
      case 'rabbit':
        this.drawRabbit(ctx, cx, cy, primaryColor, state);
        break;
      case 'cat':
        this.drawCat(ctx, cx, cy, primaryColor, state);
        break;
      case 'dog':
        this.drawDog(ctx, cx, cy, primaryColor, state);
        break;
      case 'robot':
        this.drawRobot(ctx, cx, cy, primaryColor, state);
        break;
      case 'butterfly':
        this.drawButterfly(ctx, cx, cy, primaryColor, state);
        break;
      case 'spiderman':
        this.drawSpiderman(ctx, cx, cy, state);
        break;
      case 'bat':
        this.drawBat(ctx, cx, cy, state);
        break;
      case 'hero':
        this.drawSuperhero(ctx, cx, cy, primaryColor, state, character.appearance);
        break;
      case 'generic':
      default:
        this.drawGeneric(ctx, cx, cy, primaryColor, state);
        break;
    }

    // Name tag badge beneath character
    this.drawNameTag(ctx, cx, size - 36, character.name);

    ctx.restore();
    return targetCanvas;
  }

  public static createCharacterTexture(
    character: StoryCharacter,
    state: CharacterRenderState
  ): { texture: THREE.CanvasTexture; canvas: HTMLCanvasElement } {
    const canvas = this.renderCharacterToCanvas(character, state);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return { texture, canvas };
  }

  private static getDefaultColor(type: CharacterType): string {
    switch (type) {
      case 'human': return '#38bdf8';
      case 'alien': return '#4ade80';
      case 'rabbit': return '#f472b6';
      case 'cat': return '#fb923c';
      case 'dog': return '#eab308';
      case 'robot': return '#818cf8';
      case 'butterfly': return '#c084fc';
      case 'generic': default: return '#2dd4bf';
    }
  }

  // ALIEN
  private static drawAlien(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    color: string,
    state: CharacterRenderState
  ) {
    // Glow behind alien
    const radGlow = ctx.createRadialGradient(cx, cy, 30, cx, cy, 180);
    radGlow.addColorStop(0, 'rgba(74, 222, 128, 0.35)');
    radGlow.addColorStop(1, 'rgba(74, 222, 128, 0)');
    ctx.fillStyle = radGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, 180, 0, Math.PI * 2);
    ctx.fill();

    // Antennae
    const waveOffset = Math.sin(state.wavePhase) * 12;
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#22c55e';
    ctx.lineCap = 'round';

    // Left antenna
    ctx.beginPath();
    ctx.moveTo(cx - 40, cy - 90);
    ctx.quadraticCurveTo(cx - 70 + waveOffset, cy - 170, cx - 60 + waveOffset, cy - 180);
    ctx.stroke();

    // Right antenna
    ctx.beginPath();
    ctx.moveTo(cx + 40, cy - 90);
    ctx.quadraticCurveTo(cx + 70 - waveOffset, cy - 170, cx + 60 - waveOffset, cy - 180);
    ctx.stroke();

    // Antenna glowing orbs
    ctx.fillStyle = '#86efac';
    ctx.beginPath();
    ctx.arc(cx - 60 + waveOffset, cy - 180, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 60 - waveOffset, cy - 180, 18, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 50, 85, 95, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 50, 105, 90, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    const armWave = Math.sin(state.wavePhase) * 35;
    ctx.fillStyle = color;
    // Left arm
    ctx.beginPath();
    ctx.ellipse(cx - 85, cy + 30 + (state.wavePhase > 0 ? armWave : 0), 20, 45, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // Right arm (waves)
    ctx.beginPath();
    ctx.ellipse(cx + 85, cy + 30 - armWave, 20, 45, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Big expressive eyes (3 eyes for alien!)
    this.drawEye(ctx, cx - 55, cy - 55, 24, state.blink, state.emotion);
    this.drawEye(ctx, cx, cy - 80, 18, state.blink, state.emotion);
    this.drawEye(ctx, cx + 55, cy - 55, 24, state.blink, state.emotion);

    // Rosy cheeks
    ctx.fillStyle = 'rgba(244, 114, 182, 0.45)';
    ctx.beginPath();
    ctx.arc(cx - 65, cy - 25, 14, 0, Math.PI * 2);
    ctx.arc(cx + 65, cy - 25, 14, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    this.drawMouth(ctx, cx, cy - 15, state.mouthOpen, state.emotion);
  }

  // HUMAN / ASTRONAUT
  private static drawHumanAstronaut(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    color: string,
    state: CharacterRenderState,
    appearance: string
  ) {
    const isAstronaut = appearance.toLowerCase().includes('astronaut') || appearance.toLowerCase().includes('suit');

    // Backpack / Life support
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.roundRect(cx - 95, cy - 30, 190, 140, 20);
    ctx.fill();

    // Suit Body
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 60, 85, 95, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chest badge / accent
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(cx - 38, cy + 35, 76, 36, 10);
    ctx.fill();

    // Left arm & glove
    const armWave = Math.sin(state.wavePhase) * 35;
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(cx - 88, cy + 45, 22, 50, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx - 98, cy + 90, 18, 0, Math.PI * 2);
    ctx.fill();

    // Right arm & glove (waving)
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(cx + 88, cy + 30 - armWave, 22, 50, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx + 102, cy + 70 - armWave, 18, 0, Math.PI * 2);
    ctx.fill();

    // Boots
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.roundRect(cx - 65, cy + 130, 45, 30, 10);
    ctx.roundRect(cx + 20, cy + 130, 45, 30, 10);
    ctx.fill();

    // Helmet or Head
    if (isAstronaut) {
      // Big round bubble helmet
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(cx, cy - 60, 95, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Golden/blue glass visor
      const visorGrad = ctx.createLinearGradient(cx, cy - 120, cx, cy);
      visorGrad.addColorStop(0, '#38bdf8');
      visorGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = visorGrad;
      ctx.beginPath();
      ctx.roundRect(cx - 70, cy - 105, 140, 90, 45);
      ctx.fill();

      // Face inside visor
      this.drawEye(ctx, cx - 35, cy - 65, 16, state.blink, state.emotion);
      this.drawEye(ctx, cx + 35, cy - 65, 16, state.blink, state.emotion);
      this.drawMouth(ctx, cx, cy - 35, state.mouthOpen, state.emotion);

      // Glass shine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(cx - 30, cy - 85, 25, 10, -0.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Regular Human Head
      ctx.fillStyle = '#fed7aa'; // skin tone
      ctx.beginPath();
      ctx.arc(cx, cy - 50, 75, 0, Math.PI * 2);
      ctx.fill();

      // Hair
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(cx, cy - 70, 78, Math.PI, Math.PI * 2);
      ctx.fill();

      this.drawEye(ctx, cx - 30, cy - 50, 16, state.blink, state.emotion);
      this.drawEye(ctx, cx + 30, cy - 50, 16, state.blink, state.emotion);
      this.drawMouth(ctx, cx, cy - 25, state.mouthOpen, state.emotion);
    }
  }

  // RABBIT
  private static drawRabbit(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    color: string,
    state: CharacterRenderState
  ) {
    const waveOffset = Math.sin(state.wavePhase) * 10;
    // Long ears
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx - 40 + waveOffset, cy - 150, 24, 75, -0.2, 0, Math.PI * 2);
    ctx.ellipse(cx + 40 - waveOffset, cy - 150, 24, 75, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Inner pink ears
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.ellipse(cx - 40 + waveOffset, cy - 150, 14, 55, -0.2, 0, Math.PI * 2);
    ctx.ellipse(cx + 40 - waveOffset, cy - 150, 14, 55, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 60, 75, 85, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fluffy Head
    ctx.beginPath();
    ctx.arc(cx, cy - 35, 75, 0, Math.PI * 2);
    ctx.fill();

    // Cute pink nose
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(cx, cy - 20, 10, 0, Math.PI * 2);
    ctx.fill();

    // Whiskers
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy - 20); ctx.lineTo(cx - 80, cy - 30);
    ctx.moveTo(cx - 20, cy - 15); ctx.lineTo(cx - 80, cy - 10);
    ctx.moveTo(cx + 20, cy - 20); ctx.lineTo(cx + 80, cy - 30);
    ctx.moveTo(cx + 20, cy - 15); ctx.lineTo(cx + 80, cy - 10);
    ctx.stroke();

    this.drawEye(ctx, cx - 35, cy - 50, 16, state.blink, state.emotion);
    this.drawEye(ctx, cx + 35, cy - 50, 16, state.blink, state.emotion);
    this.drawMouth(ctx, cx, cy - 5, state.mouthOpen, state.emotion);
  }

  // CAT
  private static drawCat(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    color: string,
    state: CharacterRenderState
  ) {
    // Pointy cat ears
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - 75, cy - 60); ctx.lineTo(cx - 45, cy - 150); ctx.lineTo(cx - 15, cy - 80);
    ctx.moveTo(cx + 75, cy - 60); ctx.lineTo(cx + 45, cy - 150); ctx.lineTo(cx + 15, cy - 80);
    ctx.fill();

    // Inner ears
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.moveTo(cx - 65, cy - 65); ctx.lineTo(cx - 45, cy - 130); ctx.lineTo(cx - 25, cy - 80);
    ctx.moveTo(cx + 65, cy - 65); ctx.lineTo(cx + 45, cy - 130); ctx.lineTo(cx + 25, cy - 80);
    ctx.fill();

    // Tail waving
    const tailWave = Math.sin(state.wavePhase) * 20;
    ctx.strokeStyle = color;
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 60, cy + 100);
    ctx.quadraticCurveTo(cx - 130 + tailWave, cy + 60, cx - 110 + tailWave, cy - 10);
    ctx.stroke();

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 60, 75, 85, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.ellipse(cx, cy - 40, 80, 68, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 25); ctx.lineTo(cx + 8, cy - 25); ctx.lineTo(cx, cy - 16);
    ctx.fill();

    // Whiskers
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy - 20); ctx.lineTo(cx - 85, cy - 30);
    ctx.moveTo(cx - 20, cy - 15); ctx.lineTo(cx - 85, cy - 15);
    ctx.moveTo(cx + 20, cy - 20); ctx.lineTo(cx + 85, cy - 30);
    ctx.moveTo(cx + 20, cy - 15); ctx.lineTo(cx + 85, cy - 15);
    ctx.stroke();

    this.drawEye(ctx, cx - 35, cy - 50, 17, state.blink, state.emotion);
    this.drawEye(ctx, cx + 35, cy - 50, 17, state.blink, state.emotion);
    this.drawMouth(ctx, cx, cy - 6, state.mouthOpen, state.emotion);
  }

  // DOG
  private static drawDog(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    color: string,
    state: CharacterRenderState
  ) {
    const earWiggle = Math.sin(state.wavePhase) * 12;
    // Floppy ears
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.ellipse(cx - 75, cy - 30 + earWiggle, 28, 65, 0.3, 0, Math.PI * 2);
    ctx.ellipse(cx + 75, cy - 30 - earWiggle, 28, 65, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 60, 75, 85, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(cx, cy - 35, 75, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 15, 45, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 25, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    this.drawEye(ctx, cx - 35, cy - 55, 16, state.blink, state.emotion);
    this.drawEye(ctx, cx + 35, cy - 55, 16, state.blink, state.emotion);
    this.drawMouth(ctx, cx, cy - 5, state.mouthOpen, state.emotion);
  }

  // ROBOT
  private static drawRobot(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    color: string,
    state: CharacterRenderState
  ) {
    // Antenna
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 90); ctx.lineTo(cx, cy - 150);
    ctx.stroke();

    // Antenna LED beacon
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx, cy - 155, 15, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.roundRect(cx - 70, cy + 10, 140, 120, 16);
    ctx.fill();

    // Robot chest screen / gauges
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(cx - 45, cy + 30, 90, 70, 8);
    ctx.fill();
    // Meter line
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 35, cy + 65); ctx.lineTo(cx - 15, cy + 50); ctx.lineTo(cx + 10, cy + 80); ctx.lineTo(cx + 35, cy + 55);
    ctx.stroke();

    // Head
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(cx - 75, cy - 100, 150, 100, 20);
    ctx.fill();

    // Digital screen face
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(cx - 60, cy - 88, 120, 76, 12);
    ctx.fill();

    // LED Eyes
    const ledColor = '#38bdf8';
    ctx.fillStyle = ledColor;
    if (state.blink) {
      ctx.fillRect(cx - 45, cy - 55, 25, 4);
      ctx.fillRect(cx + 20, cy - 55, 25, 4);
    } else {
      ctx.beginPath();
      ctx.roundRect(cx - 45, cy - 65, 25, 22, 4);
      ctx.roundRect(cx + 20, cy - 65, 25, 22, 4);
      ctx.fill();
    }

    // LED Smile / Mouth
    ctx.strokeStyle = ledColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (state.mouthOpen) {
      ctx.roundRect(cx - 20, cy - 35, 40, 14, 4);
      ctx.stroke();
    } else {
      ctx.moveTo(cx - 25, cy - 30);
      ctx.lineTo(cx + 25, cy - 30);
      ctx.stroke();
    }
  }

  // BUTTERFLY
  private static drawButterfly(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    color: string,
    state: CharacterRenderState
  ) {
    const wingFlap = Math.abs(Math.sin(state.wavePhase * 2)) * 0.4 + 0.6;

    // Big fairy wings
    ctx.save();
    ctx.translate(cx, cy);

    // Left wings
    ctx.save();
    ctx.scale(wingFlap, 1);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(-70, -40, 65, 80, -0.4, 0, Math.PI * 2);
    ctx.ellipse(-55, 45, 50, 60, 0.4, 0, Math.PI * 2);
    ctx.fill();
    // Wing spots
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(-70, -40, 22, 0, Math.PI * 2);
    ctx.arc(-55, 45, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Right wings
    ctx.save();
    ctx.scale(wingFlap, 1);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(70, -40, 65, 80, 0.4, 0, Math.PI * 2);
    ctx.ellipse(55, 45, 50, 60, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // Wing spots
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(70, -40, 22, 0, Math.PI * 2);
    ctx.arc(55, 45, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // Butterfly body
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 20, 16, 65, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(cx, cy - 45, 26, 0, Math.PI * 2);
    ctx.fill();

    // Antennae
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 65); ctx.quadraticCurveTo(cx - 35, cy - 110, cx - 45, cy - 95);
    ctx.moveTo(cx + 8, cy - 65); ctx.quadraticCurveTo(cx + 35, cy - 110, cx + 45, cy - 95);
    ctx.stroke();

    this.drawEye(ctx, cx - 12, cy - 48, 8, state.blink, state.emotion);
    this.drawEye(ctx, cx + 12, cy - 48, 8, state.blink, state.emotion);
    this.drawMouth(ctx, cx, cy - 35, state.mouthOpen, state.emotion);
  }

  // GENERIC CHARACTER
  private static drawGeneric(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    color: string,
    state: CharacterRenderState
  ) {
    // Cute blob body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 95, 105, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hands
    const handWave = Math.sin(state.wavePhase) * 30;
    ctx.beginPath();
    ctx.arc(cx - 95, cy + 20, 22, 0, Math.PI * 2);
    ctx.arc(cx + 95, cy + 20 - handWave, 22, 0, Math.PI * 2);
    ctx.fill();

    // Rosy cheeks
    ctx.fillStyle = 'rgba(244, 114, 182, 0.4)';
    ctx.beginPath();
    ctx.arc(cx - 50, cy + 15, 15, 0, Math.PI * 2);
    ctx.arc(cx + 50, cy + 15, 15, 0, Math.PI * 2);
    ctx.fill();

    this.drawEye(ctx, cx - 35, cy - 25, 18, state.blink, state.emotion);
    this.drawEye(ctx, cx + 35, cy - 25, 18, state.blink, state.emotion);
    this.drawMouth(ctx, cx, cy + 15, state.mouthOpen, state.emotion);
  }

  // REUSABLE EYE DRAWING
  private static drawEye(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    blink: boolean,
    emotion: EmotionType
  ) {
    if (blink) {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - radius, y);
      ctx.lineTo(x + radius, y);
      ctx.stroke();
      return;
    }

    if (emotion === 'happy') {
      // Crescent happy eyes (^_^)
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x, y + 4, radius, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      return;
    }

    // Normal or Surprised wide eyes
    const eyeR = emotion === 'surprised' ? radius * 1.25 : radius;

    // Sclera
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Iris
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(x, y + (emotion === 'sad' ? 3 : 0), eyeR * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // Catchlight twinkle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - eyeR * 0.25, y - eyeR * 0.25, eyeR * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  // REUSABLE MOUTH DRAWING
  private static drawMouth(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    mouthOpen: boolean,
    emotion: EmotionType
  ) {
    ctx.fillStyle = '#f43f5e';
    ctx.strokeStyle = '#881337';
    ctx.lineWidth = 4;

    if (mouthOpen) {
      // Open talking mouth
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }

    if (emotion === 'sad') {
      // Downward frown
      ctx.beginPath();
      ctx.arc(x, y + 16, 16, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
      return;
    }

    if (emotion === 'surprised') {
      // Tiny O-shaped mouth
      ctx.beginPath();
      ctx.arc(x, y + 5, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      return;
    }

    // Warm happy smile
    ctx.beginPath();
    ctx.arc(x, y - 5, 16, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }

  // SPIDERMAN (Red & Blue hero suit with web lenses and spider emblem)
  private static drawSpiderman(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    state: CharacterRenderState
  ) {
    // Athletic heroic legs
    ctx.fillStyle = '#1e3a8a'; // Deep blue tights
    ctx.fillRect(cx - 36, cy + 80, 26, 75);
    ctx.fillRect(cx + 10, cy + 80, 26, 75);

    // Red boots
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(cx - 38, cy + 130, 30, 30);
    ctx.fillRect(cx + 8, cy + 130, 30, 30);

    // Torso (Blue obliques, red chest/abdomen)
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.roundRect(cx - 48, cy - 10, 96, 100, 16);
    ctx.fill();

    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(cx - 26, cy - 10, 52, 100, 8);
    ctx.fill();

    // Black spider emblem
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 30, 8, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Spider legs
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + side * 4, cy + 24 + i * 4);
        ctx.lineTo(cx + side * 22, cy + 16 + i * 8);
        ctx.stroke();
      }
    }

    // Hero arms
    ctx.fillStyle = '#dc2626';
    const waveOffset = Math.sin(state.wavePhase) * 20;
    // Left arm
    ctx.fillRect(cx - 72, cy + 8, 26, 70);
    // Right arm (raised waving / web-slinging)
    ctx.fillRect(cx + 46, cy + 8 - waveOffset, 26, 70);

    // Masked Head
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 65, 48, 56, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle web lines on mask
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 110);
    ctx.lineTo(cx, cy - 20);
    ctx.moveTo(cx - 40, cy - 65);
    ctx.lineTo(cx + 40, cy - 65);
    ctx.stroke();

    // Iconic Spiderman Eyes (Angular white lenses with thick black borders)
    for (const side of [-1, 1]) {
      const eyeX = cx + side * 20;
      const eyeY = cy - 68;

      // Black outer rim
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(eyeX - side * 14, eyeY - 14);
      ctx.lineTo(eyeX + side * 22, eyeY - 2);
      ctx.lineTo(eyeX - side * 6, eyeY + 16);
      ctx.closePath();
      ctx.fill();

      // White inner lens (blinks if state.blink)
      if (!state.blink) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(eyeX - side * 11, eyeY - 10);
        ctx.lineTo(eyeX + side * 16, eyeY - 2);
        ctx.lineTo(eyeX - side * 4, eyeY + 11);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // BAT (Nocturnal flyer with broad scalloped wings, fangs & pointed ears)
  private static drawBat(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    state: CharacterRenderState
  ) {
    // Large spread scalloped bat wings
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;

    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + side * 20, cy + 10);
      ctx.quadraticCurveTo(cx + side * 110, cy - 70, cx + side * 170, cy - 10);
      ctx.quadraticCurveTo(cx + side * 140, cy + 50, cx + side * 115, cy + 25);
      ctx.quadraticCurveTo(cx + side * 90, cy + 60, cx + side * 65, cy + 30);
      ctx.quadraticCurveTo(cx + side * 40, cy + 55, cx + side * 20, cy + 35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Fuzzy bat body
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 20, 36, 48, 0, 0, Math.PI * 2);
    ctx.fill();

    // Little claws
    ctx.fillStyle = '#64748b';
    ctx.fillRect(cx - 16, cy + 65, 8, 14);
    ctx.fillRect(cx + 8, cy + 65, 8, 14);

    // Pointed Bat Ears
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(cx + side * 12, cy - 40);
      ctx.lineTo(cx + side * 36, cy - 95);
      ctx.lineTo(cx + side * 44, cy - 35);
      ctx.closePath();
      ctx.fill();

      // Pink inner ear
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.moveTo(cx + side * 18, cy - 45);
      ctx.lineTo(cx + side * 34, cy - 82);
      ctx.lineTo(cx + side * 38, cy - 42);
      ctx.closePath();
      ctx.fill();
    }

    // Bat Head
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(cx, cy - 35, 36, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Eyes
    if (!state.blink) {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(cx - 14, cy - 38, 7, 0, Math.PI * 2);
      ctx.arc(cx + 14, cy - 38, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(cx - 14, cy - 38, 3, 0, Math.PI * 2);
      ctx.arc(cx + 14, cy - 38, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bat nose & fangs
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 26);
    ctx.lineTo(cx + 6, cy - 26);
    ctx.lineTo(cx, cy - 20);
    ctx.closePath();
    ctx.fill();

    // White vampire fangs
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy - 14);
    ctx.lineTo(cx - 5, cy - 6);
    ctx.lineTo(cx - 2, cy - 14);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + 2, cy - 14);
    ctx.lineTo(cx + 5, cy - 6);
    ctx.lineTo(cx + 9, cy - 14);
    ctx.fill();
  }

  // SUPERHERO (Caped champion with crest & heroic boots)
  private static drawSuperhero(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    color: string,
    state: CharacterRenderState,
    _appearance?: string
  ) {
    // Flowing Cape
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(cx - 40, cy);
    ctx.lineTo(cx - 75, cy + 150);
    ctx.lineTo(cx + 75, cy + 150);
    ctx.lineTo(cx + 40, cy);
    ctx.closePath();
    ctx.fill();

    // Hero body
    this.drawHumanAstronaut(ctx, cx, cy, color, state, 'hero');
  }

  // NAME BADGE
  private static drawNameTag(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    name: string
  ) {
    ctx.font = 'bold 28px "Segoe UI", Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textWidth = ctx.measureText(name).width;

    // Pill background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.beginPath();
    ctx.roundRect(x - textWidth / 2 - 20, y - 22, textWidth + 40, 44, 22);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(name, x, y);
  }
}
