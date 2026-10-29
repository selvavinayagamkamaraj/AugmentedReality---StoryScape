import React, { useEffect, useRef, useState } from 'react';
import type { StoryData, StoryScene, SurfaceType, RealWorldSurface, RoomEnvironment } from '../types/story';
import { ARController } from '../ar/ARController';
import type { ARStatus } from '../ar/ARController';
import { VoiceManager } from '../audio/VoiceManager';
import { StoryEngine } from '../story/StoryEngine';
import { Subtitles } from './Subtitles';
import { UnityCanvas } from './UnityCanvas';
import { 
  Scan, 
  MapPin, 
  Camera, 
  Sparkles, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  ArrowLeft,
  CheckCircle2,
  Box
} from 'lucide-react';

export const ChildMode: React.FC<{ story: StoryData; onExit: () => void }> = ({ story, onExit }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const arRef = useRef<ARController | null>(null);
  const engineRef = useRef<StoryEngine | null>(null);
  const voiceRef = useRef<VoiceManager | null>(null);

  const [status, setStatus] = useState<ARStatus | null>(null);
  const [placed, setPlaced] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [muted, setMuted] = useState(false);
  const [scene, setScene] = useState<StoryScene | null>(null);
  const [subtitle, setSubtitle] = useState<React.ComponentProps<typeof Subtitles>['subtitle']>(null);
  const [backend, setBackend] = useState('checking');
  const [hasSurfaceHit, setHasSurfaceHit] = useState(false);
  const [showCameraPos, setShowCameraPos] = useState(false);
  const [showPlanes, setShowPlanes] = useState(true);
  const [metrics, setMetrics] = useState<{ characters: { name: string; asset: string }[]; surfaces: number; triangles: number }>({ characters: [], surfaces: 0, triangles: 0 });
  const [surfaceToMap, setSurfaceToMap] = useState<SurfaceType>('table');
  const [surfacesList, setSurfacesList] = useState<RealWorldSurface[]>([]);
  const [error, setError] = useState('');
  const [scanMessage, setScanMessage] = useState('Aim camera at floor and furniture to map your space');
  const [rendererEngine, setRendererEngine] = useState<'three' | 'unity'>('three');
  const [lightingState, setLightingState] = useState<RoomEnvironment['lighting'] | undefined>(undefined);

  const debug = location.pathname === '/debug' || new URLSearchParams(location.search).get('debug') === 'true';

  useEffect(() => {
    if (!canvas.current || !video.current || !overlay.current) return;
    let ar: ARController;
    try {
      ar = new ARController({
        canvas: canvas.current,
        videoElement: video.current,
        overlay: overlay.current,
        onStatus: s => {
          setStatus(s);
          setLightingState(ar.environmentAnalyzer?.getRoom()?.lighting);
          setMetrics({
            characters: [...(engineRef.current?.charactersMap.values() || [])].map(c => ({
              name: c.character.name,
              asset: c.group.userData.assetSource || 'procedural 3D'
            })),
            surfaces: arRef.current?.surfaces.length || 0,
            triangles: arRef.current?.renderer.info.render.triangles || 0
          });
          setSurfacesList([...(arRef.current?.surfaces || [])]);
        },
        onPlacementComplete: () => {
          setPlaced(true);
          setFinished(false);
          voiceRef.current?.unlockAudio();
          engineRef.current?.bindSurfaces(ar.surfaces);
          engineRef.current?.start();
        },
        onSurfaceDetected: (surf) => {
          setHasSurfaceHit(true);
          setSurfacesList([...(arRef.current?.surfaces || [])]);
          setScanMessage(`Detected ${surf.type} at height ${surf.height.toFixed(2)}m`);
        },
        onSessionEnd: () => {
          engineRef.current?.pause();
          setPlaced(false);
        }
      });
    } catch (e) {
      queueMicrotask(() => setError(`3D renderer unavailable: ${(e as Error).message}`));
      return;
    }

    arRef.current = ar;

    const voice = new VoiceManager();
    voiceRef.current = voice;

    const engine = new StoryEngine(story, voice, {
      onSceneChange: (_, s) => setScene(s),
      onSubtitleChange: setSubtitle,
      onPlayStateChange: setPlaying,
      onStoryComplete: () => setFinished(true),
    }, ar.anchorGroup, ar.scene);
    engineRef.current = engine;

    ar.startRenderLoop(delta => engine.update(delta, ar.getRenderCamera()));

    const abort = new AbortController();
    fetch('/api/health', { signal: abort.signal })
      .then(r => r.json())
      .then(data => setBackend(`${data.backend || 'API'}: ${data.status}; ${data.nlp || 'unknown'}`))
      .catch(() => {
        if (!abort.signal.aborted) setBackend('unavailable; browser rules');
      });

    return () => {
      abort.abort();
      engine.dispose();
      voice.dispose();
      ar.dispose();
      arRef.current = null;
    };
  }, [story]);

  useEffect(() => {
    if (status?.mode === 'webxr') {
      document.body.classList.add('in-webxr');
    } else {
      document.body.classList.remove('in-webxr');
    }
    return () => {
      document.body.classList.remove('in-webxr');
    };
  }, [status?.mode]);

  const handleMapSurface = () => {
    if (!arRef.current) return;
    arRef.current.captureSurface(surfaceToMap);
    setSurfacesList([...arRef.current.surfaces]);
    setScanMessage(`Pinned ${surfaceToMap} into room map!`);
  };

  const handleAdjustHeight = (delta: number) => {
    if (!arRef.current) return;
    arRef.current.adjustReticleHeight(delta);
  };

  const handleResetSurfaces = () => {
    if (!arRef.current) return;
    arRef.current.resetSurfaces();
    setSurfacesList([...arRef.current.surfaces]);
    setScanMessage('Surfaces reset to default floor plane.');
  };

  const handleFinishScanAndAugment = () => {
    if (!arRef.current) return;
    voiceRef.current?.unlockAudio();
    const ok = arRef.current.handlePlacementTap();
    if (!ok && (status?.mode === 'webxr' || arRef.current.currentMode === 'webxr')) {
      setScanMessage('Aim phone down toward the floor or table so the target ring can lock onto a surface!');
    }
  };

  const handleReScan = () => {
    if (!arRef.current || !engineRef.current) return;
    engineRef.current.pause();
    arRef.current.resetPlacement();
    setHasSurfaceHit(false);
    setPlaced(false);
    setFinished(false);
    arRef.current.setPlanesVisible(true);
    setShowPlanes(true);
    setScanMessage('Ready to map new room surfaces.');
  };

  const [xrLaunching, setXrLaunching] = useState(false);

  const handleLaunchXR = async () => {
    if (!arRef.current || xrLaunching) return;
    setXrLaunching(true);
    voiceRef.current?.unlockAudio();
    setScanMessage('Requesting WebXR spatial session...');
    try {
      const ok = await arRef.current.startXR();
      if (ok) {
        voiceRef.current?.unlockAudio();
        setScanMessage('WebXR 6DoF spatial tracking active! Move around room to map surfaces.');
      } else {
        setScanMessage('WebXR hardware session not supported or rejected on this browser. Camera preview active.');
      }
    } catch (e) {
      setScanMessage(`WebXR unavailable: ${(e as Error)?.message || 'Session rejected'}`);
    } finally {
      setXrLaunching(false);
    }
  };

  const handleTogglePlanes = () => {
    if (!arRef.current) return;
    const next = !showPlanes;
    setShowPlanes(next);
    arRef.current.setPlanesVisible(next);
  };

  return (
    <div
      className="child-mode-container spatial-view"
      data-mode={status?.mode}
      ref={overlay}
      onClick={(e) => {
        if (!placed && status?.mode === 'webxr') {
          const target = e.target as HTMLElement;
          if (target.tagName !== 'BUTTON' && !target.closest('button')) {
            handleFinishScanAndAugment();
          }
        }
      }}
    >
      <video ref={video} playsInline muted autoPlay className="ar-camera-feed" hidden={status?.mode !== 'camera'} />
      {rendererEngine === 'three' ? (
        <canvas ref={canvas} className="ar-three-canvas" />
      ) : (
        <UnityCanvas
          story={story}
          surfaces={surfacesList}
          lighting={lightingState}
          onFallbackToThree={() => setRendererEngine('three')}
        />
      )}

      {/* Header */}
      <header className="spatial-header">
        <button onClick={onExit} className="flex items-center gap-1.5 font-bold">
          <ArrowLeft size={16} /> Exit
        </button>
        {status?.mode === 'webxr' && (
          <button
            type="button"
            onClick={() => void arRef.current?.webxrManager.endSession()}
            className="webxr-exit-btn"
            title="Exit WebXR back to 3D mode"
          >
            <ArrowLeft size={15} /> Exit WebXR
          </button>
        )}
        <button
          type="button"
          onClick={() => setRendererEngine(prev => prev === 'three' ? 'unity' : 'three')}
          className="text-xs py-1 px-2.5 rounded-full border border-indigo-500/50 bg-indigo-950/60 text-indigo-300 font-semibold flex items-center gap-1 hover:bg-indigo-900/80 transition-colors"
          title="Toggle between WebXR/Three.js and Unity Engine renderer"
        >
          <Box size={13} />
          <span>{rendererEngine === 'three' ? 'Unity Mode' : 'WebXR Mode'}</span>
        </button>
        <strong title={story.title}>{scene?.title || story.title}</strong>
        <button onClick={() => setMuted(voiceRef.current?.toggleMute() || false)}>
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </header>

      {/* SCANNING & ROOM MAPPING HUD (Camera/3D Studio modes when not placed) */}
      {!placed && status?.mode !== 'webxr' && (
        <div className="room-scanner-overlay">
          <div className="scanner-hud-card animate-fade-in">
            <div className="scanner-header-row">
              <div className="scanner-title-group">
                <span className="scanner-pulse-dot" />
                <strong className="text-base text-sky-300 font-bold">Room Spatial Scanner</strong>
              </div>
              <span className="text-xs px-2.5 py-1 bg-slate-800 text-sky-400 rounded-full font-semibold border border-slate-700">
                {status?.mode === 'camera' ? 'Camera Feed' : '3D Studio'}
              </span>
            </div>

            <p className="scanner-instruction">
              {error || scanMessage || 'Move device slowly to map floor, tables, and physical surfaces.'}
            </p>

            {/* Camera / AR Mode Switcher */}
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={() => void arRef.current?.initCamera()}
                className="secondary-btn text-xs py-1.5 px-3 flex items-center gap-1"
              >
                <Camera size={14} /> Open Rear Camera
              </button>
              <button
                type="button"
                disabled={xrLaunching}
                onClick={handleLaunchXR}
                className="secondary-btn text-xs py-1.5 px-3 flex items-center gap-1"
              >
                <Sparkles size={14} className={xrLaunching ? 'animate-spin' : ''} />
                <span>{xrLaunching ? 'Starting XR...' : 'Launch WebXR'}</span>
              </button>
              <button
                type="button"
                onClick={() => arRef.current?.useDemo()}
                className="secondary-btn text-xs py-1.5 px-3"
              >
                3D Studio
              </button>
            </div>

            {/* Live Mapped Surfaces */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Mapped Surfaces ({surfacesList.length})</span>
                <span className="text-emerald-400 font-semibold">✓ 3D Grid Outlines Visible</span>
              </div>
              <div className="scanner-surfaces-grid">
                {surfacesList.map((s, idx) => (
                  <span key={s.id || idx} className={`surface-chip ${s.type}`}>
                    <CheckCircle2 size={12} />
                    {s.type.toUpperCase()}: {s.height.toFixed(2)}m
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Mapping Tools */}
            <div className="scanner-tools-bar">
              <label className="text-xs text-slate-300 flex items-center gap-1">
                Pin as:
                <select
                  value={surfaceToMap}
                  onChange={e => setSurfaceToMap(e.target.value as SurfaceType)}
                  className="bg-slate-800 text-white rounded text-xs py-1 px-2 border border-slate-600"
                >
                  <option value="table">Table / Desk (0.75m)</option>
                  <option value="chair">Chair (0.45m)</option>
                  <option value="floor">Floor (0.00m)</option>
                  <option value="bed">Bed (0.55m)</option>
                  <option value="wall">Wall (Vertical)</option>
                </select>
              </label>

              <button
                type="button"
                onClick={handleMapSurface}
                className="secondary-btn text-xs py-1 px-2.5 flex items-center gap-1 bg-sky-950 border-sky-600 text-sky-200"
              >
                <MapPin size={13} /> Pin at Target
              </button>

              <button
                type="button"
                onClick={() => handleAdjustHeight(-0.05)}
                className="secondary-btn text-xs py-1 px-2"
                title="Lower reticle height"
              >
                -5cm
              </button>
              <button
                type="button"
                onClick={() => handleAdjustHeight(0.05)}
                className="secondary-btn text-xs py-1 px-2"
                title="Raise reticle height"
              >
                +5cm
              </button>

              {status?.mode === 'camera' && (
                <button
                  type="button"
                  onClick={() => void arRef.current?.enableVision()}
                  className="secondary-btn text-xs py-1 px-2 bg-emerald-950 text-emerald-300 border-emerald-600"
                >
                  🤖 Vision Detect
                </button>
              )}

              <button
                type="button"
                onClick={handleResetSurfaces}
                className="secondary-btn text-xs py-1 px-2 text-slate-400 hover:text-white"
                title="Reset to single floor"
              >
                <RefreshCw size={12} />
              </button>
            </div>

            {/* Story Cast Placement Blueprint */}
            <div className="story-mapping-badge">
              <div className="font-semibold text-sky-300 mb-0.5">Physical Story Blueprint:</div>
              <div className="text-xs text-slate-300">
                {story.characters.map(c => c.name).join(', ')} → Physical placement on mapped floor & furniture.
              </div>
            </div>

            {/* Finish Scan & Place Story Button */}
            <button
              type="button"
              className="scanner-start-btn flex items-center justify-center gap-2"
              onClick={handleFinishScanAndAugment}
            >
              <Sparkles size={18} />
              <span>Finish Scanning & Augment Story</span>
            </button>
          </div>
        </div>
      )}

      {/* WebXR Minimal Non-Obtrusive AR Reticle Guide */}
      {status?.mode === 'webxr' && !placed && (
        <div className="webxr-minimal-guide animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className={`scanner-pulse-dot ${hasSurfaceHit || surfacesList.length > 0 ? 'ready' : ''}`} />
              <div className="text-left">
                <div className="text-sm font-bold text-sky-300">
                  {hasSurfaceHit || surfacesList.length > 0 ? 'Surface Detected' : 'Aim at floor or table'}
                </div>
                <div className="text-xs text-slate-300">
                  {hasSurfaceHit || surfacesList.length > 0
                    ? 'Tap screen or click button to start story'
                    : scanMessage || 'Move phone slowly to align target ring'}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="webxr-place-action-btn flex items-center gap-1.5"
              onClick={handleFinishScanAndAugment}
            >
              <Sparkles size={16} />
              <span>Start Story</span>
            </button>
          </div>
        </div>
      )}

      {/* Subtitles (Narration & Dialogue) */}
      <Subtitles subtitle={subtitle} />

      {/* Bottom Playback Controls (when placed) */}
      {placed && (
        <footer className="spatial-controls">
          <button
            onClick={() => (playing ? engineRef.current?.pause() : engineRef.current?.resume())}
            className="flex items-center gap-1.5"
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
            <span>{playing ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={() => {
              setFinished(false);
              engineRef.current?.restart();
            }}
            className="flex items-center gap-1.5"
          >
            <RotateCcw size={16} />
            <span>Replay</span>
          </button>

          <button onClick={handleReScan} className="flex items-center gap-1.5 bg-amber-900/60 border-amber-600">
            <Scan size={16} />
            <span>Re-Scan Room</span>
          </button>

          <button onClick={handleTogglePlanes} className="flex items-center gap-1.5">
            {showPlanes ? <EyeOff size={16} /> : <Eye size={16} />}
            <span>{showPlanes ? 'Hide Grid' : 'Show Grid'}</span>
          </button>

          {status?.mode === 'demo' && (
            <>
              <button onClick={() => arRef.current?.moveDemo(0.8)}>Near</button>
              <button onClick={() => arRef.current?.moveDemo(1.25)}>Far</button>
            </>
          )}

          {finished && <strong className="text-amber-400 font-bold ml-2">🎉 The End!</strong>}
        </footer>
      )}

      {/* Diagnostics / Debug Screen */}
      {debug && (
        <details className="spatial-debug">
          <summary>Diagnostics</summary>
          <pre>
            {JSON.stringify(
              {
                ...status,
                cameraPosition: showCameraPos ? status?.cameraPosition : 'hidden',
                Three: 'r186',
                AIBackend: backend,
                NLP: story.nlpSource || 'demo',
                TTS: 'speechSynthesis' in window,
                ...metrics
              },
              null,
              2
            )}
          </pre>
          <label>
            <input type="checkbox" checked={showCameraPos} onChange={e => setShowCameraPos(e.target.checked)} /> Camera position
          </label>
          {['planes', 'anchors', 'coordinate axes', 'bounding boxes', 'collision geometry', 'light direction'].map(name => (
            <label key={name}>
              <input type="checkbox" onChange={e => arRef.current?.setDebug(name, e.target.checked)} /> {name}
            </label>
          ))}
          <details>
            <summary>Current scene JSON</summary>
            <pre>{JSON.stringify(story, null, 2)}</pre>
          </details>
        </details>
      )}
    </div>
  );
};
