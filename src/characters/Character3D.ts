import * as THREE from 'three';
import type { StoryCharacter, CharacterActionType, EmotionType, Position3D } from '../types/story';
import { Character3DFactory } from './Character3DFactory';
import type { CharacterRigs3D } from './Character3DFactory';
import { LocalModelProvider, fitModel, disposeObject } from '../assets/AssetGenerator';

export class Character3D {
  public character: StoryCharacter;
  public group: THREE.Group;
  public rig: CharacterRigs3D;
  public shadowMesh: THREE.Mesh;

  // Animation & Transform state
  private currentAction: CharacterActionType = 'idle';
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private targetRotationY: number = 0;
  private actionTime: number = 0;

  private baseScale: number = 1.0;
  private baseBodyY = 0;
  private mixer: THREE.AnimationMixer | null = null;
  private clips: THREE.AnimationClip[] = [];
  private currentClipAction: THREE.AnimationAction | null = null;
  private loadedModel: THREE.Group | null = null;
  private disposed = false;

  // Motion interpolation
  private jumpStartPos: THREE.Vector3 = new THREE.Vector3();
  private jumpEndPos: THREE.Vector3 = new THREE.Vector3();
  private jumpDuration: number = 1.8;
  private jumpHeight: number = 0.45;
  private walkStartPos: THREE.Vector3 = new THREE.Vector3();
  private walkDuration: number = 1.8;

