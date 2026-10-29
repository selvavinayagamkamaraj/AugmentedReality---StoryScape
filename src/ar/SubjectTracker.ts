import * as THREE from 'three';
import type { ObjectDetection } from '@tensorflow-models/coco-ssd';

export interface DetectedSubject {
  type: 'person' | 'table' | 'chair' | 'floor' | 'none';
  label: string;
  score: number;
  bbox?: [number, number, number, number];
  worldPosition: THREE.Vector3;
}

export class SubjectTracker {
  private model: ObjectDetection | null = null;
  private busy = false;
  private disposed = false;
  private last = 0;
  private video: HTMLVideoElement;
  private onLabels?: (labels: string[]) => void;
  public preferredMode: 'auto' | 'person' | 'table' | 'floor' = 'auto';

  constructor(video: HTMLVideoElement, onLabels?: (labels: string[]) => void) {
    this.video = video;
    this.onLabels = onLabels;
  }

  public async init(): Promise<boolean> {
    try {
      await import('@tensorflow/tfjs');
      const coco = await import('@tensorflow-models/coco-ssd');
      const model = await coco.load({ base: 'lite_mobilenet_v2' });
      if (this.disposed) {
        model.dispose();
        return false;
      }
      this.model = model;
      return true;
    } catch {
      return false;
    }
  }

  public start() {
    this.disposed = false;
  }

  public stop() {
    this.disposed = true;
  }

  public async update(time: number, camera?: THREE.Camera): Promise<DetectedSubject | null> {
    if (this.disposed || this.busy || !this.model || time - this.last < 500 || this.video.readyState < 2) {
      return null;
    }

    this.last = time;
    this.busy = true;

    try {
      const predictions = await this.model.detect(this.video, 8, 0.5);
      const labels = [...new Set(predictions.map(p => p.class))];
      this.onLabels?.(labels);

      if (predictions.length === 0) {
        return null;
      }

      // Check for person or table
      const person = predictions.find(p => p.class === 'person');
      const table = predictions.find(p => ['dining table', 'table', 'desk', 'chair', 'couch', 'bed'].includes(p.class));

      const target = this.preferredMode === 'person' ? person : this.preferredMode === 'table' ? table : (person || table);

      if (target) {
        const [x, y, w, h] = target.bbox;
        const normX = ((x + w * 0.5) / (this.video.videoWidth || 640)) * 2 - 1;
        const normY = -(((y + h * 0.3) / (this.video.videoHeight || 480)) * 2 - 1);

        const worldPos = new THREE.Vector3(normX * 0.8, target.class === 'person' ? 0.4 : 0.0, -1.6);
        if (camera) {
          const v = new THREE.Vector3(normX, normY, 0.5);
          v.unproject(camera);
          const dir = v.sub(camera.position).normalize();
          worldPos.copy(camera.position).add(dir.multiplyScalar(1.8));
        }

        const isPerson = target.class === 'person';
        return {
          type: isPerson ? 'person' : 'table',
          label: target.class,
          score: target.score,
          bbox: target.bbox,
          worldPosition: worldPos
        };
      }

      return null;
    } catch {
      this.onLabels?.([]);
      return null;
    } finally {
      this.busy = false;
    }
  }

  public dispose() {
    this.disposed = true;
    if (!this.busy && this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}
