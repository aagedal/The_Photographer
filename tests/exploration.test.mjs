import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { npcCatalog, npcPosition, normalizeDiscovered, discoverNPC, nearestNPC, canAcceptMission } from '../src/exploration.ts';
import { missions } from '../src/missions.ts';
import { normalizeEconomy, purchaseGear, focalRange, zoomFocal, normalizeLens, balance } from '../src/economy.ts';
import { assessPhoto } from '../src/photography.ts';
import { createWorld, subjectPosition } from '../src/world.ts';
import { terrainHeight, trails } from '../src/terrain.ts';

const empty = normalizeEconomy(undefined, []);
const birdMission = missions.find(m => m.id === 'nature-birds');
test('fresh notebooks have exactly one assignment and cannot accept unknown stories', () => {
  const known = normalizeDiscovered(undefined);
  assert.deepEqual(known, ['nature-1']);
  assert.equal(canAcceptMission(missions[0], known, empty), true);
  for (const m of missions.slice(1)) assert.equal(canAcceptMission(m, known, empty), false);
});
test('talking reveals only that local’s stories and discovery survives a round trip', () => {
  const known = discoverNPC(normalizeDiscovered(undefined), npcCatalog[0]);
  assert.deepEqual(known, ['nature-1', 'nature-2', 'nature-birds']);
  assert.deepEqual(discoverNPC(known, npcCatalog[0]), known);
  assert.deepEqual(normalizeDiscovered(JSON.parse(JSON.stringify(known))), known);
  assert.equal(canAcceptMission(missions[1], known, empty), true);
  assert.equal(canAcceptMission(birdMission, known, empty), false);
});
test('old notebook migration preserves evidence of previous assignments without revealing everything', () => {
  assert.deepEqual(normalizeDiscovered(undefined, ['sports-1', 'studio-2', 'missing', null, 'sports-1']), ['nature-1', 'sports-1', 'studio-2']);
  assert.deepEqual(normalizeDiscovered(['missing', 'news-1']), ['nature-1', 'news-1']);
  const all = npcCatalog.reduce(discoverNPC, normalizeDiscovered(undefined));
  assert.deepEqual(new Set(all), new Set(missions.map(m => m.id)));
});
test('bird progression can be funded by four starter-kit assignments without repeat payments', () => {
  const completed = ['nature-1', 'nature-2', 'sports-1'];
  assert.equal(purchaseGear(empty, completed, 'telephoto').ok, false);
  completed.push('news-1');
  const bought = purchaseGear(empty, completed, 'telephoto');
  assert.equal(bought.ok, true); assert.equal(balance(bought.economy, completed), 120);
  assert.equal(canAcceptMission(birdMission, ['nature-birds'], bought.economy), true);
  assert.equal(canAcceptMission(birdMission, ['nature-1'], bought.economy), false);
  assert.deepEqual(normalizeEconomy(JSON.parse(JSON.stringify(bought.economy)), completed), bought.economy);
});
test('equipped lenses have separate ranges and an unowned lens cannot grant reach', () => {
  const kit = { purchased: [], gifted: ['zoom', 'telephoto'], burstEnabled: false };
  assert.deepEqual(focalRange(kit, 'prime'), [35,35]);
  assert.deepEqual(focalRange(kit, 'zoom'), [24,120]);
  assert.deepEqual(focalRange(kit, 'telephoto'), [200,600]);
  assert.deepEqual(focalRange(empty, 'telephoto'), [35,35]);
  assert.equal(normalizeLens('telephoto', empty), 'prime');
  assert.equal(normalizeLens('telephoto', kit), 'telephoto');
  assert.equal(normalizeLens('prime', kit), 'prime');
  assert.equal(zoomFocal(kit, 200, -10000, 'telephoto'), 600);
  assert.equal(zoomFocal(kit, 600, 10000, 'telephoto'), 200);
});
test('birds require owned gear, a close-up, respectful distance and a fast shutter', () => {
  const settings = birdMission.recommended;
  const frame = { visible: true, distance: 26, centerOffset: 0, occluded: false };
  const light = { ambientEV: 12, subjectStops: 0, gearReady: true };
  assert.equal(assessPhoto(birdMission, settings, frame, light).passed, true);
  assert.equal(assessPhoto(birdMission, settings, frame, {...light, gearReady: false}).passed, false);
  for (const bad of [{focalLength:120}, {focalLength:200}, {shutter:1/125}, {aperture:2.8}]) assert.equal(assessPhoto(birdMission, {...settings,...bad}, frame, light).passed, false);
  for (const bad of [{distance:12}, {distance:50}, {occluded:true}, {visible:false}]) assert.equal(assessPhoto(birdMission, settings, {...frame,...bad}, light).passed, false);
});
test('expanded hills are walkable, trails are gradual, and NPCs are reachable on foot', () => {
  const world = createWorld();
  assert.equal(world.canWalk(100, 50), true);
  assert.equal(world.canWalk(76, -54), false);
  assert.ok(terrainHeight(-53,-70) > 18);
  assert.equal(terrainHeight(15,16), 0);
  for (const npc of npcCatalog) {
    const [x,y,z] = npcPosition(npc);
    assert.equal(world.canWalk(x,z), true, npc.id);
    assert.equal(nearestNPC(x,y+1.7,z)?.id, npc.id);
    assert.equal(nearestNPC(x,y+15,z), undefined);
  }
  for (const trail of trails) for (let i = 1; i < trail.length; i++) {
    const a = trail[i-1], b = trail[i], steps = Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));
    let last = terrainHeight(...a);
    for (let j = 0; j <= steps; j++) {
      const x = a[0]+(b[0]-a[0])*j/steps, z = a[1]+(b[1]-a[1])*j/steps;
      assert.equal(world.canWalk(x,z), true, `trail blocked at ${x},${z}`);
      assert.ok(Math.abs(terrainHeight(x,z)-last) < 1, 'trail is too steep'); last = terrainHeight(x,z);
    }
  }
  world.scene.updateMatrixWorld(true);
  const m = birdMission, player = new THREE.Vector3(m.viewpoint[0],terrainHeight(m.viewpoint[0],m.viewpoint[2])+1.7,m.viewpoint[2]);
  const direction = subjectPosition(world,m).sub(player);
  assert.equal(new THREE.Raycaster(player,direction.clone().normalize(),0,direction.length()-0.7).intersectObjects(world.solids,false).length,0);
});
