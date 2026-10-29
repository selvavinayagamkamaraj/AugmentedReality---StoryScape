import * as THREE from 'three';
import { SubjectTracker } from './SubjectTracker';
import type { DetectedSubject } from './SubjectTracker';
import { EnvironmentAnalyzer } from './EnvironmentAnalyzer';
import { WebXRARManager } from './WebXRARManager';
import type { RealWorldSurface, SurfaceType, DiagnosticsState } from '../types/story';

export interface ARStatus {
  mode: 'webxr' | 'camera' | 'demo';
  message: string;
  ready: boolean;
  webxr: 'available' | 'unsupported';
  depth: string;
  light: string;
  cv: string;
  cameraPosition?: string;
}

export interface ARControllerOptions {
  canvas: HTMLCanvasElement;
  videoElement: HTMLVideoElement;
  overlay?: HTMLElement;
  onStatus?: (status: ARStatus) => void;
  onPlacementComplete?: (position: THREE.Vector3) => void;
  onSubjectDetected?: (subject: DetectedSubject) => void;
  onSurfaceDetected?: (surface: RealWorldSurface) => void;
  onSessionEnd?: () => void;
  onError?: (err: Error) => void;
}

export class ARController {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderCamera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public anchorGroup: THREE.Group;
  public objectsGroup: THREE.Group;
  public environmentGroup: THREE.Group;
  
  public surfaces: RealWorldSurface[] = [];
  public subjectTracker: SubjectTracker;
  public environmentAnalyzer: EnvironmentAnalyzer;
  public webxrManager: WebXRARManager;

  public options?: ARControllerOptions;
  public status?: any;
  public hit?: any;
  public generation: number = 0;
  public disposed: boolean = false;
  public placed: boolean = false;

  private canvas: HTMLCanvasElement;
  private videoElement: HTMLVideoElement;
  private overlay?: HTMLElement;
  private stream: MediaStream | null = null;
  public currentMode: 'webxr' | 'camera' | 'demo' = 'demo';
  
  // Lighting & Shadows
  private dirLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private shadowFloor: THREE.Mesh;
  private debugGroup: THREE.Group;

  // Placement state
  public isPlaced: boolean = false;
  private isSubjectLocked: boolean = false;
  private reticle: THREE.Group;
  private reticleRing: THREE.Mesh;
  private reticlePulse: number = 0;
  private hitPosition: THREE.Vector3 = new THREE.Vector3(0, 0, -1.8);

  // Subject Anchor Visual Ring
  private subjectIndicator: THREE.Group;
  private subjectRingMesh: THREE.Mesh;
  private subjectRingMaterial: THREE.MeshBasicMaterial;
  
  private onStatus?: (status: ARStatus) => void;
  private onPlacementComplete?: (position: THREE.Vector3) => void;
  private onSubjectDetectedCallback?: (subject: DetectedSubject) => void;
  private onSurfaceDetectedCallback?: (surface: RealWorldSurface) => void;
  private onSessionEndCallback?: () => void;
  private isRunning: boolean = false;

  // CV state
  private cvStatus: string = 'off';

  // Device orientation / Gyro tracking state
  private hasGyro: boolean = false;
  private initialAlpha: number | null = null;
  private deviceEuler: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');
  
  // Touch drag manual camera control
  private isDragging: boolean = false;
  private previousMousePosition = { x: 0, y: 0 };
  private cameraYaw: number = 0;
  private cameraPitch: number = 0;

  // FPS Diagnostics
  private frameCount: number = 0;
  private lastFpsTime: number = performance.now();
  private currentFps: number = 60;

