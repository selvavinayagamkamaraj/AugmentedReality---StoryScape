import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { parseStory, normalizeStory } from '../src/ai/semanticStory.ts';
import { StoryEngine } from '../src/story/StoryEngine.ts';
import { VoiceManager } from '../src/audio/VoiceManager.ts';
import { Object3DFactory } from '../src/objects/Object3DFactory.ts';
import { Character3D } from '../src/characters/Character3D.ts';
import { ARController } from '../src/ar/ARController.ts';
import { SpatialDialogue } from '../src/dialogue/SpatialDialogue.ts';

const acceptance = "A small orange cat walks across the floor, jumps onto the wooden table, sees a red apple, walks toward it, eats it and says 'This is delicious!' Then a blue bird flies into the room and sits on the chair.";
const events = { onSceneChange() {}, onSubtitleChange() {}, onStoryComplete() {}, onPlayStateChange() {} };
function player(story = parseStory(acceptance)) {
  const world = new THREE.Scene(); const root = new THREE.Group(); root.position.set(1, 0.2, -2); world.add(root);
  const voice = new VoiceManager(); const engine = new StoryEngine(story, voice, events, root, world);
  return { engine, voice, root, world };
}
function tick(engine, seconds) { for (let i = 0; i < seconds * 60; i++) engine.update(1 / 60, new THREE.PerspectiveCamera()); }

test('acceptance extracts all entities, relations and exact dialogue', () => {
  const s = parseStory(acceptance);
  assert.deepEqual(s.characters.map(c => c.type), ['cat','bird']);
  assert.deepEqual(s.objects.map(o => o.id), ['table','apple','chair']);
  assert.deepEqual(s.scenes.flatMap(s => s.actions.map(a => a.action)), ['walk','jump','look','walk','eat','talk','fly','sit']);
  assert.equal(s.objects.find(o => o.id === 'apple').surfaceAnchor, 'table');
  assert.equal(s.scenes[4].actions[0].targetObjectId, 'apple');
  assert.equal(s.scenes[5].dialogue[0].text, 'This is delicious!');
  assert.equal(s.scenes[6].actions[0].characterId, 'bird');
});
test('unknown compound nouns and bare direct objects survive', () => {
  const s = parseStory('A robot picks up a magic crystal and sees a dragon fruit beside a quantum gizmo.');
  assert.deepEqual(s.characters.map(c => c.type), ['robot']);
  for (const name of ['magic crystal', 'dragon fruit', 'quantum gizmo']) assert(s.objects.some(o => o.name === name));
  assert(parseStory('Cat eats apple').objects.some(o => o.id === 'apple'));
});
test('schema validation retains objects, rejects bad references and sanitizes dimensions', () => {
  const raw = parseStory(acceptance); raw.objects[0].scale = -999;
  raw.scenes[0].actions.push({ characterId: 'missing', action: 'walk' });
  const s = normalizeStory(raw); assert.equal(s.objects.length, 3); assert.equal(s.objects[0].scale, 0.02);
  assert.equal(s.scenes[0].actions.length, 1); assert(s.warnings.some(w => w.includes('missing')));
});
test('separate objects have metre dimensions, not double scaling', () => {
  const apple = Object3DFactory.createObject3D({ id:'apple',name:'apple',type:'food',appearance:'red',scale:0.08 });
  const size = new THREE.Box3().setFromObject(apple.children[0]).getSize(new THREE.Vector3());
  assert(Math.abs(Math.max(size.x,size.y,size.z)-0.08)<0.001);
  const cat = new Character3D({id:'cat',name:'cat',type:'cat',appearance:'orange',initialScale:0.3});
  assert.equal(cat.group.scale.x, 1); cat.dispose();
});
test('acceptance plays to completion, consumes apple, lands bird and restores replay', () => {
  const {engine} = player(); engine.start();
  assert.equal(engine.charactersMap.get('bird').group.visible, false);
  tick(engine, 42);
  assert.equal(engine.getIsFinished(), true);
  assert.equal(engine.objectsMap.get('apple').visible, false);
  assert(engine.charactersMap.get('cat').group.position.y > 0.7);
  assert(engine.charactersMap.get('bird').group.position.y > 0.4);
  engine.restart(); assert.equal(engine.objectsMap.get('apple').visible, true);
  assert.equal(engine.objectsMap.get('apple').scale.x, 1); assert.equal(engine.currentSceneIndex, 0);
  engine.dispose();
});
test('real measured surfaces replace furniture and transform to anchor-local coordinates', () => {
  const {engine} = player();
  engine.bindSurfaces([{id:'real-table',type:'table',orientation:'horizontal',height:0.95,width:1,depth:0.7,position:{x:1.3,y:0.95,z:-2.3},confidence:1}]);
  engine.start();
  assert.equal(engine.objectsMap.get('table').visible, false);
  assert(Math.abs(engine.objectsMap.get('apple').position.y - 0.75)<0.001);
  tick(engine, 8); assert(Math.abs(engine.charactersMap.get('cat').group.position.y - 0.75)<0.001);
  engine.dispose();
});
test('pause freezes timeline and character transforms, resume continues', () => {
  const {engine} = player(); engine.start(); tick(engine, 1); engine.pause();
  const position = engine.charactersMap.get('cat').group.position.clone(); tick(engine, 10);
  assert(position.equals(engine.charactersMap.get('cat').group.position)); assert.equal(engine.currentSceneIndex, 0);
  engine.resume(); tick(engine, 4); assert(engine.currentSceneIndex > 0); engine.dispose();
});
test('text-only voice cancellation cannot complete an old line after restart', () => {
  const voice = new VoiceManager(); let ended = 0;
  voice.speak('old line', 'cat','cat',{onEnd:()=>ended++}); voice.stop(); voice.update(50); assert.equal(ended,0);
  voice.speak('new line', 'cat','cat',{onEnd:()=>ended++}); voice.pause(); voice.update(50); assert.equal(ended,0);
  voice.resume(); voice.update(50); assert.equal(ended,1);
  assert.strictEqual(voice.getOrCreateVoiceProfile('cat','cat'),voice.getOrCreateVoiceProfile('cat','bird'));
});
test('manual placement happens once and never follows a later camera transform', () => {
  const ar = Object.create(ARController.prototype);
  ar.status = {mode:'demo',ready:true}; ar.placed = false; ar.anchorGroup = new THREE.Group(); ar.reticle = new THREE.Group();
  let calls=0; ar.options = {onPlacementComplete:()=>calls++};
  assert.equal(ar.handlePlacementTap(),true); const position=ar.anchorGroup.position.clone();
  assert.equal(ar.handlePlacementTap(),false); assert.equal(calls,1); assert(position.equals(ar.anchorGroup.position));
});
test('XR cannot place without measured hit and rejects late anchor creation after reset', async () => {
  const ar = Object.create(ARController.prototype); ar.status={mode:'webxr',ready:false}; ar.placed=false;
  ar.anchorGroup=new THREE.Group(); ar.reticle=new THREE.Group(); ar.reticle.visible=true; ar.surfaces=[]; ar.generation=0; ar.disposed=false;
  ar.options={}; assert.equal(ar.handlePlacementTap(),false);
  let resolve; let deleted=false; ar.status.ready=true;
  ar.hit={createAnchor:()=>new Promise(r=>{resolve=r;})};
  assert.equal(ar.handlePlacementTap(),true); ar.resetPlacement(); resolve({delete:()=>{deleted=true;}}); await Promise.resolve();
  assert.equal(deleted,true);
});
test('world-space dialogue follows head position and camera world orientation', () => {
  const original = globalThis.document;
  const ctx = new Proxy({ measureText:(text)=>({width:text.length*12}) },{get:(obj,key)=>obj[key]||(()=>{})});
  globalThis.document={createElement:()=>({getContext:()=>ctx,width:512,height:256})};
  try {
    const bubble = new SpatialDialogue(); bubble.show('Cat','Hello');
    const camera=new THREE.PerspectiveCamera(); camera.rotation.y=0.3;
    bubble.update(new THREE.Vector3(2,1,-3),camera);
    assert.equal(bubble.group.position.x,2); assert.equal(bubble.group.position.z,-3);
    assert(bubble.group.position.y>1); assert(bubble.group.quaternion.equals(camera.quaternion));
    bubble.hide(); assert.equal(bubble.group.visible,false); bubble.dispose();
  } finally { globalThis.document=original; }
});
test('arbitrary environment elements are independent scene objects', () => {
  const story=parseStory('A cat walks in the forest.'); story.environment.virtualElements.push('glowing mushroom');
  const {engine,root}=player(story);
  const environment=root.children.find(c=>c.children.some(x=>x.name==='glowing mushroom'));
  assert(environment); assert(environment.children.length>=6); engine.dispose();
});

