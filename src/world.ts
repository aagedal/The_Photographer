import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { createWaterSurface, createFishSchool, isolateReflections } from './water.ts';
import { createWaterfall } from './waterfall.ts';
import { creekDistance } from './creek.ts';
import { WORLD_HALF, TERRAIN_SEGMENTS, TERRAIN_SURFACE_OFFSET, coastline, terrainHeight, trails, distanceToTrail } from './terrain.ts';
import { treeRootHeight } from './tree-grounding.ts';
import { npcCatalog } from './exploration.ts';
import { localPose } from './life.ts';
import { createTownLife } from './world-life.ts';
import { createChurch } from './church.ts';
import { createCoast } from './coast.ts';
import { createOpening } from './opening.ts';
import { createRegionalLandmarks } from './landmark-world.ts';
import { regionalLandmarks } from './landmarks.ts';
import type { DeerMood, WildlifeVisitor } from './wildlife.ts';
import { createCameraStore } from './camera-store.ts';
import { createStoryPlaces } from './story-world.ts';
import { createHarbor } from './harbor.ts';
import { createCollectibleWorld } from './collectible-world.ts';
import { createIdleRig, animateIdle, type IdleRig } from './character-idle.ts';
import { createAmbientNature } from './ambient-nature.ts';
import { createSkyDome, createCelestialDisc } from './sky-dome.ts';
import { sampleSky, CELESTIAL_DISTANCE } from './environment.ts';
import { BearEncounter } from './bear.ts';
import { createHospital } from './hospital.ts';
import type { Mission } from './missions.ts';
import { defaultStudioRig, lightNames, lightPosition, type StudioRig } from './lighting.ts';
import { createBuildingSurfaces, gabledRoof } from './building-surfaces.ts';
import { partitionScenery } from './scenery-batches.ts';
import { createGroundSurfaces } from './ground-surfaces.ts';

export interface World {
  bearEncounter: BearEncounter;
  reactWildlife: (time: number, visitor: WildlifeVisitor) => boolean;
  deerMood: (time: number) => DeerMood;
  opening: ReturnType<typeof createOpening>;
  storyPlaces: ReturnType<typeof createStoryPlaces>;
  harbor: ReturnType<typeof createHarbor>;
  collectibles: ReturnType<typeof createCollectibleWorld>;
  scene: THREE.Scene; subjects: Map<string, THREE.Object3D>; solids: THREE.Object3D[];
  update: (time: number, settings: { filter: string; shutter: number }, activityHour?: number) => void;
  setTime: (hour: number) => void;
  setStudioRig: (rig: StudioRig, focus: [number, number, number], controlled: boolean) => void;
  setFlash: (position: [number, number, number], direction: [number, number, number], intensity: number) => void;
  npcPosition: (id: string) => [number, number, number];
  traffic: THREE.Object3D[];
  canWalk: (x: number, z: number) => boolean;
  groundHeight: (x: number, z: number) => number;
  prepareRender: (timeMs?: number, reflectionIntervalMs?: number) => void;
}

