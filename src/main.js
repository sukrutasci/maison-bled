import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { SITE } from './config.js';
import { PLAN } from './data/plan.js';
import { createTerrain, createFarGround, refreshTerrain, rawHeight, terrainHeight, setPlatform, setEarthworks } from './site/terrain.js';
import { createSkyAndLights, createMountains, createSurroundings } from './site/environment.js';
import { createRoad, createParking, parkingLevel, ROAD_TOP } from './site/roadAndParking.js';
import { createPlotBoundary } from './site/plot.js';
import { createFlowerBeds } from './site/garden.js';
import { createExistingHouse } from './buildings/existingHouse.js';
import { createNewHouse, totalAreas } from './buildings/newHouse.js';
import { boxMesh } from './lib/geometry.js';

// ------------------------------------------------------------------ Rendu
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.55;
renderer.localClippingEnabled = true;
app.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
Object.assign(labelRenderer.domElement.style, { position: 'absolute', top: '0', pointerEvents: 'none' });
app.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc4d4df, 150, 900);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 5000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 1;
controls.maxDistance = 250;

// ------------------------------------------------------------------- Site
const { setHour } = createSkyAndLights(scene);
scene.add(createMountains());
const terrain = createTerrain(); // relief naturel (sans terrassement)
scene.add(terrain, createFarGround(), createRoad());
const surroundings = createSurroundings();
scene.add(surroundings);

const existing = createExistingHouse();
scene.add(existing);

// Nouvelle maison : le RDC est calé pour que le sous-sol dépasse de
// `basementExposure` au point le plus bas du terrain naturel sous l'emprise.
const house = createNewHouse();
const { offset, rotationDeg, basementExposure, entranceSlabWidth, flowerBeds } = SITE.newHouse;
house.position.set(offset[0], 0, offset[1]);
house.rotation.y = THREE.MathUtils.degToRad(rotationDeg);
house.updateMatrixWorld();
const hr = house.userData.houseRect, fp = house.userData.footprint;
let lowest = Infinity;
for (let i = 0; i <= 20; i++) {
  for (let j = 0; j <= 20; j++) {
    if (i % 20 && j % 20) continue; // périmètre uniquement
    const p = new THREE.Vector3(
      THREE.MathUtils.lerp(hr.minX, hr.maxX, i / 20), 0, THREE.MathUtils.lerp(hr.minZ, hr.maxZ, j / 20),
    ).applyMatrix4(house.matrixWorld);
    lowest = Math.min(lowest, rawHeight(p.x, p.z));
  }
}
const floorY = lowest + basementExposure;
house.position.y = floorY;
scene.add(house);

// Terrassement : déblai autour, remblai à l'avant et côté entrée, fouille du sous-sol
const entrance = house.userData.entrancePoint.clone().applyMatrix4(house.matrixWorld);
const shift = (r, m = 0) => ({ minX: r.minX + offset[0] + m, maxX: r.maxX + offset[0] - m, minZ: r.minZ + offset[1] + m, maxZ: r.maxZ + offset[1] - m });
const platformLevel = floorY - 0.2;
setPlatform({
  ...shift(fp, -0.3),
  level: platformLevel,
  margin: 2, // plateforme plate autour de la maison (m)
  bankDeg: 45, // pente des talus de raccord (doit rester > pente naturelle)
  fill: { minX: hr.minX + offset[0] - 3.5, maxX: hr.maxX + offset[0] + 1, minZ: entrance.z - 1.5, maxZ: SITE.road.z0 },
  pit: { ...shift(hr, 0.2), level: floorY - house.userData.basementDepth - 0.05 },
  // parking pavé en contrebas : décaissé 1 m au-delà de ses bords (masqués par
  // les bordures), sauf côté entrée voiture où le talus de terre prend le relais
  cuts: [(() => {
    const [x0, z0, x1, z1] = SITE.parking.area;
    return { minX: x0, maxX: x1 + 1, minZ: z0 - 1, maxZ: z1 + 1, level: parkingLevel() - 0.3 };
  })()],
  ramps: [{ ...SITE.parking.dirtRamp, z1: SITE.road.z0, bottom: parkingLevel() - 0.02, top: ROAD_TOP }],
});

