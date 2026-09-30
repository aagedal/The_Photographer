import * as THREE from 'three';
import { sampleSky } from './environment.ts';
import type { Mission } from './missions.ts';
import { defaultStudioRig, lightNames, lightPosition, type StudioRig } from './lighting.ts';

export interface World {
  scene: THREE.Scene; subjects: Map<string, THREE.Object3D>; solids: THREE.Object3D[];
  update: (time: number, settings: { filter: string; shutter: number }) => void;
  setTime: (hour: number) => void;
  setStudioRig: (rig: StudioRig, focus: [number, number, number], controlled: boolean) => void;
  setFlash: (position: [number, number, number], direction: [number, number, number], intensity: number) => void;
  canWalk: (x: number, z: number) => boolean;
}

export function createWorld(): World {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d6ddca');
  scene.fog = new THREE.Fog('#d6ddca', 55, 150);
  const subjects = new Map<string, THREE.Object3D>();
  const solids: THREE.Object3D[] = [];
  const blockers: { x: number; z: number; w: number; d: number }[] = [];
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const material = (color: string) => {
    if (!mats.has(color)) mats.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.88, flatShading: true }));
    return mats.get(color)!;
  };
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: string, parent: THREE.Object3D = scene, solid = false) => {
    const mesh = new THREE.Mesh(cube, material(color));
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d); mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh); if (solid) solids.push(mesh); return mesh;
  };
  const cone = (x: number, y: number, z: number, r: number, h: number, color: string, sides = 5, parent: THREE.Object3D = scene) => {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, sides), material(color));
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const seed = (n: number) => { const a = Math.sin(n * 127.1 + 311.7) * 43758.5453; return a - Math.floor(a); };
  const hemi = new THREE.HemisphereLight('#e6edd4', '#647c56', 2.3); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe4ad', 3.5);
  sun.name = 'sun-light'; sun.position.set(-32, 45, 24); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 130 });
  sun.shadow.bias = -0.001; sun.shadow.normalBias = 0.035;
  scene.add(sun, sun.target);
  const moon = new THREE.DirectionalLight('#a5badd', 0); moon.name = 'moon-light'; scene.add(moon, moon.target);
  const sunDisc = new THREE.Mesh(new THREE.IcosahedronGeometry(2, 1), new THREE.MeshBasicMaterial({ color: '#ffe4ad', fog: false, toneMapped: false }));
  sunDisc.name = 'sun-disc'; scene.add(sunDisc);
  const moonDisc = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 1), new THREE.MeshBasicMaterial({ color: '#d1dcec', fog: false, toneMapped: false }));
  moonDisc.name = 'moon-disc'; scene.add(moonDisc);
  // Twelve boxy clouds, five puffs each, share a single instanced draw call.
  const cloudMaterial = new THREE.MeshBasicMaterial({ color: '#eef3e3', fog: false });
  const clouds = new THREE.InstancedMesh(cube, cloudMaterial, 60); clouds.name = 'clouds'; clouds.frustumCulled = false; scene.add(clouds);
  const cloudDummy = new THREE.Object3D();
  const skyColour = new THREE.Color(), cloudColour = new THREE.Color();
  const nightColour = new THREE.Color('#111d30'), dayColour = new THREE.Color('#bcd8d2'), sunsetColour = new THREE.Color('#e8b38a');
  const skyLightColour = new THREE.Color('#e6edd4'), sunWarmColour = new THREE.Color('#ffad71');
  const darkCloud = new THREE.Color('#293b50'), whiteCloud = new THREE.Color('#eef3e3'), sunsetCloud = new THREE.Color('#edc4a0');
  // Shared primitive geometry keeps the scenery inexpensive and deliberately chunky.
  box(0, -0.65, 0, 110, 1.2, 110, '#88a86c');
  box(0, -2.2, 0, 111, 2.2, 111, '#a99778');
  box(0, -0.01, 16, 90, 0.08, 3.2, '#c3b694');
  box(15, 0, -11, 3.6, 0.08, 56, '#c3b694');
  box(-22, 0, 25, 29, 0.09, 3, '#c3b694');
  box(-4, 0, -25, 2.5, 0.08, 25, '#b0a686');
  // A turquoise lake, a shoreline made from simple blocks, and a wooden jetty.
  const waterMat = new THREE.MeshPhysicalMaterial({ color: '#659a90', metalness: 0.25, roughness: 0.25, transparent: true, opacity: 0.94 });
  const water = new THREE.Mesh(new THREE.BoxGeometry(28, 0.12, 23), waterMat);
  water.position.set(-7, 0.05, -3); water.receiveShadow = true; scene.add(water);
  blockers.push({ x: -7, z: -3, w: 28, d: 23 });
  box(-7, 0.04, 9.2, 30, 0.2, 0.9, '#bdbe97');
  box(-21.4, 0.02, -3, 0.7, 0.15, 24, '#bdbe97');
  box(7.4, 0.02, -3, 0.7, 0.15, 24, '#bdbe97');
  box(0, 0.34, 8, 3.2, 0.3, 10, '#a17c52');
  for (let i = 0; i < 15; i++) box(0, 0.51, 3.5 + i * 0.64, 3.2, 0.06, 0.09, '#755a42');
  for (const x of [-1.6, 1.6]) for (const z of [3.6, 8, 12]) box(x, 0.5, z, 0.2, 1.6, 0.2, '#795b3e');
  const ripples = new THREE.Group(); scene.add(ripples);
  for (let i = 0; i < 30; i++) {
    const ripple = box(-19 + seed(i) * 24, 0.13, -13 + seed(i + 52) * 21, 0.7 + seed(i + 7) * 2, 0.014, 0.04, '#b3cabe', ripples);
    ripple.castShadow = false;
  }
  // Low-poly mountains create a layered skyline without texture maps.
  for (let i = 0; i < 14; i++) {
    const x = -100 + i * 15;
    const h = 20 + seed(i + 24) * 27;
    const mountain = cone(x, h / 2 - 2, -80 - seed(i) * 14, 21, h, i % 2 ? '#93aaa0' : '#829d91', 5);
    mountain.castShadow = false;
    const cap = cone(x, h - 5, mountain.position.z, 5.4, 10, '#d2d9c7', 5); cap.castShadow = false;
  }
  // Trees are instanced: hundreds of silhouettes, only three draw calls.
  const treeCount = 150;
  const trunks = new THREE.InstancedMesh(cube, material('#766345'), treeCount);
  const crowns = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 5), material('#456950'), treeCount);
  const tips = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 5), material('#5c8057'), treeCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < treeCount; i++) {
    let x: number, z: number;
    if (i < 100) { x = -50 + seed(i + 900) * 100; z = -35 - seed(i + 102) * 25; }
    else { x = i % 2 ? -37 - seed(i) * 14 : 42 + seed(i) * 10; z = -25 + seed(i + 92) * 72; }
    const size = 0.8 + seed(i + 13) * 1.3;
    dummy.position.set(x, size * 1.5, z); dummy.scale.set(0.35 * size, 3 * size, 0.35 * size); dummy.rotation.y = 0; dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.y = size * 3.5; dummy.scale.set(1.7 * size, 4.3 * size, 1.7 * size); dummy.rotation.y = seed(i) * 6; dummy.updateMatrix(); crowns.setMatrixAt(i, dummy.matrix);
    dummy.position.y = size * 5.2; dummy.scale.set(1.2 * size, 3 * size, 1.2 * size); dummy.updateMatrix(); tips.setMatrixAt(i, dummy.matrix);
  }
  for (const m of [trunks, crowns, tips]) { m.castShadow = true; m.receiveShadow = true; scene.add(m); }
  // Broadleaf trees by the lake and in the wedding garden.
  for (const [x, z, s] of [[-17, 13, 1.2], [9, 11, 1.1], [-28, 18, 1], [-32, 30, 1.3], [-15, 31, 0.9], [20, -8, 0.8], [-15, -21, 1.2]]) {
    box(x, 2.2 * s, z, 0.65 * s, 4.4 * s, 0.65 * s, '#776249');
    const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(3 * s, 0), material('#77935c'));
    foliage.position.set(x, 5 * s, z); foliage.castShadow = true; scene.add(foliage);
    const second = new THREE.Mesh(new THREE.IcosahedronGeometry(2.5 * s, 0), material('#94a968'));
    second.position.set(x - 1.6 * s, 5.1 * s, z); second.castShadow = true; scene.add(second);
  }
  // Far shoreline houses.
  const house = (x: number, z: number, w: number, h: number, d: number, color: string) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    box(0, h / 2, 0, w, h, d, color, g, true);
    const roof = cone(0, h + 0.8, 0, 1, 2, '#926952', 4, g); roof.rotation.y = Math.PI / 4; roof.scale.set(w / 1.3, 1, d / 1.3);
    box(-w * 0.22, h * 0.6, d / 2 + 0.02, w * 0.22, h * 0.25, 0.07, '#bdd4cb', g);
    box(w * 0.22, h * 0.6, d / 2 + 0.02, w * 0.22, h * 0.25, 0.07, '#bdd4cb', g);
    box(0, h * 0.25, d / 2 + 0.03, 0.9, h / 2, 0.08, '#69795d', g);
    blockers.push({ x, z, w, d }); return g;
  };
  house(4, -22, 6, 4.5, 5, '#e4ceb0'); house(-19, -25, 5, 3.5, 5, '#ceb195');
  house(22, -36, 6, 5, 5, '#c6c8b0'); house(40, -14, 6, 4, 6, '#d4baa0');
  // Lighthouse is the first assignment's unmistakable landmark.
  const lighthouse = new THREE.Group(); lighthouse.position.set(-7, 0, -17); scene.add(lighthouse);
  box(0, 0.3, 0, 5, 0.6, 5, '#b0a48a', lighthouse);
  box(0, 3.8, 0, 2.8, 7, 2.8, '#f0e6c9', lighthouse);
  box(0, 4, 0, 2.84, 1.2, 2.84, '#b77157', lighthouse);
  box(0, 7.7, 0, 3.6, 0.35, 3.6, '#5f7163', lighthouse);
  box(0, 8.6, 0, 2.4, 1.5, 2.4, '#b9d2bf', lighthouse);
  cone(0, 10, 0, 2.2, 1.5, '#b57353', 4, lighthouse).rotation.y = Math.PI / 4;
  box(0, 1, 1.43, 0.7, 1.6, 0.1, '#657a65', lighthouse);
  const beacon = new THREE.PointLight('#ffcb70', 5, 12); beacon.position.set(0, 8.5, 0); lighthouse.add(beacon);
  const lighthouseTarget = new THREE.Object3D(); lighthouseTarget.position.set(0, 4.2, 0); lighthouse.add(lighthouseTarget); subjects.set('Lighthouse', lighthouseTarget);
  blockers.push({ x: -7, z: -17, w: 3, d: 3 });
  // Waterfall, angular rocks, and drifting streaks.
  const rock = (x: number, y: number, z: number, scale: number) => {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(scale, 0), material('#8c9380'));
    m.position.set(x, y, z); m.rotation.set(seed(x) * 2, seed(z) * 3, 0.2); m.castShadow = true; m.receiveShadow = true; scene.add(m); solids.push(m); return m;
  };
  rock(-24, 1.1, -10.5, 2.3);
  for (let i = 0; i < 8; i++) rock(i % 2 ? -27 : -21, 0.5 + seed(i) * 0.5, -12 + i * 0.9, 0.8 + seed(i + 89) * 0.7);
  box(-24, 0.06, -4, 4.5, 0.13, 10, '#709d94');
  const waterfall = box(-24, 2, -8, 2.3, 3.8, 0.28, '#bcddd2'); waterfall.castShadow = false; subjects.set('Waterfall', waterfall);
  const streaks: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) { const m = box(-24.9 + i * 0.26, seed(i) * 4, -7.83, 0.06, 0.6, 0.03, '#e4eee0'); m.castShadow = false; streaks.push(m); }
  // Benches, reeds, flowers, boulders, and paths give the world human scale.
  const bench = (x: number, z: number, rotation = 0) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotation; scene.add(g);
    box(0, 0.7, 0, 2.4, 0.15, 0.7, '#967d53', g); box(0, 1.1, -0.3, 2.4, 0.65, 0.1, '#967d53', g);
    for (const a of [-0.85, 0.85]) box(a, 0.35, 0, 0.15, 0.7, 0.55, '#536153', g);
  };
  bench(5, 12, -0.25); bench(-10, 12); bench(19, 16, Math.PI);
  for (let i = 0; i < 20; i++) {
    const x = -20 + seed(i + 202) * 25, z = 10.2 + seed(i + 58) * 1.2;
    box(x, 0.3, z, 0.05, 0.6, 0.05, '#687e48'); box(x, 0.65, z, 0.12, 0.3, 0.12, '#ad9763');
  }
  for (let i = 0; i < 10; i++) rock(-35 + seed(i + 700) * 70, 0.25, 40 + seed(i + 96) * 8, 0.45 + seed(i) * 0.7);
  const person = (x: number, z: number, shirt: string, parent: THREE.Object3D = scene) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
    box(0, 1.05, 0, 0.55, 0.7, 0.35, shirt, g);
    box(0, 1.65, 0, 0.38, 0.43, 0.37, '#dbb693', g);
    box(0, 1.86, -0.02, 0.42, 0.1, 0.38, '#675344', g);
    const legs = [-0.16, 0.16].map(a => box(a, 0.35, 0, 0.19, 0.7, 0.23, '#465659', g));
    for (const a of [-0.39, 0.39]) box(a, 1.02, 0, 0.18, 0.65, 0.23, shirt, g);
    for (const a of [-0.16, 0.16]) box(a, 0.07, 0.1, 0.23, 0.14, 0.36, '#eddec6', g);
    const focus = new THREE.Object3D(); focus.position.y = 1.35; g.add(focus);
    return { group: g, focus, legs };
  };
  // Sports: a moving subject on a visible terracotta running track.
  box(29, 0.04, 5, 20, 0.13, 17, '#be8865'); box(29, 0.13, 5, 13, 0.04, 10, '#92a26c');
  for (const x of [20.5, 21.2, 36.8, 37.5]) box(x, 0.15, 5, 0.07, 0.02, 16, '#e1c9a4');
  for (const z of [-2.5, -1.8, 11.8, 12.5]) box(29, 0.15, z, 18, 0.02, 0.07, '#e1c9a4');
  const runner = person(27, 7, '#d68456'); subjects.set('Runner', runner.focus);
  bench(38, 16, Math.PI); box(35, 0.8, 16, 0.1, 1.6, 0.1, '#697855'); box(35, 1.7, 16, 2.7, 0.7, 0.15, '#e0d4b1');
  // Bakery is open at the front, with a simulated reflective window.
  box(13, 2, -17, 9, 4, 0.4, '#dbc3a5', scene, true);
  box(8.5, 2, -14, 0.4, 4, 6, '#dbc3a5', scene, true); box(17.5, 2, -14, 0.4, 4, 6, '#dbc3a5', scene, true);
  box(13, 4.2, -14, 9.5, 0.5, 6.5, '#93775b'); box(13, 0.05, -14, 9, 0.1, 6, '#bba789');
  box(13, 1, -13.5, 6, 1, 0.8, '#a58861');
  const baker = person(13, -14.6, '#ede0bc'); subjects.set('Baker', baker.focus);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: '#c9e1d3', roughness: 0.1, metalness: 0.45, transparent: true, opacity: 0.42, side: THREE.DoubleSide });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 3.5), glassMat); glass.position.set(13, 2, -10.95); scene.add(glass);
  for (const x of [8.6, 13, 17.4]) box(x, 2, -10.85, 0.09, 4, 0.1, '#657963');
  box(13, 3.8, -10.85, 9, 0.1, 0.1, '#657963');
  const reporter = person(8, -7, '#718b86'); subjects.set('Reporter', reporter.focus);
  box(8.45, 1.15, -6.85, 0.13, 0.38, 0.13, '#394d45');
  // Wedding garden: arch, flower beds, couple, and guests at different depths.
  for (const x of [-27, -23]) box(x, 2.2, 25, 0.24, 4.4, 0.24, '#e3d7bb');
  box(-25, 4.3, 25, 4.3, 0.24, 0.3, '#e3d7bb');
  for (let i = 0; i < 12; i++) box(-27 + i * 0.36, 4.55 + Math.sin(i) * 0.13, 25, 0.25, 0.25, 0.35, i % 2 ? '#cfab95' : '#eee2c7');
  const coupleA = person(-25.55, 25, '#eee7d7'); person(-24.65, 25, '#526e69');
  const coupleFocus = new THREE.Object3D(); coupleFocus.position.set(-25, 1.35, 25); scene.add(coupleFocus); subjects.set('Newlyweds', coupleFocus); coupleA.group.rotation.y = 0.2;
  for (let i = 0; i < 5; i++) person(-22 + i, 25 + (i % 2) * 0.8, ['#b99d85', '#818e70', '#d5c4a3', '#8c9d9a', '#c88c72'][i]);
  const guests = new THREE.Object3D(); guests.position.set(-20, 1.3, 25.4); scene.add(guests); subjects.set('Wedding guests', guests);
  for (let i = 0; i < 18; i++) {
    const x = -32 + seed(i + 4) * 4, z = 22 + seed(i + 203) * 10;
    box(x, 0.18, z, 0.09, 0.36, 0.09, '#6b8650'); box(x, 0.4, z, 0.24, 0.2, 0.24, i % 2 ? '#d6a494' : '#ead6a7');
  }
  // Open-front studio with a seamless backdrop and movable lighting equipment.
  box(30, 2.5, -29, 12, 5, 0.4, '#d7d0b9', scene, true);
  box(24, 2.5, -26, 0.4, 5, 6, '#d7d0b9', scene, true); box(36, 2.5, -26, 0.4, 5, 6, '#d7d0b9', scene, true);
  box(30, 0.05, -25, 12, 0.1, 8, '#c7bea7');
  box(29, 2.3, -28.7, 8, 4.3, 0.08, '#aaad92');
  const maker = person(28, -26, '#b78568'); subjects.set('Pottery maker', maker.focus);
  box(32, 0.6, -26, 1.1, 1.2, 1.1, '#e2d8be');
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.75, 8), material('#b47759')); vase.position.set(32, 1.55, -26); vase.castShadow = true; scene.add(vase); subjects.set('Terracotta vase', vase);
  const studioLights = lightNames.map(name => {
    const equipment = new THREE.Group(); equipment.name = `studio-${name}-equipment`; scene.add(equipment);
    const stand = box(0, 1.4, 0, 0.06, 2.8, 0.06, '#546458', equipment);
    box(0, 0.08, 0, 0.65, 0.07, 0.08, '#546458', equipment);
    const head = box(0, 2.8, 0, 0.9, 0.9, 0.18, '#f1e8d3', equipment);
    head.castShadow = false;
    // Shared scene materials are immutable; each lamp gets its own emissive face.
    head.material = new THREE.MeshStandardMaterial({color:'#f1e8d3',emissive:'#fff2d8',emissiveIntensity:0.4,roughness:0.7});
    const light = new THREE.SpotLight('#fff2d8', 0, 0, Math.PI / 3, 0.7, 2);
    light.name = `studio-${name}`; light.castShadow = true; light.shadow.mapSize.set(512, 512);
    light.shadow.bias = -0.001; light.shadow.normalBias = 0.04;
    scene.add(light, light.target);
    return { name, equipment, stand, head, light };
  });
  const cameraFlash = new THREE.SpotLight('#fff2df', 0, 0, Math.PI / 3, 0.65, 2);
  cameraFlash.name = 'camera-flash'; cameraFlash.castShadow = true; cameraFlash.shadow.mapSize.set(512, 512);
  cameraFlash.shadow.bias = -0.001; cameraFlash.shadow.normalBias = 0.025; cameraFlash.visible = false;
  scene.add(cameraFlash, cameraFlash.target);
  // Direction signs and park lamp posts.
  for (const [x, z] of [[-4, 15], [17, 14], [-16, 25], [-4, -26]]) {
    box(x, 1.2, z, 0.16, 2.4, 0.16, '#766246'); box(x + 0.5, 2.1, z, 1.8, 0.55, 0.15, '#eee0bb');
  }
  for (const [x, z] of [[10, 14], [17, -5], [-17, 17]]) {
    box(x, 1.6, z, 0.1, 3.2, 0.1, '#566958'); box(x, 3.3, z, 0.5, 0.5, 0.5, '#e8d6a4');
    const lamp = new THREE.PointLight('#ffce81', 3, 10); lamp.position.set(x, 3.2, z); scene.add(lamp);
  }
  // Stars fade in with the night everywhere in town.
  const vertices: number[] = [];
  for (let i = 0; i < 700; i++) { const a = seed(i + 3) * Math.PI * 2, b = seed(i + 97) * Math.PI * 0.43; vertices.push(Math.cos(a) * Math.cos(b) * 120, Math.sin(b) * 120 + 10, Math.sin(a) * Math.cos(b) * 120); }
  const starsGeo = new THREE.BufferGeometry(); starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: '#fff4d9', size: 0.35, sizeAttenuation: true, fog: false, transparent: true, depthWrite: false })); stars.name = 'night-stars'; stars.visible = false; scene.add(stars);
  const nightFocus = new THREE.Object3D(); nightFocus.position.set(-4, 22, -42); scene.add(nightFocus); subjects.set('Night sky', nightFocus);
  let sky = sampleSky(17);
  let studioMode = false;
  const applyEnvironment = () => {
    hemi.intensity = studioMode ? 0.25 : 0.18 + sky.daylight * 2.12;
    hemi.color.set('#889fc5').lerp(skyLightColour, sky.daylight);
    sun.intensity = sky.sunStrength * (studioMode ? 0.25 : 3.5);
    sun.color.set('#ffe4ad').lerp(sunWarmColour, sky.warmth);
    moon.intensity = sky.night * (studioMode ? 0.03 : 0.22);
    sun.position.set(...sky.sunPosition); moon.position.copy(sun.position).multiplyScalar(-1);
    sunDisc.position.copy(sun.position); moonDisc.position.copy(moon.position);
    sunDisc.visible = sky.elevation > -0.03; moonDisc.visible = sky.elevation < 0.03;
    skyColour.copy(nightColour).lerp(dayColour, sky.daylight).lerp(sunsetColour, sky.warmth * 0.65);
    (scene.background as THREE.Color).copy(skyColour);
    (scene.fog as THREE.Fog).color.copy(skyColour); (scene.fog as THREE.Fog).near = 38 + sky.daylight * 17;
    stars.rotation.y = sky.hour / 24 * Math.PI * 2; stars.visible = sky.night > 0.01; (stars.material as THREE.PointsMaterial).opacity = sky.night * (1 - sky.cloudCover * 0.45);
    cloudColour.copy(darkCloud).lerp(whiteCloud, sky.daylight).lerp(sunsetCloud, sky.warmth * 0.6);
    cloudMaterial.color.copy(cloudColour);
    for (let i = 0; i < 60; i++) {
      const cluster = Math.floor(i / 5), puff = i % 5;
      const drift = ((seed(cluster + 500) * 300 + sky.hour * 12.5) % 300) - 150;
      cloudDummy.position.set(drift + (puff - 2) * 3.5, 38 + seed(cluster + 501) * 16 + seed(i + 520) * 2, -110 + seed(cluster + 502) * 220);
      cloudDummy.scale.set((6 + seed(i + 510) * 5) * (0.75 + sky.cloudCover), 1.5 + seed(i + 511) * 2.5, 4 + seed(i + 512) * 4);
      cloudDummy.updateMatrix(); clouds.setMatrixAt(i, cloudDummy.matrix);
    }
    clouds.instanceMatrix.needsUpdate = true;
  };
  const setStudioRig = (rig: StudioRig, focus: [number, number, number], controlled: boolean) => {
    studioMode = controlled; applyEnvironment();
    for (const item of studioLights) {
      const config = rig[item.name];
      const [x, y, z] = lightPosition(config, focus);
      item.equipment.position.set(x, 0, z);
      item.stand.position.y = y / 2; item.stand.scale.y = y;
      item.head.position.y = y; item.head.lookAt(...focus);
      item.light.position.set(x, y, z); item.light.target.position.set(...focus);
      item.light.intensity = config.enabled ? config.power * 65 : 0;
      const colour = config.colour === 'warm' ? '#ffc283' : config.colour === 'cool' ? '#b2ceff' : '#fff2df';
      item.light.color.set(colour);
      const face = item.head.material as THREE.MeshStandardMaterial;
      face.emissive.set(colour); face.emissiveIntensity = config.enabled ? config.power * 0.5 : 0;
    }
  };
  setStudioRig(defaultStudioRig(), [28, 1.35, -26], false);
  return {
    scene, subjects, solids,
    setTime(hour) { sky = sampleSky(hour); applyEnvironment(); },
    setStudioRig,
    setFlash(position, direction, intensity) {
      cameraFlash.visible = intensity > 0; cameraFlash.intensity = intensity;
      cameraFlash.position.set(position[0], position[1] + 0.18, position[2]);
      cameraFlash.target.position.set(position[0] + direction[0] * 10, position[1] + 0.18 + direction[1] * 10, position[2] + direction[2] * 10);
    },
    update(time, settings) {
      runner.group.position.set(29 + Math.sin(time * 0.9) * 6, 0, 5 + Math.cos(time * 0.9) * 5);
      runner.group.rotation.y = time * 0.9 + Math.PI / 2;
      runner.legs[0].rotation.x = Math.sin(time * 9) * 0.5; runner.legs[1].rotation.x = -Math.sin(time * 9) * 0.5;
      ripples.children.forEach((m, i) => { m.position.x += Math.sin(time + i) * 0.0008; m.scale.z = 0.03 + Math.sin(time * 1.5 + i) * 0.01; });
      streaks.forEach((s, i) => { s.position.y = 3.8 - ((time * 2 + i * 0.5) % 3.8); s.scale.y = settings.shutter >= 0.25 ? 2.5 : 0.6; });
      glassMat.opacity = settings.filter === 'cpl' ? 0.08 : 0.42;
    },
    canWalk(x, z) {
      if (Math.abs(x) > 51 || Math.abs(z) > 51) return false;
      // The jetty is a narrow walkable exception inside the lake boundary.
      return !blockers.some(b => Math.abs(x - b.x) < b.w / 2 + 0.25 && Math.abs(z - b.z) < b.d / 2 + 0.25 && !(b.w === 28 && Math.abs(x) < 1.25 && z > 3.5));
    },
  };
}

export function subjectPosition(world: World, mission: Mission): THREE.Vector3 {
  return world.subjects.get(mission.subject)?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3(...mission.position);
}
