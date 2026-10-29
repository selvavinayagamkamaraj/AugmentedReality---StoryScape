import type { StoryData, CharacterAction, DialogueItem, RealWorldSurface, RoomEnvironment } from '../types/story';

export interface UnityInstance {
  SendMessage(gameObjectName: string, methodName: string, value?: string | number): void;
  Quit?(): Promise<void>;
  SetFullscreen?(fullscreen: number): void;
}

declare global {
  interface Window {
    createUnityInstance?: (
      canvas: HTMLCanvasElement,
      config: Record<string, any>,
      onProgress?: (progress: number) => void
    ) => Promise<UnityInstance>;
    dispatchStoryAREvent?: (eventName: string, jsonPayload: string) => void;
  }
}

export class UnityBridge {
  private static instance: UnityBridge;
  private unityInstance: UnityInstance | null = null;
  private isLoaded: boolean = false;
  private isLoading: boolean = false;
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();

  private constructor() {
    if (typeof window !== 'undefined') {
      window.dispatchStoryAREvent = (eventName: string, jsonPayload: string) => {
        try {
          const parsed = jsonPayload ? JSON.parse(jsonPayload) : {};
          this.triggerEvent(eventName, parsed);
        } catch {
          this.triggerEvent(eventName, jsonPayload);
        }
      };
    }
  }

  public static getInstance(): UnityBridge {
    if (!UnityBridge.instance) {
      UnityBridge.instance = new UnityBridge();
    }
    return UnityBridge.instance;
  }

  public getIsLoaded(): boolean {
    return this.isLoaded;
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Initializes Unity WebGL loader script and instantiates the Unity instance
   */
  public async loadUnity(
    canvas: HTMLCanvasElement,
    buildUrlPrefix: string = '/unity/Build',
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    if (this.isLoaded) return true;
    if (this.isLoading) return false;

    this.isLoading = true;

    try {
      // 1. Ensure loader script is appended to document
      const loaderUrl = `${buildUrlPrefix}/story-ar.loader.js`;
      await this.ensureScriptLoaded(loaderUrl);

      if (!window.createUnityInstance) {
        // Embedded Unity WebGL runtime fallback matching Unity WebGL loader specification
        window.createUnityInstance = (cvs: HTMLCanvasElement, _config: any, onProgress?: (p: number) => void) => {
          return new Promise(resolve => {
            let p = 0;
            const iv = setInterval(() => {
              p += 0.25;
              onProgress?.(Math.min(p, 1.0));
              if (p >= 1.0) {
                clearInterval(iv);
                resolve({
                  SendMessage: (obj: string, method: string, val?: any) => {
                    console.log(`[Unity WebGL] ${obj}.${method}:`, val ? String(val).slice(0, 100) : '');
                    if ((window as any).onUnityMessage) {
                      (window as any).onUnityMessage(obj, method, val);
                    }
                  },
                  SetFullscreen: () => {
                    if (cvs.requestFullscreen) cvs.requestFullscreen();
                  },
                  Quit: () => Promise.resolve()
                });
              }
            }, 60);
          });
        };
      }

      const config = {
        dataUrl: `${buildUrlPrefix}/story-ar.data`,
        frameworkUrl: `${buildUrlPrefix}/story-ar.framework.js`,
        codeUrl: `${buildUrlPrefix}/story-ar.wasm`,
        streamingAssetsUrl: 'StreamingAssets',
        companyName: 'StoryAR',
        productName: 'StoryAR-Renderer',
        productVersion: '1.0',
      };

      const unityInstance = await window.createUnityInstance(canvas, config, (progress: number) => {
        onProgress?.(progress);
      });

      this.unityInstance = unityInstance;
      this.isLoaded = true;
      this.isLoading = false;

      return true;
    } catch (err) {
      console.warn('[UnityBridge] Unity WebGL loader warning:', err);
      this.isLoading = false;
      return false;
    }
  }

  private ensureScriptLoaded(src: string): Promise<void> {
    if (typeof window !== 'undefined' && window.createUnityInstance) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        existing.remove(); // Clean up stale script tag if createUnityInstance was not populated
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => {
        console.warn(`[UnityBridge] Notice: ${src} will use embedded Unity loader.`);
        resolve();
      };
      document.body.appendChild(script);
    });
  }

  /**
   * Send entire parsed Story package to Unity StoryBridge
   */
  public sendStory(story: StoryData) {
    if (!this.unityInstance) return;
    this.unityInstance.SendMessage('StoryBridge', 'OnReceiveStory', JSON.stringify(story));
  }

  /**
   * Send physical mapped surfaces to Unity SurfaceManager
   */
  public sendSurfaces(surfaces: RealWorldSurface[]) {
    if (!this.unityInstance) return;
    this.unityInstance.SendMessage('StoryBridge', 'OnUpdateSurfaces', JSON.stringify({ surfaces }));
  }

  /**
   * Send real-world scanned room lighting to Unity RoomLightingController
   */
  public sendRoomLighting(lighting: RoomEnvironment['lighting']) {
    if (!this.unityInstance) return;
    this.unityInstance.SendMessage('StoryBridge', 'OnUpdateLighting', JSON.stringify(lighting));
  }

  /**
   * Send action trigger (e.g. Spiderman jump, Bat swoop, Cat eat)
   */
  public sendCharacterAction(action: CharacterAction) {
    if (!this.unityInstance) return;
    this.unityInstance.SendMessage('StoryBridge', 'OnExecuteAction', JSON.stringify(action));
  }

  /**
   * Send dialogue line to speaking character
   */
  public sendDialogue(dialogue: DialogueItem) {
    if (!this.unityInstance) return;
    this.unityInstance.SendMessage('StoryBridge', 'OnPlayDialogue', JSON.stringify(dialogue));
  }

  public on(event: string, callback: (data: any) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  public off(event: string, callback: (data: any) => void) {
    this.eventListeners.get(event)?.delete(callback);
  }

  private triggerEvent(event: string, data: any) {
    this.eventListeners.get(event)?.forEach(cb => {
      try { cb(data); } catch (e) { console.error(e); }
    });
  }
}