  constructor(options: ARControllerOptions) {
    this.options = options;
    this.canvas = options.canvas;
    this.videoElement = options.videoElement;
    this.overlay = options.overlay;
    this.onStatus = options.onStatus;
    this.onPlacementComplete = options.onPlacementComplete;
    this.onSubjectDetectedCallback = options.onSubjectDetected;
    this.onSurfaceDetectedCallback = options.onSurfaceDetected;
    this.onSessionEndCallback = options.onSessionEnd;

    // 1. Three.js Scene
    this.scene = new THREE.Scene();

    // 2. Camera: Real-world metric space (1 unit = 1 meter)
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.05, 50);
    this.camera.position.set(0, 1.2, 0); // eye level ~1.2m
    this.renderCamera = this.camera;

    // 3. WebGL Renderer with Shadows & Alpha
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // 4. Lighting & Dynamic Shadows
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    this.dirLight.position.set(1.5, 3.5, 2.0);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.bias = -0.001;
    this.scene.add(this.dirLight);

    // 5. Shadow-Receiving Ground Plane for Physical Contact Shadows
    const shadowFloorGeo = new THREE.PlaneGeometry(12, 12);
    const shadowFloorMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    this.shadowFloor = new THREE.Mesh(shadowFloorGeo, shadowFloorMat);
    this.shadowFloor.rotation.x = -Math.PI / 2;
    this.shadowFloor.position.y = 0;
    this.shadowFloor.receiveShadow = true;
    this.scene.add(this.shadowFloor);

    // 6. Anchor groups
    this.anchorGroup = new THREE.Group();
    this.anchorGroup.position.set(0, 0, -1.8);
    this.scene.add(this.anchorGroup);

    this.objectsGroup = new THREE.Group();
    this.scene.add(this.objectsGroup);

    this.environmentGroup = new THREE.Group();
    this.scene.add(this.environmentGroup);

    this.debugGroup = new THREE.Group();
    this.scene.add(this.debugGroup);

