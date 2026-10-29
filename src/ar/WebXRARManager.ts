import * as THREE from 'three';

export interface WebXRCapabilities {
  isWebXRSupported: boolean;
  isSessionActive: boolean;
  isHitTestSupported: boolean;
  isPlaneDetectionSupported: boolean;
  isDepthSupported: boolean;
  isLightEstimationSupported: boolean;
}

export interface WebXRCallbacks {
  onSessionStarted?: () => void;
  onSessionEnded?: () => void;
  onSelect?: () => void;
  onHitTestResult?: (hitMatrix: THREE.Matrix4, hit?: XRHitTestResult) => void;
  onLightEstimate?: (intensity: number, direction: THREE.Vector3) => void;
  onPlaneDetected?: (plane: XRPlane) => void;
}

export class WebXRARManager {
  private renderer: THREE.WebGLRenderer;
  private session: XRSession | null = null;
  private refSpace: XRReferenceSpace | null = null;
  private hitTestSource: XRHitTestSource | null = null;
  private callbacks: WebXRCallbacks;
  private overlay?: HTMLElement;

  public capabilities: WebXRCapabilities = {
    isWebXRSupported: false,
    isSessionActive: false,
    isHitTestSupported: false,
    isPlaneDetectionSupported: false,
    isDepthSupported: false,
    isLightEstimationSupported: false
  };

  constructor(renderer: THREE.WebGLRenderer, callbacks: WebXRCallbacks = {}, overlay?: HTMLElement) {
    this.renderer = renderer;
    this.callbacks = callbacks;
    this.overlay = overlay;
    this.checkSupport();
  }

  public setOverlay(overlay: HTMLElement) {
    this.overlay = overlay;
  }

  private async checkSupport() {
    if (typeof navigator !== 'undefined' && 'xr' in navigator && navigator.xr) {
      try {
        const supported = await navigator.xr.isSessionSupported('immersive-ar');
        this.capabilities.isWebXRSupported = supported;
      } catch {
        this.capabilities.isWebXRSupported = false;
      }
    }
  }

  /**
   * Request native immersive-ar WebXR session with feature negotiation and dom-overlay
   */
  public async startSession(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.xr) {
      return false;
    }

    try {
      const isSupported = await navigator.xr.isSessionSupported('immersive-ar').catch(() => false);
      if (!isSupported) {
        this.capabilities.isWebXRSupported = false;
        return false;
      }
      this.capabilities.isWebXRSupported = true;

      const overlayRoot = this.overlay || (typeof document !== 'undefined' ? (document.querySelector('.child-mode-container') as HTMLElement) || document.body : undefined);

      // Progressive Feature Negotiation with dom-overlay
      let session: XRSession;
      const optFeatures = ['dom-overlay', 'local-floor', 'bounded-floor', 'plane-detection', 'light-estimation', 'depth-sensing', 'anchors'];
      try {
        const initOptions: any = {
          requiredFeatures: ['hit-test'],
          optionalFeatures: optFeatures
        };
        if (overlayRoot) initOptions.domOverlay = { root: overlayRoot };
        session = await navigator.xr.requestSession('immersive-ar', initOptions);
      } catch {
        const fallbackOptions: any = {
          optionalFeatures: ['hit-test', ...optFeatures]
        };
        if (overlayRoot) fallbackOptions.domOverlay = { root: overlayRoot };
        session = await navigator.xr.requestSession('immersive-ar', fallbackOptions);
      }

      this.session = session;
      this.capabilities.isSessionActive = true;
      this.renderer.xr.enabled = true;
      await this.renderer.xr.setSession(session);

      // Reference Space: Try local-floor, then local, then viewer
      let refSpace: XRReferenceSpace | null = null;
      for (const spaceType of ['local-floor', 'local', 'viewer'] as XRReferenceSpaceType[]) {
        try {
          refSpace = await session.requestReferenceSpace(spaceType);
          if (refSpace) break;
        } catch {
          // try next space
        }
      }
      this.refSpace = refSpace;

      // Setup Hit Test Source with viewer space (ray originates from camera position)
      if (session.requestHitTestSource) {
        try {
          const viewerSpace = await session.requestReferenceSpace('viewer');
          const source = await session.requestHitTestSource({ space: viewerSpace });
          this.hitTestSource = source || null;
          this.capabilities.isHitTestSupported = !!source;
        } catch (e) {
          console.warn('[WebXR] Viewer hit test source failed, trying local reference space:', e);
          if (this.refSpace) {
            try {
              const fallbackSource = await session.requestHitTestSource({ space: this.refSpace });
              this.hitTestSource = fallbackSource || null;
              this.capabilities.isHitTestSupported = !!fallbackSource;
            } catch {}
          }
        }
      }

      // Handle screen tap/select inside WebXR
      session.addEventListener('select', () => {
        this.callbacks.onSelect?.();
      });

      session.addEventListener('end', () => {
        this.session = null;
        this.capabilities.isSessionActive = false;
        this.hitTestSource = null;
        this.refSpace = null;
        this.renderer.xr.enabled = false;
        this.callbacks.onSessionEnded?.();
      });

      this.callbacks.onSessionStarted?.();
      return true;
    } catch (err) {
      console.warn('[WebXR] Could not start immersive-ar session:', err);
      this.capabilities.isSessionActive = false;
      this.renderer.xr.enabled = false;
      return false;
    }
  }

  public endSession() {
    if (this.session) {
      this.session.end().catch(() => {});
    }
  }

  /**
   * Called during WebXR render loop frame to process hit testing and planes
   */
  public updateXRFrame(frame: XRFrame) {
    if (!this.session || !this.refSpace) return;

    // 1. Process Hit Test
    if (this.hitTestSource) {
      const hitTestResults = frame.getHitTestResults(this.hitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(this.refSpace);
        if (pose) {
          const matrix = new THREE.Matrix4().fromArray(pose.transform.matrix);
          this.callbacks.onHitTestResult?.(matrix, hit);
        }
      }
    }

    // 2. Process Detected Planes (where browser/device supports WebXR Plane Detection)
    if ('detectedPlanes' in frame && (frame as any).detectedPlanes) {
      this.capabilities.isPlaneDetectionSupported = true;
      const planes = (frame as any).detectedPlanes as Set<XRPlane>;
      planes.forEach(plane => {
        this.callbacks.onPlaneDetected?.(plane);
      });
    }

    // 3. Process Light Estimate
    if ('getLightEstimate' in frame && (frame as any).getLightEstimate && (this.session as any).requestLightProbe) {
      this.capabilities.isLightEstimationSupported = true;
    }
  }

  public isActive(): boolean {
    return this.capabilities.isSessionActive;
  }
}
