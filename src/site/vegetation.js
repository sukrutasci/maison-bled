import * as THREE from 'three';
import { terrainHeight } from './terrain.js';

// Végétation inspirée des photos du site : grands noyers, fruitiers,
// noisetiers en rangs (typiques de la mer Noire), conifères épars.
// Aléatoire à graine fixe : la disposition est la même à chaque chargement.

export function seededRandom(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const leaf = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true });
const walnutLeaves = [0x4f8a2e, 0x5f9a38, 0x437a28].map(leaf);
const fruitLeaves = [0x5d9434, 0x6ea540].map(leaf);
const coniferLeaves = leaf(0x2f5a2a);
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 1 });
const sphere = new THREE.IcosahedronGeometry(1, 1);

function trunk(g, h, r) {
  const t = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, h, 7), trunkMat);
  t.position.y = h / 2;
  t.castShadow = true;
  g.add(t);
}
function blob(g, mat, x, y, z, r) {
  const b = new THREE.Mesh(sphere, mat);
  b.position.set(x, y, z);
  b.scale.set(r, r * 0.8, r);
  b.castShadow = true;
  g.add(b);
}
function place(g, x, z, rand) {
  g.position.set(x, terrainHeight(x, z), z);
  g.rotation.y = rand() * Math.PI * 2;
  return g;
}

// Grand noyer : tronc court et épais, houppier large et étalé
export function walnut(x, z, s, rand) {
  const g = new THREE.Group();
  trunk(g, 3.2 * s, 0.35 * s);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand();
    const d = (1.8 + rand() * 1.4) * s;
    blob(g, walnutLeaves[i % 3], Math.cos(a) * d, (4.2 + rand() * 1.6) * s, Math.sin(a) * d, (1.8 + rand() * 0.8) * s);
  }
  blob(g, walnutLeaves[1], 0, 5.8 * s, 0, 2.4 * s);
  return place(g, x, z, rand);
}

// Fruitier : petit arbre au houppier rond
export function fruitTree(x, z, s, rand) {
  const g = new THREE.Group();
  trunk(g, 1.6 * s, 0.14 * s);
  for (let i = 0; i < 4; i++) {
    blob(g, fruitLeaves[i % 2], (rand() - 0.5) * 1.2 * s, (2.2 + rand() * 0.7) * s, (rand() - 0.5) * 1.2 * s, (1 + rand() * 0.4) * s);
  }
  return place(g, x, z, rand);
}

export function conifer(x, z, s, rand) {
  const g = new THREE.Group();
  trunk(g, 2 * s, 0.2 * s);
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry((2 - i * 0.5) * s, 2.8 * s, 8), coniferLeaves);
    c.position.y = (2.6 + i * 1.5) * s;
    c.castShadow = true;
    g.add(c);
  }
  return place(g, x, z, rand);
}

// Buissons / noisetiers : un seul InstancedMesh (plusieurs centaines d'instances)
export function bushes(points, rand) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true });
  const mesh = new THREE.InstancedMesh(sphere, mat, points.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  points.forEach(([x, z, s], i) => {
    const r = s * (0.8 + rand() * 0.5);
    m.compose(new THREE.Vector3(x, terrainHeight(x, z) + r * 0.6, z), q, new THREE.Vector3(r, r * 0.85, r));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.setHSL(0.24 + rand() * 0.05, 0.45 + rand() * 0.15, 0.24 + rand() * 0.1));
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