    // 7. Reticle Ring
    this.reticle = new THREE.Group();
    const ringGeo = new THREE.RingGeometry(0.25, 0.30, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    this.reticleRing = new THREE.Mesh(ringGeo, ringMat);
    this.reticleRing.rotation.x = -Math.PI / 2;
    this.reticle.add(this.reticleRing);

    const dotGeo = new THREE.CircleGeometry(0.04, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const dotMesh = new THREE.Mesh(dotGeo, dotMat);
    dotMesh.rotation.x = -Math.PI / 2;
    this.reticle.add(dotMesh);

    this.reticle.position.set(0, 0, -1.8);
    this.scene.add(this.reticle);

    // 8. Subject Indicator Ring
    this.subjectIndicator = new THREE.Group();
    const subGeo = new THREE.RingGeometry(0.2, 0.24, 32);
    this.subjectRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    this.subjectRingMesh = new THREE.Mesh(subGeo, this.subjectRingMaterial);
    this.subjectIndicator.add(this.subjectRingMesh);
    this.subjectIndicator.visible = false;
    this.scene.add(this.subjectIndicator);

    // 9. Environment Analyzer
    this.environmentAnalyzer = new EnvironmentAnalyzer({
      videoElement: this.videoElement,
      scene: this.scene
    });
    this.surfaces = this.environmentAnalyzer.getRoom().surfaces;

    // 10. AI Subject Tracker
    this.subjectTracker = new SubjectTracker(this.videoElement, (labels) => {
      if (labels.length > 0) {
        this.cvStatus = `Identified: ${labels.slice(0, 3).join(', ')}`;
      } else {
        this.cvStatus = 'No recognized objects in view';
      }
      this.emitStatus();
    });

    // 11. WebXR AR Manager
    this.webxrManager = new WebXRARManager(this.renderer, {
      onSessionStarted: () => {
        this.currentMode = 'webxr';
        this.reticle.visible = true;
        this.emitStatus('Spatial WebXR session active');
      },
      onSessionEnded: () => {
        this.currentMode = 'demo';
        this.hit = undefined;
        this.emitStatus('WebXR session ended');
        this.onSessionEndCallback?.();
      },
      onSelect: () => {
        if (!this.placed && !this.isPlaced) {
          this.handlePlacementTap();
        }
      },
      onHitTestResult: (matrix, hit) => {
        if (hit) {
          this.hit = hit;
        }
        if (!this.placed && !this.isPlaced) {
          this.reticle.visible = true;
        }
        const hitPos = new THREE.Vector3().setFromMatrixPosition(matrix);
        this.hitPosition.copy(hitPos);
        this.reticle.position.copy(hitPos);

        const detected = this.environmentAnalyzer.registerSurface(
          this.environmentAnalyzer.classifyHeight(hitPos.y, 'horizontal'),
          hitPos
        );
        this.surfaces = this.environmentAnalyzer.getRoom().surfaces;
        this.onSurfaceDetectedCallback?.(detected);
      }
    }, this.overlay);

    // Listeners
    window.addEventListener('resize', this.onResize);
    this.setupGyroscope();
    this.setupTouchControls();

    // Initial Status Check
    setTimeout(() => {
      this.checkInitialMode();
    }, 200);
  }

  private async checkInitialMode() {
    if (this.webxrManager.capabilities.isWebXRSupported) {
      this.emitStatus('WebXR spatial AR supported on this device');
    } else {
      this.emitStatus('WebXR not available on this browser. Camera preview or 3D demo available.');
    }
  }

  private emitStatus(overrideMessage?: string) {
    const camPos = this.camera ? `x:${this.camera.position.x.toFixed(2)}, y:${this.camera.position.y.toFixed(2)}, z:${this.camera.position.z.toFixed(2)}` : 'x:0, y:0, z:0';

    const st: ARStatus = {
      mode: this.currentMode,
      message: overrideMessage || (this.currentMode === 'webxr' ? 'Spatial AR active' : this.currentMode === 'camera' ? 'Camera view active' : '3D demo interactive mode'),
      ready: true,
      webxr: this.webxrManager?.capabilities?.isWebXRSupported ? 'available' : 'unsupported',
      depth: this.webxrManager?.capabilities?.isDepthSupported ? 'sensor supported' : 'plane estimate fallback',
      light: `intensity: ${this.environmentAnalyzer?.getRoom()?.lighting?.intensity?.toFixed(2) ?? '1.00'}`,
      cv: this.cvStatus,
      cameraPosition: camPos
    };

    this.status = st;
    if (this.onStatus) {
      this.onStatus(st);
    }
    if (this.options?.onStatus && this.options.onStatus !== this.onStatus) {
      this.options.onStatus(st);
    }
  }

  public async startXR(): Promise<boolean> {
    try {
      const success = await this.webxrManager.startSession();
      if (success) {
        this.currentMode = 'webxr';
        this.emitStatus('Spatial WebXR session active');
        return true;
      } else {
        this.currentMode = 'demo';
        this.emitStatus('WebXR not supported on this device/browser; using 3D demo');
        return false;
      }
    } catch (e) {
      this.currentMode = 'demo';
      this.emitStatus(`WebXR unavailable: ${(e as Error)?.message || 'Failed'}`);
      return false;
    }
  }

  public async initCamera(): Promise<boolean> {
    this.videoElement.muted = true;
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;

    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false
      });
      this.stream = mediaStream;
      this.videoElement.srcObject = mediaStream;
      await this.videoElement.play();
      this.currentMode = 'camera';
      this.emitStatus('Rear camera preview active');
      return true;
    } catch {
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        this.stream = fallbackStream;
        this.videoElement.srcObject = fallbackStream;
        await this.videoElement.play();
        this.currentMode = 'camera';
        this.emitStatus('Camera preview active');
        return true;
      } catch {
        this.emitStatus('Camera permission blocked; using 3D demo');
        this.currentMode = 'demo';
        return false;
      }
    }
  }

  public useDemo() {
    this.currentMode = 'demo';
    this.emitStatus('3D interactive demo mode');
  }

  public captureSurface(type: SurfaceType) {
    const pos = this.reticle.position.clone();
    const surface = this.environmentAnalyzer.registerSurface(type, pos);
    this.surfaces = this.environmentAnalyzer.getRoom().surfaces;
    this.onSurfaceDetectedCallback?.(surface);
    this.emitStatus(`Mapped ${type} at (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`);
    return surface;
  }

  public adjustReticleHeight(deltaY: number) {
    if (this.reticle) {
      this.reticle.position.y = Math.max(-1.5, Math.min(2.5, this.reticle.position.y + deltaY));
      this.emitStatus(`Target height: ${this.reticle.position.y.toFixed(2)}m`);
    }
  }

  public resetSurfaces() {
    this.environmentAnalyzer.resetSurfaces();
    this.surfaces = this.environmentAnalyzer.getRoom().surfaces;
    this.emitStatus('Surfaces reset to default floor');
  }

  public setPlanesVisible(visible: boolean) {
    this.environmentAnalyzer.setDebugVisible(visible);
  }

  public async enableVision() {
    this.cvStatus = 'Initializing computer vision...';
    this.emitStatus();
    const ready = await this.subjectTracker.init();
    if (ready) {
      this.subjectTracker.start();
      this.cvStatus = 'Vision active - scanning frame';
    } else {
      this.cvStatus = 'Vision model unavailable';
    }
    this.emitStatus();
  }

  public moveDemo(factor: number) {
    this.camera.position.z *= factor;
    this.camera.position.z = Math.max(-0.5, Math.min(3.5, this.camera.position.z));
    this.emitStatus();
  }

  public setDebug(name: string, enabled: boolean) {
    if (name === 'planes') {
      this.environmentAnalyzer.setDebugVisible(enabled);
    } else if (name === 'light direction') {
      this.dirLight.castShadow = enabled;
    } else if (name === 'coordinate axes') {
      let axes = this.debugGroup.getObjectByName('axes');
      if (enabled && !axes) {
        const helper = new THREE.AxesHelper(0.5);
        helper.name = 'axes';
        this.debugGroup.add(helper);
      } else if (!enabled && axes) {
        this.debugGroup.remove(axes);
      }
    }
  }

  private handleSubjectDetected(subject: DetectedSubject) {
    if (subject.type === 'person') {
      this.subjectRingMaterial.color.setHex(0x10b981);
      this.isSubjectLocked = true;
    } else if (subject.type === 'table') {
      this.subjectRingMaterial.color.setHex(0xf59e0b);
      this.isSubjectLocked = true;
      const surf = this.environmentAnalyzer.registerSurface('table', subject.worldPosition);
      this.surfaces = this.environmentAnalyzer.getRoom().surfaces;
      this.onSurfaceDetectedCallback?.(surf);
    }

    this.subjectIndicator.visible = true;
    this.subjectIndicator.position.copy(subject.worldPosition);
    this.subjectIndicator.lookAt(this.camera.position);

    this.onSubjectDetectedCallback?.(subject);
  }

  private setupGyroscope() {
    if (typeof window === 'undefined') return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha === null || e.beta === null || e.gamma === null) return;
      this.hasGyro = true;

      if (this.initialAlpha === null) {
        this.initialAlpha = e.alpha;
      }

      const alphaRad = THREE.MathUtils.degToRad(e.alpha - (this.initialAlpha || 0));
      const betaRad = THREE.MathUtils.degToRad(e.beta - 45);
      const gammaRad = THREE.MathUtils.degToRad(e.gamma);

      this.deviceEuler.set(betaRad, alphaRad, -gammaRad, 'YXZ');
      this.camera.quaternion.setFromEuler(this.deviceEuler);
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
  }

  private setupTouchControls() {
    const onMouseDown = (e: MouseEvent | TouchEvent) => {
      if (this.hasGyro || this.webxrManager.isActive()) return;
      this.isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      this.previousMousePosition = { x: clientX, y: clientY };
    };

    const onMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!this.isDragging || this.hasGyro || this.webxrManager.isActive()) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - this.previousMousePosition.x;
      const deltaY = clientY - this.previousMousePosition.y;

      this.cameraYaw -= deltaX * 0.003;
      this.cameraPitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, this.cameraPitch - deltaY * 0.003));

      this.camera.quaternion.setFromEuler(new THREE.Euler(this.cameraPitch, this.cameraYaw, 0, 'YXZ'));
      this.previousMousePosition = { x: clientX, y: clientY };
    };

    const onMouseUp = () => {
      this.isDragging = false;
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchstart', onMouseDown);
    window.addEventListener('touchmove', onMouseMove);
    window.addEventListener('touchend', onMouseUp);
  }

  public handlePlacementTap(screenX?: number, screenY?: number): boolean {
    if (this.placed || this.isPlaced) {
      return false;
    }

    const isXR = (this.status && this.status.mode === 'webxr') || this.currentMode === 'webxr';
    if (isXR) {
      if (this.status && this.status.ready === false) {
        return false;
      }
      if (!this.hit) {
        return false;
      }
    }

    if (this.hit && typeof this.hit.createAnchor === 'function') {
      const currentGen = this.generation;
      try {
        const anchorPromise = this.hit.createAnchor();
        if (anchorPromise && typeof anchorPromise.then === 'function') {
          anchorPromise.then((anchor: any) => {
            if (this.generation !== currentGen || !this.placed || this.disposed) {
              anchor?.delete?.();
            }
          }).catch(() => {});
        }
      } catch {
        // ignore
      }
    }

    if (this.anchorGroup) {
      if (isXR && this.hitPosition) {
        this.anchorGroup.position.copy(this.hitPosition);
      } else if (screenX !== undefined && screenY !== undefined && typeof window !== 'undefined' && this.camera) {
        const ndcX = (screenX / window.innerWidth) * 2 - 1;
        const ndcY = -(screenY / window.innerHeight) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
        const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersection = new THREE.Vector3();
        
        if (raycaster.ray.intersectPlane(floorPlane, intersection)) {
          this.anchorGroup.position.copy(intersection);
        } else {
          this.anchorGroup.position.set(0, 0, -1.8);
        }
      } else {
        this.anchorGroup.position.set(0, 0, -1.8);
      }
    }

    this.placed = true;
    this.isPlaced = true;
    if (this.reticle) {
      this.reticle.visible = false;
    }

    const onComplete = this.onPlacementComplete || this.options?.onPlacementComplete;
    if (this.anchorGroup) {
      onComplete?.(this.anchorGroup.position);
    }

    return true;
  }

  public resetPlacement() {
    this.generation++;
    this.placed = false;
    this.isPlaced = false;
    this.isSubjectLocked = false;
    this.hit = undefined;
    if (this.reticle) {
      this.reticle.visible = true;
    }
    if (this.subjectIndicator) {
      this.subjectIndicator.visible = false;
    }
  }

  public getIsPlaced(): boolean {
    return this.placed || this.isPlaced;
  }

  public getIsSubjectLocked(): boolean {
    return this.isSubjectLocked;
  }

  public getOverlay(): HTMLElement | undefined {
    return this.overlay;
  }

  public getRenderCamera(): THREE.Camera {
    if (this.webxrManager?.isActive() && this.renderer?.xr?.isPresenting) {
      return this.renderer.xr.getCamera();
    }
    return this.camera;
  }

  public startRenderLoop(updateCallback: (delta: number) => void) {
    this.isRunning = true;
    let lastTime = performance.now();

    const loop = (currentTime: number, xrFrame?: XRFrame) => {
      if (!this.isRunning) return;

      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      this.frameCount++;
      if (currentTime - this.lastFpsTime >= 1000) {
        this.currentFps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsTime));
        this.frameCount = 0;
        this.lastFpsTime = currentTime;
      }

      if (xrFrame) {
        this.webxrManager.updateXRFrame(xrFrame);
      } else if (this.currentMode === 'camera') {
        this.environmentAnalyzer.updateLightingFromVideo();
      }

      // Dynamic Environmental Lighting update from scanned room
      const room = this.environmentAnalyzer.getRoom();
      this.ambientLight.intensity = Math.max(0.4, Math.min(2.0, room.lighting.intensity));
      if (room.lighting.ambientColor) {
        this.ambientLight.color.set(room.lighting.ambientColor);
        this.dirLight.color.set(room.lighting.ambientColor);
      }
      this.dirLight.intensity = Math.max(0.5, Math.min(1.8, room.lighting.intensity * 1.1));
      this.dirLight.position.set(
        room.lighting.direction[0] * 3.0,
        Math.max(2.0, room.lighting.direction[1] + 2.5),
        room.lighting.direction[2] * 3.0
      );
      if (this.anchorGroup && this.shadowFloor) {
        this.shadowFloor.position.y = this.anchorGroup.position.y;
      }

      // Pulse reticle
      this.reticlePulse += delta * 4;
      const pulseScale = 1 + Math.sin(this.reticlePulse) * 0.12;
      if (!this.isPlaced) {
        this.reticleRing.scale.set(pulseScale, pulseScale, pulseScale);
      }

      // CV detection update in camera mode
      if (this.currentMode === 'camera') {
        this.subjectTracker.update(currentTime, this.camera).then(subject => {
          if (subject && subject.type !== 'none') {
            this.handleSubjectDetected(subject);
          }
        });
      }

      // Run external update (StoryEngine)
      updateCallback(delta);

      // Render Three.js scene
      this.renderer.render(this.scene, this.camera);
    };

    // Three.js setAnimationLoop automatically handles both standard rAF and WebXR frames!
    this.renderer.setAnimationLoop((t, f) => {
      loop(t, f);
    });
  }

  public stopRenderLoop() {
    this.isRunning = false;
    this.renderer.setAnimationLoop(null);
  }

  public getDiagnostics(ollamaStatus?: string): DiagnosticsState {
    const gl = this.renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const gpuRenderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'WebGL GPU';

    return {
      cameraSupported: typeof navigator !== 'undefined' && !!navigator.mediaDevices,
      cameraActive: this.stream !== null && this.stream.active,
      cameraFacing: 'environment',
      webxrSupported: this.webxrManager.capabilities.isWebXRSupported,
      webxrActive: this.webxrManager.isActive(),
      hitTestSupported: this.webxrManager.capabilities.isHitTestSupported,
      planeDetectionSupported: this.webxrManager.capabilities.isPlaneDetectionSupported,
      depthSensingSupported: this.webxrManager.capabilities.isDepthSupported,
      lightEstimationSupported: this.webxrManager.capabilities.isLightEstimationSupported,
      gpuRenderer,
      threeVersion: THREE.REVISION,
      aiBackendOnline: ollamaStatus === 'online',
      aiModel: 'Local NLP + AI Engine',
      ttsAvailable: typeof window !== 'undefined' && 'speechSynthesis' in window,
      isSecureContext: typeof window !== 'undefined' && window.isSecureContext,
      fps: this.currentFps,
      planesDetected: this.surfaces.length,
      sceneTriangles: this.renderer.info.render.triangles
    };
  }

  private onResize = () => {
    if (this.renderer?.xr?.isPresenting) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public dispose() {
    this.disposed = true;
    this.generation++;
    this.stopRenderLoop();
    window.removeEventListener('resize', this.onResize);
    this.subjectTracker.dispose();
    this.environmentAnalyzer.dispose();
    this.webxrManager.endSession();

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.renderer.dispose();
  }
}
