import * as THREE from 'three';

export class SpatialDialogue {
  public group: THREE.Group;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private texture: THREE.CanvasTexture;
  private spriteMesh: THREE.Mesh;
  private isVisible: boolean = false;
  private targetOffset: THREE.Vector3 = new THREE.Vector3(0, 0.24, 0);

  constructor() {
    this.group = new THREE.Group();

    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 256;
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    // Plane geometry representing the 3D speech bubble
    // Real-world scale: 0.6m wide, 0.3m tall
    const geometry = new THREE.PlaneGeometry(0.65, 0.325);
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.spriteMesh = new THREE.Mesh(geometry, material);
    this.group.add(this.spriteMesh);
    this.group.visible = false;
  }

  public show(speaker: string, text: string, bubbleColor: string = '#38bdf8') {
    if (!this.ctx) return;
    this.isVisible = true;
    this.group.visible = true;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    // Bubble styling
    const padding = 20;
    const boxX = padding;
    const boxY = padding;
    const boxW = width - padding * 2;
    const boxH = height - padding * 2 - 30; // leave room for pointer tail
    const radius = 24;

    // Soft drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;

    // Speech bubble background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, radius);
    ctx.fill();

    // Bubble border
    ctx.strokeStyle = bubbleColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Bottom pointer triangle toward character head
    const tailCenterX = width / 2;
    const tailTopY = boxY + boxH;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.beginPath();
    ctx.moveTo(tailCenterX - 18, tailTopY - 2);
    ctx.lineTo(tailCenterX, tailTopY + 24);
    ctx.lineTo(tailCenterX + 18, tailTopY - 2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = bubbleColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tailCenterX - 18, tailTopY - 1);
    ctx.lineTo(tailCenterX, tailTopY + 24);
    ctx.lineTo(tailCenterX + 18, tailTopY - 1);
    ctx.stroke();

    ctx.restore();

    // Speaker Name Tag Pill
    ctx.fillStyle = bubbleColor;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(speaker.toUpperCase(), boxX + 18, boxY + 36);

    // Text wrapping
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 24px system-ui, sans-serif';

    const words = text.split(' ');
    let line = '';
    let lineY = boxY + 74;
    const maxLineW = boxW - 36;
    const lineHeight = 32;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxLineW && n > 0) {
        ctx.fillText(line, boxX + 18, lineY);
        line = words[n] + ' ';
        lineY += lineHeight;
        if (lineY > boxY + boxH - 12) break; // clamp overflow
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, boxX + 18, lineY);

    this.texture.needsUpdate = true;
  }

  public hide() {
    this.isVisible = false;
    this.group.visible = false;
  }

  public update(anchorWorldPosition: THREE.Vector3, camera: THREE.Camera) {
    if (!this.isVisible) return;

    // Follow character position in world space
    this.group.position.copy(anchorWorldPosition).add(this.targetOffset);

    // Billboard orientation: always face camera
    camera.getWorldQuaternion(this.group.quaternion);
  }

  public dispose() {
    this.spriteMesh.geometry.dispose();
    if (this.spriteMesh.material instanceof THREE.Material) {
      this.spriteMesh.material.dispose();
    }
    this.texture.dispose();
  }
}
