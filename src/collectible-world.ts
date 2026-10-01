import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { keepsakes } from './collectibles.ts';

// Each find has its own silhouette. Shared materials and per-item batching keep
// the collection inexpensive while allowing individual finds to disappear.
export function createKeepsakeModel(id: string): THREE.Group {
  const group = new THREE.Group(); group.name = `keepsake-${id}`;
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const brass = '#c49a52', wood = '#836247', paper = '#e4d7b6', blue = '#508f9e', dark = '#424b48';
  const mesh = (geometry: THREE.BufferGeometry, x: number, y: number, z: number, color: string, scale: [number, number, number] = [1, 1, 1]) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: color === brass ? 0.45 : 0 }));
    const part = new THREE.Mesh(geometry, materials.get(color)!); part.position.set(x, y, z); part.scale.set(...scale);
    part.castShadow = part.receiveShadow = true; group.add(part); return part;
  };
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, color = wood) => mesh(new THREE.BoxGeometry(w, h, d), x, y, z, color);
  const ball = (x: number, y: number, z: number, w: number, h: number, d: number, color = brass) => mesh(new THREE.SphereGeometry(1, 12, 8), x, y, z, color, [w, h, d]);
  const cylinder = (x: number, y: number, z: number, r: number, h: number, color = brass, top = r) => mesh(new THREE.CylinderGeometry(top, r, h, 16), x, y, z, color);
  const ring = (x: number, y: number, z: number, r: number, tube = 0.045, color = brass) => {
    const part = mesh(new THREE.TorusGeometry(r, tube, 6, 20), x, y, z, color); part.rotation.x = Math.PI / 2; return part;
  };
  const card = (w = 0.7, d = 0.45) => box(0, 0.04, 0, w, 0.045, d, paper);
  switch (id) {
    case 'ferry-token': cylinder(0, 0.04, 0, 0.28, 0.06); ring(0, 0.08, 0, 0.21, 0.018); box(0, 0.09, 0, 0.22, 0.02, 0.035, dark); break;
    case 'shell':
      ball(0, 0.09, 0, 0.33, 0.09, 0.27, paper);
      for (let i = -3; i <= 3; i++) { const rib = box(i * 0.065, 0.15, 0, 0.025, 0.03, 0.38, '#cba990'); rib.rotation.y = i * 0.12; }
      break;
    case 'boat-cleat': box(0, 0.06, 0, 0.3, 0.12, 0.23); box(0, 0.17, 0, 0.14, 0.2, 0.15); ball(0, 0.3, 0, 0.4, 0.07, 0.09, wood); break;
    case 'bottle': cylinder(0, 0.25, 0, 0.16, 0.5, '#739b80'); cylinder(0, 0.55, 0, 0.07, 0.22, '#739b80'); cylinder(0, 0.69, 0, 0.075, 0.07, wood); break;
    case 'rope': for (let i = 0; i < 4; i++) ring(0, 0.07 + i * 0.06, 0, 0.19 + i * 0.025, 0.035, '#b6a37b'); box(0.2, 0.1, 0.1, 0.35, 0.055, 0.06, '#b6a37b'); break;
    case 'key': ring(-0.2, 0.065, 0, 0.12); box(0.13, 0.065, 0, 0.48, 0.05, 0.065, brass); for (const x of [0.26, 0.36]) box(x, 0.065, 0.09, 0.045, 0.05, 0.15, brass); break;
    case 'ribbon': cylinder(0, 0.08, -0.1, 0.2, 0.06, blue); for (const x of [-0.08, 0.08]) { const tail = box(x, 0.04, 0.2, 0.13, 0.04, 0.4, blue); tail.rotation.y = x; } cylinder(0, 0.12, -0.1, 0.08, 0.025, paper); break;
    case 'thimble': cylinder(0, 0.16, 0, 0.18, 0.28, '#abb4ac', 0.13); ball(0, 0.3, 0, 0.13, 0.07, 0.13, '#abb4ac'); for (let i = 0; i < 8; i++) ball(Math.cos(i) * 0.16, 0.15, Math.sin(i) * 0.16, 0.025, 0.025, 0.025, dark); break;
    case 'button': cylinder(0, 0.05, 0, 0.27, 0.07, blue); for (const x of [-0.065, 0.065]) for (const z of [-0.065, 0.065]) cylinder(x, 0.09, z, 0.026, 0.012, dark); break;
    case 'stamp': box(0, 0.14, 0, 0.45, 0.28, 0.45); for (let i = 0; i < 4; i++) { const stroke = box(-0.14 + i * 0.09, 0.3, 0, 0.04, 0.04, 0.28, dark); stroke.rotation.y = i % 2 ? -0.3 : 0.3; } break;
    case 'spoon': ball(-0.22, 0.05, 0, 0.18, 0.045, 0.13); box(0.16, 0.055, 0, 0.48, 0.04, 0.06, brass); break;
    case 'pottery': { const shard = mesh(new THREE.CylinderGeometry(0.36, 0.3, 0.08, 3), 0, 0.06, 0, blue); shard.rotation.y = 0.3; box(0, 0.11, 0, 0.27, 0.025, 0.035, paper); break; }
    case 'medal': cylinder(0, 0.05, 0.16, 0.2, 0.06); box(0, 0.05, -0.14, 0.15, 0.04, 0.38, '#b06451'); ring(0, 0.085, 0.16, 0.13, 0.018); break;
    case 'postcard': card(); box(-0.12, 0.075, 0, 0.34, 0.02, 0.28, '#729174'); box(0.24, 0.075, -0.12, 0.1, 0.02, 0.1, '#b06451'); break;
    case 'bell': cylinder(0, 0.16, 0, 0.24, 0.3, brass, 0.07); ring(0, 0.025, 0, 0.24, 0.025); ring(0, 0.38, 0, 0.07).rotation.x = 0; break;
    case 'horseshoe': { const shoe = mesh(new THREE.TorusGeometry(0.27, 0.055, 6, 20, Math.PI * 1.55), 0, 0.06, 0, dark); shoe.rotation.x = Math.PI / 2; break; }
    case 'acorn': ball(0, 0.16, 0, 0.17, 0.2, 0.17, wood); ball(0, 0.32, 0, 0.2, 0.08, 0.2, '#a58c5a'); box(0, 0.41, 0, 0.04, 0.12, 0.04); break;
    case 'whistle': box(0, 0.12, 0, 0.3, 0.2, 0.2, brass); box(0.25, 0.14, 0, 0.25, 0.1, 0.13, brass); box(0.12, 0.22, 0, 0.09, 0.02, 0.07, dark); ring(-0.2, 0.11, 0, 0.07); break;
    case 'compass': cylinder(0, 0.09, 0, 0.28, 0.15); cylinder(0, 0.18, 0, 0.23, 0.018, paper); box(0, 0.2, -0.09, 0.04, 0.02, 0.22, '#b06451'); box(0, 0.2, 0.09, 0.04, 0.02, 0.22, dark); break;
    case 'map': card(0.75, 0.5); for (const x of [-0.22, 0, 0.22]) box(x, 0.08, 0, 0.016, 0.02, 0.48, wood); { const trail = box(0.04, 0.09, 0, 0.4, 0.02, 0.025, '#b06451'); trail.rotation.y = -0.5; } break;
    case 'lens': cylinder(0, 0.2, 0, 0.18, 0.36, dark); cylinder(0, 0.4, 0, 0.21, 0.06); cylinder(0, 0.44, 0, 0.16, 0.018, blue); break;
    case 'star-chart': card(0.65, 0.55); box(0, 0.075, 0, 0.59, 0.018, 0.48, '#4b6179'); for (let i = 0; i < 7; i++) ball(Math.sin(i * 7) * 0.23, 0.1, Math.cos(i * 3) * 0.19, 0.025, 0.012, 0.025, paper); break;
    case 'lantern': box(0, 0.07, 0, 0.35, 0.1, 0.3, dark); box(0, 0.3, 0, 0.23, 0.38, 0.2, '#d9bb75'); for (const x of [-0.15, 0.15]) for (const z of [-0.12, 0.12]) box(x, 0.3, z, 0.035, 0.45, 0.035, dark); cylinder(0, 0.54, 0, 0.24, 0.1, dark, 0.08); ring(0, 0.69, 0, 0.1, 0.025, dark).rotation.x = 0; break;
    case 'anchor': box(0, 0.05, 0, 0.055, 0.06, 0.55, brass); box(0, 0.05, -0.07, 0.37, 0.06, 0.05, brass); ring(0, 0.05, -0.32, 0.07, 0.025); for (const side of [-1, 1]) { const fluke = box(side * 0.14, 0.05, 0.2, 0.25, 0.06, 0.055, brass); fluke.rotation.y = side * -0.5; } break;
    case 'feather': ball(0, 0.075, 0, 0.13, 0.025, 0.4, blue); box(0, 0.08, 0.06, 0.018, 0.02, 0.82, paper); for (let i = 0; i < 5; i++) box(0, 0.105, -0.24 + i * 0.1, 0.17, 0.012, 0.018, '#83b6c2'); break;
    case 'binoculars': for (const x of [-0.17, 0.17]) { const barrel = cylinder(x, 0.15, 0, 0.14, 0.5, dark); barrel.rotation.x = Math.PI / 2; const lens = cylinder(x, 0.15, 0.27, 0.11, 0.018, blue); lens.rotation.x = Math.PI / 2; } box(0, 0.15, 0, 0.3, 0.1, 0.12, dark); break;
    case 'rail-spike': box(0, 0.06, 0, 0.12, 0.12, 0.64, dark); box(0, 0.09, -0.32, 0.25, 0.18, 0.12, dark); break;
    case 'ticket': card(0.65, 0.3); for (let i = 0; i < 4; i++) box(-0.13 + i * 0.08, 0.07, 0, 0.03, 0.01, 0.15, '#b06451'); box(0.21, 0.07, 0, 0.025, 0.01, 0.26, dark); break;
    case 'windmill': cylinder(0, 0.25, 0, 0.17, 0.48, paper, 0.1); mesh(new THREE.ConeGeometry(0.17, 0.2, 6), 0, 0.56, 0, wood); for (const angle of [0.65, 0.65 + Math.PI / 2]) { const sail = box(0, 0.4, 0.18, 0.7, 0.075, 0.04, wood); sail.rotation.z = angle; } break;
    case 'grain-scoop': ball(0, 0.07, -0.12, 0.23, 0.07, 0.28, wood); box(0, 0.075, 0.26, 0.08, 0.065, 0.4); ball(0, 0.12, -0.12, 0.17, 0.025, 0.2, '#bca475'); break;
  }
  for (const material of materials.values()) {
    const parts = group.children.filter((part): part is THREE.Mesh => part instanceof THREE.Mesh && part.material === material);
    const geometries = parts.map(part => { part.updateMatrix(); return part.geometry.clone().applyMatrix4(part.matrix); });
    const merged = mergeGeometries(geometries);
    geometries.forEach(geometry => geometry.dispose());
    if (merged) { parts.forEach(part => { group.remove(part); part.geometry.dispose(); }); const part = new THREE.Mesh(merged, material); part.castShadow = part.receiveShadow = true; group.add(part); }
  }
  return group;
}

