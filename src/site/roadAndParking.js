import * as THREE from 'three';
import { SITE } from '../config.js';
import { boxMesh } from '../lib/geometry.js';
import { terrainHeight } from './terrain.js';
import { floorTiles, stone } from '../lib/textures.js';

// Route de village en béton, sans marquage (sur le replat, niveau 0), avec un
// muret de soutènement en pierre côté amont
export function createRoad() {
  const g = new THREE.Group();
  g.name = 'route';
  const { z0, width } = SITE.road;
  const z1 = z0 + width;
  const L = SITE.terrainSize / 2;
  const concrete = new THREE.MeshStandardMaterial({ map: concreteSlabs(), roughness: 0.95 });
  const wall = new THREE.MeshStandardMaterial({ map: stone(), roughness: 1 });
  g.add(boxMesh(-L, -0.3, z0, L, ROAD_TOP, z1, concrete, 4));
  g.add(boxMesh(-L, 0, z1, L, 0.7, z1 + 0.35, wall, 1.5));
  return g;
}

// Dalles de béton coulées par panneaux, taches et fissures
function concreteSlabs() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#c3bfb6';
  g.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 900; k++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.06})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 10, 2 + Math.random() * 10);
  }
  g.strokeStyle = 'rgba(60,55,50,0.6)';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, 1); g.lineTo(256, 1); g.stroke(); // joint
  g.strokeStyle = 'rgba(60,55,50,0.25)';
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(40, 0); g.lineTo(90, 120); g.lineTo(70, 256); g.stroke(); // fissure
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// Niveau du dessus de la route (le replat est au niveau 0)
export const ROAD_TOP = 0.06;

// Parking en contrebas de la route (SITE.parking) :
// - places pavées à ROAD_TOP − dropFromRoad, bordures béton + muret de 30 cm,
// - mur de soutènement béton côté route, surmonté d'une clôture en barbelé,
// - entrée voiture en terre (talus modelé dans le terrain, cf. terrain.js),
// - escalier vers la dalle d'entrée, muret béton tout autour de la maison.
// `level` = niveau de la plate-forme autour de la maison, `slabTop` = dessus
// de la dalle d'entrée.
export function createParking({ level, slabTop }) {
  const g = new THREE.Group();
  g.name = 'parking';
  const P = parkingLevel();
  const { area, entrance, spaces, steps } = SITE.parking;
  const [ax0, az0, ax1, az1] = area;

  const paving = new THREE.MeshStandardMaterial({ map: floorTiles(), color: 0xc9c2b6, roughness: 0.9 });
  const concrete = new THREE.MeshStandardMaterial({ map: concreteSlabs(), color: 0xd6d2ca, roughness: 0.95 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.6 });

  // places pavées
  g.add(boxMesh(ax0 - 0.1, P - 0.3, az0, ax1, P, az1, paving, 0.8));

  // bordures béton (masquent le raccord du terrain) + muret de 30 cm
  const band = 1.2, para = 0.3;
  const capTop = level + 0.02;
  g.add(boxMesh(steps[1], P - 0.3, az0 - 1.5, ax1 + band, capTop, az0, concrete, 2));
  g.add(boxMesh(steps[1], capTop, az0 - 0.2, ax1 + band, capTop + para, az0, concrete, 2));
  g.add(boxMesh(ax1, P - 0.3, az0, ax1 + band, capTop, az1, concrete, 2));
  g.add(boxMesh(ax1, capTop, az0, ax1 + 0.2, capTop + para, az1, concrete, 2));

  // mur de soutènement côté route (hors entrée voiture)
  g.add(boxMesh(entrance[1], P - 0.3, az1 - 0.25, ax1 + band, ROAD_TOP + 0.15, az1, concrete, 2));

  // escalier : de la dalle d'entrée jusqu'au parking
  {
    const n = 6, rise = (slabTop - P) / n, run = 0.28;
    for (let k = 0; k < n - 1; k++) {
      const z = az0 - 1.2 + k * run;
      g.add(boxMesh(steps[0], P - 0.6, z, steps[1], slabTop - (k + 1) * rise, z + run, concrete, 2));
    }
  }

  // places (contour peint)
  const line = (x0, z0, x1, z1) => g.add(boxMesh(x0, P, z0, x1, P + 0.005, z1, white));
  for (const [sx0, sz0, sx1, sz1] of spaces) {
    line(sx0, sz0 - 0.05, sx1, sz0 + 0.05);
    line(sx0, sz1 - 0.05, sx1, sz1 + 0.05);
    line(sx0 - 0.05, sz0, sx0 + 0.05, sz1);
    line(sx1 - 0.05, sz0, sx1 + 0.05, sz1);
  }

  // voitures garées parallèlement à la route
  [0x2f4e7a, 0xb8b8b4].forEach((color, i) => {
    const [sx0, sz0, sx1, sz1] = spaces[i];
    const c = car((sx0 + sx1) / 2, P, (sz0 + sz1) / 2, color);
    c.rotation.y = Math.PI / 2;
    g.add(c);
  });

  // petite clôture en barbelé le long de la route (hors entrée voiture)
  g.add(barbedFence([[SITE.plot[3][0], entrance[0]], [entrance[1], SITE.plot[2][0]]], az1 - 0.12));

  // muret béton autour de la maison
  g.add(houseWall(SITE.houseWall, concrete));
  return g;
}

