import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { PLAN, cm } from '../data/plan.js';
import { boxMesh, hipRoof } from '../lib/geometry.js';
import { plaster, roofTiles, parquet, floorTiles, stone } from '../lib/textures.js';
import { buildKitchen, kitchenMaterials } from './furniture/kitchen.js';

// Génère la nouvelle maison à partir de PLAN (src/data/plan.js) :
// sous-sol + PLAN.levels niveaux identiques + véranda fermée + balcons.
// Repère local : origine = centre de l'emprise, y = 0 au sol fini du RDC.
export function createNewHouse() {
  const W = PLAN.width, D = PLAN.depth;
  const X = (px) => cm(px - W / 2);
  const Z = (py) => cm(py - D / 2);
  const H = cm(PLAN.wallHeight); // hauteur d'étage
  const L = PLAN.levels;
  const slabT = cm(PLAN.slabThickness);

  const group = new THREE.Group();
  group.name = 'nouvelle-maison';
  const parts = {
    structure: new THREE.Group(), // murs, dalles, sous-sol, escaliers
    openings: new THREE.Group(),
    floors: new THREE.Group(),
    furniture: new THREE.Group(),
    ceiling: new THREE.Group(),
    roof: new THREE.Group(),
    outdoor: new THREE.Group(),
    labels: new THREE.Group(),
  };
  for (const [k, g] of Object.entries(parts)) { g.name = k; group.add(g); }

  // Matériaux propres à la nouvelle maison (pour la coupe horizontale)
  const M = {
    facade: new THREE.MeshStandardMaterial({ map: plaster('#f4f0e8'), roughness: 0.95 }),
    interior: new THREE.MeshStandardMaterial({ color: 0xf7f5f0, roughness: 0.95 }),
    slab: new THREE.MeshStandardMaterial({ color: 0xbdb8ae, roughness: 1 }),
    base: new THREE.MeshStandardMaterial({ map: stone(), roughness: 1 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x3a3d40, roughness: 0.5, metalness: 0.2 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x9fc4d8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35, depthWrite: false }),
    door: new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.7 }),
    sill: new THREE.MeshStandardMaterial({ color: 0xd6d2c8, roughness: 0.8 }),
    parquet: new THREE.MeshStandardMaterial({ map: parquet(), roughness: 0.7 }),
    tile: new THREE.MeshStandardMaterial({ map: floorTiles(), roughness: 0.4 }),
    roof: new THREE.MeshStandardMaterial({ map: roofTiles(), roughness: 0.8, side: THREE.DoubleSide }),
    timber: new THREE.MeshStandardMaterial({ color: 0x7a5534, roughness: 0.8 }),
  };
  const furnitureMats = new Map();
  const furnitureMat = (c) => {
    if (!furnitureMats.has(c)) furnitureMats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
    return furnitureMats.get(c);
  };

  // Boîte en coordonnées plan (cm) + hauteurs (m)
  const pbox = (x0, y0, x1, y1, h0, h1, mat, target, uv = 1) => {
    const m = boxMesh(X(x0), h0, Z(y0), X(x1), h1, Z(y1), mat, uv);
    target.add(m);
    return m;
  };

  const isExterior = (w) => ['arriere', 'avant', 'gauche', 'droite'].includes(w.id);

  // ================================================================ Niveaux
  for (let lvl = 0; lvl < L; lvl++) {
    const y0 = lvl * H;

    // ---- Murs + ouvertures
    for (const wall of PLAN.walls) {
      const [x0, wy0, x1, wy1] = wall.rect;
      const horiz = x1 - x0 >= wy1 - wy0;
      const [a0, a1] = horiz ? [x0, x1] : [wy0, wy1];
      const [t0, t1] = horiz ? [wy0, wy1] : [x0, x1];
      const mat = isExterior(wall) ? M.facade : M.interior;
      const seg = (a, b, h0, h1) => {
        if (b - a <= 0 || h1 - h0 <= 0) return;
        if (horiz) pbox(a, t0, b, t1, y0 + h0, y0 + h1, mat, parts.structure, 2);
        else pbox(t0, a, t1, b, y0 + h0, y0 + h1, mat, parts.structure, 2);
      };
      const ops = wall.openings
        .map((o) => (lvl > 0 && o.upper ? { ...o, ...o.upper } : o))
        .sort((p, q) => p.from - q.from);
      let cursor = a0;
      for (const o of ops) {
        seg(cursor, o.from, 0, H);
        seg(o.from, o.to, 0, cm(o.sill));
        seg(o.from, o.to, cm(o.top), H);
        addOpening(o, horiz, t0, t1, isExterior(wall), wall.id, y0);
        cursor = o.to;
      }
      seg(cursor, a1, 0, H);
    }

    // ---- Sols finis
    for (const room of PLAN.rooms) {
      const [x0, ry0, x1, ry1] = room.rect;
      const mat = room.floor === 'tile' ? M.tile : M.parquet;
      const lift = room.id === 'edus' ? 0.014 : room.floor === 'tile' ? 0.012 : 0.01;
      pbox(x0, ry0, x1, ry1, y0, y0 + lift, mat, parts.floors, room.floor === 'tile' ? 1.2 : 1.5);
    }

    // ---- Mobilier
    for (const f of PLAN.furniture) {
      const [x0, fy0, x1, fy1] = f.rect;
      pbox(x0, fy0, x1, fy1, y0 + 0.01, y0 + cm(f.h), furnitureMat(f.color), parts.furniture);
    }
    buildKitchen({
      box: (x0, by0, x1, by1, h0, h1, mat) => pbox(x0, by0, x1, by1, y0 + h0, y0 + h1, mat, parts.furniture),
      place: (obj, px, py, h) => {
        obj.position.set(X(px), y0 + h, Z(py));
        parts.furniture.add(obj);
      },
    });

    // ---- Étiquettes
    for (const r of [...PLAN.rooms, ...PLAN.outdoor]) {
      const [x0, ly0, x1, ly1] = r.rect;
      const [lx, ly] = r.labelAt ?? [(x0 + x1) / 2, (ly0 + ly1) / 2];
      label(r.fr, `${r.tr}${r.area ? ` · ${r.area.toFixed(2)} m²` : ''}`, lx, ly, y0, lvl);
    }
    if (lvl === 0) label('Entrée', '', -90, 705, y0, lvl, 'entry');
  }

  function addOpening(o, horiz, t0, t1, exterior, wallId, y0) {
    const tm = (t0 + t1) / 2;
    const s = cm(o.sill), t = cm(o.top);
    // boîte le long de l'ouverture : a = position le long du mur, e = épaisseur (cm)
    const ob = (a0, a1, e0, e1, h0, h1, mat) =>
      horiz
        ? pbox(a0, e0, a1, e1, y0 + h0, y0 + h1, mat, parts.openings)
        : pbox(e0, a0, e1, a1, y0 + h0, y0 + h1, mat, parts.openings);
    const f = 6; // largeur de dormant (cm)
    const fm = f / 100;
    if (o.kind === 'door') {
      // simple chambranle, passage libre
      ob(o.from, o.from + 3, t0 - 1, t1 + 1, 0, t, M.door);
      ob(o.to - 3, o.to, t0 - 1, t1 + 1, 0, t, M.door);
      ob(o.from, o.to, t0 - 1, t1 + 1, t - 0.03, t, M.door);
      return;
    }
    // dormant
    ob(o.from, o.from + f, tm - 4, tm + 4, s, t, M.frame);
    ob(o.to - f, o.to, tm - 4, tm + 4, s, t, M.frame);
    ob(o.from, o.to, tm - 4, tm + 4, t - fm, t, M.frame);
    if (s > 0) ob(o.from, o.to, tm - 4, tm + 4, s, s + fm, M.frame);
    if (o.kind === 'entry') {
      ob(o.from + f, o.to - f, tm - 2.5, tm + 2.5, 0, t - fm, M.door);
      return;
    }
    // vitrage + montant central
    ob(o.from + f, o.to - f, tm - 0.6, tm + 0.6, s + (s > 0 ? fm : 0), t - fm, M.glass);
    const mid = (o.from + o.to) / 2;
    if (o.to - o.from > 90) ob(mid - 3, mid + 3, tm - 3, tm + 3, s, t, M.frame);
    // appui extérieur
    if (exterior && o.kind === 'window') {
      const outward = wallId === 'arriere' || wallId === 'gauche' ? -1 : 1;
      const [e0, e1] = outward > 0 ? [t1 - 2, t1 + 5] : [t0 - 5, t0 + 2];
      ob(o.from - 4, o.to + 4, e0, e1, s - 0.04, s, M.sill);
    }
  }

  function label(text, sub, px, py, y0, lvl, cls = '') {
    const el = document.createElement('div');
    el.className = `room-label ${cls}`;
    el.innerHTML = `<strong>${text}</strong>${sub ? `<span>${sub}</span>` : ''}`;
    const obj = new CSS2DObject(el);
    obj.position.set(X(px), y0 + 1.3, Z(py));
    obj.userData.level = lvl;
    parts.labels.add(obj);
  }

  // ======================================================= Dalles + trémies
  const [sx0, sy0, sx1, sy1] = PLAN.stair.rect;
  const slabWithHole = (top) => {
    for (const r of [[0, 0, W, sy0], [0, sy1, W, D], [sx1, sy0, W, sy1], [0, sy0, sx0, sy1]]) {
      pbox(...r, top - slabT, top, M.slab, parts.structure);
    }
  };
  for (let lvl = 0; lvl < L; lvl++) slabWithHole(lvl * H);
  // plafond du dernier niveau (masqué avec la toiture)
  pbox(0.5, 0.5, W - 0.5, D - 0.5, L * H - slabT, L * H, M.interior, parts.ceiling);

  // ============================================================== Sous-sol
  const baseH = cm(PLAN.basementHeight) + slabT; // dessus dalle sous-sol -> sol RDC
  const bottom = -baseH;
  const bw = 25; // épaisseur murs du sous-sol (cm)
  const buried = -8; // les murs descendent sous le terrain naturel
  pbox(0, 0, W, bw, buried, -slabT, M.base, parts.structure, 2);
  pbox(0, D - bw, W, D, buried, -slabT, M.base, parts.structure, 2);
  pbox(0, 0, bw, D, buried, -slabT, M.base, parts.structure, 2);
  pbox(W - bw, 0, W, D, buried, -slabT, M.base, parts.structure, 2);
  pbox(0, 0, W, D, bottom - 0.2, bottom, M.slab, parts.structure);

  // =============================================================== Escaliers
  // Deux U superposés dans la même trémie. Volées de 9 marches, palier au fond.
  const fw = PLAN.stair.flightWidth;
  const landingY = sy0 + fw;
  const steps = 9;
  const run = (sy1 - landingY) / steps;
  const leftA = [sx0, sx0 + fw], rightA = [sx1 - fw, sx1];

  // Vers le bas (sous-sol) : volée gauche vers le fond, palier, volée droite vers l'avant
  const rd = baseH / 2 / (steps + 1);
  for (let i = 0; i < steps; i++) {
    pbox(leftA[0], sy1 - (i + 1) * run, leftA[1], sy1 - i * run, bottom, -(i + 1) * rd, M.tile, parts.structure);
    pbox(rightA[0], landingY + i * run, rightA[1], landingY + (i + 1) * run, bottom, -baseH / 2 - (i + 1) * rd, M.tile, parts.structure);
  }
  pbox(sx0, sy0, sx1, landingY, bottom, -baseH / 2, M.tile, parts.structure);

  // Vers le haut (chaque niveau) : volée droite vers le fond, palier, volée gauche vers l'avant
  const ru = H / 2 / (steps + 1);
  for (let lvl = 0; lvl < L - 1; lvl++) {
    const y0 = lvl * H;
    for (let i = 0; i < steps; i++) {
      const t1 = y0 + (i + 1) * ru;
      pbox(rightA[0], sy1 - (i + 1) * run, rightA[1], sy1 - i * run, t1 - 0.2, t1, M.tile, parts.structure);
      const t2 = y0 + H / 2 + (i + 1) * ru;
      pbox(leftA[0], landingY + i * run, leftA[1], landingY + (i + 1) * run, t2 - 0.2, t2, M.tile, parts.structure);
    }
    pbox(sx0, sy0, sx1, landingY, y0 + H / 2 - 0.2, y0 + H / 2, M.tile, parts.structure);
  }
  // Mur d'échiffre entre les volées (sert aussi de garde-corps)
  pbox(leftA[1], landingY, rightA[0], sy1, bottom, (L - 1) * H + 1.0, M.interior, parts.structure);
  // Garde-corps au dernier niveau, au-dessus de la volée montante
  {
    const yTop = (L - 1) * H;
    pbox(rightA[0], sy1 - 2, rightA[1], sy1 + 2, yTop + 0.95, yTop + 1.0, M.frame, parts.structure);
    for (let x = rightA[0]; x <= rightA[1] - 3; x += fw / 5) {
      pbox(x, sy1 - 1.5, x + 3, sy1 + 1.5, yTop, yTop + 0.95, M.frame, parts.structure);
    }
  }

  // ================================================================ Toiture
  const { pitchDeg, overhang } = PLAN.roof;
  const ov = cm(overhang);
  const tanP = Math.tan(THREE.MathUtils.degToRad(pitchDeg));
  const roofTop = L * H;
  const roof = hipRoof(cm(W) + 2 * ov, cm(D) + 2 * ov, pitchDeg, M.roof, 1.2);
  roof.position.y = roofTop - ov * tanP;
  parts.roof.add(roof);
  const fascia = (w, d, cx, cz, y) => {
    const hw = w / 2, hd = d / 2;
    for (const [a, b, c, e] of [[-hw, -hd, hw, -hd + 0.03], [-hw, hd - 0.03, hw, hd], [-hw, -hd, -hw + 0.03, hd], [hw - 0.03, -hd, hw, hd]]) {
      parts.roof.add(boxMesh(cx + a, y - 0.18, cz + b, cx + c, y, cz + e, M.frame));
    }
  };
  fascia(cm(W) + 2 * ov, cm(D) + 2 * ov, 0, 0, roof.position.y);

  // ====================================== Véranda fermée (2 niveaux, côté avant)
  const ver = PLAN.outdoor.find((o) => o.id === 'veranda').rect;
  const V = PLAN.veranda;
  const [vx0, vy0, vx1, vy1] = ver;
  // soubassement + dalles
  pbox(vx0, vy0, vx1, vy1, buried, -slabT, M.base, parts.structure, 2);
  for (let lvl = 0; lvl < L; lvl++) {
    const y0 = lvl * H;
    pbox(vx0, vy0, vx1, vy1, y0 - slabT, y0, M.slab, parts.structure);
    pbox(vx0 + V.wall, vy0, vx1 - V.wall, vy1 - V.wall, y0, y0 + 0.012, M.tile, parts.floors, 1.2);
  }
  pbox(vx0, vy0, vx1, vy1, L * H - slabT, L * H, M.interior, parts.ceiling);

  // Côtés : [début, fin] le long de l'axe, [e0, e1] épaisseur, horizontal ?
  const vSides = [
    { a: [vx0 + V.wall, vx1 - V.wall], e: [vy1 - V.wall, vy1], horiz: true }, // façade
    { a: [vy0, vy1 - V.wall], e: [vx0, vx0 + V.wall], horiz: false }, // gauche
    { a: [vy0, vy1 - V.wall], e: [vx1 - V.wall, vx1], horiz: false }, // droite
  ];
  const vb = (horiz, a0, a1, e0, e1, h0, h1, mat, target) =>
    horiz ? pbox(a0, e0, a1, e1, h0, h1, mat, target, 2) : pbox(e0, a0, e1, a1, h0, h1, mat, target, 2);
  const sillH = cm(V.sill), glassTop = cm(V.glassTop);
  for (let lvl = 0; lvl < L; lvl++) {
    const y0 = lvl * H;
    for (const s of vSides) {
      const [a0, a1] = s.a, [e0, e1] = s.e, em = (e0 + e1) / 2;
      vb(s.horiz, a0, a1, e0, e1, y0, y0 + sillH, M.facade, parts.structure); // allège
      vb(s.horiz, a0, a1, e0, e1, y0 + glassTop, y0 + H, M.facade, parts.structure); // linteau
      // appui
      const out = s.horiz ? [e1 - 2, e1 + 4] : s.e[0] === vx0 ? [e0 - 4, e0 + 2] : [e1 - 2, e1 + 4];
      vb(s.horiz, a0, a1, out[0], out[1], y0 + sillH - 0.04, y0 + sillH, M.sill, parts.openings);
      // vitrage découpé en panneaux
      const n = Math.ceil((a1 - a0) / V.paneMax);
      const step = (a1 - a0) / n;
      vb(s.horiz, a0, a1, em - 0.6, em + 0.6, y0 + sillH, y0 + glassTop, M.glass, parts.openings);
      vb(s.horiz, a0, a1, em - 3, em + 3, y0 + sillH, y0 + sillH + 0.05, M.frame, parts.openings);
      vb(s.horiz, a0, a1, em - 3, em + 3, y0 + glassTop - 0.05, y0 + glassTop, M.frame, parts.openings);
      for (let k = 0; k <= n; k++) {
        const a = a0 + k * step;
        vb(s.horiz, Math.max(a0, a - 3), Math.min(a1, a + 3), em - 3, em + 3, y0 + sillH, y0 + glassTop, M.frame, parts.openings);
      }
    }
    // poteaux d'angle
    pbox(vx0, vy1 - V.wall, vx0 + V.wall, vy1, y0, y0 + H, M.facade, parts.structure);
    pbox(vx1 - V.wall, vy1 - V.wall, vx1, vy1, y0, y0 + H, M.facade, parts.structure);
  }
  // Toit de la véranda (croupe venant se glisser sous le débord principal)
  {
    const vw = cm(vx1 - vx0) + 2 * ov, vd = cm(vy1 - vy0) + 2 * ov;
    const vr = hipRoof(vw, vd, pitchDeg, M.roof, 1.2);
    const cx = X((vx0 + vx1) / 2), cz = Z((vy0 + vy1) / 2);
    vr.position.set(cx, roofTop - ov * tanP, cz);
    parts.roof.add(vr);
    fascia(vw, vd, cx, cz, vr.position.y);
  }

  // ============================================ Auvent de la porte d'entrée
  {
    const entryWall = PLAN.walls.find((w) => w.openings.some((o) => o.kind === 'entry'));
    const door = entryWall.openings.find((o) => o.kind === 'entry');
    const E = PLAN.entryCanopy;
    const wx = X(entryWall.rect[0]); // face extérieure du mur gauche
    const za = Z(door.from - E.overhangSides), zb = Z(door.to + E.overhangSides);
    const xOut = wx - cm(E.depth);
    const hWall = cm(E.heightAtWall), hFront = cm(E.heightAtFront);
    // poteaux posés sur la dalle d'entrée + poutre de rive
    for (const z of [za + 0.12, zb - 0.12]) {
      parts.outdoor.add(boxMesh(xOut + 0.1, -0.03, z - 0.06, xOut + 0.22, hFront - 0.05, z + 0.06, M.timber));
    }
    parts.outdoor.add(boxMesh(xOut + 0.08, hFront - 0.2, za, xOut + 0.24, hFront - 0.04, zb, M.timber));
    // lambourde fixée au mur
    parts.outdoor.add(boxMesh(wx - 0.12, hWall - 0.2, za, wx, hWall - 0.04, zb, M.timber));
    // toit monopente en tuiles, pente vers l'extérieur
    const run = wx - xOut + 0.15;
    const slope = Math.atan2(hWall - hFront, run);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(run / Math.cos(slope), 0.06, zb - za + 0.2), M.roof);
    roof.position.set((wx + xOut - 0.15) / 2, (hWall + hFront) / 2 + 0.02, (za + zb) / 2);
    roof.rotation.z = slope;
    roof.castShadow = roof.receiveShadow = true;
    parts.outdoor.add(roof);
  }

  // ========================================================= Balcons (arrière)
  const bal = PLAN.outdoor.find((o) => o.id === 'balkon').rect;
  const railH = 1.0;
  // poteaux sous le balcon bas, jusqu'au terrain
  for (const px of [bal[0] + 10, bal[2] - 10]) pbox(px - 10, bal[1] + 2, px + 10, bal[1] + 22, buried, -0.18, M.facade, parts.outdoor);
  for (let lvl = 0; lvl < L; lvl++) {
    const y0 = lvl * H;
    pbox(bal[0], bal[1], bal[2], bal[3], y0 - 0.18, y0, M.slab, parts.outdoor);
    for (const [a, b, c, d] of [
      [bal[0], bal[1], bal[2], bal[1] + 4],
      [bal[0], bal[1], bal[0] + 4, bal[3]],
      [bal[2] - 4, bal[1], bal[2], bal[3]],
    ]) {
      pbox(a, b, c, d, y0 + railH - 0.05, y0 + railH, M.frame, parts.outdoor);
      pbox(a + 0.5, b + 0.5, c - 0.5, d - 0.5, y0 + 0.05, y0 + railH - 0.05, M.glass, parts.outdoor);
    }
  }

  // ================================================================= Outils
  const materials = [...Object.values(M), ...furnitureMats.values(), ...Object.values(kitchenMaterials)];
  group.userData = {
    parts,
    materials,
    levelHeight: H,
    levels: L,
    basementDepth: baseH,
    // Point au sol devant la porte d'entrée (repère local)
    entrancePoint: new THREE.Vector3(X(-60), 0, Z(705)),
    houseRect: { minX: X(0), maxX: X(W), minZ: Z(0), maxZ: Z(D) },
    footprint: { minX: X(0), maxX: X(W), minZ: Z(-200), maxZ: Z(vy1) },
    setClipping(plane) {
      for (const m of materials) {
        m.clippingPlanes = plane ? [plane] : [];
        m.needsUpdate = true;
      }
    },
    showLabels(level) {
      for (const o of parts.labels.children) o.visible = level !== null && o.userData.level === level;
    },
  };
  group.traverse((o) => { if (o.isMesh) o.userData.baseMaterial = o.material; });
  return group;
}

export function totalAreas() {
  const perLevel = PLAN.rooms.reduce((s, r) => s + (r.area ?? 0), 0);
  const outside = PLAN.outdoor.reduce((s, r) => s + (r.area ?? 0), 0);
  return {
    perLevel,
    levels: PLAN.levels,
    inside: perLevel * PLAN.levels,
    outside: outside * PLAN.levels,
    footprint: (PLAN.width * PLAN.depth) / 1e4,
  };
}
