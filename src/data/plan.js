// Plan d'un niveau — transcrit depuis public/reference/plan-etage.jpg
// La maison compte : un sous-sol + 2 niveaux IDENTIQUES (RDC et étage).
//
// Unités : centimètres.
// Repère plan : origine = angle extérieur ARRIÈRE-GAUCHE (côté balcon, à gauche
// quand on regarde la façade), x vers la droite, y vers l'AVANT (côté véranda).
// rect = [x0, y0, x1, y1]
//
// Les cotes lues sur le plan (425, 165, 150, 225, 360, 390, 400, 590, 450, 410,
// 295, 320, 570, 285…) sont respectées ; les positions exactes des fenêtres et
// portes sont estimées d'après la photo du plan et restent à confirmer.

export const PLAN = {
  width: 1050, // hors-tout, façade avant
  depth: 1250, // hors-tout, côté
  levels: 2, // RDC + étage, plan identique
  wallHeight: 300, // hauteur d'étage : dessus de dalle -> dessus de dalle (sous plafond ≈ 275)
  slabThickness: 25,
  roof: { pitchDeg: 30, overhang: 60 },
  basementHeight: 340, // sous-sol (≈ 3,40 m hors sol au point bas de la pente)

  rooms: [
    { id: 'oda1', tr: 'Oda', fr: 'Chambre 1', area: 13.6, rect: [20, 20, 445, 340], floor: 'parquet' },
    { id: 'banyo', tr: 'Banyo', fr: 'Salle de bain', area: 5.25, rect: [460, 20, 625, 340], floor: 'tile' },
    { id: 'edus', tr: 'E. Duş', fr: 'Douche parentale', area: 1.8, rect: [640, 20, 790, 140], floor: 'tile' },
    { id: 'yatak', tr: 'Yatak Odası', fr: 'Chambre parentale', area: 14.6, rect: [640, 20, 1030, 455], floor: 'parquet', labelAt: [835, 300] },
    { id: 'merdiven', tr: 'Merdiven', fr: 'Escalier', rect: [20, 650, 250, 765], floor: 'tile', labelAt: [135, 500] },
    { id: 'antre', tr: 'Antre', fr: "Hall d'entrée", area: 14.25, rect: [265, 355, 625, 765], floor: 'tile' },
    { id: 'oda2', tr: 'Oda', fr: 'Chambre 2', area: 11.6, rect: [640, 470, 1030, 765], floor: 'parquet' },
    { id: 'mutfak', tr: 'Mutfak', fr: 'Cuisine', area: 18.0, rect: [20, 780, 420, 1230], floor: 'tile' },
    { id: 'salon', tr: 'Salon', fr: 'Séjour', area: 26.55, rect: [440, 780, 1030, 1230], floor: 'parquet' },
  ],

  outdoor: [
    { id: 'balkon', tr: 'Balkon', fr: 'Balcon', area: 8.0, rect: [310, -200, 710, 0] },
    { id: 'veranda', tr: 'Verenda', fr: 'Véranda', area: 16.24, rect: [215, 1250, 785, 1535] },
  ],

  // Petit auvent au-dessus de la porte d'entrée (côté gauche, RDC), en cm
  entryCanopy: { depth: 140, overhangSides: 60, heightAtWall: 255, heightAtFront: 232 },

  // Véranda fermée sur les 2 niveaux : allège maçonnée + vitrage tout autour
  veranda: { wall: 20, sill: 100, glassTop: 260, paneMax: 100 },

  // Trémie d'escalier : escalier en U qui descend au sous-sol, et au-dessus
  // un second escalier en U qui monte à l'étage (escaliers superposés)
  stair: { rect: [20, 355, 250, 650], flightWidth: 110 },

  // Ouvertures : from/to = position le long du mur (x pour un mur horizontal,
  // y pour un mur vertical), sill/top = hauteur allège / linteau depuis la dalle.
  // kind : window | door (intérieure) | entry (porte extérieure) | bay (baie vitrée)
  walls: [
    // --- Murs extérieurs (20 cm) ---
    { id: 'arriere', rect: [0, 0, 1050, 20], openings: [
      { from: 80, to: 230, sill: 90, top: 230, kind: 'window' },
      { from: 330, to: 420, sill: 0, top: 220, kind: 'bay' }, // accès balcon
      { from: 505, to: 575, sill: 160, top: 220, kind: 'window' },
      { from: 850, to: 1000, sill: 90, top: 230, kind: 'window' },
    ] },
    { id: 'avant', rect: [0, 1230, 1050, 1250], openings: [
      { from: 90, to: 190, sill: 105, top: 220, kind: 'window' },
      { from: 250, to: 390, sill: 90, top: 225, kind: 'window' },
      { from: 500, to: 760, sill: 0, top: 230, kind: 'bay' }, // P1 -> véranda
      { from: 830, to: 950, sill: 90, top: 225, kind: 'window' },
    ] },
    { id: 'gauche', rect: [0, 20, 20, 1230], openings: [
      // ENTRÉE 100/210 au RDC ; à l'étage l'ouverture devient une fenêtre
      { from: 655, to: 755, sill: 0, top: 210, kind: 'entry', upper: { sill: 90, top: 210, kind: 'window' } },
    ] },
    { id: 'droite', rect: [1030, 20, 1050, 1230], openings: [] },

    // --- Cloisons ---
    { id: 'h-nuit', rect: [20, 340, 625, 355], openings: [
      { from: 350, to: 440, sill: 0, top: 210, kind: 'door' }, // Oda 1
      { from: 480, to: 560, sill: 0, top: 210, kind: 'door' }, // Banyo
    ] },
    { id: 'v-oda-banyo', rect: [445, 20, 460, 340], openings: [] },
    { id: 'v-centre', rect: [625, 20, 640, 765], openings: [
      { from: 365, to: 455, sill: 0, top: 210, kind: 'door' }, // Yatak odası
      { from: 640, to: 730, sill: 0, top: 210, kind: 'door' }, // Oda 2
    ] },
    { id: 'edus-h', rect: [640, 140, 800, 150], openings: [
      { from: 690, to: 760, sill: 0, top: 210, kind: 'door' },
    ] },
    { id: 'edus-v', rect: [790, 20, 800, 140], openings: [] },
    { id: 'h-yatak-oda', rect: [640, 455, 1030, 470], openings: [] },
    { id: 'h-jour', rect: [20, 765, 1030, 780], openings: [
      { from: 320, to: 410, sill: 0, top: 210, kind: 'door' }, // Mutfak
      { from: 450, to: 540, sill: 0, top: 210, kind: 'door' }, // Salon
    ] },
    { id: 'v-escalier', rect: [250, 355, 265, 765], openings: [
      { from: 655, to: 755, sill: 0, top: 210, kind: 'door' }, // 100/210
    ] },
    { id: 'v-mutfak-salon', rect: [420, 780, 440, 1230], openings: [] },
  ],

  // Cuisine (Mutfak, pièce [20, 780, 420, 1230]) — aménagement en L d'après le
  // plan : évier, lave-vaisselle, plaque + four et lave-linge le long du mur
  // extérieur gauche ; réfrigérateur et colonne contre le mur du hall ; table
  // 6-7 couverts au centre. Rectangles [x0, y0, x1, y1] en cm.
  kitchen: {
    worktopHeight: 90,
    // meubles bas : mur gauche (façade vers +x) puis retour contre le mur du hall (façade vers +y)
    runLeft: [20, 780, 82, 1230],
    runTop: [82, 780, 190, 842],
    sink: [20, 850, 82, 940],
    dishwasher: [20, 940, 82, 1000],
    hob: [20, 1090, 82, 1165],
    washer: [20, 1170, 82, 1230],
    // meubles hauts (profondeur 35), interrompus au-dessus de la plaque (hotte)
    wallUnitsLeft: [[20, 842, 55, 1085], [20, 1170, 55, 1230]],
    wallUnitsTop: [[82, 780, 190, 815]],
    fridge: [195, 780, 265, 845],
    pantry: [265, 780, 315, 842],
    table: [278, 965, 358, 1135],
    // chaises : [x, y, orientation du dossier] (0 = dos vers -x, 1 = vers +x, 2 = vers +y)
    chairs: [
      [257, 995, 0], [257, 1050, 0], [257, 1105, 0],
      [379, 995, 1], [379, 1050, 1], [379, 1105, 1],
      [318, 1158, 2],
    ],
    colors: {
      fronts: 0xf1eee8, // laqué blanc cassé
      worktop: 0xb08a5e, // chêne clair
      plinth: 0x4a4a4a,
      splash: 0xe4ddd0,
      chairWood: 0x5b4030,
      chairSeat: 0x9a8f7d,
    },
  },

  // Mobilier indicatif (pour l'échelle) — h en cm
  furniture: [
    // (cuisine : voir `kitchen` ci-dessus)
    // Séjour
    { rect: [620, 800, 900, 890], h: 80, color: 0x7d8a96, name: 'canapé' },
    { rect: [650, 1060, 930, 1150], h: 80, color: 0x7d8a96, name: 'canapé' },
    { rect: [930, 880, 1015, 970], h: 80, color: 0x7d8a96 },
    { rect: [930, 980, 1015, 1070], h: 80, color: 0x7d8a96 },
    { rect: [800, 940, 880, 1000], h: 40, color: 0x8b6a4a, name: 'table basse' },
    { rect: [480, 940, 560, 1130], h: 76, color: 0x8b6a4a, name: 'table à manger' },
    // Chambres
    { rect: [40, 90, 200, 290], h: 50, color: 0xefe9df, name: 'lit' },
    { rect: [840, 240, 1020, 400], h: 50, color: 0xefe9df, name: 'lit' },
    // Salle de bain
    { rect: [460, 20, 625, 95], h: 55, color: 0xf4f4f4, name: 'baignoire' },
    { rect: [460, 170, 515, 240], h: 85, color: 0xf4f4f4, name: 'vasque' },
  ],
};

export const cm = (v) => v / 100;
