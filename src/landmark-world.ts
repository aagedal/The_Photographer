import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { regionalLandmarks } from './landmarks.ts';
import { terrainHeight, terrainSurfaceHeight } from './terrain.ts';

export function createRegionalLandmarks(scene: THREE.Scene, solids: THREE.Object3D[], subjects: Map<string, THREE.Object3D>) {
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const mat = (color: string) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
    return materials.get(color)!;
  };
  const mesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, color: string, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geometry, mat(color)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  };
  const box = (p: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: string) => mesh(p, new THREE.BoxGeometry(w, h, d), color, x, y, z);
  const cylinder = (p: THREE.Object3D, y: number, top: number, bottom: number, h: number, color: string) => mesh(p, new THREE.CylinderGeometry(top, bottom, h, 20), color, 0, y);
  const groups = regionalLandmarks.map(place => {
    const g = new THREE.Group(); g.name = `landmark-${place.id}`; g.position.set(place.x, terrainHeight(place.x, place.z), place.z); scene.add(g);
    const focus = new THREE.Object3D();
    const dx = place.viewpoint[0] - place.x, dz = place.viewpoint[1] - place.z, length = Math.hypot(dx, dz);
    const radius = place.id === 'sea-light' ? 4.4 : place.id === 'observatory' ? 8.9 : place.id === 'windmill' ? 5.4 : 3.5;
    focus.position.set(place.id === 'viaduct' ? 0 : dx / length * radius, place.id === 'viaduct' ? 21 : place.height * 0.47, place.id === 'viaduct' ? 3.5 : dz / length * radius); g.add(focus); subjects.set(place.name, focus);
    return g;
  });
  const light = groups[0];
  cylinder(light, 0.1, 6.5, 7, 1.2, '#a49983');
  cylinder(light, 12, 3.4, 5, 24, '#e9ddbd');
  cylinder(light, 17, 3.96, 4.1, 3.2, '#a66650');
  cylinder(light, 24.6, 5.1, 5.1, 0.6, '#60716b');
  cylinder(light, 27, 3.2, 3.2, 4.2, '#94b7b3');
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    box(light, Math.sin(a) * 3.24, 27, Math.cos(a) * 3.24, 0.18, 4.4, 0.18, '#52645b');
    box(light, Math.sin(a) * 4.8, 25.4, Math.cos(a) * 4.8, 0.12, 1.5, 0.12, '#52645b');
  }
  const rail = mesh(light, new THREE.TorusGeometry(4.8, 0.1, 5, 32), '#52645b', 0, 26.1); rail.rotation.x = Math.PI / 2;
  cylinder(light, 30, 0, 4.2, 3, '#8e5c48');
  box(light, 0, 2, 4.83, 1.6, 3.8, 0.15, '#49685f');
  for (const y of [6, 11, 21]) box(light, 0, y, 4.1 - y * 0.03, 0.7, 1.2, 0.15, '#83aaa8');
  const lampMaterial = new THREE.MeshStandardMaterial({ color: '#ffe2a1', emissive: '#ffd98a', emissiveIntensity: 2 });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), lampMaterial); lamp.position.y = 27; light.add(lamp);
  box(light, -9, 2, 0, 7, 4, 6, '#d8c8a8');
  const keeperRoof = box(light, -9, 4.5, 0, 7.8, 0.35, 7, '#68776a'); keeperRoof.rotation.z = 0.12;
  for (const x of [-11, -7]) box(light, x, 2.3, 3.04, 1.2, 1.4, 0.12, '#98b9b0');

  const observatory = groups[1];
  // The mountain falls away beneath the building's edges. Extend each footing
  // into the actual rendered terrain instead of resting it on the summit height.
  const footingBottom = (x: number, z: number, w: number, d: number, radius?: number) => {
    let lowest = Infinity;
    const sample = (dx: number, dz: number) => {
      lowest = Math.min(lowest, terrainSurfaceHeight(observatory.position.x + x + dx, observatory.position.z + z + dz));
    };
    for (let ix = 0; ix <= Math.ceil(w * 2); ix++) for (let iz = 0; iz <= Math.ceil(d * 2); iz++) {
      const dx = -w / 2 + ix * w / Math.ceil(w * 2), dz = -d / 2 + iz * d / Math.ceil(d * 2);
      if (radius === undefined || Math.hypot(dx, dz) <= radius) sample(dx, dz);
    }
    if (radius !== undefined) for (let i = 0; i < 144; i++) {
      const angle = i / 144 * Math.PI * 2; sample(Math.sin(angle) * radius, Math.cos(angle) * radius);
    }
    return lowest - observatory.position.y - 0.25;
  };
  const baseBottom = footingBottom(0, 0, 23, 23, 11.5);
  const base = cylinder(observatory, (2 + baseBottom) / 2, 11, 11.5, 2 - baseBottom, '#948b78');
  base.name = 'observatory-foundation';
  cylinder(observatory, 6, 8, 8.6, 10, '#cfccbc');
  cylinder(observatory, 10.9, 9, 9, 0.6, '#71868a');
  const dome = mesh(observatory, new THREE.SphereGeometry(8.7, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), '#abbfbe', 0, 11.2);
  // A dark observation slit follows the dome, rather than reading as a featureless ball.
  const slit = mesh(observatory, new THREE.SphereGeometry(8.77, 6, 12, -0.14, 0.28, 0, Math.PI / 2), '#344b52', 0, 11.2); slit.rotation.y = 0.35;
  for (let i = 0; i < 12; i++) {
    const rib = mesh(observatory, new THREE.TorusGeometry(8.72, 0.05, 4, 36, Math.PI / 2), '#71868a', 0, 11.2);
    rib.rotation.y = i / 12 * Math.PI * 2;
  }
  box(observatory, 0, 2.6, 8.65, 2.8, 5.2, 0.2, '#4f6a6c');
  for (const x of [-5.4, 5.4]) box(observatory, x, 6, 6.5, 1.7, 2.4, 0.15, '#8dacad');
  box(observatory, 13, 2.4, 0, 9, 4.8, 7, '#c3b9a0');
  const annexBottom = footingBottom(13, 0, 9, 7);
  const annexBase = box(observatory, 13, (0.25 + annexBottom) / 2, 0, 9, 0.25 - annexBottom, 7, '#948b78');
  annexBase.name = 'observatory-annex-foundation';
  box(observatory, 13, 5, 0, 9.6, 0.3, 7.6, '#677b78');
  for (let i = 0; i < 5; i++) {
    const z = 12 - i * 0.6, top = 0.375 + i * 0.16, bottom = footingBottom(0, z, 4, 0.65);
    const step = box(observatory, 0, (top + bottom) / 2, z, 4, top - bottom, 0.65, '#a79c84');
    step.name = `observatory-step-${i}`;
  }
  dome.name = 'observatory-dome';

  const viaduct = groups[2]; viaduct.scale.x = 0.8;
  // Extruded masonry with true open arches: the valley remains visible through the bridge.
  const bridge = new THREE.Shape(); bridge.moveTo(-52, -6); bridge.lineTo(52, -6); bridge.lineTo(52, 24); bridge.lineTo(-52, 24); bridge.closePath();
  for (let i = 0; i < 5; i++) {
    const x = -40 + i * 20, hole = new THREE.Path();
    hole.moveTo(x - 7.6, -6); hole.lineTo(x - 7.6, 10);
    hole.absarc(x, 10, 7.6, Math.PI, 0, true); hole.lineTo(x + 7.6, -6); hole.closePath(); bridge.holes.push(hole);
  }
  mesh(viaduct, new THREE.ExtrudeGeometry(bridge, { depth: 6, bevelEnabled: false, curveSegments: 16 }).translate(0, 0, -3), '#aa9982');
  box(viaduct, 0, 24.1, 0, 106, 0.4, 7.4, '#807966');
  for (const z of [-3.6, 3.6]) box(viaduct, 0, 25, z, 106, 1.5, 0.5, '#bcb097');
  for (let i = 0; i < 5; i++) {
    const x = -40 + i * 20;
    for (let j = 0; j < 13; j++) {
      const a = j / 12 * Math.PI;
      const stone = box(viaduct, x + Math.cos(a) * 8.1, 10 + Math.sin(a) * 8.1, 3.12, 1.7, 1.1, 0.35, j % 2 ? '#c6b69a' : '#bbaa8e'); stone.rotation.z = a - Math.PI / 2;
    }
  }
  for (let i = 0; i < 48; i++) box(viaduct, -50 + i * 2.1, 24.37, 0, 0.22, 0.12, 2.6, '#705f49');
  for (const z of [-0.85, 0.85]) box(viaduct, 0, 24.55, z, 104, 0.16, 0.13, '#535e59');

  const windmill = groups[3];
  cylinder(windmill, 1, 7, 7.5, 2, '#978972');
  cylinder(windmill, 8, 4, 6, 16, '#cfb48c');
  cylinder(windmill, 17.5, 0, 6, 5, '#685a4b');
  for (const y of [5, 10]) box(windmill, 0, y, 5.9 - y * 0.1, 1, 1.6, 0.15, '#638a87');
  box(windmill, 0, 2, 5.8, 1.8, 3.5, 0.18, '#61745e');
  const sails = new THREE.Group(); sails.name = 'briar-windmill-sails'; sails.position.set(0, 15, 5.5); windmill.add(sails);
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2; sails.add(arm);
    box(arm, 0, 5.5, 0, 0.25, 11, 0.22, '#74634c');
    box(arm, 0.95, 7.5, 0.08, 1.9, 6.8, 0.14, '#e4d6b6');
    for (let j = 0; j < 8; j++) box(arm, 0.95, 4.3 + j * 0.88, 0.18, 2.15, 0.07, 0.08, '#8f7958');
  }
  const hub = mesh(sails, new THREE.CylinderGeometry(0.7, 0.7, 0.6, 12), '#7c6650'); hub.rotation.x = Math.PI / 2;
  box(windmill, 10, 1.6, -1, 7, 3.2, 5, '#ddc9a3'); box(windmill, 10, 3.5, -1, 7.8, 0.4, 5.8, '#8e7053');

  const blockers = [
    { x: -184, z: 73, w: 10, d: 10 }, { x: -193, z: 73, w: 7, d: 6 },
    { x: -143, z: -183, w: 18, d: 18 }, { x: -130, z: -183, w: 9, d: 7 },
    { x: 181, z: 33, w: 12, d: 12 }, { x: 191, z: 32, w: 7, d: 5 },
    ...Array.from({ length: 6 }, (_, i) => ({ x: 120 + i * 16, z: -126, w: 4.16, d: 7 })),
  ];
  // Material batches preserve the silhouettes without hundreds of extra draw calls.
  const batch = (parent: THREE.Object3D) => {
    const buckets = new Map<THREE.Material, THREE.Mesh[]>();
    parent.children.forEach(c => {
      if (!(c instanceof THREE.Mesh) || Array.isArray(c.material)) return;
      // Preserve named footing geometry so grounding checks inspect its actual base.
      if (c.name.startsWith('observatory-') && c !== dome) { solids.push(c); return; }
      const b = buckets.get(c.material) ?? []; b.push(c); buckets.set(c.material, b);
    });
    for (const [material, meshes] of buckets) {
      const parts = meshes.map(m => { m.updateMatrix(); return (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrix); });
      const combined = mergeGeometries(parts); parts.forEach(g => g.dispose());
      if (!combined) continue;
      const m = new THREE.Mesh(combined, material); m.castShadow = m.receiveShadow = true; parent.add(m);
      meshes.forEach(original => { parent.remove(original); original.geometry.dispose(); }); solids.push(m);
    }
  };
  groups.forEach(batch);
  // Sails are animated as one assembly, and never obstruct the public viewing path.
  sails.children.filter(c => c instanceof THREE.Group).forEach(batch);
  regionalLandmarks.forEach(place => {
    const [x, z] = place.entrance, y = terrainHeight(x, z);
    const board = new THREE.Group(); board.name = `history-${place.id}`; scene.add(board);
    box(board, x + 1.6, y + 0.75, z, 0.13, 1.5, 0.13, '#7e7158');
    box(board, x + 1.6, y + 1.55, z, 2.2, 0.95, 0.13, '#e1d4b4');
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 320;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#e1d4b4'; ctx.fillRect(0, 0, 768, 320); ctx.fillStyle = '#3d594b'; ctx.textAlign = 'center';
      ctx.font = '36px Georgia'; ctx.fillText(place.name, 384, 94); ctx.font = '26px Georgia'; ctx.fillText('Arthur’s four horizons', 384, 169); ctx.fillText('R · Read the local history', 384, 236);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.15, 0.9), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })); sign.position.set(x + 1.6, y + 1.55, z + 0.08); board.add(sign);
    }
    batch(board);
  });
  return {
    blocksWalking: (x: number, z: number) => blockers.some(b => Math.abs(x - b.x) < b.w / 2 + 0.25 && Math.abs(z - b.z) < b.d / 2 + 0.25),
    update(time: number) { sails.rotation.z = Math.sin(time * 0.012) * 0.06 + time * 0.045; const phase = ((time % 8) + 8) % 8;
      lampMaterial.emissiveIntensity = 1.2 + [0.4, 1.4, 2.4].reduce((sum, pulse) => sum + Math.exp(-(((phase - pulse) / 0.18) ** 2)) * 3, 0); },
  };
}
