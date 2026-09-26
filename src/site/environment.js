import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { terrainHeight, rawHeight } from './terrain.js';
import { SITE } from '../config.js';
import { seededRandom, walnut, fruitTree, conifer, bushes } from './vegetation.js';

// ---------------------------------------------------------------- Ciel & soleil
export function createSkyAndLights(scene) {
  const sky = new Sky();
  sky.scale.setScalar(4000);
  const u = sky.material.uniforms;
  u.turbidity.value = 3;
  u.rayleigh.value = 1.2;
  u.mieCoefficient.value = 0.004;
  u.mieDirectionalG.value = 0.8;
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x5a5238, 0.9);
  scene.add(hemi);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35)); // éclaire un peu les intérieurs

  const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const s = 32;
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 200 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  const sunVec = new THREE.Vector3();
  // Course du soleil simplifiée (lever ~6h à l'est, coucher ~20h à l'ouest),
  // calée sur le nord du croquis (SITE.northAngleDeg).
  function setHour(hour) {
    const t = (hour - 6) / 14; // 0 -> 1
    const azimuth = THREE.MathUtils.lerp(-100, 100, t); // degrés, 0 = sud
    const elevation = Math.max(-5, Math.sin(Math.PI * t) * 62);
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    // Face à la façade on regarde le nord : l'est (matin) est donc à droite (+X).
    sunVec.setFromSphericalCoords(1, phi, THREE.MathUtils.degToRad(-azimuth));
    // orientation réelle : le nord est tourné de northAngleDeg vers −x
    sunVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(SITE.northAngleDeg));
    u.sunPosition.value.copy(sunVec);
    sun.position.copy(sunVec).multiplyScalar(80);
    const k = THREE.MathUtils.smoothstep(elevation, -2, 12);
    sun.intensity = 2.8 * k;
    sun.color.setHSL(0.09, 0.8, THREE.MathUtils.lerp(0.62, 0.93, k));
    hemi.intensity = 0.35 + 0.65 * k;
  }
  return { sky, sun, hemi, setHour };
}

// ----------------------------------------------------------- Montagnes lointaines
export function createMountains() {
  const segs = 256;
  const geo = new THREE.CylinderGeometry(520, 620, 1, segs, 6, true);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
    const a = Math.atan2(z, x);
    const top = y > 0;
    const hgt = 45 + 22 * Math.sin(a * 3 + 1) + 14 * Math.sin(a * 7.3) + 7 * Math.sin(a * 17.1) + 3 * Math.sin(a * 41);
    const g = rawHeight(x, z); // les montagnes suivent la pente générale
    pos.setY(i, top ? g + hgt : g - 40);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: 0x5a7872, roughness: 1, side: THREE.BackSide, flatShading: true, fog: true });
  const m = new THREE.Mesh(geo, mat);
  m.name = 'montagnes';
  return m;
}

// ------------------------------------------------------------------ Environnement
// Composé d'après les photos : noyers autour de la cour, rangs de noisetiers et
// fruitiers sur la pente, crête boisée en amont, réseau électrique le long de
// la route, minaret au loin (visible depuis l'arrière de la maison).
export function createSurroundings() {
  const group = new THREE.Group();
  group.name = 'environnement';
  const rand = seededRandom(7);
  const { z0: rz0, width: rw } = SITE.road;
  const rz1 = rz0 + rw;
  // zones à laisser libres : terrain (maison, jardin, parking) + route
  const blocked = (x, z) => (x > -13 && x < 9 && z > -19 && z < rz1 + 1) || (z > rz0 - 1.5 && z < rz1 + 2.5);

  // Grands noyers (photos arrière et angle : gros arbres autour de la cour)
  for (const [x, z, s] of [[-13, -9, 1.2], [13, -11, 1.1], [-15, 7, 1.0], [17, 2, 1.15], [9, -21, 1.0], [-22, -22, 1.2], [26, -16, 1.1]]) {
    group.add(walnut(x, z, s, rand));
  }
  // Verger en contrebas, à l'arrière
  for (let i = 0; i < 14; i++) {
    const x = -4 + (i % 7) * 5 + (rand() - 0.5) * 1.5, z = -26 - Math.floor(i / 7) * 5 + (rand() - 0.5) * 1.5;
    if (!blocked(x, z)) group.add(fruitTree(x, z, 0.9 + rand() * 0.3, rand));
  }
  // Conifères épars (photo façade, à droite)
  for (const [x, z] of [[20, 9], [-24, -4], [30, -30], [-34, 12]]) group.add(conifer(x, z, 1 + rand() * 0.3, rand));

  // Noisetiers en rangs sur la pente (arrière gauche), buissons en lisière
  const bushPts = [];
  for (let row = 0; row < 6; row++) {
    for (let k = 0; k < 9; k++) {
      const x = -48 + k * 3.2 + (rand() - 0.5), z = -14 - row * 3.5 + (rand() - 0.5);
      if (!blocked(x, z)) bushPts.push([x, z, 1.1]);
    }
  }
  for (let i = 0; i < 160; i++) {
    const a = rand() * Math.PI * 2, r = 12 + rand() * 60;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!blocked(x, z)) bushPts.push([x, z, 0.5 + rand() * 0.5]);
  }
  group.add(bushes(bushPts, rand));

  // Crête boisée en amont (ligne d'arbres sur l'horizon, photo angle droit)
  for (let x = -85; x <= 85; x += 5 + rand() * 3) group.add(walnut(x, 52 + (rand() - 0.5) * 6, 0.9 + rand() * 0.3, rand));
  // Bois épars plus loin
  for (let i = 0; i < 90; i++) {
    const a = rand() * Math.PI * 2, r = 35 + rand() * 50;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (blocked(x, z)) continue;
    const t = rand();
    group.add(t < 0.25 ? conifer(x, z, 0.9 + rand() * 0.5, rand) : t < 0.6 ? fruitTree(x, z, 1 + rand() * 0.4, rand) : walnut(x, z, 0.8 + rand() * 0.4, rand));
  }

  group.add(createPowerLine(rz1));
  group.add(createMinaret(-24, 78));
  group.add(createFence());
  return group;
}