test('local model coverage rejects omitted actions and duplicate dialogue', async () => {
  const {coverageProblems}=await import('../src/ai/semanticStory.ts');
  const story=parseStory(acceptance); assert.deepEqual(coverageProblems(story,acceptance),[]);
  story.scenes.splice(1,1); story.scenes[0].dialogue.push({characterId:'cat',text:'This is delicious!'});
  assert(coverageProblems(story,acceptance).some(p=>p.includes('jump')));
  assert(coverageProblems(story,acceptance).some(p=>p.includes('dialogue')));
});
test('bundled GLBs load with geometry, head and named animation clips', async () => {
  const {readFile}=await import('node:fs/promises'); const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
  for (const type of ['cat','bird']) {
    const bytes=await readFile(new URL(`../public/models/${type}.glb`,import.meta.url));
    const model=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
    assert(model.scene.getObjectByName('head'));
    for (const name of ['idle','walk','run','talk','sit','jump','wave','look','turn','happy','sad','surprised']) assert(model.animations.some(a=>a.name===name));
    const mixer=new THREE.AnimationMixer(model.scene); mixer.clipAction(model.animations.find(a=>a.name==='talk')).play(); mixer.update(0.25);
    assert.notEqual(model.scene.getObjectByName('head').quaternion.x,0);
  }
});

test('Named Entity Recognition extracts spiderman and bat with 3D rigs and actions', () => {
  const story = parseStory('Spiderman swings onto the table and says "I am Spider-Man!" while a bat flies overhead.');
  assert(story.characters.some(c => c.type === 'spiderman'));
  assert(story.characters.some(c => c.type === 'bat'));

  const spidermanChar = new Character3D({ id: 'spiderman', name: 'Spider-Man', type: 'spiderman', initialScale: 1.7 });
  assert.equal(spidermanChar.group.children.length > 0, true);
  spidermanChar.dispose();

  const batChar = new Character3D({ id: 'bat', name: 'Bat', type: 'bat', initialScale: 0.28 });
  assert.equal(batChar.rig.wings?.length, 2);
  batChar.dispose();
});