export function createWorld(): World {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d6ddca');
  scene.fog = new THREE.Fog('#d6ddca', 160, 720);
  const subjects = new Map<string, THREE.Object3D>();
  const solids: THREE.Object3D[] = [];
  const blockers: { x: number; z: number; w: number; d: number }[] = [];
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const buildingSurfaces = createBuildingSurfaces();
  const groundSurfaces = createGroundSurfaces();
  const staticGroups: THREE.Object3D[] = [];
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
  // Preserve facial detail without paying one draw call for every eye and seam.
  const batchMeshes = (parent: THREE.Object3D, exclude: Set<THREE.Object3D> = new Set(), tileSize = Infinity) => {
    const batches = new Map<string, THREE.Mesh[]>();
    for (const child of parent.children) {
      if (!(child instanceof THREE.Mesh) || child instanceof THREE.InstancedMesh || exclude.has(child) || child.name === 'rolling-terrain' || !(child.material instanceof THREE.MeshStandardMaterial) || child.material instanceof THREE.MeshPhysicalMaterial) continue;
      // Keep distant town details from expanding a batch's culling bounds
      // across the whole map. Animated joints and collision meshes stay separate.
      const key = `${child.material.uuid}-${child.castShadow}-${child.receiveShadow}-${Math.floor(child.position.x / tileSize)}-${Math.floor(child.position.z / tileSize)}`;
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key)!.push(child);
    }
    for (const meshes of batches.values()) {
      if (meshes.length < 2) continue;
      const geometries = meshes.map(mesh => { mesh.updateMatrix(); const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone(); return geometry.applyMatrix4(mesh.matrix); });
      const geometry = mergeGeometries(geometries);
      geometries.forEach(g => g.dispose());
      if (!geometry) continue;
      const merged = new THREE.Mesh(geometry, meshes[0].material); merged.castShadow = meshes[0].castShadow; merged.receiveShadow = meshes[0].receiveShadow;
      meshes.forEach(mesh => parent.remove(mesh)); parent.add(merged);
    }
  };
  const hemi = new THREE.HemisphereLight('#e6edd4', '#647c56', 2.3); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe4ad', 3.5);
  sun.name = 'sun-light'; sun.position.set(-32, 45, 24); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -300, right: 300, top: 300, bottom: -300, near: CELESTIAL_DISTANCE - WORLD_HALF * 2, far: CELESTIAL_DISTANCE + WORLD_HALF * 2 });
  sun.shadow.bias = -0.001; sun.shadow.normalBias = 0.035;
  scene.add(sun, sun.target);
  const moon = new THREE.DirectionalLight('#a5badd', 0); moon.name = 'moon-light'; scene.add(moon, moon.target);
  const sunDisc = createCelestialDisc('sun-disc', '#ffe4ad', CELESTIAL_DISTANCE * Math.tan(THREE.MathUtils.degToRad(0.5)));
  const moonDisc = createCelestialDisc('moon-disc', '#d1dcec', CELESTIAL_DISTANCE * Math.tan(THREE.MathUtils.degToRad(0.4)));
  scene.add(sunDisc, moonDisc);
  const skyDome = createSkyDome(scene);
  // Rounded cloud banks retain a single draw call and catch the evening sun.
  const cloudMaterial = new THREE.MeshStandardMaterial({ color: '#eef3e3', roughness: 1, fog: false });
  const clouds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), cloudMaterial, 60); clouds.name = 'clouds'; clouds.frustumCulled = false; scene.add(clouds);
  const cloudDummy = new THREE.Object3D();
  const skyColour = new THREE.Color(), cloudColour = new THREE.Color();
  const nightColour = new THREE.Color('#111d30'), dayColour = new THREE.Color('#bcd8d2'), sunsetColour = new THREE.Color('#e8b38a');
  const skyLightColour = new THREE.Color('#e6edd4'), sunWarmColour = new THREE.Color('#ffad71');
  const darkCloud = new THREE.Color('#293b50'), whiteCloud = new THREE.Color('#eef3e3'), sunsetCloud = new THREE.Color('#edc4a0');
  // Shared primitive geometry keeps the scenery inexpensive and deliberately chunky.
  const terrain = new THREE.PlaneGeometry(WORLD_HALF * 2, WORLD_HALF * 2, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  terrain.rotateX(-Math.PI / 2);
  const positions = terrain.getAttribute('position');
  const colours: number[] = [];
  const sand = new THREE.Color('#cfbf98'), seabed = new THREE.Color('#74988e');
  const grass = new THREE.Color('#88a86c'), highland = new THREE.Color('#929678'), pathColour = new THREE.Color('#c3b694'), lakebed = new THREE.Color('#8fa99b');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i), height = terrainHeight(x, z);
    positions.setY(i, height + TERRAIN_SURFACE_OFFSET);
    const colour = grass.clone().lerp(highland, Math.min(1, height / 20));
    if (height < -0.1 || Math.hypot((x - 76) / 14, (z + 54) / 11) < 0.9) colour.lerp(lakebed, Math.min(1, Math.max(0, -height) + 0.6));
    colour.multiplyScalar(0.94 + seed(i + 308) * 0.12);
    // Feather the trail shoulders into the grass rather than a hard colour step.
    const trailBlend = 1 - THREE.MathUtils.smoothstep(distanceToTrail(x, z), 0.85, 2.15);
    colour.lerp(pathColour, trailBlend);
    if (z > coastline(x) - 12) colour.copy(z > coastline(x) ? seabed : sand);
    colours.push(colour.r, colour.g, colour.b);
  }
  terrain.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3)); terrain.computeVertexNormals();
  const land = new THREE.Mesh(terrain, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  land.name = 'rolling-terrain'; land.receiveShadow = true; scene.add(land); solids.push(land);
  groundSurfaces.apply(land, 'earth', undefined, true);
  box(0, -5, 0, WORLD_HALF * 2, 4, WORLD_HALF * 2, '#a99778');
  groundSurfaces.apply(box(0, -0.01, 16, 90, 0.08, 3.2, '#c3b694'), 'gravel', '#c3b694');
  groundSurfaces.apply(box(15, 0, -11, 3.6, 0.08, 56, '#c3b694'), 'gravel', '#c3b694');
  groundSurfaces.apply(box(-22, 0, 25, 29, 0.09, 3, '#c3b694'), 'gravel', '#c3b694');
  groundSurfaces.apply(box(-4, 0, -25, 2.5, 0.08, 25, '#b0a686'), 'gravel', '#b0a686');
  // A turquoise lake, a shoreline made from simple blocks, and a wooden jetty.
  const lake = createWaterSurface(new THREE.PlaneGeometry(28, 23), -7, 0.11, -3, 'lake');
  scene.add(lake.tint, lake.reflection);
  const schools = [
    createFishSchool(-4.7, 0.11, 4.5, 2.2, 1.2, 5, 'jetty'),
    createFishSchool(-12, 0.11, -3, 4, 3, 7, 'lake'),
    createFishSchool(1, 0.11, -7, 3, 2.5, 5, 'east-lake'),
    createFishSchool(76, 1.28, -54, 5, 4, 6, 'wetland'),
  ];
  schools.forEach(school => scene.add(school.group));
  // Pebbles and aquatic plants make the new shallow basin readable through water.
  const pebbleGeometry = new THREE.IcosahedronGeometry(1, 0);
  for (let i = 0; i < 32; i++) {
    const x = -18 + seed(i + 600) * 22, z = -11 + seed(i + 620) * 18;
    const pebble = new THREE.Mesh(pebbleGeometry, material(i % 2 ? '#a2a184' : '#8c9980'));
    pebble.position.set(x, terrainHeight(x, z) + 0.06, z); pebble.scale.set(0.18 + seed(i) * 0.18, 0.12, 0.22); scene.add(pebble);
    if (i % 3 === 0) for (let blade = 0; blade < 3; blade++) {
      const plant = box(x + blade * 0.11, terrainHeight(x, z) + 0.2, z, 0.035, 0.38 + seed(i + blade) * 0.15, 0.05, '#547957');
      plant.rotation.z = (blade - 1) * 0.25; plant.castShadow = false;
    }
  }
  blockers.push({ x: -7, z: -3, w: 28, d: 23 });
  box(-7, 0.04, 9.2, 30, 0.2, 0.9, '#bdbe97');
  // Open the western shoreline where Fern Creek joins the lake.
  box(-21.4, 0.02, -8.5, 0.7, 0.15, 13, '#bdbe97');
  box(-21.4, 0.02, 6.5, 0.7, 0.15, 5, '#bdbe97');
  box(7.4, 0.02, -3, 0.7, 0.15, 24, '#bdbe97');
  box(0, 0.34, 8, 3.2, 0.3, 10, '#a17c52');
  for (let i = 0; i < 15; i++) box(0, 0.51, 3.5 + i * 0.64, 3.2, 0.06, 0.09, '#755a42');
  for (const x of [-1.6, 1.6]) for (const z of [3.6, 8, 12]) box(x, 0.5, z, 0.2, 1.6, 0.2, '#795b3e');
  // Low-poly mountains create a layered skyline without texture maps.
  for (let i = 0; i < 14; i++) {
    const x = -300 + i * 46;
    const h = 20 + seed(i + 24) * 27;
    const mountain = cone(x, h / 2 - 2, -310 - seed(i) * 45, 21, h, i % 2 ? '#93aaa0' : '#829d91', 5);
    mountain.castShadow = false;
    const cap = cone(x, h - 5, mountain.position.z, 5.4, 10, '#d2d9c7', 5); cap.castShadow = false;
  }
  // Trees are instanced: hundreds of silhouettes, only three draw calls.
  const treeCount = 1700;
  const trunks = new THREE.InstancedMesh(cube, material('#766345'), treeCount); trunks.name = 'forest-trunks';
  const crowns = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 8), material('#456950'), treeCount);
  const tips = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 8), material('#5c8057'), treeCount);
  crowns.name = 'forest-crowns'; tips.name = 'forest-tips';
  const dummy = new THREE.Object3D();
  for (let i = 0; i < treeCount; i++) {
    let x: number, z: number;
    if (i < 100) { x = -50 + seed(i + 900) * 100; z = -35 - seed(i + 102) * 25; }
    else if (i < 150) { x = i % 2 ? -37 - seed(i) * 14 : 42 + seed(i) * 10; z = -25 + seed(i + 92) * 72; }
    else {
      x = -252 + seed(i + 1900) * 504; z = -252 + seed(i + 1920) * 344;
      if (Math.max(Math.abs(x), Math.abs(z)) < 52) x += x < 0 ? -55 : 55;
    }
    // Clear the trails, ridge viewpoint, and bird sightline.
    if ((x > -46 && x < -28 && z > -51 && z < -32) || (x > -96 && x < -61 && z > -102 && z < -72) || (x > -2 && x < 10 && z > -43 && z < -27) || (x > -30 && x < 0 && z > 27 && z < 57) || (x > -83 && x < -63 && z > 52 && z < 66) || (x > 60 && x < 74 && z > -39 && z < -24) || (Math.abs(x + 43) < 8 && Math.abs(z - 16) < 11) || (x > 33 && x < 57 && z > 76 && z < 96) || z > 84 || (x > -13 && x < 56 && z > 31 && z < 78) || regionalLandmarks.some(p => Math.hypot(x - p.x, z - p.z) < (p.id === 'viaduct' ? 65 : 38) || Math.hypot(x - p.viewpoint[0], z - p.viewpoint[1]) < 16) || distanceToTrail(x, z) < 3 || Math.hypot(x - 76, z + 54) < 27 || Math.hypot(x + 53, z + 70) < 8) { x = 240 + seed(i) * 12; z = -240 + seed(i + 9) * 315; }
    const ground = terrainHeight(x, z);
    const size = 0.8 + seed(i + 13) * 1.3;
    const root = treeRootHeight(x, z, 0.175 * size), trunkTop = ground + 3 * size;
    dummy.position.set(x, (root + trunkTop) / 2, z); dummy.scale.set(0.35 * size, trunkTop - root, 0.35 * size); dummy.rotation.y = 0; dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.y = ground + size * 3.5; dummy.scale.set(1.7 * size, 4.3 * size, 1.7 * size); dummy.rotation.y = seed(i) * 6; dummy.updateMatrix(); crowns.setMatrixAt(i, dummy.matrix);
    dummy.position.y = ground + size * 5.2; dummy.scale.set(1.2 * size, 3 * size, 1.2 * size); dummy.updateMatrix(); tips.setMatrixAt(i, dummy.matrix);
  }
  const treeColour = new THREE.Color();
  for (let i = 0; i < treeCount; i++) {
    treeColour.set(['#436a51', '#59784f', '#648357', '#3c6250'][i % 4]); crowns.setColorAt(i, treeColour);
    treeColour.set(['#799461', '#6c8b5d', '#8b9b67'][i % 3]); tips.setColorAt(i, treeColour);
  }
  // Instance colours supply the leaf palette without multiplying a dark green base.
  (crowns.material as THREE.MeshStandardMaterial).color.set('#ffffff');
  (tips.material as THREE.MeshStandardMaterial).color.set('#ffffff');
  for (const m of [trunks, crowns, tips]) { m.castShadow = true; m.receiveShadow = true; scene.add(partitionScenery(m)); }
  // Broadleaf trees by the lake and in the wedding garden.
  const broadleafSites = [[-17, 13, 1.2], [9, 11, 1.1], [-28, 18, 1], [-32, 30, 1.3], [-15, 31, 0.9], [20, -8, 0.8], [-15, -21, 1.2]];
  const broadleafTrunks = new THREE.InstancedMesh(cube, material('#776249'), broadleafSites.length);
  broadleafTrunks.name = 'broadleaf-trunks'; broadleafTrunks.castShadow = broadleafTrunks.receiveShadow = true; scene.add(broadleafTrunks);
  for (const [i, [x, z, s]] of broadleafSites.entries()) {
    const ground = terrainHeight(x, z), root = treeRootHeight(x, z, 0.325 * s), trunkTop = ground + 4.4 * s;
    dummy.position.set(x, (root + trunkTop) / 2, z); dummy.scale.set(0.65 * s, trunkTop - root, 0.65 * s); dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix(); broadleafTrunks.setMatrixAt(i, dummy.matrix);
    const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(3 * s, 1), material('#77935c'));
    foliage.position.set(x, ground + 5 * s, z); foliage.castShadow = true; scene.add(foliage);
    const second = new THREE.Mesh(new THREE.IcosahedronGeometry(2.5 * s, 1), material('#94a968'));
    second.position.set(x - 1.6 * s, ground + 5.1 * s, z); second.castShadow = true; scene.add(second);
  }
  // Far shoreline houses.
  const house = (x: number, z: number, w: number, h: number, d: number, color: string) => {
    const g = new THREE.Group(); g.name = 'timber-house'; g.position.set(x, terrainHeight(x, z), z); scene.add(g); staticGroups.push(g);
    box(0, h / 2, 0, w, h, d, color, g, true).material = buildingSurfaces.wall(color);
    const rise = Math.min(2, w * 0.28);
    const roof = new THREE.Mesh(gabledRoof(w + 0.7, d + 0.7, rise), buildingSurfaces.roof);
    roof.position.y = h; roof.castShadow = roof.receiveShadow = true; g.add(roof);
    const gables = new THREE.BufferGeometry();
    gables.setAttribute('position', new THREE.Float32BufferAttribute([
      -w/2,0,d/2, w/2,0,d/2, 0,rise,d/2,
      w/2,0,-d/2, -w/2,0,-d/2, 0,rise,-d/2,
    ],3));
    gables.setAttribute('uv', new THREE.Float32BufferAttribute([0,0,1,0,0.5,1,1,0,0,0,0.5,1],2)); gables.computeVertexNormals();
    const gable = new THREE.Mesh(gables, buildingSurfaces.wall(color)); gable.position.y = h; gable.castShadow = true; g.add(gable);
    for (const side of [-1, 1]) for (const x of [-w * 0.22, w * 0.22]) {
      const ww = w * 0.22, wh = h * 0.25;
      box(x, h * 0.6, side * (d / 2 + 0.035), ww + 0.18, wh + 0.18, 0.1, '#58655e', g);
      box(x, h * 0.6, side * (d / 2 + 0.09), ww, wh, 0.025, '#bdd4cb', g).material = buildingSurfaces.window;
      for (const edge of [-1,1]) {
        box(x + edge * (ww / 2 + 0.045), h * 0.6, side * (d / 2 + 0.12), 0.09, wh + 0.18, 0.065, '#eee2c9', g);
        box(x, h * 0.6 + edge * (wh / 2 + 0.045), side * (d / 2 + 0.12), ww + 0.18, 0.09, 0.065, '#eee2c9', g);
      }
      box(x, h * 0.6, side * (d / 2 + 0.12), 0.045, wh, 0.035, '#eee2c9', g);
      box(x, h * 0.6, side * (d / 2 + 0.12), ww, 0.045, 0.035, '#eee2c9', g);
      box(x, h * 0.6 - wh / 2 - 0.12, side * (d / 2 + 0.18), ww + 0.28, 0.1, 0.25, '#eee2c9', g);
    }
    box(0, h * 0.25, d / 2 + 0.03, 0.9, h / 2, 0.08, '#69795d', g);
    // Timber siding, foundation, ridge trim and a doorstep add scale at walking distance.
    box(0, 0.12, 0, w + 0.12, 0.24, d + 0.12, '#a89d87', g).material = buildingSurfaces.foundation;
    for (const side of [-1,1]) box(side * (w / 2 + 0.1), h - 0.03, 0, 0.16, 0.18, d + 0.6, '#eee2c9', g);
    for (const side of [-1, 1]) box(side * (w / 2 - 0.045), h / 2, d / 2 + 0.065, 0.09, h, 0.06, '#eee2c9', g);
    box(0, 0.14, d / 2 + 0.5, 1.5, 0.24, 0.85, '#b1a38a', g);
    box(0.3, h * 0.25, d / 2 + 0.08, 0.035, 0.1, 0.035, '#d8b875', g);
    const halfRoof = (w + 0.7) / 2, slope = Math.atan2(rise, halfRoof);
    for (const end of [-1, 1]) for (const side of [-1, 1]) {
      const fascia = box(side * halfRoof / 2, h + rise / 2, end * (d / 2 + 0.36), Math.hypot(halfRoof, rise), 0.12, 0.12, '#eee2c9', g);
      fascia.rotation.z = -side * slope;
    }
    box(0, h + rise + 0.025, 0, 0.16, 0.12, d + 0.85, '#685d53', g);
    const chimneyX = -w * 0.25, chimneyZ = -d * 0.22;
    box(chimneyX, h + rise * 0.78, chimneyZ, 0.65, 1.35, 0.65, '#a89d87', g).material = buildingSurfaces.foundation;
    box(chimneyX, h + rise * 0.78 + 0.72, chimneyZ, 0.8, 0.13, 0.8, '#807a6c', g);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.34, 10, 1, true), material('#ad785d'));
    pot.position.set(chimneyX, h + rise * 0.78 + 0.95, chimneyZ); pot.castShadow = true; g.add(pot);
    blockers.push({ x, z, w, d }); return g;
  };
  house(4, -22, 6, 4.5, 5, '#e4ceb0'); house(-19, -25, 5, 3.5, 5, '#ceb195');
  house(22, -36, 6, 5, 5, '#c6c8b0'); house(40, -14, 6, 4, 6, '#d4baa0');
  // Lighthouse is the first assignment's unmistakable landmark.
  const lighthouse = new THREE.Group(); lighthouse.position.set(-7, 0, -17); scene.add(lighthouse);
  staticGroups.push(lighthouse);
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
  const creek = createWaterfall(); scene.add(creek.group); solids.push(...creek.solids); subjects.set('Waterfall', creek.focus);
  blockers.push({ x: -24, z: -15.5, w: 22, d: 9.8 });
  // Benches, reeds, flowers, boulders, and paths give the world human scale.
  const bench = (x: number, z: number, rotation = 0) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotation; scene.add(g);
    staticGroups.push(g);
    box(0, 0.7, 0, 2.4, 0.15, 0.7, '#967d53', g); box(0, 1.1, -0.3, 2.4, 0.65, 0.1, '#967d53', g);
    for (const a of [-0.85, 0.85]) box(a, 0.35, 0, 0.15, 0.7, 0.55, '#536153', g);
  };
  bench(5, 12, -0.25); bench(-10, 12); bench(19, 16, Math.PI);
  for (let i = 0; i < 20; i++) {
    const x = -20 + seed(i + 202) * 25, z = 10.2 + seed(i + 58) * 1.2;
    box(x, 0.3, z, 0.05, 0.6, 0.05, '#687e48'); box(x, 0.65, z, 0.12, 0.3, 0.12, '#ad9763');
  }
  for (let i = 0; i < 10; i++) rock(-35 + seed(i + 700) * 70, 0.25, 40 + seed(i + 96) * 8, 0.45 + seed(i) * 0.7);
  const sphereGeo = new THREE.IcosahedronGeometry(1, 1);
  const sphere = (x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string, parent: THREE.Object3D) => {
    const mesh = new THREE.Mesh(sphereGeo, material(color)); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true; parent.add(mesh); return mesh;
  };
  const faceGeometry = new THREE.SphereGeometry(1, 24, 16);
  const faceMaterials = new Map<string, THREE.MeshStandardMaterial>();
  const faceMaterial = (skin: string) => {
    if (!faceMaterials.has(skin)) faceMaterials.set(skin, new THREE.MeshStandardMaterial({color:skin, roughness:0.88}));
    return faceMaterials.get(skin)!;
  };
  const characters: { group: THREE.Group; arms: THREE.Group[]; legs: THREE.Group[]; rig?: IdleRig; yaw: number }[] = [];
  const locals = new Map<string, ReturnType<typeof person>>();
  const person = (x: number, z: number, shirt: string, parent: THREE.Object3D = scene, variant = 0) => {
    const g = new THREE.Group(); g.position.set(x, terrainHeight(x, z), z); parent.add(g);
    const skin = ['#dbb693', '#a57453', '#d6a17d', '#795641', '#e6c5a2', '#b18468'][variant % 6];
    const hair = ['#675344', '#332c2c', '#b37943', '#493c34', '#acaaa0', '#d9b96d'][variant % 6];
    const trousers = ['#465659', '#394656', '#736452', '#5c5264'][variant % 4];
    const height = [1, 1.07, 0.95, 1.02, 1.1, 0.92, 0.78, 1.03][variant % 8];
    const build = [1, 1.12, 0.88, 1.18, 0.94, 1.06][variant % 6];
    g.scale.set(build, height, 1);
    g.userData.height = height;
    sphere(0, 1.1, 0, 0.31, 0.39, 0.21, shirt, g);
    box(0, 0.78, 0, 0.49, 0.13, 0.3, trousers, g);
    box(0, 1.46, 0, 0.15, 0.18, 0.15, skin, g);
    const face = new THREE.Mesh(faceGeometry, faceMaterial(skin));
    face.position.set(0, 1.69, 0); face.scale.set(0.22, 0.27, 0.21);
    face.castShadow = true; g.add(face);
    for (const side of [-1, 1]) {
      sphere(side * 0.218, 1.69, 0, 0.048, 0.073, 0.05, skin, g);
      sphere(side * 0.08, 1.73, 0.192, 0.037, 0.026, 0.022, '#eee4cf', g);
      sphere(side * 0.08, 1.73, 0.211, 0.021, 0.023, 0.009, '#405a50', g);
      sphere(side * 0.075, 1.738, 0.218, 0.006, 0.007, 0.005, '#fff0d2', g);
    }
    sphere(0, 1.88, -0.035, 0.235, 0.12, 0.215, hair, g);
    if (variant % 3 === 0) {
      for (const x of [-0.19, 0.19]) box(x, 1.66, -0.035, 0.08, 0.4, 0.25, hair, g);
    } else if (variant % 3 === 1) {
      sphere(0, 1.78, -0.22, 0.13, 0.14, 0.24, hair, g);
    } else {
      sphere(0, 1.97, -0.04, 0.21, 0.1, 0.18, hair, g);
    }
    if (variant % 4 === 1) {
      for (const x of [-0.08, 0.08]) {
        const glasses = new THREE.Mesh(new THREE.TorusGeometry(0.053, 0.008, 6, 18), material('#394d45'));
        glasses.position.set(x, 1.73, 0.225); g.add(glasses);
      }
      box(0, 1.73, 0.221, 0.065, 0.018, 0.02, '#c9c3ac', g);
    }
    if (variant % 5 === 3) {
      const skirt = cone(0, 0.57, 0, 0.42, 0.58, shirt, 8, g); skirt.rotation.x = Math.PI;
    }
    if (variant % 4 === 2) {
      box(0, 1.27, 0.2, 0.47, 0.12, 0.08, '#e0bd6e', g);
      box(0.14, 1.08, 0.23, 0.11, 0.37, 0.06, '#e0bd6e', g);
    }
    for (const a of [-0.08, 0.08]) {
      box(a, 1.8, 0.184, 0.07, 0.026, 0.025, hair, g);
    }
    sphere(0, 1.67, 0.224, 0.043, 0.06, 0.06, skin, g);
    box(0, 1.58, 0.198, 0.07, 0.017, 0.018, '#955e50', g);
    for (const a of [-0.07, 0.07]) box(a, 1.37, 0.19, 0.1, 0.14, 0.035, '#e6d7b7', g);
    box(0.14, 1.14, 0.206, 0.12, 0.13, 0.03, shirt, g);
    const legs = [-0.14, 0.14].map(a => {
      const limb = new THREE.Group(); limb.position.set(a, 0.77, 0); g.add(limb);
      sphere(0, -0.32, 0, 0.105, 0.37, 0.12, trousers, limb);
      sphere(0, -0.68, 0.065, 0.13, 0.085, 0.21, '#e1d5b9', limb); return limb;
    });
    const arms = [-0.34, 0.34].map(a => {
      const arm = new THREE.Group(); arm.name = 'character-arm'; arm.position.set(a, 1.38, 0); g.add(arm);
      sphere(0, -0.21, 0, 0.12, 0.21, 0.13, shirt, arm);
      sphere(0, -0.44, 0.015, 0.08, 0.16, 0.085, skin, arm);
      sphere(0, -0.6, 0.035, 0.085, 0.1, 0.075, skin, arm);
      batchMeshes(arm); return arm;
    });
    const focus = new THREE.Object3D(); focus.position.y = 1.35; g.add(focus);
    const character = { group: g, focus, legs, arms, yaw: 0 }; characters.push(character);
    return character;
  };
  for (const [index, npc] of npcCatalog.entries()) {
    const character = person(npc.x, npc.z, npc.shirt, scene, index); character.group.name = `npc-${npc.id}`;
    locals.set(npc.id, character);
    // Field bag, strap and a distinctive ranger hat / astronomer's beanie.
    box(-0.27, 1.03, -0.15, 0.19, 0.3, 0.18, '#746447', character.group);
    box(-0.18, 1.24, -0.19, 0.045, 0.46, 0.035, '#d6c19a', character.group);
    if (index === 0 || index === 5) {
      sphere(0, 1.91, 0, 0.25, 0.13, 0.24, index === 0 ? '#b6ac78' : '#d3a46c', character.group);
      if (index === 0) box(0, 1.86, 0.06, 0.64, 0.045, 0.47, '#b6ac78', character.group);
    }
    if (npc.id === 'historian') {
      box(0.1, 1.05, 0.25, 0.3, 0.38, 0.08, '#765c42', character.group);
      box(0.1, 1.05, 0.3, 0.24, 0.3, 0.015, '#decc9f', character.group);
    }
    const marker = cone(0, 2.7 / character.group.scale.y, 0, 0.12, 0.26, '#f0cd76', 4, character.group); marker.rotation.z = Math.PI; marker.name = `npc-marker-${npc.id}`; marker.visible = false;
  }
  // Sports: a moving subject on a visible terracotta running track.
  box(29, 0.04, 5, 20, 0.13, 17, '#be8865'); box(29, 0.13, 5, 13, 0.04, 10, '#92a26c');
  for (const x of [20.5, 21.2, 36.8, 37.5]) box(x, 0.15, 5, 0.07, 0.02, 16, '#e1c9a4');
  for (const z of [-2.5, -1.8, 11.8, 12.5]) box(29, 0.15, z, 18, 0.02, 0.07, '#e1c9a4');
  const runner = person(27, 7, '#d68456'); subjects.set('Runner', runner.focus);
  bench(38, 16, Math.PI); box(35, 0.8, 16, 0.1, 1.6, 0.1, '#697855'); box(35, 1.7, 16, 2.7, 0.7, 0.15, '#e0d4b1');
  // Bakery is open at the front, with transparent glass and a planar reflection.
  box(13, 2, -17, 9, 4, 0.4, '#dbc3a5', scene, true);
  box(8.5, 2, -14, 0.4, 4, 6, '#dbc3a5', scene, true); box(17.5, 2, -14, 0.4, 4, 6, '#dbc3a5', scene, true);
  box(13, 4.2, -14, 9.5, 0.5, 6.5, '#93775b'); box(13, 0.05, -14, 9, 0.1, 6, '#bba789');
  box(13, 1, -13.5, 6, 1, 0.8, '#a58861');
  const baker = person(13, -14.6, '#ede0bc', scene, 4);
  box(0, 1.01, 0.235, 0.38, 0.6, 0.04, '#f1e8d4', baker.group);
  box(0, 1.96, 0, 0.4, 0.15, 0.35, '#f1e8d4', baker.group); subjects.set('Baker', baker.focus);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: '#d0e3d9', roughness: 0.1, metalness: 0, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 3.5), glassMat); glass.name = 'bakery-glass'; glass.position.set(13, 2, -10.95); scene.add(glass);
  const reflection = new Reflector(new THREE.PlaneGeometry(8.5, 3.5), {
    textureWidth: 512, textureHeight: 256, multisample: 0, clipBias: 0.003,
    shader: {
      name: 'WindowReflection',
      uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, strength: { value: 0.6 } },
      vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 worldPosition;
        void main() { vUv = textureMatrix * vec4(position, 1.0); worldPosition = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float strength; varying vec4 vUv; varying vec3 worldPosition;
        void main() {
          vec3 viewDirection = normalize(cameraPosition - worldPosition);
          float grazing = pow(1.0 - abs(viewDirection.z), 3.0);
          vec3 reflected = texture2DProj(tDiffuse, vUv).rgb * vec3(0.93, 0.98, 1.0);
          gl_FragColor = vec4(reflected, strength * (0.8 + 0.2 * grazing));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    },
  });
  const reflectionMaterial = reflection.material as THREE.ShaderMaterial;
  reflection.name = 'bakery-reflection'; reflection.position.set(13, 2, -10.94);
  reflectionMaterial.transparent = true; reflectionMaterial.depthWrite = false; reflection.renderOrder = 1;
  scene.add(reflection);
  for (const x of [8.6, 13.8, 17.4]) box(x, 2, -10.85, 0.09, 4, 0.1, '#657963');
  box(13, 3.8, -10.85, 9, 0.1, 0.1, '#657963');
  const reporter = person(8, -7, '#718b86', scene, 2); subjects.set('Reporter', reporter.focus);
  box(8.45, 1.15, -6.85, 0.13, 0.38, 0.13, '#394d45');
  // Town hall: an open glazed front looks onto Vale's late-night meeting.
  box(4, 2, -39, 10, 4, 0.3, '#c9c2af', scene, true);
  for (const x of [-1, 9]) box(x, 2, -36, 0.3, 4, 6, '#c9c2af', scene, true);
  box(4, 4.2, -36, 10.4, 0.3, 6.5, '#67786c');
  box(4, 0.02, -36, 10, 0.04, 6, '#b9a88b');
  box(4, 0.35, -32.95, 10, 0.7, 0.16, '#c9c2af', scene, true);
  for (const x of [-0.7, 8.7]) box(x, 2, -32.9, 0.16, 4, 0.16, '#68776b');
  const hallGlass = new THREE.Mesh(new THREE.PlaneGeometry(9.3, 3.1), glassMat); hallGlass.position.set(4, 2.1, -32.9); hallGlass.name = 'townhall-glass'; scene.add(hallGlass);
  const hallReflection = new Reflector(new THREE.PlaneGeometry(9.3, 3.1), { textureWidth: 512, textureHeight: 256, multisample: 0, clipBias: 0.003, shader: { name: 'TownHallWindow', uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, strength: { value: 0.6 } }, vertexShader: reflectionMaterial.vertexShader, fragmentShader: reflectionMaterial.fragmentShader } });
  hallReflection.position.set(4, 2.1, -32.88); hallReflection.name = 'townhall-reflection';
  const hallReflectionMaterial = hallReflection.material as THREE.ShaderMaterial;
  hallReflectionMaterial.transparent = true; hallReflectionMaterial.depthWrite = false; hallReflection.renderOrder = 1; scene.add(hallReflection);
  const vale = person(3.5, -36.2, '#4e5b6a', scene, 1); vale.group.name = 'councillor-vale';
  const developer = person(5.1, -36.4, '#8e745f', scene, 4); developer.group.name = 'townhall-developer';
  const meetingFocus = new THREE.Object3D(); meetingFocus.position.set(4, 1.5, -36); scene.add(meetingFocus); subjects.set('Councillor Vale', meetingFocus);
  box(4.3, 0.85, -35.5, 3, 0.14, 1.3, '#8b6c50');
  for (const x of [3.1, 5.5]) box(x, 0.42, -35.5, 0.12, 0.84, 0.8, '#8b6c50');
  const papers = box(4.2, 0.95, -35.3, 0.75, 0.025, 0.6, '#eee7d2'); papers.name = 'meeting-papers';
  for (let i = 0; i < 4; i++) box(4.2, 0.969, -35.5 + i * 0.12, 0.55, 0.005, 0.015, '#6c776d');
  const hallLamp = new THREE.PointLight('#ffd49b', 12, 10); hallLamp.name = 'townhall-lamp'; hallLamp.position.set(4, 2.8, -35); scene.add(hallLamp);
  // Wedding garden: arch, flower beds, couple, and guests at different depths.
  for (const x of [-27, -23]) box(x, 2.2, 25, 0.24, 4.4, 0.24, '#e3d7bb');
  box(-25, 4.3, 25, 4.3, 0.24, 0.3, '#e3d7bb');
  for (let i = 0; i < 12; i++) box(-27 + i * 0.36, 4.55 + Math.sin(i) * 0.13, 25, 0.25, 0.25, 0.35, i % 2 ? '#cfab95' : '#eee2c7');
  const coupleA = person(-25.55, 25, '#eee7d7', scene, 3); person(-24.65, 25, '#526e69', scene, 1);
  const coupleFocus = new THREE.Object3D(); coupleFocus.position.set(-25, 1.35, 25); scene.add(coupleFocus); subjects.set('Newlyweds', coupleFocus); coupleA.group.rotation.y = 0.2;
  for (let i = 0; i < 5; i++) person(-22 + i, 25 + (i % 2) * 0.8, ['#b99d85', '#818e70', '#d5c4a3', '#8c9d9a', '#c88c72'][i], scene, i + 8);
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
  const maker = person(28, -26, '#b78568', scene, 5);
  box(0, 1.04, 0.225, 0.42, 0.57, 0.04, '#77917c', maker.group); subjects.set('Pottery maker', maker.focus);
  box(32, 0.6, -26, 1.1, 1.2, 1.1, '#e2d8be');
  const vaseProfile = [[.2,-.375],[.28,-.34],[.35,-.19],[.36,-.08],[.3,.08],[.21,.19],[.17,.27],[.18,.34],[.23,.375],[.195,.375],[.15,.34],[.14,.27],[.18,.19],[.27,.08],[.32,-.08],[.3,-.19],[.24,-.3],[.02,-.3],[.02,-.375]];
  const vase = new THREE.Mesh(new THREE.LatheGeometry(vaseProfile.map(([r,y])=>new THREE.Vector2(r,y)),48), material('#b47759')); vase.position.set(32, 1.55, -26); vase.castShadow = vase.receiveShadow = true; scene.add(vase); subjects.set('Terracotta vase', vase);
  const studioLights = lightNames.map(name => {
    const equipment = new THREE.Group(); equipment.name = `studio-${name}-equipment`; scene.add(equipment);
    const stand = box(0, 1.4, 0, 0.06, 2.8, 0.06, '#546458', equipment);
    box(0, 0.08, 0, 0.65, 0.07, 0.08, '#546458', equipment);
    const head = box(0, 2.8, 0, 0.9, 0.9, 0.18, '#f1e8d3', equipment);
    head.castShadow = false;
    // Shared scene materials are immutable; each lamp gets its own emissive face.
    head.material = new THREE.MeshStandardMaterial({color:'#f1e8d3',emissive:'#fff2d8',emissiveIntensity:0.4,roughness:0.7});
    const light = new THREE.SpotLight('#fff2d8', 0, 24, Math.PI / 3, 0.7, 2);
    light.name = `studio-${name}`; light.castShadow = true; light.shadow.mapSize.set(512, 512);
    light.shadow.bias = -0.001; light.shadow.normalBias = 0.04;
    scene.add(light, light.target);
    return { name, equipment, stand, head, light };
  });
  const cameraFlash = new THREE.SpotLight('#fff2df', 0, 0, Math.PI / 3, 0.65, 2);
  cameraFlash.name = 'camera-flash'; cameraFlash.castShadow = true; cameraFlash.shadow.mapSize.set(512, 512);
  cameraFlash.shadow.bias = -0.001; cameraFlash.shadow.normalBias = 0.025; cameraFlash.visible = false;
  scene.add(cameraFlash, cameraFlash.target);
  const church = createChurch(scene, box, solids, blockers);
  staticGroups.push(scene.getObjectByName('wedding-chapel')!);
  const coast = createCoast(scene);
  const townLife = createTownLife({ scene, solids, box, sphere, person, house, batchMeshes });
  const store = createCameraStore(scene, solids);
  const storyPlaces = createStoryPlaces(scene, solids);
  const harbor = createHarbor(scene, solids, subjects);
  const hospital = createHospital(scene, solids);
  subjects.set('Woodland survey notice', storyPlaces.boundaryFocus);
  const regions = createRegionalLandmarks(scene, solids, subjects);
  const opening = createOpening(scene);
  const deer = scene.getObjectByName('meadow-deer-0')!;
  const deerFocus = new THREE.Object3D(); deerFocus.position.set(0, 1, 0); deer.add(deerFocus); subjects.set('Meadow deer', deerFocus);
  const bear = new THREE.Group(); bear.name = 'pale-woodland-bear'; scene.add(bear);
  const bearEncounter = new BearEncounter();
  const bearLegs: THREE.Object3D[] = [];
  sphere(0, 1.05, 0, 1.15, 0.82, 0.65, '#d3c8a7', bear);
  sphere(-0.8, 1.2, 0, 0.62, 0.72, 0.65, '#ddd2b5', bear);
  sphere(-1.45, 1.05, 0, 0.55, 0.46, 0.47, '#e5dcc4', bear);
  sphere(-1.85, 0.98, 0, 0.35, 0.25, 0.32, '#c5b696', bear);
  sphere(-2.1, 1.03, 0, 0.12, 0.1, 0.17, '#3d4036', bear);
  for (const z of [-0.38, 0.38]) {
    sphere(-1.4, 1.47, z, 0.17, 0.2, 0.14, '#b9a887', bear);
    sphere(-1.7, 1.15, z, 0.05, 0.05, 0.045, '#34392f', bear);
    for (const x of [-0.65, 0.75]) bearLegs.push(sphere(x, 0.42, z, 0.27, 0.55, 0.27, '#c7b995', bear));
  }
  const bearJaw = sphere(-1.85, 0.81, 0, 0.34, 0.1, 0.29, '#80745c', bear);
  const bearFocus = new THREE.Object3D(); bearFocus.position.set(-0.3, 1.2, 0); bear.add(bearFocus); subjects.set('Pale woodland bear', bearFocus);
  // Direction signs and park lamp posts.
  for (const [x, z] of [[-4, 15], [17, 14], [-16, 25], [-4, -26]]) {
    box(x, 1.2, z, 0.16, 2.4, 0.16, '#766246'); box(x + 0.5, 2.1, z, 1.8, 0.55, 0.15, '#eee0bb');
  }
  const parkLamps: THREE.PointLight[] = [];
  for (const [x, z] of [[10, 14], [17, -5], [-17, 17]]) {
    box(x, 1.6, z, 0.1, 3.2, 0.1, '#566958'); box(x, 3.3, z, 0.5, 0.5, 0.5, '#e8d6a4');
    const lamp = new THREE.PointLight('#ffce81', 3, 10); lamp.position.set(x, 3.2, z); scene.add(lamp); parkLamps.push(lamp);
  }
  // A wetland, bird perch and raised hide make the long-lens assignment a real place.
  const pondGeometry = new THREE.CircleGeometry(1, 48); pondGeometry.scale(14, 11, 1);
  const pond = createWaterSurface(pondGeometry, 76, 1.28, -54, 'wetland'); scene.add(pond.tint, pond.reflection);
  const reflections = isolateReflections([coast.reflection, reflection, hallReflection, lake.reflection, pond.reflection, creek.river.reflection]);
  const bird = new THREE.Group(); bird.name = 'kingfisher'; bird.position.set(76, 3.6, -54); scene.add(bird);
  box(76, 2.35, -54, 0.18, 2.25, 0.18, '#80684d'); box(76, 3.39, -54, 1.6, 0.12, 0.17, '#80684d');
  sphere(0, 0, 0, 0.15, 0.23, 0.29, '#397f96', bird);
  sphere(0, -0.04, 0.18, 0.12, 0.16, 0.13, '#d79d57', bird);
  const birdHead = new THREE.Group(); birdHead.position.set(0, 0.24, 0.14); bird.add(birdHead);
  sphere(0, 0, 0, 0.16, 0.15, 0.16, '#4b96a6', birdHead);
  for (const x of [-0.135, 0.135]) sphere(x, 0.025, 0.05, 0.028, 0.03, 0.035, '#1c3038', birdHead);
  const beak = cone(0, -0.02, 0.25, 0.045, 0.24, '#384448', 5, birdHead); beak.rotation.x = Math.PI / 2;
  const tail = box(0, -0.05, -0.3, 0.1, 0.06, 0.27, '#356d85', bird); tail.rotation.x = -0.35;
  for (const x of [-0.13, 0.13]) sphere(x, -0.02, -0.035, 0.055, 0.17, 0.23, '#326d86', bird);
  for (const x of [-0.07, 0.07]) box(x, -0.23, 0.05, 0.028, 0.1, 0.06, '#a46e42', bird);
  const birdFocus = new THREE.Object3D(); birdFocus.position.y = 0.08; bird.add(birdFocus); subjects.set('Kingfisher', birdFocus);
  const hideY = terrainHeight(63, -32);
  for (const x of [60, 66]) box(x, hideY + 1.25, -35, 0.18, 2.5, 0.18, '#827150');
  box(63, hideY + 2.6, -35, 7, 0.18, 2.4, '#9c8b62');
  box(63, hideY + 0.45, -35.2, 6, 0.9, 0.12, '#a2916c');
  for (let i = 0; i < 55; i++) {
    const angle = i / 55 * Math.PI * 2, x = 76 + Math.cos(angle) * 14.8, z = -54 + Math.sin(angle) * 11.8;
    box(x, 1.8, z, 0.055, 1.2, 0.055, '#7d9059'); box(x, 2.4, z, 0.11, 0.25, 0.11, '#a18a54');
  }
  for (const trail of trails) for (let i = 1; i < trail.length; i++) {
    const [x, z] = trail[i], y = terrainHeight(x, z);
    // The harbor's short lanes use the workshop board; tall trail signs would
    // stand between the crew and their portrait viewpoints.
    if (x > 33 && x < 55 && z > 74 && z < 92) continue;
    box(x + 2.4, y + 1.1, z, 0.12, 2.2, 0.12, '#80694b');
    box(x + 2.4, y + 1.85, z, 1.35, 0.36, 0.13, '#e0cd99');
    box(x + 2.8, y + 1.85, z + 0.075, 0.24, 0.06, 0.03, '#647754');
  }
  // Ridge camp and a telescope, with a clear view to the northern skyline.
  const ridgeY = terrainHeight(-53, -68);
  box(-58, ridgeY + 0.5, -67, 2.8, 1, 0.7, '#917654');
  const telescope = box(-51, ridgeY + 2, -68, 0.34, 0.34, 1.3, '#d4cfb2'); telescope.rotation.x = -0.4;
  for (const x of [-51.3, -50.7]) box(x, ridgeY + 0.9, -68, 0.09, 1.8, 0.09, '#596a61');
  // Details around town: shutters, sills, chimney pots and planted borders.
  for (const [x, z, w, h, d] of [[4, -22, 6, 4.5, 5], [-19, -25, 5, 3.5, 5], [22, -36, 6, 5, 5], [40, -14, 6, 4, 6]]) {
    box(x + w * 0.28, h + 1.1, z, 0.6, 1.4, 0.6, '#aa8c72');
    for (const side of [-1, 1]) {
      box(x + side * w * 0.22, h * 0.45, z + d / 2 + 0.12, w * 0.3, 0.09, 0.3, '#f0dfb9');
      box(x + side * w * 0.37, h * 0.6, z + d / 2 + 0.09, 0.24, h * 0.29, 0.1, '#7a8c76');
    }
  }
  const flowers = new THREE.InstancedMesh(sphereGeo, material('#d7bc8e'), 900);
  const stones = new THREE.InstancedMesh(sphereGeo, material('#919582'), 400);
  flowers.name = 'scattered-flowers'; stones.name = 'scattered-stones';
  for (const [mesh, count] of [[flowers, 900], [stones, 400]] as const) {
    for (let i = 0; i < count; i++) {
      const x = -250 + seed(i + count * 7) * 500, z = -250 + seed(i + count * 9) * 340;
      const inTown = Math.max(Math.abs(x), Math.abs(z)) < 45;
      dummy.position.set(x, terrainHeight(x, z) + (mesh === flowers ? 0.16 : 0.22), z);
      const scale = inTown || distanceToTrail(x, z) < 3 || regionalLandmarks.some(p => Math.hypot(x - p.x, z - p.z) < 65) || Math.hypot(x - 76, z + 54) < 20 ? 0 : (mesh === flowers ? 0.15 : 0.35 + seed(i) * 0.7);
      dummy.scale.set(scale, scale * 0.6, scale); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.receiveShadow = true; scene.add(partitionScenery(mesh));
  }
  const canWalk = (x: number, z: number) => {
    if (Math.abs(x) > WORLD_HALF - 4 || Math.abs(z) > WORLD_HALF - 4) return false;
    if (z > coastline(x) - 1.2 && !opening.onDock(x, z)) return false;
    if (Math.hypot((x - 76) / 14, (z + 54) / 11) < 1) return false;
    if (regions.blocksWalking(x, z) || harbor.blocksWalking(x, z) || hospital.blocksWalking(x, z)) return false;
    if (creekDistance(x, z) < 1.08 || townLife.blocksWalking(x, z) || store.blocksWalking(x, z) || storyPlaces.blocksWalking(x, z)) return false;
    // The jetty is a narrow walkable exception inside the lake boundary.
    return !blockers.some(b => Math.abs(x - b.x) < b.w / 2 + 0.25 && Math.abs(z - b.z) < b.d / 2 + 0.25 && !(b.w === 28 && Math.abs(x) < 1.25 && z > 3.5));
  };
  const nature = createAmbientNature(scene, canWalk);
  const collectibles = createCollectibleWorld(scene, opening.dockHeight);
  characters.forEach(character => {
    character.yaw = character.group.rotation.y;
    character.rig = createIdleRig(character.group, character.arms);
    batchMeshes(character.rig.head); batchMeshes(character.rig.torso); batchMeshes(character.group);
  });
  // Stars fade in with the night everywhere in town.
  const vertices: number[] = [];
  for (let i = 0; i < 700; i++) { const a = seed(i + 3) * Math.PI * 2, b = seed(i + 97) * Math.PI * 0.43; vertices.push(Math.cos(a) * Math.cos(b) * 280, Math.sin(b) * 280 + 10, Math.sin(a) * Math.cos(b) * 280); }
  const starsGeo = new THREE.BufferGeometry(); starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: '#fff4d9', size: 0.35, sizeAttenuation: true, fog: false, transparent: true, depthWrite: false })); stars.name = 'night-stars'; stars.visible = false; scene.add(stars);
  const nightFocus = new THREE.Object3D(); nightFocus.position.set(-53, 42, -100); scene.add(nightFocus); subjects.set('Night sky', nightFocus);
  let sky = sampleSky(17);
  let studioMode = false;
  const applyEnvironment = () => {
    hemi.intensity = studioMode ? 0.25 : 0.18 + sky.daylight * 2.12;
    hemi.color.set('#889fc5').lerp(skyLightColour, sky.daylight);
    sun.intensity = sky.sunStrength * (studioMode ? 0.25 : 3.5);
    sun.color.set('#ffe4ad').lerp(sunWarmColour, sky.warmth);
    moon.intensity = sky.night * (studioMode ? 0.03 : 0.22);
    sun.position.set(...sky.sunPosition); moon.position.copy(sun.position).multiplyScalar(-1);
    sunDisc.position.set(...sky.sunPosition); moonDisc.position.copy(sunDisc.position).multiplyScalar(-1);
    sunDisc.visible = sky.elevation > -0.03; moonDisc.visible = sky.elevation < 0.03;
    skyColour.copy(nightColour).lerp(dayColour, sky.daylight).lerp(sunsetColour, sky.warmth * 0.65);
    (scene.background as THREE.Color).copy(skyColour);
    (scene.fog as THREE.Fog).color.copy(skyColour); (scene.fog as THREE.Fog).near = 120 + sky.daylight * 60;
    stars.rotation.y = sky.hour / 24 * Math.PI * 2; stars.visible = sky.night > 0.01; (stars.material as THREE.PointsMaterial).opacity = sky.night * (1 - sky.cloudCover * 0.45);
    cloudColour.copy(darkCloud).lerp(whiteCloud, sky.daylight).lerp(sunsetCloud, sky.warmth * 0.6);
    cloudMaterial.color.copy(cloudColour);
    cloudMaterial.emissive.copy(cloudColour); cloudMaterial.emissiveIntensity = 0.12 + sky.night * 0.2;
    skyDome.setTime(sky.daylight, sky.warmth, skyColour, sky.sunPosition);
    parkLamps.forEach(lamp => { lamp.intensity = 3 * (1 - sky.daylight); });
    material('#e8d6a4').emissive.set('#ffce81'); material('#e8d6a4').emissiveIntensity = 1 - sky.daylight;
    buildingSurfaces.window.emissiveIntensity = (1 - sky.daylight) * 0.8;
    const meeting = sky.hour >= 22 || sky.hour < 2;
    vale.group.visible = developer.group.visible = papers.visible = meeting; hallLamp.intensity = meeting ? 12 : 0;
    townLife.setTime(sky.hour, 1 - sky.daylight); church.setTime(1 - sky.daylight);
    for (let i = 0; i < 60; i++) {
      const cluster = Math.floor(i / 5), puff = i % 5;
      const drift = ((seed(cluster + 500) * 300 + sky.hour * 12.5) % 300) - 150;
      cloudDummy.position.set(drift + (puff - 2) * 3.5, 38 + seed(cluster + 501) * 16 + seed(i + 520) * 2, -110 + seed(cluster + 502) * 220);
      cloudDummy.scale.set((4 + seed(i + 510) * 3) * (0.75 + sky.cloudCover), 1.4 + seed(i + 511) * 1.8, 3 + seed(i + 512) * 3);
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
      item.light.visible = config.enabled && config.power > 0;
      const colour = config.colour === 'warm' ? '#ffc283' : config.colour === 'cool' ? '#b2ceff' : '#fff2df';
      item.light.color.set(colour);
      const face = item.head.material as THREE.MeshStandardMaterial;
      face.emissive.set(colour); face.emissiveIntensity = config.enabled ? config.power * 0.5 : 0;
    }
  };
  setStudioRig(defaultStudioRig(), [28, 1.35, -26], false);
  const protectedMeshes = new Set(solids);
  protectedMeshes.add(papers);
  // Keep each road's named bounds available for hospital/sidewalk clearance checks.
  scene.traverse(object => { if (object.name.startsWith('neighborhood-')) protectedMeshes.add(object); });
  staticGroups.push(scene.getObjectByName('bus-shelter')!);
  staticGroups.forEach(group => batchMeshes(group, protectedMeshes));
  batchMeshes(scene, protectedMeshes, 32);
  // Three includes visible lights in every lit material, even at zero intensity.
  // Keep daytime lamps and disabled equipment out of those fragment shaders.
  const localLights: (THREE.PointLight | THREE.SpotLight)[] = [];
  scene.traverse(object => { if (object instanceof THREE.PointLight || object instanceof THREE.SpotLight) localLights.push(object); });
  const staticSolidCount = solids.length;
  return {
    opening, storyPlaces, harbor, collectibles, bearEncounter, scene, subjects, solids, traffic: townLife.traffic,
    prepareRender(timeMs, interval = 0) { reflections.prepare(timeMs, interval); },
    reactWildlife(time, visitor) { return townLife.reactWildlife(time, sky.hour, visitor, (x, z) => this.canWalk(x, z)); },
    deerMood: townLife.deerMood,
    npcPosition(id) { const p = locals.get(id)!.group.position; return [p.x, p.y, p.z]; },
    groundHeight: (x, z) => hospital.groundHeight(x, z) ?? opening.dockHeight(x, z),
    setTime(hour) { sky = sampleSky(hour); applyEnvironment(); },
    setStudioRig,
    setFlash(position, direction, intensity) {
      cameraFlash.visible = intensity > 0; cameraFlash.intensity = intensity;
      cameraFlash.position.set(position[0], position[1] + 0.18, position[2]);
      cameraFlash.target.position.set(position[0] + direction[0] * 10, position[1] + 0.18 + direction[1] * 10, position[2] + direction[2] * 10);
    },
    update(time, settings, activityHour = sky.hour) {
      const bearPose = bearEncounter.pose(time);
      const bite = Math.max(0, 1 - Math.abs(time - bearEncounter.lastBite) / 0.35);
      bear.position.set(bearPose.x, terrainHeight(bearPose.x, bearPose.z) + (bearPose.walking ? Math.abs(Math.sin(time * 12)) * 0.08 : 0), bearPose.z);
      bear.rotation.set(0, bearPose.yaw, -bite * 0.12);
      bearLegs.forEach((leg, i) => { leg.rotation.z = bearPose.walking ? Math.sin(time * 12 + i * Math.PI) * 0.45 : 0; });
      bearJaw.position.y = 0.81 - bite * 0.18;
      runner.group.position.set(29 + Math.sin(time * 0.9) * 6, 0, 5 + Math.cos(time * 0.9) * 5);
      runner.group.rotation.y = time * 0.9 + Math.PI / 2;
      runner.legs[0].rotation.x = Math.sin(time * 9) * 0.5; runner.legs[1].rotation.x = -Math.sin(time * 9) * 0.5;
      characters.forEach((character, i) => {
        if (character.group !== runner.group) character.group.rotation.y = character.yaw + Math.sin(time * 0.35 + i) * 0.07;
        animateIdle(character.rig!, time, i, character.group === runner.group);
      });
      // The clock determines routes; the shutter offset supplies sub-frame motion.
      const poseHour = activityHour;
      locals.forEach((character, id) => {
        const pose = localPose(id, poseHour);
        character.group.position.set(pose.x, terrainHeight(pose.x, pose.z), pose.z);
        character.group.rotation.y = pose.walking ? pose.yaw : Math.sin(time * 0.4) * 0.15;
        character.legs.forEach((leg, i) => { leg.rotation.x = pose.walking ? Math.sin(time * 5 + i * Math.PI) * 0.32 : 0; });
        const index = characters.indexOf(character);
        animateIdle(characters[index].rig!, time, index, pose.walking);
        if (pose.walking) character.arms.forEach((arm, i) => { arm.rotation.x = -Math.sin(time * 5 + i * Math.PI) * 0.25; });
      });
      runner.arms.forEach((arm, i) => { arm.rotation.x = -Math.sin(time * 9 + i * Math.PI) * 0.5; });
      townLife.update(time, poseHour);
      nature.update(time, poseHour, sky.daylight);
      storyPlaces.update(time);
      regions.update(time);
      harbor.update(time);
      solids.splice(staticSolidCount, solids.length - staticSolidCount, ...townLife.dynamicSolids());
      coast.update(time, settings.filter, sky.daylight);
      bird.rotation.y = Math.sin(time * 0.9) * 0.32; birdHead.rotation.y = Math.sin(time * 1.7) * 0.25;
      lake.update(time, settings.filter, sky.daylight); pond.update(time, settings.filter, sky.daylight);
      schools.forEach(school => school.update(time));
      creek.update(time, settings.filter, sky.daylight);
      // A CPL suppresses reflected light without removing the window itself.
      reflectionMaterial.uniforms.strength.value = settings.filter === 'cpl' ? 0.06 : 0.6;
      hallReflectionMaterial.uniforms.strength.value = settings.filter === 'cpl' ? 0.06 : 0.6;
      localLights.forEach(light => { light.visible = light.intensity > 0.01; });
    },
    canWalk,
  };
}

export function subjectPosition(world: World, mission: Mission): THREE.Vector3 {
  return world.subjects.get(mission.subject)?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3(...mission.position);
}
