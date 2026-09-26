import * as THREE from 'three';
import { terrainHeight } from './terrain.js';

// Limites du terrain : ruban rouge posé sur le sol + piquets aux sommets.
// userData.refresh() recale les hauteurs après un changement de terrassement.
export function createPlotBoundary(polygon) {
  const g = new THREE.Group();
  g.name = 'limites-terrain';
  const width = 0.15;

  // points échantillonnés tous les 0,5 m le long du contour fermé
  const pts = [];
  for (let i = 0; i < polygon.length; i++) {
    const [x0, z0] = polygon[i], [x1, z1] = polygon[(i + 1) % polygon.length];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.5));
    for (let k = 0; k < n; k++) pts.push([x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n]);
  }
  pts.push(pts[0]);

  const pos = new Float32Array(pts.length * 2 * 3);
  const idx = [];
  const offsets = pts.map(([x, z], i) => {
    const [xa, za] = pts[Math.max(0, i - 1)], [xb, zb] = pts[Math.min(pts.length - 1, i + 1)];
    const d = new THREE.Vector2(xb - xa, zb - za).normalize();
    return [-d.y * width / 2, d.x * width / 2];
  });
  for (let i = 0; i < pts.length - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const ribbon = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color: 0xe0301e, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4,
  }));
  g.add(ribbon);

  const stakeMat = new THREE.MeshStandardMaterial({ color: 0xe0301e, roughness: 0.6 });
  const stakes = polygon.map(([x, z]) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), stakeMat);
    s.userData.xz = [x, z];
    s.castShadow = true;
    g.add(s);
    return s;
  });

  g.userData.refresh = () => {
    pts.forEach(([x, z], i) => {
      const [ox, oz] = offsets[i];
      pos.set([x + ox, terrainHeight(x + ox, z + oz) + 0.05, z + oz, x - ox, terrainHeight(x - ox, z - oz) + 0.05, z - oz], i * 6);
    });
    geo.attributes.position.needsUpdate = true;
    geo.computeBoundingSphere();
    for (const s of stakes) {
      const [x, z] = s.userData.xz;
      s.position.set(x, terrainHeight(x, z) + 0.5, z);
    }
  };
  g.userData.refresh();
  return g;
}