// Aménagements extérieurs du projet (calculés sur le terrain terrassé)
const projectSite = new THREE.Group();
projectSite.name = 'amenagements';
setEarthworks(true);
projectSite.add(createParking({ level: platformLevel, slabTop: floorY - 0.03 }));
projectSite.add(createFlowerBeds(flowerBeds, platformLevel));
{
  // dalle béton devant la porte d'entrée, prolongée le long du côté gauche
  // jusqu'au parking à l'avant
  const wallX = hr.minX + offset[0];
  const slab = boxMesh(
    wallX - entranceSlabWidth, platformLevel - 0.3, entrance.z - 0.8,
    wallX, floorY - 0.03, fp.maxZ + offset[1] + 0.3,
    new THREE.MeshStandardMaterial({ color: 0xcdc8be, roughness: 0.95 }), 2,
  );
  projectSite.add(slab);
}
scene.add(projectSite);

// Limites du terrain (croquis)
const plotBoundary = createPlotBoundary(SITE.plot);
scene.add(plotBoundary);

// ------------------------------------------------------ Modes d'affichage
const ghostMat = new THREE.MeshBasicMaterial({ color: 0xff5a3c, transparent: true, opacity: 0.22, depthWrite: false });
const state = { mode: 'projet', roof: true, cut: null, furniture: true, labels: false, env: true, plot: true };
const cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
const P = house.userData.parts;

function apply() {
  const showOld = state.mode !== 'projet';
  const showNew = state.mode !== 'existant';
  existing.visible = showOld;
  house.visible = projectSite.visible = showNew;
  existing.traverse((o) => {
    if (o.isMesh) {
      o.material = state.mode === 'comparaison' ? ghostMat : o.userData.baseMaterial;
      o.castShadow = state.mode !== 'comparaison';
    }
  });
  setEarthworks(showNew);
  refreshTerrain(terrain);
  P.roof.visible = P.ceiling.visible = state.roof;
  P.furniture.visible = state.furniture;
  P.labels.visible = state.labels && showNew;
  house.userData.showLabels(state.cut ?? 0);
  // coupe horizontale à 1,20 m au-dessus du sol du niveau choisi
  cutPlane.constant = floorY + (state.cut ?? 0) * house.userData.levelHeight + 1.2;
  house.userData.setClipping(state.cut === null ? null : cutPlane);
  surroundings.visible = state.env;
  plotBoundary.visible = state.plot;
  plotBoundary.userData.refresh();
}

// ----------------------------------------------------------------- Vues
const C = new THREE.Vector3(offset[0], floorY + 1.5, offset[1]);
const views = {
  facade: [[0, 3, 30], [0, 1.5, 1]],
  entree: [[-20, 3, 16], [-4, 0, 2]],
  droite: [[26, 2, -2], [0, 0, 0]],
  arriere: [[-6, 1, -28], [0, 1, 0]],
  dessus: [[0, 45, 0.5], [0, 0, 0]],
  interieur: [[4.5, 0.1, 5.5], [-0.3, -0.2, 1.5]],
  // Cuisine du RDC : à hauteur d'yeux depuis l'angle côté salon, puis en plongée (coupe)
  cuisine: { pos: [-1.35, 0.1, 5.85], target: [-4.4, -0.35, 2.6], fov: 72, roof: true, cut: null },
  cuisinePlan: { pos: [-0.6, 5.2, 8.6], target: [-3.05, -1.2, 3.85], fov: 50, cut: 0 },
};
let tween = null;
// Une vue : [position, cible] relatives au centre de la maison, ou un objet
// { pos, target, fov, roof, cut } qui règle aussi l'affichage.
function goTo(name) {
  const v = Array.isArray(views[name]) ? { pos: views[name][0], target: views[name][1] } : views[name];
  const pos = C.clone().add(new THREE.Vector3(...v.pos));
  pos.y = Math.max(pos.y, terrainHeight(pos.x, pos.z) + 1.7); // jamais sous le terrain
  const target = C.clone().add(new THREE.Vector3(...v.target));
  tween = { fromP: camera.position.clone(), fromT: controls.target.clone(), toP: pos, toT: target, fromFov: camera.fov, toFov: v.fov ?? 50, t: 0 };
  if (name === 'interieur') v.roof = true;
  if (v.roof !== undefined) { state.roof = v.roof; document.getElementById('opt-roof').checked = v.roof; }
  if (v.cut !== undefined) setCut(v.cut);
  apply();
}
camera.position.copy(C).add(new THREE.Vector3(16, 8, 26));
controls.target.copy(C).add(new THREE.Vector3(0, 1.5, 0));

