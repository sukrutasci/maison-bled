// Paramètres du site — à ajuster au fur et à mesure des relevés.
//
// Repère monde (mètres) : origine = centre de l'emprise de la maison,
// +Z = vers l'AVANT (façade véranda), +X = vers la DROITE quand on fait face
// à la façade, +Y = haut.

export const SITE = {
  terrainSize: 180,
  terrainResolution: 180,

  // Pente linéaire de 15°. Devant la maison, la cour et la route forment un
  // replat (niveau 0) : le terrain descend à 15° vers l'arrière à partir de
  // `benchStartZ`, et remonte à 15° au-delà de la route.
  slopeDeg: 15,
  slopeX: 0, // dévers latéral éventuel, m par m (+ = monte vers la droite)
  // début du replat : calé pour que le RDC reste de plain-pied avec le parking
  // tout en ayant le sous-sol à 3,40 m hors sol à l'arrière
  benchStartZ: 5.5,

  // Route parallèle à la façade, à 10 m de la véranda (façade véranda z = 9,10)
  road: { z0: 19.1, width: 4.5 }, // route de village en béton (photo arrière droit)

  // Terrain (tracé rouge du croquis Google Maps, public/reference/croquis-terrain.jpg),
  // polygone [x, z] en mètres. Le côté route est en z = road.z0.
  plot: [[-7.0, -17.6], [5.75, -17.9], [7.25, 19.1], [-11.25, 19.1], [-9.75, 3.7], [-8.25, -2.4]],

  // Nord : la boussole du croquis indique le nord à ~26° à gauche de l'axe
  // arrière de la maison (−z) ; la façade véranda regarde donc vers le SSE.
  northAngleDeg: 26,

  // Parking en contrebas de la route (le RDC est au niveau de la route).
  // Rectangles [x0, z0, x1, z1] en mètres.
  parking: {
    dropFromRoad: 1.0, // parking ≈ 1 m sous la route, mur béton côté route
    area: [-4.5, 10.6, 6.0, 19.1], // partie pavée (places)
    entrance: [-10.0, -4.0], // ouverture sur la route (en bleu sur le croquis)
    // entrée voiture « terrain vague » : talus de terre de la route jusqu'au
    // niveau du parking (plat en dessous de flatUntilZ), bords irréguliers
    dirtRamp: { x0: -10.0, x1: -4.5, z0: 10.6, flatUntilZ: 12.5, soft: 2.2 },
    // deux places parallèles à la route, l'une derrière l'autre
    spaces: [[0.5, 12.3, 5.6, 14.8], [0.5, 15.9, 5.6, 18.4]],
    steps: [-6.75, -5.25], // escalier du parking vers la dalle d'entrée
  },

  // Muret béton autour de la maison (prolonge ceux du parking), suit la pente
  houseWall: [[-7.0, 9.3], [-7.0, -9.0], [5.9, -9.0], [5.9, 9.1]],



  // Nouvelle maison
  newHouse: {
    offset: [0, 0], // décalage (x, z) par rapport à l'ancienne emprise
    rotationDeg: 0,
    // Hauteur du sous-sol hors sol au point le plus bas de la pente :
    // cale l'altitude du RDC.
    basementExposure: 3.4,
    // Dalle béton le long du côté gauche, de la porte d'entrée jusqu'à l'avant
    entranceSlabWidth: 1.5,
    // Massifs de rosiers de part et d'autre de la véranda, au pied de la
    // façade avant : [x0, z0, x1, z1] en mètres (repère monde)
    flowerBeds: [[-5.15, 6.35, -3.2, 9.3], [2.7, 6.35, 5.15, 9.3]],
  },

  // Maison existante (bois, à démolir) — emprise estimée ~9 × 8 m
  existing: {
    width: 9.0,
    depth: 8.0,
    groundFloorHeight: 1.9, // soubassement maçonné / pilotis
    upperHeight: 2.5,
  },

  sunHour: 17.5, // les photos ont été prises en fin d'après-midi
};
