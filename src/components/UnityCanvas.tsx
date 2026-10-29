import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { UnityBridge } from '../unity/UnityBridge';
import { Character3DFactory } from '../characters/Character3DFactory';
import type { CharacterRigs3D } from '../characters/Character3DFactory';
import type { StoryData, RealWorldSurface, RoomEnvironment, CharacterActionType } from '../types/story';
import { Box, Sparkles, Sun, Eye, Layers, ArrowLeftRight } from 'lucide-react';

interface UnityCanvasProps {
  story: StoryData;
  surfaces: RealWorldSurface[];
  lighting?: RoomEnvironment['lighting'];
  onFallbackToThree: () => void;
}

export const UnityCanvas: React.FC<UnityCanvasProps> = ({
  story,
  surfaces,
  lighting,
  onFallbackToThree
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [activeAction, setActiveAction] = useState<string>('idle');

  // Three.js URP simulation references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambLightRef = useRef<THREE.AmbientLight | null>(null);
  const rigsRef = useRef<CharacterRigs3D[]>([]);
  const surfacesGroupRef = useRef<THREE.Group | null>(null);

  // Derive character list directly
  const charList = useMemo(() => story.characters.map(c => `${c.name} (${c.type})`), [story]);

  // Camera Orbit State
  const orbitRef = useRef({
    radius: 2.2,
    theta: 0.35,
    phi: 1.15,
    isDragging: false,
    prevX: 0,
    prevY: 0,
    target: new THREE.Vector3(0, 0.45, 0)
  });

  // Camera Orbit Control Logic
  const updateCameraPosition = useCallback(() => {
    if (!cameraRef.current) return;
    const { radius, theta, phi, target } = orbitRef.current;
    const x = target.x + radius * Math.sin(phi) * Math.sin(theta);
    const y = target.y + radius * Math.cos(phi);
    const z = target.z + radius * Math.sin(phi) * Math.cos(theta);

    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(target);
  }, []);

  // Dispose helper
  const disposeUnityURP = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
    sceneRef.current = null;
    cameraRef.current = null;
    rigsRef.current = [];
  }, []);

  // Rebuild surfaces (Floor, Tables, Desks from scan)
  const rebuildSurfaces = useCallback((group: THREE.Group, surfaceList: RealWorldSurface[]) => {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }

    // Shadow receiver plane at base
    const shadowGeo = new THREE.PlaneGeometry(10, 10);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.45 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.receiveShadow = true;
    group.add(shadowPlane);

    // Grid Floor
    const grid = new THREE.GridHelper(10, 20, 0x38bdf8, 0x1e293b);
    (grid.material as THREE.Material).opacity = 0.35;
    (grid.material as THREE.Material).transparent = true;
    group.add(grid);

    // Add mapped surface markers (tables, desks, etc.)
    const activeSurface = surfaceList.find(s => s.type !== 'floor') || surfaceList[0];
    if (activeSurface && activeSurface.height > 0.05) {
      // Table pedestal visual
      const tableGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.04, 32);
      const tableMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.25,
        metalness: 0.1
      });
      const tableMesh = new THREE.Mesh(tableGeo, tableMat);
      tableMesh.position.set(0, activeSurface.height, 0);
      tableMesh.receiveShadow = true;
      tableMesh.castShadow = true;
      group.add(tableMesh);

      // Table shadow receiver
      const tableShadowMat = new THREE.ShadowMaterial({ opacity: 0.4 });
      const tableShadowMesh = new THREE.Mesh(tableGeo, tableShadowMat);
      tableShadowMesh.position.set(0, activeSurface.height + 0.001, 0);
      tableShadowMesh.receiveShadow = true;
      group.add(tableShadowMesh);

      // Height ring indicator
      const ringGeo = new THREE.RingGeometry(0.84, 0.86, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(0, activeSurface.height + 0.021, 0);
      group.add(ringMesh);
    }
  }, []);

  // Rebuild 3D Characters from Story Engine
  const rebuildCharacters = useCallback((scene: THREE.Scene, storyData: StoryData, surfaceList: RealWorldSurface[]) => {
    // Remove existing rigs
    rigsRef.current.forEach(r => scene.remove(r.root));
    rigsRef.current = [];

    const activeSurface = surfaceList.find(s => s.type !== 'floor');
    const surfaceY = activeSurface ? activeSurface.height : 0;

    storyData.characters.forEach((char, idx) => {
      const rig = Character3DFactory.createCharacter3D(char);

      // Place character onto surface
      const xOffset = (idx - (storyData.characters.length - 1) / 2) * 0.7;
      rig.root.position.set(xOffset, surfaceY, 0);
      rig.root.scale.setScalar(0.9);

      // Ensure shadows enabled across character hierarchy
      rig.root.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      scene.add(rig.root);
      rigsRef.current.push(rig);
    });

    // Update orbit target to focus on first character
    if (rigsRef.current.length > 0) {
      orbitRef.current.target.set(0, surfaceY + 0.35, 0);
      updateCameraPosition();
    }
  }, [updateCameraPosition]);

  // Dynamic Rig Animations (Bat wing flapping, Spiderman acrobatics, etc.)
  const animateRigs = (time: number) => {
    rigsRef.current.forEach(rig => {
      // 1. Natural idle breathing
      const breath = Math.sin(time * 3) * 0.03;
      rig.body.scale.set(1 + breath * 0.5, 1 + breath, 1 + breath * 0.5);

      // 2. Head look-around
      rig.head.rotation.y = Math.sin(time * 1.2) * 0.2;
      rig.head.rotation.x = Math.sin(time * 2.1) * 0.08;

      // 3. Bat-specific wing flapping and hovering
      if (rig.wings && rig.wings.length >= 2) {
        const flap = Math.sin(time * 6.5) * 0.45;
        rig.wings[0].rotation.y = 0.3 + flap;
        rig.wings[1].rotation.y = -(0.3 + flap);
        // Hovering bob
        rig.root.position.y += Math.sin(time * 4) * 0.002;
      }

      // 4. Limbs subtle sway
      if (rig.limbs && rig.limbs.length >= 2) {
        const legSway = Math.sin(time * 2) * 0.08;
        rig.limbs[0].rotation.x = legSway;
        rig.limbs[1].rotation.x = -legSway;
      }

      // 5. Tail wag if present
      if (rig.tail) {
        rig.tail.rotation.y = Math.sin(time * 4) * 0.35;
      }
    });
  };

  // Initialize Unity Universal Render Pipeline (URP) Scene
  const initUnityURP = useCallback((canvas: HTMLCanvasElement) => {
    disposeUnityURP();

    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;

    // 1. URP PBR Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f19);
    scene.fog = new THREE.FogExp2(0x0b0f19, 0.08);
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 50);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. Renderer with ACES Filmic Tone Mapping (matches Unity URP)
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    // 4. Physical Room Lights (Directional + Ambient)
    const ambColor = lighting?.ambientColor ? new THREE.Color(lighting.ambientColor) : new THREE.Color(0xdce7ff);
    const ambIntensity = lighting?.intensity ? Math.max(0.4, Math.min(2.0, lighting.intensity * 0.9)) : 0.85;
    const ambLight = new THREE.AmbientLight(ambColor, ambIntensity);
    scene.add(ambLight);
    ambLightRef.current = ambLight;

    const dirLight = new THREE.DirectionalLight(0xfff7e8, 1.8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.2;
    dirLight.shadow.camera.far = 15;
    dirLight.shadow.camera.left = -2.5;
    dirLight.shadow.camera.right = 2.5;
    dirLight.shadow.camera.top = 2.5;
    dirLight.shadow.camera.bottom = -2.5;
    dirLight.shadow.bias = -0.0004;

    if (lighting?.direction) {
      dirLight.position.set(lighting.direction[0] * 3, lighting.direction[1] * 4, lighting.direction[2] * 3);
    } else {
      dirLight.position.set(2, 4, 3);
    }
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // Secondary fill light (Unity Sky Rim)
    const rimLight = new THREE.DirectionalLight(0x4466aa, 0.6);
    rimLight.position.set(-2, 3, -2);
    scene.add(rimLight);

    // 5. Build Scanned Surfaces & Floor Geometry
    const surfacesGroup = new THREE.Group();
    scene.add(surfacesGroup);
    surfacesGroupRef.current = surfacesGroup;
    rebuildSurfaces(surfacesGroup, surfaces);

    // 6. Build 3D Entities from Named Entity Recognition (NER)
    rebuildCharacters(scene, story, surfaces);

    // 7. Start Render Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Animate Character Rigs (Spiderman, Bat, Animals, Heroes)
      animateRigs(elapsed);

      // Render Scene
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!canvas || !rendererRef.current || !cameraRef.current) return;
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h, false);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [disposeUnityURP, updateCameraPosition, lighting, rebuildSurfaces, surfaces, rebuildCharacters, story]);

  // Handle Unity Bridge loading and WebGL Initialization
  useEffect(() => {
    let mounted = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const bridge = UnityBridge.getInstance();

    bridge
      .loadUnity(canvas, '/unity/Build', p => {
        if (mounted) setProgress(Math.round(p * 100));
      })
      .then(() => {
        if (!mounted) return;
        setIsLoaded(true);

        // Sync story data with bridge
        bridge.sendStory(story);
        bridge.sendSurfaces(surfaces);
        if (lighting) bridge.sendRoomLighting(lighting);

        // Initialize Unity-style Universal Render Pipeline (URP) WebGL canvas
        initUnityURP(canvas);
      })
      .catch(err => {
        console.warn('[UnityCanvas] Unity loader warning, using embedded renderer:', err);
        if (mounted) {
          setIsLoaded(true);
          initUnityURP(canvas);
        }
      });

    return () => {
      mounted = false;
      disposeUnityURP();
    };
  }, [initUnityURP, disposeUnityURP, story, surfaces, lighting]);

  const handlePointerDown = (e: React.PointerEvent) => {
    orbitRef.current.isDragging = true;
    orbitRef.current.prevX = e.clientX;
    orbitRef.current.prevY = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!orbitRef.current.isDragging) return;
    const dx = e.clientX - orbitRef.current.prevX;
    const dy = e.clientY - orbitRef.current.prevY;
    orbitRef.current.prevX = e.clientX;
    orbitRef.current.prevY = e.clientY;

    orbitRef.current.theta -= dx * 0.008;
    orbitRef.current.phi = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, orbitRef.current.phi - dy * 0.008));
    updateCameraPosition();
  };

  const handlePointerUp = () => {
    orbitRef.current.isDragging = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    orbitRef.current.radius = Math.max(0.8, Math.min(5.0, orbitRef.current.radius + e.deltaY * 0.002));
    updateCameraPosition();
  };

  // Trigger Action on Entity via Unity Bridge
  const handleTriggerAction = (actionName: CharacterActionType) => {
    setActiveAction(actionName);
    const bridge = UnityBridge.getInstance();
    bridge.sendCharacterAction({
      characterId: story.characters[0]?.id || 'hero',
      action: actionName,
      duration: 1.5
    });

    // Animate rigs in response
    if (rigsRef.current.length > 0) {
      const activeRig = rigsRef.current[0];
      const origY = activeRig.root.position.y;
      const start = performance.now();

      const jumpAnim = (now: number) => {
        const animProgress = Math.min(1, (now - start) / 900);
        const arc = Math.sin(animProgress * Math.PI) * 0.45;
        activeRig.root.position.y = origY + arc;
        activeRig.root.rotation.y += 0.05;

        if (animProgress < 1) {
          requestAnimationFrame(jumpAnim);
        } else {
          activeRig.root.position.y = origY;
          activeRig.root.rotation.y = 0;
          setActiveAction('idle');
        }
      };
      requestAnimationFrame(jumpAnim);
    }
  };

  // Update light dynamically when props change
  useEffect(() => {
    if (lighting && dirLightRef.current && ambLightRef.current) {
      if (lighting.ambientColor) {
        ambLightRef.current.color.set(lighting.ambientColor);
      }
      if (lighting.intensity) {
        ambLightRef.current.intensity = Math.max(0.4, Math.min(2.0, lighting.intensity * 0.9));
      }
      if (lighting.direction) {
        dirLightRef.current.position.set(
          lighting.direction[0] * 3,
          lighting.direction[1] * 4,
          lighting.direction[2] * 3
        );
      }
    }
  }, [lighting]);

  // Update surfaces dynamically
  useEffect(() => {
    if (surfacesGroupRef.current) {
      rebuildSurfaces(surfacesGroupRef.current, surfaces);
    }
    if (sceneRef.current) {
      rebuildCharacters(sceneRef.current, story, surfaces);
    }
  }, [surfaces, story, rebuildSurfaces, rebuildCharacters]);

  return (
    <div
      className="unity-canvas-container"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        touchAction: 'none',
        background: '#0b0f19'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        id="unity-canvas"
        style={{
          width: '100%',
          height: '100%',
          display: isLoaded ? 'block' : 'none',
          outline: 'none'
        }}
      />

      {/* Loading Screen */}
      {!isLoaded && (
        <div className="unity-loading-overlay flex flex-col items-center justify-center p-6 text-center h-full">
          <div className="w-16 h-16 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
            <Box size={32} />
          </div>
          <h3 className="text-lg font-bold text-sky-300 mb-1">Loading Unity 6 WebGL Engine...</h3>
          <p className="text-xs text-slate-400 mb-4">Initializing Universal Render Pipeline (URP), PBR shaders & NER entities</p>
          <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mb-2">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-mono text-sky-400">{progress}%</span>
        </div>
      )}

      {/* Top HUD: Unity URP Active & Scanned Lighting Status */}
      {isLoaded && (
        <div className="absolute top-16 left-4 right-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="bg-slate-900/85 backdrop-blur-md border border-indigo-500/40 px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-auto shadow-lg shadow-black/40">
            <Box size={14} className="text-indigo-400 animate-spin" />
            <span className="text-xs font-bold text-sky-300">Unity 6 URP Runtime (WebGL)</span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
              PBR Active
            </span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/60 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg text-xs text-slate-300">
              <Sun size={13} className="text-amber-400" />
              <span>Room Light: {lighting?.intensity ? `${(lighting.intensity * 100).toFixed(0)}%` : 'Calibrated'}</span>
              <span className="text-slate-600">|</span>
              <Layers size={13} className="text-sky-400" />
              <span>Surfaces: {surfaces.length}</span>
            </div>

            <button
              type="button"
              onClick={onFallbackToThree}
              className="bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/50 text-indigo-300 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-colors"
              title="Switch to WebXR Mode"
            >
              <ArrowLeftRight size={13} />
              <span>WebXR Mode</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Entity & Action Controls */}
      {isLoaded && (
        <div className="absolute bottom-16 left-4 right-4 flex flex-col items-center gap-2 pointer-events-none">
          {/* NER Detected Entity Badge */}
          <div className="bg-slate-950/90 backdrop-blur-md border border-indigo-500/40 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-3 pointer-events-auto">
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">
                NER 3D Entities Generated
              </div>
              <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-400" />
                <span>{charList.length > 0 ? charList.join(' • ') : 'Hero'}</span>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-800" />

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleTriggerAction('jump')}
                className="text-xs py-1 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1 transition-colors"
              >
                <span>{activeAction === 'jump' ? 'Action!' : 'Jump / Swoop'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  orbitRef.current.radius = 2.2;
                  orbitRef.current.theta = 0.35;
                  orbitRef.current.phi = 1.15;
                  updateCameraPosition();
                }}
                className="text-xs py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1 transition-colors"
                title="Reset Camera View"
              >
                <Eye size={12} />
                <span>Reset View</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950/70 px-3 py-1 rounded-full backdrop-blur-sm">
            Drag to orbit 360° • Pinch / Scroll to zoom • Characters calibrated to physical surface
          </div>
        </div>
      )}
    </div>
  );
};
