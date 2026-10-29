# StoryAR models

`cat.glb` and `bird.glb` are generated from this project's existing Character3DFactory geometry. No external asset downloads or paid services are required. Regenerate with `npm run assets`.

Each includes named idle, walk, run, talk, sit, jump, wave, look, turn, happy, sad, surprised, fly, eat, drink and read clips. These are simple stylized keyframe animations, not motion capture. StoryEngine handles metre-scale translation and object interaction.

Other authored models can be stored here and referenced using `/models/name.glb` or `/models/name.gltf` in character/object `modelUrl`. Supply models you have permission to use. Self-contained GLB files are preferred; GLB bytes are cached in IndexedDB.
