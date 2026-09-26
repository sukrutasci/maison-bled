import * as THREE from 'three';
import { boxMesh } from '../lib/geometry.js';
import { seededRandom } from './vegetation.js';

// Massifs fleuris : bordure en pierre, terre, rosiers (feuillage + fleurs).
// Fleurs et feuillages en InstancedMesh pour rester léger.
const ROSE_COLORS = [0xc8193c, 0xe0527f, 0xf2eee6, 0xd92f2f, 0xf3a3b8];

export function createFlowerBeds(beds, level) {
  const g = new THREE.Group();
  g.name = 'massifs';
  const rand = seededRandom(21);
  const edging = new THREE.MeshStandardMaterial({ color: 0xbcb5a8, roughness: 0.9 });
  const soil = new THREE.MeshStandardMaterial({ color: 0x4a3526, roughness: 1 });

  const leaves = [], flowers = [];
  for (const [x0, z0, x1, z1] of beds) {
    const e = 0.08, top = level + 0.22;
    // bordure
    g.add(boxMesh(x0, level - 0.1, z0, x1, top, z0 + e, edging));
    g.add(boxMesh(x0, level - 0.1, z1 - e, x1, top, z1, edging));
    g.add(boxMesh(x0, level - 0.1, z0, x0 + e, top, z1, edging));
    g.add(boxMesh(x1 - e, level - 0.1, z0, x1, top, z1, edging));
    // terre
    g.add(boxMesh(x0 + e, level - 0.1, z0 + e, x1 - e, top - 0.04, z1 - e, soil));
    // rosiers en quinconce, espacés d'environ 45 cm
    const step = 0.45;
    for (let x = x0 + 0.3, row = 0; x < x1 - 0.2; x += step, row++) {
      for (let z = z0 + 0.3 + (row % 2) * step / 2; z < z1 - 0.2; z += step) {
        const color = ROSE_COLORS[Math.floor(rand() * ROSE_COLORS.length)];
        const h = 0.35 + rand() * 0.3; // hauteur du rosier
        const base = new THREE.Vector3(x + (rand() - 0.5) * 0.1, top - 0.04, z + (rand() - 0.5) * 0.1);
        for (let k = 0; k < 4; k++) {
          leaves.push({
            p: base.clone().add(new THREE.Vector3((rand() - 0.5) * 0.25, h * (0.35 + rand() * 0.5), (rand() - 0.5) * 0.25)),
            s: 0.12 + rand() * 0.06,
          });
        }
        const n = 5 + Math.floor(rand() * 5);
        for (let k = 0; k < n; k++) {
          flowers.push({
            p: base.clone().add(new THREE.Vector3((rand() - 0.5) * 0.3, h * (0.7 + rand() * 0.45), (rand() - 0.5) * 0.3)),
            s: 0.035 + rand() * 0.02,
            c: color,
          });
        }
      }
    }
  }

  const leafMesh = instanced(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), leaves, (i) =>
    new THREE.Color().setHSL(0.3 + rand() * 0.04, 0.5, 0.2 + rand() * 0.08));
  const flowerMesh = instanced(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.6 }), flowers, (i) =>
    new THREE.Color(flowers[i].c));
  g.add(leafMesh, flowerMesh);
  return g;
}

function instanced(geo, mat, items, colorOf) {
  const mesh = new THREE.InstancedMesh(geo, mat, items.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  items.forEach((it, i) => {
    m.compose(it.p, q, new THREE.Vector3(it.s, it.s * 0.85, it.s));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, colorOf(i));
  });
  mesh.castShadow = true;
  return mesh;
}
