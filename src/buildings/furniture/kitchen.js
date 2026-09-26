import * as THREE from 'three';
import { PLAN } from '../../data/plan.js';
import { floorTiles } from '../../lib/textures.js';

// Cuisine équipée, d'après PLAN.kitchen.
// ctx.box(x0, y0, x1, y1, h0, h1, mat) : boîte en cm (plan) / m (hauteur, depuis le sol du niveau)
// ctx.place(object, px, py, h)         : pose un objet en coordonnées plan

const K = PLAN.kitchen;
const C = K.colors;
const mat = (o) => new THREE.MeshStandardMaterial(o);

export const kitchenMaterials = {
  fronts: mat({ color: C.fronts, roughness: 0.35 }),
  worktop: mat({ color: C.worktop, roughness: 0.55 }),
  plinth: mat({ color: C.plinth, roughness: 0.8 }),
  gap: mat({ color: 0x8c8a86, roughness: 0.8 }),
  steel: mat({ color: 0xc8cacc, roughness: 0.25, metalness: 0.85 }),
  basin: mat({ color: 0x7d8185, roughness: 0.3, metalness: 0.8 }),
  blackGlass: mat({ color: 0x151618, roughness: 0.08, metalness: 0.3 }),
  ring: mat({ color: 0x55585c, roughness: 0.4 }),
  white: mat({ color: 0xf6f6f4, roughness: 0.4 }),
  porthole: mat({ color: 0x2c3a44, roughness: 0.1, metalness: 0.2 }),
  splash: mat({ map: floorTiles(), color: C.splash, roughness: 0.3 }),
  wood: mat({ color: C.chairWood, roughness: 0.6 }),
  seat: mat({ color: C.chairSeat, roughness: 0.9 }),
  tableTop: mat({ color: C.worktop, roughness: 0.5 }),
  lampShade: mat({ color: 0x2b2b2b, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide }),
  bulb: mat({ color: 0xfff2d6, emissive: 0xffd9a0, emissiveIntensity: 1.5 }),
};
const M = kitchenMaterials;

