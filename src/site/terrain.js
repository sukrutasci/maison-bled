import * as THREE from 'three';
import { SITE } from '../config.js';

// Bruit déterministe léger (somme de sinus) — suffisant pour un relief doux.
function noise(x, z) {
  return (
    0.35 * Math.sin(x * 0.21 + Math.cos(z * 0.17) * 1.3) +
    0.25 * Math.sin(z * 0.13 + x * 0.07) +
    0.12 * Math.sin(x * 0.53 - z * 0.41) +
    0.06 * Math.sin(x * 1.1 + z * 0.9)
  );
}

// Relief naturel (avant terrassement) : replat cour + route au niveau 0,
// pente de 15° en aval (arrière) et en amont (au-delà de la route).
export function rawHeight(x, z) {
  const sat = (v) => 150 * Math.tanh(v / 150); // adoucie très loin (horizon)
  const s = Math.tan(THREE.MathUtils.degToRad(SITE.slopeDeg));
  const zb = SITE.benchStartZ;
  const zr = SITE.road.z0 + SITE.road.width;
  let h = 0;
  if (z < zb) h = -s * sat(zb - z);
  else if (z > zr) h = s * sat(z - zr);
  // légère irrégularité du sol, nulle sur le replat, en fondu sur 3 m
  const rough = Math.min(1, Math.max(0, Math.max(zb - z, z - zr) / 3));
  h += SITE.slopeX * sat(x);
  h += noise(x, z) * 0.12 * rough;
  return h;
}

// Terrassement du projet :
// - déblai : plateforme au niveau du RDC sur `margin` m autour de la maison,
//   puis talus à `bankDeg` jusqu'au terrain naturel (côté amont),
// - remblai : même principe côté entrée/avant là où le terrain est plus bas,
// - fouille : l'emprise est décaissée pour le sous-sol.
// platform = { minX, maxX, minZ, maxZ, level, margin, bankDeg,
//              fill: {minX, maxX, minZ, maxZ}, pit: {minX, maxX, minZ, maxZ, level},
//              cuts: [{minX, maxX, minZ, maxZ, level}],
//              ramps: [{x0, x1, z0, flatUntilZ, z1, bottom, top, soft}] }
let platform = null;
let earthworks = false;
export function setPlatform(p) { platform = p; }
export function setEarthworks(on) { earthworks = on; }

function smoothstep(a, b, t) {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

const distToRect = (r, x, z) => Math.hypot(Math.max(r.minX - x, 0, x - r.maxX), Math.max(r.minZ - z, 0, z - r.maxZ));

export function terrainHeight(x, z) {
  const h = rawHeight(x, z);
  if (!platform || !earthworks) return h;
  const { pit, fill, level, margin = 2, bankDeg = 33 } = platform;
  if (pit && x > pit.minX && x < pit.maxX && z > pit.minZ && z < pit.maxZ) return Math.min(h, pit.level);
  const bank = Math.tan(THREE.MathUtils.degToRad(bankDeg));
  // déblai
  let out = Math.min(h, level + Math.max(0, distToRect(platform, x, z) - margin) * bank);
  // remblai
  if (fill) out = Math.max(out, level - Math.max(0, distToRect(fill, x, z) - margin) * bank);
  // décaissements francs (parking), bords masqués par des murs/bordures
  for (const c of platform.cuts ?? []) {
    if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) out = Math.min(out, c.level);
  }
  // talus de terre (entrée voiture) : profil adouci, bords irréguliers
  for (const r of platform.ramps ?? []) {
    if (z < r.z0 - r.soft || z > r.z1 + 0.5) continue;
    const wob = 0.6 * Math.sin(z * 0.7 + 1.3) + 0.4 * Math.sin(z * 1.9);
    const dx = Math.max(r.x0 + wob * 0.6 - x, 0, x - (r.x1 + wob * 0.4));
    const wx = 1 - smoothstep(0, r.soft, dx);
    const wz = z < r.z0 ? 1 - smoothstep(0, r.soft, r.z0 - z) : 1;
    const w = wx * wz;
    if (w <= 0) continue;
    const t = smoothstep(r.flatUntilZ, r.z1, z);
    const hr = THREE.MathUtils.lerp(r.bottom, r.top, t) + noise(x * 1.7, z * 1.7) * 0.05;
    out = THREE.MathUtils.lerp(out, Math.min(out, hr), w);
  }
  return out;
}

export function createTerrain() {
  const { terrainSize: S, terrainResolution: N } = SITE;
  const geo = new THREE.PlaneGeometry(S, S, N, N);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  refreshTerrain(mesh);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const grass = new THREE.Color(0x5f8c34), grassDry = new THREE.Color(0xa3a45f); // herbe sèche de fin d'été (photos)
  const dirt = new THREE.Color(0x8b7657), gravelDirt = new THREE.Color(0x9a8c78);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const n = noise(x * 2.3, z * 2.3) * 0.5 + 0.5;
    c.copy(grass).lerp(grassDry, n * 0.85);
    // cour en terre battue autour des bâtiments (cf. photos)
    const r = Math.hypot(x + 1, z - 3);
    const dirtW = 1 - smoothstep(7, 13, r + noise(x * 3, z * 3) * 2);
    c.lerp(dirt, dirtW * 0.85);
    // terre battue / gravier de l'entrée voiture (terrain vague)
    const e = SITE.parking.dirtRamp;
    if (e) {
      const d = Math.max(e.x0 - x, 0, x - e.x1, e.z0 - z, 0) + noise(x * 4, z * 4) * 0.8;
      if (z < SITE.road.z0 + 0.5) c.lerp(gravelDirt, (1 - smoothstep(0, 2, d)) * 0.9);
    }
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

// Recalcule les altitudes (après changement de terrassement)
export function refreshTerrain(mesh) {
  const pos = mesh.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
  mesh.geometry.computeBoundingSphere();
}

// Sol lointain basse définition sous le terrain détaillé (jusqu'aux montagnes)
export function createFarGround() {
  // maille de 18 m alignée sur le bord du terrain détaillé (±90 m) ;
  // l'intérieur est enfoncé pour ne jamais traverser les terrassements.
  const geo = new THREE.PlaneGeometry(1260, 1260, 70, 70);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const inner = SITE.terrainSize / 2 - 1;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const inside = Math.abs(x) < inner && Math.abs(z) < inner;
    pos.setY(i, rawHeight(x, z) - (inside ? 30 : 0.4));
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x55803a, roughness: 1 }));
  mesh.receiveShadow = true;
  mesh.name = 'sol-lointain';
  return mesh;
}
