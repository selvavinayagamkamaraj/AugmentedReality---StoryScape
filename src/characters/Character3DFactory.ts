import * as THREE from 'three';
import type { StoryCharacter, CharacterType } from '../types/story';

export interface CharacterRigs3D {
  root: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Group;
  limbs: THREE.Mesh[];
  wings?: THREE.Mesh[];
  tail?: THREE.Mesh;
  eyes: THREE.Mesh[];
  height: number;
}

export class Character3DFactory {
  /**
   * Creates a stylized low-poly 3D character mesh hierarchy
   */
  public static createCharacter3D(character: StoryCharacter): CharacterRigs3D {
    const type = character.type || 'generic';
    const colorHex = character.color ? parseInt(character.color.replace('#', '0x')) : this.getDefaultColor(type);

    switch (type) {
      case 'cat':
        return this.createCat(colorHex);
      case 'dog':
        return this.createDog(colorHex);
      case 'bird':
        return this.createBird(colorHex);
      case 'human':
        return this.createHuman(colorHex);
      case 'robot':
        return this.createRobot(colorHex);
      case 'alien':
        return this.createAlien(colorHex);
      case 'rabbit':
        return this.createRabbit(colorHex);
      case 'dragon':
        return this.createDragon(colorHex);
      case 'spiderman':
        return this.createSpiderman(colorHex);
      case 'bat':
        return this.createBat(colorHex);
      case 'hero':
        return this.createSuperhero(colorHex, character.name);
      case 'butterfly':
      case 'generic':
      default:
        return this.createGenericCreature(colorHex);
    }
  }

  private static getDefaultColor(type: CharacterType): number {
    switch (type) {
      case 'cat': return 0xfb923c; // orange
      case 'dog': return 0xca8a04; // golden
      case 'bird': return 0x38bdf8; // sky blue
      case 'human': return 0x38bdf8; // astronaut blue
      case 'robot': return 0x818cf8; // metallic indigo
      case 'alien': return 0x4ade80; // lime green
      case 'rabbit': return 0xf472b6; // pink
      case 'dragon': return 0x10b981; // emerald
      case 'spiderman': return 0xdc2626; // spiderman crimson red
      case 'bat': return 0x1e293b; // bat nocturnal slate
      case 'hero': return 0x2563eb; // superhero cobalt
      default: return 0xa855f7;
    }
  }

