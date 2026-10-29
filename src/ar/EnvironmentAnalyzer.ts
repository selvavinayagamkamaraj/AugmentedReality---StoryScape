import * as THREE from 'three';
import type { RealWorldSurface, RoomEnvironment, SurfaceType } from '../types/story';

export interface EnvironmentAnalyzerOptions {
  videoElement?: HTMLVideoElement;
  scene: THREE.Scene;
}

export class EnvironmentAnalyzer {
  private videoElement?: HTMLVideoElement;
  private scene: THREE.Scene;
  private canvasSample: HTMLCanvasElement;
  private sampleCtx: CanvasRenderingContext2D | null;

  // Stored Environment Representation
  private room: RoomEnvironment;
  private planeDebugGroup: THREE.Group;
  private isScanning: boolean = true;

  constructor(options: EnvironmentAnalyzerOptions) {
    this.videoElement = options.videoElement;
    this.scene = options.scene;

    this.canvasSample = document.createElement('canvas');
    this.canvasSample.width = 64;
    this.canvasSample.height = 64;
    this.sampleCtx = this.canvasSample.getContext('2d');

    this.planeDebugGroup = new THREE.Group();
    this.planeDebugGroup.visible = true;
    this.scene.add(this.planeDebugGroup);

    // Initial default room representation (realistic scale)
    this.room = {
      surfaces: [
        {
          id: 'floor_primary',
          type: 'floor',
          orientation: 'horizontal',
          height: 0.0,
          width: 4.0,
          depth: 4.0,
          position: { x: 0, y: 0, z: -1.8 },
          confidence: 0.95
        }
      ],
      lighting: {
        intensity: 1.0,
        direction: [0.5, 1.0, 0.5],
        ambientColor: '#ffffff',
        temperature: 5500
      },
      depthAvailable: false,
      planesCount: 1,
      lastUpdated: performance.now()
    };
  }

  public getRoom(): RoomEnvironment {
    return this.room;
  }

  private hasRealFloorMeasurement: boolean = false;

