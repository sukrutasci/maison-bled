import * as THREE from 'three';

// UV projetées selon l'axe dominant de la normale : la texture garde la même
// échelle réelle (1 répétition = `scale` mètres) quelle que soit la taille.
export function worldUV(geometry, scale = 1, offset = new THREE.Vector3()) {
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + offset.x, y = pos.getY(i) + offset.y, z = pos.getZ(i) + offset.z;
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = x; v = z; }
    else if (ax >= az) { u = z; v = y; }
    else { u = x; v = y; }
    uv[i * 2] = u / scale;
    uv[i * 2 + 1] = v / scale;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}

// Boîte définie par ses bornes (mètres), UV à l'échelle réelle.
export function boxMesh(x0, y0, z0, x1, y1, z1, material, uvScale = 1) {
  const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0), d = Math.abs(z1 - z0);
  const geo = new THREE.BoxGeometry(w, h, d);
  const c = new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  worldUV(geo, uvScale, c);
  const m = new THREE.Mesh(geo, material);
  m.position.copy(c);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// Toit à quatre pans (croupe) centré en (0,0), base à y=0.
// width = selon X, depth = selon Z (débords inclus).
export function hipRoofGeometry(width, depth, pitchDeg) {
  const t = Math.tan(THREE.MathUtils.degToRad(pitchDeg));
  const hw = width / 2, hd = depth / 2;
  const alongZ = depth >= width; // faîtage parallèle au plus grand côté
  const run = Math.min(hw, hd);
  const h = run * t;
  const r = alongZ ? [0, h, -(hd - run), 0, h, hd - run] : [-(hw - run), h, 0, hw - run, h, 0];
  const R1 = new THREE.Vector3(r[0], r[1], r[2]);
  const R2 = new THREE.Vector3(r[3], r[4], r[5]);
  const A = new THREE.Vector3(-hw, 0, -hd); // arrière-gauche
  const B = new THREE.Vector3(hw, 0, -hd);  // arrière-droit
  const C = new THREE.Vector3(hw, 0, hd);   // avant-droit
  const D = new THREE.Vector3(-hw, 0, hd);  // avant-gauche

  // R1 côté arrière (z-) / gauche (x-), R2 côté avant / droit
  const faces = alongZ
    ? [[D, C, R2], [C, B, R1, R2], [B, A, R1], [A, D, R2, R1]]
    : [[D, C, R2, R1], [C, B, R2], [B, A, R1, R2], [A, D, R1]];

  const positions = [], uvs = [];
  const cos = Math.cos(THREE.MathUtils.degToRad(pitchDeg));
  for (const f of faces) {
    const e0 = f[0], e1 = f[1];
    const tan = new THREE.Vector3().subVectors(e1, e0).normalize();
    const inward = new THREE.Vector3(tan.z, 0, -tan.x); // perpendiculaire horizontale vers l'intérieur
    const uvOf = (p) => {
      const d = new THREE.Vector3().subVectors(p, e0);
      return [d.dot(tan), (d.x * inward.x + d.z * inward.z) / cos];
    };
    const tris = f.length === 3 ? [[0, 1, 2]] : [[0, 1, 2], [0, 2, 3]];
    for (const tri of tris) {
      for (const k of tri) {
        const p = f[k];
        positions.push(p.x, p.y, p.z);
        uvs.push(...uvOf(p));
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return { geometry: geo, height: h };
}

export function hipRoof(width, depth, pitchDeg, material, uvScale = 1.2) {
  const { geometry, height } = hipRoofGeometry(width, depth, pitchDeg);
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / uvScale, uv.getY(i) / uvScale);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.userData.height = height;
  return mesh;
}
