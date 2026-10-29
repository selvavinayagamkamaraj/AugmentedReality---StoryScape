import { cacheValue } from '../storage/storyStore';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { StoryObject3D } from '../types/story';
import { Object3DFactory } from '../objects/Object3DFactory';

export interface GenerationProvider { load(url: string): Promise<GLTF>; }

export class LocalModelProvider implements GenerationProvider {
  async load(url: string) {
    if (!/^\/models\/[a-zA-Z0-9_/-]+\.(glb|gltf)$/.test(url) || url.includes('..')) throw new Error('Use an authored /models/ asset');
    const loader = new GLTFLoader();
    if (url.endsWith('.gltf')) return loader.loadAsync(url);
    let bytes = await cacheValue('assets', url) as ArrayBuffer | undefined;
    if (!bytes) {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`Asset HTTP ${response.status}`);
      bytes = await response.arrayBuffer();
    }
    const model = await loader.parseAsync(bytes, '/models/');
    void cacheValue('assets', url, bytes); return model;
  }
}
export function disposeObject(root: THREE.Object3D) {
  root.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
        material.dispose();
      }
    }
  }); root.removeFromParent();
}
export function fitModel(root: THREE.Object3D, size: number, heightOnly = false) {
  const box = new THREE.Box3().setFromObject(root); const extent = box.getSize(new THREE.Vector3());
  const factor = size / Math.max(0.001, heightOnly ? extent.y : Math.max(extent.x, extent.y, extent.z));
  root.scale.multiplyScalar(factor); root.position.y -= box.min.y * factor;
}
export class AssetGenerator {
  readonly provider: GenerationProvider = new LocalModelProvider();
  createObject(item: StoryObject3D): THREE.Group {
    const group = Object3DFactory.createObject3D(item);
    group.name = item.name; group.userData.assetSource = item.placeholder ? 'labelled procedural placeholder' : 'procedural 3D';
    if (item.placeholder && typeof document !== 'undefined') {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#102234'; ctx.fillRect(0, 0, 512, 96); ctx.fillStyle = 'white'; ctx.font = '28px sans-serif';
        ctx.fillText(item.name.slice(0, 32), 10, 38); ctx.font = '20px sans-serif'; ctx.fillText('Approximate placeholder', 10, 72);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: true }));
        sprite.scale.set(0.4, 0.075, 1); sprite.position.y = (item.scale || 0.2) + 0.1; group.add(sprite);
      }
    }
    return group;
  }
}