  /**
   * Registers a surface discovered through WebXR plane detection or AI vision
   */
  public registerSurface(
    type: SurfaceType,
    position: THREE.Vector3,
    width: number = 1.0,
    depth: number = 0.8,
    orientation: 'horizontal' | 'vertical' = 'horizontal',
    confidence: number = 0.8
  ): RealWorldSurface {
    if (!this.hasRealFloorMeasurement && orientation === 'horizontal') {
      const defaultFloorIdx = this.room.surfaces.findIndex(s => s.id === 'floor_primary');
      if (defaultFloorIdx !== -1) {
        if (type === 'floor') {
          this.room.surfaces.splice(defaultFloorIdx, 1);
          this.hasRealFloorMeasurement = true;
        } else if (position.y < -0.15) {
          this.room.surfaces[defaultFloorIdx].height = position.y - 0.75;
          this.room.surfaces[defaultFloorIdx].position.y = position.y - 0.75;
        }
      }
    }

    // Check if surface already exists nearby
    const existing = this.room.surfaces.find(s => {
      const dist = Math.hypot(s.position.x - position.x, s.position.z - position.z);
      return dist < 0.35 && Math.abs(s.height - position.y) < 0.20;
    });

    if (existing) {
      existing.position.x = position.x;
      existing.position.y = position.y;
      existing.position.z = position.z;
      existing.height = position.y;
      if (type !== 'floor' && existing.type === 'floor') {
        existing.type = type;
      }
      existing.confidence = Math.min(1.0, existing.confidence + 0.1);
      this.reclassifySurfaces();
      this.updateDebugVisuals();
      return existing;
    }

    const newSurface: RealWorldSurface = {
      id: `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      orientation,
      height: position.y,
      width,
      depth,
      position: { x: position.x, y: position.y, z: position.z },
      confidence
    };

    if (type === 'floor') {
      this.hasRealFloorMeasurement = true;
    }

    this.room.surfaces.push(newSurface);
    this.reclassifySurfaces();
    this.room.planesCount = this.room.surfaces.length;
    this.room.lastUpdated = performance.now();

    this.updateDebugVisuals();
    return newSurface;
  }

  private reclassifySurfaces() {
    const horizontalSurfaces = this.room.surfaces.filter(s => s.orientation === 'horizontal');
    if (horizontalSurfaces.length <= 1) return;

    let minFloorY = Infinity;
    for (const s of horizontalSurfaces) {
      if (s.height < minFloorY) {
        minFloorY = s.height;
      }
    }

    for (const s of horizontalSurfaces) {
      const relHeight = s.height - minFloorY;
      if (relHeight < 0.22) {
        s.type = 'floor';
      } else if (relHeight >= 0.22 && relHeight < 0.55) {
        if (s.type === 'floor' || s.type === 'unknown') s.type = 'chair';
      } else if (relHeight >= 0.55) {
        if (s.type === 'floor' || s.type === 'unknown') s.type = 'table';
      }
    }
  }

  public getFloorHeight(): number {
    const floor = this.room.surfaces.find(s => s.type === 'floor');
    if (floor) return floor.height;
    const horizontal = this.room.surfaces.filter(s => s.orientation === 'horizontal');
    if (horizontal.length > 0) {
      return Math.min(...horizontal.map(s => s.height));
    }
    return 0.0;
  }

  /**
   * Classify surface based on geometric criteria relative to detected floor level
   */
  public classifyHeight(heightY: number, orientation: 'horizontal' | 'vertical'): SurfaceType {
    if (orientation === 'vertical') return 'wall';

    const floorY = this.getFloorHeight();
    const relHeight = heightY - floorY;

    // Relative to detected floor:
    if (relHeight < 0.22) return 'floor';
    if (relHeight >= 0.22 && relHeight < 0.55) return 'chair';
    if (relHeight >= 0.55) return 'table';
    return 'table';
  }

  /**
   * Analyzes camera frame to estimate ambient light intensity and directional bias
   */
  public updateLightingFromVideo() {
    if (!this.videoElement || !this.sampleCtx) return;
    if (this.videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    try {
      this.sampleCtx.drawImage(this.videoElement, 0, 0, 64, 64);
      const imgData = this.sampleCtx.getImageData(0, 0, 64, 64);
      const data = imgData.data;

      let totalBrightness = 0;
      let leftBrightness = 0;
      let rightBrightness = 0;
      let topBrightness = 0;
      const count = data.length / 4;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        totalBrightness += lum;

        const x = (i / 4) % 64;
        const y = Math.floor(i / 4 / 64);

        if (x < 32) leftBrightness += lum;
        else rightBrightness += lum;

        if (y < 32) topBrightness += lum;
      }

      const avgLum = totalBrightness / count;
      // Normal normalized light intensity: 0.6 to 1.4
      const normalizedIntensity = THREE.MathUtils.clamp((avgLum / 128.0) * 1.1, 0.6, 1.4);

      // Estimate light horizontal direction vector from brightness imbalance
      const xBias = (rightBrightness - leftBrightness) / (totalBrightness || 1);
      const yBias = (topBrightness * 2.0) / (totalBrightness || 1);

      this.room.lighting.intensity = normalizedIntensity;
      this.room.lighting.direction = [xBias * 2.0, Math.max(0.5, yBias), 0.8];
    } catch {
      // Cross-origin or frame not ready
    }
  }

  /**
   * Updates debug visual representation of planes
   */
  private updateDebugVisuals() {
    while (this.planeDebugGroup.children.length > 0) {
      const child = this.planeDebugGroup.children[0];
      this.planeDebugGroup.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments || child instanceof THREE.Sprite) {
        if ('geometry' in child && child.geometry) (child.geometry as THREE.BufferGeometry).dispose();
        if ('material' in child && child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else (child.material as THREE.Material).dispose();
        }
      }
    }

    this.room.surfaces.forEach(s => {
      const color = s.type === 'table' ? 0xf59e0b : s.type === 'chair' ? 0xec4899 : s.type === 'wall' ? 0x8b5cf6 : 0x10b981;
      const colorHex = '#' + color.toString(16).padStart(6, '0');
      
      const geo = new THREE.PlaneGeometry(s.width, s.depth);
      const fillMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, fillMat);
      
      const edges = new THREE.EdgesGeometry(geo);
      const lineMat = new THREE.LineBasicMaterial({ color, linewidth: 2, transparent: true, opacity: 0.85 });
      const wire = new THREE.LineSegments(edges, lineMat);
      mesh.add(wire);

      if (s.orientation === 'horizontal') {
        mesh.rotation.x = -Math.PI / 2;
      }
      mesh.position.set(s.position.x, s.position.y, s.position.z);
      this.planeDebugGroup.add(mesh);

      // 3D Canvas Label Sprite
      if (typeof document !== 'undefined') {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 256;
          canvas.height = 64;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const cAny = ctx as any;
            if (typeof cAny.roundRect === 'function') {
              cAny.roundRect(8, 8, 240, 48, 12);
            } else {
              ctx.rect(8, 8, 240, 48);
            }
            ctx.fill();
            ctx.strokeStyle = colorHex;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 22px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${s.type.toUpperCase()} [${s.height.toFixed(2)}m]`, 128, 32);

            const tex = new THREE.CanvasTexture(canvas);
            const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.scale.set(0.65, 0.16, 1);
            sprite.position.set(s.position.x, s.position.y + 0.14, s.position.z);
            this.planeDebugGroup.add(sprite);
          }
        } catch {
          // ignore in headless environments
        }
      }
    });
  }

  public resetSurfaces() {
    this.hasRealFloorMeasurement = false;
    this.room.surfaces = [
      {
        id: 'floor_primary',
        type: 'floor',
        orientation: 'horizontal',
        height: 0.0,
        width: 4.0,
        depth: 4.0,
        position: { x: 0, y: 0, z: -1.8 },
        confidence: 0.95
      }
    ];
    this.room.planesCount = 1;
    this.updateDebugVisuals();
  }

  public setDebugVisible(visible: boolean) {
    this.planeDebugGroup.visible = visible;
  }

  public getSurfaceByType(type: SurfaceType): RealWorldSurface | undefined {
    return this.room.surfaces.find(s => s.type === type);
  }

  public getUsableSurfaces(): RealWorldSurface[] {
    return this.room.surfaces.filter(s => s.confidence >= 0.5);
  }

  public getIsScanning(): boolean {
    return this.isScanning;
  }

  public finishScanning() {
    this.isScanning = false;
  }

  public dispose() {
    this.scene.remove(this.planeDebugGroup);
  }
}
