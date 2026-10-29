import * as THREE from 'three';
import type { StoryEnvironment } from '../types/story';

export class EnvironmentGenerator {
  public group: THREE.Group;
  private particleSystem: THREE.Points | null = null;
  private particleVelocities: Float32Array | null = null;
  private animatedMeshes: THREE.Mesh[] = [];

  constructor() {
    this.group = new THREE.Group();
  }

  /**
   * Generates a 3D environment scene based on story environment settings
   */
  public generateEnvironment(env?: StoryEnvironment): THREE.Group {
    this.dispose();
    this.group = new THREE.Group();
    this.animatedMeshes = [];

    const theme = (env?.theme || 'room').toLowerCase();

    if (theme.includes('forest')) {
      this.createForestScene();
    } else if (theme.includes('beach')) {
      this.createBeachScene();
    } else if (theme.includes('space')) {
      this.createSpaceScene();
    } else if (theme.includes('castle') || theme.includes('fantasy')) {
      this.createFantasyScene();
    } else if (theme.includes('underwater')) {
      this.createUnderwaterScene();
    } else {
      // Room / Hybrid scene: subtle magical floating particles
      this.createHybridRoomScene();
    }

    return this.group;
  }

  // 1. FOREST SCENE
  private createForestScene() {
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, flatShading: true });
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.7, flatShading: true });

    // Place trees in perimeter
    const treePositions = [
      [-1.8, 0, -2.5],
      [1.8, 0, -2.6],
      [-2.2, 0, -1.2],
      [2.2, 0, -1.4],
      [0.0, 0, -3.2]
    ];

    treePositions.forEach(([x, y, z]) => {
      const treeGroup = new THREE.Group();
      treeGroup.position.set(x, y, z);

      // Trunk
      const trunkGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.0, 8);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.5;
      trunk.castShadow = true;
      treeGroup.add(trunk);

      // 3 Foliage cones
      for (let i = 0; i < 3; i++) {
        const coneGeo = new THREE.ConeGeometry(0.6 - i * 0.12, 0.7, 7);
        const cone = new THREE.Mesh(coneGeo, treeMat);
        cone.position.y = 1.0 + i * 0.45;
        cone.castShadow = true;
        treeGroup.add(cone);
      }

      this.group.add(treeGroup);
    });

    // Decorative Rocks & Bushes
    const propPositions = [
      [-0.9, 0, -1.8],
      [1.1, 0, -1.7],
      [-1.3, 0, -2.2]
    ];

    propPositions.forEach(([x, , z], idx) => {
      if (idx % 2 === 0) {
        const rockGeo = new THREE.DodecahedronGeometry(0.18, 1);
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.set(x, 0.12, z);
        rock.castShadow = true;
        this.group.add(rock);
      } else {
        const bushGeo = new THREE.DodecahedronGeometry(0.25, 1);
        const bush = new THREE.Mesh(bushGeo, bushMat);
        bush.position.set(x, 0.16, z);
        bush.castShadow = true;
        this.group.add(bush);
      }
    });

    // Falling Leaf Particles
    this.createAtmosphericParticles(100, 0x84cc16, 0.03, 'falling');
  }

  // 2. BEACH SCENE
  private createBeachScene() {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9, flatShading: true });

    // Rocks scattered on shore
    const rockPositions = [
      [-1.5, 0, -2.0],
      [1.4, 0, -2.2],
      [-0.8, 0, -2.8]
    ];

    rockPositions.forEach(([x, , z]) => {
      const rockGeo = new THREE.DodecahedronGeometry(0.2, 1);
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(x, 0.12, z);
      rock.castShadow = true;
      this.group.add(rock);
    });

    // Ambient floating sea-mist / glimmer particles
    this.createAtmosphericParticles(80, 0x38bdf8, 0.025, 'floating');
  }

  // 3. SPACE SCENE
  private createSpaceScene() {
    const asteroidMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, flatShading: true });

    // Floating low-poly Asteroids
    const asteroidPositions = [
      [-1.4, 0.8, -2.2],
      [1.2, 1.1, -2.0],
      [-0.6, 1.4, -2.5],
      [1.6, 0.6, -2.8]
    ];

    asteroidPositions.forEach(([x, y, z], idx) => {
      const geo = new THREE.DodecahedronGeometry(0.14 + (idx % 3) * 0.04, 1);
      const asteroid = new THREE.Mesh(geo, asteroidMat);
      asteroid.position.set(x, y, z);
      this.group.add(asteroid);
      this.animatedMeshes.push(asteroid);
    });

    // Starfield particles
    this.createAtmosphericParticles(150, 0xffffff, 0.03, 'floating');
  }

  // 4. FANTASY / CASTLE SCENE
  private createFantasyScene() {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.5,
      roughness: 0.2
    });

    // Fantasy Crystals
    const crystalPositions = [
      [-1.2, 0, -2.0],
      [1.3, 0, -1.9]
    ];

    crystalPositions.forEach(([x, , z]) => {
      const baseGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.25, 6);
      const base = new THREE.Mesh(baseGeo, stoneMat);
      base.position.set(x, 0.125, z);
      this.group.add(base);

      const cryGeo = new THREE.OctahedronGeometry(0.12);
      const cry = new THREE.Mesh(cryGeo, crystalMat);
      cry.position.set(x, 0.35, z);
      this.group.add(cry);
      this.animatedMeshes.push(cry);
    });

    // Magic dust particles
    this.createAtmosphericParticles(100, 0xe879f9, 0.035, 'floating');
  }

  // 5. UNDERWATER SCENE
  private createUnderwaterScene() {
    const coralMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.5 });
    const plantMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.6 });

    // Coral clusters
    const coralPositions = [
      [-1.3, 0, -2.1],
      [1.2, 0, -2.2]
    ];

    coralPositions.forEach(([x, , z]) => {
      const coralGeo = new THREE.DodecahedronGeometry(0.22, 1);
      const coral = new THREE.Mesh(coralGeo, coralMat);
      coral.position.set(x, 0.15, z);
      this.group.add(coral);
    });

    // Sea plants
    for (let i = 0; i < 4; i++) {
      const plantGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.5, 6);
      const plant = new THREE.Mesh(plantGeo, plantMat);
      plant.position.set(-0.8 + i * 0.5, 0.25, -2.4);
      this.group.add(plant);
    }

    // Rising bubble particles
    this.createAtmosphericParticles(90, 0x67e8f9, 0.03, 'rising');
  }

  // 6. HYBRID / REAL ROOM SCENE
  private createHybridRoomScene() {
    // Subtle golden magical sparkles
    this.createAtmosphericParticles(60, 0xfde047, 0.025, 'floating');
  }

  // Particle System Builder
  private createAtmosphericParticles(
    count: number,
    colorHex: number,
    size: number,
    behavior: 'falling' | 'rising' | 'floating'
  ) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4.0;
      positions[i * 3 + 1] = Math.random() * 2.5;
      positions[i * 3 + 2] = -1.0 - Math.random() * 2.5;

      if (behavior === 'falling') {
        velocities[i * 3] = (Math.random() - 0.5) * 0.1;
        velocities[i * 3 + 1] = -0.15 - Math.random() * 0.15; // falling down
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
      } else if (behavior === 'rising') {
        velocities[i * 3] = (Math.random() - 0.5) * 0.08;
        velocities[i * 3 + 1] = 0.12 + Math.random() * 0.15; // rising up
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
      } else {
        // Floating gentle drift
        velocities[i * 3] = (Math.random() - 0.5) * 0.05;
        velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.05;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: colorHex,
      size,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.particleVelocities = velocities;
    this.group.add(this.particleSystem);
  }

  public update(delta: number) {
    // Animate atmospheric particles
    if (this.particleSystem && this.particleVelocities) {
      const posAttr = this.particleSystem.geometry.attributes.position as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;
      const velocities = this.particleVelocities;
      const count = positions.length / 3;

      for (let i = 0; i < count; i++) {
        positions[i * 3] += velocities[i * 3] * delta;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * delta;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;

        // Reset if out of bounds
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = 2.2;
        } else if (positions[i * 3 + 1] > 2.5) {
          positions[i * 3 + 1] = 0.1;
        }
      }

      posAttr.needsUpdate = true;
    }

    // Slowly rotate floating meshes (asteroids, crystals)
    this.animatedMeshes.forEach((mesh, idx) => {
      mesh.rotation.y += delta * (0.3 + (idx % 3) * 0.2);
      mesh.rotation.x += delta * 0.15;
    });
  }

  public dispose() {
    this.group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      } else if (child instanceof THREE.Points) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
    this.particleSystem = null;
    this.particleVelocities = null;
    this.animatedMeshes = [];
  }
}