// --------------------------------------------------------------------- UI
const panel = document.getElementById('panel');
document.getElementById('panel-toggle').onclick = () => panel.classList.toggle('hidden');

document.querySelectorAll('#mode button').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('#mode button').forEach((x) => x.classList.toggle('active', x === b));
    state.mode = b.dataset.mode;
    apply();
  };
});
const bind = (id, key) => {
  const el = document.getElementById(id);
  el.checked = state[key];
  el.onchange = () => { state[key] = el.checked; apply(); };
};
bind('opt-roof', 'roof');
function setCut(level) {
  state.cut = level;
  document.querySelectorAll('#cut button').forEach((x) => x.classList.toggle('active', x.dataset.level === (level === null ? '' : String(level))));
}
document.querySelectorAll('#cut button').forEach((b) => {
  b.onclick = () => {
    setCut(b.dataset.level === '' ? null : Number(b.dataset.level));
    apply();
  };
});
bind('opt-furniture', 'furniture');
bind('opt-labels', 'labels');
bind('opt-env', 'env');
bind('opt-plot', 'plot');

const sun = document.getElementById('sun');
const sunOut = document.getElementById('sun-out');
const setSun = (h) => {
  setHour(h);
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  sunOut.textContent = `${hh}h${String(mm).padStart(2, '0')}`;
};
sun.value = SITE.sunHour;
sun.oninput = () => setSun(parseFloat(sun.value));
setSun(SITE.sunHour);

document.querySelectorAll('#views button, #rooms button').forEach((b) => (b.onclick = () => goTo(b.dataset.view)));

// Tableau des surfaces
const areas = totalAreas();
document.getElementById('areas').innerHTML =
  [...PLAN.rooms, ...PLAN.outdoor]
    .filter((r) => r.area)
    .map((r) => `<tr><td>${r.fr} <span class="tr">${r.tr}</span></td><td>${r.area.toFixed(2)} m²</td></tr>`)
    .join('') +
  `<tr class="total"><td>Pièces, par niveau</td><td>${areas.perLevel.toFixed(2)} m²</td></tr>` +
  `<tr><td>Pièces, ${areas.levels} niveaux</td><td>${areas.inside.toFixed(2)} m²</td></tr>` +
  `<tr><td>Véranda + balcon, ${areas.levels} niveaux</td><td>${areas.outside.toFixed(2)} m²</td></tr>` +
  `<tr><td>Emprise hors-tout</td><td>${areas.footprint.toFixed(2)} m²</td></tr>`;

// Photos de référence
const refs = ['plan-etage.jpg', 'croquis-terrain.jpg', 'existant-facade-avant.jpg', 'existant-angle-droit.jpg', 'existant-arriere.jpg', 'existant-cote-droit.jpg', 'existant-facade-arriere.jpg', 'existant-arriere-droit-route.jpg', 'vue-satellite.webp'];
document.getElementById('refs').innerHTML = refs
  .map((f) => `<a href="reference/${f}" target="_blank" title="${f}"><img src="reference/${f}" alt="${f}" loading="lazy" /></a>`)
  .join('');

apply();

// ------------------------------------------------------------------ Boucle
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});

const compass = document.getElementById('compass-needle');
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  if (tween) {
    tween.t = Math.min(1, tween.t + dt / 1.2);
    const k = 1 - Math.pow(1 - tween.t, 3);
    camera.position.lerpVectors(tween.fromP, tween.toP, k);
    controls.target.lerpVectors(tween.fromT, tween.toT, k);
    camera.fov = THREE.MathUtils.lerp(tween.fromFov, tween.toFov, k);
    camera.updateProjectionMatrix();
    if (tween.t >= 1) tween = null;
  }
  controls.update();
  compass.style.transform = `rotate(${THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()) - SITE.northAngleDeg}deg)`;
  // la caméra orbitale ne passe pas sous le terrain
  const ground = terrainHeight(camera.position.x, camera.position.z) + 0.4;
  if (camera.position.y < ground) camera.position.y = ground;
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
});

// Accès console pour le débogage
Object.assign(window, { scene, camera, controls, renderer, house, existing, goTo, views, state, apply, floorY, terrainHeight, THREE });