  constructor(character: StoryCharacter) {
    this.character = character;
    this.group = new THREE.Group();

    // 1. Build the stylized low-poly 3D mesh rig
    this.rig = Character3DFactory.createCharacter3D(character);
    this.group.add(this.rig.root);
    this.baseBodyY = this.rig.body.position.y;

    // 2. Contact shadow mesh (flat disc on surface)
    const shadowGeo = new THREE.CircleGeometry(0.15, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      depthWrite: false
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.005;
    this.group.add(this.shadowMesh);

    // Initial scale
    this.baseScale = (character.initialScale || (character.type === 'human' ? 1.7 : this.rig.height)) / this.rig.height;
    this.group.scale.set(this.baseScale, this.baseScale, this.baseScale);
    const bundled = ['cat', 'bird'].includes(character.type) ? `/models/${character.type}.glb` : undefined;
    if (typeof window !== 'undefined' && (character.modelUrl || bundled)) void this.loadModel(character.modelUrl || bundled!);
  }

  private async loadModel(url: string) {
    try {
      const gltf = await new LocalModelProvider().load(url);
      if (this.disposed) { disposeObject(gltf.scene); return; }
      fitModel(gltf.scene, this.rig.height, true);
      // Generated rigs use these default body colors; retain user-specified color.
      if (!this.character.modelUrl && this.character.color) gltf.scene.traverse(node => {
        if (node instanceof THREE.Mesh && node.material instanceof THREE.MeshStandardMaterial &&
          [0xfb923c, 0x38bdf8].includes(node.material.color.getHex())) node.material.color.set(this.character.color!);
      });
      this.loadedModel = gltf.scene; this.rig.root.visible = false; this.group.add(gltf.scene);
      this.clips = gltf.animations; this.mixer = new THREE.AnimationMixer(gltf.scene);
      this.playClip(this.currentAction); this.group.userData.assetSource = 'GLB';
    } catch { this.group.userData.assetSource = 'procedural fallback (GLB unavailable)'; }
  }
  private playClip(action: string, fadeDuration: number = 0.2) {
    if (!this.mixer) return;
    const clip = this.clips.find(c => c.name.toLowerCase().includes(action)) || this.clips.find(c => /idle/i.test(c.name));
    if (!clip) return;
    const nextAction = this.mixer.clipAction(clip);
    if (this.currentClipAction && this.currentClipAction !== nextAction) {
      nextAction.reset();
      nextAction.play();
      this.currentClipAction.crossFadeTo(nextAction, fadeDuration, true);
    } else {
      nextAction.reset().play();
    }
    this.currentClipAction = nextAction;
  }

  public setAction(
    action: CharacterActionType,
    targetPos?: Position3D,
    _emotion?: EmotionType,
    targetObjPos?: Position3D,
    duration?: number
  ) {
    this.currentAction = action;
    this.actionTime = 0;
    this.shadowMesh.position.y = 0.005;
    this.shadowMesh.scale.setScalar(1);
    this.rig.body.position.y = this.baseBodyY;
    this.rig.body.rotation.set(Math.PI / 2, 0, 0);
    this.rig.head.rotation.set(0, 0, 0);
    this.rig.head.scale.setScalar(1);
    this.rig.limbs.forEach(l => l.rotation.set(0, 0, 0));
    this.playClip(action);
    if (action === 'appear') this.group.visible = true;
    if (action === 'disappear') this.group.visible = false;
    if (action === 'jump' && !targetPos) targetPos = { ...this.group.position };

    if (duration && duration > 0) {
      this.jumpDuration = duration;
      this.walkDuration = duration;
    } else {
      this.jumpDuration = 1.8;
      this.walkDuration = 1.8;
    }

    if (targetPos) {
      if (action === 'jump') {
        this.jumpStartPos.copy(this.group.position);
        this.jumpEndPos.set(targetPos.x, targetPos.y, targetPos.z);
        // Face jump direction
        const dx = targetPos.x - this.group.position.x;
        const dz = targetPos.z - this.group.position.z;
        if (Math.hypot(dx, dz) > 0.01) {
          this.targetRotationY = Math.atan2(dx, dz);
        }
      } else {
        this.walkStartPos.copy(this.group.position);
        this.targetPosition.set(targetPos.x, targetPos.y, targetPos.z);
        const dx = targetPos.x - this.group.position.x;
        const dz = targetPos.z - this.group.position.z;
        if (Math.hypot(dx, dz) > 0.02) {
          this.targetRotationY = Math.atan2(dx, dz);
        }
      }
    }

    if ((action === 'eat' || action === 'drink' || action === 'pick') && targetObjPos) {
      // Face towards target food object directly
      const dx = targetObjPos.x - this.group.position.x;
      const dz = targetObjPos.z - this.group.position.z;
      if (Math.hypot(dx, dz) > 0.01) {
        this.targetRotationY = Math.atan2(dx, dz);
      }
    }
  }

  public setPosition(pos: Position3D) {
    this.group.position.set(pos.x, pos.y, pos.z);
    this.targetPosition.copy(this.group.position);
  }

  public lookAt(target: THREE.Vector3) {
    const dx = target.x - this.group.position.x;
    const dz = target.z - this.group.position.z;
    this.targetRotationY = Math.atan2(dx, dz);
  }

  public getHeadWorldPosition(): THREE.Vector3 {
    const headWorld = new THREE.Vector3();
    (this.loadedModel?.getObjectByName('head') || this.rig.head).getWorldPosition(headWorld);
    return headWorld;
  }

  public update(delta: number, camera: THREE.Camera) {
    this.actionTime += delta;

    // Smoothly turn character toward target heading
    const currentRot = this.group.rotation.y;
    let diff = this.targetRotationY - currentRot;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.group.rotation.y += diff * Math.min(delta * 8.0, 1.0);

    // Animate actions
    this.animateAction(delta);
    this.mixer?.update(delta);

    // If talking, turn slightly to face camera/user
    if (this.currentAction === 'talk') {
      const camPos = camera.getWorldPosition(new THREE.Vector3());
      this.group.parent?.worldToLocal(camPos);
      camPos.y = this.group.position.y;
      const toCam = camPos.sub(this.group.position);
      this.targetRotationY = Math.atan2(toCam.x, toCam.z);
    }
  }

  private animateAction(_delta: number) {
    const time = this.actionTime;
    const limbs = this.rig.limbs;
    const wings = this.rig.wings;
    const head = this.rig.head;
    const tail = this.rig.tail;

    switch (this.currentAction) {
      case 'idle': {
        // Gentle breathing bob + slow natural head sway
        this.rig.body.position.y = this.baseBodyY + Math.sin(time * 2.5) * 0.007;
        this.rig.body.rotation.set(Math.PI / 2, 0, 0);
        head.rotation.x = Math.sin(time * 1.5) * 0.04;
        head.rotation.y = Math.sin(time * 0.8) * 0.1;
        if (tail) tail.rotation.y = Math.sin(time * 2.0) * 0.18;
        limbs.forEach(l => l.rotation.set(0, 0, 0));
        break;
      }

      case 'walk': {
        const progress = Math.min(time / this.walkDuration, 1.0);
        const smooth = THREE.MathUtils.smoothstep(progress, 0, 1);
        this.group.position.x = THREE.MathUtils.lerp(this.walkStartPos.x, this.targetPosition.x, smooth);
        this.group.position.z = THREE.MathUtils.lerp(this.walkStartPos.z, this.targetPosition.z, smooth);
        this.group.position.y = THREE.MathUtils.lerp(this.walkStartPos.y, this.targetPosition.y, smooth);

        // Walking gait animation
        const walkCycle = time * 8.0;
        this.rig.body.position.y = this.baseBodyY + Math.abs(Math.sin(walkCycle)) * 0.018;
        this.rig.body.rotation.z = Math.sin(walkCycle) * 0.025;

        if (limbs.length >= 4) {
          // Quadruped diagonal gait: front-left + back-right, front-right + back-left
          limbs[0].rotation.x = Math.sin(walkCycle) * 0.55;
          limbs[1].rotation.x = -Math.sin(walkCycle) * 0.55;
          limbs[2].rotation.x = -Math.sin(walkCycle) * 0.55;
          limbs[3].rotation.x = Math.sin(walkCycle) * 0.55;
        } else if (limbs.length === 2) {
          // Biped leg cycle
          limbs[0].rotation.x = Math.sin(walkCycle) * 0.6;
          limbs[1].rotation.x = -Math.sin(walkCycle) * 0.6;
        }

        head.rotation.x = Math.sin(walkCycle * 2) * 0.03;
        if (tail) tail.rotation.y = Math.sin(walkCycle) * 0.35;
        break;
      }

      case 'run': {
        const progress = Math.min(time / this.walkDuration, 1.0);
        const smooth = THREE.MathUtils.smoothstep(progress, 0, 1);
        this.group.position.x = THREE.MathUtils.lerp(this.walkStartPos.x, this.targetPosition.x, smooth);
        this.group.position.z = THREE.MathUtils.lerp(this.walkStartPos.z, this.targetPosition.z, smooth);
        this.group.position.y = THREE.MathUtils.lerp(this.walkStartPos.y, this.targetPosition.y, smooth);

        const runCycle = time * 14.0;
        this.rig.body.position.y = this.baseBodyY + Math.abs(Math.sin(runCycle)) * 0.038;
        this.rig.body.rotation.z = Math.sin(runCycle) * 0.045;

        if (limbs.length >= 4) {
          limbs[0].rotation.x = Math.sin(runCycle) * 0.85;
          limbs[1].rotation.x = -Math.sin(runCycle) * 0.85;
          limbs[2].rotation.x = -Math.sin(runCycle) * 0.85;
          limbs[3].rotation.x = Math.sin(runCycle) * 0.85;
        } else if (limbs.length === 2) {
          limbs[0].rotation.x = Math.sin(runCycle) * 0.95;
          limbs[1].rotation.x = -Math.sin(runCycle) * 0.95;
        }

        head.rotation.x = Math.sin(runCycle * 2) * 0.06;
        if (tail) tail.rotation.y = Math.sin(runCycle) * 0.5;
        break;
      }

      case 'jump': {
        const progress = Math.min(time / this.jumpDuration, 1.0);
        const smooth = THREE.MathUtils.smoothstep(progress, 0, 1);
        // Interpolate along horizontal path
        this.group.position.x = THREE.MathUtils.lerp(this.jumpStartPos.x, this.jumpEndPos.x, smooth);
        this.group.position.z = THREE.MathUtils.lerp(this.jumpStartPos.z, this.jumpEndPos.z, smooth);

        // Parabolic vertical trajectory
        const baseY = THREE.MathUtils.lerp(this.jumpStartPos.y, this.jumpEndPos.y, progress);
        const arcY = Math.sin(progress * Math.PI) * this.jumpHeight;
        this.group.position.y = baseY + arcY;
        this.shadowMesh.position.y = 0.005 - arcY / this.baseScale;
        this.shadowMesh.scale.setScalar(Math.max(0.3, 1 - (arcY / this.jumpHeight) * 0.6));

        // Dynamic pitch rotation during jump:
        // Takeoff tilts upward, apex levels out, descent tilts paws forward toward landing surface
        if (progress < 0.35) {
          const t = progress / 0.35;
          this.rig.body.rotation.x = Math.PI / 2 - 0.28 * Math.sin(t * Math.PI * 0.5);
        } else if (progress < 0.7) {
          const t = (progress - 0.35) / 0.35;
          this.rig.body.rotation.x = (Math.PI / 2 - 0.28) + 0.28 * t;
        } else {
          const t = (progress - 0.7) / 0.3;
          this.rig.body.rotation.x = Math.PI / 2 + 0.2 * Math.sin(t * Math.PI);
        }

        // Tuck legs in midair, extend paws on approach to landing surface
        if (limbs.length >= 4) {
          if (progress < 0.7) {
            limbs.forEach(l => l.rotation.x = -0.4 * Math.sin(progress / 0.7 * Math.PI));
          } else {
            const landingT = (progress - 0.7) / 0.3;
            limbs[0].rotation.x = 0.2 * (1 - landingT);
            limbs[1].rotation.x = 0.2 * (1 - landingT);
            limbs[2].rotation.x = -0.2 * (1 - landingT);
            limbs[3].rotation.x = -0.2 * (1 - landingT);
          }
        } else if (limbs.length === 2) {
          limbs.forEach(l => l.rotation.x = -0.4 * Math.sin(progress * Math.PI));
        }

        if (tail) tail.rotation.y = Math.sin(progress * Math.PI * 3.0) * 0.4;
        break;
      }

      case 'fly': {
        const progress = Math.min(time / this.walkDuration, 1.0);
        const smooth = THREE.MathUtils.smoothstep(progress, 0, 1);
        this.group.position.x = THREE.MathUtils.lerp(this.walkStartPos.x, this.targetPosition.x, smooth);
        this.group.position.z = THREE.MathUtils.lerp(this.walkStartPos.z, this.targetPosition.z, smooth);
        this.group.position.y = THREE.MathUtils.lerp(this.walkStartPos.y, this.targetPosition.y, smooth);

        // Undulating flight
        this.rig.body.position.y = this.baseBodyY + Math.sin(time * 3.5) * 0.035;
        this.rig.body.rotation.z = Math.sin(time * 2.0) * 0.06;

        // Wing flapping
        if (wings && wings.length >= 2) {
          const flap = Math.sin(time * 16.0) * 0.85;
          wings[0].rotation.z = 0.25 + flap;
          wings[1].rotation.z = -0.25 - flap;
        }
        break;
      }

      case 'read': {
        head.rotation.x = 0.32;
        head.rotation.y = Math.sin(time * 2) * 0.12;
        break;
      }
      case 'sad': { head.rotation.x = 0.35; break; }
      case 'surprised': { head.scale.setScalar(1 + Math.sin(time * 3) * 0.03); break; }

      case 'eat':
      case 'drink': {
        // Head dips down toward target food, chews with mouth motion, tail twitches
        const chewCycle = time * 7.0;
        head.rotation.x = 0.38 + Math.sin(chewCycle) * 0.15;
        head.rotation.z = Math.sin(chewCycle * 0.5) * 0.05;
        this.rig.body.position.y = this.baseBodyY * 0.95 + Math.sin(chewCycle) * 0.005;
        if (tail) tail.rotation.y = Math.sin(chewCycle * 1.5) * 0.25;
        limbs.forEach(l => l.rotation.set(0, 0, 0));
        break;
      }

      case 'sit': {
        // Lower body slightly and rotate backward
        this.rig.body.position.y = this.baseBodyY * 0.74;
        this.rig.body.rotation.x = Math.PI / 2 - 0.22;
        head.rotation.x = -0.12; // look up slightly
        limbs.forEach((l, idx) => {
          if (idx >= 2) l.rotation.x = -0.65; // bend back legs
          else l.rotation.x = 0.1;
        });
        if (tail) tail.rotation.y = Math.sin(time * 1.5) * 0.15;
        break;
      }

      case 'talk': {
        // Head moves expressively
        head.rotation.x = Math.sin(time * 10.0) * 0.12;
        head.rotation.z = Math.sin(time * 4.0) * 0.06;
        break;
      }

      case 'wave': {
        if (limbs.length >= 2) {
          const waveLimb = limbs[1];
          waveLimb.rotation.z = 1.2 + Math.sin(time * 12.0) * 0.4;
          waveLimb.rotation.x = -0.4;
        }
        break;
      }

      case 'happy': {
        this.rig.body.position.y = this.baseBodyY + Math.abs(Math.sin(time * 10.0)) * 0.06;
        head.rotation.y = Math.sin(time * 6.0) * 0.2;
        if (tail) tail.rotation.y = Math.sin(time * 16.0) * 0.5;
        break;
      }

      default:
        break;
    }
  }

  public dispose() {
    this.disposed = true;
    this.mixer?.stopAllAction();
    if (this.loadedModel) { this.mixer?.uncacheRoot(this.loadedModel); disposeObject(this.loadedModel); }
    this.rig.root.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });
    this.shadowMesh.geometry.dispose();
    if (this.shadowMesh.material instanceof THREE.Material) {
      this.shadowMesh.material.dispose();
    }
  }
}



