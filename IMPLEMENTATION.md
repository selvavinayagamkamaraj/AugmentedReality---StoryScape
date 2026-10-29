# StoryAR implementation audit

Baseline (2026-10-05): React/Vite + Express/Ollama; Three.js and TensorFlow dependencies already installed. No Git metadata or AGENTS.md found. Dev servers start on 5173/3001. Production build fails on five unused declarations. Browser launch hits the development certificate trust error.

Active path uses CharacterSprite and SpeechController; existing Character3D, Object3DFactory, VoiceManager and SpatialDialogue are disconnected. ARController has no XR session, derives world coordinates from bounding boxes and continuously moves the anchor. Window-wide touch listeners leak, placement can fire twice and restart playback, dimensions use 100vh/100vw, QR uses a stale hard-coded IP. Server normalization removes objects and relationships; failed inference substitutes an unrelated astronaut story. Actions overwrite each other immediately.

Incremental plan:
1. Fix build, viewport/camera lifecycle, QR address and explicit fallback UI. Run build.
2. Add XR session/hit tests, fixed placement, optional anchors, planes, lighting and depth; inspect installed Three.js APIs. Run build.
3. Preserve and validate semantic scene data; prompt-derived offline parser, local inference, separate assets and environment elements. Test acceptance and unknown nouns.
4. Connect existing 3D rigs, sequence interactions, integrate stable voices and spatial bubbles; add GLB loader fallback and IndexedDB storage. Test playback and cancellation.
5. Add diagnostics, run build/lint/regression tests and browser smoke tests. Record physical Android/XR tests as unverified unless a real device is available.

Constraints: camera/CV alone does not supply metric pose or occlusion. Unknown surface classes require user labeling. Never report these as measured. Optional XR features must report actual session/data availability. Preserve parent authoring, demo and mobile handoff flows.