export function createCollectibleWorld(scene: THREE.Scene, groundHeight: (x: number, z: number) => number) {
  const models = new Map<string, THREE.Group>();
  const glints: THREE.Mesh[] = [];
  const glintGeometry = new THREE.OctahedronGeometry(0.045);
  keepsakes.forEach((item, index) => {
    const model = createKeepsakeModel(item.id);
    model.position.set(item.x, groundHeight(item.x, item.z) + 0.025, item.z);
    model.rotation.y = index * 2.399; scene.add(model); models.set(item.id, model);
    const glint = new THREE.Mesh(glintGeometry, new THREE.MeshBasicMaterial({ color: '#f5d993', transparent: true, depthWrite: false }));
    glint.name = `keepsake-glint-${item.id}`; glint.position.y = 0.8; glint.visible = false; model.add(glint); glints.push(glint);
  });
  return {
    models,
    setFound(found: readonly string[]) { for (const [id, model] of models) model.visible = !found.includes(id); },
    update(time: number, x: number, z: number) {
      keepsakes.forEach((item, index) => {
        const distance = Math.hypot(x - item.x, z - item.z), glint = glints[index];
        glint.visible = distance < 7;
        (glint.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - distance / 7) * (0.35 + 0.25 * Math.sin(time * 2 + index));
        glint.rotation.y = time;
      });
    },
  };
}