// Pylône en treillis + poteaux béton le long du bord amont de la route, câbles
function createPowerLine(roadEdge) {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xb9bdc0, roughness: 0.5, metalness: 0.6 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0xc4c0b8, roughness: 0.9 });
  const cableMat = new THREE.LineBasicMaterial({ color: 0x222222 });
  const z = roadEdge + 1.2;
  const tops = [];

  for (let x = -84; x <= 84; x += 32) {
    const y = terrainHeight(x, z);
    if (Math.abs(x + 20) < 1) {
      // pylône en treillis (photo depuis l'arrière droit)
      const H = 11, b0 = 0.6, b1 = 0.2;
      const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      for (let i = 0; i < 4; i++) {
        const [a, c] = pts[i];
        const p0 = new THREE.Vector3(x + a * b0, y, z + c * b0), p1 = new THREE.Vector3(x + a * b1, y + H, z + c * b1);
        g.add(bar(p0, p1, 0.05, steel));
        const [a2, c2] = pts[(i + 1) % 4];
        for (let k = 0; k < 6; k++) {
          const t0 = k / 6, t1 = (k + 1) / 6;
          const w0 = THREE.MathUtils.lerp(b0, b1, t0), w1 = THREE.MathUtils.lerp(b0, b1, t1);
          g.add(bar(new THREE.Vector3(x + a * w0, y + H * t0, z + c * w0), new THREE.Vector3(x + a2 * w1, y + H * t1, z + c2 * w1), 0.025, steel));
        }
      }
      g.add(bar(new THREE.Vector3(x - 1.2, y + H - 0.5, z), new THREE.Vector3(x + 1.2, y + H - 0.5, z), 0.05, steel));
      tops.push(new THREE.Vector3(x, y + H - 0.5, z));
    } else {
      g.add(bar(new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + 8, z), 0.12, concrete));
      g.add(bar(new THREE.Vector3(x - 0.8, y + 7.6, z), new THREE.Vector3(x + 0.8, y + 7.6, z), 0.06, concrete));
      tops.push(new THREE.Vector3(x, y + 7.6, z));
    }
  }
  tops.sort((a, b) => a.x - b.x);
  // 3 câbles avec flèche
  for (const dz of [-0.7, 0, 0.7]) {
    for (let i = 1; i < tops.length; i++) {
      const a = tops[i - 1].clone(), b = tops[i].clone();
      a.z += dz; b.z += dz;
      const pts = [];
      for (let k = 0; k <= 16; k++) {
        const t = k / 16;
        const p = a.clone().lerp(b, t);
        p.y -= Math.sin(Math.PI * t) * 0.9;
        pts.push(p);
      }
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cableMat));
    }
  }
  return g;
}

function bar(a, b, r, mat) {
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  m.castShadow = true;
  return m;
}

// Minaret de la mosquée du village (photo arrière)
function createMinaret(x, z) {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf1efe8, roughness: 0.7 });
  const lead = new THREE.MeshStandardMaterial({ color: 0x9aa3a8, roughness: 0.4, metalness: 0.6 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 24, 12), white);
  shaft.position.y = 12;
  const balcony = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.4, 0.8, 12), white);
  balcony.position.y = 18;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 4, 12), white);
  top.position.y = 26;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.0, 6, 12), lead);
  cone.position.y = 31;
  for (const m of [shaft, balcony, top, cone]) { m.castShadow = true; g.add(m); }
  g.position.set(x, terrainHeight(x, z) - 1, z);
  return g;
}

// Clôture en rondins sur le côté droit (photos façade et angle droit)
function createFence() {
  const g = new THREE.Group();
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x6d5a45, roughness: 1 });
  const pts = [[12, 12], [13.5, 8], [14.5, 4], [15, 0], [15.2, -4]];
  pts.forEach(([x, z], i) => {
    const y = terrainHeight(x, z);
    g.add(bar(new THREE.Vector3(x, y - 0.2, z), new THREE.Vector3(x, y + 1.5, z), 0.09, fenceMat));
    if (i > 0) {
      const [x0, z0] = pts[i - 1];
      const y0 = terrainHeight(x0, z0);
      for (const hh of [0.6, 1.2]) g.add(bar(new THREE.Vector3(x0, y0 + hh, z0), new THREE.Vector3(x, y + hh, z), 0.05, fenceMat));
    }
  });
  return g;
}