// Muret de ~35 cm qui suit le terrain par paliers de 1 m (fondation enterrée)
function houseWall(points, mat) {
  const g = new THREE.Group();
  const t = 0.2, above = 0.35;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, z0] = points[i], [x1, z1] = points[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len));
    for (let k = 0; k < n; k++) {
      const ax = x0 + ((x1 - x0) * k) / n, az = z0 + ((z1 - z0) * k) / n;
      const bx = x0 + ((x1 - x0) * (k + 1)) / n, bz = z0 + ((z1 - z0) * (k + 1)) / n;
      const ga = terrainHeight(ax, az), gb = terrainHeight(bx, bz);
      const horiz = Math.abs(bx - ax) > Math.abs(bz - az);
      const [px0, px1] = horiz ? [Math.min(ax, bx), Math.max(ax, bx)] : [ax - t / 2, ax + t / 2];
      const [pz0, pz1] = horiz ? [az - t / 2, az + t / 2] : [Math.min(az, bz), Math.max(az, bz)];
      g.add(boxMesh(px0, Math.min(ga, gb) - 0.5, pz0, px1, Math.max(ga, gb) + above, pz1, mat, 2));
    }
  }
  return g;
}

export function parkingLevel() {
  return ROAD_TOP - SITE.parking.dropFromRoad;
}

function barbedFence(spans, z) {
  const g = new THREE.Group();
  const post = new THREE.MeshStandardMaterial({ color: 0x6d5a45, roughness: 1 });
  const wire = new THREE.LineBasicMaterial({ color: 0x55595c });
  const base = ROAD_TOP + 0.15;
  for (const [a, b] of spans) {
    const n = Math.max(1, Math.round((b - a) / 2.5));
    for (let i = 0; i <= n; i++) {
      const x = a + ((b - a) * i) / n;
      g.add(boxMesh(x - 0.04, base - 0.1, z - 0.04, x + 0.04, base + 1.0, z + 0.04, post));
    }
    for (const h of [0.3, 0.6, 0.9]) {
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a, base + h, z), new THREE.Vector3(b, base + h, z)]), wire));
    }
  }
  return g;
}

function car(x, y, z, color) {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1c2630, roughness: 0.1, metalness: 0.5 });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  g.add(boxMesh(-0.9, 0.3, -2.2, 0.9, 0.95, 2.2, body));
  g.add(boxMesh(-0.82, 0.95, -1.1, 0.82, 1.45, 1.0, glass));
  g.add(boxMesh(-0.8, 1.45, -1.0, 0.8, 1.5, 0.9, body));
  for (const [wx, wz] of [[-0.85, -1.4], [0.85, -1.4], [-0.85, 1.4], [0.85, 1.4]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 16), tyre);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.33, wz);
    w.castShadow = true;
    g.add(w);
  }
  g.position.set(x, y, z);
  return g;
}