  // 1. CAT (Real scale ~0.30m)
  private static createCat(color: number): CharacterRigs3D {
    const root = new THREE.Group();
    const limbs: THREE.Mesh[] = [];
    const eyes: THREE.Mesh[] = [];

    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x16a34a }); // green eyes

    // Torso (horizontal cylinder / pill)
    const bodyGeo = new THREE.CapsuleGeometry(0.08, 0.16, 8, 12);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.16;
    body.castShadow = true;
    body.receiveShadow = true;
    root.add(body);

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.22, 0.12);

    const headGeo = new THREE.SphereGeometry(0.075, 12, 12);
    const head = new THREE.Mesh(headGeo, mat);
    head.castShadow = true;
    headGroup.add(head);

    // Ears (triangular cones)
    const earGeo = new THREE.ConeGeometry(0.03, 0.05, 4);
    const earL = new THREE.Mesh(earGeo, mat);
    earL.position.set(-0.04, 0.08, 0);
    earL.rotation.z = 0.2;
    headGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, mat);
    earR.position.set(0.04, 0.08, 0);
    earR.rotation.z = -0.2;
    headGroup.add(earR);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.015, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.03, 0.015, 0.065);
    headGroup.add(eyeL);
    eyes.push(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.03, 0.015, 0.065);
    headGroup.add(eyeR);
    eyes.push(eyeR);

    // Muzzle
    const snoutGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const snout = new THREE.Mesh(snoutGeo, whiteMat);
    snout.position.set(0, -0.01, 0.07);
    headGroup.add(snout);

    root.add(headGroup);

    // 4 Legs
    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8);
    const legPositions = [
      [-0.05, 0.06, 0.08], // front left
      [0.05, 0.06, 0.08],  // front right
      [-0.05, 0.06, -0.08], // back left
      [0.05, 0.06, -0.08]  // back right
    ];

    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      root.add(leg);
      limbs.push(leg);
    });

    // Tail
    const tailGeo = new THREE.CylinderGeometry(0.012, 0.01, 0.16, 6);
    const tail = new THREE.Mesh(tailGeo, mat);
    tail.position.set(0, 0.2, -0.12);
    tail.rotation.x = -0.6;
    tail.castShadow = true;
    root.add(tail);

    return { root, body, head: headGroup, limbs, tail, eyes, height: 0.30 };
  }

  // 2. DOG (Real scale ~0.40m)
  private static createDog(color: number): CharacterRigs3D {
    const root = new THREE.Group();
    const limbs: THREE.Mesh[] = [];
    const eyes: THREE.Mesh[] = [];

    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

    const bodyGeo = new THREE.CapsuleGeometry(0.1, 0.2, 8, 12);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.2;
    body.castShadow = true;
    root.add(body);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.28, 0.15);

    const headGeo = new THREE.SphereGeometry(0.09, 12, 12);
    const head = new THREE.Mesh(headGeo, mat);
    head.castShadow = true;
    headGroup.add(head);

    // Floppy ears
    const earGeo = new THREE.BoxGeometry(0.03, 0.08, 0.02);
    const earL = new THREE.Mesh(earGeo, darkMat);
    earL.position.set(-0.08, 0.02, 0);
    earL.rotation.z = -0.2;
    headGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, darkMat);
    earR.position.set(0.08, 0.02, 0);
    earR.rotation.z = 0.2;
    headGroup.add(earR);

    // Snout
    const snoutGeo = new THREE.BoxGeometry(0.06, 0.05, 0.06);
    const snout = new THREE.Mesh(snoutGeo, mat);
    snout.position.set(0, -0.015, 0.09);
    headGroup.add(snout);

    // Nose
    const noseGeo = new THREE.SphereGeometry(0.015, 6, 6);
    const nose = new THREE.Mesh(noseGeo, darkMat);
    nose.position.set(0, 0.01, 0.125);
    headGroup.add(nose);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.015, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.035, 0.03, 0.075);
    headGroup.add(eyeL);
    eyes.push(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.035, 0.03, 0.075);
    headGroup.add(eyeR);
    eyes.push(eyeR);

    root.add(headGroup);

    // 4 Legs
    const legGeo = new THREE.CylinderGeometry(0.025, 0.022, 0.16, 8);
    const legPositions = [
      [-0.06, 0.08, 0.1],
      [0.06, 0.08, 0.1],
      [-0.06, 0.08, -0.1],
      [0.06, 0.08, -0.1]
    ];

    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      root.add(leg);
      limbs.push(leg);
    });

    // Wagging tail
    const tailGeo = new THREE.CylinderGeometry(0.015, 0.01, 0.18, 6);
    const tail = new THREE.Mesh(tailGeo, mat);
    tail.position.set(0, 0.26, -0.15);
    tail.rotation.x = -0.7;
    tail.castShadow = true;
    root.add(tail);

    return { root, body, head: headGroup, limbs, tail, eyes, height: 0.38 };
  }

  // 3. BIRD (Real scale ~0.20m)
  private static createBird(color: number): CharacterRigs3D {
    const root = new THREE.Group();
    const limbs: THREE.Mesh[] = [];
    const wings: THREE.Mesh[] = [];
    const eyes: THREE.Mesh[] = [];

    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

    // Body
    const bodyGeo = new THREE.SphereGeometry(0.06, 12, 12);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.12;
    body.scale.set(0.9, 0.9, 1.2);
    body.castShadow = true;
    root.add(body);

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.17, 0.06);

    const headGeo = new THREE.SphereGeometry(0.045, 12, 12);
    const head = new THREE.Mesh(headGeo, mat);
    head.castShadow = true;
    headGroup.add(head);

    // Beak
    const beakGeo = new THREE.ConeGeometry(0.018, 0.045, 6);
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.position.set(0, -0.005, 0.055);
    beak.rotation.x = Math.PI / 2;
    headGroup.add(beak);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.008, 6, 6);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.025, 0.015, 0.03);
    headGroup.add(eyeL);
    eyes.push(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.025, 0.015, 0.03);
    headGroup.add(eyeR);
    eyes.push(eyeR);

    root.add(headGroup);

    // Wings
    const wingGeo = new THREE.BoxGeometry(0.12, 0.01, 0.07);
    const wingL = new THREE.Mesh(wingGeo, mat);
    wingL.position.set(-0.08, 0.13, 0);
    wingL.castShadow = true;
    root.add(wingL);
    wings.push(wingL);

    const wingR = new THREE.Mesh(wingGeo, mat);
    wingR.position.set(0.08, 0.13, 0);
    wingR.castShadow = true;
    root.add(wingR);
    wings.push(wingR);

    // Tail Feathers
    const tailGeo = new THREE.BoxGeometry(0.05, 0.01, 0.08);
    const tail = new THREE.Mesh(tailGeo, mat);
    tail.position.set(0, 0.13, -0.1);
    tail.rotation.x = 0.3;
    root.add(tail);

    // Little Legs
    const legGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.06, 6);
    const legL = new THREE.Mesh(legGeo, beakMat);
    legL.position.set(-0.025, 0.03, 0);
    root.add(legL);
    limbs.push(legL);

    const legR = new THREE.Mesh(legGeo, beakMat);
    legR.position.set(0.025, 0.03, 0);
    root.add(legR);
    limbs.push(legR);

    return { root, body, head: headGroup, limbs, wings, tail, eyes, height: 0.22 };
  }

  // 4. HUMAN / ASTRONAUT (Real scale ~0.60m for child AR view, can scale to 1.6m)
  private static createHuman(color: number): CharacterRigs3D {
    const root = new THREE.Group();
    const limbs: THREE.Mesh[] = [];
    const eyes: THREE.Mesh[] = [];

    const suitMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.1 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });

    // Torso
    const bodyGeo = new THREE.BoxGeometry(0.18, 0.24, 0.12);
    const body = new THREE.Mesh(bodyGeo, suitMat);
    body.position.y = 0.34;
    body.castShadow = true;
    root.add(body);

    // Backpack
    const packGeo = new THREE.BoxGeometry(0.14, 0.18, 0.08);
    const pack = new THREE.Mesh(packGeo, darkMat);
    pack.position.set(0, 0.34, -0.09);
    root.add(pack);

    // Head / Helmet
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.52, 0);

    const headGeo = new THREE.SphereGeometry(0.09, 14, 14);
    const head = new THREE.Mesh(headGeo, suitMat);
    head.castShadow = true;
    headGroup.add(head);

    // Visor
    const visorGeo = new THREE.SphereGeometry(0.065, 12, 12, 0, Math.PI);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.01, 0.04);
    visor.rotation.y = Math.PI / 2;
    headGroup.add(visor);

    root.add(headGroup);

    // 2 Arms
    const armGeo = new THREE.CapsuleGeometry(0.035, 0.16, 6, 8);
    const armL = new THREE.Mesh(armGeo, suitMat);
    armL.position.set(-0.13, 0.32, 0);
    armL.castShadow = true;
    root.add(armL);
    limbs.push(armL);

    const armR = new THREE.Mesh(armGeo, suitMat);
    armR.position.set(0.13, 0.32, 0);
    armR.castShadow = true;
    root.add(armR);
    limbs.push(armR);

    // 2 Legs
    const legGeo = new THREE.CapsuleGeometry(0.04, 0.18, 6, 8);
    const legL = new THREE.Mesh(legGeo, suitMat);
    legL.position.set(-0.06, 0.12, 0);
    legL.castShadow = true;
    root.add(legL);
    limbs.push(legL);

    const legR = new THREE.Mesh(legGeo, suitMat);
    legR.position.set(0.06, 0.12, 0);
    legR.castShadow = true;
    root.add(legR);
    limbs.push(legR);

    return { root, body, head: headGroup, limbs, eyes, height: 0.62 };
  }

  // 5. ROBOT
  private static createRobot(color: number): CharacterRigs3D {
    const root = new THREE.Group();
    const limbs: THREE.Mesh[] = [];
    const eyes: THREE.Mesh[] = [];

    const metalMat = new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.3 });
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // Chassis
    const bodyGeo = new THREE.BoxGeometry(0.2, 0.22, 0.14);
    const body = new THREE.Mesh(bodyGeo, metalMat);
    body.position.y = 0.28;
    body.castShadow = true;
    root.add(body);

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.45, 0);

    const headGeo = new THREE.BoxGeometry(0.16, 0.14, 0.14);
    const head = new THREE.Mesh(headGeo, metalMat);
    head.castShadow = true;
    headGroup.add(head);

    // Eye screen
    const eyeGeo = new THREE.BoxGeometry(0.12, 0.04, 0.02);
    const eyeScreen = new THREE.Mesh(eyeGeo, screenMat);
    eyeScreen.position.set(0, 0.01, 0.075);
    headGroup.add(eyeScreen);
    eyes.push(eyeScreen);

    // Antenna
    const antGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.08);
    const ant = new THREE.Mesh(antGeo, metalMat);
    ant.position.set(0, 0.11, 0);
    headGroup.add(ant);

    const bulbGeo = new THREE.SphereGeometry(0.02, 8, 8);
    const bulb = new THREE.Mesh(bulbGeo, screenMat);
    bulb.position.set(0, 0.15, 0);
    headGroup.add(bulb);

    root.add(headGroup);

    // Limbs
    const armGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.16);
    const armL = new THREE.Mesh(armGeo, metalMat);
    armL.position.set(-0.14, 0.26, 0);
    root.add(armL);
    limbs.push(armL);

    const armR = new THREE.Mesh(armGeo, metalMat);
    armR.position.set(0.14, 0.26, 0);
    root.add(armR);
    limbs.push(armR);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.15);
    const legL = new THREE.Mesh(legGeo, metalMat);
    legL.position.set(-0.06, 0.08, 0);
    root.add(legL);
    limbs.push(legL);

    const legR = new THREE.Mesh(legGeo, metalMat);
    legR.position.set(0.06, 0.08, 0);
    root.add(legR);
    limbs.push(legR);

    return { root, body, head: headGroup, limbs, eyes, height: 0.55 };
  }

  // 6. ALIEN
  private static createAlien(color: number): CharacterRigs3D {
    const root = new THREE.Group();
    const limbs: THREE.Mesh[] = [];
    const eyes: THREE.Mesh[] = [];

    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });

    // Round body
    const bodyGeo = new THREE.SphereGeometry(0.12, 14, 14);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.22;
    body.scale.set(1.1, 0.9, 1.0);
    body.castShadow = true;
    root.add(body);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.32, 0);

    const headGeo = new THREE.SphereGeometry(0.09, 12, 12);
    const head = new THREE.Mesh(headGeo, mat);
    headGroup.add(head);

    // Single large center eye
    const eyeGeo = new THREE.SphereGeometry(0.035, 12, 12);
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 0.02, 0.08);
    headGroup.add(eye);
    eyes.push(eye);

    // Antenna stalks
    const stalkGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.09);
    const stalkL = new THREE.Mesh(stalkGeo, mat);
    stalkL.position.set(-0.04, 0.11, 0);
    stalkL.rotation.z = 0.3;
    headGroup.add(stalkL);

    const stalkR = new THREE.Mesh(stalkGeo, mat);
    stalkR.position.set(0.04, 0.11, 0);
    stalkR.rotation.z = -0.3;
    headGroup.add(stalkR);

    root.add(headGroup);

    // Tentacle feet
    for (let i = -1; i <= 1; i++) {
      const tentGeo = new THREE.CylinderGeometry(0.02, 0.015, 0.12);
      const tent = new THREE.Mesh(tentGeo, mat);
      tent.position.set(i * 0.07, 0.06, 0);
      root.add(tent);
      limbs.push(tent);
    }

    return { root, body, head: headGroup, limbs, eyes, height: 0.44 };
  }

  // 7. RABBIT
  private static createRabbit(color: number): CharacterRigs3D {
    const root = new THREE.Group();
    const limbs: THREE.Mesh[] = [];
    const eyes: THREE.Mesh[] = [];

    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x831843 });

    const bodyGeo = new THREE.SphereGeometry(0.09, 12, 12);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.14;
    body.scale.set(0.9, 1.1, 1.2);
    body.castShadow = true;
    root.add(body);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.24, 0.08);

    const headGeo = new THREE.SphereGeometry(0.07, 12, 12);
    const head = new THREE.Mesh(headGeo, mat);
    headGroup.add(head);

    // Long ears
    const earGeo = new THREE.BoxGeometry(0.025, 0.14, 0.015);
    const earL = new THREE.Mesh(earGeo, mat);
    earL.position.set(-0.035, 0.12, 0);
    earL.rotation.z = 0.15;
    headGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, mat);
    earR.position.set(0.035, 0.12, 0);
    earR.rotation.z = -0.15;
    headGroup.add(earR);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.012, 6, 6);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.04, 0.02, 0.05);
    headGroup.add(eyeL);
    eyes.push(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.04, 0.02, 0.05);
    headGroup.add(eyeR);
    eyes.push(eyeR);

    root.add(headGroup);

    // 4 Paws
    const pawGeo = new THREE.SphereGeometry(0.025, 6, 6);
    const pawPositions = [
      [-0.045, 0.03, 0.08],
      [0.045, 0.03, 0.08],
      [-0.05, 0.03, -0.06],
      [0.05, 0.03, -0.06]
    ];

    pawPositions.forEach(p => {
      const paw = new THREE.Mesh(pawGeo, mat);
      paw.position.set(p[0], p[1], p[2]);
      root.add(paw);
      limbs.push(paw);
    });

    // Cotton tail
    const tailGeo = new THREE.SphereGeometry(0.028, 8, 8);
    const tail = new THREE.Mesh(tailGeo, new THREE.MeshStandardMaterial({ color: 0xffffff }));
    tail.position.set(0, 0.14, -0.11);
    root.add(tail);

    return { root, body, head: headGroup, limbs, tail, eyes, height: 0.38 };
  }

  // 8. DRAGON
  private static createDragon(color: number): CharacterRigs3D {
    const root = new THREE.Group();
    const limbs: THREE.Mesh[] = [];
    const wings: THREE.Mesh[] = [];
    const eyes: THREE.Mesh[] = [];

    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    const bodyGeo = new THREE.CapsuleGeometry(0.12, 0.22, 8, 12);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.rotation.x = Math.PI / 2.3;
    body.position.y = 0.22;
    body.castShadow = true;
    root.add(body);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.34, 0.16);

    const headGeo = new THREE.BoxGeometry(0.12, 0.1, 0.16);
    const head = new THREE.Mesh(headGeo, mat);
    headGroup.add(head);

    // Horns
    const hornGeo = new THREE.ConeGeometry(0.025, 0.09, 4);
    const hornL = new THREE.Mesh(hornGeo, hornMat);
    hornL.position.set(-0.04, 0.08, -0.04);
    hornL.rotation.x = -0.4;
    headGroup.add(hornL);

    const hornR = new THREE.Mesh(hornGeo, hornMat);
    hornR.position.set(0.04, 0.08, -0.04);
    hornR.rotation.x = -0.4;
    headGroup.add(hornR);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.015, 6, 6);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.05, 0.02, 0.05);
    headGroup.add(eyeL);
    eyes.push(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.05, 0.02, 0.05);
    headGroup.add(eyeR);
    eyes.push(eyeR);

    root.add(headGroup);

    // Dragon wings
    const wingGeo = new THREE.BoxGeometry(0.2, 0.01, 0.12);
    const wingL = new THREE.Mesh(wingGeo, mat);
    wingL.position.set(-0.16, 0.28, 0);
    wingL.rotation.z = 0.3;
    root.add(wingL);
    wings.push(wingL);

    const wingR = new THREE.Mesh(wingGeo, mat);
    wingR.position.set(0.16, 0.28, 0);
    wingR.rotation.z = -0.3;
    root.add(wingR);
    wings.push(wingR);

    // Tail
    const tailGeo = new THREE.CylinderGeometry(0.015, 0.03, 0.26, 6);
    const tail = new THREE.Mesh(tailGeo, mat);
    tail.position.set(0, 0.18, -0.22);
    tail.rotation.x = -0.5;
    root.add(tail);

    // 4 Claws
    const legGeo = new THREE.CylinderGeometry(0.03, 0.025, 0.14, 6);
    for (let x of [-0.07, 0.07]) {
      for (let z of [0.08, -0.08]) {
        const leg = new THREE.Mesh(legGeo, mat);
        leg.position.set(x, 0.07, z);
        root.add(leg);
        limbs.push(leg);
      }
    }

    return { root, body, head: headGroup, limbs, wings, tail, eyes, height: 0.48 };
  }

  // 9. GENERIC / FALLBACK
  private static createGenericCreature(color: number): CharacterRigs3D {
    const root = new THREE.Group();
    const limbs: THREE.Mesh[] = [];
    const eyes: THREE.Mesh[] = [];

    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const bodyGeo = new THREE.SphereGeometry(0.12, 14, 14);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.18;
    body.castShadow = true;
    root.add(body);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.28, 0.06);

    const headGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const head = new THREE.Mesh(headGeo, mat);
    headGroup.add(head);

    const eyeGeo = new THREE.SphereGeometry(0.018, 6, 6);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.03, 0.02, 0.065);
    headGroup.add(eyeL);
    eyes.push(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.03, 0.02, 0.065);
    headGroup.add(eyeR);
    eyes.push(eyeR);

    root.add(headGroup);

    // Feet
    const footGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.08);
    const footL = new THREE.Mesh(footGeo, mat);
    footL.position.set(-0.05, 0.04, 0);
    root.add(footL);
    limbs.push(footL);

    const footR = new THREE.Mesh(footGeo, mat);
    footR.position.set(0.05, 0.04, 0);
    root.add(footR);
    limbs.push(footR);

    return { root, body, head: headGroup, limbs, eyes, height: 0.36 };
  }

  // 10. SPIDERMAN (Athletic superhero rig, red & blue suit, spider eyes & chest logo)
  private static createSpiderman(color: number): CharacterRigs3D {
    const root = new THREE.Group();
    const limbs: THREE.Mesh[] = [];
    const eyes: THREE.Mesh[] = [];

    const redMat = new THREE.MeshStandardMaterial({ color: color || 0xdc2626, roughness: 0.45, metalness: 0.1 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5 });
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const eyeLensMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      emissive: 0x334155
    });

    // Torso (Upper chest red, side obliques blue, athletic tapered V-taper)
    const torsoGroup = new THREE.Group();
    const chestGeo = new THREE.CylinderGeometry(0.08, 0.065, 0.18, 8);
    const chestMesh = new THREE.Mesh(chestGeo, redMat);
    chestMesh.castShadow = true;
    chestMesh.receiveShadow = true;
    torsoGroup.add(chestMesh);

    // Blue side panels
    const sideGeo = new THREE.BoxGeometry(0.04, 0.14, 0.08);
    const sideL = new THREE.Mesh(sideGeo, blueMat);
    sideL.position.set(-0.06, 0, 0);
    torsoGroup.add(sideL);

    const sideR = new THREE.Mesh(sideGeo, blueMat);
    sideR.position.set(0.06, 0, 0);
    torsoGroup.add(sideR);

    // Spider chest emblem (black spider center)
    const spiderBodyGeo = new THREE.SphereGeometry(0.015, 6, 6);
    const spiderBody = new THREE.Mesh(spiderBodyGeo, blackMat);
    spiderBody.scale.set(1, 1.4, 0.4);
    spiderBody.position.set(0, 0.02, 0.075);
    torsoGroup.add(spiderBody);

    // Spider legs on chest
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const legGeo = new THREE.BoxGeometry(0.025, 0.004, 0.004);
        const sLeg = new THREE.Mesh(legGeo, blackMat);
        sLeg.position.set(side * 0.025, 0.04 - i * 0.012, 0.076);
        sLeg.rotation.z = side * (0.3 + i * 0.15);
        torsoGroup.add(sLeg);
      }
    }

    torsoGroup.position.y = 0.38;
    root.add(torsoGroup);
    const body = chestMesh;

    // Head (Red masked head with iconic Spiderman angular eyes)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.52, 0);

    const headGeo = new THREE.SphereGeometry(0.072, 14, 14);
    headGeo.scale(0.9, 1.15, 1.0);
    const head = new THREE.Mesh(headGeo, redMat);
    head.castShadow = true;
    headGroup.add(head);

    // Spider mask eyes (white angular lenses with thick black borders)
    for (const side of [-1, 1]) {
      const eyeBorderGeo = new THREE.ConeGeometry(0.028, 0.052, 4);
      eyeBorderGeo.rotateZ(side * 0.45);
      eyeBorderGeo.scale(1, 0.25, 1);
      const eyeBorder = new THREE.Mesh(eyeBorderGeo, blackMat);
      eyeBorder.position.set(side * 0.032, 0.015, 0.062);
      eyeBorder.rotation.x = 0.2;
      headGroup.add(eyeBorder);

      const eyeInnerGeo = new THREE.ConeGeometry(0.022, 0.042, 4);
      eyeInnerGeo.rotateZ(side * 0.45);
      eyeInnerGeo.scale(1, 0.22, 1);
      const eyeInner = new THREE.Mesh(eyeInnerGeo, eyeLensMat);
      eyeInner.position.set(side * 0.032, 0.015, 0.065);
      eyeInner.rotation.x = 0.2;
      headGroup.add(eyeInner);
      eyes.push(eyeInner);
    }

    root.add(headGroup);

    // Limbs: [0: Left Arm, 1: Right Arm, 2: Left Leg, 3: Right Leg]
    // Arms (blue upper arm, red forearm with web-shooters)
    for (const side of [-1, 1]) {
      const armGroup = new THREE.Group();
      armGroup.position.set(side * 0.11, 0.44, 0);

      const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.02, 0.11), blueMat);
      upperArm.position.y = -0.05;
      armGroup.add(upperArm);

      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.018, 0.11), redMat);
      forearm.position.y = -0.14;
      armGroup.add(forearm);

      // Web shooter wrist band
      const wristBand = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02), blackMat);
      wristBand.position.y = -0.17;
      armGroup.add(wristBand);

      root.add(armGroup);
      limbs.push(armGroup as any);
    }

    // Legs (blue thighs, red superhero boots)
    for (const side of [-1, 1]) {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.045, 0.28, 0);

      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.022, 0.14), blueMat);
      thigh.position.y = -0.07;
      legGroup.add(thigh);

      const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.024, 0.14), redMat);
      boot.position.y = -0.20;
      legGroup.add(boot);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.025, 0.07), redMat);
      foot.position.set(0, -0.27, 0.02);
      legGroup.add(foot);

      root.add(legGroup);
      limbs.push(legGroup as any);
    }

    return { root, body, head: headGroup, limbs, eyes, height: 0.70 };
  }

  // 11. BAT (Nocturnal flyer with wide membranous wings, fangs & pointed ears)
  private static createBat(color: number): CharacterRigs3D {
    const root = new THREE.Group();
    const limbs: THREE.Mesh[] = [];
    const wings: THREE.Mesh[] = [];
    const eyes: THREE.Mesh[] = [];

    const furMat = new THREE.MeshStandardMaterial({ color: color || 0x1e293b, roughness: 0.85 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7, side: THREE.DoubleSide });
    const pinkMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.6 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 }); // glowing amber eyes
    const fangMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Fuzzy bat body
    const bodyGeo = new THREE.SphereGeometry(0.075, 12, 12);
    bodyGeo.scale(0.85, 1.2, 0.85);
    const body = new THREE.Mesh(bodyGeo, furMat);
    body.position.y = 0.22;
    body.castShadow = true;
    root.add(body);

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.32, 0.04);

    const headGeo = new THREE.SphereGeometry(0.062, 12, 12);
    const headMesh = new THREE.Mesh(headGeo, furMat);
    headGroup.add(headMesh);

    // Bat snout / nose
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.028, 4), furMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.01, 0.06);
    headGroup.add(snout);

    // Glowing eyes
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), eyeMat);
      eye.position.set(side * 0.025, 0.015, 0.052);
      headGroup.add(eye);
      eyes.push(eye);
    }

    // Tiny vampire fangs
    for (const side of [-1, 1]) {
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.014, 4), fangMat);
      fang.rotation.x = Math.PI;
      fang.position.set(side * 0.012, -0.024, 0.054);
      headGroup.add(fang);
    }

    // Pointed bat ears with inner pink lining
    for (const side of [-1, 1]) {
      const earGroup = new THREE.Group();
      earGroup.position.set(side * 0.038, 0.055, 0);
      earGroup.rotation.z = side * -0.25;

      const outerEar = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.08, 4), furMat);
      outerEar.scale.set(1, 1, 0.35);
      earGroup.add(outerEar);

      const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 4), pinkMat);
      innerEar.position.z = 0.005;
      innerEar.scale.set(1, 1, 0.3);
      earGroup.add(innerEar);

      headGroup.add(earGroup);
    }

    root.add(headGroup);

    // Large Articulated Bat Wings (Left and Right)
    for (const side of [-1, 1]) {
      const wingGroup = new THREE.Group();
      wingGroup.position.set(side * 0.05, 0.24, 0);

      // Arm bone strut
      const armStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.008, 0.18), furMat);
      armStrut.position.set(side * 0.09, 0.04, 0);
      armStrut.rotation.z = side * -0.7;
      wingGroup.add(armStrut);

      // 3 Finger struts spanning membranous skin
      for (let f = 0; f < 3; f++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.003, 0.16), furMat);
        finger.position.set(side * (0.12 + f * 0.05), -0.04, 0);
        finger.rotation.z = side * (-0.9 - f * 0.25);
        wingGroup.add(finger);
      }

      // Membranous wing plane
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.lineTo(side * 0.26, 0.08);
      wingShape.quadraticCurveTo(side * 0.22, -0.12, side * 0.16, -0.08);
      wingShape.quadraticCurveTo(side * 0.12, -0.14, side * 0.06, -0.06);
      wingShape.lineTo(0, 0);

      const wingMesh = new THREE.Mesh(new THREE.ShapeGeometry(wingShape), wingMat);
      wingMesh.castShadow = true;
      wingGroup.add(wingMesh);

      root.add(wingGroup);
      wings.push(wingGroup as any);
    }

    // Little claws for perching
    for (const side of [-1, 1]) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 4), furMat);
      claw.position.set(side * 0.03, 0.06, 0);
      claw.rotation.x = Math.PI;
      root.add(claw);
      limbs.push(claw);
    }

    return { root, body, head: headGroup, limbs, wings, eyes, height: 0.32 };
  }

  // 12. SUPERHERO (Dynamic biped with cape & chest crest)
  private static createSuperhero(color: number, name?: string): CharacterRigs3D {
    const rig = this.createHuman(color || 0x2563eb);
    // Add flowing cape on back of torso
    const capeMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6, side: THREE.DoubleSide });
    const capeGeo = new THREE.PlaneGeometry(0.16, 0.32);
    const cape = new THREE.Mesh(capeGeo, capeMat);
    cape.position.set(0, 0.28, -0.08);
    cape.rotation.x = 0.15;
    cape.castShadow = true;
    rig.root.add(cape);

    if (name) {
      rig.root.name = name;
    }
    return rig;
  }
}

