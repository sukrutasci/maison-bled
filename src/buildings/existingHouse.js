import * as THREE from 'three';
import { SITE } from '../config.js';
import { boxMesh, hipRoof } from '../lib/geometry.js';
import { weatheredWood, roofTiles, plaster, stone } from '../lib/textures.js';
import { terrainHeight } from '../site/terrain.js';

// Maison traditionnelle en bois (état actuel, à démolir), d'après les photos :
// - soubassement maçonné enduit blanc à gauche avec une fenêtre à barreaux,
// - partie droite ouverte sur pilotis (sol en pente),
// - étage en planches horizontales, 2 fenêtres + porte en façade,
// - toit à quatre pans en tuiles, cheminée maçonnée à l'angle avant-gauche,
// - rampe en planches pour accéder à la porte.
export function createExistingHouse() {
  const { width: W, depth: D, groundFloorHeight: G, upperHeight: U } = SITE.existing;
  const hw = W / 2, hd = D / 2;
  const group = new THREE.Group();
  group.name = 'maison-existante';

  const wood = new THREE.MeshStandardMaterial({ map: weatheredWood(), roughness: 1 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x3b2c20, roughness: 1 });
  const white = new THREE.MeshStandardMaterial({ map: plaster('#e9e6df'), roughness: 1 });
  const stoneMat = new THREE.MeshStandardMaterial({ map: stone(), roughness: 1 });
  const tiles = new THREE.MeshStandardMaterial({ map: roofTiles(), color: 0xc98a6a, roughness: 0.9, side: THREE.DoubleSide });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1d2328, roughness: 0.2, metalness: 0.3 });
  const tarp = new THREE.MeshStandardMaterial({ color: 0x1e5bb8, roughness: 0.7, side: THREE.DoubleSide });

  // Plancher de l'étage calé ~1,9 m au-dessus du sol devant la façade
  const floorY = terrainHeight(-1, hd + 1) + G;
  group.position.y = floorY;
  const deep = -G - 8; // fondations enterrées dans la pente

  // Soubassement maçonné (moitié gauche) + mur de pierre arrière
  group.add(boxMesh(-hw, deep, -hd, -0.3, 0, hd, white, 2));
  group.add(boxMesh(-0.3, deep, -hd, hw, -G + 0.2, -hd + 0.5, stoneMat, 2));
  // fenêtre à barreaux
  group.add(boxMesh(-3.1, -1.25, hd - 0.02, -2.1, -0.45, hd + 0.02, glass));
  for (let i = 0; i < 6; i++) {
    const x = -3.05 + i * 0.18;
    group.add(boxMesh(x, -1.25, hd + 0.02, x + 0.025, -0.45, hd + 0.05, woodDark));
  }

  // Pilotis (partie droite) sur piles de pierres
  for (const [x, z] of [[1.4, hd - 0.2], [hw - 0.2, hd - 0.2], [hw - 0.2, 0], [hw - 0.2, -hd + 0.3], [1.4, -1]]) {
    group.add(boxMesh(x - 0.1, deep, z - 0.1, x + 0.1, 0, z + 0.1, woodDark));
    const pile = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), stoneMat);
    pile.position.set(x, terrainHeight(x, z) - floorY + 0.1, z);
    pile.scale.y = 0.6;
    group.add(pile);
  }
  // Rondins empilés à l'angle arrière-droit (photo côté droit)
  group.add(boxMesh(hw - 1.4, deep, -hd, hw, 0, -hd + 0.5, wood, 1.5));
  // Planches + bâche bleue sous la porte
  group.add(boxMesh(-0.3, -G, hd - 0.1, 0.4, 0, hd, wood));
  const t = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.6), tarp);
  t.position.set(0.9, -1.0, hd + 0.05);
  t.rotation.x = 0.08;
  group.add(t);

  // Plancher + étage en bois (léger débord)
  group.add(boxMesh(-hw - 0.1, -0.2, -hd - 0.1, hw + 0.1, 0, hd + 0.1, woodDark));
  group.add(boxMesh(-hw, 0, -hd, hw, U, hd, wood, 1.6));
  // poteaux d'ossature apparents
  for (const x of [-hw, -1.6, -0.7, 1.4, 1.9, hw]) {
    group.add(boxMesh(x - 0.08, 0, hd - 0.02, x + 0.08, U, hd + 0.06, woodDark));
  }
  for (const z of [-hd, -1.2, 1.8, hd]) {
    group.add(boxMesh(hw - 0.02, 0, z - 0.08, hw + 0.06, U, z + 0.08, woodDark));
  }

  // Ouvertures de l'étage
  const win = (x0, x1, y0, y1, face) => {
    if (face === 'front') {
      group.add(boxMesh(x0 - 0.06, y0 - 0.06, hd, x1 + 0.06, y1 + 0.06, hd + 0.05, woodDark));
      group.add(boxMesh(x0, y0, hd + 0.04, x1, y1, hd + 0.07, glass));
      group.add(boxMesh((x0 + x1) / 2 - 0.02, y0, hd + 0.07, (x0 + x1) / 2 + 0.02, y1, hd + 0.09, woodDark));
    } else {
      group.add(boxMesh(hw, y0 - 0.06, x0 - 0.06, hw + 0.05, y1 + 0.06, x1 + 0.06, woodDark));
      group.add(boxMesh(hw + 0.04, y0, x0, hw + 0.07, y1, x1, glass));
    }
  };
  win(-2.9, -2.1, 1.0, 1.85, 'front');
  win(2.6, 3.3, 1.0, 1.85, 'front');
  win(1.2, 2.2, 1.0, 1.9, 'side');
  win(-2.8, -1.8, 1.0, 1.9, 'side');
  // porte
  group.add(boxMesh(-0.6, 0, hd, 0.3, 2.05, hd + 0.08, new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 1 })));

  // Rampe en planches jusqu'à la porte
  // la rampe descend de la porte jusqu'au sol (qui remonte vers l'avant)
  const run = 2.4;
  const drop = Math.max(0.3, floorY - terrainHeight(0.55 + run * Math.sin(0.35), hd + run * Math.cos(0.35)));
  const rampLen = Math.hypot(drop, run);
  const rampPivot = new THREE.Group();
  rampPivot.position.set(0.55, 0, hd + 0.05);
  const board = boxMesh(-0.55, -0.05, 0, 0.55, 0.05, rampLen, wood);
  rampPivot.add(board);
  rampPivot.rotation.set(Math.atan2(drop, run), 0.35, 0, 'YXZ');
  group.add(rampPivot);

  // Toit à croupes
  const roof = hipRoof(W + 1.0, D + 1.0, 32, tiles, 1.1);
  roof.position.y = U;
  group.add(roof);
  group.add(boxMesh(-hw - 0.5, U - 0.12, -hd - 0.5, hw + 0.5, U, hd + 0.5, woodDark));

  // Cheminée à l'angle avant-gauche
  group.add(boxMesh(-hw - 0.75, deep, hd - 1.2, -hw, U + 1.6, hd - 0.45, white, 2));
  group.add(boxMesh(-hw - 0.85, U + 1.6, hd - 1.3, -hw + 0.1, U + 1.75, hd - 0.35, white));

  // Repère pour la bascule de matériaux (mode comparaison)
  group.traverse((o) => { if (o.isMesh) o.userData.baseMaterial = o.material; });
  return group;
}