export function buildKitchen(ctx) {
  const { box, place } = ctx;
  const top = K.worktopHeight / 100; // 0,90 m
  const plinthH = 0.1, carcassTop = top - 0.04;
  const [lx0, ly0, lx1, ly1] = K.runLeft; // façade en x = lx1
  const [tx0, ty0, tx1, ty1] = K.runTop; // façade en y = ty1

  // ---------------------------------------------------------- Meubles bas
  // mur gauche
  box(lx0, ly0, lx1 - 4, ly1, 0, plinthH, M.plinth);
  box(lx0, ly0, lx1, ly1, plinthH, carcassTop, M.fronts);
  box(lx0, ly0, lx1 + 2, ly1, carcassTop, top, M.worktop);
  // retour contre le mur du hall
  box(tx0, ty0, tx1, ty1 - 4, 0, plinthH, M.plinth);
  box(tx0, ty0, tx1, ty1, plinthH, carcassTop, M.fronts);
  box(tx0, ty0, tx1, ty1 + 2, carcassTop, top, M.worktop);

  // joints de portes + poignées (façades le long de y, en x = lx1)
  const doorsAlongY = (y0, y1, n, x, h0, h1, handleAtTop = true) => {
    const w = (y1 - y0) / n;
    for (let i = 0; i <= n; i++) box(x, y0 + i * w - 0.15, x + 0.3, y0 + i * w + 0.15, h0, h1, M.gap);
    for (let i = 0; i < n; i++) {
      const yc = y0 + (i + 0.5) * w;
      const hh = handleAtTop ? h1 - 0.06 : h0 + 0.06;
      box(x, yc - 8, x + 2, yc + 8, hh - 0.01, hh + 0.01, M.steel);
    }
  };
  const doorsAlongX = (x0, x1, n, y, h0, h1, handleAtTop = true) => {
    const w = (x1 - x0) / n;
    for (let i = 0; i <= n; i++) box(x0 + i * w - 0.15, y, x0 + i * w + 0.15, y + 0.3, h0, h1, M.gap);
    for (let i = 0; i < n; i++) {
      const xc = x0 + (i + 0.5) * w;
      const hh = handleAtTop ? h1 - 0.06 : h0 + 0.06;
      box(xc - 8, y, xc + 8, y + 2, hh - 0.01, hh + 0.01, M.steel);
    }
  };
  // tiroir sous plan + portes, par tronçons entre les appareils
  const segLeft = [[ly0 + 62, K.sink[1]], [K.sink[1], K.sink[3]], [K.dishwasher[3], K.hob[1]]];
  for (const [a, b] of segLeft) {
    if (b - a < 10) continue;
    doorsAlongY(a, b, Math.max(1, Math.round((b - a) / 50)), lx1, plinthH, carcassTop - 0.18);
    box(lx1, a, lx1 + 0.3, b, carcassTop - 0.18, carcassTop - 0.17, M.gap);
    doorsAlongY(a, b, 1, lx1, carcassTop - 0.17, carcassTop);
  }
  doorsAlongX(tx0, tx1, 2, ty1, plinthH, carcassTop - 0.18);
  box(tx0, ty1, tx1, ty1 + 0.3, carcassTop - 0.18, carcassTop - 0.17, M.gap);

  // ------------------------------------------------------------------ Évier
  {
    const [x0, y0, x1, y1] = K.sink;
    box(x0 + 8, y0 + 8, x1 - 6, y1 - 8, top, top + 0.004, M.steel);
    box(x0 + 12, y0 + 12, x1 - 10, y1 - 12, top, top + 0.006, M.basin);
    const yc = (y0 + y1) / 2;
    const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.32, 12), M.steel);
    place(tap, x0 + 5, yc, top + 0.16);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 12), M.steel);
    spout.rotation.z = Math.PI / 2;
    place(spout, x0 + 14, yc, top + 0.31);
  }

  // --------------------------------------------------------- Lave-vaisselle
  {
    const [, y0, , y1] = K.dishwasher;
    box(lx1, y0 + 0.3, lx1 + 0.4, y1 - 0.3, plinthH, carcassTop, M.fronts);
    box(lx1, y0 + 0.2, lx1 + 0.3, y0 + 0.5, plinthH, carcassTop, M.gap);
    box(lx1, y1 - 0.5, lx1 + 0.3, y1 - 0.2, plinthH, carcassTop, M.gap);
    box(lx1, y0 + 8, lx1 + 2.5, y1 - 8, carcassTop - 0.07, carcassTop - 0.05, M.steel);
  }

  // ------------------------------------------------------ Plaque + four
  {
    const [x0, y0, x1, y1] = K.hob;
    box(x0 + 6, y0 + 4, x1 - 4, y1 - 4, top, top + 0.006, M.blackGlass);
    const xs = [x0 + 20, x1 - 20], ys = [y0 + 20, y1 - 20];
    for (const px of xs) for (const py of ys) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.006, 6, 24), M.ring);
      r.rotation.x = Math.PI / 2;
      place(r, px, py, top + 0.008);
    }
    // four encastré sous la plaque
    box(lx1, y0 + 2, lx1 + 0.8, y1 - 2, 0.18, carcassTop - 0.02, M.blackGlass);
    box(lx1, y0 + 6, lx1 + 3, y1 - 6, carcassTop - 0.08, carcassTop - 0.06, M.steel);
    // hotte
    box(lx0, y0 - 5, lx0 + 50, y1 + 5, 1.62, 1.7, M.steel);
    box(lx0, (y0 + y1) / 2 - 14, lx0 + 28, (y0 + y1) / 2 + 14, 1.7, 2.7, M.steel);
  }

  // ------------------------------------------------------------- Lave-linge
  {
    const [, y0, , y1] = K.washer;
    box(lx1, y0 + 0.5, lx1 + 0.6, y1 - 1, plinthH, carcassTop, M.white);
    const door = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 28), M.porthole);
    door.rotation.z = Math.PI / 2;
    place(door, lx1 + 1, (y0 + y1) / 2, 0.42);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 8, 28), M.steel);
    rim.rotation.y = Math.PI / 2;
    place(rim, lx1 + 1.5, (y0 + y1) / 2, 0.42);
  }

  // ---------------------------------------------------- Crédence + meubles hauts
  box(lx0, ly0, lx0 + 1, ly1, top, 1.45, M.splash);
  box(tx0, ty0, tx1, ty0 + 1, top, 1.45, M.splash);
  for (const [x0, y0, x1, y1] of K.wallUnitsLeft) {
    box(x0, y0, x1, y1, 1.45, 2.15, M.fronts);
    doorsAlongY(y0, y1, Math.max(1, Math.round((y1 - y0) / 45)), x1, 1.45, 2.15, false);
  }
  for (const [x0, y0, x1, y1] of K.wallUnitsTop) {
    box(x0, y0, x1, y1, 1.45, 2.15, M.fronts);
    doorsAlongX(x0, x1, 2, y1, 1.45, 2.15, false);
  }

  // --------------------------------------------- Réfrigérateur + colonne
  {
    const [x0, y0, x1, y1] = K.fridge;
    box(x0, y0, x1, y1, 0, 1.85, M.white);
    box(x0, y1, x1, y1 + 0.3, 1.2, 1.21, M.gap);
    box(x1 - 6, y1, x1 - 4, y1 + 3, 0.75, 1.15, M.steel);
    box(x1 - 6, y1, x1 - 4, y1 + 3, 1.3, 1.6, M.steel);
    const [px0, py0, px1, py1] = K.pantry;
    box(px0, py0, px1, py1, 0, 2.15, M.fronts);
    box(px0 + 4, py1, px0 + 6, py1 + 2, 0.9, 1.3, M.steel);
  }

  // ---------------------------------------------------------- Table + chaises
  {
    const [x0, y0, x1, y1] = K.table;
    box(x0, y0, x1, y1, 0.73, 0.76, M.tableTop);
    for (const [px, py] of [[x0 + 4, y0 + 4], [x1 - 9, y0 + 4], [x0 + 4, y1 - 9], [x1 - 9, y1 - 9]]) {
      box(px, py, px + 5, py + 5, 0, 0.73, M.wood);
    }
    for (const [cx, cy, dir] of K.chairs) chair(ctx, cx, cy, dir);

    // suspension au-dessus de la table
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.95, 6), M.lampShade);
    place(cord, cx, cy, 2.27);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.22, 24, 1, true), M.lampShade);
    place(shade, cx, cy, 1.72);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), M.bulb);
    place(bulb, cx, cy, 1.64);
    const light = new THREE.PointLight(0xffd9a8, 6, 7, 2);
    place(light, cx, cy, 1.55);
  }
}

// Chaise : assise 44 × 44, dossier du côté `dir`
function chair({ box }, cx, cy, dir) {
  const s = 22;
  box(cx - s, cy - s, cx + s, cy + s, 0.43, 0.47, M.seat);
  for (const [dx, dy] of [[-s + 1, -s + 1], [s - 5, -s + 1], [-s + 1, s - 5], [s - 5, s - 5]]) {
    box(cx + dx, cy + dy, cx + dx + 4, cy + dy + 4, 0, 0.43, M.wood);
  }
  if (dir === 0) box(cx - s, cy - s, cx - s + 3, cy + s, 0.47, 0.9, M.wood);
  else if (dir === 1) box(cx + s - 3, cy - s, cx + s, cy + s, 0.47, 0.9, M.wood);
  else box(cx - s, cy + s - 3, cx + s, cy + s, 0.47, 0.9, M.wood);
}
