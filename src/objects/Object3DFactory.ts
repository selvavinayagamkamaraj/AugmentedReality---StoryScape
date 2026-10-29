import * as THREE from 'three';
import type { StoryObject3D } from '../types/story';

export class Object3DFactory {
  /**
   * Builds a separate physical 3D object for the AR scene with realistic scale
   */
  public static createObject3D(item: StoryObject3D): THREE.Group {
    const group = new THREE.Group();
    const nameLower = (item.name || '').toLowerCase();

    const colorHex = item.color ? parseInt(item.color.replace('#', '0x')) : undefined;

    let meshGroup: THREE.Group;

    if (nameLower.includes('apple')) {
      meshGroup = this.createApple(colorHex || 0xef4444);
    } else if (nameLower.includes('carrot')) {
      meshGroup = this.createCarrot();
    } else if (nameLower.includes('cheese')) {
      meshGroup = this.createCheese();
    } else if (nameLower.includes('fish')) {
      meshGroup = this.createFish();
    } else if (nameLower.includes('chest') || nameLower.includes('treasure')) {
      meshGroup = this.createChest();
    } else if (nameLower.includes('book')) {
      meshGroup = this.createBook(colorHex || 0x3b82f6);
    } else if (nameLower.includes('ball')) {
      meshGroup = this.createBall(colorHex || 0xec4899);
    } else if (nameLower.includes('tree')) {
      meshGroup = this.createTree();
    } else if (nameLower.includes('rock') || nameLower.includes('stone')) {
      meshGroup = this.createRock();
    } else if (nameLower.includes('flower')) {
      meshGroup = this.createFlower(colorHex || 0xf43f5e);
    } else if (nameLower.includes('bush') || nameLower.includes('plant')) {
      meshGroup = this.createBush();
    } else if (nameLower.includes('chair')) {
      meshGroup = this.createChair();
    } else if (nameLower.includes('table')) {
      meshGroup = this.createTable();
    } else if (nameLower.includes('spaceship') || nameLower.includes('saucer') || nameLower.includes('rocket')) {
      meshGroup = this.createSpaceship();
    } else if (/cup|coffee|crystal|bicycle|fruit|sand|water|wave|star|planet|asteroid|building|road|sign|leaves/.test(nameLower)) {
      meshGroup = this.createSemanticPrimitive(nameLower, colorHex || 0x38bdf8);
    } else {
      // General prop fallback
      meshGroup = this.createGenericProp(item.name, colorHex || 0xa855f7);
    }

    group.add(meshGroup);

    // Subtle contact shadow
    const shadowGeo = new THREE.CircleGeometry(0.1, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.25,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.002;
    group.add(shadow);

    if (item.scale) {
      const bounds = new THREE.Box3().setFromObject(meshGroup);
      const size = bounds.getSize(new THREE.Vector3());
      const dimension = /table|chair|tree/.test(nameLower) ? size.y : Math.max(size.x, size.y, size.z);
      const factor = item.scale / Math.max(dimension, 0.001);
      meshGroup.scale.setScalar(factor);
    }

    if (item.initialPosition) {
      group.position.set(item.initialPosition.x, item.initialPosition.y, item.initialPosition.z);
    }

    return group;
  }

  // APPLE (Real scale: 0.08m)
  private static createApple(color: number): THREE.Group {
    const group = new THREE.Group();
    const appleMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35 });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.5 });

    // Apple body (slightly indented sphere)
    const appleGeo = new THREE.SphereGeometry(0.04, 14, 14);
    const apple = new THREE.Mesh(appleGeo, appleMat);
    apple.position.y = 0.04;
    apple.scale.set(1.0, 0.95, 1.0);
    apple.castShadow = true;
    group.add(apple);

    // Stem
    const stemGeo = new THREE.CylinderGeometry(0.003, 0.002, 0.025);
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(0, 0.082, 0);
    stem.rotation.z = 0.15;
    group.add(stem);

    // Leaf
    const leafGeo = new THREE.BoxGeometry(0.02, 0.002, 0.012);
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(0.012, 0.082, 0);
    leaf.rotation.z = 0.4;
    group.add(leaf);

    return group;
  }

  // CARROT (Real scale: 0.15m)
  private static createCarrot(): THREE.Group {
    const group = new THREE.Group();
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 });
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 });

    const carrotGeo = new THREE.ConeGeometry(0.025, 0.14, 8);
    const carrot = new THREE.Mesh(carrotGeo, orangeMat);
    carrot.position.y = 0.07;
    carrot.rotation.x = Math.PI;
    carrot.castShadow = true;
    group.add(carrot);

    const leafGeo = new THREE.BoxGeometry(0.01, 0.06, 0.03);
    const leaves = new THREE.Mesh(leafGeo, greenMat);
    leaves.position.y = 0.14;
    group.add(leaves);

    return group;
  }

  // CHEESE
  private static createCheese(): THREE.Group {
    const group = new THREE.Group();
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    const cheeseGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 6, 1, false, 0, Math.PI / 2.5);
    const cheese = new THREE.Mesh(cheeseGeo, yellowMat);
    cheese.position.y = 0.02;
    cheese.castShadow = true;
    group.add(cheese);
    return group;
  }

  // FISH
  private static createFish(): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 });

    const bodyGeo = new THREE.ConeGeometry(0.035, 0.14, 6);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.035;
    body.rotation.z = Math.PI / 2;
    group.add(body);

    const tailGeo = new THREE.BoxGeometry(0.01, 0.06, 0.04);
    const tail = new THREE.Mesh(tailGeo, mat);
    tail.position.set(-0.07, 0.035, 0);
    group.add(tail);

    return group;
  }

  // TREASURE CHEST
  private static createChest(): THREE.Group {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 });

    const baseGeo = new THREE.BoxGeometry(0.24, 0.14, 0.16);
    const base = new THREE.Mesh(baseGeo, woodMat);
    base.position.y = 0.07;
    base.castShadow = true;
    group.add(base);

    const lidGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.24, 8, 1, false, 0, Math.PI);
    const lid = new THREE.Mesh(lidGeo, woodMat);
    lid.rotation.z = Math.PI / 2;
    lid.position.y = 0.14;
    group.add(lid);

    const lockGeo = new THREE.BoxGeometry(0.03, 0.03, 0.02);
    const lock = new THREE.Mesh(lockGeo, goldMat);
    lock.position.set(0, 0.13, 0.085);
    group.add(lock);

    return group;
  }

  // BOOK
  private static createBook(color: number): THREE.Group {
    const group = new THREE.Group();
    const coverMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
    const pageMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.9 });

    const coverGeo = new THREE.BoxGeometry(0.18, 0.035, 0.24);
    const cover = new THREE.Mesh(coverGeo, coverMat);
    cover.position.y = 0.018;
    cover.castShadow = true;
    group.add(cover);

    const pageGeo = new THREE.BoxGeometry(0.165, 0.025, 0.22);
    const pages = new THREE.Mesh(pageGeo, pageMat);
    pages.position.set(0.005, 0.018, 0);
    group.add(pages);

    return group;
  }

  // BALL
  private static createBall(color: number): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.3 });
    const ballGeo = new THREE.SphereGeometry(0.075, 16, 16);
    const ball = new THREE.Mesh(ballGeo, mat);
    ball.position.y = 0.075;
    ball.castShadow = true;
    group.add(ball);
    return group;
  }

  // TREE (Real scale: 1.8m)
  private static createTree(): THREE.Group {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });

    const trunkGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.7);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.35;
    trunk.castShadow = true;
    group.add(trunk);

    // 3 Foliage cones
    for (let i = 0; i < 3; i++) {
      const coneGeo = new THREE.ConeGeometry(0.4 - i * 0.08, 0.45, 6);
      const cone = new THREE.Mesh(coneGeo, leavesMat);
      cone.position.y = 0.7 + i * 0.3;
      cone.castShadow = true;
      group.add(cone);
    }

    return group;
  }

  // ROCK
  private static createRock(): THREE.Group {
    const group = new THREE.Group();
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, flatShading: true });
    const rockGeo = new THREE.DodecahedronGeometry(0.15, 1);
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.y = 0.12;
    rock.scale.set(1.2, 0.8, 1.0);
    rock.castShadow = true;
    group.add(rock);
    return group;
  }

  // FLOWER
  private static createFlower(color: number): THREE.Group {
    const group = new THREE.Group();
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x16a34a });
    const petalMat = new THREE.MeshStandardMaterial({ color });

    const stemGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.2);
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.1;
    group.add(stem);

    const bloomGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const bloom = new THREE.Mesh(bloomGeo, petalMat);
    bloom.position.y = 0.2;
    group.add(bloom);

    return group;
  }

  // BUSH
  private static createBush(): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.7, flatShading: true });
    const geo = new THREE.DodecahedronGeometry(0.18, 1);
    const bush = new THREE.Mesh(geo, mat);
    bush.position.y = 0.14;
    bush.scale.set(1.4, 0.9, 1.2);
    bush.castShadow = true;
    group.add(bush);
    return group;
  }

  // CHAIR (Real scale ~0.85m)
  private static createChair(): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6 });

    // Seat
    const seatGeo = new THREE.BoxGeometry(0.42, 0.04, 0.42);
    const seat = new THREE.Mesh(seatGeo, mat);
    seat.position.y = 0.44;
    seat.castShadow = true;
    group.add(seat);

    // 4 Legs
    const legGeo = new THREE.CylinderGeometry(0.02, 0.015, 0.44);
    for (let x of [-0.17, 0.17]) {
      for (let z of [-0.17, 0.17]) {
        const leg = new THREE.Mesh(legGeo, mat);
        leg.position.set(x, 0.22, z);
        leg.castShadow = true;
        group.add(leg);
      }
    }

    // Backrest
    const backGeo = new THREE.BoxGeometry(0.42, 0.4, 0.03);
    const back = new THREE.Mesh(backGeo, mat);
    back.position.set(0, 0.64, -0.18);
    back.castShadow = true;
    group.add(back);

    return group;
  }

  // TABLE (Real scale: 0.75m high, 1.2m wide)
  private static createTable(): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.5 });

    // Tabletop
    const topGeo = new THREE.BoxGeometry(1.1, 0.05, 0.75);
    const top = new THREE.Mesh(topGeo, mat);
    top.position.y = 0.72;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    // 4 Legs
    const legGeo = new THREE.CylinderGeometry(0.03, 0.025, 0.7);
    for (let x of [-0.48, 0.48]) {
      for (let z of [-0.3, 0.3]) {
        const leg = new THREE.Mesh(legGeo, mat);
        leg.position.set(x, 0.35, z);
        leg.castShadow = true;
        group.add(leg);
      }
    }

    return group;
  }

  // SPACESHIP
  private static createSpaceship(): THREE.Group {
    const group = new THREE.Group();
    const saucerMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
    const domeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1 });

    const hullGeo = new THREE.CylinderGeometry(0.25, 0.05, 0.06, 16);
    const hull = new THREE.Mesh(hullGeo, saucerMat);
    hull.position.y = 0.15;
    group.add(hull);

    const domeGeo = new THREE.SphereGeometry(0.12, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 0.18;
    group.add(dome);

    return group;
  }

  private static createSemanticPrimitive(name: string, color: number): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
    const add = (geometry: THREE.BufferGeometry, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, mat); mesh.position.set(x, y, z); mesh.castShadow = true; group.add(mesh); return mesh;
    };
    if (/cup|coffee/.test(name)) {
      add(new THREE.CylinderGeometry(0.045, 0.035, 0.1, 16, 1, true), 0, 0.05);
      add(new THREE.TorusGeometry(0.035, 0.008, 6, 16), 0.055, 0.06);
      const drink = add(new THREE.CircleGeometry(0.042, 16), 0, 0.085); drink.rotation.x = -Math.PI / 2;
      drink.material = new THREE.MeshStandardMaterial({ color: 0x4a2510 });
    } else if (name.includes('bicycle')) {
      for (const x of [-0.4, 0.4]) add(new THREE.TorusGeometry(0.28, 0.025, 6, 24), x, 0.28);
      const frame = add(new THREE.TorusGeometry(0.25, 0.025, 4, 3), 0, 0.45); frame.rotation.z = Math.PI / 2;
      add(new THREE.BoxGeometry(0.25, 0.05, 0.12), 0, 0.78);
      const fork = add(new THREE.CylinderGeometry(0.025, 0.025, 0.65, 6), 0.34, 0.58); fork.rotation.z = 0.2;
      add(new THREE.BoxGeometry(0.06, 0.05, 0.35), 0.28, 0.9);
    } else if (name.includes('crystal')) {
      add(new THREE.OctahedronGeometry(0.12), 0, 0.14).scale.y = 1.5;
    } else if (/fruit|planet|asteroid/.test(name)) {
      const mesh = add(new THREE.IcosahedronGeometry(name.includes('fruit') ? 0.07 : 0.25, 1), 0, 0.1);
      if (name.includes('fruit')) { mesh.scale.y = 1.4; mat.color.set(0xec4899); }
    } else if (/sand|water|road|wave/.test(name)) {
      const mesh = add(new THREE.PlaneGeometry(1.5, 1.5), 0, 0.003); mesh.rotation.x = -Math.PI / 2;
      mat.color.set(name.includes('sand') ? 0xd9bb77 : name.includes('road') ? 0x374151 : 0x258cb5);
      if (/water|wave/.test(name)) { mat.transparent = true; mat.opacity = 0.45; }
    } else if (name.includes('building')) {
      add(new THREE.BoxGeometry(0.5, 1.5, 0.5), 0, 0.75);
    } else if (name.includes('sign')) {
      add(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), 0, 0.25);
      add(new THREE.BoxGeometry(0.4, 0.2, 0.02), 0, 0.5);
    } else {
      for (let i = 0; i < 8; i++) add(new THREE.OctahedronGeometry(0.025), Math.sin(i * 2.4) * 0.5, 0.3 + i * 0.07, Math.cos(i * 2.4) * 0.5);
    }
    return group;
  }

  // GENERIC PROP FALLBACK
  private static createGenericProp(_name: string, color: number): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });

    const geo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.08;
    mesh.castShadow = true;
    group.add(mesh);

    return group;
  }
}


